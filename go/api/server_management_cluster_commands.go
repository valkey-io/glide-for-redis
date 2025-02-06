// Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

package api

import "github.com/valkey-io/valkey-glide/go/glide/api/options"

// ServerManagementCommands supports commands for the "Server Management" group for a cluster client.
//
// See [valkey.io] for details.
//
// [valkey.io]: https://valkey.io/commands/#server
type ServerManagementClusterCommands interface {
	Info() (map[string]string, error)

	InfoWithOptions(options ClusterInfoOptions) (ClusterValue[string], error)

	TimeWithOptions(routeOption options.RouteOption) (ClusterValue[[]string], error)

	DBSizeWithOptions(routeOption options.RouteOption) (int64, error)
}
