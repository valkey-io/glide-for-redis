// Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

package api

// #cgo LDFLAGS: -L../target/release -lglide_rs
// #include "../lib.h"
import "C"

import (
	"github.com/valkey-io/valkey-glide/go/glide/utils"
)

// GlideClient interface compliance check.
var _ GlideClient = (*glideClient)(nil)

type (
	// GlideClient is a client used for connection in Standalone mode.
	GlideClient interface {
		BaseClient
		ServerManagementCommands
		GenericCommands
	}

	// glideClient implements standalone mode operations by extending baseClient functionality.
	glideClient struct {
		*baseClient
	}
)

// NewGlideClient creates a [GlideClient] in standalone mode using the given [GlideClientConfiguration].
func NewGlideClient(config *GlideClientConfiguration) (GlideClient, error) {
	client, err := createClient(config)
	if err != nil {
		return nil, err
	}

	return &glideClient{client}, nil
}

func (client *glideClient) ConfigGet(args []string) (map[Result[string]]Result[string], error) {
	res, err := client.executeCommand(C.ConfigGet, args)
	if err != nil {
		return nil, err
	}

	return handleStringToStringMapResponse(res)
}

func (client *glideClient) ConfigSet(parameters map[string]string) (Result[string], error) {
	result, err := client.executeCommand(C.ConfigSet, utils.MapToString(parameters))
	if err != nil {
		return CreateNilStringResult(), err
	}

	return handleStringResponse(result)
}

func (client *glideClient) CustomCommand(args []string) (interface{}, error) {
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
