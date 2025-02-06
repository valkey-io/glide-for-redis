// Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

package api

import "github.com/valkey-io/valkey-glide/go/glide/api/options"

// Supports commands and transactions for the "Bitmap" group of commands for standalone and cluster clients.
//
// See [valkey.io] for details.
//
// [valkey.io]: https://valkey.io/commands/#bitmap
type BitmapCommands interface {
	SetBit(key string, offset int64, value int64) (int64, error)

	GetBit(key string, offset int64) (int64, error)

	BitCount(key string) (int64, error)

	BitCountWithOptions(key string, options *options.BitCountOptions) (int64, error)

	BitField(key string, subCommands []options.BitFieldSubCommands) ([]Result[int64], error)

	BitFieldRO(key string, commands []options.BitFieldROCommands) ([]Result[int64], error)
}
