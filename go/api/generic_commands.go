// Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

package api

// GenericCommands supports commands for the "Generic Commands" group for standalone client.
//
// See [valkey.io] for details.
//
// [valkey.io]: https://valkey.io/commands/#generic
type GenericCommands interface {
	CustomCommand(args []string) (interface{}, error)
}
