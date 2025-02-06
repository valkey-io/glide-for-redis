// Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

package api

// Supports commands and transactions for the "List" group of commands for standalone and cluster clients.
//
// See [valkey.io] for details.
//
// [valkey.io]: https://valkey.io/commands/#list
type ListCommands interface {
	LPush(key string, elements []string) (int64, error)

	LPop(key string) (Result[string], error)

	LPopCount(key string, count int64) ([]string, error)

	LPos(key string, element string) (Result[int64], error)

	LPosWithOptions(key string, element string, options *LPosOptions) (Result[int64], error)

	LPosCount(key string, element string, count int64) ([]int64, error)

	LPosCountWithOptions(key string, element string, count int64, options *LPosOptions) ([]int64, error)

	RPush(key string, elements []string) (int64, error)

	LRange(key string, start int64, end int64) ([]string, error)

	LIndex(key string, index int64) (Result[string], error)

	LTrim(key string, start int64, end int64) (string, error)

	LLen(key string) (int64, error)

	LRem(key string, count int64, element string) (int64, error)

	RPop(key string) (Result[string], error)

	RPopCount(key string, count int64) ([]string, error)

	LInsert(key string, insertPosition InsertPosition, pivot string, element string) (int64, error)

	BLPop(keys []string, timeoutSecs float64) ([]string, error)

	BRPop(keys []string, timeoutSecs float64) ([]string, error)

	RPushX(key string, elements []string) (int64, error)

	LPushX(key string, elements []string) (int64, error)

	LMPop(keys []string, listDirection ListDirection) (map[string][]string, error)

	LMPopCount(keys []string, listDirection ListDirection, count int64) (map[string][]string, error)

	BLMPop(keys []string, listDirection ListDirection, timeoutSecs float64) (map[string][]string, error)

	BLMPopCount(
		keys []string,
		listDirection ListDirection,
		count int64,
		timeoutSecs float64,
	) (map[string][]string, error)

	LSet(key string, index int64, element string) (string, error)

	LMove(source string, destination string, whereFrom ListDirection, whereTo ListDirection) (Result[string], error)

	BLMove(
		source string,
		destination string,
		whereFrom ListDirection,
		whereTo ListDirection,
		timeoutSecs float64,
	) (Result[string], error)
}
