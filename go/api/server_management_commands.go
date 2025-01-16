// Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

package api

// ServerManagementCommands supports commands and transactions for the "Server Management" group for a standalone client.
//
// See [valkey.io] for details.
//
// [valkey.io]: https://valkey.io/commands/#server
type ServerManagementCommands interface {
	// Select changes the currently selected database.
	//
	// Parameters:
	//	index - The index of the database to select.
	//
	// Return value:
	//	A simple `"OK"` response.
	//
	// Example:
	//	result, err := client.Select(2)
	//	result: "OK"
	//
	// [valkey.io]: https://valkey.io/commands/select/
	Select(index int64) (string, error)

	// Gets the values of configuration parameters.
	//
	// Note: Prior to Version 7.0.0, only one parameter can be send.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//	args - A slice of configuration parameter names to retrieve values for.
	//
	// Return value:
	//	A map of api.Result[string] corresponding to the configuration parameters.
	//
	// For example:
	//	result, err := client.ConfigGet([]string{"timeout" , "maxmemory"})
	//	result[api.CreateStringResult("timeout")] = api.CreateStringResult("1000")
	//	result[api.CreateStringResult"maxmemory")] = api.CreateStringResult("1GB")
	//
	// [valkey.io]: https://valkey.io/commands/config-get/
	ConfigGet(args []string) (map[Result[string]]Result[string], error)

	// Sets configuration parameters to the specified values.
	//
	// Note: Prior to Version 7.0.0, only one parameter can be send.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//	parameters - A map consisting of configuration parameters and their respective values to set.
	//
	// Return value:
	//	`"OK"` if all configurations have been successfully set. Otherwise, raises an error.
	//
	// For example:
	//	result, err := client.ConfigSet(map[string]string{"timeout": "1000", "maxmemory": "1GB"})
	//	result: "OK"
	//
	// [valkey.io]: https://valkey.io/commands/config-set/
	ConfigSet(parameters map[string]string) (string, error)
}
