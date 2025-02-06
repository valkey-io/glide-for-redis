// Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

package integTest

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/valkey-io/valkey-glide/go/glide/api"
	"github.com/valkey-io/valkey-glide/go/glide/api/config"
	"github.com/valkey-io/valkey-glide/go/glide/protobuf"
)

func TestSimpleNodeRoute(t *testing.T) {
	routeConfig := config.AllNodes
	expected := &protobuf.Routes{
		Value: &protobuf.Routes_SimpleRoutes{
			SimpleRoutes: protobuf.SimpleRoutes_AllNodes,
		},
	}

	result, err := routeConfig.ToRoutesProtobuf()

	assert.Equal(t, expected, result)
	assert.Nil(t, err)
}

func TestSlotIdRoute(t *testing.T) {
	routeConfig := config.NewSlotIdRoute(config.SlotTypePrimary, int32(100))
	expected := &protobuf.Routes{
		Value: &protobuf.Routes_SlotIdRoute{
			SlotIdRoute: &protobuf.SlotIdRoute{
				SlotType: protobuf.SlotTypes_Primary,
				SlotId:   100,
			},
		},
	}

	result, err := routeConfig.ToRoutesProtobuf()

	assert.Equal(t, expected, result)
	assert.Nil(t, err)
}

func TestSlotKeyRoute(t *testing.T) {
	routeConfig := config.NewSlotKeyRoute(config.SlotTypePrimary, "Slot1")
	expected := &protobuf.Routes{
		Value: &protobuf.Routes_SlotKeyRoute{
			SlotKeyRoute: &protobuf.SlotKeyRoute{
				SlotType: protobuf.SlotTypes_Primary,
				SlotKey:  "Slot1",
			},
		},
	}

	result, err := routeConfig.ToRoutesProtobuf()

	assert.Equal(t, expected, result)
	assert.Nil(t, err)
}

func TestByAddressRoute(t *testing.T) {
	routeConfig := config.NewByAddressRoute(api.DefaultHost, int32(api.DefaultPort))
	expected := &protobuf.Routes{
		Value: &protobuf.Routes_ByAddressRoute{
			ByAddressRoute: &protobuf.ByAddressRoute{Host: api.DefaultHost, Port: api.DefaultPort},
		},
	}

	result, err := routeConfig.ToRoutesProtobuf()

	assert.Equal(t, expected, result)
	assert.Nil(t, err)
}

func TestByAddressRouteWithHost(t *testing.T) {
	routeConfig, _ := config.NewByAddressRouteWithHost(fmt.Sprintf("%s:%d", api.DefaultHost, api.DefaultPort))
	expected := &protobuf.Routes{
		Value: &protobuf.Routes_ByAddressRoute{
			ByAddressRoute: &protobuf.ByAddressRoute{Host: api.DefaultHost, Port: api.DefaultPort},
		},
	}

	result, err := routeConfig.ToRoutesProtobuf()

	assert.Equal(t, expected, result)
	assert.Nil(t, err)
}

func TestByAddressRoute_MultiplePorts(t *testing.T) {
	_, err := config.NewByAddressRouteWithHost(fmt.Sprintf("%s:%d:%d", api.DefaultHost, api.DefaultPort, api.DefaultPort+1))
	assert.NotNil(t, err)
}

func TestByAddressRoute_InvalidHost(t *testing.T) {
	_, err := config.NewByAddressRouteWithHost(api.DefaultHost)
	assert.NotNil(t, err)
}
