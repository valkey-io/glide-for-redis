// Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

package api

// ServerManagementCommands supports commands for the "Server Management" group for a standalone client.
//
// See [valkey.io] for details.
//
// [valkey.io]: https://valkey.io/commands/#server
type ServerManagementCommands interface {
	Select(index int64) (string, error)

	ConfigGet(args []string) (map[string]string, error)

	ConfigSet(parameters map[string]string) (string, error)

	Info() (string, error)

	InfoWithOptions(options InfoOptions) (string, error)

	DBSize() (int64, error)

	Time() ([]string, error)
}
