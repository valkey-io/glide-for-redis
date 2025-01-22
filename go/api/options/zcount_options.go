// Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

package options

// The common interface for representing all the range type for Zcount command.
type ScoreRange interface {
	ToArgs() ([]string, error)
}

// This struct represents the min and max boundary for the Zcount command.
type ZCountRange struct {
	min scoreBoundary
	max scoreBoundary
}

// Create a new Zcount range.
func NewZCountRangeBuilder(min scoreBoundary, max scoreBoundary) *ZCountRange {
	return &ZCountRange{min, max}
}

func (zCountRange *ZCountRange) ToArgs() ([]string, error) {
	return []string{string(zCountRange.min), string(zCountRange.max)}, nil
}
