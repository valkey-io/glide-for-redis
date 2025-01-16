// Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

package api

// #cgo LDFLAGS: -L../target/release -lglide_rs
// #include "../lib.h"
import "C"

// GlideClusterClient interface compliance check.
var _ GlideClusterClient = (*glideClusterClient)(nil)

// GlideClusterClient is a client used for connection in cluster mode.
type GlideClusterClient interface {
	BaseClient
	GenericClusterCommands
}

// glideClusterClient implements cluster mode operations by extending baseClient functionality.
type glideClusterClient struct {
	*baseClient
}

// NewGlideClusterClient creates a [GlideClusterClient] in cluster mode using the given [GlideClusterClientConfiguration].
func NewGlideClusterClient(config *GlideClusterClientConfiguration) (GlideClusterClient, error) {
	client, err := createClient(config)
	if err != nil {
		return nil, err
	}

	return &glideClusterClient{client}, nil
}

func (client *glideClusterClient) CustomCommand(args []string) (ClusterValue[interface{}], error) {
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
