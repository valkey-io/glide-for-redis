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
	// Adds one or more members to a sorted set, or updates their scores. Creates the key if it doesn't exist.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//   key - The key of the set.
	//   membersScoreMap - A map of members to their scores.
	//
	// Return value:
	//   The number of members added to the set.
	//
	// Example:
	//   res, err := client.ZAdd(key, map[string]float64{"one": 1.0, "two": 2.0, "three": 3.0})
	//   fmt.Println(res) // Output: 3
	//
	// [valkey.io]: https://valkey.io/commands/zadd/
	ZAdd(key string, membersScoreMap map[string]float64) (int64, error)

	// Adds one or more members to a sorted set, or updates their scores. Creates the key if it doesn't exist.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//   key - The key of the set.
	//   membersScoreMap - A map of members to their scores.
	//   opts - The options for the command. See [ZAddOptions] for details.
	//
	// Return value:
	//   The number of members added to the set. If `CHANGED` is set, the number of members that were updated.
	//
	// Example:
	//   res, err := client.ZAddWithOptions(key, map[string]float64{"one": 1.0, "two": 2.0, "three": 3.0},
	//   									options.NewZAddOptionsBuilder().SetChanged(true).Build())
	//   fmt.Println(res) // Output: 3
	//
	// [valkey.io]: https://valkey.io/commands/zadd/
	ZAddWithOptions(key string, membersScoreMap map[string]float64, opts *options.ZAddOptions) (int64, error)

	// Adds one or more members to a sorted set, or updates their scores. Creates the key if it doesn't exist.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//   key - The key of the set.
	//   member - The member to add to.
	//   increment - The increment to add to the member's score.
	//
	// Return value:
	//   Result[float64] - The new score of the member.
	//
	// Example:
	//   res, err := client.ZAddIncr(key, "one", 1.0)
	//   fmt.Println(res.Value()) // Output: 1.0
	//
	// [valkey.io]: https://valkey.io/commands/zadd/
	ZAddIncr(key string, member string, increment float64) (Result[float64], error)

	// Adds one or more members to a sorted set, or updates their scores. Creates the key if it doesn't exist.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//   key - The key of the set.
	//   member - The member to add to.
	//   increment - The increment to add to the member's score.
	//   opts - The options for the command. See [ZAddOptions] for details.
	//
	// Return value:
	//   The new score of the member.
	//   If there was a conflict with the options, the operation aborts and `nil` is returned.
	//
	// Example:
	//   res, err := client.ZAddIncrWithOptions(key, "one", 1.0, options.NewZAddOptionsBuilder().SetChanged(true))
	//   fmt.Println(res.Value()) // Output: 1.0
	//
	// [valkey.io]: https://valkey.io/commands/zadd/
	ZAddIncrWithOptions(key string, member string, increment float64, opts *options.ZAddOptions) (Result[float64], error)

	// Increments the score of member in the sorted set stored at key by increment.
	// If member does not exist in the sorted set, it is added with increment as its score.
	// If key does not exist, a new sorted set with the specified member as its sole member
	// is created.
	//
	// see [valkey.io] for details.
	//
	// Parameters:
	//   key - The key of the sorted set.
	//   increment - The score increment.
	//   member - A member of the sorted set.
	//
	// Return value:
	//   The new score of member.
	//
	// Example:
	//   res, err := client.ZIncrBy("myzset", 2.0, "one")
	//   fmt.Println(res) // Output: 2.0
	//
	// [valkey.io]: https://valkey.io/commands/zincrby/
	ZIncrBy(key string, increment float64, member string) (float64, error)

	// Removes and returns the member with the lowest score from the sorted set
	// stored at the specified `key`.
	//
	// see [valkey.io] for details.
	//
	// Parameters:
	//   key - The key of the sorted set.
	//
	// Return value:
	//   A map containing the removed member and its corresponding score.
	//   If `key` doesn't exist, it will be treated as an empty sorted set and the
	//   command returns an empty map.
	//
	// Example:
	//   res, err := client.zpopmin("mySortedSet")
	//   fmt.Println(res) // Output: map["member1": 5.0]
	//
	// [valkey.io]: https://valkey.io/commands/zpopmin/
	ZPopMin(key string) (map[string]float64, error)

	// Removes and returns up to `count` members with the lowest scores from the sorted set
	// stored at the specified `key`.
	//
	// see [valkey.io] for details.
	//
	// Parameters:
	//   key - The key of the sorted set.
	//   count - The number of members to remove.
	//
	// Return value:
	//   A map containing the removed members and their corresponding scores.
	//   If `key` doesn't exist, it will be treated as an empty sorted set and the
	//   command returns an empty map.
	//
	// Example:
	//   res, err := client.ZPopMinWithCount("mySortedSet", 2)
	//   fmt.Println(res) // Output: map["member1": 5.0, "member2": 6.0]
	//
	// [valkey.io]: https://valkey.io/commands/zpopmin/
	ZPopMinWithCount(key string, count int64) (map[string]float64, error)

	// Removes and returns the member with the highest score from the sorted set stored at the
	// specified `key`.
	//
	// see [valkey.io] for details.
	//
	// Parameters:
	//   key - The key of the sorted set.
	//
	// Return value:
	//   A map containing the removed member and its corresponding score.
	//   If `key` doesn't exist, it will be treated as an empty sorted set and the
	//   command returns an empty map.
	//
	// Example:
	//   res, err := client.zpopmax("mySortedSet")
	//   fmt.Println(res) // Output: map["member2": 8.0]
	//
	// [valkey.io]: https://valkey.io/commands/zpopmin/
	ZPopMax(key string) (map[string]float64, error)

	// Removes and returns up to `count` members with the highest scores from the sorted set
	// stored at the specified `key`.
	//
	// see [valkey.io] for details.
	//
	// Parameters:
	//   key - The key of the sorted set.
	//   count - The number of members to remove.
	//
	// Return value:
	//   A map containing the removed members and their corresponding scores.
	//   If `key` doesn't exist, it will be treated as an empty sorted set and the
	//   command returns an empty map.
	//
	// Example:
	//   res, err := client.ZPopMaxWithCount("mySortedSet", 2)
	//   fmt.Println(res) // Output: map["member1": 5.0, "member2": 6.0]
	//
	// [valkey.io]: https://valkey.io/commands/zpopmin/
	ZPopMaxWithCount(key string, count int64) (map[string]float64, error)

	// Removes the specified members from the sorted set stored at `key`.
	// Specified members that are not a member of this set are ignored.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//   key - The key of the sorted set.
	//   members - The members to remove.
	//
	// Return value:
	//   The number of members that were removed from the sorted set, not including non-existing members.
	//   If `key` does not exist, it is treated as an empty sorted set, and this command returns `0`.
	//
	// Example:
	//   res, err := client.ZRem("mySortedSet", []string{""member1", "member2", "missing"})
	//   fmt.Println(res) // Output: 2
	//
	// [valkey.io]: https://valkey.io/commands/zrem/
	ZRem(key string, members []string) (int64, error)

	// Returns the cardinality (number of elements) of the sorted set stored at `key`.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//   key - The key of the set.
	//
	// Return value:
	//   The number of elements in the sorted set.
	//
	// If `key` does not exist, it is treated as an empty sorted set, and this command returns `0`.
	// If `key` holds a value that is not a sorted set, an error is returned.
	//
	// Example:
	//   result, err := client.ZCard("mySet")
	//   result: 1 // There is 1 item in the set
	//
	// [valkey.io]: https://valkey.io/commands/zcard/
	ZCard(key string) (int64, error)

	// Blocks the connection until it removes and returns a member with the lowest score from the
	// first non-empty sorted set, with the given `keys` being checked in the order they
	// are provided.
	// `BZPOPMIN` is the blocking variant of `ZPOPMIN`.
	//
	// Note:
	//   - When in cluster mode, all `keys` must map to the same hash slot.
	//   - `BZPOPMIN` is a client blocking command, see [Blocking Commands] for more details and best practices.
	//
	// See [valkey.io] for more details.
	//
	// Parameters:
	//   keys - The keys of the sorted sets.
	//   timeout - The number of seconds to wait for a blocking operation to complete. A value of
	//     `0` will block indefinitely.
	//
	// Return value:
	//   A `KeyWithMemberAndScore` struct containing the key where the member was popped out, the member
	//   itself, and the member score. If no member could be popped and the `timeout` expired, returns `nil`.
	//
	// Example:
	//   zaddResult1, err := client.ZAdd(key1, map[string]float64{"a": 1.0, "b": 1.5})
	//   zaddResult2, err := client.ZAdd(key2, map[string]float64{"c": 2.0})
	//   result, err := client.BZPopMin([]string{key1, key2}, float64(.5))
	//   fmt.Println(res.Value()) // Output: {key: key1 member:a, score:1}
	//
	// [valkey.io]: https://valkey.io/commands/bzpopmin/
	// [blocking commands]: https://github.com/valkey-io/valkey-glide/wiki/General-Concepts#blocking-commands
	BZPopMin(keys []string, timeoutSecs float64) (Result[KeyWithMemberAndScore], error)

	ZRange(key string, rangeQuery options.ZRangeQuery) ([]string, error)

	ZRangeWithScores(key string, rangeQuery options.ZRangeQueryWithScores) (map[string]float64, error)

	// Returns the rank of `member` in the sorted set stored at `key`, with
	// scores ordered from low to high, starting from `0`.
	// To get the rank of `member` with its score, see [ZRankWithScore].
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//   key - The key of the sorted set.
	//   member - The member to get the rank of.
	//
	// Return value:
	//   The rank of `member` in the sorted set.
	//   If `key` doesn't exist, or if `member` is not present in the set,
	//   `nil` will be returned.
	//
	// Example:
	//   res, err := client.ZRank("mySortedSet", "member1")
	//   fmt.Println(res.Value()) // Output: 3
	//
	//   res2, err := client.ZRank("mySortedSet", "non-existing-member")
	//   if res2.IsNil() {
	//     fmt.Println("Member not found")
	//   }
	//
	// [valkey.io]: https://valkey.io/commands/zrank/
	ZRank(key string, member string) (Result[int64], error)

	// Returns the rank of `member` in the sorted set stored at `key` with its
	// score, where scores are ordered from the lowest to highest, starting from `0`.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//   key - The key of the sorted set.
	//   member - The member to get the rank of.
	//
	// Return value:
	//   A tuple containing the rank of `member` and its score.
	//   If `key` doesn't exist, or if `member` is not present in the set,
	//   `nil` will be returned.
	//
	// Example:
	//   resRank, resScore, err := client.ZRankWithScore("mySortedSet", "member1")
	//   fmt.Println(resRank.Value()) // Output: 3
	//   fmt.Println(resScore.Value()) // Output: 5.0
	//
	//   res2Rank, res2Score, err := client.ZRankWithScore("mySortedSet", "non-existing-member")
	//   if res2Rank.IsNil() {
	//     fmt.Println("Member not found")
	//   }
	//
	// [valkey.io]: https://valkey.io/commands/zrank/
	ZRankWithScore(key string, member string) (Result[int64], Result[float64], error)

	// Returns the rank of `member` in the sorted set stored at `key`, where
	// scores are ordered from the highest to lowest, starting from `0`.
	// To get the rank of `member` with its score, see [ZRevRankWithScore].
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//   key - The key of the sorted set.
	//   member - The member to get the rank of.
	//
	// Return value:
	//   The rank of `member` in the sorted set, where ranks are ordered from high to
	//   low based on scores.
	//   If `key` doesn't exist, or if `member` is not present in the set,
	//   `nil` will be returned.
	//
	// Example:
	//   res, err := client.ZRevRank("mySortedSet", "member2")
	//   fmt.Println(res.Value()) // Output: 1
	//
	//   res2, err := client.ZRevRank("mySortedSet", "non-existing-member")
	//   if res2.IsNil() {
	//     fmt.Println("Member not found")
	//   }
	//
	// [valkey.io]: https://valkey.io/commands/zrevrank/
	ZRevRank(key string, member string) (Result[int64], error)

	// Returns the rank of `member` in the sorted set stored at `key`, where
	// scores are ordered from the highest to lowest, starting from `0`.
	// To get the rank of `member` with its score, see [ZRevRankWithScore].
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//   key - The key of the sorted set.
	//   member - The member to get the rank of.
	//
	// Return value:
	//   A tuple containing the rank of `member` and its score.
	//   If `key` doesn't exist, or if `member` is not present in the set,
	//   `nil` will be returned.s
	//
	// Example:
	//   resRank, resScore, err := client.ZRevRankWithScore("mySortedSet", "member2")
	//   fmt.Println(resRank.Value()) // Output: 1
	//   fmt.Println(resScore.Value()) // Output: 6.0
	//
	//   res2Rank, res2Score, err := client.ZRevRankWithScore("mySortedSet", "non-existing-member")
	//   if res2Rank.IsNil() {
	//     fmt.Println("Member not found")
	//   }
	//
	// [valkey.io]: https://valkey.io/commands/zrevrank/
	ZRevRankWithScore(key string, member string) (Result[int64], Result[float64], error)

	ZScore(key string, member string) (Result[float64], error)

	ZCount(key string, rangeOptions *options.ZCountRange) (int64, error)

	ZScan(key string, cursor string) (string, []string, error)

	ZScanWithOptions(key string, cursor string, options *options.ZScanOptions) (string, []string, error)

	ZRemRangeByLex(key string, rangeQuery options.RangeByLex) (int64, error)

	ZRemRangeByRank(key string, start int64, stop int64) (int64, error)

	ZRemRangeByScore(key string, rangeQuery options.RangeByScore) (int64, error)
}
