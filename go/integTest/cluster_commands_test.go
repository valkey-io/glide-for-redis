// Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

package integTest

import (
	"strings"

	"github.com/stretchr/testify/assert"
	"github.com/valkey-io/valkey-glide/go/glide/api"
	"github.com/valkey-io/valkey-glide/go/glide/api/config"
	"github.com/valkey-io/valkey-glide/go/glide/api/options"
)

func (suite *GlideTestSuite) TestClusterCustomCommandInfo() {
	client := suite.defaultClusterClient()
	result, err := client.CustomCommand([]string{"INFO"})

	assert.Nil(suite.T(), err)
	// INFO is routed to all primary nodes by default
	for _, value := range result.MultiValue() {
		assert.True(suite.T(), strings.Contains(value.(string), "# Stats"))
	}
}

func (suite *GlideTestSuite) TestClusterCustomCommandEcho() {
	client := suite.defaultClusterClient()
	result, err := client.CustomCommand([]string{"ECHO", "GO GLIDE GO"})

	assert.Nil(suite.T(), err)
	// ECHO is routed to a single random node
	assert.Equal(suite.T(), "GO GLIDE GO", result.SingleValue().(string))
}

func (suite *GlideTestSuite) TestInfoCluster() {
	DEFAULT_INFO_SECTIONS := []string{
		"Server",
		"Clients",
		"Memory",
		"Persistence",
		"Stats",
		"Replication",
		"CPU",
		"Modules",
		"Errorstats",
		"Cluster",
		"Keyspace",
	}

	client := suite.defaultClusterClient()
	t := suite.T()

	// info without options
	data, err := client.Info()
	assert.NoError(t, err)
	for _, info := range data {
		for _, section := range DEFAULT_INFO_SECTIONS {
			assert.Contains(t, info, "# "+section, "Section "+section+" is missing")
		}
	}

	// info with option or with multiple options without route
	sections := []api.Section{api.Cpu}
	if suite.serverVersion >= "7.0.0" {
		sections = append(sections, api.Memory)
	}
	opts := api.ClusterInfoOptions{
		InfoOptions: &api.InfoOptions{Sections: sections},
		Route:       nil,
	}
	response, err := client.InfoWithOptions(opts)
	assert.NoError(t, err)
	assert.True(t, response.IsMultiValue())
	for _, info := range response.MultiValue() {
		for _, section := range sections {
			assert.Contains(t, strings.ToLower(info), strings.ToLower("# "+string(section)), "Section "+section+" is missing")
		}
	}

	// same sections with random route
	opts = api.ClusterInfoOptions{
		InfoOptions: &api.InfoOptions{Sections: sections},
		Route:       config.RandomRoute.ToPtr(),
	}
	response, err = client.InfoWithOptions(opts)
	assert.NoError(t, err)
	assert.True(t, response.IsSingleValue())
	for _, section := range sections {
		assert.Contains(
			t,
			strings.ToLower(response.SingleValue()),
			strings.ToLower("# "+string(section)),
			"Section "+section+" is missing",
		)
	}

	// default sections, multi node route
	opts = api.ClusterInfoOptions{
		InfoOptions: nil,
		Route:       config.AllPrimaries.ToPtr(),
	}
	response, err = client.InfoWithOptions(opts)
	assert.NoError(t, err)
	assert.True(t, response.IsMultiValue())
	for _, info := range response.MultiValue() {
		for _, section := range DEFAULT_INFO_SECTIONS {
			assert.Contains(t, info, "# "+section, "Section "+section+" is missing")
		}
	}
}

func (suite *GlideTestSuite) TestClusterCustomCommandWithRoute_Info() {
	client := suite.defaultClusterClient()
	route := config.SimpleNodeRoute(config.AllPrimaries)
	result, err := client.CustomCommandWithRoute([]string{"INFO"}, route)
	assert.Nil(suite.T(), err)
	assert.True(suite.T(), result.IsMultiValue())
	multiValue := result.MultiValue()
	for _, value := range multiValue {
		assert.True(suite.T(), strings.Contains(value.(string), "# Stats"))
	}
}

func (suite *GlideTestSuite) TestClusterCustomCommandWithRoute_Echo() {
	client := suite.defaultClusterClient()
	route := config.SimpleNodeRoute(config.RandomRoute)
	result, err := client.CustomCommandWithRoute([]string{"ECHO", "GO GLIDE GO"}, route)
	assert.Nil(suite.T(), err)
	assert.True(suite.T(), result.IsSingleValue())
	assert.Equal(suite.T(), "GO GLIDE GO", result.SingleValue().(string))
}

func (suite *GlideTestSuite) TestClusterCustomCommandWithRoute_InvalidRoute() {
	client := suite.defaultClusterClient()
	invalidRoute := config.NewByAddressRoute("invalidHost", 9999)
	result, err := client.CustomCommandWithRoute([]string{"PING"}, invalidRoute)
	assert.NotNil(suite.T(), err)
	assert.True(suite.T(), result.IsEmpty())
}

func (suite *GlideTestSuite) TestClusterCustomCommandWithRoute_AllNodes() {
	client := suite.defaultClusterClient()
	route := config.SimpleNodeRoute(config.AllNodes)
	result, err := client.CustomCommandWithRoute([]string{"PING"}, route)
	assert.Nil(suite.T(), err)
	assert.True(suite.T(), result.IsSingleValue())
	assert.Equal(suite.T(), "PONG", result.SingleValue())
}

func (suite *GlideTestSuite) TestPingWithOptions_NoRoute() {
	client := suite.defaultClusterClient()
	options := options.ClusterPingOptions{
		PingOptions: &options.PingOptions{
			Message: "hello",
		},
		Route: nil,
	}
	result, err := client.PingWithOptions(options)
	assert.Nil(suite.T(), err)
	assert.Equal(suite.T(), "hello", result)
}

func (suite *GlideTestSuite) TestPingWithOptions_WithRoute() {
	client := suite.defaultClusterClient()
	route := config.Route(config.AllNodes)
	options := options.ClusterPingOptions{
		PingOptions: &options.PingOptions{
			Message: "hello",
		},
		Route: &route,
	}
	result, err := client.PingWithOptions(options)
	assert.Nil(suite.T(), err)
	assert.Equal(suite.T(), "hello", result)
}

func (suite *GlideTestSuite) TestPingWithOptions_InvalidRoute() {
	client := suite.defaultClusterClient()
	invalidRoute := config.Route(config.NewByAddressRoute("invalidHost", 9999))
	options := options.ClusterPingOptions{
		PingOptions: &options.PingOptions{
			Message: "hello",
		},
		Route: &invalidRoute,
	}
	result, err := client.PingWithOptions(options)
	assert.NotNil(suite.T(), err)
	assert.Empty(suite.T(), result)
}

func (suite *GlideTestSuite) TestTimeWithoutRoute() {
	client := suite.defaultClusterClient()
	options := options.RouteOption{Route: nil}
	result, err := client.TimeWithOptions(options)
	assert.NoError(suite.T(), err)
	assert.NotNil(suite.T(), result)
	assert.False(suite.T(), result.IsEmpty())
	assert.True(suite.T(), result.IsSingleValue())
	assert.NotEmpty(suite.T(), result.SingleValue())
	assert.IsType(suite.T(), "", result.SingleValue()[0])
	assert.Equal(suite.T(), 2, len(result.SingleValue()))
}

func (suite *GlideTestSuite) TestTimeWithAllNodesRoute() {
	client := suite.defaultClusterClient()
	route := config.Route(config.AllNodes)
	options := options.RouteOption{Route: route}
	result, err := client.TimeWithOptions(options)
	assert.NoError(suite.T(), err)
	assert.NotNil(suite.T(), result)
	assert.False(suite.T(), result.IsEmpty())
	assert.True(suite.T(), result.IsMultiValue())

	multiValue := result.MultiValue()
	assert.Greater(suite.T(), len(multiValue), 1)

	for nodeName, timeStrings := range multiValue {
		assert.NotEmpty(suite.T(), timeStrings, "Node %s should have time values", nodeName)
		for _, timeStr := range timeStrings {
			assert.IsType(suite.T(), "", timeStr)
		}
	}
}

func (suite *GlideTestSuite) TestTimeWithRandomRoute() {
	client := suite.defaultClusterClient()
	route := config.Route(config.RandomRoute)
	options := options.RouteOption{Route: route}
	result, err := client.TimeWithOptions(options)
	assert.NoError(suite.T(), err)
	assert.NotNil(suite.T(), result)
	assert.False(suite.T(), result.IsEmpty())
	assert.True(suite.T(), result.IsSingleValue())
	assert.NotEmpty(suite.T(), result.SingleValue())
	assert.IsType(suite.T(), "", result.SingleValue()[0])
	assert.Equal(suite.T(), 2, len(result.SingleValue()))
}

func (suite *GlideTestSuite) TestTimeWithInvalidRoute() {
	client := suite.defaultClusterClient()
	invalidRoute := config.Route(config.NewByAddressRoute("invalidHost", 9999))
	options := options.RouteOption{Route: invalidRoute}
	result, err := client.TimeWithOptions(options)
	assert.NotNil(suite.T(), err)
	assert.True(suite.T(), result.IsEmpty())
	assert.Empty(suite.T(), result.SingleValue())
}

func (suite *GlideTestSuite) TestDBSizeRandomRoute() {
	client := suite.defaultClusterClient()
	route := config.Route(config.RandomRoute)
	options := options.RouteOption{Route: route}
	result, err := client.DBSizeWithOptions(options)
	assert.NoError(suite.T(), err)
	assert.NotNil(suite.T(), result)
	assert.NotEmpty(suite.T(), result)
	assert.Greater(suite.T(), result, int64(0))
}

func (suite *GlideTestSuite) TestEchoCluster() {
	client := suite.defaultClusterClient()
	t := suite.T()

	// echo with option or with multiple options without route
	opts := options.ClusterEchoOptions{
		EchoOptions: &options.EchoOptions{
			Message: "hello",
		},
		RouteOption: &options.RouteOption{Route: nil},
	}
	response, err := client.EchoWithOptions(opts)
	assert.NoError(t, err)
	assert.True(t, response.IsSingleValue())

	// same sections with random route
	route := options.RouteOption{Route: *config.RandomRoute.ToPtr()}
	opts = options.ClusterEchoOptions{
		EchoOptions: &options.EchoOptions{
			Message: "hello",
		},
		RouteOption: &route,
	}
	response, err = client.EchoWithOptions(opts)
	assert.NoError(t, err)
	assert.True(t, response.IsSingleValue())

	// default sections, multi node route
	route = options.RouteOption{Route: *config.AllPrimaries.ToPtr()}
	opts = options.ClusterEchoOptions{
		EchoOptions: &options.EchoOptions{
			Message: "hello",
		},
		RouteOption: &route,
	}
	response, err = client.EchoWithOptions(opts)
	assert.NoError(t, err)
	assert.True(t, response.IsMultiValue())
	for _, messages := range response.MultiValue() {
		assert.Contains(t, strings.ToLower(messages), strings.ToLower("hello"))
	}
}

func (suite *GlideTestSuite) TestClientIdCluster() {
	client := suite.defaultClusterClient()
	t := suite.T()

	// ClientId with option or with multiple options without route
	opts := options.RouteOption{Route: nil}
	response, err := client.ClientIdWithOptions(opts)
	assert.NoError(t, err)
	assert.True(t, response.IsSingleValue())

	// same sections with random route
	route := config.Route(config.RandomRoute)
	opts = options.RouteOption{Route: route}
	response, err = client.ClientIdWithOptions(opts)
	assert.NoError(t, err)
	assert.True(t, response.IsSingleValue())

	// default sections, multi node route
	route = config.Route(config.AllPrimaries)
	opts = options.RouteOption{Route: route}
	response, err = client.ClientIdWithOptions(opts)
	assert.NoError(t, err)
	assert.True(t, response.IsMultiValue())
}
