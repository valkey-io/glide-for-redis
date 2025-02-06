// Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

package options

import (
	"github.com/valkey-io/valkey-glide/go/glide/utils"
)

// Query for `ZRange` in [SortedSetCommands]
//   - For range queries by index (rank), use `RangeByIndex`.
//   - For range queries by lexicographical order, use `RangeByLex`.
//   - For range queries by score, use `RangeByScore`.
type ZRangeQuery interface {
	ToArgs() []string
}

type ZRemRangeQuery interface {
	ToArgsRemRange() []string
}

// Queries a range of elements from a sorted set by theirs index.
type RangeByIndex struct {
	start, end int64
	reverse    bool
}

// Queries a range of elements from a sorted set by theirs score.
type RangeByScore struct {
	start, end scoreBoundary
	reverse    bool
	Limit      *Limit
}

// Queries a range of elements from a sorted set by theirs lexicographical order.
type RangeByLex struct {
	start, end lexBoundary
	reverse    bool
	Limit      *Limit
}

type (
	scoreBoundary string
	lexBoundary   string
)

// Create a new inclusive score boundary.
func NewInclusiveScoreBoundary(bound float64) scoreBoundary {
	return scoreBoundary(utils.FloatToString(bound))
}

// Create a new score boundary.
func NewScoreBoundary(bound float64, isInclusive bool) scoreBoundary {
	if !isInclusive {
		return scoreBoundary("(" + utils.FloatToString(bound))
	}
	return scoreBoundary(utils.FloatToString(bound))
}

// Create a new score boundary defined by an infinity.
func NewInfiniteScoreBoundary(bound InfBoundary) scoreBoundary {
	return scoreBoundary(string(bound) + "inf")
}

// Create a new lex boundary.
func NewLexBoundary(bound string, isInclusive bool) lexBoundary {
	if !isInclusive {
		return lexBoundary("(" + bound)
	}
	return lexBoundary("[" + bound)
}

// Create a new lex boundary defined by an infinity.
func NewInfiniteLexBoundary(bound InfBoundary) lexBoundary {
	return lexBoundary(string(bound))
}

// TODO re-use limit from `SORT` https://github.com/valkey-io/valkey-glide/pull/2888
// Limit struct represents the range of elements to retrieve
// The LIMIT argument is commonly used to specify a subset of results from the matching elements, similar to the
// LIMIT clause in SQL (e.g., `SELECT LIMIT offset, count`).
type Limit struct {
	// The starting position of the range, zero based.
	offset int64
	// The maximum number of elements to include in the range. A negative count returns all elementsnfrom the offset.
	count int64
}

func (limit *Limit) toArgs() []string {
	return []string{"LIMIT", utils.IntToString(limit.offset), utils.IntToString(limit.count)}
}

// Queries a range of elements from a sorted set by theirs index.
//
// Parameters:
//
//	start - The start index of the range.
//	end   - The end index of the range.
func NewRangeByIndexQuery(start int64, end int64) *RangeByIndex {
	return &RangeByIndex{start, end, false}
}

// Reverses the sorted set, with index `0` as the element with the highest score.
func (rbi *RangeByIndex) SetReverse() *RangeByIndex {
	rbi.reverse = true
	return rbi
}

func (rbi *RangeByIndex) ToArgs() []string {
	args := make([]string, 0, 3)
	args = append(args, utils.IntToString(rbi.start), utils.IntToString(rbi.end))
	if rbi.reverse {
		args = append(args, "REV")
	}
	return args
}

// Queries a range of elements from a sorted set by theirs score.
//
// Parameters:
//
//	start - The start score of the range.
//	end   - The end score of the range.
func NewRangeByScoreQuery(start scoreBoundary, end scoreBoundary) *RangeByScore {
	return &RangeByScore{start, end, false, nil}
}

// Reverses the sorted set, with index `0` as the element with the highest score.
func (rbs *RangeByScore) SetReverse() *RangeByScore {
	rbs.reverse = true
	return rbs
}

// The limit argument for a range query, unset by default. See [Limit] for more information.
func (rbs *RangeByScore) SetLimit(offset, count int64) *RangeByScore {
	rbs.Limit = &Limit{offset, count}
	return rbs
}

func (rbs *RangeByScore) ToArgs() []string {
	args := make([]string, 0, 7)
	args = append(args, string(rbs.start), string(rbs.end), "BYSCORE")
	if rbs.reverse {
		args = append(args, "REV")
	}
	if rbs.Limit != nil {
		args = append(args, rbs.Limit.toArgs()...)
	}
	return args
}

func (rbs *RangeByScore) ToArgsRemRange() []string {
	return []string{string(rbs.start), string(rbs.end)}
}

// Queries a range of elements from a sorted set by theirs lexicographical order.
//
// Parameters:
//
//	start - The start lex of the range.
//	end   - The end lex of the range.
func NewRangeByLexQuery(start lexBoundary, end lexBoundary) *RangeByLex {
	return &RangeByLex{start, end, false, nil}
}

// Reverses the sorted set, with index `0` as the element with the highest score.
func (rbl *RangeByLex) SetReverse() *RangeByLex {
	rbl.reverse = true
	return rbl
}

// The limit argument for a range query, unset by default. See [Limit] for more information.
func (rbl *RangeByLex) SetLimit(offset, count int64) *RangeByLex {
	rbl.Limit = &Limit{offset, count}
	return rbl
}

func (rbl *RangeByLex) ToArgs() []string {
	args := make([]string, 0, 7)
	args = append(args, string(rbl.start), string(rbl.end), "BYLEX")
	if rbl.reverse {
		args = append(args, "REV")
	}
	if rbl.Limit != nil {
		args = append(args, rbl.Limit.toArgs()...)
	}
	return args
}

func (rbl *RangeByLex) ToArgsRemRange() []string {
	return []string{string(rbl.start), string(rbl.end)}
}

// Query for `ZRangeWithScores` in [SortedSetCommands]
//   - For range queries by index (rank), use `RangeByIndex`.
//   - For range queries by score, use `RangeByScore`.
type ZRangeQueryWithScores interface {
	// A dummy interface to distinguish queries for `ZRange` and `ZRangeWithScores`
	// `ZRangeWithScores` does not support BYLEX
	dummy()
	ToArgs() []string
}

func (q *RangeByIndex) dummy() {}
func (q *RangeByScore) dummy() {}
