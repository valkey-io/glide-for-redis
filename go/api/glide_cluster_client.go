// Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

package api

// #cgo LDFLAGS: -L../target/release -lglide_rs
// #include "../lib.h"
import "C"

import (
	"github.com/valkey-io/valkey-glide/go/glide/utils"
)

// GlideClusterClient interface compliance check.
var _ GlideClusterClient = (*glideClusterClient)(nil)

type (
	// GlideClusterClient is a client used for connection in cluster mode.
	GlideClusterClient interface {
		BaseClient
		ServerManagementClusterCommands
		GenericClusterCommands
	}

	// glideClusterClient implements cluster operations by extending baseClient functionality.
	glideClusterClient struct {
		*baseClient
	}
)

// NewGlideClusterClient creates a [GlideClusterClient] in cluster mode using the given [GlideClusterClientConfiguration].
func NewGlideClusterClient(config *GlideClusterClientConfiguration) (GlideClusterClient, error) {
	client, err := createClient(config)
	if err != nil {
		return nil, err
	}

	return &glideClusterClient{client}, nil
}

func (client *glideClusterClient) ConfigGet(args []string) (map[Result[string]]Result[string], error) {
	res, err := client.executeCommand(C.ConfigGet, args)
	if err != nil {
		return nil, err
	}

	return handleStringToStringMapResponse(res)
}

func (client *glideClusterClient) ConfigSet(parameters map[string]string) (Result[string], error) {
	result, err := client.executeCommand(C.ConfigSet, utils.MapToString(parameters))
	if err != nil {
		return CreateNilStringResult(), err
	}

	return handleStringResponse(result)
}

func (client *glideClusterClient) CustomCommand(args []string) (interface{}, error) {
	cmdResp, err := client.executeCommand(C.CustomCommand, args)
	if err != nil {
		return nil, err
	}

	res, err := handleStringOrNullResponse(cmdResp)
	if err != nil {
		return nil, err
	}

	return res.Value(), err
}
