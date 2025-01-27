// Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

package api

import (
	"github.com/valkey-io/valkey-glide/go/glide/api/options"
)

// SortedSetCommands supports commands and transactions for the "Sorted Set Commands" group for standalone and cluster clients.
//
// See [valkey.io] for details.
//
// [valkey.io]: https://valkey.io/commands/#sorted-set
type SortedSetCommands interface {
	ZAdd(key string, membersScoreMap map[string]float64) (int64, error)

	ZAddWithOptions(key string, membersScoreMap map[string]float64, opts *options.ZAddOptions) (int64, error)

	ZAddIncr(key string, member string, increment float64) (Result[float64], error)

	ZAddIncrWithOptions(key string, member string, increment float64, opts *options.ZAddOptions) (Result[float64], error)

	ZIncrBy(key string, increment float64, member string) (float64, error)

	ZPopMin(key string) (map[string]float64, error)

	ZPopMinWithCount(key string, count int64) (map[string]float64, error)

	ZPopMax(key string) (map[string]float64, error)

	ZPopMaxWithCount(key string, count int64) (map[string]float64, error)

	ZRem(key string, members []string) (int64, error)

	ZCard(key string) (int64, error)

	BZPopMin(keys []string, timeoutSecs float64) (Result[KeyWithMemberAndScore], error)

	BZPopMax(keys []string, timeoutSecs float64) (Result[KeyWithMemberAndScore], error)

	ZMPop(keys []string, scoreFilter ScoreFilter, count int) (Result[KeyWithArrayOfMembersAndScores], error)

	ZRange(key string, rangeQuery options.ZRangeQuery) ([]string, error)

	ZRangeWithScores(key string, rangeQuery options.ZRangeQueryWithScores) (map[string]float64, error)

	ZRank(key string, member string) (Result[int64], error)

	ZRankWithScore(key string, member string) (Result[int64], Result[float64], error)

	ZRevRank(key string, member string) (Result[int64], error)

	ZRevRankWithScore(key string, member string) (Result[int64], Result[float64], error)

	ZScore(key string, member string) (Result[float64], error)

	ZCount(key string, rangeOptions *options.ZCountRange) (int64, error)

	ZScan(key string, cursor string) (string, []string, error)

	ZScanWithOptions(key string, cursor string, options *options.ZScanOptions) (string, []string, error)

	ZRemRangeByLex(key string, rangeQuery options.RangeByLex) (int64, error)

	ZRemRangeByRank(key string, start int64, stop int64) (int64, error)

	ZRemRangeByScore(key string, rangeQuery options.RangeByScore) (int64, error)
}
