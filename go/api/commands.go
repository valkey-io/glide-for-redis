// Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

package api

// StringCommands defines an interface for the "String Commands" group of commands for standalone and cluster clients.
//
// See [valkey.io] for details.
//
// [valkey.io]: https://valkey.io/commands/?group=string
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
	//  A api.Result[string] containing "OK" response on success.
	//
	// For example:
	//	result, err := client.Set("key", "value")
	//  result.Value() : "OK"
	//  result.IsNil() : false
	//
	// [valkey.io]: https://valkey.io/commands/set/
	Set(key string, value string) (Result[string], error)

	// SetWithOptions sets the given key with the given value using the given options. The return value is dependent on the
	// passed options. If the value is successfully set, "OK" is returned. If value isn't set because of [OnlyIfExists] or
	// [OnlyIfDoesNotExist] conditions, api.CreateNilStringResult() is returned. If [SetOptions#ReturnOldValue] is
	// set, the old
	// value is returned.
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
	//  A Result[string] containing "OK" on success.
	//
	// For example:
	//	result, err := client.MSet(map[string]string{"key1": "value1", "key2": "value2"})
	//  result.Value(): "OK"
	//  result.IsNil(): false
	//
	// [valkey.io]: https://valkey.io/commands/mset/
	MSet(keyValueMap map[string]string) (Result[string], error)

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
	//  When in cluster mode, all keys in keyValueMap must map to the same hash slot.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  keyValueMap - A key-value map consisting of keys and their respective values to set.
	//
	// Return value:
	//  A Result[bool] containing true, if all keys were set. false, if no key was set.
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
	MSetNX(keyValueMap map[string]string) (Result[bool], error)

	// Increments the number stored at key by one. If key does not exist, it is set to 0 before performing the operation.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key - The key to increment its value.
	//
	// Return value:
	//  The Result[int64] of key after the increment.
	//
	// For example:
	//  key: 1
	//  result, err := client.Incr("key");
	//  result.Value(): 2
	//  result.IsNil(): false
	//
	// [valkey.io]: https://valkey.io/commands/incr/
	Incr(key string) (Result[int64], error)

	// Increments the number stored at key by amount. If key does not exist, it is set to 0 before performing the operation.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key    - The key to increment its value.
	//  amount - The amount to increment.
	//
	// Return value:
	//  The Result[int64] of key after the increment.
	//
	// For example:
	//  key: 1
	//  result, err := client.IncrBy("key", 2)
	//  result.Value(): 3
	//  result.IsNil(): false
	//
	// [valkey.io]: https://valkey.io/commands/incrby/
	IncrBy(key string, amount int64) (Result[int64], error)

	// Increments the string representing a floating point number stored at key by amount. By using a negative increment value,
	// the result is that the value stored at key is decremented. If key does not exist, it is set to 0 before performing the
	// operation.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key    - The key to increment its value.
	//  amount - The amount to increment.
	//
	// Return value:
	//  The Result[float64] of key after the increment.
	//
	// For example:
	//  key: 1
	//  result, err := client.IncrBy("key", 0.5)
	//  result.Value(): 1.5
	//  result.IsNil(): false
	//
	// [valkey.io]: https://valkey.io/commands/incrbyfloat/
	IncrByFloat(key string, amount float64) (Result[float64], error)

	// Decrements the number stored at key by one. If key does not exist, it is set to 0 before performing the operation.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key - The key to decrement its value.
	//
	// Return value:
	//  The Result[int64] of key after the decrement.
	//
	// For example:
	//  key: 1
	//  result, err := client.Decr("key")
	//  result.Value(): 0
	//  result.IsNil(): false
	//
	// [valkey.io]: https://valkey.io/commands/decr/
	Decr(key string) (Result[int64], error)

	// Decrements the number stored at code by amount. If key does not exist, it is set to 0 before performing the operation.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key    - The key to decrement its value.
	//  amount - The amount to decrement.
	//
	// Return value:
	//  The Result[int64] of key after the decrement.
	//
	// For example:
	//  key: 1
	//  result, err := client.DecrBy("key", 2)
	//  result.Value(): -1
	//  result.IsNil(): false
	//
	// [valkey.io]: https://valkey.io/commands/decrby/
	DecrBy(key string, amount int64) (Result[int64], error)

	// Returns the length of the string value stored at key.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key - The key to check its length.
	//
	// Return value:
	//  The length of the string value stored at key as Result[int64].
	//  If key does not exist, it is treated as an empty string, and the command returns Result[int64] containing 0 .
	//
	// For example:
	//  key: value
	//  result, err := client.Strlen("key")
	//  result.Value(): 5
	//  result.IsNil(): false
	//
	// [valkey.io]: https://valkey.io/commands/strlen/
	Strlen(key string) (Result[int64], error)

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
	//  The length of the string stored at key after it was modified as Result[int64].
	//
	// For example:
	//  1. result, err := client.SetRange("key", 6, "GLIDE");
	//     result.Value(): 11 (New key created with length of 11 bytes)
	//     result.IsNil(): false
	//     value, err  := client.Get("key")
	//     value.Value(): "\x00\x00\x00\x00\x00\x00GLIDE"
	//  2. "key": "愛" (value char takes 3 bytes)
	//     result, err = client.SetRange("key", 1, "a")
	//     result.Value(): �a� // (becomes an invalid UTF-8 string)
	//
	// [valkey.io]: https://valkey.io/commands/setrange/
	SetRange(key string, offset int, value string) (Result[int64], error)

	// Returns the substring of the string value stored at key, determined by the byte's offsets start and end (both are
	// inclusive).
	// Negative offsets can be used in order to provide an offset starting from the end of the string. So -1 means the last
	// character, -2 the penultimate and so forth.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key   - The key of the string.
	//  start - The starting offset.
	//  end   - The ending offset.
	//
	// Return value:
	//  A Result[string] containing substring extracted from the value stored at key.
	//  A [api.NilResult[string]] (api.CreateNilStringResult()) is returned if the offset is out of bounds.
	//
	// For example:
	//  1. mykey: "This is a string"
	//     result, err := client.GetRange("mykey", 0, 3)
	//     result.Value(): "This"
	//     result.IsNil(): false
	//     result, err := client.GetRange("mykey", -3, -1)
	//     result.Value(): "ing" (extracted last 3 characters of a string)
	//     result.IsNil(): false
	//  2. "key": "愛" (value char takes 3 bytes)
	//     result, err = client.GetRange("key", 0, 1)
	//     result.Value(): "�" (returns an invalid UTF-8 string)
	//     result.IsNil(): false
	//
	// [valkey.io]: https://valkey.io/commands/getrange/
	GetRange(key string, start int, end int) (Result[string], error)

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
	//  The Result[int64] containing the length of the string after appending the value.
	//
	// For example:
	//  result, err := client.Append("key", "value")
	//  result.Value(): 5
	//  result.IsNil(): false
	//
	// [valkey.io]: https://valkey.io/commands/append/
	Append(key string, value string) (Result[int64], error)

	// Returns the longest common subsequence between strings stored at key1 and key2.
	//
	// Since:
	//  Valkey 7.0 and above.
	//
	// Note:
	//  When in cluster mode, key1 and key2 must map to the same hash slot.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key1 - The key that stores the first string.
	//  key2 - The key that stores the second string.
	//
	// Return value:
	//  A Result[string] containing the longest common subsequence between the 2 strings.
	//  A Result[string] containing empty String is returned if the keys do not exist or have no common subsequences.
	//
	// For example:
	//  testKey1: foo, testKey2: fao
	//  result, err := client.LCS("testKey1", "testKey2")
	//  result.Value(): "fo"
	//  result.IsNil(): false
	//
	// [valkey.io]: https://valkey.io/commands/lcs/
	LCS(key1 string, key2 string) (Result[string], error)
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

// HashCommands supports commands and transactions for the "Hash Commands" group for standalone and cluster
// clients.
//
// See [valkey.io] for details.
//
// [valkey.io]: https://valkey.io/commands/?group=hash
type HashCommands interface {
	// HGet returns the value associated with field in the hash stored at key.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key   - The key of the hash.
	//  field - The field in the hash stored at key to retrieve from the database.
	//
	// Return value:
	// The Result[string] associated with field, or [api.NilResult[string]](api.CreateNilStringResult()) when field is not
	// present in the hash or key does not exist.
	//
	// For example:
	//  Assume we have the following hash:
	//  my_hash := map[string]string{"field1": "value", "field2": "another_value"}
	//  payload, err := client.HGet("my_hash", "field1")
	//  // payload.Value(): "value"
	//  // payload.IsNil(): false
	//  payload, err = client.HGet("my_hash", "nonexistent_field")
	//  // payload equals api.CreateNilStringResult()
	//
	// [valkey.io]: https://valkey.io/commands/hget/
	HGet(key string, field string) (Result[string], error)

	// HGetAll returns all fields and values of the hash stored at key.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key - The key of the hash.
	//
	// Return value:
	//  A map of all fields and their values as Result[string] in the hash, or an empty map when key does not exist.
	//
	// For example:
	//  fieldValueMap, err := client.HGetAll("my_hash")
	//  // field1 equals api.CreateStringResult("field1")
	//  // value1 equals api.CreateStringResult("value1")
	//  // field2 equals api.CreateStringResult("field2")
	//  // value2 equals api.CreateStringResult("value2")
	//  // fieldValueMap equals map[api.Result[string]]api.Result[string]{field1: value1, field2: value2}
	//
	// [valkey.io]: https://valkey.io/commands/hgetall/
	HGetAll(key string) (map[Result[string]]Result[string], error)

	// HMGet returns the values associated with the specified fields in the hash stored at key.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key    - The key of the hash.
	//  fields - The fields in the hash stored at key to retrieve from the database.
	//
	// Return value:
	//  An array of Result[string]s associated with the given fields, in the same order as they are requested.
	// For every field that does not exist in the hash, a [api.NilResult[string]](api.CreateNilStringResult()) is
	// returned.
	//  If key does not exist, returns an empty string array.
	//
	// For example:
	//  values, err := client.HMGet("my_hash", []string{"field1", "field2"})
	//  // value1 equals api.CreateStringResult("value1")
	//  // value2 equals api.CreateStringResult("value2")
	//  // values equals []api.Result[string]{value1, value2}
	//
	// [valkey.io]: https://valkey.io/commands/hmget/
	HMGet(key string, fields []string) ([]Result[string], error)

	// HSet sets the specified fields to their respective values in the hash stored at key.
	// This command overwrites the values of specified fields that exist in the hash.
	// If key doesn't exist, a new key holding a hash is created.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key    - The key of the hash.
	//  values - A map of field-value pairs to set in the hash.
	//
	// Return value:
	//  The Result[int64] containing number of fields that were added or updated.
	//
	// For example:
	//  num, err := client.HSet("my_hash", map[string]string{"field": "value", "field2": "value2"})
	//  // num.Value(): 2
	//  // num.IsNil(): false
	//
	// [valkey.io]: https://valkey.io/commands/hset/
	HSet(key string, values map[string]string) (Result[int64], error)

	// HSetNX sets field in the hash stored at key to value, only if field does not yet exist.
	// If key does not exist, a new key holding a hash is created.
	// If field already exists, this operation has no effect.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key   - The key of the hash.
	//  field - The field to set.
	//  value - The value to set.
	//
	// Return value:
	//  A Result[bool] containing true if field is a new field in the hash and value was set.
	//  false if field already exists in the hash and no operation was performed.
	//
	// For example:
	//  payload1, err := client.HSetNX("myHash", "field", "value")
	//  // payload1.Value(): true
	//  // payload1.IsNil(): false
	//  payload2, err := client.HSetNX("myHash", "field", "newValue")
	//  // payload2.Value(): false
	//  // payload2.IsNil(): false
	//
	// [valkey.io]: https://valkey.io/commands/hsetnx/
	HSetNX(key string, field string, value string) (Result[bool], error)

	// HDel removes the specified fields from the hash stored at key.
	// Specified fields that do not exist within this hash are ignored.
	// If key does not exist, it is treated as an empty hash and this command returns 0.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key    - The key of the hash.
	//  fields - The fields to remove from the hash stored at key.
	//
	// Return value:
	// The Result[int64] containing number of fields that were removed from the hash, not including specified but non-existing
	// fields.
	//
	// For example:
	//  num, err := client.HDel("my_hash", []string{"field_1", "field_2"})
	//  // num.Value(): 2
	//  // num.IsNil(): false
	//
	// [valkey.io]: https://valkey.io/commands/hdel/
	HDel(key string, fields []string) (Result[int64], error)

	// HLen returns the number of fields contained in the hash stored at key.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key - The key of the hash.
	//
	// Return value:
	//  The Result[int64] containing number of fields in the hash, or 0 when key does not exist.
	//  If key holds a value that is not a hash, an error is returned.
	//
	// For example:
	//  num1, err := client.HLen("myHash")
	//  // num.Value(): 3
	//  // num.IsNil(): false
	//  num2, err := client.HLen("nonExistingKey")
	//  // num.Value(): 0
	//  // num.IsNil(): false
	//
	// [valkey.io]: https://valkey.io/commands/hlen/
	HLen(key string) (Result[int64], error)

	// HVals returns all values in the hash stored at key.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key - The key of the hash.
	//
	// Return value:
	//  A slice of Result[string]s containing all the values in the hash, or an empty slice when key does not exist.
	//
	// For example:
	//  values, err := client.HVals("myHash")
	//  // value1 equals api.CreateStringResult("value1")
	//  // value2 equals api.CreateStringResult("value2")
	//  // value3 equals api.CreateStringResult("value3")
	//  // values equals []api.Result[string]{value1, value2, value3}
	//
	// [valkey.io]: https://valkey.io/commands/hvals/
	HVals(key string) ([]Result[string], error)

	// HExists returns if field is an existing field in the hash stored at key.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key   - The key of the hash.
	//  field - The field to check in the hash stored at key.
	//
	// Return value:
	//  A Result[bool] containing true if the hash contains the specified field.
	//  false if the hash does not contain the field, or if the key does not exist.
	//
	// For example:
	//  exists, err := client.HExists("my_hash", "field1")
	//  // exists.Value(): true
	//  // exists.IsNil(): false
	//  exists, err = client.HExists("my_hash", "non_existent_field")
	//  // exists.Value(): false
	//  // exists.IsNil(): false
	//
	// [valkey.io]: https://valkey.io/commands/hexists/
	HExists(key string, field string) (Result[bool], error)

	// HKeys returns all field names in the hash stored at key.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key - The key of the hash.
	//
	// Return value:
	//  A slice of Result[string]s containing all the field names in the hash, or an empty slice when key does not exist.
	//
	// For example:
	//  names, err := client.HKeys("my_hash")
	//  // field1 equals api.CreateStringResult("field_1")
	//  // field2 equals api.CreateStringResult("field_2")
	//  // names equals []api.Result[string]{field1, field2}
	//
	// [valkey.io]: https://valkey.io/commands/hkeys/
	HKeys(key string) ([]Result[string], error)

	// HStrLen returns the string length of the value associated with field in the hash stored at key.
	// If the key or the field do not exist, 0 is returned.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key   - The key of the hash.
	//  field - The field to get the string length of its value.
	//
	// Return value:
	//  The Result[int64] containing length of the string value associated with field, or 0 when field or key do not exist.
	//
	// For example:
	//  strlen, err := client.HStrLen("my_hash", "my_field")
	//  // strlen.Value(): 10
	//  // strlen.IsNil(): false
	//
	// [valkey.io]: https://valkey.io/commands/hstrlen/
	HStrLen(key string, field string) (Result[int64], error)
}

// ConnectionManagementCommands defines an interface for connection management-related commands.
//
// See [valkey.io] for details.
type ConnectionManagementCommands interface {
	// Pings the server.
	//
	// If no argument is provided, returns "PONG". If a message is provided, returns the message.
	//
	// Return value:
	//  If no argument is provided, returns "PONG".
	//  If an argument is provided, returns the argument.
	//
	// For example:
	//  result, err := client.Ping("Hello")
	//
	// [valkey.io]: https://valkey.io/commands/ping/
	Ping() (string, error)

	// Pings the server with a custom message.
	//
	// If a message is provided, returns the message.
	// If no argument is provided, returns "PONG".
	//
	// Return value:
	//  If no argument is provided, returns "PONG".
	//  If an argument is provided, returns the argument.
	//
	// For example:
	//  result, err := client.PingWithMessage("Hello")
	//
	// [valkey.io]: https://valkey.io/commands/ping/
	PingWithMessage(message string) (string, error)

	// UpdateConnectionPassword updates the connection password and optionally re-authenticates.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  password - The new password to update, or null to remove the password.
	//  reAuth - If true, re-authenticates the connection with the new password.
	//
	// Return value:
	//  A Result containing the operation status, or an error if the password replacement fails.
	//
	// For example:
	//  result, err := client.UpdateConnectionPassword("newpass123", true)
	//  // result equals api.CreateStringResult("OK")
	//
	// [valkey.io]: https://valkey.io/commands/auth/
	UpdateConnectionPassword(password *string, reAuth bool) (Result[string], error)
}

// ServerManagementClusterCommands supports commands and transactions for the "Server Management Commands" group for
// a cluster client.
//
// See [valkey.io] for details.
//
// [valkey.io]: https://valkey.io/commands/?group=server
type ServerManagementClusterCommands interface {
	// ConfigGet retrieves the values of configuration parameters.
	// The command will be sent to a random node.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//   parameters - An array of configuration parameter names to retrieve values for
	//
	// Returns:
	//   - map[Result[string]]Result[string]: A map of values corresponding to the configuration parameters
	//   - error: An error if the operation fails
	//
	// For example:
	//	configParams, err := client.ConfigGet([]string{"timeout", "maxmemory"})
	//	// configParams["timeout"].Value() equals "1000"
	//	// configParams["maxmemory"].Value() equals "1GB"
	//
	// [valkey.io]: https://valkey.io/commands/config-get/
	ConfigGet(args []string) (map[Result[string]]Result[string], error)

	// ConfigSet sets configuration parameters to the specified values.
	// The command will be sent to all nodes.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//   parameters - A map consisting of configuration parameters and their respective values to set
	//
	// Returns:
	//   - Result[string]: "OK" if all configurations have been successfully set
	//   - error: An error if the operation fails
	//
	// For example:
	//	resp, err := client.ConfigSet(map[string]string{
	//	    "timeout": "1000",
	//	    "maxmemory": "1GB",
	//	})
	//	// resp.Value() equals "OK"
	//
	// [valkey.io]: https://valkey.io/commands/config-set/
	ConfigSet(parameters map[string]string) (Result[string], error)

	// CustomCommand executes a custom server command with the provided arguments.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  args - A slice containing the command name and its arguments.
	//
	// Return value:
	//  An interface{} that must be type asserted to the expected return type, or an error if the command execution fails.
	//
	// For example:
	//  result, err := client.CustomCommand([]string{"MYCOMMAND", "arg1", "arg2"})
	//  // Assuming command returns a string
	//  // strResult := result.(string)
	//  // strResult equals "command response"
	//
	// [valkey.io]: https://valkey.io/commands/
	CustomCommand(args []string) (interface{}, error)
}

// ServerManagementCommands supports commands and transactions for the "Server Management" group for a
// standalone client.
//
// See [valkey.io] for details.
//
// [valkey.io]: https://valkey.io/commands/?group=server
type ServerManagementCommands interface {
	// ConfigGet retrieves the values of configuration parameters.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//   parameters - An array of configuration parameter names to retrieve values for
	//
	// Returns:
	//   - map[Result[string]]Result[string]: A map of values corresponding to the configuration parameters
	//   - error: An error if the operation fails
	//
	// For example:
	//	configParams, err := client.ConfigGet([]string{"timeout", "maxmemory"})
	//	// configParams["timeout"].Value() equals "1000"
	//	// configParams["maxmemory"].Value() equals "1GB"
	//
	// [valkey.io]: https://valkey.io/commands/config-get/
	ConfigGet(args []string) (map[Result[string]]Result[string], error)

	// ConfigSet sets configuration parameters to the specified values.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//   parameters - A map consisting of configuration parameters and their respective values to set
	//
	// Returns:
	//   - Result[string]: "OK" if all configurations have been successfully set
	//   - error: An error if the operation fails
	//
	// For example:
	//	resp, err := client.ConfigSet(map[string]string{
	//	    "timeout": "1000",
	//	    "maxmemory": "1GB",
	//	})
	//	// resp.Value() equals "OK"
	//
	// [valkey.io]: https://valkey.io/commands/config-set/
	ConfigSet(parameters map[string]string) (Result[string], error)
}

// GenericClusterCommands supports generic commands for cluster mode.
//
// See [valkey.io] for details.
//
// [valkey.io]: https://valkey.io/commands/?group=generic
type GenericClusterCommands interface {
	// CustomCommand executes a single command without checking inputs. Every part of the command, including subcommands,
	// should be added as a separate value in args. The command will be routed automatically based on the passed
	// command's default request policy.
	//
	// See [wiki] for details.
	//
	// Parameters:
	//   args - Arguments for the custom command including the command name. For example: ["ping"]
	//
	// Returns:
	//   - interface{}: The returned value for the custom command. For example: "PONG" for ping command
	//   - error: An error if the operation fails
	//
	// For example:
	//	resp, err := client.CustomCommand([]string{"ping"})
	//	// If successful:
	//	// resp equals "PONG"
	//	// err equals nil
	//
	// [wiki]: https://github.com/valkey-io/valkey-glide/wiki/General-Concepts#custom-command
	CustomCommand(args []string) (interface{}, error)
}

// GenericCommands supports generic commands and transactions for standalone mode.
//
// See [valkey.io] for details.
//
// [valkey.io]: https://valkey.io/commands/?group=generic
type GenericCommands interface {
	// CustomCommand executes a single command without checking inputs. Every part of the command,
	// including subcommands, should be added as a separate value in args.
	//
	// See [wiki] for details.
	//
	// Parameters:
	//   args - Arguments for the custom command
	//
	// Returns:
	//   - interface{}: The returned value for the custom command
	//   - error: An error if the operation fails
	//
	// For example:
	//	// Simple ping command
	//	resp, err := client.CustomCommand([]string{"ping", "GLIDE"})
	//	// resp equals "GLIDE"
	//
	//	// Get a list of all pub/sub clients
	//	result, err := client.CustomCommand([]string{"CLIENT", "LIST", "TYPE", "PUBSUB"})
	//
	// [wiki]: https://github.com/valkey-io/valkey-glide/wiki/General-Concepts#custom-command
	CustomCommand(args []string) (interface{}, error)
}
