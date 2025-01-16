// Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

package api

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
	//  If the key exists, the type of the stored value is returned. Otherwise, a none" string is returned.
	//
	// Example:
	//	result, err := client.Type([]string{"key"})
	//	if err != nil {
	//	    // handle error
	//	}
	//	fmt.Println(result.Value()) // Output: string
	//
	// [valkey.io]: Https://valkey.io/commands/type/
	Type(key string) (Result[string], error)

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
	//	fmt.Println(result.Value()) // Output: OK
	//
	// [valkey.io]: https://valkey.io/commands/rename/
	Rename(key string, newKey string) (Result[string], error)

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
}
