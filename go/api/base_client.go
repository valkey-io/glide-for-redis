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

	return handleStringArrayResponse(result)
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

func (client *baseClient) HGetAll(key string) (map[Result[string]]Result[string], error) {
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

	return handleStringArrayResponse(result)
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

func (client *baseClient) HVals(key string) ([]Result[string], error) {
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

func (client *baseClient) HKeys(key string) ([]Result[string], error) {
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

func (client *baseClient) HScan(key string, cursor string) (Result[string], []Result[string], error) {
	result, err := client.executeCommand(C.HScan, []string{key, cursor})
	if err != nil {
		return CreateNilStringResult(), nil, err
	}
	return handleScanResponse(result)
}

func (client *baseClient) HScanWithOptions(
	key string,
	cursor string,
	options *options.HashScanOptions,
) (Result[string], []Result[string], error) {
	optionArgs, err := options.ToArgs()
	if err != nil {
		return CreateNilStringResult(), nil, err
	}

	result, err := client.executeCommand(C.HScan, append([]string{key, cursor}, optionArgs...))
	if err != nil {
		return CreateNilStringResult(), nil, err
	}
	return handleScanResponse(result)
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

func (client *baseClient) LPopCount(key string, count int64) ([]Result[string], error) {
	result, err := client.executeCommand(C.LPop, []string{key, utils.IntToString(count)})
	if err != nil {
		return nil, err
	}

	return handleStringArrayOrNullResponse(result)
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

func (client *baseClient) LPosCount(key string, element string, count int64) ([]Result[int64], error) {
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
) ([]Result[int64], error) {
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

func (client *baseClient) SMembers(key string) (map[Result[string]]struct{}, error) {
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

func (client *baseClient) SDiff(keys []string) (map[Result[string]]struct{}, error) {
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

func (client *baseClient) SInter(keys []string) (map[Result[string]]struct{}, error) {
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

func (client *baseClient) SUnion(keys []string) (map[Result[string]]struct{}, error) {
	result, err := client.executeCommand(C.SUnion, keys)
	if err != nil {
		return nil, err
	}

	return handleStringSetResponse(result)
}

func (client *baseClient) SScan(key string, cursor string) (Result[string], []Result[string], error) {
	result, err := client.executeCommand(C.SScan, []string{key, cursor})
	if err != nil {
		return CreateNilStringResult(), nil, err
	}
	return handleScanResponse(result)
}

func (client *baseClient) SScanWithOptions(
	key string,
	cursor string,
	options *options.BaseScanOptions,
) (Result[string], []Result[string], error) {
	optionArgs, err := options.ToArgs()
	if err != nil {
		return CreateNilStringResult(), nil, err
	}

	result, err := client.executeCommand(C.SScan, append([]string{key, cursor}, optionArgs...))
	if err != nil {
		return CreateNilStringResult(), nil, err
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

func (client *baseClient) LRange(key string, start int64, end int64) ([]Result[string], error) {
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

func (client *baseClient) RPopCount(key string, count int64) ([]Result[string], error) {
	result, err := client.executeCommand(C.RPop, []string{key, utils.IntToString(count)})
	if err != nil {
		return nil, err
	}

	return handleStringArrayOrNullResponse(result)
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

func (client *baseClient) BLPop(keys []string, timeoutSecs float64) ([]Result[string], error) {
	result, err := client.executeCommand(C.BLPop, append(keys, utils.FloatToString(timeoutSecs)))
	if err != nil {
		return nil, err
	}

	return handleStringArrayOrNullResponse(result)
}

func (client *baseClient) BRPop(keys []string, timeoutSecs float64) ([]Result[string], error) {
	result, err := client.executeCommand(C.BRPop, append(keys, utils.FloatToString(timeoutSecs)))
	if err != nil {
		return nil, err
	}

	return handleStringArrayOrNullResponse(result)
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

func (client *baseClient) LMPop(keys []string, listDirection ListDirection) (map[Result[string]][]Result[string], error) {
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

	return handleStringToStringArrayMapOrNullResponse(result)
}

func (client *baseClient) LMPopCount(
	keys []string,
	listDirection ListDirection,
	count int64,
) (map[Result[string]][]Result[string], error) {
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

	return handleStringToStringArrayMapOrNullResponse(result)
}

func (client *baseClient) BLMPop(
	keys []string,
	listDirection ListDirection,
	timeoutSecs float64,
) (map[Result[string]][]Result[string], error) {
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

	return handleStringToStringArrayMapOrNullResponse(result)
}

func (client *baseClient) BLMPopCount(
	keys []string,
	listDirection ListDirection,
	count int64,
	timeoutSecs float64,
) (map[Result[string]][]Result[string], error) {
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

	return handleStringToStringArrayMapOrNullResponse(result)
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

func (client *baseClient) Type(key string) (Result[string], error) {
	result, err := client.executeCommand(C.Type, []string{key})
	if err != nil {
		return CreateNilStringResult(), err
	}
	return handleStringOrNilResponse(result)
}

func (client *baseClient) Touch(keys []string) (int64, error) {
	result, err := client.executeCommand(C.Touch, keys)
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

func (client *baseClient) Rename(key string, newKey string) (Result[string], error) {
	result, err := client.executeCommand(C.Rename, []string{key, newKey})
	if err != nil {
		return CreateNilStringResult(), err
	}
	return handleStringOrNilResponse(result)
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

func (client *baseClient) ZPopMin(key string) (map[Result[string]]Result[float64], error) {
	result, err := client.executeCommand(C.ZPopMin, []string{key})
	if err != nil {
		return nil, err
	}
	return handleStringDoubleMapResponse(result)
}

func (client *baseClient) ZPopMinWithCount(key string, count int64) (map[Result[string]]Result[float64], error) {
	result, err := client.executeCommand(C.ZPopMin, []string{key, utils.IntToString(count)})
	if err != nil {
		return nil, err
	}
	return handleStringDoubleMapResponse(result)
}

func (client *baseClient) ZPopMax(key string) (map[Result[string]]Result[float64], error) {
	result, err := client.executeCommand(C.ZPopMax, []string{key})
	if err != nil {
		return nil, err
	}
	return handleStringDoubleMapResponse(result)
}

func (client *baseClient) ZPopMaxWithCount(key string, count int64) (map[Result[string]]Result[float64], error) {
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
//
// query := options.NewRangeByScoreQuery(options.NewScoreBoundary(3, false),
// options.NewInfiniteScoreBoundary(options.NegativeInfinity)).
//
//	  .SetReverse()
//	result, err := client.ZRange("my_sorted_set", query)
//	// `result` contains members which have scores within the range of negative infinity to 3, in descending order
//
// [valkey.io]: https://valkey.io/commands/zrange/
func (client *baseClient) ZRange(key string, rangeQuery options.ZRangeQuery) ([]Result[string], error) {
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
//
// query := options.NewRangeByScoreQuery(options.NewScoreBoundary(3, false),
// options.NewInfiniteScoreBoundary(options.NegativeInfinity)).
//
//	  SetReverse()
//	result, err := client.ZRangeWithScores("my_sorted_set", query)
//	// `result` contains members with scores within the range of negative infinity to 3, in descending order
//
// [valkey.io]: https://valkey.io/commands/zrange/
func (client *baseClient) ZRangeWithScores(
	key string,
	rangeQuery options.ZRangeQueryWithScores,
) (map[Result[string]]Result[float64], error) {
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
//	fmt.Println(resCursor.Value())
//	fmt.Println(resCol.Value())
//	for resCursor != "0" {
//	  resCursor, resCol, err = client.ZScan("key", resCursor.Value())
//	  fmt.Println("Cursor: ", resCursor.Value())
//	  fmt.Println("Members: ", resCol.Value())
//	}
//
// [valkey.io]: https://valkey.io/commands/zscan/
func (client *baseClient) ZScan(key string, cursor string) (Result[string], []Result[string], error) {
	result, err := client.executeCommand(C.ZScan, []string{key, cursor})
	if err != nil {
		return CreateNilStringResult(), nil, err
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
//	fmt.Println(resCursor.Value())
//	fmt.Println(resCol.Value())
//	for resCursor != "0" {
//	  resCursor, resCol, err = client.ZScanWithOptions("key", resCursor.Value(),
//		options.NewBaseScanOptionsBuilder().SetMatch("*"))
//	  fmt.Println("Cursor: ", resCursor.Value())
//	  fmt.Println("Members: ", resCol.Value())
//	}
//
// [valkey.io]: https://valkey.io/commands/zscan/
func (client *baseClient) ZScanWithOptions(
	key string,
	cursor string,
	options *options.ZScanOptions,
) (Result[string], []Result[string], error) {
	optionArgs, err := options.ToArgs()
	if err != nil {
		return CreateNilStringResult(), nil, err
	}

	result, err := client.executeCommand(C.ZScan, append([]string{key, cursor}, optionArgs...))
	if err != nil {
		return CreateNilStringResult(), nil, err
	}
	return handleScanResponse(result)
}
