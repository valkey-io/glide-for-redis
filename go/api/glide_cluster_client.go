// Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

package api

// #cgo LDFLAGS: -L../target/release -lglide_rs
// #include "../lib.h"
//
// void successCallback(void *channelPtr, struct CommandResponse *message);
// void failureCallback(void *channelPtr, char *errMessage, RequestErrorType errType);
import "C"

// GlideClusterClient is a client used for connection in cluster mode.
type GlideClusterClient struct {
	*baseClient
}

// NewGlideClusterClient creates a [GlideClusterClient] in cluster mode using the given [GlideClusterClientConfiguration].
func NewGlideClusterClient(config *GlideClusterClientConfiguration) (*GlideClusterClient, error) {
	client, err := createClient(config)
	if err != nil {
		return nil, err
	}

	return &GlideClusterClient{client}, nil
}

// Pings the server and returns "PONG".
//
// Paramters:
//
//	route - Specifies the routing configuration for the command. The client will route the command to the nodes defined by
//
// route.
//
// Return value:
//
//	A Result[string] containing "PONG" is returned.
//
// For example:
//
//	result, err := client.PingWithRoute(api.SimpleNodeRouteAllPrimaries)
//
// [valkey.io]: https://valkey.io/commands/ping/
func (client *GlideClusterClient) PingWithRoute(route route) (Result[string], error) {
	result, err := client.executeCommandWithRoute(C.Ping, []string{}, route)
	if err != nil {
		return CreateNilStringResult(), err
	}

	return handleStringResponse(result)
}

// Pings the server and returns the message.
//
// Paramters:
//
//	route - Specifies the routing configuration for the command. The client will route the command to the nodes defined by
//
// route.
//
// Return value:
//
//	A Result[string] containing message is returned.
//
// For example:
//
//	result, err := client.PingWithRouteAndMessage("Hello", api.SimpleNodeRouteAllPrimaries)
//
// [valkey.io]: https://valkey.io/commands/ping/
func (client *GlideClusterClient) PingWithRouteAndMessage(message string, route route) (Result[string], error) {
	result, err := client.executeCommandWithRoute(C.Ping, []string{message}, route)
	if err != nil {
		return CreateNilStringResult(), err
	}

	return handleStringResponse(result)
}

// CustomCommand executes a single command, specified by args, without checking inputs. Every part of the command, including
// the command name and subcommands, should be added as a separate value in args. The returning value depends on the executed
// command.
//
// The command will be routed automatically based on the passed command's default request policy.
//
// See [Valkey GLIDE Wiki] for details on the restrictions and limitations of the custom command API.
//
// This function should only be used for single-response commands. Commands that don't return complete response and awaits
// (such as SUBSCRIBE), or that return potentially more than a single response (such as XREAD), or that change the client's
// behavior (such as entering pub/sub mode on RESP2 connections) shouldn't be called using this function.
//
// Parameters:
//
//	args - Arguments for the custom command including the command name.
//
// Return value:
//
//	The returned value for the custom command.
//
// For example:
//
//	result, err := client.CustomCommand([]string{"ping"})
//	result.Value().(string): "PONG"
//
// [Valkey GLIDE Wiki]: https://github.com/valkey-io/valkey-glide/wiki/General-Concepts#custom-command
func (client *GlideClusterClient) CustomCommand(args []string) (ClusterValue[interface{}], error) {
	res, err := client.executeCommand(C.CustomCommand, args)
	if err != nil {
		return CreateEmptyClusterValue(), err
	}
	data, err := handleInterfaceResponse(res)
	if err != nil {
		return CreateEmptyClusterValue(), err
	}
	return CreateClusterValue(data), nil
}
