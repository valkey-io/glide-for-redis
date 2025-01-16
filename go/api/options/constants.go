// Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

package options

const (
	CountKeyword string = "COUNT"     // Valkey API keyword used to extract specific number of matching indices from a list.
	MatchKeyword string = "MATCH"     // Valkey API keyword used to indicate the match filter.
	NoValue      string = "NOVALUE"   // Valkey API keyword for the no value option for hcsan command.
	WithScore    string = "WITHSCORE" // Valkey API keyword for the with score option for zrank and zrevrank commands.
	NoScores     string = "NOSCORES"  // Valkey API keyword for the no scores option for zscan command.
)
