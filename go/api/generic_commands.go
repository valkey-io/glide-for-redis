// Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

package api

// GenericCommands supports commands for the "Generic Commands" group for standalone client.
//
// See [valkey.io] for details.
//
// [valkey.io]: https://valkey.io/commands/#generic
type GenericCommands interface {
	// CustomCommand executes a single command, specified by args, without checking inputs. Every part of the command,
	// including the command name and subcommands, should be added as a separate value in args. The returning value depends on
	// the executed
	// command.
	//
	// See [Valkey GLIDE Wiki] for details on the restrictions and limitations of the custom command API.
	//
	// This function should only be used for single-response commands. Commands that don't return complete response and awaits
	// (such as SUBSCRIBE), or that return potentially more than a single response (such as XREAD), or that change the client's
	// behavior (such as entering pub/sub mode on RESP2 connections) shouldn't be called using this function.
	//
	// Parameters:
	//	args - Arguments for the custom command including the command name.
	//
	// Return value:
	//	The returned value for the custom command.
	//
	// For example:
	//	result, err := client.CustomCommand([]string{"ping"})
	//	result.(string): "PONG"
	//
	// [Valkey GLIDE Wiki]: https://github.com/valkey-io/valkey-glide/wiki/General-Concepts#custom-command
	CustomCommand(args []string) (interface{}, error)
}
