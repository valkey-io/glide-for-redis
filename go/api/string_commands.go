// Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

package api

// Supports commands and transactions for the "String" group of commands for standalone and cluster clients.
//
// See [valkey.io] for details.
//
// [valkey.io]: https://valkey.io/commands/#string
type StringCommands interface {
	// Set the given key with the given value. The return value is a response from Valkey containing the string "OK".
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key   - The key to store.
	//  value - The value to store with the given key.
	//
	// Return value:
	//  `"OK"` response on success.
	//
	// For example:
	//	result, err := client.Set("key", "value")
	//  result: "OK"
	//
	// [valkey.io]: https://valkey.io/commands/set/
	Set(key string, value string) (string, error)

	// SetWithOptions sets the given key with the given value using the given options. The return value is dependent on the
	// passed options. If the value is successfully set, "OK" is returned. If value isn't set because of [OnlyIfExists] or
	// [OnlyIfDoesNotExist] conditions, api.CreateNilStringResult() is returned. If [SetOptions#ReturnOldValue] is
	// set, the old value is returned.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key     - The key to store.
	//  value   - The value to store with the given key.
	//  options - The [api.SetOptions].
	//
	// Return value:
	//  If the value is successfully set, return api.Result[string] containing "OK".
	//  If value isn't set because of ConditionalSet.OnlyIfExists or ConditionalSet.OnlyIfDoesNotExist conditions, return
	//  api.CreateNilStringResult().
	//  If SetOptions.returnOldValue is set, return the old value as a String.
	//
	// For example:
	//  key: initialValue
	//  result, err := client.SetWithOptions("key", "value", api.NewSetOptionsBuilder()
	//			.SetExpiry(api.NewExpiryBuilder()
	//			.SetType(api.Seconds)
	//			.SetCount(uint64(5)
	//		))
	//  result.Value(): "OK"
	//  result.IsNil(): false
	//
	// [valkey.io]: https://valkey.io/commands/set/
	SetWithOptions(key string, value string, options *SetOptions) (Result[string], error)

	// Get string value associated with the given key, or api.CreateNilStringResult() is returned if no such value
	// exists.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key - The key to be retrieved from the database.
	//
	// Return value:
	//  If key exists, returns the value of key as a String. Otherwise, return [api.CreateNilStringResult()].
	//
	// For example:
	//  1. key: value
	//	   result, err := client.Get("key")
	//     result.Value(): "value"
	//     result.IsNil(): false
	//  2. result, err := client.Get("nonExistentKey")
	//     result.Value(): ""
	//     result.IsNil(): true
	//
	// [valkey.io]: https://valkey.io/commands/get/
	Get(key string) (Result[string], error)

	// Get string value associated with the given key, or an empty string is returned [api.CreateNilStringResult()] if no such
	// value exists.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key - The key to be retrieved from the database.
	//
	// Return value:
	//  If key exists, returns the value of key as a Result[string]. Otherwise, return [api.CreateNilStringResult()].
	//
	// For example:
	//  1. key: value
	//	   result, err := client.GetEx("key")
	//     result.Value(): "value"
	//     result.IsNil(): false
	//  2. result, err := client.GetEx("nonExistentKey")
	//     result.Value(): ""
	//     result.IsNil(): true
	//
	// [valkey.io]: https://valkey.io/commands/getex/
	GetEx(key string) (Result[string], error)

	// Get string value associated with the given key and optionally sets the expiration of the key.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key - The key to be retrieved from the database.
	//  options - The [api.GetExOptions].
	//
	// Return value:
	//  If key exists, returns the value of key as a Result[string]. Otherwise, return [api.CreateNilStringResult()].
	//
	// For example:
	//  key: initialValue
	//  result, err := client.GetExWithOptions("key", api.NewGetExOptionsBuilder()
	//			.SetExpiry(api.NewExpiryBuilder()
	//			.SetType(api.Seconds)
	//			.SetCount(uint64(5)
	//		))
	//  result.Value(): "initialValue"
	//  result.IsNil(): false
	//
	// [valkey.io]: https://valkey.io/commands/getex/
	GetExWithOptions(key string, options *GetExOptions) (Result[string], error)

	// Sets multiple keys to multiple values in a single operation.
	//
	// Note:
	//  In cluster mode, if keys in `keyValueMap` map to different hash slots, the command
	//  will be split across these slots and executed separately for each. This means the command
	//  is atomic only at the slot level. If one or more slot-specific requests fail, the entire
	//  call will return the first encountered error, even though some requests may have succeeded
	//  while others did not. If this behavior impacts your application logic, consider splitting
	//  the request into sub-requests per slot to ensure atomicity.
	//
	// Parameters:
	//  keyValueMap - A key-value map consisting of keys and their respective values to set.
	//
	// Return value:
	//  `"OK"` on success.
	//
	// For example:
	//	result, err := client.MSet(map[string]string{"key1": "value1", "key2": "value2"})
	//  result: "OK"
	//
	// [valkey.io]: https://valkey.io/commands/mset/
	MSet(keyValueMap map[string]string) (string, error)

	// Retrieves the values of multiple keys.
	//
	// Note:
	//  In cluster mode, if keys in `keys` map to different hash slots, the command
	//  will be split across these slots and executed separately for each. This means the command
	//  is atomic only at the slot level. If one or more slot-specific requests fail, the entire
	//  call will return the first encountered error, even though some requests may have succeeded
	//  while others did not. If this behavior impacts your application logic, consider splitting
	//  the request into sub-requests per slot to ensure atomicity.
	//
	// Parameters:
	//  keys - A list of keys to retrieve values for.
	//
	// Return value:
	//  An array of values corresponding to the provided keys.
	//  If a key is not found, its corresponding value in the list will be a [api.CreateNilStringResult()]
	//
	// For example:
	//  key1: value1, key2: value2
	//	result, err := client.MGet([]string{"key1", "key2", "key3"})
	//  result : {
	//             api.CreateStringResult("value1),
	//             api.CreateStringResult("value2"),
	//             api.CreateNilStringResult()
	//           }
	//
	// [valkey.io]: https://valkey.io/commands/mget/
	MGet(keys []string) ([]Result[string], error)

	// Sets multiple keys to values if the key does not exist. The operation is atomic, and if one or more keys already exist,
	// the entire operation fails.
	//
	// Note:
	//  In cluster mode, if keys in `keyValueMap` map to different hash slots, the command
	//  will be split across these slots and executed separately for each. This means the command
	//  is atomic only at the slot level. If one or more slot-specific requests fail, the entire
	//  call will return the first encountered error, even though some requests may have succeeded
	//  while others did not. If this behavior impacts your application logic, consider splitting
	//  the request into sub-requests per slot to ensure atomicity.
	//
	// Parameters:
	//  keyValueMap - A key-value map consisting of keys and their respective values to set.
	//
	// Return value:
	//  A bool containing true, if all keys were set. false, if no key was set.
	//
	// For example:
	//  1. result, err := client.MSetNX(map[string]string{"key1": "value1", "key2": "value2"})
	//     result.Value(): true
	//     result.IsNil(): false
	//  2. key3: initialValue
	//	   result, err := client.MSetNX(map[string]string{"key3": "value3", "key4": "value4"})
	//     result.Value(): false
	//     result.IsNil(): false
	//
	// [valkey.io]: https://valkey.io/commands/msetnx/
	MSetNX(keyValueMap map[string]string) (bool, error)

	// Increments the number stored at key by one. If key does not exist, it is set to 0 before performing the operation.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key - The key to increment its value.
	//
	// Return value:
	//  The value of `key` after the increment.
	//
	// For example:
	//  key: 1
	//  result, err := client.Incr("key");
	//  result: 2
	//
	// [valkey.io]: https://valkey.io/commands/incr/
	Incr(key string) (int64, error)

	// Increments the number stored at key by amount. If key does not exist, it is set to 0 before performing the operation.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key    - The key to increment its value.
	//  amount - The amount to increment.
	//
	// Return value:
	//  The value of `key` after the increment.
	//
	// For example:
	//  key: 1
	//  result, err := client.IncrBy("key", 2)
	//  result: 3
	//
	// [valkey.io]: https://valkey.io/commands/incrby/
	IncrBy(key string, amount int64) (int64, error)

	// Increments the string representing a floating point number stored at key by amount. By using a negative increment value,
	// the result is that the value stored at key is decremented. If key does not exist, it is set to `0` before performing the
	// operation.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key    - The key to increment its value.
	//  amount - The amount to increment.
	//
	// Return value:
	//  The value of key after the increment.
	//
	// For example:
	//  key: 1
	//  result, err := client.IncrBy("key", 0.5)
	//  result: 1.5
	//
	// [valkey.io]: https://valkey.io/commands/incrbyfloat/
	IncrByFloat(key string, amount float64) (float64, error)

	// Decrements the number stored at key by one. If key does not exist, it is set to 0 before performing the operation.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key - The key to decrement its value.
	//
	// Return value:
	//  The value of `key` after the decrement.
	//
	// For example:
	//  key: 1
	//  result, err := client.Decr("key")
	//  result: 0
	//
	// [valkey.io]: https://valkey.io/commands/decr/
	Decr(key string) (int64, error)

	// Decrements the number stored at code by amount. If key does not exist, it is set to 0 before performing the operation.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key    - The key to decrement its value.
	//  amount - The amount to decrement.
	//
	// Return value:
	//  The value of `key` after the decrement.
	//
	// For example:
	//  key: 1
	//  result, err := client.DecrBy("key", 2)
	//  result: -1
	//
	// [valkey.io]: https://valkey.io/commands/decrby/
	DecrBy(key string, amount int64) (int64, error)

	// Returns the length of the string value stored at key.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key - The key to check its length.
	//
	// Return value:
	//  The length of the string value stored at `key`.
	//  If key does not exist, it is treated as an empty string, and the command returns `0`.
	//
	// For example:
	//  key: value
	//  result, err := client.Strlen("key")
	//  result: 5
	//
	// [valkey.io]: https://valkey.io/commands/strlen/
	Strlen(key string) (int64, error)

	// Overwrites part of the string stored at key, starting at the specified byte's offset, for the entire length of value.
	// If the offset is larger than the current length of the string at key, the string is padded with zero bytes to make
	// offset fit.
	// Creates the key if it doesn't exist.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key    - The key of the string to update.
	//  offset - The position in the string where value should be written.
	//  value  - The string written with offset.
	//
	// Return value:
	//  The length of the string stored at `key` after it was modified.
	//
	// For example:
	//  1. result, err := client.SetRange("key", 6, "GLIDE");
	//     result: 11 (New key created with length of 11 bytes)
	//     value, err  := client.Get("key")
	//     value.Value(): "\x00\x00\x00\x00\x00\x00GLIDE"
	//  2. "key": "愛" (value char takes 3 bytes)
	//     result, err = client.SetRange("key", 1, "a")
	//     result.Value(): �a� // (becomes an invalid UTF-8 string)
	//
	// [valkey.io]: https://valkey.io/commands/setrange/
	SetRange(key string, offset int, value string) (int64, error)

	// Returns the substring of the string value stored at key, determined by the byte's offsets start and end (both are
	// inclusive).
	// Negative offsets can be used in order to provide an offset starting from the end of the string. So `-1` means the last
	// character, `-2` the penultimate and so forth.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key   - The key of the string.
	//  start - The starting offset.
	//  end   - The ending offset.
	//
	// Return value:
	//  A substring extracted from the value stored at key. Returns empty string if the offset is out of bounds.
	//
	// For example:
	//  1. mykey: "This is a string"
	//     result, err := client.GetRange("mykey", 0, 3)
	//     result: "This"
	//     result, err := client.GetRange("mykey", -3, -1)
	//     result: "ing" (extracted last 3 characters of a string)
	//  2. "key": "愛" (value char takes 3 bytes)
	//     result, err = client.GetRange("key", 0, 1)
	//     result: "�" (returns an invalid UTF-8 string)
	//
	// [valkey.io]: https://valkey.io/commands/getrange/
	GetRange(key string, start int, end int) (string, error)

	// Appends a value to a key. If key does not exist it is created and set as an empty string, so APPEND will be similar to
	// SET in this special case.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key   - The key of the string.
	//  value - The value to append.
	//
	// Return value:
	//  The length of the string after appending the value.
	//
	// For example:
	//  result, err := client.Append("key", "value")
	//  result: 5
	//
	// [valkey.io]: https://valkey.io/commands/append/
	Append(key string, value string) (int64, error)

	// Returns the longest common subsequence between strings stored at key1 and key2.
	//
	// Since:
	//  Valkey 7.0 and above.
	//
	// Note:
	//  In cluster mode, if keys in `keyValueMap` map to different hash slots, the command
	//  will be split across these slots and executed separately for each. This means the command
	//  is atomic only at the slot level. If one or more slot-specific requests fail, the entire
	//  call will return the first encountered error, even though some requests may have succeeded
	//  while others did not. If this behavior impacts your application logic, consider splitting
	//  the request into sub-requests per slot to ensure atomicity.
	//
	// Parameters:
	//  key1 - The key that stores the first string.
	//  key2 - The key that stores the second string.
	//
	// Return value:
	//  The longest common subsequence between the 2 strings.
	//  An empty string is returned if the keys do not exist or have no common subsequences.
	//
	// For example:
	//  testKey1: foo, testKey2: fao
	//  result, err := client.LCS("testKey1", "testKey2")
	//  result: "fo"
	//
	// [valkey.io]: https://valkey.io/commands/lcs/
	LCS(key1 string, key2 string) (string, error)

	// GetDel gets the value associated with the given key and deletes the key.
	//
	// Parameters:
	//  key - The key to get and delete.
	//
	// Return value:
	//  If key exists, returns the value of the key as a String and deletes the key.
	//  If key does not exist, returns a [api.NilResult[string]] (api.CreateNilStringResult()).
	//
	// For example:
	//	result, err := client.GetDel("key")
	//
	//[valkey.io]: https://valkey.io/commands/getdel/
	GetDel(key string) (Result[string], error)
}
