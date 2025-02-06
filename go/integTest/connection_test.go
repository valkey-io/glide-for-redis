// Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

package integTest

import (
	"github.com/stretchr/testify/assert"
	"github.com/valkey-io/valkey-glide/go/glide/api"
	"github.com/valkey-io/valkey-glide/go/glide/api/errors"
)

func (suite *GlideTestSuite) TestStandaloneConnect() {
	config := api.NewGlideClientConfiguration().
		WithAddress(&suite.standaloneHosts[0])
	client, err := api.NewGlideClient(config)

	assert.Nil(suite.T(), err)
	assert.NotNil(suite.T(), client)

	client.Close()
}

func (suite *GlideTestSuite) TestClusterConnect() {
	config := api.NewGlideClusterClientConfiguration()
	for _, host := range suite.clusterHosts {
		config.WithAddress(&host)
	}

	client, err := api.NewGlideClusterClient(config)

	assert.Nil(suite.T(), err)
	assert.NotNil(suite.T(), client)

	client.Close()
}

func (suite *GlideTestSuite) TestClusterConnect_singlePort() {
	config := api.NewGlideClusterClientConfiguration().
		WithAddress(&suite.clusterHosts[0])

	client, err := api.NewGlideClusterClient(config)

	assert.Nil(suite.T(), err)
	assert.NotNil(suite.T(), client)

	client.Close()
}

func (suite *GlideTestSuite) TestConnectWithInvalidAddress() {
	config := api.NewGlideClientConfiguration().
		WithAddress(&api.NodeAddress{Host: "invalid-host"})
	client, err := api.NewGlideClient(config)

	assert.Nil(suite.T(), client)
	assert.NotNil(suite.T(), err)
	assert.IsType(suite.T(), &errors.ConnectionError{}, err)
}
