// Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

package options

const (
	CountKeyword     string = "COUNT"      // Valkey API keyword used to extract specific number of matching indices from a list.
	FullKeyword      string = "FULL"       // Valkey API keyword used in XINFO STREAM
	MatchKeyword     string = "MATCH"      // Valkey API keyword used to indicate the match filter.
	NoValue          string = "NOVALUE"    // Valkey API keyword for the no value option for hcsan command.
	WithScore        string = "WITHSCORE"  // Valkey API keyword for the with score option for zrank and zrevrank commands.
	WithScores       string = "WITHSCORES" // Valkey API keyword for ZRandMember and ZDiff command to return scores along with members.
	NoScores         string = "NOSCORES"   // Valkey API keyword for the no scores option for zscan command.
	WithValues       string = "WITHVALUES" // Valkey API keyword to query hash values along their names in `HRANDFIELD`.
	AggregateKeyWord string = "AGGREGATE"  // Valkey API keyword for the aggregate option for multiple commands.
	WeightsKeyword   string = "WEIGHTS"    // Valkey API keyword for the weights option for multiple commands.
	LimitKeyword     string = "LIMIT"      // Valkey API keyword for the limit option for multiple commands.
)

type InfBoundary string

const (
	// The highest bound in the sorted set
	PositiveInfinity InfBoundary = "+"
	// The lowest bound in the sorted set
	NegativeInfinity InfBoundary = "-"
)
