// Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

package options

import (
	"github.com/valkey-io/valkey-glide/go/utils"
)

type BitmapIndexType string

const (
	BYTE BitmapIndexType = "BYTE"
	BIT  BitmapIndexType = "BIT"
)

// Optional arguments to `BitCount` in [BitMapCommands]
type BitCountOptions struct {
	start           *int64
	end             *int64
	bitMapIndexType BitmapIndexType
}

func NewBitCountOptionsBuilder() *BitCountOptions {
	return &BitCountOptions{}
}

// SetStart defines start byte to calculate bitcount in bitcount command.
func (options *BitCountOptions) SetStart(start int64) *BitCountOptions {
	options.start = &start
	return options
}

// SetEnd defines start byte to calculate bitcount in bitcount command.
func (options *BitCountOptions) SetEnd(end int64) *BitCountOptions {
	options.end = &end
	return options
}

// SetBitmapIndexType to specify start and end are in BYTE or BIT
func (options *BitCountOptions) SetBitmapIndexType(bitMapIndexType BitmapIndexType) *BitCountOptions {
	options.bitMapIndexType = bitMapIndexType
	return options
}

// ToArgs converts the options to a list of arguments.
func (opts *BitCountOptions) ToArgs() ([]string, error) {
	args := []string{}
	var err error

	if opts.start != nil {
		args = append(args, utils.IntToString(*opts.start))
		if opts.end != nil {
			args = append(args, utils.IntToString(*opts.end))
			if opts.bitMapIndexType != "" {
				if opts.bitMapIndexType == BIT || opts.bitMapIndexType == BYTE {
					args = append(args, string(opts.bitMapIndexType))
				}
			}
		}
	}

	return args, err
}
