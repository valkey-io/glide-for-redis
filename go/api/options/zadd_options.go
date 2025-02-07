// Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

package options

import (
	"errors"

	"github.com/valkey-io/valkey-glide/go/utils"
)

// Optional arguments to `ZAdd` in [SortedSetCommands]
type ZAddOptions struct {
	conditionalChange ConditionalChange
	updateOptions     UpdateOptions
	changed           bool
	incr              bool
	increment         float64
	member            string
}

func NewZAddOptionsBuilder() *ZAddOptions {
	return &ZAddOptions{}
}

// `conditionalChange` defines conditions for updating or adding elements with `ZADD` command.
func (options *ZAddOptions) SetConditionalChange(c ConditionalChange) *ZAddOptions {
	options.conditionalChange = c
	return options
}

// `updateOptions` specifies conditions for updating scores with zadd command.
func (options *ZAddOptions) SetUpdateOptions(u UpdateOptions) *ZAddOptions {
	options.updateOptions = u
	return options
}

// `Changed` changes the return value from the number of new elements added to the total number of elements changed.
func (options *ZAddOptions) SetChanged(ch bool) (*ZAddOptions, error) {
	if options.incr {
		return nil, errors.New("changed cannot be set when incr is true")
	}
	options.changed = ch
	return options, nil
}

// `INCR` sets the increment value to use when incr is true.
func (options *ZAddOptions) SetIncr(incr bool, increment float64, member string) (*ZAddOptions, error) {
	if options.changed {
		return nil, errors.New("incr cannot be set when changed is true")
	}
	options.incr = incr
	options.increment = increment
	options.member = member
	return options, nil
}

// `ToArgs` converts the options to a list of arguments.
func (opts *ZAddOptions) ToArgs() ([]string, error) {
	args := []string{}
	var err error

	if opts.conditionalChange == OnlyIfExists || opts.conditionalChange == OnlyIfDoesNotExist {
		args = append(args, string(opts.conditionalChange))
	}

	if opts.updateOptions == ScoreGreaterThanCurrent || opts.updateOptions == ScoreLessThanCurrent {
		args = append(args, string(opts.updateOptions))
	}

	if opts.changed {
		args = append(args, ChangedKeyword)
	}

	if opts.incr {
		args = append(args, IncrKeyword, utils.FloatToString(opts.increment), opts.member)
	}

	return args, err
}

// A ConditionalSet defines whether a new value should be set or not.
type ConditionalChange string

const (
	// Only update elements that already exist. Don't add new elements. Equivalent to "XX" in the Valkey API.
	OnlyIfExists ConditionalChange = "XX"
	// Only add new elements. Don't update already existing elements. Equivalent to "NX" in the Valkey API.
	OnlyIfDoesNotExist ConditionalChange = "NX"
)

type UpdateOptions string

const (
	// Only update existing elements if the new score is less than the current score. Equivalent to
	// "LT" in the Valkey API.
	ScoreLessThanCurrent UpdateOptions = "LT"
	// Only update existing elements if the new score is greater than the current score. Equivalent
	// to "GT" in the Valkey API.
	ScoreGreaterThanCurrent UpdateOptions = "GT"
)

const (
	ChangedKeyword string = "CH"   // Valkey API keyword used to return total number of elements changed
	IncrKeyword    string = "INCR" // Valkey API keyword to make zadd act like ZINCRBY.
)
