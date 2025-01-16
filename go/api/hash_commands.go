// Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

package api

import "github.com/valkey-io/valkey-glide/go/glide/api/options"

// Supports commands and transactions for the "Hash" group of commands for standalone and cluster clients.
//
// See [valkey.io] for details.
//
// [valkey.io]: https://valkey.io/commands/#hash
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
	//  The number of fields that were added or updated.
	//
	// For example:
	//  num, err := client.HSet("my_hash", map[string]string{"field": "value", "field2": "value2"})
	//  // num: 2
	//
	// [valkey.io]: https://valkey.io/commands/hset/
	HSet(key string, values map[string]string) (int64, error)

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
	//  A bool containing true if field is a new field in the hash and value was set.
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
	HSetNX(key string, field string, value string) (bool, error)

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
	// The number of fields that were removed from the hash, not including specified but non-existing fields.
	//
	// For example:
	//  num, err := client.HDel("my_hash", []string{"field_1", "field_2"})
	//  // num: 2
	//
	// [valkey.io]: https://valkey.io/commands/hdel/
	HDel(key string, fields []string) (int64, error)

	// HLen returns the number of fields contained in the hash stored at key.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key - The key of the hash.
	//
	// Return value:
	//  The number of fields in the hash, or `0` when key does not exist.
	//  If key holds a value that is not a hash, an error is returned.
	//
	// For example:
	//  num1, err := client.HLen("myHash")
	//  // num: 3
	//  num2, err := client.HLen("nonExistingKey")
	//  // num: 0
	//
	// [valkey.io]: https://valkey.io/commands/hlen/
	HLen(key string) (int64, error)

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
	//  A bool containing true if the hash contains the specified field.
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
	HExists(key string, field string) (bool, error)

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
	//  The length of the string value associated with field, or `0` when field or key do not exist.
	//
	// For example:
	//  strlen, err := client.HStrLen("my_hash", "my_field")
	//  // strlen.Value(): 10
	//  // strlen.IsNil(): false
	//
	// [valkey.io]: https://valkey.io/commands/hstrlen/
	HStrLen(key string, field string) (int64, error)

	// Increments the number stored at `field` in the hash stored at `key` by increment.
	// By using a negative increment value, the value stored at `field` in the hash stored at `key` is decremented.
	// If `field` or `key` does not exist, it is set to 0 before performing the operation.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	// 	key - The key of the hash.
	// 	field - The field in the hash stored at `key` to increment its value.
	// 	increment - The amount to increment.
	//
	// Return value:
	// 	The value of `field` in the hash stored at `key` after the increment.
	//
	// Example:
	//  _, err := client.HSet("key", map[string]string{"field": "10"})
	//  hincrByResult, err := client.HIncrBy("key", "field", 1)
	//	// hincrByResult: 11
	//
	// [valkey.io]: https://valkey.io/commands/hincrby/
	HIncrBy(key string, field string, increment int64) (int64, error)

	// Increments the string representing a floating point number stored at `field` in the hash stored at `key` by increment.
	// By using a negative increment value, the value stored at `field` in the hash stored at `key` is decremented.
	// If `field` or `key` does not exist, it is set to `0` before performing the operation.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	// 	key - The key of the hash.
	// 	field - The field in the hash stored at `key` to increment its value.
	// 	increment - The amount to increment.
	//
	// Return value:
	// 	The value of `field` in the hash stored at `key` after the increment.
	//
	// Example:
	//  _, err := client.HSet("key", map[string]string{"field": "10"})
	//  hincrByFloatResult, err := client.HIncrByFloat("key", "field", 1.5)
	//	// hincrByFloatResult: 11.5
	//
	// [valkey.io]: https://valkey.io/commands/hincrbyfloat/
	HIncrByFloat(key string, field string, increment float64) (float64, error)

	// Iterates fields of Hash types and their associated values. This definition of HSCAN command does not include the
	// optional arguments of the command.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	// 	key - The key of the hash.
	// 	cursor - The cursor that points to the next iteration of results. A value of "0" indicates the start of the search.
	//
	// Return value:
	//	An array of the cursor and the subset of the hash held by `key`. The first element is always the `cursor`
	//  for the next iteration of results. The `cursor` will be `"0"` on the last iteration of the subset.
	//  The second element is always an array of the subset of the set held in `key`. The array in the
	//  second element is always a flattened series of String pairs, where the key is at even indices
	//  and the value is at odd indices.
	//
	// Example:
	//  // Assume key contains a hash {{"a": "1"}, {"b", "2"}}
	//	resCursor, resCollection, err = client.HScan(key, initialCursor)
	//  // resCursor = {0 false}
	//  // resCollection = [{a false} {1 false} {b false} {2 false}]
	//
	// [valkey.io]: https://valkey.io/commands/hscan/
	HScan(key string, cursor string) (Result[string], []Result[string], error)

	// Iterates fields of Hash types and their associated values. This definition of HSCAN includes optional arguments of the
	// command.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	// 	key - The key of the hash.
	// 	cursor - The cursor that points to the next iteration of results. A value of "0" indicates the start of the search.
	//  options - The [api.HashScanOptions].
	//
	// Return value:
	//  An array of the cursor and the subset of the hash held by `key`. The first element is always the `cursor`
	//  for the next iteration of results. The `cursor` will be `"0"` on the last iteration of the subset.
	//  The second element is always an array of the subset of the set held in `key`. The array in the
	//  second element is always a flattened series of String pairs, where the key is at even indices
	//  and the value is at odd indices.
	//
	// Example:
	//  // Assume key contains a hash {{"a": "1"}, {"b", "2"}}
	//	opts := options.NewHashScanOptionsBuilder().SetMatch("a")
	//	resCursor, resCollection, err = client.HScan(key, initialCursor, opts)
	//  // resCursor = {0 false}
	//  // resCollection = [{a false} {1 false}]
	//  // The resCollection only contains the hash map entry that matches with the match option provided with the command
	//  // input.
	//
	// [valkey.io]: https://valkey.io/commands/hscan/
	HScanWithOptions(key string, cursor string, options *options.HashScanOptions) (Result[string], []Result[string], error)
}
