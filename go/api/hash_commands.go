// Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

package api

import "github.com/valkey-io/valkey-glide/go/glide/api/options"

// Supports commands and transactions for the "Hash" group of commands for standalone and cluster clients.
//
// See [valkey.io] for details.
//
// [valkey.io]: https://valkey.io/commands/#hash
type HashCommands interface {
	HGet(key string, field string) (Result[string], error)

	HGetAll(key string) (map[string]string, error)

	HMGet(key string, fields []string) ([]Result[string], error)

	HSet(key string, values map[string]string) (int64, error)

	HSetNX(key string, field string, value string) (bool, error)

	HDel(key string, fields []string) (int64, error)

	HLen(key string) (int64, error)

	HVals(key string) ([]string, error)

	HExists(key string, field string) (bool, error)

	HKeys(key string) ([]string, error)

	HStrLen(key string, field string) (int64, error)

	HIncrBy(key string, field string, increment int64) (int64, error)

	HIncrByFloat(key string, field string, increment float64) (float64, error)

	HScan(key string, cursor string) (string, []string, error)

	HRandField(key string) (Result[string], error)

	HRandFieldWithCount(key string, count int64) ([]string, error)

	HRandFieldWithCountWithValues(key string, count int64) ([][]string, error)

	HScanWithOptions(key string, cursor string, options *options.HashScanOptions) (string, []string, error)
}
