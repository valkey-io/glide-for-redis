// Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

package api

import "github.com/valkey-io/valkey-glide/go/glide/api/options"

// Supports commands and transactions for the "Generic Commands" group for standalone and cluster clients.
//
// See [valkey.io] for details.
//
// [valkey.io]: https://valkey.io/commands/?group=Generic
type GenericBaseCommands interface {
	// Del removes the specified keys from the database. A key is ignored if it does not exist.
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
	//  keys - One or more keys to delete.
	//
	// Return value:
	//  Returns the number of keys that were removed.
	//
	// Example:
	//	result, err := client.Del([]string{"key1", "key2", "key3"})
	//	if err != nil {
	//	    // handle error
	//	}
	//	fmt.Println(result) // Output: 2
	//
	// [valkey.io]: https://valkey.io/commands/del/
	Del(keys []string) (int64, error)

	// Exists returns the number of keys that exist in the database
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
	// keys - One or more keys to check if they exist.
	//
	// Return value:
	// Returns the number of existing keys.
	//
	// Example:
	// result, err := client.Exists([]string{"key1", "key2", "key3"})
	// result: 2
	//
	// [valkey.io]: https://valkey.io/commands/exists/
	Exists(keys []string) (int64, error)

	// Expire sets a timeout on key. After the timeout has expired, the key will automatically be deleted
	//
	// If key already has an existing expire set, the time to live is updated to the new value.
	// If seconds is a non-positive number, the key will be deleted rather than expired.
	// The timeout will only be cleared by commands that delete or overwrite the contents of key
	//
	// Parameters:
	// key - The key to expire.
	// seconds - Time in seconds for the key to expire
	//
	// Return value:
	//  `true` if the timeout was set. `false` if the timeout was not set. e.g. key doesn't exist,
	//  or operation skipped due to the provided arguments.
	//
	// Example:
	// result, err := client.Expire("key", 1)
	// result: true
	//
	// [valkey.io]: https://valkey.io/commands/expire/
	Expire(key string, seconds int64) (bool, error)

	// Expire sets a timeout on key. After the timeout has expired, the key will automatically be deleted
	//
	// If key already has an existing expire set, the time to live is updated to the new value.
	// If seconds is a non-positive number, the key will be deleted rather than expired.
	// The timeout will only be cleared by commands that delete or overwrite the contents of key
	//
	// Parameters:
	// key - The key to expire.
	// seconds - Time in seconds for the key to expire
	// option - The option  to set expiry - NX, XX, GT, LT
	//
	// Return value:
	//  `true` if the timeout was set. `false` if the timeout was not set. e.g. key doesn't exist,
	//  or operation skipped due to the provided arguments.
	//
	// Example:
	// result, err := client.Expire("key", 1, api.OnlyIfDoesNotExist)
	// result: true
	//
	// [valkey.io]: https://valkey.io/commands/expire/
	ExpireWithOptions(key string, seconds int64, expireCondition ExpireCondition) (bool, error)

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
	// key - The key to expire.
	// unixTimestampInSeconds - Absolute Unix timestamp
	//
	// Return value:
	//  `true` if the timeout was set. `false` if the timeout was not set. e.g. key doesn't exist,
	//  or operation skipped due to the provided arguments.
	//
	// Example:
	// result, err := client.ExpireAt("key", time.Now().Unix())
	// result: true
	//
	// [valkey.io]: https://valkey.io/commands/expireat/
	ExpireAt(key string, unixTimestampInSeconds int64) (bool, error)

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
	// key - The key to expire.
	// unixTimestampInSeconds - Absolute Unix timestamp
	// option - The option  to set expiry - NX, XX, GT, LT
	//
	// Return value:
	//  `true` if the timeout was set. `false` if the timeout was not set. e.g. key doesn't exist,
	//  or operation skipped due to the provided arguments.
	//
	// Example:
	// result, err := client.ExpireAt("key", time.Now().Unix(), api.OnlyIfDoesNotExist)
	// result: true
	//
	// [valkey.io]: https://valkey.io/commands/expireat/
	ExpireAtWithOptions(key string, unixTimestampInSeconds int64, expireCondition ExpireCondition) (bool, error)

	// Sets a timeout on key in milliseconds. After the timeout has expired, the key will automatically be deleted.
	// If key already has an existing expire set, the time to live is updated to the new value.
	// If milliseconds is a non-positive number, the key will be deleted rather than expired
	// The timeout will only be cleared by commands that delete or overwrite the contents of key.

	// Parameters:
	// key - The key to set timeout on it.
	// milliseconds - The timeout in milliseconds.
	//
	// Return value:
	//  `true` if the timeout was set. `false` if the timeout was not set. e.g. key doesn't exist,
	//  or operation skipped due to the provided arguments.
	//
	// Example:
	// result, err := client.PExpire("key", int64(5 * 1000))
	// result: true
	//
	//  [valkey.io]: https://valkey.io/commands/pexpire/
	PExpire(key string, milliseconds int64) (bool, error)

	// Sets a timeout on key in milliseconds. After the timeout has expired, the key will automatically be deleted.
	// If key already has an existing expire set, the time to live is updated to the new value.
	// If milliseconds is a non-positive number, the key will be deleted rather than expired
	// The timeout will only be cleared by commands that delete or overwrite the contents of key.
	//
	// Parameters:
	// key - The key to set timeout on it.
	// milliseconds - The timeout in milliseconds.
	// option - The option  to set expiry - NX, XX, GT, LT
	//
	// Return value:
	//  `true` if the timeout was set. `false` if the timeout was not set. e.g. key doesn't exist,
	//  or operation skipped due to the provided arguments.
	//
	// Example:
	// result, err := client.PExpire("key", int64(5 * 1000), api.OnlyIfDoesNotExist)
	// result: true
	//
	//	[valkey.io]: https://valkey.io/commands/pexpire/
	PExpireWithOptions(key string, milliseconds int64, expireCondition ExpireCondition) (bool, error)

	// Sets a timeout on key. It takes an absolute Unix timestamp (milliseconds since
	// January 1, 1970) instead of specifying the number of milliseconds.
	// A timestamp in the past will delete the key immediately. After the timeout has
	// expired, the key will automatically be deleted
	// If key already has an existing expire set, the time to live is
	// updated to the new value/
	// The timeout will only be cleared by commands that delete or overwrite the contents of key
	//
	// Parameters:
	// key - The key to set timeout on it.
	// unixMilliseconds - The timeout in an absolute Unix timestamp.
	//
	// Return value:
	//  `true` if the timeout was set. `false` if the timeout was not set. e.g. key doesn't exist,
	//  or operation skipped due to the provided arguments.
	//
	// Example:
	// result, err := client.PExpire("key", time.Now().Unix()*1000)
	// result: true
	//
	//	[valkey.io]: https://valkey.io/commands/pexpireat/
	PExpireAt(key string, unixTimestampInMilliSeconds int64) (bool, error)

	// Sets a timeout on key. It takes an absolute Unix timestamp (milliseconds since
	// January 1, 1970) instead of specifying the number of milliseconds.
	// A timestamp in the past will delete the key immediately. After the timeout has
	// expired, the key will automatically be deleted
	// If key already has an existing expire set, the time to live is
	// updated to the new value/
	// The timeout will only be cleared by commands that delete or overwrite the contents of key
	//
	// Parameters:
	// key - The key to set timeout on it.
	// unixMilliseconds - The timeout in an absolute Unix timestamp.
	// option - The option  to set expiry - NX, XX, GT, LT
	//
	// Return value:
	//  `true` if the timeout was set. `false` if the timeout was not set. e.g. key doesn't exist,
	//  or operation skipped due to the provided arguments.
	//
	// Example:
	// result, err := client.PExpire("key", time.Now().Unix()*1000, api.OnlyIfDoesNotExist)
	// result: true
	//
	//	[valkey.io]: https://valkey.io/commands/pexpireat/
	PExpireAtWithOptions(key string, unixTimestampInMilliSeconds int64, expireCondition ExpireCondition) (bool, error)

	// Expire Time returns the absolute Unix timestamp (since January 1, 1970) at which the given key
	// will expire, in seconds.
	//
	// Parameters:
	// key - The key to determine the expiration value of.
	//
	// Return value:
	// The expiration Unix timestamp in seconds.
	// `-2` if key does not exist or `-1` is key exists but has no associated expiration.
	//
	// Example:
	//
	// result, err := client.ExpireTime("key")
	// result: 1732118030
	//
	// [valkey.io]: https://valkey.io/commands/expiretime/
	ExpireTime(key string) (int64, error)

	// PExpire Time returns the absolute Unix timestamp (since January 1, 1970) at which the given key
	// will expire, in milliseconds.
	//
	// Parameters:
	// key - The key to determine the expiration value of.
	//
	// Return value:
	// The expiration Unix timestamp in milliseconds.
	// `-2` if key does not exist or `-1` is key exists but has no associated expiration.
	//
	// Example:
	//
	// result, err := client.PExpireTime("key")
	// result: 33177117420000
	//
	// [valkey.io]: https://valkey.io/commands/pexpiretime/
	PExpireTime(key string) (int64, error)

	// TTL returns the remaining time to live of key that has a timeout, in seconds.
	//
	// Parameters:
	// key - The key to return its timeout.
	//
	// Return value:
	// Returns TTL in seconds,
	// `-2` if key does not exist, or `-1` if key exists but has no associated expiration.
	//
	// Example:
	//
	// result, err := client.TTL("key")
	// result: 3
	//
	// [valkey.io]: https://valkey.io/commands/ttl/
	TTL(key string) (int64, error)

	// PTTL returns the remaining time to live of key that has a timeout, in milliseconds.
	//
	// Parameters:
	// key - The key to return its timeout.
	//
	// Return value:
	// Returns TTL in milliseconds,
	// `-2` if key does not exist, or `-1` if key exists but has no associated expiration.
	//
	// Example:
	//
	// result, err := client.PTTL("key")
	// result: 1000
	//
	// [valkey.io]: https://valkey.io/commands/pttl/
	PTTL(key string) (int64, error)

	// Unlink (delete) multiple keys from the database. A key is ignored if it does not exist.
	// This command, similar to Del However, this command does not block the server
	//
	// Note:
	//	 In cluster mode, if keys in keys map to different hash slots, the command
	//   will be split across these slots and executed separately for each. This means the command
	//   is atomic only at the slot level. If one or more slot-specific requests fail, the entire
	//   call will return the first encountered error, even though some requests may have succeeded
	//   while others did not. If this behavior impacts your application logic, consider splitting
	//   the request into sub-requests per slot to ensure atomicity.
	//
	// Parameters:
	//  keys - One or more keys to unlink.
	//
	// Return value:
	//  Return the number of keys that were unlinked.
	//
	// Example:
	//	result, err := client.Unlink([]string{"key1", "key2", "key3"})
	//	if err != nil {
	//	    // handle error
	//	}
	//	fmt.Println(result) // Output: 3
	//
	// [valkey.io]: Https://valkey.io/commands/unlink/
	Unlink(keys []string) (int64, error)

	// Alters the last access time of a key(s). A key is ignored if it does not exist.
	//
	// Note:
	//	 In cluster mode, if keys in keys map to different hash slots, the command
	//   will be split across these slots and executed separately for each. This means the command
	//   is atomic only at the slot level. If one or more slot-specific requests fail, the entire
	//   call will return the first encountered error, even though some requests may have succeeded
	//   while others did not. If this behavior impacts your application logic, consider splitting
	//   the request into sub-requests per slot to ensure atomicity.
	//
	// Parameters:
	//  The keys to update last access time.
	//
	// Return value:
	//  The number of keys that were updated.
	//
	// Example:
	//	result, err := client.Touch([]string{"key1", "key2", "key3"})
	//	if err != nil {
	//	    // handle error
	//	}
	//	fmt.Println(result) // Output: 3
	//
	// [valkey.io]: Https://valkey.io/commands/touch/
	Touch(keys []string) (int64, error)

	// Type returns the string representation of the type of the value stored at key.
	// The different types that can be returned are: string, list, set, zset, hash and stream.
	//
	// Parameters:
	//  key - string
	//
	// Return value:
	//  If the key exists, the type of the stored value is returned. Otherwise, a "none" string is returned.
	//
	// Example:
	//	result, err := client.Type([]string{"key"})
	//	if err != nil {
	//	    // handle error
	//	}
	//	fmt.Println(result) // Output: string
	//
	// [valkey.io]: Https://valkey.io/commands/type/
	Type(key string) (string, error)

	// Renames key to new key.
	//  If new Key already exists it is overwritten.
	//
	// Note:
	//  When in cluster mode, both key and newKey must map to the same hash slot.
	//
	// Parameters:
	//  key to rename.
	//  newKey The new name of the key.
	//
	// Return value:
	// If the key was successfully renamed, return "OK". If key does not exist, an error is thrown.
	//
	// Example:
	//  result, err := client.Rename([]string{"key", "newkey"})
	//	if err != nil {
	//	    // handle error
	//	}
	//	fmt.Println(result) // Output: OK
	//
	// [valkey.io]: https://valkey.io/commands/rename/
	Rename(key string, newKey string) (string, error)

	// Renames key to newkey if newKey does not yet exist.
	//
	// Note:
	//  When in cluster mode, both key and newkey must map to the same hash slot.
	//
	// Parameters:
	//  key to rename.
	//  newKey The new name of the key.
	//
	// Return value:
	//  `true` if k`ey was renamed to `newKey`, `false` if `newKey` already exists.
	//
	// Example:
	//  result, err := client.Renamenx([]string{"key", "newkey"})
	//	if err != nil {
	//	    // handle error
	//	}
	//	fmt.Println(result) // Output: true
	//
	// [valkey.io]: https://valkey.io/commands/renamenx/
	Renamenx(key string, newKey string) (bool, error)

	// Removes the existing timeout on key, turning the key from volatile
	// (a key with an expire set) to persistent (a key that will never expire as no timeout is associated).
	//
	// Parameters:
	//  key - The key to remove the existing timeout on.
	//
	// Return value:
	//  `false` if key does not exist or does not have an associated timeout, `true` if the timeout has been removed.
	//
	// Example:
	//  result, err := client.Persist([]string{"key"})
	//	if err != nil {
	//	    // handle error
	//	}
	//	fmt.Println(result) // Output: true
	//
	// [valkey.io]: https://valkey.io/commands/persist/
	Persist(key string) (bool, error)

	// Create a key associated with a value that is obtained by
	// deserializing the provided serialized value (obtained via [valkey.io]: Https://valkey.io/commands/dump/).
	//
	// Parameters:
	//  key - The key to create.
	//	ttl - The expiry time (in milliseconds). If 0, the key will persist.
	//  value - The serialized value to deserialize and assign to key.
	//
	// Return value:
	//  Return OK if successfully create a key with a value </code>.
	//
	// Example:
	// result, err := client.Restore("key",ttl, value)
	//	if err != nil {
	//	    // handle error
	//	}
	//	fmt.Println(result.Value()) // Output: OK
	//
	// [valkey.io]: https://valkey.io/commands/restore/
	Restore(key string, ttl int64, value string) (Result[string], error)

	// Create a key associated with a value that is obtained by
	// deserializing the provided serialized value (obtained via [valkey.io]: Https://valkey.io/commands/dump/).
	//
	// Parameters:
	//  key - The key to create.
	//	ttl - The expiry time (in milliseconds). If 0, the key will persist.
	//  value - The serialized value to deserialize and assign to key.
	//  restoreOptions - Set restore options with replace and absolute TTL modifiers, object idletime and frequency
	//
	// Return value:
	//  Return OK if successfully create a key with a value.
	//
	// Example:
	// restoreOptions := api.NewRestoreOptionsBuilder().SetReplace().SetABSTTL().SetEviction(api.FREQ, 10)
	// resultRestoreOpt, err := client.RestoreWithOptions(key, ttl, value, restoreOptions)
	//	if err != nil {
	//	    // handle error
	//	}
	//	fmt.Println(result.Value()) // Output: OK
	//
	// [valkey.io]: https://valkey.io/commands/restore/
	RestoreWithOptions(key string, ttl int64, value string, option *RestoreOptions) (Result[string], error)

	// Returns the internal encoding for the Valkey object stored at key.
	//
	// Note:
	//  When in cluster mode, both key and newkey must map to the same hash slot.
	//
	// Parameters:
	//  The key of the object to get the internal encoding of.
	//
	// Return value:
	//  If key exists, returns the internal encoding of the object stored at
	//  key as a String. Otherwise, returns null.
	//
	// Example:
	// result, err := client.ObjectEncoding("mykeyRenamenx")
	//	if err != nil {
	//	    // handle error
	//	}
	//	fmt.Println(result.Value()) // Output: embstr
	//
	// [valkey.io]: https://valkey.io/commands/object-encoding/
	ObjectEncoding(key string) (Result[string], error)

	// Serialize the value stored at key in a Valkey-specific format and return it to the user.
	//
	// Parameters:
	//  The key to serialize.
	//
	// Return value:
	//  The serialized value of the data stored at key
	//  If key does not exist, null will be returned.
	//
	// Example:
	//  result, err := client.Dump([]string{"key"})
	//	if err != nil {
	//	    // handle error
	//	}
	//	fmt.Println(result.Value()) // Output: (Serialized Value)
	//
	// [valkey.io]: https://valkey.io/commands/dump/
	Dump(key string) (Result[string], error)

	ObjectFreq(key string) (Result[int64], error)

	ObjectIdleTime(key string) (Result[int64], error)

	ObjectRefCount(key string) (Result[int64], error)

	// Sorts the elements in the list, set, or sorted set at key and returns the result.
	// The sort command can be used to sort elements based on different criteria and apply
	// transformations on sorted elements.
	// To store the result into a new key, see the sortStore function.
	//
	// Parameters:
	// key - The key of the list, set, or sorted set to be sorted.
	//
	// Return value:
	// An Array of sorted elements.
	//
	// Example:
	//
	// result, err := client.Sort("key")
	// result.Value(): [{1 false} {2 false} {3 false}]
	// result.IsNil(): false
	//
	// [valkey.io]: https://valkey.io/commands/sort/
	Sort(key string) ([]Result[string], error)

	// Sorts the elements in the list, set, or sorted set at key and returns the result.
	// The sort command can be used to sort elements based on different criteria and apply
	// transformations on sorted elements.
	// To store the result into a new key, see the sortStore function.
	//
	// Note:
	//  In cluster mode, if `key` map to different hash slots, the command
	//  will be split across these slots and executed separately for each. This means the command
	//  is atomic only at the slot level. If one or more slot-specific requests fail, the entire
	//  call will return the first encountered error, even though some requests may have succeeded
	//  while others did not. If this behavior impacts your application logic, consider splitting
	//  the request into sub-requests per slot to ensure atomicity.
	//  The use of SortOptions.byPattern and SortOptions.getPatterns in cluster mode is
	//  supported since Valkey version 8.0.
	//
	// Parameters:
	// key - The key of the list, set, or sorted set to be sorted.
	// sortOptions - The SortOptions type.
	//
	// Return value:
	// An Array of sorted elements.
	//
	// Example:
	//
	// options := api.NewSortOptions().SetByPattern("weight_*").SetIsAlpha(false).AddGetPattern("object_*").AddGetPattern("#")
	// result, err := client.Sort("key", options)
	// result.Value(): [{Object_3 false} {c false} {Object_1 false} {a false} {Object_2 false} {b false}]
	// result.IsNil(): false
	//
	// [valkey.io]: https://valkey.io/commands/sort/
	SortWithOptions(key string, sortOptions *options.SortOptions) ([]Result[string], error)

	// Sorts the elements in the list, set, or sorted set at key and stores the result in
	// destination. The sort command can be used to sort elements based on
	// different criteria, apply transformations on sorted elements, and store the result in a new key.
	// The sort command can be used to sort elements based on different criteria and apply
	// transformations on sorted elements.
	// To get the sort result without storing it into a key, see the sort or sortReadOnly function.
	//
	// Note:
	//  In cluster mode, if `key` and `destination` map to different hash slots, the command
	//  will be split across these slots and executed separately for each. This means the command
	//  is atomic only at the slot level. If one or more slot-specific requests fail, the entire
	//  call will return the first encountered error, even though some requests may have succeeded
	//  while others did not. If this behavior impacts your application logic, consider splitting
	//  the request into sub-requests per slot to ensure atomicity.
	//
	// Parameters:
	// key - The key of the list, set, or sorted set to be sorted.
	// destination - The key where the sorted result will be stored.
	//
	// Return value:
	// The number of elements in the sorted key stored at destination.
	//
	// Example:
	//
	// result, err := client.SortStore("key","destkey")
	// result: 1
	//
	// [valkey.io]: https://valkey.io/commands/sort/
	SortStore(key string, destination string) (int64, error)

	// Sorts the elements in the list, set, or sorted set at key and stores the result in
	// destination. The sort command can be used to sort elements based on
	// different criteria, apply transformations on sorted elements, and store the result in a new key.
	// The sort command can be used to sort elements based on different criteria and apply
	// transformations on sorted elements.
	// To get the sort result without storing it into a key, see the sort or sortReadOnly function.
	//
	// Note:
	//  In cluster mode, if `key` and `destination` map to different hash slots, the command
	//  will be split across these slots and executed separately for each. This means the command
	//  is atomic only at the slot level. If one or more slot-specific requests fail, the entire
	//  call will return the first encountered error, even though some requests may have succeeded
	//  while others did not. If this behavior impacts your application logic, consider splitting
	//  the request into sub-requests per slot to ensure atomicity.
	//  The use of SortOptions.byPattern and SortOptions.getPatterns
	//  in cluster mode is supported since Valkey version 8.0.
	//
	// Parameters:
	// key - The key of the list, set, or sorted set to be sorted.
	// destination - The key where the sorted result will be stored.
	// sortOptions - The SortOptions type.
	//
	// Return value:
	// The number of elements in the sorted key stored at destination.
	//
	// Example:
	//
	// options := api.NewSortOptions().SetByPattern("weight_*").SetIsAlpha(false).AddGetPattern("object_*").AddGetPattern("#")
	// result, err := client.SortStore("key","destkey",options)
	// result: 1
	//
	// [valkey.io]: https://valkey.io/commands/sort/
	SortStoreWithOptions(key string, destination string, sortOptions *options.SortOptions) (int64, error)

	// Sorts the elements in the list, set, or sorted set at key and returns the result.
	// The sortReadOnly command can be used to sort elements based on different criteria and apply
	// transformations on sorted elements.
	// This command is routed depending on the client's ReadFrom strategy.
	//
	// Parameters:
	// key - The key of the list, set, or sorted set to be sorted.
	//
	// Return value:
	// An Array of sorted elements.
	//
	// Example:
	//
	// result, err := client.SortReadOnly("key")
	// result.Value(): [{1 false} {2 false} {3 false}]
	// result.IsNil(): false
	//
	// [valkey.io]: https://valkey.io/commands/sort/
	SortReadOnly(key string) ([]Result[string], error)

	// Sorts the elements in the list, set, or sorted set at key and returns the result.
	// The sort command can be used to sort elements based on different criteria and apply
	// transformations on sorted elements.
	// This command is routed depending on the client's ReadFrom strategy.
	//
	// Note:
	//  In cluster mode, if `key` map to different hash slots, the command
	//  will be split across these slots and executed separately for each. This means the command
	//  is atomic only at the slot level. If one or more slot-specific requests fail, the entire
	//  call will return the first encountered error, even though some requests may have succeeded
	//  while others did not. If this behavior impacts your application logic, consider splitting
	//  the request into sub-requests per slot to ensure atomicity.
	//  The use of SortOptions.byPattern and SortOptions.getPatterns in cluster mode is
	//  supported since Valkey version 8.0.
	//
	// Parameters:
	// key - The key of the list, set, or sorted set to be sorted.
	// sortOptions - The SortOptions type.
	//
	// Return value:
	// An Array of sorted elements.
	//
	// Example:
	//
	// options := api.NewSortOptions().SetByPattern("weight_*").SetIsAlpha(false).AddGetPattern("object_*").AddGetPattern("#")
	// result, err := client.SortReadOnly("key", options)
	// result.Value(): [{Object_3 false} {c false} {Object_1 false} {a false} {Object_2 false} {b false}]
	// result.IsNil(): false
	//
	// [valkey.io]: https://valkey.io/commands/sort/
	SortReadOnlyWithOptions(key string, sortOptions *options.SortOptions) ([]Result[string], error)

	Wait(numberOfReplicas int64, timeout int64) (int64, error)
}
