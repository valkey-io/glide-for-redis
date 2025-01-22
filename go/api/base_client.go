// Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

package api

// #cgo LDFLAGS: -L../target/release -lglide_rs
// #include "../lib.h"
//
// void successCallback(void *channelPtr, struct CommandResponse *message);
// void failureCallback(void *channelPtr, char *errMessage, RequestErrorType errType);
import "C"

import (
	"errors"
	"fmt"
	"math"
	"strconv"
	"unsafe"

	"github.com/valkey-io/valkey-glide/go/glide/api/options"
	"github.com/valkey-io/valkey-glide/go/glide/protobuf"
	"github.com/valkey-io/valkey-glide/go/glide/utils"
	"google.golang.org/protobuf/proto"
)

// BaseClient defines an interface for methods common to both [GlideClient] and [GlideClusterClient].
type BaseClient interface {
	StringCommands
	HashCommands
	ListCommands
	SetCommands
	StreamCommands
	SortedSetCommands
	ConnectionManagementCommands
	HyperLogLogCommands
	GenericBaseCommands
	BitmapCommands
	// Close terminates the client by closing all associated resources.
	Close()
}

const OK = "OK"

type payload struct {
	value *C.struct_CommandResponse
	error error
}

//export successCallback
func successCallback(channelPtr unsafe.Pointer, cResponse *C.struct_CommandResponse) {
	response := cResponse
	resultChannel := *(*chan payload)(channelPtr)
	resultChannel <- payload{value: response, error: nil}
}

//export failureCallback
func failureCallback(channelPtr unsafe.Pointer, cErrorMessage *C.char, cErrorType C.RequestErrorType) {
	resultChannel := *(*chan payload)(channelPtr)
	resultChannel <- payload{value: nil, error: goError(cErrorType, cErrorMessage)}
}

type clientConfiguration interface {
	toProtobuf() *protobuf.ConnectionRequest
}

type baseClient struct {
	coreClient unsafe.Pointer
}

// Creates a connection by invoking the `create_client` function from Rust library via FFI.
// Passes the pointers to callback functions which will be invoked when the command succeeds or fails.
// Once the connection is established, this function invokes `free_connection_response` exposed by rust library to free the
// connection_response to avoid any memory leaks.
func createClient(config clientConfiguration) (*baseClient, error) {
	request := config.toProtobuf()
	msg, err := proto.Marshal(request)
	if err != nil {
		return nil, err
	}

	byteCount := len(msg)
	requestBytes := C.CBytes(msg)
	cResponse := (*C.struct_ConnectionResponse)(
		C.create_client(
			(*C.uchar)(requestBytes),
			C.uintptr_t(byteCount),
			(C.SuccessCallback)(unsafe.Pointer(C.successCallback)),
			(C.FailureCallback)(unsafe.Pointer(C.failureCallback)),
		),
	)
	defer C.free_connection_response(cResponse)

	cErr := cResponse.connection_error_message
	if cErr != nil {
		message := C.GoString(cErr)
		return nil, &ConnectionError{message}
	}

	return &baseClient{cResponse.conn_ptr}, nil
}

// Close terminates the client by closing all associated resources.
func (client *baseClient) Close() {
	if client.coreClient == nil {
		return
	}

	C.close_client(client.coreClient)
	client.coreClient = nil
}

func (client *baseClient) executeCommand(requestType C.RequestType, args []string) (*C.struct_CommandResponse, error) {
	return client.executeCommandWithRoute(requestType, args, nil)
}

func (client *baseClient) executeCommandWithRoute(
	requestType C.RequestType,
	args []string,
	route route,
) (*C.struct_CommandResponse, error) {
	if client.coreClient == nil {
		return nil, &ClosingError{"ExecuteCommand failed. The client is closed."}
	}
	var cArgsPtr *C.uintptr_t = nil
	var argLengthsPtr *C.ulong = nil
	if len(args) > 0 {
		cArgs, argLengths := toCStrings(args)
		cArgsPtr = &cArgs[0]
		argLengthsPtr = &argLengths[0]
	}

	resultChannel := make(chan payload)
	resultChannelPtr := uintptr(unsafe.Pointer(&resultChannel))

	var routeBytesPtr *C.uchar = nil
	var routeBytesCount C.uintptr_t = 0
	if route != nil {
		routeProto, err := route.toRoutesProtobuf()
		if err != nil {
			return nil, &RequestError{"ExecuteCommand failed due to invalid route"}
		}
		msg, err := proto.Marshal(routeProto)
		if err != nil {
			return nil, err
		}

		routeBytesCount = C.uintptr_t(len(msg))
		routeBytesPtr = (*C.uchar)(C.CBytes(msg))
	}

	C.command(
		client.coreClient,
		C.uintptr_t(resultChannelPtr),
		uint32(requestType),
		C.size_t(len(args)),
		cArgsPtr,
		argLengthsPtr,
		routeBytesPtr,
		routeBytesCount,
	)
	payload := <-resultChannel
	if payload.error != nil {
		return nil, payload.error
	}
	return payload.value, nil
}

// Zero copying conversion from go's []string into C pointers
func toCStrings(args []string) ([]C.uintptr_t, []C.ulong) {
	cStrings := make([]C.uintptr_t, len(args))
	stringLengths := make([]C.ulong, len(args))
	for i, str := range args {
		bytes := utils.StringToBytes(str)
		var ptr uintptr
		if len(str) > 0 {
			ptr = uintptr(unsafe.Pointer(&bytes[0]))
		}
		cStrings[i] = C.uintptr_t(ptr)
		stringLengths[i] = C.size_t(len(str))
	}
	return cStrings, stringLengths
}

func (client *baseClient) Set(key string, value string) (string, error) {
	result, err := client.executeCommand(C.Set, []string{key, value})
	if err != nil {
		return defaultStringResponse, err
	}

	return handleStringResponse(result)
}

func (client *baseClient) SetWithOptions(key string, value string, options *SetOptions) (Result[string], error) {
	optionArgs, err := options.toArgs()
	if err != nil {
		return CreateNilStringResult(), err
	}

	result, err := client.executeCommand(C.Set, append([]string{key, value}, optionArgs...))
	if err != nil {
		return CreateNilStringResult(), err
	}

	return handleStringOrNilResponse(result)
}

func (client *baseClient) Get(key string) (Result[string], error) {
	result, err := client.executeCommand(C.Get, []string{key})
	if err != nil {
		return CreateNilStringResult(), err
	}

	return handleStringOrNilResponse(result)
}

func (client *baseClient) GetEx(key string) (Result[string], error) {
	result, err := client.executeCommand(C.GetEx, []string{key})
	if err != nil {
		return CreateNilStringResult(), err
	}

	return handleStringOrNilResponse(result)
}

func (client *baseClient) GetExWithOptions(key string, options *GetExOptions) (Result[string], error) {
	optionArgs, err := options.toArgs()
	if err != nil {
		return CreateNilStringResult(), err
	}

	result, err := client.executeCommand(C.GetEx, append([]string{key}, optionArgs...))
	if err != nil {
		return CreateNilStringResult(), err
	}

	return handleStringOrNilResponse(result)
}

func (client *baseClient) MSet(keyValueMap map[string]string) (string, error) {
	result, err := client.executeCommand(C.MSet, utils.MapToString(keyValueMap))
	if err != nil {
		return defaultStringResponse, err
	}

	return handleStringResponse(result)
}

func (client *baseClient) MSetNX(keyValueMap map[string]string) (bool, error) {
	result, err := client.executeCommand(C.MSetNX, utils.MapToString(keyValueMap))
	if err != nil {
		return defaultBoolResponse, err
	}

	return handleBoolResponse(result)
}

func (client *baseClient) MGet(keys []string) ([]Result[string], error) {
	result, err := client.executeCommand(C.MGet, keys)
	if err != nil {
		return nil, err
	}

	return handleStringOrNilArrayResponse(result)
}

func (client *baseClient) Incr(key string) (int64, error) {
	result, err := client.executeCommand(C.Incr, []string{key})
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

func (client *baseClient) IncrBy(key string, amount int64) (int64, error) {
	result, err := client.executeCommand(C.IncrBy, []string{key, utils.IntToString(amount)})
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

func (client *baseClient) IncrByFloat(key string, amount float64) (float64, error) {
	result, err := client.executeCommand(
		C.IncrByFloat,
		[]string{key, utils.FloatToString(amount)},
	)
	if err != nil {
		return defaultFloatResponse, err
	}

	return handleFloatResponse(result)
}

func (client *baseClient) Decr(key string) (int64, error) {
	result, err := client.executeCommand(C.Decr, []string{key})
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

func (client *baseClient) DecrBy(key string, amount int64) (int64, error) {
	result, err := client.executeCommand(C.DecrBy, []string{key, utils.IntToString(amount)})
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

func (client *baseClient) Strlen(key string) (int64, error) {
	result, err := client.executeCommand(C.Strlen, []string{key})
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

func (client *baseClient) SetRange(key string, offset int, value string) (int64, error) {
	result, err := client.executeCommand(C.SetRange, []string{key, strconv.Itoa(offset), value})
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

func (client *baseClient) GetRange(key string, start int, end int) (string, error) {
	result, err := client.executeCommand(C.GetRange, []string{key, strconv.Itoa(start), strconv.Itoa(end)})
	if err != nil {
		return defaultStringResponse, err
	}

	return handleStringResponse(result)
}

func (client *baseClient) Append(key string, value string) (int64, error) {
	result, err := client.executeCommand(C.Append, []string{key, value})
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

func (client *baseClient) LCS(key1 string, key2 string) (string, error) {
	result, err := client.executeCommand(C.LCS, []string{key1, key2})
	if err != nil {
		return defaultStringResponse, err
	}

	return handleStringResponse(result)
}

func (client *baseClient) GetDel(key string) (Result[string], error) {
	if key == "" {
		return CreateNilStringResult(), errors.New("key is required")
	}

	result, err := client.executeCommand(C.GetDel, []string{key})
	if err != nil {
		return CreateNilStringResult(), err
	}

	return handleStringOrNilResponse(result)
}

func (client *baseClient) HGet(key string, field string) (Result[string], error) {
	result, err := client.executeCommand(C.HGet, []string{key, field})
	if err != nil {
		return CreateNilStringResult(), err
	}

	return handleStringOrNilResponse(result)
}

func (client *baseClient) HGetAll(key string) (map[string]string, error) {
	result, err := client.executeCommand(C.HGetAll, []string{key})
	if err != nil {
		return nil, err
	}

	return handleStringToStringMapResponse(result)
}

func (client *baseClient) HMGet(key string, fields []string) ([]Result[string], error) {
	result, err := client.executeCommand(C.HMGet, append([]string{key}, fields...))
	if err != nil {
		return nil, err
	}

	return handleStringOrNilArrayResponse(result)
}

func (client *baseClient) HSet(key string, values map[string]string) (int64, error) {
	result, err := client.executeCommand(C.HSet, utils.ConvertMapToKeyValueStringArray(key, values))
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

func (client *baseClient) HSetNX(key string, field string, value string) (bool, error) {
	result, err := client.executeCommand(C.HSetNX, []string{key, field, value})
	if err != nil {
		return defaultBoolResponse, err
	}

	return handleBoolResponse(result)
}

func (client *baseClient) HDel(key string, fields []string) (int64, error) {
	result, err := client.executeCommand(C.HDel, append([]string{key}, fields...))
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

func (client *baseClient) HLen(key string) (int64, error) {
	result, err := client.executeCommand(C.HLen, []string{key})
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

func (client *baseClient) HVals(key string) ([]string, error) {
	result, err := client.executeCommand(C.HVals, []string{key})
	if err != nil {
		return nil, err
	}

	return handleStringArrayResponse(result)
}

func (client *baseClient) HExists(key string, field string) (bool, error) {
	result, err := client.executeCommand(C.HExists, []string{key, field})
	if err != nil {
		return defaultBoolResponse, err
	}

	return handleBoolResponse(result)
}

func (client *baseClient) HKeys(key string) ([]string, error) {
	result, err := client.executeCommand(C.HKeys, []string{key})
	if err != nil {
		return nil, err
	}

	return handleStringArrayResponse(result)
}

func (client *baseClient) HStrLen(key string, field string) (int64, error) {
	result, err := client.executeCommand(C.HStrlen, []string{key, field})
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

func (client *baseClient) HIncrBy(key string, field string, increment int64) (int64, error) {
	result, err := client.executeCommand(C.HIncrBy, []string{key, field, utils.IntToString(increment)})
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

func (client *baseClient) HIncrByFloat(key string, field string, increment float64) (float64, error) {
	result, err := client.executeCommand(C.HIncrByFloat, []string{key, field, utils.FloatToString(increment)})
	if err != nil {
		return defaultFloatResponse, err
	}

	return handleFloatResponse(result)
}

// Iterates fields of Hash types and their associated values. This definition of HSCAN command does not include the
// optional arguments of the command.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the hash.
//	cursor - The cursor that points to the next iteration of results. A value of "0" indicates the start of the search.
//
// Return value:
//
//	An array of the cursor and the subset of the hash held by `key`. The first element is always the `cursor`
//	for the next iteration of results. The `cursor` will be `"0"` on the last iteration of the subset.
//	The second element is always an array of the subset of the set held in `key`. The array in the
//	second element is always a flattened series of String pairs, where the key is at even indices
//	and the value is at odd indices.
//
// Example:
//
//	// Assume key contains a hash {{"a": "1"}, {"b", "2"}}
//	resCursor, resCollection, err = client.HScan(key, initialCursor)
//	resCursor = {0 false}
//	resCollection = [{a false} {1 false} {b false} {2 false}]
//
// [valkey.io]: https://valkey.io/commands/hscan/
func (client *baseClient) HScan(key string, cursor string) (string, []string, error) {
	result, err := client.executeCommand(C.HScan, []string{key, cursor})
	if err != nil {
		return "", nil, err
	}
	return handleScanResponse(result)
}

// Iterates fields of Hash types and their associated values. This definition of HSCAN includes optional arguments of the
// command.
//
// See [valkey.io] for details.
//
// Parameters:
//
//		key - The key of the hash.
//		cursor - The cursor that points to the next iteration of results. A value of "0" indicates the start of the search.
//	 options - The [api.HashScanOptions].
//
// Return value:
//
//	An array of the cursor and the subset of the hash held by `key`. The first element is always the `cursor`
//	for the next iteration of results. The `cursor` will be `"0"` on the last iteration of the subset.
//	The second element is always an array of the subset of the set held in `key`. The array in the
//	second element is always a flattened series of String pairs, where the key is at even indices
//	and the value is at odd indices.
//
// Example:
//
//	 // Assume key contains a hash {{"a": "1"}, {"b", "2"}}
//		opts := options.NewHashScanOptionsBuilder().SetMatch("a")
//		resCursor, resCollection, err = client.HScan(key, initialCursor, opts)
//	 // resCursor = {0 false}
//	 // resCollection = [{a false} {1 false}]
//	 // The resCollection only contains the hash map entry that matches with the match option provided with the command
//	 // input.
//
// [valkey.io]: https://valkey.io/commands/hscan/
func (client *baseClient) HScanWithOptions(
	key string,
	cursor string,
	options *options.HashScanOptions,
) (string, []string, error) {
	optionArgs, err := options.ToArgs()
	if err != nil {
		return "", nil, err
	}

	result, err := client.executeCommand(C.HScan, append([]string{key, cursor}, optionArgs...))
	if err != nil {
		return "", nil, err
	}
	return handleScanResponse(result)
}

// Returns a random field name from the hash value stored at `key`.
//
// Since:
//
//	Valkey 6.2.0 and above.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the hash.
//
// Return value:
//
//	A random field name from the hash stored at `key`, or `nil` when
//	  the key does not exist.
//
// Example:
//
//	field, err := client.HRandField("my_hash")
//
// [valkey.io]: https://valkey.io/commands/hrandfield/
func (client *baseClient) HRandField(key string) (Result[string], error) {
	result, err := client.executeCommand(C.HRandField, []string{key})
	if err != nil {
		return CreateNilStringResult(), err
	}
	return handleStringOrNilResponse(result)
}

// Retrieves up to `count` random field names from the hash value stored at `key`.
//
// Since:
//
//	Valkey 6.2.0 and above.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the hash.
//	count - The number of field names to return.
//	  If `count` is positive, returns unique elements. If negative, allows for duplicates.
//
// Return value:
//
//	An array of random field names from the hash stored at `key`,
//	   or an empty array when the key does not exist.
//
// Example:
//
//	fields, err := client.HRandFieldWithCount("my_hash", -5)
//
// [valkey.io]: https://valkey.io/commands/hrandfield/
func (client *baseClient) HRandFieldWithCount(key string, count int64) ([]string, error) {
	result, err := client.executeCommand(C.HRandField, []string{key, utils.IntToString(count)})
	if err != nil {
		return nil, err
	}
	return handleStringArrayResponse(result)
}

// Retrieves up to `count` random field names along with their values from the hash
// value stored at `key`.
//
// Since:
//
//	Valkey 6.2.0 and above.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the hash.
//	count - The number of field names to return.
//	  If `count` is positive, returns unique elements. If negative, allows for duplicates.
//
// Return value:
//
//	A 2D `array` of `[field, value]` arrays, where `field` is a random
//	  field name from the hash and `value` is the associated value of the field name.
//	  If the hash does not exist or is empty, the response will be an empty array.
//
// Example:
//
//	fieldsAndValues, err := client.HRandFieldWithCountWithValues("my_hash", -5)
//	for _, pair := range fieldsAndValues {
//		field := pair[0]
//		value := pair[1]
//	}
//
// [valkey.io]: https://valkey.io/commands/hrandfield/
func (client *baseClient) HRandFieldWithCountWithValues(key string, count int64) ([][]string, error) {
	result, err := client.executeCommand(C.HRandField, []string{key, utils.IntToString(count), options.WithValues})
	if err != nil {
		return nil, err
	}
	return handle2DStringArrayResponse(result)
}

func (client *baseClient) LPush(key string, elements []string) (int64, error) {
	result, err := client.executeCommand(C.LPush, append([]string{key}, elements...))
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

func (client *baseClient) LPop(key string) (Result[string], error) {
	result, err := client.executeCommand(C.LPop, []string{key})
	if err != nil {
		return CreateNilStringResult(), err
	}

	return handleStringOrNilResponse(result)
}

func (client *baseClient) LPopCount(key string, count int64) ([]string, error) {
	result, err := client.executeCommand(C.LPop, []string{key, utils.IntToString(count)})
	if err != nil {
		return nil, err
	}

	return handleStringArrayOrNilResponse(result)
}

func (client *baseClient) LPos(key string, element string) (Result[int64], error) {
	result, err := client.executeCommand(C.LPos, []string{key, element})
	if err != nil {
		return CreateNilInt64Result(), err
	}

	return handleIntOrNilResponse(result)
}

func (client *baseClient) LPosWithOptions(key string, element string, options *LPosOptions) (Result[int64], error) {
	result, err := client.executeCommand(C.LPos, append([]string{key, element}, options.toArgs()...))
	if err != nil {
		return CreateNilInt64Result(), err
	}

	return handleIntOrNilResponse(result)
}

func (client *baseClient) LPosCount(key string, element string, count int64) ([]int64, error) {
	result, err := client.executeCommand(C.LPos, []string{key, element, CountKeyword, utils.IntToString(count)})
	if err != nil {
		return nil, err
	}

	return handleIntArrayResponse(result)
}

func (client *baseClient) LPosCountWithOptions(
	key string,
	element string,
	count int64,
	options *LPosOptions,
) ([]int64, error) {
	result, err := client.executeCommand(
		C.LPos,
		append([]string{key, element, CountKeyword, utils.IntToString(count)}, options.toArgs()...),
	)
	if err != nil {
		return nil, err
	}

	return handleIntArrayResponse(result)
}

func (client *baseClient) RPush(key string, elements []string) (int64, error) {
	result, err := client.executeCommand(C.RPush, append([]string{key}, elements...))
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

func (client *baseClient) SAdd(key string, members []string) (int64, error) {
	result, err := client.executeCommand(C.SAdd, append([]string{key}, members...))
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

func (client *baseClient) SRem(key string, members []string) (int64, error) {
	result, err := client.executeCommand(C.SRem, append([]string{key}, members...))
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

func (client *baseClient) SUnionStore(destination string, keys []string) (int64, error) {
	result, err := client.executeCommand(C.SUnionStore, append([]string{destination}, keys...))
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

func (client *baseClient) SMembers(key string) (map[string]struct{}, error) {
	result, err := client.executeCommand(C.SMembers, []string{key})
	if err != nil {
		return nil, err
	}

	return handleStringSetResponse(result)
}

func (client *baseClient) SCard(key string) (int64, error) {
	result, err := client.executeCommand(C.SCard, []string{key})
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

func (client *baseClient) SIsMember(key string, member string) (bool, error) {
	result, err := client.executeCommand(C.SIsMember, []string{key, member})
	if err != nil {
		return defaultBoolResponse, err
	}

	return handleBoolResponse(result)
}

func (client *baseClient) SDiff(keys []string) (map[string]struct{}, error) {
	result, err := client.executeCommand(C.SDiff, keys)
	if err != nil {
		return nil, err
	}

	return handleStringSetResponse(result)
}

func (client *baseClient) SDiffStore(destination string, keys []string) (int64, error) {
	result, err := client.executeCommand(C.SDiffStore, append([]string{destination}, keys...))
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

func (client *baseClient) SInter(keys []string) (map[string]struct{}, error) {
	result, err := client.executeCommand(C.SInter, keys)
	if err != nil {
		return nil, err
	}

	return handleStringSetResponse(result)
}

func (client *baseClient) SInterStore(destination string, keys []string) (int64, error) {
	result, err := client.executeCommand(C.SInterStore, append([]string{destination}, keys...))
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

func (client *baseClient) SInterCard(keys []string) (int64, error) {
	result, err := client.executeCommand(C.SInterCard, append([]string{strconv.Itoa(len(keys))}, keys...))
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

func (client *baseClient) SInterCardLimit(keys []string, limit int64) (int64, error) {
	args := utils.Concat([]string{utils.IntToString(int64(len(keys)))}, keys, []string{"LIMIT", utils.IntToString(limit)})

	result, err := client.executeCommand(C.SInterCard, args)
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

func (client *baseClient) SRandMember(key string) (Result[string], error) {
	result, err := client.executeCommand(C.SRandMember, []string{key})
	if err != nil {
		return CreateNilStringResult(), err
	}

	return handleStringOrNilResponse(result)
}

func (client *baseClient) SPop(key string) (Result[string], error) {
	result, err := client.executeCommand(C.SPop, []string{key})
	if err != nil {
		return CreateNilStringResult(), err
	}

	return handleStringOrNilResponse(result)
}

func (client *baseClient) SMIsMember(key string, members []string) ([]bool, error) {
	result, err := client.executeCommand(C.SMIsMember, append([]string{key}, members...))
	if err != nil {
		return nil, err
	}

	return handleBoolArrayResponse(result)
}

func (client *baseClient) SUnion(keys []string) (map[string]struct{}, error) {
	result, err := client.executeCommand(C.SUnion, keys)
	if err != nil {
		return nil, err
	}

	return handleStringSetResponse(result)
}

// Iterates incrementally over a set.
//
// Note: When in cluster mode, all keys must map to the same hash slot.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the set.
//	cursor - The cursor that points to the next iteration of results.
//	         A value of `"0"` indicates the start of the search.
//	         For Valkey 8.0 and above, negative cursors are treated like the initial cursor("0").
//
// Return value:
//
//	An array of the cursor and the subset of the set held by `key`. The first element is always the `cursor` and
//	for the next iteration of results. The `cursor` will be `"0"` on the last iteration of the set.
//	The second element is always an array of the subset of the set held in `key`.
//
// Example:
//
//	// assume "key" contains a set
//	resCursor, resCol, err := client.sscan("key", "0")
//	fmt.Println("Cursor: ", resCursor)
//	fmt.Println("Members: ", resCol)
//	for resCursor != "0" {
//		resCursor, resCol, err = client.sscan("key", "0")
//		fmt.Println("Cursor: ", resCursor)
//	 	fmt.Println("Members: ", resCol)
//	}
//	// Output:
//	// Cursor:  48
//	// Members:  ['3', '118', '120', '86', '76', '13', '61', '111', '55', '45']
//	// Cursor:  24
//	// Members:  ['38', '109', '11', '119', '34', '24', '40', '57', '20', '17']
//	// Cursor:  0
//	// Members:  ['47', '122', '1', '53', '10', '14', '80']
//
// [valkey.io]: https://valkey.io/commands/sscan/
func (client *baseClient) SScan(key string, cursor string) (string, []string, error) {
	result, err := client.executeCommand(C.SScan, []string{key, cursor})
	if err != nil {
		return "", nil, err
	}
	return handleScanResponse(result)
}

// Iterates incrementally over a set.
//
// Note: When in cluster mode, all keys must map to the same hash slot.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the set.
//	cursor - The cursor that points to the next iteration of results.
//	         A value of `"0"` indicates the start of the search.
//	         For Valkey 8.0 and above, negative cursors are treated like the initial cursor("0").
//	options - [options.BaseScanOptions]
//
// Return value:
//
//	An array of the cursor and the subset of the set held by `key`. The first element is always the `cursor` and
//	for the next iteration of results. The `cursor` will be `"0"` on the last iteration of the set.
//	The second element is always an array of the subset of the set held in `key`.
//
// Example:
//
//	// assume "key" contains a set
//	resCursor, resCol, err := client.sscan("key", "0", opts)
//	fmt.Println("Cursor: ", resCursor)
//	fmt.Println("Members: ", resCol)
//	for resCursor != "0" {
//		opts := options.NewBaseScanOptionsBuilder().SetMatch("*")
//		resCursor, resCol, err = client.sscan("key", "0", opts)
//		fmt.Println("Cursor: ", resCursor)
//		fmt.Println("Members: ", resCol)
//	}
//	// Output:
//	// Cursor:  48
//	// Members:  ['3', '118', '120', '86', '76', '13', '61', '111', '55', '45']
//	// Cursor:  24
//	// Members:  ['38', '109', '11', '119', '34', '24', '40', '57', '20', '17']
//	// Cursor:  0
//	// Members:  ['47', '122', '1', '53', '10', '14', '80']
//
// [valkey.io]: https://valkey.io/commands/sscan/
func (client *baseClient) SScanWithOptions(
	key string,
	cursor string,
	options *options.BaseScanOptions,
) (string, []string, error) {
	optionArgs, err := options.ToArgs()
	if err != nil {
		return "", nil, err
	}

	result, err := client.executeCommand(C.SScan, append([]string{key, cursor}, optionArgs...))
	if err != nil {
		return "", nil, err
	}
	return handleScanResponse(result)
}

func (client *baseClient) SMove(source string, destination string, member string) (bool, error) {
	result, err := client.executeCommand(C.SMove, []string{source, destination, member})
	if err != nil {
		return defaultBoolResponse, err
	}
	return handleBoolResponse(result)
}

func (client *baseClient) LRange(key string, start int64, end int64) ([]string, error) {
	result, err := client.executeCommand(C.LRange, []string{key, utils.IntToString(start), utils.IntToString(end)})
	if err != nil {
		return nil, err
	}

	return handleStringArrayResponse(result)
}

func (client *baseClient) LIndex(key string, index int64) (Result[string], error) {
	result, err := client.executeCommand(C.LIndex, []string{key, utils.IntToString(index)})
	if err != nil {
		return CreateNilStringResult(), err
	}

	return handleStringOrNilResponse(result)
}

func (client *baseClient) LTrim(key string, start int64, end int64) (string, error) {
	result, err := client.executeCommand(C.LTrim, []string{key, utils.IntToString(start), utils.IntToString(end)})
	if err != nil {
		return defaultStringResponse, err
	}

	return handleStringResponse(result)
}

func (client *baseClient) LLen(key string) (int64, error) {
	result, err := client.executeCommand(C.LLen, []string{key})
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

func (client *baseClient) LRem(key string, count int64, element string) (int64, error) {
	result, err := client.executeCommand(C.LRem, []string{key, utils.IntToString(count), element})
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

func (client *baseClient) RPop(key string) (Result[string], error) {
	result, err := client.executeCommand(C.RPop, []string{key})
	if err != nil {
		return CreateNilStringResult(), err
	}

	return handleStringOrNilResponse(result)
}

func (client *baseClient) RPopCount(key string, count int64) ([]string, error) {
	result, err := client.executeCommand(C.RPop, []string{key, utils.IntToString(count)})
	if err != nil {
		return nil, err
	}

	return handleStringArrayOrNilResponse(result)
}

func (client *baseClient) LInsert(
	key string,
	insertPosition InsertPosition,
	pivot string,
	element string,
) (int64, error) {
	insertPositionStr, err := insertPosition.toString()
	if err != nil {
		return defaultIntResponse, err
	}

	result, err := client.executeCommand(
		C.LInsert,
		[]string{key, insertPositionStr, pivot, element},
	)
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

func (client *baseClient) BLPop(keys []string, timeoutSecs float64) ([]string, error) {
	result, err := client.executeCommand(C.BLPop, append(keys, utils.FloatToString(timeoutSecs)))
	if err != nil {
		return nil, err
	}

	return handleStringArrayOrNilResponse(result)
}

func (client *baseClient) BRPop(keys []string, timeoutSecs float64) ([]string, error) {
	result, err := client.executeCommand(C.BRPop, append(keys, utils.FloatToString(timeoutSecs)))
	if err != nil {
		return nil, err
	}

	return handleStringArrayOrNilResponse(result)
}

func (client *baseClient) RPushX(key string, elements []string) (int64, error) {
	result, err := client.executeCommand(C.RPushX, append([]string{key}, elements...))
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

func (client *baseClient) LPushX(key string, elements []string) (int64, error) {
	result, err := client.executeCommand(C.LPushX, append([]string{key}, elements...))
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

func (client *baseClient) LMPop(keys []string, listDirection ListDirection) (map[string][]string, error) {
	listDirectionStr, err := listDirection.toString()
	if err != nil {
		return nil, err
	}

	// Check for potential length overflow.
	if len(keys) > math.MaxInt-2 {
		return nil, &RequestError{"Length overflow for the provided keys"}
	}

	// args slice will have 2 more arguments with the keys provided.
	args := make([]string, 0, len(keys)+2)
	args = append(args, strconv.Itoa(len(keys)))
	args = append(args, keys...)
	args = append(args, listDirectionStr)
	result, err := client.executeCommand(C.LMPop, args)
	if err != nil {
		return nil, err
	}

	return handleStringToStringArrayMapOrNilResponse(result)
}

func (client *baseClient) LMPopCount(
	keys []string,
	listDirection ListDirection,
	count int64,
) (map[string][]string, error) {
	listDirectionStr, err := listDirection.toString()
	if err != nil {
		return nil, err
	}

	// Check for potential length overflow.
	if len(keys) > math.MaxInt-4 {
		return nil, &RequestError{"Length overflow for the provided keys"}
	}

	// args slice will have 4 more arguments with the keys provided.
	args := make([]string, 0, len(keys)+4)
	args = append(args, strconv.Itoa(len(keys)))
	args = append(args, keys...)
	args = append(args, listDirectionStr, CountKeyword, utils.IntToString(count))
	result, err := client.executeCommand(C.LMPop, args)
	if err != nil {
		return nil, err
	}

	return handleStringToStringArrayMapOrNilResponse(result)
}

func (client *baseClient) BLMPop(
	keys []string,
	listDirection ListDirection,
	timeoutSecs float64,
) (map[string][]string, error) {
	listDirectionStr, err := listDirection.toString()
	if err != nil {
		return nil, err
	}

	// Check for potential length overflow.
	if len(keys) > math.MaxInt-3 {
		return nil, &RequestError{"Length overflow for the provided keys"}
	}

	// args slice will have 3 more arguments with the keys provided.
	args := make([]string, 0, len(keys)+3)
	args = append(args, utils.FloatToString(timeoutSecs), strconv.Itoa(len(keys)))
	args = append(args, keys...)
	args = append(args, listDirectionStr)
	result, err := client.executeCommand(C.BLMPop, args)
	if err != nil {
		return nil, err
	}

	return handleStringToStringArrayMapOrNilResponse(result)
}

func (client *baseClient) BLMPopCount(
	keys []string,
	listDirection ListDirection,
	count int64,
	timeoutSecs float64,
) (map[string][]string, error) {
	listDirectionStr, err := listDirection.toString()
	if err != nil {
		return nil, err
	}

	// Check for potential length overflow.
	if len(keys) > math.MaxInt-5 {
		return nil, &RequestError{"Length overflow for the provided keys"}
	}

	// args slice will have 5 more arguments with the keys provided.
	args := make([]string, 0, len(keys)+5)
	args = append(args, utils.FloatToString(timeoutSecs), strconv.Itoa(len(keys)))
	args = append(args, keys...)
	args = append(args, listDirectionStr, CountKeyword, utils.IntToString(count))
	result, err := client.executeCommand(C.BLMPop, args)
	if err != nil {
		return nil, err
	}

	return handleStringToStringArrayMapOrNilResponse(result)
}

func (client *baseClient) LSet(key string, index int64, element string) (string, error) {
	result, err := client.executeCommand(C.LSet, []string{key, utils.IntToString(index), element})
	if err != nil {
		return defaultStringResponse, err
	}

	return handleStringResponse(result)
}

func (client *baseClient) LMove(
	source string,
	destination string,
	whereFrom ListDirection,
	whereTo ListDirection,
) (Result[string], error) {
	whereFromStr, err := whereFrom.toString()
	if err != nil {
		return CreateNilStringResult(), err
	}
	whereToStr, err := whereTo.toString()
	if err != nil {
		return CreateNilStringResult(), err
	}

	result, err := client.executeCommand(C.LMove, []string{source, destination, whereFromStr, whereToStr})
	if err != nil {
		return CreateNilStringResult(), err
	}

	return handleStringOrNilResponse(result)
}

func (client *baseClient) BLMove(
	source string,
	destination string,
	whereFrom ListDirection,
	whereTo ListDirection,
	timeoutSecs float64,
) (Result[string], error) {
	whereFromStr, err := whereFrom.toString()
	if err != nil {
		return CreateNilStringResult(), err
	}
	whereToStr, err := whereTo.toString()
	if err != nil {
		return CreateNilStringResult(), err
	}

	result, err := client.executeCommand(
		C.BLMove,
		[]string{source, destination, whereFromStr, whereToStr, utils.FloatToString(timeoutSecs)},
	)
	if err != nil {
		return CreateNilStringResult(), err
	}

	return handleStringOrNilResponse(result)
}

func (client *baseClient) Ping() (string, error) {
	result, err := client.executeCommand(C.Ping, []string{})
	if err != nil {
		return defaultStringResponse, err
	}

	return handleStringResponse(result)
}

func (client *baseClient) PingWithMessage(message string) (string, error) {
	args := []string{message}

	result, err := client.executeCommand(C.Ping, args)
	if err != nil {
		return defaultStringResponse, err
	}

	return handleStringResponse(result)
}

func (client *baseClient) Del(keys []string) (int64, error) {
	result, err := client.executeCommand(C.Del, keys)
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

func (client *baseClient) Exists(keys []string) (int64, error) {
	result, err := client.executeCommand(C.Exists, keys)
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

func (client *baseClient) Expire(key string, seconds int64) (bool, error) {
	result, err := client.executeCommand(C.Expire, []string{key, utils.IntToString(seconds)})
	if err != nil {
		return defaultBoolResponse, err
	}

	return handleBoolResponse(result)
}

func (client *baseClient) ExpireWithOptions(key string, seconds int64, expireCondition ExpireCondition) (bool, error) {
	expireConditionStr, err := expireCondition.toString()
	if err != nil {
		return defaultBoolResponse, err
	}
	result, err := client.executeCommand(C.Expire, []string{key, utils.IntToString(seconds), expireConditionStr})
	if err != nil {
		return defaultBoolResponse, err
	}
	return handleBoolResponse(result)
}

func (client *baseClient) ExpireAt(key string, unixTimestampInSeconds int64) (bool, error) {
	result, err := client.executeCommand(C.ExpireAt, []string{key, utils.IntToString(unixTimestampInSeconds)})
	if err != nil {
		return defaultBoolResponse, err
	}

	return handleBoolResponse(result)
}

func (client *baseClient) ExpireAtWithOptions(
	key string,
	unixTimestampInSeconds int64,
	expireCondition ExpireCondition,
) (bool, error) {
	expireConditionStr, err := expireCondition.toString()
	if err != nil {
		return defaultBoolResponse, err
	}
	result, err := client.executeCommand(
		C.ExpireAt,
		[]string{key, utils.IntToString(unixTimestampInSeconds), expireConditionStr},
	)
	if err != nil {
		return defaultBoolResponse, err
	}
	return handleBoolResponse(result)
}

func (client *baseClient) PExpire(key string, milliseconds int64) (bool, error) {
	result, err := client.executeCommand(C.PExpire, []string{key, utils.IntToString(milliseconds)})
	if err != nil {
		return defaultBoolResponse, err
	}
	return handleBoolResponse(result)
}

func (client *baseClient) PExpireWithOptions(
	key string,
	milliseconds int64,
	expireCondition ExpireCondition,
) (bool, error) {
	expireConditionStr, err := expireCondition.toString()
	if err != nil {
		return defaultBoolResponse, err
	}
	result, err := client.executeCommand(C.PExpire, []string{key, utils.IntToString(milliseconds), expireConditionStr})
	if err != nil {
		return defaultBoolResponse, err
	}
	return handleBoolResponse(result)
}

func (client *baseClient) PExpireAt(key string, unixTimestampInMilliSeconds int64) (bool, error) {
	result, err := client.executeCommand(C.PExpireAt, []string{key, utils.IntToString(unixTimestampInMilliSeconds)})
	if err != nil {
		return defaultBoolResponse, err
	}
	return handleBoolResponse(result)
}

func (client *baseClient) PExpireAtWithOptions(
	key string,
	unixTimestampInMilliSeconds int64,
	expireCondition ExpireCondition,
) (bool, error) {
	expireConditionStr, err := expireCondition.toString()
	if err != nil {
		return defaultBoolResponse, err
	}
	result, err := client.executeCommand(
		C.PExpireAt,
		[]string{key, utils.IntToString(unixTimestampInMilliSeconds), expireConditionStr},
	)
	if err != nil {
		return defaultBoolResponse, err
	}
	return handleBoolResponse(result)
}

func (client *baseClient) ExpireTime(key string) (int64, error) {
	result, err := client.executeCommand(C.ExpireTime, []string{key})
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

func (client *baseClient) PExpireTime(key string) (int64, error) {
	result, err := client.executeCommand(C.PExpireTime, []string{key})
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

func (client *baseClient) TTL(key string) (int64, error) {
	result, err := client.executeCommand(C.TTL, []string{key})
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

func (client *baseClient) PTTL(key string) (int64, error) {
	result, err := client.executeCommand(C.PTTL, []string{key})
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

func (client *baseClient) PfAdd(key string, elements []string) (int64, error) {
	result, err := client.executeCommand(C.PfAdd, append([]string{key}, elements...))
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

func (client *baseClient) PfCount(keys []string) (int64, error) {
	result, err := client.executeCommand(C.PfCount, keys)
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

func (client *baseClient) Unlink(keys []string) (int64, error) {
	result, err := client.executeCommand(C.Unlink, keys)
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

func (client *baseClient) Type(key string) (string, error) {
	result, err := client.executeCommand(C.Type, []string{key})
	if err != nil {
		return defaultStringResponse, err
	}
	return handleStringResponse(result)
}

func (client *baseClient) Touch(keys []string) (int64, error) {
	result, err := client.executeCommand(C.Touch, keys)
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

func (client *baseClient) Rename(key string, newKey string) (string, error) {
	result, err := client.executeCommand(C.Rename, []string{key, newKey})
	if err != nil {
		return defaultStringResponse, err
	}
	return handleStringResponse(result)
}

func (client *baseClient) Renamenx(key string, newKey string) (bool, error) {
	result, err := client.executeCommand(C.RenameNX, []string{key, newKey})
	if err != nil {
		return defaultBoolResponse, err
	}
	return handleBoolResponse(result)
}

func (client *baseClient) XAdd(key string, values [][]string) (Result[string], error) {
	return client.XAddWithOptions(key, values, options.NewXAddOptions())
}

func (client *baseClient) XAddWithOptions(
	key string,
	values [][]string,
	options *options.XAddOptions,
) (Result[string], error) {
	args := []string{}
	args = append(args, key)
	optionArgs, err := options.ToArgs()
	if err != nil {
		return CreateNilStringResult(), err
	}
	args = append(args, optionArgs...)
	for _, pair := range values {
		if len(pair) != 2 {
			return CreateNilStringResult(), fmt.Errorf(
				"array entry had the wrong length. Expected length 2 but got length %d",
				len(pair),
			)
		}
		args = append(args, pair...)
	}

	result, err := client.executeCommand(C.XAdd, args)
	if err != nil {
		return CreateNilStringResult(), err
	}
	return handleStringOrNilResponse(result)
}

// Reads entries from the given streams.
//
// Note:
//
//	When in cluster mode, all keys in `keysAndIds` must map to the same hash slot.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	keysAndIds - A map of keys and entry IDs to read from.
//
// Return value:
// A `map[string]map[string][][]string` of stream keys to a map of stream entry IDs mapped to an array entries or `nil` if
// a key does not exist or does not contain requiested entries.
//
// For example:
//
//	result, err := client.XRead({"stream1": "0-0", "stream2": "0-1"})
//	err == nil: true
//	result: map[string]map[string][][]string{
//	  "stream1": {"0-1": {{"field1", "value1"}}, "0-2": {{"field2", "value2"}, {"field2", "value3"}}},
//	  "stream2": {},
//	}
//
// [valkey.io]: https://valkey.io/commands/xread/
func (client *baseClient) XRead(keysAndIds map[string]string) (map[string]map[string][][]string, error) {
	return client.XReadWithOptions(keysAndIds, options.NewXReadOptions())
}

// Reads entries from the given streams.
//
// Note:
//
//	When in cluster mode, all keys in `keysAndIds` must map to the same hash slot.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	keysAndIds - A map of keys and entry IDs to read from.
//	options - Options detailing how to read the stream.
//
// Return value:
// A `map[string]map[string][][]string` of stream keys to a map of stream entry IDs mapped to an array entries or `nil` if
// a key does not exist or does not contain requiested entries.
//
// For example:
//
//	options := options.NewXReadOptions().SetBlock(100500)
//	result, err := client.XReadWithOptions({"stream1": "0-0", "stream2": "0-1"}, options)
//	err == nil: true
//	result: map[string]map[string][][]string{
//	  "stream1": {"0-1": {{"field1", "value1"}}, "0-2": {{"field2", "value2"}, {"field2", "value3"}}},
//	  "stream2": {},
//	}
//
// [valkey.io]: https://valkey.io/commands/xread/
func (client *baseClient) XReadWithOptions(
	keysAndIds map[string]string,
	options *options.XReadOptions,
) (map[string]map[string][][]string, error) {
	args := make([]string, 0, 5+2*len(keysAndIds))
	optionArgs, _ := options.ToArgs()
	args = append(args, optionArgs...)

	// Note: this loop iterates in an indeterminate order, but it is OK for that case
	keys := make([]string, 0, len(keysAndIds))
	values := make([]string, 0, len(keysAndIds))
	for key := range keysAndIds {
		keys = append(keys, key)
		values = append(values, keysAndIds[key])
	}
	args = append(args, "STREAMS")
	args = append(args, keys...)
	args = append(args, values...)

	result, err := client.executeCommand(C.XRead, args)
	if err != nil {
		return nil, err
	}

	return handleXReadResponse(result)
}

// Reads entries from the given streams owned by a consumer group.
//
// Note:
//
//	When in cluster mode, all keys in `keysAndIds` must map to the same hash slot.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	group - The consumer group name.
//	consumer - The group consumer.
//	keysAndIds - A map of keys and entry IDs to read from.
//
// Return value:
// A `map[string]map[string][][]string` of stream keys to a map of stream entry IDs mapped to an array entries or `nil` if
// a key does not exist or does not contain requested entries.
//
// For example:
//
//	result, err := client.XReadGroup({"stream1": "0-0", "stream2": "0-1", "stream3": "0-1"})
//	err == nil: true
//	result: map[string]map[string][][]string{
//	  "stream1": {
//	    "0-1": {{"field1", "value1"}},
//	    "0-2": {{"field2", "value2"}, {"field2", "value3"}},
//	  },
//	  "stream2": {
//	    "1526985676425-0": {{"name", "Virginia"}, {"surname", "Woolf"}},
//	    "1526985685298-0": nil,                                               // entry was deleted
//	  },
//	  "stream3": {},                                                          // stream is empty
//	}
//
// [valkey.io]: https://valkey.io/commands/xreadgroup/
func (client *baseClient) XReadGroup(
	group string,
	consumer string,
	keysAndIds map[string]string,
) (map[string]map[string][][]string, error) {
	return client.XReadGroupWithOptions(group, consumer, keysAndIds, options.NewXReadGroupOptions())
}

// Reads entries from the given streams owned by a consumer group.
//
// Note:
//
//	When in cluster mode, all keys in `keysAndIds` must map to the same hash slot.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	group - The consumer group name.
//	consumer - The group consumer.
//	keysAndIds - A map of keys and entry IDs to read from.
//	options - Options detailing how to read the stream.
//
// Return value:
// A `map[string]map[string][][]string` of stream keys to a map of stream entry IDs mapped to an array entries or `nil` if
// a key does not exist or does not contain requiested entries.
//
// For example:
//
//	options := options.NewXReadGroupOptions().SetNoAck()
//	result, err := client.XReadGroupWithOptions({"stream1": "0-0", "stream2": "0-1", "stream3": "0-1"}, options)
//	err == nil: true
//	result: map[string]map[string][][]string{
//	  "stream1": {
//	    "0-1": {{"field1", "value1"}},
//	    "0-2": {{"field2", "value2"}, {"field2", "value3"}},
//	  },
//	  "stream2": {
//	    "1526985676425-0": {{"name", "Virginia"}, {"surname", "Woolf"}},
//	    "1526985685298-0": nil,                                               // entry was deleted
//	  },
//	  "stream3": {},                                                          // stream is empty
//	}
//
// [valkey.io]: https://valkey.io/commands/xreadgroup/
func (client *baseClient) XReadGroupWithOptions(
	group string,
	consumer string,
	keysAndIds map[string]string,
	options *options.XReadGroupOptions,
) (map[string]map[string][][]string, error) {
	args, err := createStreamCommandArgs([]string{"GROUP", group, consumer}, keysAndIds, options)
	if err != nil {
		return nil, err
	}

	result, err := client.executeCommand(C.XReadGroup, args)
	if err != nil {
		return nil, err
	}

	return handleXReadGroupResponse(result)
}

// Combine `args` with `keysAndIds` and `options` into arguments for a stream command
func createStreamCommandArgs(
	args []string,
	keysAndIds map[string]string,
	options interface{ ToArgs() ([]string, error) },
) ([]string, error) {
	optionArgs, err := options.ToArgs()
	if err != nil {
		return nil, err
	}
	args = append(args, optionArgs...)
	// Note: this loop iterates in an indeterminate order, but it is OK for that case
	keys := make([]string, 0, len(keysAndIds))
	values := make([]string, 0, len(keysAndIds))
	for key := range keysAndIds {
		keys = append(keys, key)
		values = append(values, keysAndIds[key])
	}
	args = append(args, "STREAMS")
	args = append(args, keys...)
	args = append(args, values...)
	return args, nil
}

func (client *baseClient) ZAdd(
	key string,
	membersScoreMap map[string]float64,
) (int64, error) {
	result, err := client.executeCommand(
		C.ZAdd,
		append([]string{key}, utils.ConvertMapToValueKeyStringArray(membersScoreMap)...),
	)
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

func (client *baseClient) ZAddWithOptions(
	key string,
	membersScoreMap map[string]float64,
	opts *options.ZAddOptions,
) (int64, error) {
	optionArgs, err := opts.ToArgs()
	if err != nil {
		return defaultIntResponse, err
	}
	commandArgs := append([]string{key}, optionArgs...)
	result, err := client.executeCommand(
		C.ZAdd,
		append(commandArgs, utils.ConvertMapToValueKeyStringArray(membersScoreMap)...),
	)
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

func (client *baseClient) zAddIncrBase(key string, opts *options.ZAddOptions) (Result[float64], error) {
	optionArgs, err := opts.ToArgs()
	if err != nil {
		return CreateNilFloat64Result(), err
	}

	result, err := client.executeCommand(C.ZAdd, append([]string{key}, optionArgs...))
	if err != nil {
		return CreateNilFloat64Result(), err
	}

	return handleFloatOrNilResponse(result)
}

func (client *baseClient) ZAddIncr(
	key string,
	member string,
	increment float64,
) (Result[float64], error) {
	options, err := options.NewZAddOptionsBuilder().SetIncr(true, increment, member)
	if err != nil {
		return CreateNilFloat64Result(), err
	}

	return client.zAddIncrBase(key, options)
}

func (client *baseClient) ZAddIncrWithOptions(
	key string,
	member string,
	increment float64,
	opts *options.ZAddOptions,
) (Result[float64], error) {
	incrOpts, err := opts.SetIncr(true, increment, member)
	if err != nil {
		return CreateNilFloat64Result(), err
	}

	return client.zAddIncrBase(key, incrOpts)
}

func (client *baseClient) ZIncrBy(key string, increment float64, member string) (float64, error) {
	result, err := client.executeCommand(C.ZIncrBy, []string{key, utils.FloatToString(increment), member})
	if err != nil {
		return defaultFloatResponse, err
	}

	return handleFloatResponse(result)
}

func (client *baseClient) ZPopMin(key string) (map[string]float64, error) {
	result, err := client.executeCommand(C.ZPopMin, []string{key})
	if err != nil {
		return nil, err
	}
	return handleStringDoubleMapResponse(result)
}

func (client *baseClient) ZPopMinWithCount(key string, count int64) (map[string]float64, error) {
	result, err := client.executeCommand(C.ZPopMin, []string{key, utils.IntToString(count)})
	if err != nil {
		return nil, err
	}
	return handleStringDoubleMapResponse(result)
}

func (client *baseClient) ZPopMax(key string) (map[string]float64, error) {
	result, err := client.executeCommand(C.ZPopMax, []string{key})
	if err != nil {
		return nil, err
	}
	return handleStringDoubleMapResponse(result)
}

func (client *baseClient) ZPopMaxWithCount(key string, count int64) (map[string]float64, error) {
	result, err := client.executeCommand(C.ZPopMax, []string{key, utils.IntToString(count)})
	if err != nil {
		return nil, err
	}
	return handleStringDoubleMapResponse(result)
}

func (client *baseClient) ZRem(key string, members []string) (int64, error) {
	result, err := client.executeCommand(C.ZRem, append([]string{key}, members...))
	if err != nil {
		return defaultIntResponse, err
	}
	return handleIntResponse(result)
}

func (client *baseClient) ZCard(key string) (int64, error) {
	result, err := client.executeCommand(C.ZCard, []string{key})
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

func (client *baseClient) BZPopMin(keys []string, timeoutSecs float64) (Result[KeyWithMemberAndScore], error) {
	result, err := client.executeCommand(C.BZPopMin, append(keys, utils.FloatToString(timeoutSecs)))
	if err != nil {
		return CreateNilKeyWithMemberAndScoreResult(), err
	}

	return handleKeyWithMemberAndScoreResponse(result)
}

// Returns the specified range of elements in the sorted set stored at `key`.
// `ZRANGE` can perform different types of range queries: by index (rank), by the score, or by lexicographical order.
//
// To get the elements with their scores, see [ZRangeWithScores].
//
// See [valkey.io] for more details.
//
// Parameters:
//
//	key - The key of the sorted set.
//	rangeQuery - The range query object representing the type of range query to perform.
//	  - For range queries by index (rank), use [RangeByIndex].
//	  - For range queries by lexicographical order, use [RangeByLex].
//	  - For range queries by score, use [RangeByScore].
//
// Return value:
//
//	An array of elements within the specified range.
//	If `key` does not exist, it is treated as an empty sorted set, and the command returns an empty array.
//
// Example:
//
//	// Retrieve all members of a sorted set in ascending order
//	result, err := client.ZRange("my_sorted_set", options.NewRangeByIndexQuery(0, -1))
//
//	// Retrieve members within a score range in descending order
//	query := options.NewRangeByScoreQuery(
//	    options.NewScoreBoundary(3, false),
//	    options.NewInfiniteScoreBoundary(options.NegativeInfinity)).
//	  SetReverse()
//	result, err := client.ZRange("my_sorted_set", query)
//	// `result` contains members which have scores within the range of negative infinity to 3, in descending order
//
// [valkey.io]: https://valkey.io/commands/zrange/
func (client *baseClient) ZRange(key string, rangeQuery options.ZRangeQuery) ([]string, error) {
	args := make([]string, 0, 10)
	args = append(args, key)
	args = append(args, rangeQuery.ToArgs()...)
	result, err := client.executeCommand(C.ZRange, args)
	if err != nil {
		return nil, err
	}

	return handleStringArrayResponse(result)
}

// Returns the specified range of elements with their scores in the sorted set stored at `key`.
// `ZRANGE` can perform different types of range queries: by index (rank), by the score, or by lexicographical order.
//
// See [valkey.io] for more details.
//
// Parameters:
//
//	key - The key of the sorted set.
//	rangeQuery - The range query object representing the type of range query to perform.
//	  - For range queries by index (rank), use [RangeByIndex].
//	  - For range queries by score, use [RangeByScore].
//
// Return value:
//
//	A map of elements and their scores within the specified range.
//	If `key` does not exist, it is treated as an empty sorted set, and the command returns an empty map.
//
// Example:
//
//	// Retrieve all members of a sorted set in ascending order
//	result, err := client.ZRangeWithScores("my_sorted_set", options.NewRangeByIndexQuery(0, -1))
//
//	// Retrieve members within a score range in descending order
//	query := options.NewRangeByScoreQuery(
//	    options.NewScoreBoundary(3, false),
//	    options.NewInfiniteScoreBoundary(options.NegativeInfinity)).
//	  SetReverse()
//	result, err := client.ZRangeWithScores("my_sorted_set", query)
//	// `result` contains members with scores within the range of negative infinity to 3, in descending order
//
// [valkey.io]: https://valkey.io/commands/zrange/
func (client *baseClient) ZRangeWithScores(
	key string,
	rangeQuery options.ZRangeQueryWithScores,
) (map[string]float64, error) {
	args := make([]string, 0, 10)
	args = append(args, key)
	args = append(args, rangeQuery.ToArgs()...)
	args = append(args, "WITHSCORES")
	result, err := client.executeCommand(C.ZRange, args)
	if err != nil {
		return nil, err
	}

	return handleStringDoubleMapResponse(result)
}

func (client *baseClient) Persist(key string) (bool, error) {
	result, err := client.executeCommand(C.Persist, []string{key})
	if err != nil {
		return defaultBoolResponse, err
	}
	return handleBoolResponse(result)
}

// Returns the number of members in the sorted set stored at `key` with scores between `min` and `max` score.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	 key - The key of the set.
//	 rangeOptions - Contains `min` and `max` score. `min` contains the minimum score to count from.
//	 	`max` contains the maximum score to count up to. Can be positive/negative infinity, or
//		specific score and inclusivity.
//
// Return value:
//
//	The number of members in the specified score range.
//
// Example:
//
//	 key1 := uuid.NewString()
//	 membersScores := map[string]float64{"one": 1.0, "two": 2.0, "three": 3.0 }
//	 zAddResult, err := client.ZAdd(key1, membersScores)
//	 zCountRange := options.NewZCountRangeBuilder(
//			options.NewInfiniteScoreBoundary(options.NegativeInfinity),
//		 	options.NewInfiniteScoreBoundary(options.PositiveInfinity),
//		)
//	 zCountResult, err := client.ZCount(key1, zCountRange)
//	 if err != nil {
//	    // Handle err
//	 }
//	 fmt.Println(zCountResult) // Output: 3
//
// [valkey.io]: https://valkey.io/commands/zcount/
func (client *baseClient) ZCount(key string, rangeOptions *options.ZCountRange) (int64, error) {
	zCountRangeArgs, err := rangeOptions.ToArgs()
	if err != nil {
		return defaultIntResponse, err
	}
	result, err := client.executeCommand(C.ZCount, append([]string{key}, zCountRangeArgs...))
	if err != nil {
		return defaultIntResponse, err
	}
	return handleIntResponse(result)
}

func (client *baseClient) ZRank(key string, member string) (Result[int64], error) {
	result, err := client.executeCommand(C.ZRank, []string{key, member})
	if err != nil {
		return CreateNilInt64Result(), err
	}
	return handleIntOrNilResponse(result)
}

func (client *baseClient) ZRankWithScore(key string, member string) (Result[int64], Result[float64], error) {
	result, err := client.executeCommand(C.ZRank, []string{key, member, options.WithScore})
	if err != nil {
		return CreateNilInt64Result(), CreateNilFloat64Result(), err
	}
	return handleLongAndDoubleOrNullResponse(result)
}

func (client *baseClient) ZRevRank(key string, member string) (Result[int64], error) {
	result, err := client.executeCommand(C.ZRevRank, []string{key, member})
	if err != nil {
		return CreateNilInt64Result(), err
	}
	return handleIntOrNilResponse(result)
}

func (client *baseClient) ZRevRankWithScore(key string, member string) (Result[int64], Result[float64], error) {
	result, err := client.executeCommand(C.ZRevRank, []string{key, member, options.WithScore})
	if err != nil {
		return CreateNilInt64Result(), CreateNilFloat64Result(), err
	}
	return handleLongAndDoubleOrNullResponse(result)
}

func (client *baseClient) XTrim(key string, options *options.XTrimOptions) (int64, error) {
	xTrimArgs, err := options.ToArgs()
	if err != nil {
		return defaultIntResponse, err
	}
	result, err := client.executeCommand(C.XTrim, append([]string{key}, xTrimArgs...))
	if err != nil {
		return defaultIntResponse, err
	}
	return handleIntResponse(result)
}

func (client *baseClient) XLen(key string) (int64, error) {
	result, err := client.executeCommand(C.XLen, []string{key})
	if err != nil {
		return defaultIntResponse, err
	}
	return handleIntResponse(result)
}

// Transfers ownership of pending stream entries that match the specified criteria.
//
// Since:
//
//	Valkey 6.2.0 and above.
//
// See [valkey.io] for more details.
//
// Parameters:
//
//	key - The key of the stream.
//	group - The consumer group name.
//	consumer - The group consumer.
//	minIdleTime - The minimum idle time for the message to be claimed.
//	start - Filters the claimed entries to those that have an ID equal or greater than the specified value.
//
// Return value:
//
//	An object containing the following elements:
//	  - A stream ID to be used as the start argument for the next call to `XAUTOCLAIM`. This ID is
//	    equivalent to the next ID in the stream after the entries that were scanned, or "0-0" if
//	    the entire stream was scanned.
//	  - A map of the claimed entries.
//	  - If you are using Valkey 7.0.0 or above, the response will also include an array containing
//	    the message IDs that were in the Pending Entries List but no longer exist in the stream.
//	    These IDs are deleted from the Pending Entries List.
//
// Example:
//
//	result, err := client.XAutoClaim("myStream", "myGroup", "myConsumer", 42, "0-0")
//	result:
//	// &{
//	//     "1609338788321-0"               // value to be used as `start` argument for the next `xautoclaim` call
//	//     map[
//	//         "1609338752495-0": [        // claimed entries
//	//             ["field 1", "value 1"]
//	//             ["field 2", "value 2"]
//	//         ]
//	//     ]
//	//     [
//	//         "1594324506465-0",          // array of IDs of deleted messages,
//	//         "1594568784150-0"           // included in the response only on valkey 7.0.0 and above
//	//     ]
//	// }
//
// [valkey.io]: https://valkey.io/commands/xautoclaim/
func (client *baseClient) XAutoClaim(
	key string,
	group string,
	consumer string,
	minIdleTime int64,
	start string,
) (XAutoClaimResponse, error) {
	return client.XAutoClaimWithOptions(key, group, consumer, minIdleTime, start, nil)
}

// Transfers ownership of pending stream entries that match the specified criteria.
//
// Since:
//
//	Valkey 6.2.0 and above.
//
// See [valkey.io] for more details.
//
// Parameters:
//
//	key - The key of the stream.
//	group - The consumer group name.
//	consumer - The group consumer.
//	minIdleTime - The minimum idle time for the message to be claimed.
//	start - Filters the claimed entries to those that have an ID equal or greater than the specified value.
//	options - Options detailing how to read the stream.
//
// Return value:
//
//	An object containing the following elements:
//	  - A stream ID to be used as the start argument for the next call to `XAUTOCLAIM`. This ID is
//	    equivalent to the next ID in the stream after the entries that were scanned, or "0-0" if
//	    the entire stream was scanned.
//	  - A map of the claimed entries.
//	  - If you are using Valkey 7.0.0 or above, the response will also include an array containing
//	    the message IDs that were in the Pending Entries List but no longer exist in the stream.
//	    These IDs are deleted from the Pending Entries List.
//
// Example:
//
//	opts := options.NewXAutoClaimOptionsWithCount(1)
//	result, err := client.XAutoClaimWithOptions("myStream", "myGroup", "myConsumer", 42, "0-0", opts)
//	result:
//	// &{
//	//     "1609338788321-0"               // value to be used as `start` argument for the next `xautoclaim` call
//	//     map[
//	//         "1609338752495-0": [        // claimed entries
//	//             ["field 1", "value 1"]
//	//             ["field 2", "value 2"]
//	//         ]
//	//     ]
//	//     [
//	//         "1594324506465-0",          // array of IDs of deleted messages,
//	//         "1594568784150-0"           // included in the response only on valkey 7.0.0 and above
//	//     ]
//	// }
//
// [valkey.io]: https://valkey.io/commands/xautoclaim/
func (client *baseClient) XAutoClaimWithOptions(
	key string,
	group string,
	consumer string,
	minIdleTime int64,
	start string,
	options *options.XAutoClaimOptions,
) (XAutoClaimResponse, error) {
	args := []string{key, group, consumer, utils.IntToString(minIdleTime), start}
	if options != nil {
		optArgs, err := options.ToArgs()
		if err != nil {
			return XAutoClaimResponse{}, err
		}
		args = append(args, optArgs...)
	}
	result, err := client.executeCommand(C.XAutoClaim, args)
	if err != nil {
		return XAutoClaimResponse{}, err
	}
	return handleXAutoClaimResponse(result)
}

// Transfers ownership of pending stream entries that match the specified criteria.
//
// Since:
//
//	Valkey 6.2.0 and above.
//
// See [valkey.io] for more details.
//
// Parameters:
//
//	key - The key of the stream.
//	group - The consumer group name.
//	consumer - The group consumer.
//	minIdleTime - The minimum idle time for the message to be claimed.
//	start - Filters the claimed entries to those that have an ID equal or greater than the specified value.
//
// Return value:
//
//	An object containing the following elements:
//	  - A stream ID to be used as the start argument for the next call to `XAUTOCLAIM`. This ID is
//	    equivalent to the next ID in the stream after the entries that were scanned, or "0-0" if
//	    the entire stream was scanned.
//	  - An array of IDs for the claimed entries.
//	  - If you are using Valkey 7.0.0 or above, the response will also include an array containing
//	    the message IDs that were in the Pending Entries List but no longer exist in the stream.
//	    These IDs are deleted from the Pending Entries List.
//
// Example:
//
//	result, err := client.XAutoClaimJustId("myStream", "myGroup", "myConsumer", 42, "0-0")
//	result:
//	// &{
//	//     "1609338788321-0"               // value to be used as `start` argument for the next `xautoclaim` call
//	//     [
//	//         "1609338752495-0",          // claimed entries
//	//         "1609338752495-1"
//	//     ]
//	//     [
//	//         "1594324506465-0",          // array of IDs of deleted messages,
//	//         "1594568784150-0"           // included in the response only on valkey 7.0.0 and above
//	//     ]
//	// }
//
// [valkey.io]: https://valkey.io/commands/xautoclaim/
func (client *baseClient) XAutoClaimJustId(
	key string,
	group string,
	consumer string,
	minIdleTime int64,
	start string,
) (XAutoClaimJustIdResponse, error) {
	return client.XAutoClaimJustIdWithOptions(key, group, consumer, minIdleTime, start, nil)
}

// Transfers ownership of pending stream entries that match the specified criteria.
//
// Since:
//
//	Valkey 6.2.0 and above.
//
// See [valkey.io] for more details.
//
// Parameters:
//
//	key - The key of the stream.
//	group - The consumer group name.
//	consumer - The group consumer.
//	minIdleTime - The minimum idle time for the message to be claimed.
//	start - Filters the claimed entries to those that have an ID equal or greater than the specified value.
//	options - Options detailing how to read the stream.
//
// Return value:
//
//	An object containing the following elements:
//	  - A stream ID to be used as the start argument for the next call to `XAUTOCLAIM`. This ID is
//	    equivalent to the next ID in the stream after the entries that were scanned, or "0-0" if
//	    the entire stream was scanned.
//	  - An array of IDs for the claimed entries.
//	  - If you are using Valkey 7.0.0 or above, the response will also include an array containing
//	    the message IDs that were in the Pending Entries List but no longer exist in the stream.
//	    These IDs are deleted from the Pending Entries List.
//
// Example:
//
//	opts := options.NewXAutoClaimOptionsWithCount(1)
//	result, err := client.XAutoClaimJustIdWithOptions("myStream", "myGroup", "myConsumer", 42, "0-0", opts)
//	result:
//	// &{
//	//     "1609338788321-0"               // value to be used as `start` argument for the next `xautoclaim` call
//	//     [
//	//         "1609338752495-0",          // claimed entries
//	//         "1609338752495-1"
//	//     ]
//	//     [
//	//         "1594324506465-0",          // array of IDs of deleted messages,
//	//         "1594568784150-0"           // included in the response only on valkey 7.0.0 and above
//	//     ]
//	// }
//
// [valkey.io]: https://valkey.io/commands/xautoclaim/
func (client *baseClient) XAutoClaimJustIdWithOptions(
	key string,
	group string,
	consumer string,
	minIdleTime int64,
	start string,
	options *options.XAutoClaimOptions,
) (XAutoClaimJustIdResponse, error) {
	args := []string{key, group, consumer, utils.IntToString(minIdleTime), start}
	if options != nil {
		optArgs, err := options.ToArgs()
		if err != nil {
			return XAutoClaimJustIdResponse{}, err
		}
		args = append(args, optArgs...)
	}
	args = append(args, "JUSTID")
	result, err := client.executeCommand(C.XAutoClaim, args)
	if err != nil {
		return XAutoClaimJustIdResponse{}, err
	}
	return handleXAutoClaimJustIdResponse(result)
}

// Removes the specified entries by id from a stream, and returns the number of entries deleted.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the stream.
//	ids - An array of entry ids.
//
// Return value:
//
//	The number of entries removed from the stream. This number may be less than the number
//	of entries in `ids`, if the specified `ids` don't exist in the stream.
//
// For example:
//
//	 xAddResult, err := client.XAddWithOptions(
//		"key1",
//	 	[][]string{{"f1", "foo1"}, {"f2", "bar2"}},
//		options.NewXAddOptions().SetId(streamId1),
//	 )
//	 xDelResult, err := client.XDel("key1", []string{streamId1, streamId3})
//	 fmt.Println(xDelResult) // Output: 1
//
// [valkey.io]: https://valkey.io/commands/xdel/
func (client *baseClient) XDel(key string, ids []string) (int64, error) {
	result, err := client.executeCommand(C.XDel, append([]string{key}, ids...))
	if err != nil {
		return defaultIntResponse, err
	}
	return handleIntResponse(result)
}

// Returns the score of `member` in the sorted set stored at `key`.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the sorted set.
//	member - The member whose score is to be retrieved.
//
// Return value:
//
//	The score of the member. If `member` does not exist in the sorted set, `nil` is returned.
//	If `key` does not exist, `nil` is returned.
//
// Example:
//
//	membersScores := map[string]float64{
//		"one":   1.0,
//		"two":   2.0,
//		"three": 3.0,
//	}
//
//	zAddResult, err := client.ZAdd("key1", membersScores)
//	zScoreResult, err := client.ZScore("key1", "one")
//	//fmt.Println(zScoreResult.Value()) // Value: 1.0
//
// [valkey.io]: https://valkey.io/commands/zscore/
func (client *baseClient) ZScore(key string, member string) (Result[float64], error) {
	result, err := client.executeCommand(C.ZScore, []string{key, member})
	if err != nil {
		return CreateNilFloat64Result(), err
	}
	return handleFloatOrNilResponse(result)
}

// Iterates incrementally over a sorted set.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the sorted set.
//	cursor - The cursor that points to the next iteration of results.
//	         A value of `"0"` indicates the start of the search.
//	         For Valkey 8.0 and above, negative cursors are treated like the initial cursor("0").
//
// Return value:
//
//	The first return value is the `cursor` for the next iteration of results. `"0"` will be the `cursor`
//	   returned on the last iteration of the sorted set.
//	The second return value is always an array of the subset of the sorted set held in `key`.
//	The array is a flattened series of `string` pairs, where the value is at even indices and the score is at odd indices.
//
// Example:
//
//	// assume "key" contains a set
//	resCursor, resCol, err := client.ZScan("key", "0")
//	fmt.Println(resCursor)
//	fmt.Println(resCol)
//	for resCursor != "0" {
//	  resCursor, resCol, err = client.ZScan("key", resCursor)
//	  fmt.Println("Cursor: ", resCursor)
//	  fmt.Println("Members: ", resCol)
//	}
//
// [valkey.io]: https://valkey.io/commands/zscan/
func (client *baseClient) ZScan(key string, cursor string) (string, []string, error) {
	result, err := client.executeCommand(C.ZScan, []string{key, cursor})
	if err != nil {
		return "", nil, err
	}
	return handleScanResponse(result)
}

// Iterates incrementally over a sorted set.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the sorted set.
//	cursor - The cursor that points to the next iteration of results.
//	options - The options for the command. See [options.ZScanOptions] for details.
//
// Return value:
//
//	The first return value is the `cursor` for the next iteration of results. `"0"` will be the `cursor`
//	   returned on the last iteration of the sorted set.
//	The second return value is always an array of the subset of the sorted set held in `key`.
//	The array is a flattened series of `string` pairs, where the value is at even indices and the score is at odd indices.
//	If `ZScanOptionsBuilder#noScores` is to `true`, the second return value will only contain the members without scores.
//
// Example:
//
//	resCursor, resCol, err := client.ZScanWithOptions("key", "0", options.NewBaseScanOptionsBuilder().SetMatch("*"))
//	fmt.Println(resCursor)
//	fmt.Println(resCol)
//	for resCursor != "0" {
//	  resCursor, resCol, err = client.ZScanWithOptions("key", resCursor,
//		options.NewBaseScanOptionsBuilder().SetMatch("*"))
//	  fmt.Println("Cursor: ", resCursor)
//	  fmt.Println("Members: ", resCol)
//	}
//
// [valkey.io]: https://valkey.io/commands/zscan/
func (client *baseClient) ZScanWithOptions(
	key string,
	cursor string,
	options *options.ZScanOptions,
) (string, []string, error) {
	optionArgs, err := options.ToArgs()
	if err != nil {
		return "", nil, err
	}

	result, err := client.executeCommand(C.ZScan, append([]string{key, cursor}, optionArgs...))
	if err != nil {
		return "", nil, err
	}
	return handleScanResponse(result)
}

// Returns stream message summary information for pending messages matching a stream and group.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the stream.
//	group - The consumer group name.
//
// Return value:
// An XPendingSummary struct that includes a summary with the following fields:
//
//	NumOfMessages: The total number of pending messages for this consumer group.
//	StartId: The smallest ID among the pending messages or nil if no pending messages exist.
//	EndId: The greatest ID among the pending messages or nil if no pending messages exists.
//	GroupConsumers: An array of ConsumerPendingMessages with the following fields:
//	  ConsumerName: The name of the consumer.
//	  MessageCount: The number of pending messages for this consumer.
//
// Example
//
//	result, err := client.XPending("myStream", "myGroup")
//	if err != nil {
//	  return err
//	}
//	fmt.Println("Number of pending messages: ", result.NumOfMessages)
//	fmt.Println("Start and End ID of messages: ", result.StartId, result.EndId)
//	for _, consumer := range result.ConsumerMessages {
//	  fmt.Printf("Consumer messages:  %s: $v\n", consumer.ConsumerName, consumer.MessageCount)
//	}
//
// [valkey.io]: https://valkey.io/commands/xpending/
func (client *baseClient) XPending(key string, group string) (XPendingSummary, error) {
	result, err := client.executeCommand(C.XPending, []string{key, group})
	if err != nil {
		return XPendingSummary{}, err
	}

	return handleXPendingSummaryResponse(result)
}

// Returns stream message summary information for pending messages matching a given range of IDs.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the stream.
//	group - The consumer group name.
//	opts - The options for the command. See [options.XPendingOptions] for details.
//
// Return value:
// A slice of XPendingDetail structs, where each detail struct includes the following fields:
//
//	Id - The ID of the pending message.
//	ConsumerName - The name of the consumer that fetched the message and has still to acknowledge it.
//	IdleTime - The time in milliseconds since the last time the message was delivered to the consumer.
//	DeliveryCount - The number of times this message was delivered.
//
// Example
//
//	detailResult, err := client.XPendingWithOptions(key, groupName, options.NewXPendingOptions("-", "+", 10))
//	if err != nil {
//	  return err
//	}
//	fmt.Println("=========================")
//	for _, detail := range detailResult {
//	  fmt.Println(detail.Id)
//	  fmt.Println(detail.ConsumerName)
//	  fmt.Println(detail.IdleTime)
//	  fmt.Println(detail.DeliveryCount)
//	  fmt.Println("=========================")
//	}
//
// [valkey.io]: https://valkey.io/commands/xpending/
func (client *baseClient) XPendingWithOptions(
	key string,
	group string,
	opts *options.XPendingOptions,
) ([]XPendingDetail, error) {
	optionArgs, _ := opts.ToArgs()
	args := append([]string{key, group}, optionArgs...)

	result, err := client.executeCommand(C.XPending, args)
	if err != nil {
		return nil, err
	}
	return handleXPendingDetailResponse(result)
}

// Creates a new consumer group uniquely identified by `group` for the stream stored at `key`.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the stream.
//	group - The newly created consumer group name.
//	id - Stream entry ID that specifies the last delivered entry in the stream from the new
//	    group’s perspective. The special ID `"$"` can be used to specify the last entry in the stream.
//
// Return value:
//
//	`"OK"`.
//
// Example:
//
//	ok, err := client.XGroupCreate("mystream", "mygroup", "0-0")
//	if ok != "OK" || err != nil {
//		// handle error
//	}
//
// [valkey.io]: https://valkey.io/commands/xgroup-create/
func (client *baseClient) XGroupCreate(key string, group string, id string) (string, error) {
	return client.XGroupCreateWithOptions(key, group, id, options.NewXGroupCreateOptions())
}

// Creates a new consumer group uniquely identified by `group` for the stream stored at `key`.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the stream.
//	group - The newly created consumer group name.
//	id - Stream entry ID that specifies the last delivered entry in the stream from the new
//	    group's perspective. The special ID `"$"` can be used to specify the last entry in the stream.
//	opts - The options for the command. See [options.XGroupCreateOptions] for details.
//
// Return value:
//
//	`"OK"`.
//
// Example:
//
//	opts := options.NewXGroupCreateOptions().SetMakeStream()
//	ok, err := client.XGroupCreateWithOptions("mystream", "mygroup", "0-0", opts)
//	if ok != "OK" || err != nil {
//		// handle error
//	}
//
// [valkey.io]: https://valkey.io/commands/xgroup-create/
func (client *baseClient) XGroupCreateWithOptions(
	key string,
	group string,
	id string,
	opts *options.XGroupCreateOptions,
) (string, error) {
	optionArgs, _ := opts.ToArgs()
	args := append([]string{key, group, id}, optionArgs...)
	result, err := client.executeCommand(C.XGroupCreate, args)
	if err != nil {
		return defaultStringResponse, err
	}
	return handleStringResponse(result)
}

func (client *baseClient) Restore(key string, ttl int64, value string) (Result[string], error) {
	return client.RestoreWithOptions(key, ttl, value, NewRestoreOptionsBuilder())
}

func (client *baseClient) RestoreWithOptions(key string, ttl int64,
	value string, options *RestoreOptions,
) (Result[string], error) {
	optionArgs, err := options.toArgs()
	if err != nil {
		return CreateNilStringResult(), err
	}
	result, err := client.executeCommand(C.Restore, append([]string{
		key,
		utils.IntToString(ttl), value,
	}, optionArgs...))
	if err != nil {
		return CreateNilStringResult(), err
	}
	return handleStringOrNilResponse(result)
}

func (client *baseClient) Dump(key string) (Result[string], error) {
	result, err := client.executeCommand(C.Dump, []string{key})
	if err != nil {
		return CreateNilStringResult(), err
	}
	return handleStringOrNilResponse(result)
}

func (client *baseClient) ObjectEncoding(key string) (Result[string], error) {
	result, err := client.executeCommand(C.ObjectEncoding, []string{key})
	if err != nil {
		return CreateNilStringResult(), err
	}
	return handleStringOrNilResponse(result)
}

// Echo the provided message back.
// The command will be routed a random node.
//
// Parameters:
//
//	message - The provided message.
//
// Return value:
//
//	The provided message
//
// For example:
//
//	 result, err := client.Echo("Hello World")
//		if err != nil {
//		    // handle error
//		}
//		fmt.Println(result.Value()) // Output: Hello World
//
// [valkey.io]: https://valkey.io/commands/echo/
func (client *baseClient) Echo(message string) (Result[string], error) {
	result, err := client.executeCommand(C.Echo, []string{message})
	if err != nil {
		return CreateNilStringResult(), err
	}
	return handleStringOrNilResponse(result)
}

// Destroys the consumer group `group` for the stream stored at `key`.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the stream.
//	group - The consumer group name to delete.
//
// Return value:
//
//	`true` if the consumer group is destroyed. Otherwise, `false`.
//
// Example:
//
//	ok, err := client.XGroupDestroy("mystream", "mygroup")
//	if !ok || err != nil {
//		// handle errors
//	}
//
// [valkey.io]: https://valkey.io/commands/xgroup-destroy/
func (client *baseClient) XGroupDestroy(key string, group string) (bool, error) {
	result, err := client.executeCommand(C.XGroupDestroy, []string{key, group})
	if err != nil {
		return defaultBoolResponse, err
	}
	return handleBoolResponse(result)
}

// Sets the last delivered ID for a consumer group.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the stream.
//	group - The consumer group name.
//	id - The stream entry ID that should be set as the last delivered ID for the consumer group.
//
// Return value:
//
//	`"OK"`.
//
// Example:
//
//	ok, err := client.XGroupSetId("mystream", "mygroup", "0-0")
//	if ok != "OK" || err != nil {
//		// handle error
//	}
//
// [valkey.io]: https://valkey.io/commands/xgroup-create/
func (client *baseClient) XGroupSetId(key string, group string, id string) (string, error) {
	return client.XGroupSetIdWithOptions(key, group, id, options.NewXGroupSetIdOptionsOptions())
}

// Sets the last delivered ID for a consumer group.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the stream.
//	group - The consumer group name.
//	id - The stream entry ID that should be set as the last delivered ID for the consumer group.
//	opts - The options for the command. See [options.XGroupSetIdOptions] for details.
//
// Return value:
//
//	`"OK"`.
//
// Example:
//
//	opts := options.NewXGroupSetIdOptionsOptions().SetEntriesRead(42)
//	ok, err := client.XGroupSetIdWithOptions("mystream", "mygroup", "0-0", opts)
//	if ok != "OK" || err != nil {
//		// handle error
//	}
//
// [valkey.io]: https://valkey.io/commands/xgroup-create/
func (client *baseClient) XGroupSetIdWithOptions(
	key string,
	group string,
	id string,
	opts *options.XGroupSetIdOptions,
) (string, error) {
	optionArgs, _ := opts.ToArgs()
	args := append([]string{key, group, id}, optionArgs...)
	result, err := client.executeCommand(C.XGroupSetId, args)
	if err != nil {
		return defaultStringResponse, err
	}
	return handleStringResponse(result)
}

// Removes all elements in the sorted set stored at `key` with a lexicographical order
// between `rangeQuery.Start` and `rangeQuery.End`.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the sorted set.
//	rangeQuery - The range query object representing the minimum and maximum bound of the lexicographical range.
//
// Return value:
//
//	The number of members removed from the sorted set.
//	If `key` does not exist, it is treated as an empty sorted set, and the command returns `0`.
//	If `rangeQuery.Start` is greater than `rangeQuery.End`, `0` is returned.
//
// Example:
//
//	zRemRangeByLexResult, err := client.ZRemRangeByLex("key1", options.NewRangeByLexQuery("a", "b"))
//	fmt.Println(zRemRangeByLexResult) // Output: 1
//
// [valkey.io]: https://valkey.io/commands/zremrangebylex/
func (client *baseClient) ZRemRangeByLex(key string, rangeQuery options.RangeByLex) (int64, error) {
	result, err := client.executeCommand(
		C.ZRemRangeByLex, append([]string{key}, rangeQuery.ToArgsRemRange()...))
	if err != nil {
		return defaultIntResponse, err
	}
	return handleIntResponse(result)
}

// Removes all elements in the sorted set stored at `key` with a rank between `start` and `stop`.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the sorted set.
//	start - The start rank.
//	stop - The stop rank.
//
// Return value:
//
//	The number of members removed from the sorted set.
//	If `key` does not exist, it is treated as an empty sorted set, and the command returns `0`.
//	If `start` is greater than `stop`, `0` is returned.
//
// Example:
//
//	zRemRangeByRankResult, err := client.ZRemRangeByRank("key1", 0, 1)
//	fmt.Println(zRemRangeByRankResult) // Output: 1
//
// [valkey.io]: https://valkey.io/commands/zremrangebyrank/
func (client *baseClient) ZRemRangeByRank(key string, start int64, stop int64) (int64, error) {
	result, err := client.executeCommand(C.ZRemRangeByRank, []string{key, utils.IntToString(start), utils.IntToString(stop)})
	if err != nil {
		return 0, err
	}
	return handleIntResponse(result)
}

// Removes all elements in the sorted set stored at `key` with a score between `rangeQuery.Start` and `rangeQuery.End`.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the sorted set.
//	rangeQuery - The range query object representing the minimum and maximum bound of the score range.
//	  can be an implementation of [options.RangeByScore].
//
// Return value:
//
//	The number of members removed from the sorted set.
//	If `key` does not exist, it is treated as an empty sorted set, and the command returns `0`.
//	If `rangeQuery.Start` is greater than `rangeQuery.End`, `0` is returned.
//
// Example:
//
//	zRemRangeByScoreResult, err := client.ZRemRangeByScore("key1", options.NewRangeByScoreBuilder(
//		options.NewInfiniteScoreBoundary(options.NegativeInfinity),
//		options.NewInfiniteScoreBoundary(options.PositiveInfinity),
//	))
//	fmt.Println(zRemRangeByScoreResult) // Output: 1
//
// [valkey.io]: https://valkey.io/commands/zremrangebyscore/
func (client *baseClient) ZRemRangeByScore(key string, rangeQuery options.RangeByScore) (int64, error) {
	result, err := client.executeCommand(C.ZRemRangeByScore, append([]string{key}, rangeQuery.ToArgsRemRange()...))
	if err != nil {
		return 0, err
	}
	return handleIntResponse(result)
}

// Returns the logarithmic access frequency counter of a Valkey object stored at key.
//
// Parameters:
//
//	key - The key of the object to get the logarithmic access frequency counter of.
//
// Return value:
//
//	If key exists, returns the logarithmic access frequency counter of the
//	object stored at key as a long. Otherwise, returns `nil`.
//
// Example:
//
//	result, err := client.ObjectFreq(key)
//	if err != nil {
//		// handle error
//	}
//	fmt.Println(result.Value()) // Output: 1
//
// [valkey.io]: https://valkey.io/commands/object-freq/
func (client *baseClient) ObjectFreq(key string) (Result[int64], error) {
	result, err := client.executeCommand(C.ObjectFreq, []string{key})
	if err != nil {
		return CreateNilInt64Result(), err
	}
	return handleIntOrNilResponse(result)
}

// Returns the logarithmic access frequency counter of a Valkey object stored at key.
//
// Parameters:
//
//	key - The key of the object to get the logarithmic access frequency counter of.
//
// Return value:
//
//	If key exists, returns the idle time in seconds. Otherwise, returns `nil`.
//
// Example:
//
//	result, err := client.ObjectIdleTime(key)
//	if err != nil {
//		// handle error
//	}
//	fmt.Println(result.Value()) // Output: 1
//
// [valkey.io]: https://valkey.io/commands/object-idletime/
func (client *baseClient) ObjectIdleTime(key string) (Result[int64], error) {
	result, err := client.executeCommand(C.ObjectIdleTime, []string{key})
	if err != nil {
		return CreateNilInt64Result(), err
	}
	return handleIntOrNilResponse(result)
}

// Returns the reference count of the object stored at key.
//
// Parameters:
//
//	key - The key of the object to get the reference count of.
//
// Return value:
//
//	If key exists, returns the reference count of the object stored at key.
//	Otherwise, returns `nil`.
//
// Example:
//
//	result, err := client.ObjectRefCount(key)
//	if err != nil {
//	  // handle error
//	}
//	fmt.Println(result.Value()) // Output: 1
//
// [valkey.io]: https://valkey.io/commands/object-refcount/
func (client *baseClient) ObjectRefCount(key string) (Result[int64], error) {
	result, err := client.executeCommand(C.ObjectRefCount, []string{key})
	if err != nil {
		return CreateNilInt64Result(), err
	}
	return handleIntOrNilResponse(result)
}

func (client *baseClient) Sort(key string) ([]Result[string], error) {
	result, err := client.executeCommand(C.Sort, []string{key})
	if err != nil {
		return nil, err
	}
	return handleStringOrNilArrayResponse(result)
}

func (client *baseClient) SortWithOptions(key string, options *options.SortOptions) ([]Result[string], error) {
	optionArgs := options.ToArgs()
	result, err := client.executeCommand(C.Sort, append([]string{key}, optionArgs...))
	if err != nil {
		return nil, err
	}
	return handleStringOrNilArrayResponse(result)
}

func (client *baseClient) SortReadOnly(key string) ([]Result[string], error) {
	result, err := client.executeCommand(C.SortReadOnly, []string{key})
	if err != nil {
		return nil, err
	}
	return handleStringOrNilArrayResponse(result)
}

func (client *baseClient) SortReadOnlyWithOptions(key string, options *options.SortOptions) ([]Result[string], error) {
	optionArgs := options.ToArgs()
	result, err := client.executeCommand(C.SortReadOnly, append([]string{key}, optionArgs...))
	if err != nil {
		return nil, err
	}
	return handleStringOrNilArrayResponse(result)
}

func (client *baseClient) SortStore(key string, destination string) (int64, error) {
	result, err := client.executeCommand(C.Sort, []string{key, "STORE", destination})
	if err != nil {
		return defaultIntResponse, err
	}
	return handleIntResponse(result)
}

func (client *baseClient) SortStoreWithOptions(
	key string,
	destination string,
	options *options.SortOptions,
) (int64, error) {
	optionArgs := options.ToArgs()
	result, err := client.executeCommand(C.Sort, append([]string{key, "STORE", destination}, optionArgs...))
	if err != nil {
		return defaultIntResponse, err
	}
	return handleIntResponse(result)
}

// XGroupCreateConsumer creates a consumer named `consumer` in the consumer group `group` for the
// stream stored at `key`.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the stream.
//	group - The consumer group name.
//	consumer - The newly created consumer.
//
// Return value:
//
//	Returns `true` if the consumer is created. Otherwise, returns `false`.
//
// Example:
//
//	//Creates the consumer "myconsumer" in consumer group "mygroup"
//	success, err := client.xgroupCreateConsumer("mystream", "mygroup", "myconsumer")
//	if err == nil && success {
//	 fmt.Println("Consumer created")
//	}
//
// [valkey.io]: https://valkey.io/commands/xgroup-createconsumer/
func (client *baseClient) XGroupCreateConsumer(
	key string,
	group string,
	consumer string,
) (bool, error) {
	result, err := client.executeCommand(C.XGroupCreateConsumer, []string{key, group, consumer})
	if err != nil {
		return false, err
	}
	return handleBoolResponse(result)
}

// XGroupDelConsumer deletes a consumer named `consumer` in the consumer group `group`.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the stream.
//	group - The consumer group name.
//	consumer - The consumer to delete.
//
// Returns the number of pending messages the `consumer` had before it was deleted.
//
// Example:
//
//	// Deletes the consumer "myconsumer" in consumer group "mygroup"
//	pendingMsgCount, err := client.XGroupDelConsumer("mystream", "mygroup", "myconsumer")
//	if err != nil {
//	    // handle error
//	}
//	fmt.Printf("Consumer 'myconsumer' had %d pending messages unclaimed.\n", pendingMsgCount)
//
// [valkey.io]: https://valkey.io/commands/xgroup-delconsumer/
func (client *baseClient) XGroupDelConsumer(
	key string,
	group string,
	consumer string,
) (int64, error) {
	result, err := client.executeCommand(C.XGroupDelConsumer, []string{key, group, consumer})
	if err != nil {
		return defaultIntResponse, err
	}
	return handleIntResponse(result)
}

// Returns the number of messages that were successfully acknowledged by the consumer group member
// of a stream. This command should be called on a pending message so that such message does not
// get processed again.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key   - The key of the stream.
//	group - he consumer group name.
//	ids   - Stream entry IDs to acknowledge and purge messages.
//
// Return value:
//
//	The number of messages that were successfully acknowledged.
//
// Example:
//
//	// Assuming streamId1 and streamId2 already exist.
//	xackResult, err := client.XAck("key", "groupName", []string{"streamId1", "streamId2"})
//	fmt.Println(xackResult) // 2
//
// [valkey.io]: https://valkey.io/commands/xack/
func (client *baseClient) XAck(key string, group string, ids []string) (int64, error) {
	result, err := client.executeCommand(C.XAck, append([]string{key, group}, ids...))
	if err != nil {
		return defaultIntResponse, err
	}
	return handleIntResponse(result)
}

// Sets or clears the bit at offset in the string value stored at key.
// The offset is a zero-based index, with `0` being the first element of
// the list, `1` being the next element, and so on. The offset must be
// less than `2^32` and greater than or equal to `0` If a key is
// non-existent then the bit at offset is set to value and the preceding
// bits are set to `0`.
//
// Parameters:
//
//	key - The key of the string.
//	offset - The index of the bit to be set.
//	value - The bit value to set at offset The value must be `0` or `1`.
//
// Return value:
//
//	The bit value that was previously stored at offset.
//
// Example:
//
//	result, err := client.SetBit("key", 1, 1)
//	result: 1
//
// [valkey.io]: https://valkey.io/commands/setbit/
func (client *baseClient) SetBit(key string, offset int64, value int64) (int64, error) {
	result, err := client.executeCommand(C.SetBit, []string{key, utils.IntToString(offset), utils.IntToString(value)})
	if err != nil {
		return defaultIntResponse, err
	}
	return handleIntResponse(result)
}

// Returns the bit value at offset in the string value stored at key.
//
//	offset should be greater than or equal to zero.
//
// Parameters:
//
//	key - The key of the string.
//	offset - The index of the bit to return.
//
// Return value:
// The bit at offset of the string. Returns zero if the key is empty or if the positive
// offset exceeds the length of the string.
//
// Example:
//
//	result, err := client.GetBit("key1", 1, 1)
//	result: 1
//
// [valkey.io]: https://valkey.io/commands/getbit/
func (client *baseClient) GetBit(key string, offset int64) (int64, error) {
	result, err := client.executeCommand(C.GetBit, []string{key, utils.IntToString(offset)})
	if err != nil {
		return defaultIntResponse, err
	}
	return handleIntResponse(result)
}

// Wait blocks the current client until all the previous write commands are successfully
// transferred and acknowledged by at least the specified number of replicas or if the timeout is reached,
// whichever is earlier
//
// Parameters:
//
//	numberOfReplicas - The number of replicas to reach.
//	timeout - The timeout value specified in milliseconds. A value of `0` will
//	block indefinitely.
//
// Return value:
// The number of replicas reached by all the writes performed in the context of the current connection.
//
// Example:
//
//	 result, err := client.Wait(1, 1000)
//	 if err != nil {
//		// handle error
//	 }
//	 fmt.Println(result.Value()) // Output: 1 // if cluster has 2 replicasets
//
// [valkey.io]: https://valkey.io/commands/wait/
func (client *baseClient) Wait(numberOfReplicas int64, timeout int64) (int64, error) {
	result, err := client.executeCommand(C.Wait, []string{utils.IntToString(numberOfReplicas), utils.IntToString(timeout)})
	if err != nil {
		return defaultIntResponse, err
	}
	return handleIntResponse(result)
}

// Counts the number of set bits (population counting) in a string stored at key.
//
// Parameters:
//
//	key - The key for the string to count the set bits of.
//
// Return value:
// The number of set bits in the string. Returns zero if the key is missing as it is
// treated as an empty string.
//
// Example:
//
//	result, err := client.BitCount("mykey")
//	result: 26
//
// [valkey.io]: https://valkey.io/commands/bitcount/
func (client *baseClient) BitCount(key string) (int64, error) {
	result, err := client.executeCommand(C.BitCount, []string{key})
	if err != nil {
		return defaultIntResponse, err
	}
	return handleIntResponse(result)
}

// Counts the number of set bits (population counting) in a string stored at key. The
// offsets start and end are zero-based indexes, with `0` being the first element of the
// list, `1` being the next element and so on. These offsets can also be negative numbers
// indicating offsets starting at the end of the list, with `-1` being the last element
// of the list, `-2` being the penultimate, and so on.
//
// Parameters:
//
//	key - The key for the string to count the set bits of.
//	options - The offset options - see [options.BitOffsetOptions].
//
// Return value:
// The number of set bits in the string interval specified by start, end, and options.
// Returns zero if the key is missing as it is treated as an empty string.
//
// Example:
//
//	opts := NewBitCountOptionsBuilder().SetStart(1).SetEnd(1).SetBitmapIndexType(options.BYTE)
//	result, err := client.BitCount("mykey",options)
//	result: 6
//
// [valkey.io]: https://valkey.io/commands/bitcount/
func (client *baseClient) BitCountWithOptions(key string, opts *options.BitCountOptions) (int64, error) {
	optionArgs, err := opts.ToArgs()
	if err != nil {
		return defaultIntResponse, err
	}
	commandArgs := append([]string{key}, optionArgs...)
	result, err := client.executeCommand(C.BitCount, commandArgs)
	if err != nil {
		return defaultIntResponse, err
	}
	return handleIntResponse(result)
}

// Changes the ownership of a pending message.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key         - The key of the stream.
//	group       - The name of the consumer group.
//	consumer    - The name of the consumer.
//	minIdleTime - The minimum idle time in milliseconds.
//	ids         - The ids of the entries to claim.
//
// Return value:
//
//	A `map of message entries with the format `{"entryId": [["entry", "data"], ...], ...}` that were claimed by
//	the consumer.
//
// Example:
//
//	result, err := client.XClaim("key", "group", "consumer", 1000, []string{"streamId1", "streamId2"})
//	fmt.Println(result) // Output: map[streamId1:[["entry1", "data1"], ["entry2", "data2"]] streamId2:[["entry3", "data3"]]]
//
// [valkey.io]: https://valkey.io/commands/xclaim/
func (client *baseClient) XClaim(
	key string,
	group string,
	consumer string,
	minIdleTime int64,
	ids []string,
) (map[string][][]string, error) {
	return client.XClaimWithOptions(key, group, consumer, minIdleTime, ids, nil)
}

// Changes the ownership of a pending message.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key         - The key of the stream.
//	group       - The name of the consumer group.
//	consumer    - The name of the consumer.
//	minIdleTime - The minimum idle time in milliseconds.
//	ids         - The ids of the entries to claim.
//	options     - Stream claim options.
//
// Return value:
//
//	A `map` of message entries with the format `{"entryId": [["entry", "data"], ...], ...}` that were claimed by
//	the consumer.
//
// Example:
//
//	result, err := client.XClaimWithOptions(
//		"key",
//		"group",
//		"consumer",
//		1000,
//		[]string{"streamId1", "streamId2"},
//		options.NewStreamClaimOptions().SetIdleTime(1),
//	)
//	fmt.Println(result) // Output: map[streamId1:[["entry1", "data1"], ["entry2", "data2"]] streamId2:[["entry3", "data3"]]]
//
// [valkey.io]: https://valkey.io/commands/xclaim/
func (client *baseClient) XClaimWithOptions(
	key string,
	group string,
	consumer string,
	minIdleTime int64,
	ids []string,
	opts *options.StreamClaimOptions,
) (map[string][][]string, error) {
	args := append([]string{key, group, consumer, utils.IntToString(minIdleTime)}, ids...)
	if opts != nil {
		optionArgs, err := opts.ToArgs()
		if err != nil {
			return nil, err
		}
		args = append(args, optionArgs...)
	}
	result, err := client.executeCommand(C.XClaim, args)
	if err != nil {
		return nil, err
	}
	return handleMapOfArrayOfStringArrayResponse(result)
}

// Changes the ownership of a pending message. This function returns an `array` with
// only the message/entry IDs, and is equivalent to using `JUSTID` in the Valkey API.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key         - The key of the stream.
//	group       - The name of the consumer group.
//	consumer    - The name of the consumer.
//	minIdleTime - The minimum idle time in milliseconds.
//	ids         - The ids of the entries to claim.
//	options     - Stream claim options.
//
// Return value:
//
//	An array of the ids of the entries that were claimed by the consumer.
//
// Example:
//
//	result, err := client.XClaimJustId(
//		"key",
//		"group",
//		"consumer",
//		1000,
//		[]string{"streamId1", "streamId2"},
//	)
//	fmt.Println(result) // Output: ["streamId1", "streamId2"]
//
// [valkey.io]: https://valkey.io/commands/xclaim/
func (client *baseClient) XClaimJustId(
	key string,
	group string,
	consumer string,
	minIdleTime int64,
	ids []string,
) ([]string, error) {
	return client.XClaimJustIdWithOptions(key, group, consumer, minIdleTime, ids, nil)
}

// Changes the ownership of a pending message. This function returns an `array` with
// only the message/entry IDs, and is equivalent to using `JUSTID` in the Valkey API.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key         - The key of the stream.
//	group       - The name of the consumer group.
//	consumer    - The name of the consumer.
//	minIdleTime - The minimum idle time in milliseconds.
//	ids         - The ids of the entries to claim.
//	options     - Stream claim options.
//
// Return value:
//
//	An array of the ids of the entries that were claimed by the consumer.
//
// Example:
//
//	result, err := client.XClaimJustIdWithOptions(
//		"key",
//		"group",
//		"consumer",
//		1000,
//		[]string{"streamId1", "streamId2"},
//		options.NewStreamClaimOptions().SetIdleTime(1),
//	)
//	fmt.Println(result) // Output: ["streamId1", "streamId2"]
//
// [valkey.io]: https://valkey.io/commands/xclaim/
func (client *baseClient) XClaimJustIdWithOptions(
	key string,
	group string,
	consumer string,
	minIdleTime int64,
	ids []string,
	opts *options.StreamClaimOptions,
) ([]string, error) {
	args := append([]string{key, group, consumer, utils.IntToString(minIdleTime)}, ids...)
	if opts != nil {
		optionArgs, err := opts.ToArgs()
		if err != nil {
			return nil, err
		}
		args = append(args, optionArgs...)
	}
	args = append(args, options.JUST_ID_VALKEY_API)
	result, err := client.executeCommand(C.XClaim, args)
	if err != nil {
		return nil, err
	}
	return handleStringArrayResponse(result)
}
