// Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

package api

// #cgo LDFLAGS: -L../target/release -lglide_rs
// #include "../lib.h"
//
// void successCallback(void *channelPtr, struct CommandResponse *message);
// void failureCallback(void *channelPtr, char *errMessage, RequestErrorType errType);
import "C"

import (
	"fmt"
	"math"
	"strconv"
	"unsafe"

	"github.com/valkey-io/valkey-glide/go/glide/api/config"
	"github.com/valkey-io/valkey-glide/go/glide/api/errors"
	"github.com/valkey-io/valkey-glide/go/glide/api/options"
	"github.com/valkey-io/valkey-glide/go/glide/protobuf"
	"github.com/valkey-io/valkey-glide/go/glide/utils"
	"google.golang.org/protobuf/proto"
)

// BaseClient defines an interface for methods common to both [GlideClientCommands] and [GlideClusterClientCommands].
type BaseClient interface {
	StringCommands
	HashCommands
	ListCommands
	SetCommands
	StreamCommands
	SortedSetCommands
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
	defer C.free_error_message(cErrorMessage)
	msg := C.GoString(cErrorMessage)
	resultChannel := *(*chan payload)(channelPtr)
	resultChannel <- payload{value: nil, error: errors.GoError(uint32(cErrorType), msg)}
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
		return nil, &errors.ConnectionError{Msg: message}
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
	route config.Route,
) (*C.struct_CommandResponse, error) {
	if client.coreClient == nil {
		return nil, &errors.ClosingError{Msg: "ExecuteCommand failed. The client is closed."}
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
		routeProto, err := route.ToRoutesProtobuf()
		if err != nil {
			return nil, &errors.RequestError{Msg: "ExecuteCommand failed due to invalid route"}
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

// Set the given key with the given value. The return value is a response from Valkey containing the string "OK".
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key   - The key to store.
//	value - The value to store with the given key.
//
// Return value:
//
//	`"OK"` response on success.
//
// [valkey.io]: https://valkey.io/commands/set/
func (client *baseClient) Set(key string, value string) (string, error) {
	result, err := client.executeCommand(C.Set, []string{key, value})
	if err != nil {
		return defaultStringResponse, err
	}

	return handleStringResponse(result)
}

// SetWithOptions sets the given key with the given value using the given options. The return value is dependent on the
// passed options. If the value is successfully set, "OK" is returned. If value isn't set because of [OnlyIfExists] or
// [OnlyIfDoesNotExist] conditions, api.CreateNilStringResult() is returned. If [SetOptions#ReturnOldValue] is
// set, the old value is returned.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key     - The key to store.
//	value   - The value to store with the given key.
//	options - The [api.SetOptions].
//
// Return value:
//
//	If the value is successfully set, return api.Result[string] containing "OK".
//	If value isn't set because of ConditionalSet.OnlyIfExists or ConditionalSet.OnlyIfDoesNotExist conditions, return
//	api.CreateNilStringResult().
//	If SetOptions.returnOldValue is set, return the old value as a String.
//
// [valkey.io]: https://valkey.io/commands/set/
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

// Get string value associated with the given key, or api.CreateNilStringResult() is returned if no such value
// exists.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key to be retrieved from the database.
//
// Return value:
//
//	If key exists, returns the value of key as a String. Otherwise, return [api.CreateNilStringResult()].
//
// [valkey.io]: https://valkey.io/commands/get/
func (client *baseClient) Get(key string) (Result[string], error) {
	result, err := client.executeCommand(C.Get, []string{key})
	if err != nil {
		return CreateNilStringResult(), err
	}

	return handleStringOrNilResponse(result)
}

// Get string value associated with the given key, or an empty string is returned [api.CreateNilStringResult()] if no such
// value exists.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key to be retrieved from the database.
//
// Return value:
//
//	If key exists, returns the value of key as a Result[string]. Otherwise, return [api.CreateNilStringResult()].
//
// [valkey.io]: https://valkey.io/commands/getex/
func (client *baseClient) GetEx(key string) (Result[string], error) {
	result, err := client.executeCommand(C.GetEx, []string{key})
	if err != nil {
		return CreateNilStringResult(), err
	}

	return handleStringOrNilResponse(result)
}

// Get string value associated with the given key and optionally sets the expiration of the key.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key to be retrieved from the database.
//	options - The [api.GetExOptions].
//
// Return value:
//
//	If key exists, returns the value of key as a Result[string]. Otherwise, return [api.CreateNilStringResult()].
//
// [valkey.io]: https://valkey.io/commands/getex/
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

// Sets multiple keys to multiple values in a single operation.
//
// Note:
//
//	In cluster mode, if keys in `keyValueMap` map to different hash slots, the command
//	will be split across these slots and executed separately for each. This means the command
//	is atomic only at the slot level. If one or more slot-specific requests fail, the entire
//	call will return the first encountered error, even though some requests may have succeeded
//	while others did not. If this behavior impacts your application logic, consider splitting
//	the request into sub-requests per slot to ensure atomicity.
//
// Parameters:
//
//	keyValueMap - A key-value map consisting of keys and their respective values to set.
//
// Return value:
//
//	`"OK"` on success.
//
// [valkey.io]: https://valkey.io/commands/mset/
func (client *baseClient) MSet(keyValueMap map[string]string) (string, error) {
	result, err := client.executeCommand(C.MSet, utils.MapToString(keyValueMap))
	if err != nil {
		return defaultStringResponse, err
	}

	return handleStringResponse(result)
}

// Sets multiple keys to values if the key does not exist. The operation is atomic, and if one or more keys already exist,
// the entire operation fails.
//
// Note:
//
//	In cluster mode, if keys in `keyValueMap` map to different hash slots, the command
//	will be split across these slots and executed separately for each. This means the command
//	is atomic only at the slot level. If one or more slot-specific requests fail, the entire
//	call will return the first encountered error, even though some requests may have succeeded
//	while others did not. If this behavior impacts your application logic, consider splitting
//	the request into sub-requests per slot to ensure atomicity.
//
// Parameters:
//
//	keyValueMap - A key-value map consisting of keys and their respective values to set.
//
// Return value:
//
//	A bool containing true, if all keys were set. false, if no key was set.
//
// [valkey.io]: https://valkey.io/commands/msetnx/
func (client *baseClient) MSetNX(keyValueMap map[string]string) (bool, error) {
	result, err := client.executeCommand(C.MSetNX, utils.MapToString(keyValueMap))
	if err != nil {
		return defaultBoolResponse, err
	}

	return handleBoolResponse(result)
}

// Retrieves the values of multiple keys.
//
// Note:
//
//	In cluster mode, if keys in `keys` map to different hash slots, the command
//	will be split across these slots and executed separately for each. This means the command
//	is atomic only at the slot level. If one or more slot-specific requests fail, the entire
//	call will return the first encountered error, even though some requests may have succeeded
//	while others did not. If this behavior impacts your application logic, consider splitting
//	the request into sub-requests per slot to ensure atomicity.
//
// Parameters:
//
//	keys - A list of keys to retrieve values for.
//
// Return value:
//
//	An array of values corresponding to the provided keys.
//	If a key is not found, its corresponding value in the list will be a [api.CreateNilStringResult()]
//
// [valkey.io]: https://valkey.io/commands/mget/
func (client *baseClient) MGet(keys []string) ([]Result[string], error) {
	result, err := client.executeCommand(C.MGet, keys)
	if err != nil {
		return nil, err
	}

	return handleStringOrNilArrayResponse(result)
}

// Increments the number stored at key by one. If key does not exist, it is set to 0 before performing the operation.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key to increment its value.
//
// Return value:
//
//	The value of `key` after the increment.
//
// [valkey.io]: https://valkey.io/commands/incr/
func (client *baseClient) Incr(key string) (int64, error) {
	result, err := client.executeCommand(C.Incr, []string{key})
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

// Increments the number stored at key by amount. If key does not exist, it is set to 0 before performing the operation.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key    - The key to increment its value.
//	amount - The amount to increment.
//
// Return value:
//
//	The value of `key` after the increment.
//
// [valkey.io]: https://valkey.io/commands/incrby/
func (client *baseClient) IncrBy(key string, amount int64) (int64, error) {
	result, err := client.executeCommand(C.IncrBy, []string{key, utils.IntToString(amount)})
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

// Increments the string representing a floating point number stored at key by amount. By using a negative increment value,
// the result is that the value stored at key is decremented. If key does not exist, it is set to `0` before performing the
// operation.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key    - The key to increment its value.
//	amount - The amount to increment.
//
// Return value:
//
//	The value of key after the increment.
//
// [valkey.io]: https://valkey.io/commands/incrbyfloat/
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

// Decrements the number stored at key by one. If key does not exist, it is set to 0 before performing the operation.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key to decrement its value.
//
// Return value:
//
//	The value of `key` after the decrement.
//
// [valkey.io]: https://valkey.io/commands/decr/
func (client *baseClient) Decr(key string) (int64, error) {
	result, err := client.executeCommand(C.Decr, []string{key})
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

// Decrements the number stored at code by amount. If key does not exist, it is set to 0 before performing the operation.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key    - The key to decrement its value.
//	amount - The amount to decrement.
//
// Return value:
//
//	The value of `key` after the decrement.
//
// [valkey.io]: https://valkey.io/commands/decrby/
func (client *baseClient) DecrBy(key string, amount int64) (int64, error) {
	result, err := client.executeCommand(C.DecrBy, []string{key, utils.IntToString(amount)})
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

// Returns the length of the string value stored at key.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key to check its length.
//
// Return value:
//
//	The length of the string value stored at `key`.
//	If key does not exist, it is treated as an empty string, and the command returns `0`.
//
// [valkey.io]: https://valkey.io/commands/strlen/
func (client *baseClient) Strlen(key string) (int64, error) {
	result, err := client.executeCommand(C.Strlen, []string{key})
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

// Overwrites part of the string stored at key, starting at the specified byte's offset, for the entire length of value.
// If the offset is larger than the current length of the string at key, the string is padded with zero bytes to make
// offset fit.
// Creates the key if it doesn't exist.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key    - The key of the string to update.
//	offset - The position in the string where value should be written.
//	value  - The string written with offset.
//
// Return value:
//
//	The length of the string stored at `key` after it was modified.
//
// [valkey.io]: https://valkey.io/commands/setrange/
func (client *baseClient) SetRange(key string, offset int, value string) (int64, error) {
	result, err := client.executeCommand(C.SetRange, []string{key, strconv.Itoa(offset), value})
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

// Returns the substring of the string value stored at key, determined by the byte's offsets start and end (both are
// inclusive).
// Negative offsets can be used in order to provide an offset starting from the end of the string. So `-1` means the last
// character, `-2` the penultimate and so forth.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key   - The key of the string.
//	start - The starting offset.
//	end   - The ending offset.
//
// Return value:
//
//	A substring extracted from the value stored at key. Returns empty string if the offset is out of bounds.
//
// [valkey.io]: https://valkey.io/commands/getrange/
func (client *baseClient) GetRange(key string, start int, end int) (string, error) {
	result, err := client.executeCommand(C.GetRange, []string{key, strconv.Itoa(start), strconv.Itoa(end)})
	if err != nil {
		return defaultStringResponse, err
	}

	return handleStringResponse(result)
}

// Appends a value to a key. If key does not exist it is created and set as an empty string, so APPEND will be similar to
// SET in this special case.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key   - The key of the string.
//	value - The value to append.
//
// Return value:
//
//	The length of the string after appending the value.
//
// [valkey.io]: https://valkey.io/commands/append/
func (client *baseClient) Append(key string, value string) (int64, error) {
	result, err := client.executeCommand(C.Append, []string{key, value})
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

// Returns the longest common subsequence between strings stored at key1 and key2.
//
// Since:
//
//	Valkey 7.0 and above.
//
// Note:
//
//	In cluster mode, if keys in `keyValueMap` map to different hash slots, the command
//	will be split across these slots and executed separately for each. This means the command
//	is atomic only at the slot level. If one or more slot-specific requests fail, the entire
//	call will return the first encountered error, even though some requests may have succeeded
//	while others did not. If this behavior impacts your application logic, consider splitting
//	the request into sub-requests per slot to ensure atomicity.
//
// Parameters:
//
//	key1 - The key that stores the first string.
//	key2 - The key that stores the second string.
//
// Return value:
//
//	The longest common subsequence between the 2 strings.
//	An empty string is returned if the keys do not exist or have no common subsequences.
//
// [valkey.io]: https://valkey.io/commands/lcs/
func (client *baseClient) LCS(key1 string, key2 string) (string, error) {
	result, err := client.executeCommand(C.LCS, []string{key1, key2})
	if err != nil {
		return defaultStringResponse, err
	}

	return handleStringResponse(result)
}

// GetDel gets the value associated with the given key and deletes the key.
//
// Parameters:
//
//	key - The key to get and delete.
//
// Return value:
//
//	If key exists, returns the value of the key as a String and deletes the key.
//	If key does not exist, returns a [api.NilResult[string]] (api.CreateNilStringResult()).
//
// [valkey.io]: https://valkey.io/commands/getdel/
func (client *baseClient) GetDel(key string) (Result[string], error) {
	if key == "" {
		return CreateNilStringResult(), &errors.RequestError{Msg: "key is required"}
	}

	result, err := client.executeCommand(C.GetDel, []string{key})
	if err != nil {
		return CreateNilStringResult(), err
	}

	return handleStringOrNilResponse(result)
}

// HGet returns the value associated with field in the hash stored at key.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key   - The key of the hash.
//	field - The field in the hash stored at key to retrieve from the database.
//
// Return value:
//
//	The Result[string] associated with field, or [api.NilResult[string]](api.CreateNilStringResult()) when field is not
//	present in the hash or key does not exist.
//
// [valkey.io]: https://valkey.io/commands/hget/
func (client *baseClient) HGet(key string, field string) (Result[string], error) {
	result, err := client.executeCommand(C.HGet, []string{key, field})
	if err != nil {
		return CreateNilStringResult(), err
	}

	return handleStringOrNilResponse(result)
}

// HGetAll returns all fields and values of the hash stored at key.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the hash.
//
// Return value:
//
//	A map of all fields and their values as Result[string] in the hash, or an empty map when key does not exist.
//
// [valkey.io]: https://valkey.io/commands/hgetall/
func (client *baseClient) HGetAll(key string) (map[string]string, error) {
	result, err := client.executeCommand(C.HGetAll, []string{key})
	if err != nil {
		return nil, err
	}

	return handleStringToStringMapResponse(result)
}

// HMGet returns the values associated with the specified fields in the hash stored at key.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key    - The key of the hash.
//	fields - The fields in the hash stored at key to retrieve from the database.
//
// Return value:
//
//	An array of Result[string]s associated with the given fields, in the same order as they are requested.
//
//	For every field that does not exist in the hash, a [api.NilResult[string]](api.CreateNilStringResult()) is
//	returned.
//
//	If key does not exist, returns an empty string array.
//
// [valkey.io]: https://valkey.io/commands/hmget/
func (client *baseClient) HMGet(key string, fields []string) ([]Result[string], error) {
	result, err := client.executeCommand(C.HMGet, append([]string{key}, fields...))
	if err != nil {
		return nil, err
	}

	return handleStringOrNilArrayResponse(result)
}

// HSet sets the specified fields to their respective values in the hash stored at key.
// This command overwrites the values of specified fields that exist in the hash.
// If key doesn't exist, a new key holding a hash is created.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key    - The key of the hash.
//	values - A map of field-value pairs to set in the hash.
//
// Return value:
//
//	The number of fields that were added or updated.
//
// [valkey.io]: https://valkey.io/commands/hset/
func (client *baseClient) HSet(key string, values map[string]string) (int64, error) {
	result, err := client.executeCommand(C.HSet, utils.ConvertMapToKeyValueStringArray(key, values))
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

// HSetNX sets field in the hash stored at key to value, only if field does not yet exist.
// If key does not exist, a new key holding a hash is created.
// If field already exists, this operation has no effect.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key   - The key of the hash.
//	field - The field to set.
//	value - The value to set.
//
// Return value:
//
//	A bool containing true if field is a new field in the hash and value was set.
//	false if field already exists in the hash and no operation was performed.
//
// [valkey.io]: https://valkey.io/commands/hsetnx/
func (client *baseClient) HSetNX(key string, field string, value string) (bool, error) {
	result, err := client.executeCommand(C.HSetNX, []string{key, field, value})
	if err != nil {
		return defaultBoolResponse, err
	}

	return handleBoolResponse(result)
}

// HDel removes the specified fields from the hash stored at key.
// Specified fields that do not exist within this hash are ignored.
// If key does not exist, it is treated as an empty hash and this command returns 0.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key    - The key of the hash.
//	fields - The fields to remove from the hash stored at key.
//
// Return value:
//
//	The number of fields that were removed from the hash, not including specified but non-existing fields.
//
// [valkey.io]: https://valkey.io/commands/hdel/
func (client *baseClient) HDel(key string, fields []string) (int64, error) {
	result, err := client.executeCommand(C.HDel, append([]string{key}, fields...))
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

// HLen returns the number of fields contained in the hash stored at key.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the hash.
//
// Return value:
//
//	The number of fields in the hash, or `0` when key does not exist.
//	If key holds a value that is not a hash, an error is returned.
//
// [valkey.io]: https://valkey.io/commands/hlen/
func (client *baseClient) HLen(key string) (int64, error) {
	result, err := client.executeCommand(C.HLen, []string{key})
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

// HVals returns all values in the hash stored at key.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the hash.
//
// Return value:
//
//	A slice containing all the values in the hash, or an empty slice when key does not exist.
//
// [valkey.io]: https://valkey.io/commands/hvals/
func (client *baseClient) HVals(key string) ([]string, error) {
	result, err := client.executeCommand(C.HVals, []string{key})
	if err != nil {
		return nil, err
	}

	return handleStringArrayResponse(result)
}

// HExists returns if field is an existing field in the hash stored at key.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key   - The key of the hash.
//	field - The field to check in the hash stored at key.
//
// Return value:
//
//	A bool containing true if the hash contains the specified field.
//	false if the hash does not contain the field, or if the key does not exist.
//
// [valkey.io]: https://valkey.io/commands/hexists/
func (client *baseClient) HExists(key string, field string) (bool, error) {
	result, err := client.executeCommand(C.HExists, []string{key, field})
	if err != nil {
		return defaultBoolResponse, err
	}

	return handleBoolResponse(result)
}

// HKeys returns all field names in the hash stored at key.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the hash.
//
// Return value:
//
//	A slice containing all the field names in the hash, or an empty slice when key does not exist.
//
// [valkey.io]: https://valkey.io/commands/hkeys/
func (client *baseClient) HKeys(key string) ([]string, error) {
	result, err := client.executeCommand(C.HKeys, []string{key})
	if err != nil {
		return nil, err
	}

	return handleStringArrayResponse(result)
}

// HStrLen returns the string length of the value associated with field in the hash stored at key.
// If the key or the field do not exist, 0 is returned.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key   - The key of the hash.
//	field - The field to get the string length of its value.
//
// Return value:
//
//	The length of the string value associated with field, or `0` when field or key do not exist.
//
// [valkey.io]: https://valkey.io/commands/hstrlen/
func (client *baseClient) HStrLen(key string, field string) (int64, error) {
	result, err := client.executeCommand(C.HStrlen, []string{key, field})
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

// Increments the number stored at `field` in the hash stored at `key` by increment.
// By using a negative increment value, the value stored at `field` in the hash stored at `key` is decremented.
// If `field` or `key` does not exist, it is set to 0 before performing the operation.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the hash.
//	field - The field in the hash stored at `key` to increment its value.
//	increment - The amount to increment.
//
// Return value:
//
//	The value of `field` in the hash stored at `key` after the increment.
//
// [valkey.io]: https://valkey.io/commands/hincrby/
func (client *baseClient) HIncrBy(key string, field string, increment int64) (int64, error) {
	result, err := client.executeCommand(C.HIncrBy, []string{key, field, utils.IntToString(increment)})
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

// Increments the string representing a floating point number stored at `field` in the hash stored at `key` by increment.
// By using a negative increment value, the value stored at `field` in the hash stored at `key` is decremented.
// If `field` or `key` does not exist, it is set to `0` before performing the operation.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the hash.
//	field - The field in the hash stored at `key` to increment its value.
//	increment - The amount to increment.
//
// Return value:
//
//	The value of `field` in the hash stored at `key` after the increment.
//
// [valkey.io]: https://valkey.io/commands/hincrbyfloat/
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
//	key - The key of the hash.
//	cursor - The cursor that points to the next iteration of results. A value of "0" indicates the start of the search.
//	options - The [api.HashScanOptions].
//
// Return value:
//
//	An array of the cursor and the subset of the hash held by `key`. The first element is always the `cursor`
//	for the next iteration of results. The `cursor` will be `"0"` on the last iteration of the subset.
//	The second element is always an array of the subset of the set held in `key`. The array in the
//	second element is always a flattened series of String pairs, where the key is at even indices
//	and the value is at odd indices.
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
// [valkey.io]: https://valkey.io/commands/hrandfield/
func (client *baseClient) HRandFieldWithCountWithValues(key string, count int64) ([][]string, error) {
	result, err := client.executeCommand(C.HRandField, []string{key, utils.IntToString(count), options.WithValues})
	if err != nil {
		return nil, err
	}
	return handle2DStringArrayResponse(result)
}

// Inserts all the specified values at the head of the list stored at key. elements are inserted one after the other to the
// head of the list, from the leftmost element to the rightmost element. If key does not exist, it is created as an empty
// list before performing the push operation.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key      - The key of the list.
//	elements - The elements to insert at the head of the list stored at key.
//
// Return value:
//
//	The length of the list after the push operation.
//
// [valkey.io]: https://valkey.io/commands/lpush/
func (client *baseClient) LPush(key string, elements []string) (int64, error) {
	result, err := client.executeCommand(C.LPush, append([]string{key}, elements...))
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

// Removes and returns the first elements of the list stored at key. The command pops a single element from the beginning
// of the list.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the list.
//
// Return value:
//
//	The Result[string] containing the value of the first element.
//	If key does not exist, [api.CreateNilStringResult()] will be returned.
//
// [valkey.io]: https://valkey.io/commands/lpop/
func (client *baseClient) LPop(key string) (Result[string], error) {
	result, err := client.executeCommand(C.LPop, []string{key})
	if err != nil {
		return CreateNilStringResult(), err
	}

	return handleStringOrNilResponse(result)
}

// Removes and returns up to count elements of the list stored at key, depending on the list's length.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key   - The key of the list.
//	count - The count of the elements to pop from the list.
//
// Return value:
//
//	An array of the popped elements as strings will be returned depending on the list's length
//	If key does not exist, nil will be returned.
//
// [valkey.io]: https://valkey.io/commands/lpop/
func (client *baseClient) LPopCount(key string, count int64) ([]string, error) {
	result, err := client.executeCommand(C.LPop, []string{key, utils.IntToString(count)})
	if err != nil {
		return nil, err
	}

	return handleStringArrayOrNilResponse(result)
}

// Returns the index of the first occurrence of element inside the list specified by key. If no match is found,
// [api.CreateNilInt64Result()] is returned.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key     - The name of the list.
//	element - The value to search for within the list.
//
// Return value:
//
//	The Result[int64] containing the index of the first occurrence of element, or [api.CreateNilInt64Result()] if element is
//	not in the list.
//
// [valkey.io]: https://valkey.io/commands/lpos/
func (client *baseClient) LPos(key string, element string) (Result[int64], error) {
	result, err := client.executeCommand(C.LPos, []string{key, element})
	if err != nil {
		return CreateNilInt64Result(), err
	}

	return handleIntOrNilResponse(result)
}

// Returns the index of an occurrence of element within a list based on the given options. If no match is found,
// [api.CreateNilInt64Result()] is returned.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key     - The name of the list.
//	element - The value to search for within the list.
//	options - The LPos options.
//
// Return value:
//
//	The Result[int64] containing the index of element, or [api.CreateNilInt64Result()] if element is not in the list.
//
// [valkey.io]: https://valkey.io/commands/lpos/
func (client *baseClient) LPosWithOptions(key string, element string, options *LPosOptions) (Result[int64], error) {
	result, err := client.executeCommand(C.LPos, append([]string{key, element}, options.toArgs()...))
	if err != nil {
		return CreateNilInt64Result(), err
	}

	return handleIntOrNilResponse(result)
}

// Returns an array of indices of matching elements within a list.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key     - The name of the list.
//	element - The value to search for within the list.
//	count   - The number of matches wanted.
//
// Return value:
//
//	An array that holds the indices of the matching elements within the list.
//
// [valkey.io]: https://valkey.io/commands/lpos/
func (client *baseClient) LPosCount(key string, element string, count int64) ([]int64, error) {
	result, err := client.executeCommand(C.LPos, []string{key, element, CountKeyword, utils.IntToString(count)})
	if err != nil {
		return nil, err
	}

	return handleIntArrayResponse(result)
}

// Returns an array of indices of matching elements within a list based on the given options. If no match is found, an
// empty array is returned.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key     - The name of the list.
//	element - The value to search for within the list.
//	count   - The number of matches wanted.
//	options - The LPos options.
//
// Return value:
//
//	An array that holds the indices of the matching elements within the list.
//
// [valkey.io]: https://valkey.io/commands/lpos/
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

// Inserts all the specified values at the tail of the list stored at key.
// elements are inserted one after the other to the tail of the list, from the leftmost element to the rightmost element.
// If key does not exist, it is created as an empty list before performing the push operation.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key      - The key of the list.
//	elements - The elements to insert at the tail of the list stored at key.
//
// Return value:
//
//	The length of the list after the push operation.
//
// [valkey.io]: https://valkey.io/commands/rpush/
func (client *baseClient) RPush(key string, elements []string) (int64, error) {
	result, err := client.executeCommand(C.RPush, append([]string{key}, elements...))
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

// SAdd adds specified members to the set stored at key.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key     - The key where members will be added to its set.
//	members - A list of members to add to the set stored at key.
//
// Return value:
//
//	The number of members that were added to the set, excluding members already present.
//
// [valkey.io]: https://valkey.io/commands/sadd/
func (client *baseClient) SAdd(key string, members []string) (int64, error) {
	result, err := client.executeCommand(C.SAdd, append([]string{key}, members...))
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

// SRem removes specified members from the set stored at key.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key     - The key from which members will be removed.
//	members - A list of members to remove from the set stored at key.
//
// Return value:
//
//	The number of members that were removed from the set, excluding non-existing members.
//
// [valkey.io]: https://valkey.io/commands/srem/
func (client *baseClient) SRem(key string, members []string) (int64, error) {
	result, err := client.executeCommand(C.SRem, append([]string{key}, members...))
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

// SUnionStore stores the members of the union of all given sets specified by `keys` into a new set at `destination`.
//
// Note: When in cluster mode, `destination` and all `keys` must map to the same hash slot.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	destination - The key of the destination set.
//	keys - The keys from which to retrieve the set members.
//
// Return value:
//
//	The number of elements in the resulting set.
//
// [valkey.io]: https://valkey.io/commands/sunionstore/
func (client *baseClient) SUnionStore(destination string, keys []string) (int64, error) {
	result, err := client.executeCommand(C.SUnionStore, append([]string{destination}, keys...))
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

// SMembers retrieves all the members of the set value stored at key.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key from which to retrieve the set members.
//
// Return value:
//
//	A `map[string]struct{}` containing all members of the set.
//	Returns an empty collection if key does not exist.
//
// [valkey.io]: https://valkey.io/commands/smembers/
func (client *baseClient) SMembers(key string) (map[string]struct{}, error) {
	result, err := client.executeCommand(C.SMembers, []string{key})
	if err != nil {
		return nil, err
	}

	return handleStringSetResponse(result)
}

// SCard retrieves the set cardinality (number of elements) of the set stored at key.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key from which to retrieve the number of set members.
//
// Return value:
//
//	The cardinality (number of elements) of the set, or `0` if the key does not exist.
//
// [valkey.io]: https://valkey.io/commands/scard/
func (client *baseClient) SCard(key string) (int64, error) {
	result, err := client.executeCommand(C.SCard, []string{key})
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

// SIsMember returns if member is a member of the set stored at key.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key    - The key of the set.
//	member - The member to check for existence in the set.
//
// Return value:
//
//	A bool containing true if the member exists in the set, false otherwise.
//	If key doesn't exist, it is treated as an empty set and the method returns false.
//
// [valkey.io]: https://valkey.io/commands/sismember/
func (client *baseClient) SIsMember(key string, member string) (bool, error) {
	result, err := client.executeCommand(C.SIsMember, []string{key, member})
	if err != nil {
		return defaultBoolResponse, err
	}

	return handleBoolResponse(result)
}

// SDiff computes the difference between the first set and all the successive sets in keys.
//
// Note: When in cluster mode, all keys must map to the same hash slot.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	keys - The keys of the sets to diff.
//
// Return value:
//
//	A `map[string]struct{}` representing the difference between the sets.
//	If a key does not exist, it is treated as an empty set.
//
// [valkey.io]: https://valkey.io/commands/sdiff/
func (client *baseClient) SDiff(keys []string) (map[string]struct{}, error) {
	result, err := client.executeCommand(C.SDiff, keys)
	if err != nil {
		return nil, err
	}

	return handleStringSetResponse(result)
}

// SDiffStore stores the difference between the first set and all the successive sets in keys
// into a new set at destination.
//
// Note: When in cluster mode, destination and all keys must map to the same hash slot.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	destination - The key of the destination set.
//	keys        - The keys of the sets to diff.
//
// Return value:
//
//	The number of elements in the resulting set.
//
// [valkey.io]: https://valkey.io/commands/sdiffstore/
func (client *baseClient) SDiffStore(destination string, keys []string) (int64, error) {
	result, err := client.executeCommand(C.SDiffStore, append([]string{destination}, keys...))
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

// SInter gets the intersection of all the given sets.
//
// Note: When in cluster mode, all keys must map to the same hash slot.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	keys - The keys of the sets to intersect.
//
// Return value:
//
//	A `map[string]struct{}` containing members which are present in all given sets.
//	If one or more sets do not exist, an empty collection will be returned.
//
// [valkey.io]: https://valkey.io/commands/sinter/
func (client *baseClient) SInter(keys []string) (map[string]struct{}, error) {
	result, err := client.executeCommand(C.SInter, keys)
	if err != nil {
		return nil, err
	}

	return handleStringSetResponse(result)
}

// Stores the members of the intersection of all given sets specified by `keys` into a new set at `destination`
//
// Note: When in cluster mode, `destination` and all `keys` must map to the same hash slot.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	destination - The key of the destination set.
//	keys - The keys from which to retrieve the set members.
//
// Return value:
//
//	The number of elements in the resulting set.
func (client *baseClient) SInterStore(destination string, keys []string) (int64, error) {
	result, err := client.executeCommand(C.SInterStore, append([]string{destination}, keys...))
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

// SInterCard gets the cardinality of the intersection of all the given sets.
//
// Since:
//
//	Valkey 7.0 and above.
//
// Note: When in cluster mode, all keys must map to the same hash slot.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	keys - The keys of the sets to intersect.
//
// Return value:
//
//	The cardinality of the intersection result. If one or more sets do not exist, `0` is returned.
//
// [valkey.io]: https://valkey.io/commands/sintercard/
func (client *baseClient) SInterCard(keys []string) (int64, error) {
	result, err := client.executeCommand(C.SInterCard, append([]string{strconv.Itoa(len(keys))}, keys...))
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

// SInterCardLimit gets the cardinality of the intersection of all the given sets, up to the specified limit.
//
// Since:
//
//	Valkey 7.0 and above.
//
// Note: When in cluster mode, all keys must map to the same hash slot.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	keys  - The keys of the sets to intersect.
//	limit - The limit for the intersection cardinality value.
//
// Return value:
//
//	The cardinality of the intersection result, or the limit if reached.
//	If one or more sets do not exist, `0` is returned.
//	If the intersection cardinality reaches 'limit' partway through the computation, returns 'limit' as the cardinality.
//
// [valkey.io]: https://valkey.io/commands/sintercard/
func (client *baseClient) SInterCardLimit(keys []string, limit int64) (int64, error) {
	args := utils.Concat([]string{utils.IntToString(int64(len(keys)))}, keys, []string{"LIMIT", utils.IntToString(limit)})

	result, err := client.executeCommand(C.SInterCard, args)
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

// SRandMember returns a random element from the set value stored at key.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key from which to retrieve the set member.
//
// Return value:
//
//	A Result[string] containing a random element from the set.
//	Returns api.CreateNilStringResult() if key does not exist.
//
// [valkey.io]: https://valkey.io/commands/srandmember/
func (client *baseClient) SRandMember(key string) (Result[string], error) {
	result, err := client.executeCommand(C.SRandMember, []string{key})
	if err != nil {
		return CreateNilStringResult(), err
	}

	return handleStringOrNilResponse(result)
}

// SPop removes and returns one random member from the set stored at key.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the set.
//
// Return value:
//
//	A Result[string] containing the value of the popped member.
//	Returns a NilResult if key does not exist.
//

//
// [valkey.io]: https://valkey.io/commands/spop/
func (client *baseClient) SPop(key string) (Result[string], error) {
	result, err := client.executeCommand(C.SPop, []string{key})
	if err != nil {
		return CreateNilStringResult(), err
	}

	return handleStringOrNilResponse(result)
}

// SMIsMember returns whether each member is a member of the set stored at key.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the set.
//
// Return value:
//
//	A []bool containing whether each member is a member of the set stored at key.
//
// [valkey.io]: https://valkey.io/commands/smismember/
func (client *baseClient) SMIsMember(key string, members []string) ([]bool, error) {
	result, err := client.executeCommand(C.SMIsMember, append([]string{key}, members...))
	if err != nil {
		return nil, err
	}

	return handleBoolArrayResponse(result)
}

// SUnion gets the union of all the given sets.
//
// Note: When in cluster mode, all keys must map to the same hash slot.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	keys - The keys of the sets.
//
// Return value:
//
//	A `map[string]struct{}` of members which are present in at least one of the given sets.
//	If none of the sets exist, an empty collection will be returned.
//
// [valkey.io]: https://valkey.io/commands/sunion/
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

// Moves `member` from the set at `source` to the set at `destination`, removing it from the source set.
// Creates a new destination set if needed. The operation is atomic.
//
// Note: When in cluster mode, `source` and `destination` must map to the same hash slot.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	source - The key of the set to remove the element from.
//	destination - The key of the set to add the element to.
//	member - The set element to move.
//
// Return value:
//
//	`true` on success, or `false` if the `source` set does not exist or the element is not a member of the source set.
//
// [valkey.io]: https://valkey.io/commands/smove/
func (client *baseClient) SMove(source string, destination string, member string) (bool, error) {
	result, err := client.executeCommand(C.SMove, []string{source, destination, member})
	if err != nil {
		return defaultBoolResponse, err
	}
	return handleBoolResponse(result)
}

// Returns the specified elements of the list stored at key.
// The offsets start and end are zero-based indexes, with 0 being the first element of the list, 1 being the next element
// and so on. These offsets can also be negative numbers indicating offsets starting at the end of the list, with -1 being
// the last element of the list, -2 being the penultimate, and so on.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key   - The key of the list.
//	start - The starting point of the range.
//	end   - The end of the range.
//
// Return value:
//
//	Array of elements as Result[string] in the specified range.
//	If start exceeds the end of the list, or if start is greater than end, an empty array will be returned.
//	If end exceeds the actual end of the list, the range will stop at the actual end of the list.
//	If key does not exist an empty array will be returned.
//
// [valkey.io]: https://valkey.io/commands/lrange/
func (client *baseClient) LRange(key string, start int64, end int64) ([]string, error) {
	result, err := client.executeCommand(C.LRange, []string{key, utils.IntToString(start), utils.IntToString(end)})
	if err != nil {
		return nil, err
	}

	return handleStringArrayResponse(result)
}

// Returns the element at index from the list stored at key.
// The index is zero-based, so 0 means the first element, 1 the second element and so on. Negative indices can be used to
// designate elements starting at the tail of the list. Here, -1 means the last element, -2 means the penultimate and so
// forth.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key   - The key of the list.
//	index - The index of the element in the list to retrieve.
//
// Return value:
//
//	The Result[string] containing element at index in the list stored at key.
//	If index is out of range or if key does not exist, [api.CreateNilStringResult()] is returned.
//
// [valkey.io]: https://valkey.io/commands/lindex/
func (client *baseClient) LIndex(key string, index int64) (Result[string], error) {
	result, err := client.executeCommand(C.LIndex, []string{key, utils.IntToString(index)})
	if err != nil {
		return CreateNilStringResult(), err
	}

	return handleStringOrNilResponse(result)
}

// Trims an existing list so that it will contain only the specified range of elements specified.
// The offsets start and end are zero-based indexes, with 0 being the first element of the list, 1 being the next element
// and so on. These offsets can also be negative numbers indicating offsets starting at the end of the list, with -1 being
// the last element of the list, -2 being the penultimate, and so on.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key   - The key of the list.
//	start - The starting point of the range.
//	end   - The end of the range.
//
// Return value:
//
//	Always `"OK"`.
//	If start exceeds the end of the list, or if start is greater than end, the result will be an empty list (which causes
//	key to be removed).
//	If end exceeds the actual end of the list, it will be treated like the last element of the list.
//	If key does not exist, `"OK"` will be returned without changes to the database.
//
// [valkey.io]: https://valkey.io/commands/ltrim/
func (client *baseClient) LTrim(key string, start int64, end int64) (string, error) {
	result, err := client.executeCommand(C.LTrim, []string{key, utils.IntToString(start), utils.IntToString(end)})
	if err != nil {
		return defaultStringResponse, err
	}

	return handleStringResponse(result)
}

// Returns the length of the list stored at key.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the list.
//
// Return value:
//
//	The length of the list at `key`.
//	If `key` does not exist, it is interpreted as an empty list and `0` is returned.
//
// [valkey.io]: https://valkey.io/commands/llen/
func (client *baseClient) LLen(key string) (int64, error) {
	result, err := client.executeCommand(C.LLen, []string{key})
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

// Removes the first count occurrences of elements equal to element from the list stored at key.
// If count is positive: Removes elements equal to element moving from head to tail.
// If count is negative: Removes elements equal to element moving from tail to head.
// If count is 0 or count is greater than the occurrences of elements equal to element, it removes all elements equal to
// element.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key     - The key of the list.
//	count   - The count of the occurrences of elements equal to element to remove.
//	element - The element to remove from the list.
//
// Return value:
//
//	The number of the removed elements.
//	If `key` does not exist, `0` is returned.
//
// [valkey.io]: https://valkey.io/commands/lrem/
func (client *baseClient) LRem(key string, count int64, element string) (int64, error) {
	result, err := client.executeCommand(C.LRem, []string{key, utils.IntToString(count), element})
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

// Removes and returns the last elements of the list stored at key.
// The command pops a single element from the end of the list.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the list.
//
// Return value:
//
//	The Result[string] containing the value of the last element.
//	If key does not exist, [api.CreateNilStringResult()] will be returned.
//
// [valkey.io]: https://valkey.io/commands/rpop/
func (client *baseClient) RPop(key string) (Result[string], error) {
	result, err := client.executeCommand(C.RPop, []string{key})
	if err != nil {
		return CreateNilStringResult(), err
	}

	return handleStringOrNilResponse(result)
}

// Removes and returns up to count elements from the list stored at key, depending on the list's length.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key   - The key of the list.
//	count - The count of the elements to pop from the list.
//
// Return value:
//
//	An array of popped elements as strings will be returned depending on the list's length.
//	If key does not exist, nil will be returned.
//
// [valkey.io]: https://valkey.io/commands/rpop/
func (client *baseClient) RPopCount(key string, count int64) ([]string, error) {
	result, err := client.executeCommand(C.RPop, []string{key, utils.IntToString(count)})
	if err != nil {
		return nil, err
	}

	return handleStringArrayOrNilResponse(result)
}

// Inserts element in the list at key either before or after the pivot.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key            - The key of the list.
//	insertPosition - The relative position to insert into - either api.Before or api.After the pivot.
//	pivot          - An element of the list.
//	element        - The new element to insert.
//
// Return value:
//
//	The list length after a successful insert operation.
//	If the `key` doesn't exist returns `-1`.
//	If the `pivot` wasn't found, returns `0`.
//
// [valkey.io]: https://valkey.io/commands/linsert/
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

// Pops an element from the head of the first list that is non-empty, with the given keys being checked in the order that
// they are given.
// Blocks the connection when there are no elements to pop from any of the given lists.
//
// Note:
//   - When in cluster mode, all keys must map to the same hash slot.
//   - BLPop is a client blocking command, see [Blocking Commands] for more details and best practices.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	keys        - The keys of the lists to pop from.
//	timeoutSecs - The number of seconds to wait for a blocking operation to complete. A value of 0 will block indefinitely.
//
// Return value:
//
//	A two-element array containing the key from which the element was popped and the value of the popped
//	element, formatted as [key, value].
//	If no element could be popped and the timeout expired, returns `nil`.
//
// [valkey.io]: https://valkey.io/commands/blpop/
// [Blocking Commands]: https://github.com/valkey-io/valkey-glide/wiki/General-Concepts#blocking-commands
func (client *baseClient) BLPop(keys []string, timeoutSecs float64) ([]string, error) {
	result, err := client.executeCommand(C.BLPop, append(keys, utils.FloatToString(timeoutSecs)))
	if err != nil {
		return nil, err
	}

	return handleStringArrayOrNilResponse(result)
}

// Pops an element from the tail of the first list that is non-empty, with the given keys being checked in the order that
// they are given.
// Blocks the connection when there are no elements to pop from any of the given lists.
//
// Note:
//   - When in cluster mode, all keys must map to the same hash slot.
//   - BRPop is a client blocking command, see [Blocking Commands] for more details and best practices.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	keys        - The keys of the lists to pop from.
//	timeoutSecs - The number of seconds to wait for a blocking operation to complete. A value of 0 will block indefinitely.
//
// Return value:
//
//	A two-element array containing the key from which the element was popped and the value of the popped
//	element, formatted as [key, value].
//	If no element could be popped and the timeoutSecs expired, returns `nil`.
//
// [valkey.io]: https://valkey.io/commands/brpop/
// [Blocking Commands]: https://github.com/valkey-io/valkey-glide/wiki/General-Concepts#blocking-commands
func (client *baseClient) BRPop(keys []string, timeoutSecs float64) ([]string, error) {
	result, err := client.executeCommand(C.BRPop, append(keys, utils.FloatToString(timeoutSecs)))
	if err != nil {
		return nil, err
	}

	return handleStringArrayOrNilResponse(result)
}

// Inserts all the specified values at the tail of the list stored at key, only if key exists and holds a list. If key is
// not a list, this performs no operation.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key      - The key of the list.
//	elements - The elements to insert at the tail of the list stored at key.
//
// Return value:
//
//	The length of the list after the push operation.
//
// [valkey.io]: https://valkey.io/commands/rpushx/
func (client *baseClient) RPushX(key string, elements []string) (int64, error) {
	result, err := client.executeCommand(C.RPushX, append([]string{key}, elements...))
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

// Inserts all the specified values at the head of the list stored at key, only if key exists and holds a list. If key is
// not a list, this performs no operation.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key      - The key of the list.
//	elements - The elements to insert at the head of the list stored at key.
//
// Return value:
//
//	The length of the list after the push operation.
//
// [valkey.io]: https://valkey.io/commands/rpushx/
func (client *baseClient) LPushX(key string, elements []string) (int64, error) {
	result, err := client.executeCommand(C.LPushX, append([]string{key}, elements...))
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

// Pops one element from the first non-empty list from the provided keys.
//
// Since:
//
//	Valkey 7.0 and above.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	keys          - An array of keys to lists.
//	listDirection - The direction based on which elements are popped from - see [api.ListDirection].
//
// Return value:
//
//	A map of key name mapped array of popped element.
//
// [valkey.io]: https://valkey.io/commands/lmpop/
func (client *baseClient) LMPop(keys []string, listDirection ListDirection) (map[string][]string, error) {
	listDirectionStr, err := listDirection.toString()
	if err != nil {
		return nil, err
	}

	// Check for potential length overflow.
	if len(keys) > math.MaxInt-2 {
		return nil, &errors.RequestError{Msg: "Length overflow for the provided keys"}
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

// Pops one or more elements from the first non-empty list from the provided keys.
//
// Since:
//
//	Valkey 7.0 and above.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	keys          - An array of keys to lists.
//	listDirection - The direction based on which elements are popped from - see [api.ListDirection].
//	count         - The maximum number of popped elements.
//
// Return value:
//
//	A map of key name mapped array of popped elements.
//
// [valkey.io]: https://valkey.io/commands/lmpop/
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
		return nil, &errors.RequestError{Msg: "Length overflow for the provided keys"}
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

// Blocks the connection until it pops one element from the first non-empty list from the provided keys. BLMPop is the
// blocking variant of [api.LMPop].
//
// Note:
//   - When in cluster mode, all keys must map to the same hash slot.
//   - BLMPop is a client blocking command, see [Blocking Commands] for more details and best practices.
//
// Since:
//
//	Valkey 7.0 and above.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	keys          - An array of keys to lists.
//	listDirection - The direction based on which elements are popped from - see [api.ListDirection].
//	timeoutSecs   - The number of seconds to wait for a blocking operation to complete. A value of 0 will block indefinitely.
//
// Return value:
//
//	A map of key name mapped array of popped element.
//	If no member could be popped and the timeout expired, returns nil.
//
// [valkey.io]: https://valkey.io/commands/blmpop/
// [Blocking Commands]: https://github.com/valkey-io/valkey-glide/wiki/General-Concepts#blocking-commands
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
		return nil, &errors.RequestError{Msg: "Length overflow for the provided keys"}
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

// Blocks the connection until it pops one or more elements from the first non-empty list from the provided keys.
// BLMPopCount is the blocking variant of [api.LMPopCount].
//
// Note:
//   - When in cluster mode, all keys must map to the same hash slot.
//   - BLMPopCount is a client blocking command, see [Blocking Commands] for more details and best practices.
//
// Since:
//
//	Valkey 7.0 and above.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	keys          - An array of keys to lists.
//	listDirection - The direction based on which elements are popped from - see [api.ListDirection].
//	count         - The maximum number of popped elements.
//	timeoutSecs   - The number of seconds to wait for a blocking operation to complete. A value of 0 will block
//
// indefinitely.
//
// Return value:
//
//	A map of key name mapped array of popped element.
//	If no member could be popped and the timeout expired, returns nil.
//
// [valkey.io]: https://valkey.io/commands/blmpop/
// [Blocking Commands]: https://github.com/valkey-io/valkey-glide/wiki/General-Concepts#blocking-commands
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
		return nil, &errors.RequestError{Msg: "Length overflow for the provided keys"}
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

// Sets the list element at index to element.
// The index is zero-based, so 0 means the first element,1 the second element and so on. Negative indices can be used to
// designate elements starting at the tail of the list. Here, -1 means the last element, -2 means the penultimate and so
// forth.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key     - The key of the list.
//	index   - The index of the element in the list to be set.
//	element - The element to be set.
//
// Return value:
//
//	`"OK"`.
//
// [valkey.io]: https://valkey.io/commands/lset/
func (client *baseClient) LSet(key string, index int64, element string) (string, error) {
	result, err := client.executeCommand(C.LSet, []string{key, utils.IntToString(index), element})
	if err != nil {
		return defaultStringResponse, err
	}

	return handleStringResponse(result)
}

// Atomically pops and removes the left/right-most element to the list stored at source depending on whereFrom, and pushes
// the element at the first/last element of the list stored at destination depending on whereTo.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	source      - The key to the source list.
//	destination - The key to the destination list.
//	wherefrom   - The ListDirection the element should be removed from.
//	whereto     - The ListDirection the element should be added to.
//
// Return value:
//
//	A Result[string] containing the popped element or api.CreateNilStringResult() if source does not exist.
//
// [valkey.io]: https://valkey.io/commands/lmove/
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

// Blocks the connection until it pops atomically and removes the left/right-most element to the list stored at source
// depending on whereFrom, and pushes the element at the first/last element of the list stored at <destination depending on
// wherefrom.
// BLMove is the blocking variant of [api.LMove].
//
// Note:
//   - When in cluster mode, all source and destination must map to the same hash slot.
//   - BLMove is a client blocking command, see [Blocking Commands] for more details and best practices.
//
// Since:
//
//	Valkey 6.2.0 and above.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	source      - The key to the source list.
//	destination - The key to the destination list.
//	wherefrom   - The ListDirection the element should be removed from.
//	whereto     - The ListDirection the element should be added to.
//	timeoutSecs - The number of seconds to wait for a blocking operation to complete. A value of 0 will block indefinitely.
//
// Return value:
//
//	A Result[string] containing the popped element or api.CreateNilStringResult() if source does not exist or if the
//	operation timed-out.
//
// [valkey.io]: https://valkey.io/commands/blmove/
// [Blocking Commands]: https://github.com/valkey-io/valkey-glide/wiki/General-Concepts#blocking-commands
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

// Del removes the specified keys from the database. A key is ignored if it does not exist.
//
// Note:
//
//	In cluster mode, if keys in `keyValueMap` map to different hash slots, the command
//	will be split across these slots and executed separately for each. This means the command
//	is atomic only at the slot level. If one or more slot-specific requests fail, the entire
//	call will return the first encountered error, even though some requests may have succeeded
//	while others did not. If this behavior impacts your application logic, consider splitting
//	the request into sub-requests per slot to ensure atomicity.
//
// Parameters:
//
//	keys - One or more keys to delete.
//
// Return value:
//
//	Returns the number of keys that were removed.
//
// [valkey.io]: https://valkey.io/commands/del/
func (client *baseClient) Del(keys []string) (int64, error) {
	result, err := client.executeCommand(C.Del, keys)
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

// Exists returns the number of keys that exist in the database
//
// Note:
//
//	In cluster mode, if keys in `keyValueMap` map to different hash slots, the command
//	will be split across these slots and executed separately for each. This means the command
//	is atomic only at the slot level. If one or more slot-specific requests fail, the entire
//	call will return the first encountered error, even though some requests may have succeeded
//	while others did not. If this behavior impacts your application logic, consider splitting
//	the request into sub-requests per slot to ensure atomicity.
//
// Parameters:
// keys - One or more keys to check if they exist.
//
// Return value:
//
//	Returns the number of existing keys.
//
// [valkey.io]: https://valkey.io/commands/exists/
func (client *baseClient) Exists(keys []string) (int64, error) {
	result, err := client.executeCommand(C.Exists, keys)
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

// Expire sets a timeout on key. After the timeout has expired, the key will automatically be deleted.
//
// If key already has an existing expire set, the time to live is updated to the new value.
// If seconds is a non-positive number, the key will be deleted rather than expired.
// The timeout will only be cleared by commands that delete or overwrite the contents of key.
//
// Parameters:
// key - The key to expire.
// seconds - Time in seconds for the key to expire
//
// Return value:
//
//	`true` if the timeout was set. `false` if the timeout was not set. e.g. key doesn't exist,
//	or operation skipped due to the provided arguments.
//
// [valkey.io]: https://valkey.io/commands/expire/
func (client *baseClient) Expire(key string, seconds int64) (bool, error) {
	result, err := client.executeCommand(C.Expire, []string{key, utils.IntToString(seconds)})
	if err != nil {
		return defaultBoolResponse, err
	}

	return handleBoolResponse(result)
}

// Expire sets a timeout on key. After the timeout has expired, the key will automatically be deleted
//
// If key already has an existing expire set, the time to live is updated to the new value.
// If seconds is a non-positive number, the key will be deleted rather than expired.
// The timeout will only be cleared by commands that delete or overwrite the contents of key
//
// Parameters:
//
//	key - The key to expire.
//	seconds - Time in seconds for the key to expire
//	option - The option  to set expiry - NX, XX, GT, LT
//
// Return value:
//
//	`true` if the timeout was set. `false` if the timeout was not set. e.g. key doesn't exist,
//	or operation skipped due to the provided arguments.
//
// [valkey.io]: https://valkey.io/commands/expire/
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

// ExpireAt sets a timeout on key. It takes an absolute Unix timestamp (seconds since January 1, 1970) instead of
// specifying the number of seconds. A timestamp in the past will delete the key immediately. After the timeout has
// expired, the key will automatically be deleted.
// If key already has an existing expire set, the time to live is updated to the new value.
// The timeout will only be cleared by commands that delete or overwrite the contents of key
// If key already has an existing expire set, the time to live is updated to the new value.
// If seconds is a non-positive number, the key will be deleted rather than expired.
// The timeout will only be cleared by commands that delete or overwrite the contents of key
//
// Parameters:
//
//	key - The key to expire.
//	unixTimestampInSeconds - Absolute Unix timestamp
//
// Return value:
//
//	`true` if the timeout was set. `false` if the timeout was not set. e.g. key doesn't exist,
//	or operation skipped due to the provided arguments.
//
// [valkey.io]: https://valkey.io/commands/expireat/
func (client *baseClient) ExpireAt(key string, unixTimestampInSeconds int64) (bool, error) {
	result, err := client.executeCommand(C.ExpireAt, []string{key, utils.IntToString(unixTimestampInSeconds)})
	if err != nil {
		return defaultBoolResponse, err
	}

	return handleBoolResponse(result)
}

// ExpireAt sets a timeout on key. It takes an absolute Unix timestamp (seconds since January 1, 1970) instead of
// specifying the number of seconds. A timestamp in the past will delete the key immediately. After the timeout has
// expired, the key will automatically be deleted.
// If key already has an existing expire set, the time to live is updated to the new value.
// The timeout will only be cleared by commands that delete or overwrite the contents of key
// If key already has an existing expire set, the time to live is updated to the new value.
// If seconds is a non-positive number, the key will be deleted rather than expired.
// The timeout will only be cleared by commands that delete or overwrite the contents of key
//
// Parameters:
//
//	key - The key to expire.
//	unixTimestampInSeconds - Absolute Unix timestamp
//	option - The option  to set expiry - NX, XX, GT, LT
//
// Return value:
//
//	`true` if the timeout was set. `false` if the timeout was not set. e.g. key doesn't exist,
//	or operation skipped due to the provided arguments.
//
// [valkey.io]: https://valkey.io/commands/expireat/
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

// Sets a timeout on key in milliseconds. After the timeout has expired, the key will automatically be deleted.
// If key already has an existing expire set, the time to live is updated to the new value.
// If milliseconds is a non-positive number, the key will be deleted rather than expired
// The timeout will only be cleared by commands that delete or overwrite the contents of key.

// Parameters:
//
//	key - The key to set timeout on it.
//	milliseconds - The timeout in milliseconds.
//
// Return value:
//
//	`true` if the timeout was set. `false` if the timeout was not set. e.g. key doesn't exist,
//	or operation skipped due to the provided arguments.
//
//	[valkey.io]: https://valkey.io/commands/pexpire/
func (client *baseClient) PExpire(key string, milliseconds int64) (bool, error) {
	result, err := client.executeCommand(C.PExpire, []string{key, utils.IntToString(milliseconds)})
	if err != nil {
		return defaultBoolResponse, err
	}
	return handleBoolResponse(result)
}

// Sets a timeout on key in milliseconds. After the timeout has expired, the key will automatically be deleted.
// If key already has an existing expire set, the time to live is updated to the new value.
// If milliseconds is a non-positive number, the key will be deleted rather than expired
// The timeout will only be cleared by commands that delete or overwrite the contents of key.
//
// Parameters:
//
//	key - The key to set timeout on it.
//	milliseconds - The timeout in milliseconds.
//	option - The option  to set expiry - NX, XX, GT, LT
//
// Return value:
//
//	`true` if the timeout was set. `false` if the timeout was not set. e.g. key doesn't exist,
//	or operation skipped due to the provided arguments.
//
//	[valkey.io]: https://valkey.io/commands/pexpire/
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

// Sets a timeout on key. It takes an absolute Unix timestamp (milliseconds since
// January 1, 1970) instead of specifying the number of milliseconds.
// A timestamp in the past will delete the key immediately. After the timeout has
// expired, the key will automatically be deleted
// If key already has an existing expire set, the time to live is
// updated to the new value/
// The timeout will only be cleared by commands that delete or overwrite the contents of key
//
// Parameters:
//
//	key - The key to set timeout on it.
//	unixMilliseconds - The timeout in an absolute Unix timestamp.
//
// Return value:
//
//	`true` if the timeout was set. `false` if the timeout was not set. e.g. key doesn't exist,
//	or operation skipped due to the provided arguments.
//
//	[valkey.io]: https://valkey.io/commands/pexpireat/
func (client *baseClient) PExpireAt(key string, unixTimestampInMilliSeconds int64) (bool, error) {
	result, err := client.executeCommand(C.PExpireAt, []string{key, utils.IntToString(unixTimestampInMilliSeconds)})
	if err != nil {
		return defaultBoolResponse, err
	}
	return handleBoolResponse(result)
}

// Sets a timeout on key. It takes an absolute Unix timestamp (milliseconds since
// January 1, 1970) instead of specifying the number of milliseconds.
// A timestamp in the past will delete the key immediately. After the timeout has expired, the key will automatically be
// deleted.
// If key already has an existing expire set, the time to live is updated to the new value.
// The timeout will only be cleared by commands that delete or overwrite the contents of key
//
// Parameters:
//
//	key - The key to set timeout on it.
//	unixMilliseconds - The timeout in an absolute Unix timestamp.
//	option - The option  to set expiry - NX, XX, GT, LT
//
// Return value:
//
//	`true` if the timeout was set. `false` if the timeout was not set. e.g. key doesn't exist,
//	or operation skipped due to the provided arguments.
//
//	[valkey.io]: https://valkey.io/commands/pexpireat/
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

// Expire Time returns the absolute Unix timestamp (since January 1, 1970) at which the given key
// will expire, in seconds.
//
// Parameters:
//
//	key - The key to determine the expiration value of.
//
// Return value:
//
//	The expiration Unix timestamp in seconds.
//	`-2` if key does not exist or `-1` is key exists but has no associated expiration.
//
// [valkey.io]: https://valkey.io/commands/expiretime/
func (client *baseClient) ExpireTime(key string) (int64, error) {
	result, err := client.executeCommand(C.ExpireTime, []string{key})
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

// PExpire Time returns the absolute Unix timestamp (since January 1, 1970) at which the given key
// will expire, in milliseconds.
//
// Parameters:
//
//	key - The key to determine the expiration value of.
//
// Return value:
//
//	The expiration Unix timestamp in milliseconds.
//	`-2` if key does not exist or `-1` is key exists but has no associated expiration.
//
// [valkey.io]: https://valkey.io/commands/pexpiretime/
func (client *baseClient) PExpireTime(key string) (int64, error) {
	result, err := client.executeCommand(C.PExpireTime, []string{key})
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

// TTL returns the remaining time to live of key that has a timeout, in seconds.
//
// Parameters:
//
//	key - The key to return its timeout.
//
// Return value:
//
//	Returns TTL in seconds,
//	`-2` if key does not exist, or `-1` if key exists but has no associated expiration.
//
// [valkey.io]: https://valkey.io/commands/ttl/
func (client *baseClient) TTL(key string) (int64, error) {
	result, err := client.executeCommand(C.TTL, []string{key})
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

// PTTL returns the remaining time to live of key that has a timeout, in milliseconds.
//
// Parameters:
//
//	key - The key to return its timeout.
//
// Return value:
//
//	Returns TTL in milliseconds,
//	`-2` if key does not exist, or `-1` if key exists but has no associated expiration.
//
// [valkey.io]: https://valkey.io/commands/pttl/
func (client *baseClient) PTTL(key string) (int64, error) {
	result, err := client.executeCommand(C.PTTL, []string{key})
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

// PfAdd adds all elements to the HyperLogLog data structure stored at the specified key.
// Creates a new structure if the key does not exist.
// When no elements are provided, and key exists and is a HyperLogLog, then no operation is performed.
// If key does not exist, then the HyperLogLog structure is created.
//
// Parameters:
//
//	key - The key of the HyperLogLog data structure to add elements into.
//	elements - An array of members to add to the HyperLogLog stored at key.
//
// Return value:
//
//	If the HyperLogLog is newly created, or if the HyperLogLog approximated cardinality is
//	altered, then returns `1`. Otherwise, returns `0`.
//
// [valkey.io]: https://valkey.io/commands/pfadd/
func (client *baseClient) PfAdd(key string, elements []string) (int64, error) {
	result, err := client.executeCommand(C.PfAdd, append([]string{key}, elements...))
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

// Estimates the cardinality of the data stored in a HyperLogLog structure for a single key or
// calculates the combined cardinality of multiple keys by merging their HyperLogLogs temporarily.
//
// Note:
//
//	In cluster mode, if keys in `keyValueMap` map to different hash slots, the command
//	will be split across these slots and executed separately for each. This means the command
//	is atomic only at the slot level. If one or more slot-specific requests fail, the entire
//	call will return the first encountered error, even though some requests may have succeeded
//	while others did not. If this behavior impacts your application logic, consider splitting
//	the request into sub-requests per slot to ensure atomicity.
//
// Parameters:
//
//	key - The keys of the HyperLogLog data structures to be analyzed.
//
// Return value:
//
//	The approximated cardinality of given HyperLogLog data structures.
//	The cardinality of a key that does not exist is `0`.
//
// [valkey.io]: https://valkey.io/commands/pfcount/
func (client *baseClient) PfCount(keys []string) (int64, error) {
	result, err := client.executeCommand(C.PfCount, keys)
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

// Unlink (delete) multiple keys from the database. A key is ignored if it does not exist.
// This command, similar to Del However, this command does not block the server
//
// Note:
//
//	In cluster mode, if keys in keys map to different hash slots, the command
//	will be split across these slots and executed separately for each. This means the command
//	is atomic only at the slot level. If one or more slot-specific requests fail, the entire
//	call will return the first encountered error, even though some requests may have succeeded
//	while others did not. If this behavior impacts your application logic, consider splitting
//	the request into sub-requests per slot to ensure atomicity.
//
// Parameters:
//
//	keys - One or more keys to unlink.
//
// Return value:
//
//	Return the number of keys that were unlinked.
//
// [valkey.io]: Https://valkey.io/commands/unlink/
func (client *baseClient) Unlink(keys []string) (int64, error) {
	result, err := client.executeCommand(C.Unlink, keys)
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

// Type returns the string representation of the type of the value stored at key.
// The different types that can be returned are: string, list, set, zset, hash and stream.
//
// Parameters:
//
//	key - string
//
// Return value:
//
//	If the key exists, the type of the stored value is returned. Otherwise, a "none" string is returned.
//
// [valkey.io]: Https://valkey.io/commands/type/
func (client *baseClient) Type(key string) (string, error) {
	result, err := client.executeCommand(C.Type, []string{key})
	if err != nil {
		return defaultStringResponse, err
	}
	return handleStringResponse(result)
}

// Alters the last access time of a key(s). A key is ignored if it does not exist.
//
// Note:
//
//	In cluster mode, if keys in keys map to different hash slots, the command
//	will be split across these slots and executed separately for each. This means the command
//	is atomic only at the slot level. If one or more slot-specific requests fail, the entire
//	call will return the first encountered error, even though some requests may have succeeded
//	while others did not. If this behavior impacts your application logic, consider splitting
//	the request into sub-requests per slot to ensure atomicity.
//
// Parameters:
//
//	keys - The keys to update last access time.
//
// Return value:
//
//	The number of keys that were updated.
//
// [valkey.io]: Https://valkey.io/commands/touch/
func (client *baseClient) Touch(keys []string) (int64, error) {
	result, err := client.executeCommand(C.Touch, keys)
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

// Renames key to new key.
//
//	If new Key already exists it is overwritten.
//
// Note:
//
//	When in cluster mode, both key and newKey must map to the same hash slot.
//
// Parameters:
//
//	key - The key to rename.
//	newKey - The new name of the key.
//
// Return value:
//
//	If the key was successfully renamed, return "OK". If key does not exist, an error is thrown.
//
// [valkey.io]: https://valkey.io/commands/rename/
func (client *baseClient) Rename(key string, newKey string) (string, error) {
	result, err := client.executeCommand(C.Rename, []string{key, newKey})
	if err != nil {
		return defaultStringResponse, err
	}
	return handleStringResponse(result)
}

// Renames key to newkey if newKey does not yet exist.
//
// Note:
//
//	When in cluster mode, both key and newkey must map to the same hash slot.
//
// Parameters:
//
//	key - The key to rename.
//	newKey - The new name of the key.
//
// Return value:
//
//	`true` if key was renamed to `newKey`, `false` if `newKey` already exists.
//
// [valkey.io]: https://valkey.io/commands/renamenx/
func (client *baseClient) Renamenx(key string, newKey string) (bool, error) {
	result, err := client.executeCommand(C.RenameNX, []string{key, newKey})
	if err != nil {
		return defaultBoolResponse, err
	}
	return handleBoolResponse(result)
}

// Adds an entry to the specified stream stored at `key`. If the `key` doesn't exist, the stream is created.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key      - The key of the stream.
//	values   - Field-value pairs to be added to the entry.
//
// Return value:
//
//	The id of the added entry.
//
// [valkey.io]: https://valkey.io/commands/xadd/
func (client *baseClient) XAdd(key string, values [][]string) (Result[string], error) {
	return client.XAddWithOptions(key, values, options.NewXAddOptions())
}

// Adds an entry to the specified stream stored at `key`. If the `key` doesn't exist, the stream is created.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key      - The key of the stream.
//	values   - Field-value pairs to be added to the entry.
//	options  - Stream add options.
//
// Return value:
//
//	The id of the added entry.
//
// [valkey.io]: https://valkey.io/commands/xadd/
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

// Adds one or more members to a sorted set, or updates their scores. Creates the key if it doesn't exist.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the set.
//	membersScoreMap - A map of members to their scores.
//
// Return value:
//
//	The number of members added to the set.
//
// [valkey.io]: https://valkey.io/commands/zadd/
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

// Adds one or more members to a sorted set, or updates their scores. Creates the key if it doesn't exist.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the set.
//	membersScoreMap - A map of members to their scores.
//	opts - The options for the command. See [ZAddOptions] for details.
//
// Return value:
//
//	The number of members added to the set. If `CHANGED` is set, the number of members that were updated.
//
// [valkey.io]: https://valkey.io/commands/zadd/
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

// Adds one or more members to a sorted set, or updates their scores. Creates the key if it doesn't exist.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the set.
//	member - The member to add to.
//	increment - The increment to add to the member's score.
//
// Return value:
//
//	Result[float64] - The new score of the member.
//
// [valkey.io]: https://valkey.io/commands/zadd/
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

// Adds one or more members to a sorted set, or updates their scores. Creates the key if it doesn't exist.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the set.
//	member - The member to add to.
//	increment - The increment to add to the member's score.
//	opts - The options for the command. See [ZAddOptions] for details.
//
// Return value:
//
//	The new score of the member.
//	If there was a conflict with the options, the operation aborts and `nil` is returned.
//
// [valkey.io]: https://valkey.io/commands/zadd/
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

// Increments the score of member in the sorted set stored at key by increment.
// If member does not exist in the sorted set, it is added with increment as its score.
// If key does not exist, a new sorted set with the specified member as its sole member
// is created.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the sorted set.
//	increment - The score increment.
//	member - A member of the sorted set.
//
// Return value:
//
//	The new score of member.
//
// [valkey.io]: https://valkey.io/commands/zincrby/
func (client *baseClient) ZIncrBy(key string, increment float64, member string) (float64, error) {
	result, err := client.executeCommand(C.ZIncrBy, []string{key, utils.FloatToString(increment), member})
	if err != nil {
		return defaultFloatResponse, err
	}

	return handleFloatResponse(result)
}

// Removes and returns the member with the lowest score from the sorted set
// stored at the specified `key`.
//
// see [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the sorted set.
//
// Return value:
//
//	A map containing the removed member and its corresponding score.
//	If `key` doesn't exist, it will be treated as an empty sorted set and the
//	command returns an empty map.
//
// [valkey.io]: https://valkey.io/commands/zpopmin/
func (client *baseClient) ZPopMin(key string) (map[string]float64, error) {
	result, err := client.executeCommand(C.ZPopMin, []string{key})
	if err != nil {
		return nil, err
	}
	return handleStringDoubleMapResponse(result)
}

// Removes and returns up to `count` members with the lowest scores from the sorted set
// stored at the specified `key`.
//
// see [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the sorted set.
//	count - The number of members to remove.
//
// Return value:
//
//	A map containing the removed members and their corresponding scores.
//	If `key` doesn't exist, it will be treated as an empty sorted set and the
//	command returns an empty map.
//
// [valkey.io]: https://valkey.io/commands/zpopmin/
func (client *baseClient) ZPopMinWithCount(key string, count int64) (map[string]float64, error) {
	result, err := client.executeCommand(C.ZPopMin, []string{key, utils.IntToString(count)})
	if err != nil {
		return nil, err
	}
	return handleStringDoubleMapResponse(result)
}

// Removes and returns the member with the highest score from the sorted set stored at the
// specified `key`.
//
// see [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the sorted set.
//
// Return value:
//
//	A map containing the removed member and its corresponding score.
//	If `key` doesn't exist, it will be treated as an empty sorted set and the
//	command returns an empty map.
//
// [valkey.io]: https://valkey.io/commands/zpopmin/
func (client *baseClient) ZPopMax(key string) (map[string]float64, error) {
	result, err := client.executeCommand(C.ZPopMax, []string{key})
	if err != nil {
		return nil, err
	}
	return handleStringDoubleMapResponse(result)
}

// Removes and returns up to `count` members with the highest scores from the sorted set
// stored at the specified `key`.
//
// see [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the sorted set.
//	count - The number of members to remove.
//
// Return value:
//
//	A map containing the removed members and their corresponding scores.
//	If `key` doesn't exist, it will be treated as an empty sorted set and the
//	command returns an empty map.
//
// [valkey.io]: https://valkey.io/commands/zpopmin/
func (client *baseClient) ZPopMaxWithCount(key string, count int64) (map[string]float64, error) {
	result, err := client.executeCommand(C.ZPopMax, []string{key, utils.IntToString(count)})
	if err != nil {
		return nil, err
	}
	return handleStringDoubleMapResponse(result)
}

// Removes the specified members from the sorted set stored at `key`.
// Specified members that are not a member of this set are ignored.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the sorted set.
//	members - The members to remove.
//
// Return value:
//
//	The number of members that were removed from the sorted set, not including non-existing members.
//	If `key` does not exist, it is treated as an empty sorted set, and this command returns `0`.
//
// [valkey.io]: https://valkey.io/commands/zrem/
func (client *baseClient) ZRem(key string, members []string) (int64, error) {
	result, err := client.executeCommand(C.ZRem, append([]string{key}, members...))
	if err != nil {
		return defaultIntResponse, err
	}
	return handleIntResponse(result)
}

// Returns the cardinality (number of elements) of the sorted set stored at `key`.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the set.
//
// Return value:
//
//	The number of elements in the sorted set.
//	If `key` does not exist, it is treated as an empty sorted set, and this command returns `0`.
//	If `key` holds a value that is not a sorted set, an error is returned.
//
// [valkey.io]: https://valkey.io/commands/zcard/
func (client *baseClient) ZCard(key string) (int64, error) {
	result, err := client.executeCommand(C.ZCard, []string{key})
	if err != nil {
		return defaultIntResponse, err
	}

	return handleIntResponse(result)
}

// Blocks the connection until it removes and returns a member with the lowest score from the
// first non-empty sorted set, with the given `keys` being checked in the order they
// are provided.
// `BZPOPMIN` is the blocking variant of `ZPOPMIN`.
//
// Note:
//   - When in cluster mode, all `keys` must map to the same hash slot.
//   - `BZPOPMIN` is a client blocking command, see [Blocking Commands] for more details and best practices.
//
// See [valkey.io] for more details.
//
// Parameters:
//
//	keys - The keys of the sorted sets.
//	timeout - The number of seconds to wait for a blocking operation to complete. A value of
//	  `0` will block indefinitely.
//
// Return value:
//
//	A `KeyWithMemberAndScore` struct containing the key where the member was popped out, the member
//	itself, and the member score. If no member could be popped and the `timeout` expired, returns `nil`.
//
// [valkey.io]: https://valkey.io/commands/bzpopmin/
//
// [blocking commands]: https://github.com/valkey-io/valkey-glide/wiki/General-Concepts#blocking-commands
func (client *baseClient) BZPopMin(keys []string, timeoutSecs float64) (Result[KeyWithMemberAndScore], error) {
	result, err := client.executeCommand(C.BZPopMin, append(keys, utils.FloatToString(timeoutSecs)))
	if err != nil {
		return CreateNilKeyWithMemberAndScoreResult(), err
	}

	return handleKeyWithMemberAndScoreResponse(result)
}

// Blocks the connection until it pops and returns a member-score pair from the first non-empty sorted set, with the
// given keys being checked in the order they are provided.
// BZMPop is the blocking variant of [baseClient.ZMPop].
//
// Note:
//   - When in cluster mode, all keys must map to the same hash slot.
//   - BZMPop is a client blocking command, see [Blocking Commands] for more details and best practices.
//
// Since:
//
//	Valkey 7.0 and above.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	keys          - An array of keys to lists.
//	scoreFilter   - The element pop criteria - either [api.MIN] or [api.MAX] to pop members with the lowest/highest
//					scores accordingly.
//	timeoutSecs   - The number of seconds to wait for a blocking operation to complete. A value of `0` will block
//					indefinitely.
//
// Return value:
//
//	An object containing the following elements:
//	- The key name of the set from which the element was popped.
//	- An array of member scores of the popped elements.
//	Returns `nil` if no member could be popped and the timeout expired.
//
// [valkey.io]: https://valkey.io/commands/bzmpop/
// [Blocking Commands]: https://github.com/valkey-io/valkey-glide/wiki/General-Concepts#blocking-commands
func (client *baseClient) BZMPop(
	keys []string,
	scoreFilter ScoreFilter,
	timeoutSecs float64,
) (Result[KeyWithArrayOfMembersAndScores], error) {
	scoreFilterStr, err := scoreFilter.toString()
	if err != nil {
		return CreateNilKeyWithArrayOfMembersAndScoresResult(), err
	}

	// Check for potential length overflow.
	if len(keys) > math.MaxInt-3 {
		return CreateNilKeyWithArrayOfMembersAndScoresResult(), &errors.RequestError{
			Msg: "Length overflow for the provided keys",
		}
	}

	// args slice will have 3 more arguments with the keys provided.
	args := make([]string, 0, len(keys)+3)
	args = append(args, utils.FloatToString(timeoutSecs), strconv.Itoa(len(keys)))
	args = append(args, keys...)
	args = append(args, scoreFilterStr)
	result, err := client.executeCommand(C.BZMPop, args)
	if err != nil {
		return CreateNilKeyWithArrayOfMembersAndScoresResult(), err
	}
	return handleKeyWithArrayOfMembersAndScoresResponse(result)
}

// Blocks the connection until it pops and returns a member-score pair from the first non-empty sorted set, with the
// given keys being checked in the order they are provided.
// BZMPop is the blocking variant of [baseClient.ZMPop].
//
// Note:
//   - When in cluster mode, all keys must map to the same hash slot.
//   - BZMPop is a client blocking command, see [Blocking Commands] for more details and best practices.
//
// Since:
//
//	Valkey 7.0 and above.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	keys          - An array of keys to lists.
//	scoreFilter   - The element pop criteria - either [api.MIN] or [api.MAX] to pop members with the lowest/highest
//					scores accordingly.
//	count         - The maximum number of popped elements.
//	timeoutSecs   - The number of seconds to wait for a blocking operation to complete. A value of `0` will block indefinitely.
//
// Return value:
//
//	An object containing the following elements:
//	- The key name of the set from which the element was popped.
//	- An array of member scores of the popped elements.
//	Returns `nil` if no member could be popped and the timeout expired.
//
// [valkey.io]: https://valkey.io/commands/bzmpop/
// [Blocking Commands]: https://github.com/valkey-io/valkey-glide/wiki/General-Concepts#blocking-commands
func (client *baseClient) BZMPopWithOptions(
	keys []string,
	scoreFilter ScoreFilter,
	timeoutSecs float64,
	opts *options.ZMPopOptions,
) (Result[KeyWithArrayOfMembersAndScores], error) {
	scoreFilterStr, err := scoreFilter.toString()
	if err != nil {
		return CreateNilKeyWithArrayOfMembersAndScoresResult(), err
	}

	// Check for potential length overflow.
	if len(keys) > math.MaxInt-5 {
		return CreateNilKeyWithArrayOfMembersAndScoresResult(), &errors.RequestError{
			Msg: "Length overflow for the provided keys",
		}
	}

	// args slice will have 5 more arguments with the keys provided.
	args := make([]string, 0, len(keys)+5)
	args = append(args, utils.FloatToString(timeoutSecs), strconv.Itoa(len(keys)))
	args = append(args, keys...)
	args = append(args, scoreFilterStr)
	if opts != nil {
		optionArgs, err := opts.ToArgs()
		if err != nil {
			return CreateNilKeyWithArrayOfMembersAndScoresResult(), err
		}
		args = append(args, optionArgs...)
	}
	result, err := client.executeCommand(C.BZMPop, args)
	if err != nil {
		return CreateNilKeyWithArrayOfMembersAndScoresResult(), err
	}

	return handleKeyWithArrayOfMembersAndScoresResponse(result)
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

// Removes the existing timeout on key, turning the key from volatile
// (a key with an expire set) to persistent (a key that will never expire as no timeout is associated).
//
// Parameters:
//
//	key - The key to remove the existing timeout on.
//
// Return value:
//
//	`false` if key does not exist or does not have an associated timeout, `true` if the timeout has been removed.
//
// [valkey.io]: https://valkey.io/commands/persist/
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

// Returns the rank of `member` in the sorted set stored at `key`, with
// scores ordered from low to high, starting from `0`.
// To get the rank of `member` with its score, see [ZRankWithScore].
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the sorted set.
//	member - The member to get the rank of.
//
// Return value:
//
//	The rank of `member` in the sorted set.
//	If `key` doesn't exist, or if `member` is not present in the set,
//	`nil` will be returned.
//
// [valkey.io]: https://valkey.io/commands/zrank/
func (client *baseClient) ZRank(key string, member string) (Result[int64], error) {
	result, err := client.executeCommand(C.ZRank, []string{key, member})
	if err != nil {
		return CreateNilInt64Result(), err
	}
	return handleIntOrNilResponse(result)
}

// Returns the rank of `member` in the sorted set stored at `key` with its
// score, where scores are ordered from the lowest to highest, starting from `0`.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the sorted set.
//	member - The member to get the rank of.
//
// Return value:
//
//	A tuple containing the rank of `member` and its score.
//	If `key` doesn't exist, or if `member` is not present in the set,
//	`nil` will be returned.
//
// [valkey.io]: https://valkey.io/commands/zrank/
func (client *baseClient) ZRankWithScore(key string, member string) (Result[int64], Result[float64], error) {
	result, err := client.executeCommand(C.ZRank, []string{key, member, options.WithScore})
	if err != nil {
		return CreateNilInt64Result(), CreateNilFloat64Result(), err
	}
	return handleLongAndDoubleOrNullResponse(result)
}

// Returns the rank of `member` in the sorted set stored at `key`, where
// scores are ordered from the highest to lowest, starting from `0`.
// To get the rank of `member` with its score, see [ZRevRankWithScore].
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the sorted set.
//	member - The member to get the rank of.
//
// Return value:
//
//	The rank of `member` in the sorted set, where ranks are ordered from high to
//	low based on scores.
//	If `key` doesn't exist, or if `member` is not present in the set,
//	`nil` will be returned.
//
// [valkey.io]: https://valkey.io/commands/zrevrank/
func (client *baseClient) ZRevRank(key string, member string) (Result[int64], error) {
	result, err := client.executeCommand(C.ZRevRank, []string{key, member})
	if err != nil {
		return CreateNilInt64Result(), err
	}
	return handleIntOrNilResponse(result)
}

// Returns the rank of `member` in the sorted set stored at `key`, where
// scores are ordered from the highest to lowest, starting from `0`.
// To get the rank of `member` with its score, see [ZRevRankWithScore].
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the sorted set.
//	member - The member to get the rank of.
//
// Return value:
//
//	A tuple containing the rank of `member` and its score.
//	If `key` doesn't exist, or if `member` is not present in the set,
//	`nil` will be returned.s
//
// [valkey.io]: https://valkey.io/commands/zrevrank/
func (client *baseClient) ZRevRankWithScore(key string, member string) (Result[int64], Result[float64], error) {
	result, err := client.executeCommand(C.ZRevRank, []string{key, member, options.WithScore})
	if err != nil {
		return CreateNilInt64Result(), CreateNilFloat64Result(), err
	}
	return handleLongAndDoubleOrNullResponse(result)
}

// Trims the stream by evicting older entries.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key     - The key of the stream.
//	options - Stream trim options
//
// Return value:
//
//	The number of entries deleted from the stream.
//
// [valkey.io]: https://valkey.io/commands/xtrim/
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

// Returns the number of entries in the stream stored at `key`.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the stream.
//
// Return value:
//
//	The number of entries in the stream. If `key` does not exist, return 0.
//
// [valkey.io]: https://valkey.io/commands/xlen/
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
//
// An XPendingSummary struct that includes a summary with the following fields:
//
//	NumOfMessages - The total number of pending messages for this consumer group.
//	StartId - The smallest ID among the pending messages or nil if no pending messages exist.
//	EndId - The greatest ID among the pending messages or nil if no pending messages exists.
//	GroupConsumers - An array of ConsumerPendingMessages with the following fields:
//	ConsumerName - The name of the consumer.
//	MessageCount - The number of pending messages for this consumer.
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

// Create a key associated with a value that is obtained by
// deserializing the provided serialized value (obtained via [valkey.io]: Https://valkey.io/commands/dump/).
//
// Parameters:
//
//	key - The key to create.
//	ttl - The expiry time (in milliseconds). If 0, the key will persist.
//	value - The serialized value to deserialize and assign to key.
//
// Return value:
//
//	Return OK if successfully create a key with a value </code>.
//
// [valkey.io]: https://valkey.io/commands/restore/
func (client *baseClient) Restore(key string, ttl int64, value string) (Result[string], error) {
	return client.RestoreWithOptions(key, ttl, value, NewRestoreOptionsBuilder())
}

// Create a key associated with a value that is obtained by
// deserializing the provided serialized value (obtained via [valkey.io]: Https://valkey.io/commands/dump/).
//
// Parameters:
//
//	key - The key to create.
//	ttl - The expiry time (in milliseconds). If 0, the key will persist.
//	value - The serialized value to deserialize and assign to key.
//	restoreOptions - Set restore options with replace and absolute TTL modifiers, object idletime and frequency
//
// Return value:
//
//	Return OK if successfully create a key with a value.
//
// [valkey.io]: https://valkey.io/commands/restore/
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

// Serialize the value stored at key in a Valkey-specific format and return it to the user.
//
// Parameters:
//
//	The key to serialize.
//
// Return value:
//
//	The serialized value of the data stored at key
//	If key does not exist, null will be returned.
//
// [valkey.io]: https://valkey.io/commands/dump/
func (client *baseClient) Dump(key string) (Result[string], error) {
	result, err := client.executeCommand(C.Dump, []string{key})
	if err != nil {
		return CreateNilStringResult(), err
	}
	return handleStringOrNilResponse(result)
}

// Returns the internal encoding for the Valkey object stored at key.
//
// Note:
//
//	When in cluster mode, both key and newkey must map to the same hash slot.
//
// Parameters:
//
//	The key of the object to get the internal encoding of.
//
// Return value:
//
//	If key exists, returns the internal encoding of the object stored at
//	key as a String. Otherwise, returns null.
//
// [valkey.io]: https://valkey.io/commands/object-encoding/
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
// [valkey.io]: https://valkey.io/commands/zremrangebyscore/
func (client *baseClient) ZRemRangeByScore(key string, rangeQuery options.RangeByScore) (int64, error) {
	result, err := client.executeCommand(C.ZRemRangeByScore, append([]string{key}, rangeQuery.ToArgsRemRange()...))
	if err != nil {
		return 0, err
	}
	return handleIntResponse(result)
}

// Returns a random member from the sorted set stored at `key`.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the sorted set.
//
// Return value:
//
//	A string representing a random member from the sorted set.
//	If the sorted set does not exist or is empty, the response will be `nil`.
//
// Example:
//
//	member, err := client.ZRandMember("key1")
//
// [valkey.io]: https://valkey.io/commands/zrandmember/
func (client *baseClient) ZRandMember(key string) (Result[string], error) {
	result, err := client.executeCommand(C.ZRandMember, []string{key})
	if err != nil {
		return CreateNilStringResult(), err
	}
	return handleStringOrNilResponse(result)
}

// Returns a random member from the sorted set stored at `key`.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the sorted set.
//	count - The number of field names to return.
//	  If `count` is positive, returns unique elements. If negative, allows for duplicates.
//
// Return value:
//
//	An array of members from the sorted set.
//	If the sorted set does not exist or is empty, the response will be an empty array.
//
// Example:
//
//	members, err := client.ZRandMemberWithCount("key1", -5)
//
// [valkey.io]: https://valkey.io/commands/zrandmember/
func (client *baseClient) ZRandMemberWithCount(key string, count int64) ([]string, error) {
	result, err := client.executeCommand(C.ZRandMember, []string{key, utils.IntToString(count)})
	if err != nil {
		return nil, err
	}
	return handleStringArrayResponse(result)
}

// Returns a random member from the sorted set stored at `key`.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key - The key of the sorted set.
//	count - The number of field names to return.
//	  If `count` is positive, returns unique elements. If negative, allows for duplicates.
//
// Return value:
//
//	An array of `MemberAndScore` objects, which store member names and their respective scores.
//	If the sorted set does not exist or is empty, the response will be an empty array.
//
// Example:
//
//	membersAndScores, err := client.ZRandMemberWithCountWithScores("key1", 5)
//
// [valkey.io]: https://valkey.io/commands/zrandmember/
func (client *baseClient) ZRandMemberWithCountWithScores(key string, count int64) ([]MemberAndScore, error) {
	result, err := client.executeCommand(C.ZRandMember, []string{key, utils.IntToString(count), options.WithScores})
	if err != nil {
		return nil, err
	}
	return handleMemberAndScoreArrayResponse(result)
}

// Returns the scores associated with the specified `members` in the sorted set stored at `key`.
//
// Since:
//
//	Valkey 6.2.0 and above.
//
// Parameters:
//
//	key     - The key of the sorted set.
//	members - A list of members in the sorted set.
//
// Return value:
//
//	An array of scores corresponding to `members`.
//	If a member does not exist in the sorted set, the corresponding value in the list will be `nil`.
//
// Example:
//
//	result, err := client.ZMScore(key, []string{"member1", "non_existent_member", "member2"})
//	result: [{1.0 false} {0 true} {2.0 false}]
//
// [valkey.io]: https://valkey.io/commands/zmscore/
func (client *baseClient) ZMScore(key string, members []string) ([]Result[float64], error) {
	response, err := client.executeCommand(C.ZMScore, append([]string{key}, members...))
	if err != nil {
		return nil, err
	}
	return handleFloatOrNilArrayResponse(response)
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
// [valkey.io]: https://valkey.io/commands/object-refcount/
func (client *baseClient) ObjectRefCount(key string) (Result[int64], error) {
	result, err := client.executeCommand(C.ObjectRefCount, []string{key})
	if err != nil {
		return CreateNilInt64Result(), err
	}
	return handleIntOrNilResponse(result)
}

// Sorts the elements in the list, set, or sorted set at key and returns the result.
// The sort command can be used to sort elements based on different criteria and apply
// transformations on sorted elements.
// To store the result into a new key, see the sortStore function.
//
// Parameters:
//
//	key - The key of the list, set, or sorted set to be sorted.
//
// Return value:
//
//	An Array of sorted elements.
//
// [valkey.io]: https://valkey.io/commands/sort/
func (client *baseClient) Sort(key string) ([]Result[string], error) {
	result, err := client.executeCommand(C.Sort, []string{key})
	if err != nil {
		return nil, err
	}
	return handleStringOrNilArrayResponse(result)
}

// Sorts the elements in the list, set, or sorted set at key and returns the result.
// The sort command can be used to sort elements based on different criteria and apply
// transformations on sorted elements.
// To store the result into a new key, see the sortStore function.
//
// Note:
//
//	In cluster mode, if `key` map to different hash slots, the command
//	will be split across these slots and executed separately for each. This means the command
//	is atomic only at the slot level. If one or more slot-specific requests fail, the entire
//	call will return the first encountered error, even though some requests may have succeeded
//	while others did not. If this behavior impacts your application logic, consider splitting
//	the request into sub-requests per slot to ensure atomicity.
//	The use of SortOptions.byPattern and SortOptions.getPatterns in cluster mode is
//	supported since Valkey version 8.0.
//
// Parameters:
//
//	key - The key of the list, set, or sorted set to be sorted.
//	sortOptions - The SortOptions type.
//
// Return value:
//
//	An Array of sorted elements.
//
// [valkey.io]: https://valkey.io/commands/sort/
func (client *baseClient) SortWithOptions(key string, options *options.SortOptions) ([]Result[string], error) {
	optionArgs := options.ToArgs()
	result, err := client.executeCommand(C.Sort, append([]string{key}, optionArgs...))
	if err != nil {
		return nil, err
	}
	return handleStringOrNilArrayResponse(result)
}

// Sorts the elements in the list, set, or sorted set at key and returns the result.
// The sortReadOnly command can be used to sort elements based on different criteria and apply
// transformations on sorted elements.
// This command is routed depending on the client's ReadFrom strategy.
//
// Parameters:
//
//	key - The key of the list, set, or sorted set to be sorted.
//
// Return value:
//
//	An Array of sorted elements.
//
// [valkey.io]: https://valkey.io/commands/sort/
func (client *baseClient) SortReadOnly(key string) ([]Result[string], error) {
	result, err := client.executeCommand(C.SortReadOnly, []string{key})
	if err != nil {
		return nil, err
	}
	return handleStringOrNilArrayResponse(result)
}

// Sorts the elements in the list, set, or sorted set at key and returns the result.
// The sort command can be used to sort elements based on different criteria and apply
// transformations on sorted elements.
// This command is routed depending on the client's ReadFrom strategy.
//
// Note:
//
//	In cluster mode, if `key` map to different hash slots, the command
//	will be split across these slots and executed separately for each. This means the command
//	is atomic only at the slot level. If one or more slot-specific requests fail, the entire
//	call will return the first encountered error, even though some requests may have succeeded
//	while others did not. If this behavior impacts your application logic, consider splitting
//	the request into sub-requests per slot to ensure atomicity.
//	The use of SortOptions.byPattern and SortOptions.getPatterns in cluster mode is
//	supported since Valkey version 8.0.
//
// Parameters:
//
//	key - The key of the list, set, or sorted set to be sorted.
//	sortOptions - The SortOptions type.
//
// Return value:
//
//	An Array of sorted elements.
//
// [valkey.io]: https://valkey.io/commands/sort/
func (client *baseClient) SortReadOnlyWithOptions(key string, options *options.SortOptions) ([]Result[string], error) {
	optionArgs := options.ToArgs()
	result, err := client.executeCommand(C.SortReadOnly, append([]string{key}, optionArgs...))
	if err != nil {
		return nil, err
	}
	return handleStringOrNilArrayResponse(result)
}

// Sorts the elements in the list, set, or sorted set at key and stores the result in
// destination. The sort command can be used to sort elements based on
// different criteria, apply transformations on sorted elements, and store the result in a new key.
// The sort command can be used to sort elements based on different criteria and apply
// transformations on sorted elements.
// To get the sort result without storing it into a key, see the sort or sortReadOnly function.
//
// Note:
//
//	In cluster mode, if `key` and `destination` map to different hash slots, the command
//	will be split across these slots and executed separately for each. This means the command
//	is atomic only at the slot level. If one or more slot-specific requests fail, the entire
//	call will return the first encountered error, even though some requests may have succeeded
//	while others did not. If this behavior impacts your application logic, consider splitting
//	the request into sub-requests per slot to ensure atomicity.
//
// Parameters:
//
//	key - The key of the list, set, or sorted set to be sorted.
//	destination - The key where the sorted result will be stored.
//
// Return value:
//
//	The number of elements in the sorted key stored at destination.
//
// [valkey.io]: https://valkey.io/commands/sort/
func (client *baseClient) SortStore(key string, destination string) (int64, error) {
	result, err := client.executeCommand(C.Sort, []string{key, "STORE", destination})
	if err != nil {
		return defaultIntResponse, err
	}
	return handleIntResponse(result)
}

// Sorts the elements in the list, set, or sorted set at key and stores the result in
// destination. The sort command can be used to sort elements based on
// different criteria, apply transformations on sorted elements, and store the result in a new key.
// The sort command can be used to sort elements based on different criteria and apply
// transformations on sorted elements.
// To get the sort result without storing it into a key, see the sort or sortReadOnly function.
//
// Note:
//
//	In cluster mode, if `key` and `destination` map to different hash slots, the command
//	will be split across these slots and executed separately for each. This means the command
//	is atomic only at the slot level. If one or more slot-specific requests fail, the entire
//	call will return the first encountered error, even though some requests may have succeeded
//	while others did not. If this behavior impacts your application logic, consider splitting
//	the request into sub-requests per slot to ensure atomicity.
//	The use of SortOptions.byPattern and SortOptions.getPatterns
//	in cluster mode is supported since Valkey version 8.0.
//
// Parameters:
//
//	key - The key of the list, set, or sorted set to be sorted.
//	destination - The key where the sorted result will be stored.
//	sortOptions - The SortOptions type.
//
// Return value:
//
//	The number of elements in the sorted key stored at destination.
//
// [valkey.io]: https://valkey.io/commands/sort/
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
//
//	The number of replicas reached by all the writes performed in the context of the current connection.
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

// Copies the value stored at the source to the destination key if the
// destination key does not yet exist.
//
// Note:
//
//	When in cluster mode, both source and destination must map to the same hash slot.
//
// Parameters:
//
//	source - The key to the source value.
//	destination - The key where the value should be copied to.
//
// Return value:
//
//	`true` if source was copied, `false` if source was not copied.
//
// [valkey.io]: https://valkey.io/commands/copy/
func (client *baseClient) Copy(source string, destination string) (bool, error) {
	result, err := client.executeCommand(C.Copy, []string{source, destination})
	if err != nil {
		return defaultBoolResponse, err
	}
	return handleBoolResponse(result)
}

// Copies the value stored at the source to the destination key. When
// replace is true, removes the destination key first if it already
// exists, otherwise performs no action.
//
// Note:
//
//	When in cluster mode, both source and destination must map to the same hash slot.
//
// Parameters:
//
//	source - The key to the source value.
//	destination - The key where the value should be copied to.
//	copyOptions - Set copy options with replace and DB destination-db
//
// Return value:
//
//	`true` if source was copied, `false` if source was not copied.
//
// [valkey.io]: https://valkey.io/commands/copy/
func (client *baseClient) CopyWithOptions(
	source string,
	destination string,
	options *CopyOptions,
) (bool, error) {
	optionArgs, err := options.toArgs()
	if err != nil {
		return defaultBoolResponse, err
	}
	result, err := client.executeCommand(C.Copy, append([]string{
		source, destination,
	}, optionArgs...))
	if err != nil {
		return defaultBoolResponse, err
	}
	return handleBoolResponse(result)
}

// Returns stream entries matching a given range of IDs.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key   - The key of the stream.
//	start - The start position.
//	        Use `options.NewStreamBoundary()` to specify a stream entry ID and its inclusive/exclusive status.
//	        Use `options.NewInfiniteStreamBoundary()` to specify an infinite stream boundary.
//	end   - The end position.
//	        Use `options.NewStreamBoundary()` to specify a stream entry ID and its inclusive/exclusive status.
//	        Use `options.NewInfiniteStreamBoundary()` to specify an infinite stream boundary.
//
// Return value:
//
//	A `map` of key to stream entry data, where entry data is an array of
//	pairings with format `[[field, entry], [field, entry], ...]`. Returns `nil` if `count` is non-positive.
//
// [valkey.io]: https://valkey.io/commands/xrange/
func (client *baseClient) XRange(
	key string,
	start options.StreamBoundary,
	end options.StreamBoundary,
) (map[string][][]string, error) {
	return client.XRangeWithOptions(key, start, end, nil)
}

// Returns stream entries matching a given range of IDs.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key   - The key of the stream.
//	start - The start position.
//	        Use `options.NewStreamBoundary()` to specify a stream entry ID and its inclusive/exclusive status.
//	        Use `options.NewInfiniteStreamBoundary()` to specify an infinite stream boundary.
//	end   - The end position.
//	        Use `options.NewStreamBoundary()` to specify a stream entry ID and its inclusive/exclusive status.
//	        Use `options.NewInfiniteStreamBoundary()` to specify an infinite stream boundary.
//	opts  - Stream range options.
//
// Return value:
//
//	A `map` of key to stream entry data, where entry data is an array of
//	pairings with format `[[field, entry], [field, entry], ...]`. Returns `nil` if `count` is non-positive.
//
// [valkey.io]: https://valkey.io/commands/xrange/
func (client *baseClient) XRangeWithOptions(
	key string,
	start options.StreamBoundary,
	end options.StreamBoundary,
	opts *options.StreamRangeOptions,
) (map[string][][]string, error) {
	args := []string{key, string(start), string(end)}
	if opts != nil {
		optionArgs, err := opts.ToArgs()
		if err != nil {
			return nil, err
		}
		args = append(args, optionArgs...)
	}
	result, err := client.executeCommand(C.XRange, args)
	if err != nil {
		return nil, err
	}
	return handleMapOfArrayOfStringArrayOrNilResponse(result)
}

// Returns stream entries matching a given range of IDs in reverse order.
// Equivalent to `XRange` but returns entries in reverse order.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key   - The key of the stream.
//	start - The start position.
//	        Use `options.NewStreamBoundary()` to specify a stream entry ID and its inclusive/exclusive status.
//	        Use `options.NewInfiniteStreamBoundary()` to specify an infinite stream boundary.
//	end   - The end position.
//	        Use `options.NewStreamBoundary()` to specify a stream entry ID and its inclusive/exclusive status.
//	        Use `options.NewInfiniteStreamBoundary()` to specify an infinite stream boundary.
//
// Return value:
//
//	A `map` of key to stream entry data, where entry data is an array of
//	pairings with format `[[field, entry], [field, entry], ...]`.
//
// [valkey.io]: https://valkey.io/commands/xrevrange/
func (client *baseClient) XRevRange(
	key string,
	start options.StreamBoundary,
	end options.StreamBoundary,
) (map[string][][]string, error) {
	return client.XRevRangeWithOptions(key, start, end, nil)
}

// Returns stream entries matching a given range of IDs in reverse order.
// Equivalent to `XRange` but returns entries in reverse order.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key   - The key of the stream.
//	start - The start position.
//	        Use `options.NewStreamBoundary()` to specify a stream entry ID and its inclusive/exclusive status.
//	        Use `options.NewInfiniteStreamBoundary()` to specify an infinite stream boundary.
//	end   - The end position.
//	        Use `options.NewStreamBoundary()` to specify a stream entry ID and its inclusive/exclusive status.
//	        Use `options.NewInfiniteStreamBoundary()` to specify an infinite stream boundary.
//	opts  - Stream range options.
//
// Return value:
//
//	A `map` of key to stream entry data, where entry data is an array of
//	pairings with format `[[field, entry], [field, entry], ...]`.
//	Returns `nil` if `count` is non-positive.
//
// [valkey.io]: https://valkey.io/commands/xrevrange/
func (client *baseClient) XRevRangeWithOptions(
	key string,
	start options.StreamBoundary,
	end options.StreamBoundary,
	opts *options.StreamRangeOptions,
) (map[string][][]string, error) {
	args := []string{key, string(start), string(end)}
	if opts != nil {
		optionArgs, err := opts.ToArgs()
		if err != nil {
			return nil, err
		}
		args = append(args, optionArgs...)
	}
	result, err := client.executeCommand(C.XRevRange, args)
	if err != nil {
		return nil, err
	}
	return handleMapOfArrayOfStringArrayOrNilResponse(result)
}

// Reads or modifies the array of bits representing the string that is held at key
// based on the specified sub commands.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key          -  The key of the string.
//	subCommands  -  The subCommands to be performed on the binary value of the string at
//	                key, which could be any of the following:
//	                  - [BitFieldGet].
//	                  - [BitFieldSet].
//	                  - [BitFieldIncrby].
//	                  - [BitFieldOverflow].
//		            Use `options.NewBitFieldGet()` to specify a  BitField GET command.
//		            Use `options.NewBitFieldSet()` to specify a BitField SET command.
//		            Use `options.NewBitFieldIncrby()` to specify a BitField INCRYBY command.
//		            Use `options.BitFieldOverflow()` to specify a BitField OVERFLOW command.
//
// Return value:
//
//	Result from the executed subcommands.
//	  - BitFieldGet returns the value in the binary representation of the string.
//	  - BitFieldSet returns the previous value before setting the new value in the binary representation.
//	  - BitFieldIncrBy returns the updated value after increasing or decreasing the bits.
//	  - BitFieldOverflow controls the behavior of subsequent operations and returns
//	    a result based on the specified overflow type (WRAP, SAT, FAIL).
//
// Example:
//
//	commands := []options.BitFieldSubCommands{
//		options.BitFieldGet(options.SignedInt, 8, 16),
//		options.BitFieldOverflow(options.SAT),
//		options.NewBitFieldSet(options.UnsignedInt, 4, 0, 7),
//	    options.BitFieldIncrBy(options.SignedInt, 5, 100, 1),
//	}
//	result, err := client.BitField("mykey", commands)
//	result: [{0 false} {7 false} {15 false}]
//
// [valkey.io]: https://valkey.io/commands/bitfield/
func (client *baseClient) BitField(key string, subCommands []options.BitFieldSubCommands) ([]Result[int64], error) {
	args := make([]string, 0, 10)
	args = append(args, key)

	for _, cmd := range subCommands {
		cmdArgs, err := cmd.ToArgs()
		if err != nil {
			return nil, err
		}
		args = append(args, cmdArgs...)
	}

	result, err := client.executeCommand(C.BitField, args)
	if err != nil {
		return nil, err
	}
	return handleIntOrNilArrayResponse(result)
}

// Reads the array of bits representing the string that is held at key
// based on the specified  sub commands.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	key          -  The key of the string.
//	subCommands  -  The read-only subCommands to be performed on the binary value
//	                of the string at key, which could be:
//	                  - [BitFieldGet].
//		            Use `options.NewBitFieldGet()` to specify a BitField GET command.
//
// Return value:
//
//	Result from the executed GET subcommands.
//	  - BitFieldGet returns the value in the binary representation of the string.
//
// Example:
//
//	 commands := []options.BitFieldROCommands{
//		options.BitFieldGet(options.SignedInt, 8, 16),
//	  }
//	 result, err := client.BitFieldRO("mykey", commands)
//	 result: [{42 false}]
//
// [valkey.io]: https://valkey.io/commands/bitfield_ro/
func (client *baseClient) BitFieldRO(key string, commands []options.BitFieldROCommands) ([]Result[int64], error) {
	args := make([]string, 0, 10)
	args = append(args, key)

	for _, cmd := range commands {
		cmdArgs, err := cmd.ToArgs()
		if err != nil {
			return nil, err
		}
		args = append(args, cmdArgs...)
	}

	result, err := client.executeCommand(C.BitFieldReadOnly, args)
	if err != nil {
		return nil, err
	}
	return handleIntOrNilArrayResponse(result)
}

// Returns the server time.
//
// Return value:
// The current server time as a String array with two elements:
// A UNIX TIME and the amount of microseconds already elapsed in the current second.
// The returned array is in a [UNIX TIME, Microseconds already elapsed] format.
//
// For example:
//
//	result, err := client.Time()
//	result: [{1737051660} {994688}]
//
// [valkey.io]: https://valkey.io/commands/time/
func (client *baseClient) Time() ([]string, error) {
	result, err := client.executeCommand(C.Time, []string{})
	if err != nil {
		return nil, err
	}
	return handleStringArrayResponse(result)
}

// Returns the intersection of members from sorted sets specified by the given `keys`.
// To get the elements with their scores, see [ZInterWithScores].
//
// Note:
//
//	When in cluster mode, all keys must map to the same hash slot.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	keys - The keys of the sorted sets, see - [options.KeyArray].
//
// Return value:
//
//	The resulting sorted set from the intersection.
//
// Example:
//
//	res, err := client.ZInter(options.NewKeyArray("key1", "key2", "key3"))
//	fmt.Println(res) // []string{"member1", "member2", "member3"}
//
// [valkey.io]: https://valkey.io/commands/zinter/
func (client *baseClient) ZInter(keys options.KeyArray) ([]string, error) {
	args := keys.ToArgs()
	result, err := client.executeCommand(C.ZInter, args)
	if err != nil {
		return nil, err
	}
	return handleStringArrayResponse(result)
}

// Returns the intersection of members and their scores from sorted sets specified by the given
// `keysOrWeightedKeys`.
//
// Note:
//
//	When in cluster mode, all keys must map to the same hash slot.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	options - The options for the ZInter command, see - [options.ZInterOptions].
//
// Return value:
//
//	A map of members to their scores.
//
// Example:
//
//	res, err := client.ZInterWithScores(options.NewZInterOptionsBuilder(options.NewKeyArray("key1", "key2", "key3")))
//	fmt.Println(res) // map[member1:1.0 member2:2.0 member3:3.0]
//
// [valkey.io]: https://valkey.io/commands/zinter/
func (client *baseClient) ZInterWithScores(zInterOptions *options.ZInterOptions) (map[string]float64, error) {
	args, err := zInterOptions.ToArgs()
	if err != nil {
		return nil, err
	}
	args = append(args, options.WithScores)
	result, err := client.executeCommand(C.ZInter, args)
	if err != nil {
		return nil, err
	}
	return handleStringDoubleMapResponse(result)
}

// Returns the difference between the first sorted set and all the successive sorted sets.
// To get the elements with their scores, see `ZDiffWithScores`
//
// When in cluster mode, all `keys` must map to the same hash slot.
//
// Available for Valkey 6.2 and above.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	keys -  The keys of the sorted sets.
//
// Return value:
//
//	An array of elements representing the difference between the sorted sets.
//	If the first `key` does not exist, it is treated as an empty sorted set, and the
//	command returns an empty array.
//
// Example:
//
//	membersScores1 := map[string]float64{"one": 1.0, "two": 2.0, "three": 3.0}
//	membersScores2 := map[string]float64{"two": 2.0}
//	zAddResult1, err := client.ZAdd("key1", membersScores1)
//	zAddResult2, err := client.ZAdd("key2", membersScores2)
//	zDiffResult, err := client.ZDiff([]string{"key1", "key2"})
//	fmt.Println(zDiffResult) // Output: {"one", "three"}
//
// [valkey.io]: https://valkey.io/commands/zdiff/
func (client *baseClient) ZDiff(keys []string) ([]string, error) {
	args := append([]string{}, strconv.Itoa(len(keys)))
	result, err := client.executeCommand(C.ZDiff, append(args, keys...))
	if err != nil {
		return nil, err
	}
	return handleStringArrayResponse(result)
}

// Returns the difference between the first sorted set and all the successive sorted sets.
// When in cluster mode, all `keys` must map to the same hash slot.
// Available for Valkey 6.2 and above.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	keys -  The keys of the sorted sets.
//
// Return value:
//
//	A `Map` of elements and their scores representing the difference between the sorted sets.
//	If the first `key` does not exist, it is treated as an empty sorted set, and the
//	command returns an empty `Map`.
//
// Example:
//
//	membersScores1 := map[string]float64{"one": 1.0, "two": 2.0, "three": 3.0}
//	membersScores2 := map[string]float64{"two": 2.0}
//	zAddResult1, err := client.ZAdd("key1", membersScores1)
//	zAddResult2, err := client.ZAdd("key2", membersScores2)
//	zDiffResultWithScores, err := client.ZDiffWithScores([]string{"key1", "key2"})
//	fmt.Println(zDiffResultWithScores) // Output: {"one": 1.0, "three": 3.0}
//
// [valkey.io]: https://valkey.io/commands/zdiff/
func (client *baseClient) ZDiffWithScores(keys []string) (map[string]float64, error) {
	args := append([]string{}, strconv.Itoa(len(keys)))
	args = append(args, keys...)
	result, err := client.executeCommand(C.ZDiff, append(args, options.WithScores))
	if err != nil {
		return nil, err
	}
	return handleStringDoubleMapResponse(result)
}

// Calculates the difference between the first sorted set and all the successive sorted sets at
// `keys` and stores the difference as a sorted set to `destination`,
// overwriting it if it already exists. Non-existent keys are treated as empty sets.
//
// Note: When in cluster mode, `destination` and all `keys` must map to the same hash slot.
//
// Available for Valkey 6.2 and above.
//
// See [valkey.io] for details.
//
// Parameters:
//
//	destination - The key for the resulting sorted set.
//	keys        - The keys of the sorted sets to compare.
//
// Return value:
//
//	The number of members in the resulting sorted set stored at `destination`.
//
// Example:
//
//	membersScores1 := map[string]float64{"one": 1.0, "two": 2.0, "three": 3.0}
//	membersScores2 := map[string]float64{"two": 2.0}
//	zAddResult1, err := client.ZAdd("key1", membersScores1)
//	zAddResult2, err := client.ZAdd("key2", membersScores2)
//	zDiffStoreResult, err := client.ZDiffStore("key4", []string{"key1", "key2"})
//	fmt.Println(zDiffStoreResult) // Output: 2
//
// [valkey.io]: https://valkey.io/commands/zdiffstore/
func (client *baseClient) ZDiffStore(destination string, keys []string) (int64, error) {
	result, err := client.executeCommand(
		C.ZDiffStore,
		append([]string{destination, strconv.Itoa(len(keys))}, keys...),
	)
	if err != nil {
		return defaultIntResponse, err
	}
	return handleIntResponse(result)
}
