// Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

package api

// Supports commands and transactions for the "Connection Management" group of commands for standalone client.
//
// See [valkey.io] for details.
//
// [valkey.io]: https://valkey.io/commands/#connection
type ConnectionManagementCommands interface {
	// Pings the server.
	//
	// Return value:
	//  Returns "PONG".
	//
	// For example:
	//  result, err := client.Ping()
	//
	// [valkey.io]: https://valkey.io/commands/ping/
	Ping() (string, error)

	// Pings the server with a custom message.
	//
	// Parameters:
	//  message - A message to include in the `PING` command.
	//
	// Return value:
	//  Returns the copy of message.
	//
	// For example:
	//  result, err := client.PingWithMessage("Hello")
	//
	// [valkey.io]: https://valkey.io/commands/ping/
	PingWithMessage(message string) (string, error)
}
