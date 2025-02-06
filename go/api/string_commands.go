// Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

package api

// Supports commands and transactions for the "String" group of commands for standalone and cluster clients.
//
// See [valkey.io] for details.
//
// [valkey.io]: https://valkey.io/commands/#string
type StringCommands interface {
	Set(key string, value string) (string, error)

	SetWithOptions(key string, value string, options *SetOptions) (Result[string], error)

	Get(key string) (Result[string], error)

	GetEx(key string) (Result[string], error)

	GetExWithOptions(key string, options *GetExOptions) (Result[string], error)

	MSet(keyValueMap map[string]string) (string, error)

	MGet(keys []string) ([]Result[string], error)

	MSetNX(keyValueMap map[string]string) (bool, error)

	Incr(key string) (int64, error)

	IncrBy(key string, amount int64) (int64, error)

	IncrByFloat(key string, amount float64) (float64, error)

	Decr(key string) (int64, error)

	DecrBy(key string, amount int64) (int64, error)

	Strlen(key string) (int64, error)

	SetRange(key string, offset int, value string) (int64, error)

	GetRange(key string, start int, end int) (string, error)

	Append(key string, value string) (int64, error)

	LCS(key1 string, key2 string) (string, error)

	GetDel(key string) (Result[string], error)
}
