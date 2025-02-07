// Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

package api

import "github.com/valkey-io/valkey-glide/go/api/options"

// Supports commands and transactions for the "Generic Commands" group for standalone and cluster clients.
//
// See [valkey.io] for details.
//
// [valkey.io]: https://valkey.io/commands/?group=Generic
type GenericBaseCommands interface {
	Del(keys []string) (int64, error)

	Exists(keys []string) (int64, error)

	Expire(key string, seconds int64) (bool, error)

	ExpireWithOptions(key string, seconds int64, expireCondition ExpireCondition) (bool, error)

	ExpireAt(key string, unixTimestampInSeconds int64) (bool, error)

	ExpireAtWithOptions(key string, unixTimestampInSeconds int64, expireCondition ExpireCondition) (bool, error)

	PExpire(key string, milliseconds int64) (bool, error)

	PExpireWithOptions(key string, milliseconds int64, expireCondition ExpireCondition) (bool, error)

	PExpireAt(key string, unixTimestampInMilliSeconds int64) (bool, error)

	PExpireAtWithOptions(key string, unixTimestampInMilliSeconds int64, expireCondition ExpireCondition) (bool, error)

	ExpireTime(key string) (int64, error)

	PExpireTime(key string) (int64, error)

	TTL(key string) (int64, error)

	PTTL(key string) (int64, error)

	Unlink(keys []string) (int64, error)

	Touch(keys []string) (int64, error)

	Type(key string) (string, error)

	Rename(key string, newKey string) (string, error)

	Renamenx(key string, newKey string) (bool, error)

	Persist(key string) (bool, error)

	Restore(key string, ttl int64, value string) (Result[string], error)

	RestoreWithOptions(key string, ttl int64, value string, option *RestoreOptions) (Result[string], error)

	ObjectEncoding(key string) (Result[string], error)

	Dump(key string) (Result[string], error)

	ObjectFreq(key string) (Result[int64], error)

	ObjectIdleTime(key string) (Result[int64], error)

	ObjectRefCount(key string) (Result[int64], error)

	Sort(key string) ([]Result[string], error)

	SortWithOptions(key string, sortOptions *options.SortOptions) ([]Result[string], error)

	SortStore(key string, destination string) (int64, error)

	SortStoreWithOptions(key string, destination string, sortOptions *options.SortOptions) (int64, error)

	SortReadOnly(key string) ([]Result[string], error)

	SortReadOnlyWithOptions(key string, sortOptions *options.SortOptions) ([]Result[string], error)

	Wait(numberOfReplicas int64, timeout int64) (int64, error)

	Copy(source string, destination string) (bool, error)

	CopyWithOptions(source string, destination string, option *CopyOptions) (bool, error)
}
