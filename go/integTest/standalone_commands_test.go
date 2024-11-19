// Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

package integTest

import (
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/valkey-io/valkey-glide/go/glide/api"
)

func (suite *GlideTestSuite) TestCustomCommandInfo() {
	client := suite.defaultClient()
	result, err := client.CustomCommand([]string{"INFO"})

	assert.Nil(suite.T(), err)
	assert.IsType(suite.T(), "", result)
	strResult := result.(string)
	assert.True(suite.T(), strings.Contains(strResult, "# Stats"))
}

func (suite *GlideTestSuite) TestCustomCommandPing() {
	client := suite.defaultClient()
	result, err := client.CustomCommand([]string{"PING"})

	assert.Nil(suite.T(), err)
	assert.Equal(suite.T(), "PONG", result)
}

func (suite *GlideTestSuite) TestCustomCommandClientInfo() {
	clientName := "TEST_CLIENT_NAME"
	config := api.NewGlideClientConfiguration().
		WithAddress(&api.NodeAddress{Port: suite.standalonePorts[0]}).
		WithClientName(clientName)
	client := suite.client(config)

	result, err := client.CustomCommand([]string{"CLIENT", "INFO"})

	assert.Nil(suite.T(), err)
	assert.IsType(suite.T(), "", result)
	strResult := result.(string)
	assert.True(suite.T(), strings.Contains(strResult, fmt.Sprintf("name=%s", clientName)))
}

func (suite *GlideTestSuite) TestCustomCommand_invalidCommand() {
	client := suite.defaultClient()
	result, err := client.CustomCommand([]string{"pewpew"})

	assert.Nil(suite.T(), result)
	assert.NotNil(suite.T(), err)
	assert.IsType(suite.T(), &api.RequestError{}, err)
}

func (suite *GlideTestSuite) TestCustomCommand_invalidArgs() {
	client := suite.defaultClient()
	result, err := client.CustomCommand([]string{"ping", "pang", "pong"})

	assert.Nil(suite.T(), result)
	assert.NotNil(suite.T(), err)
	assert.IsType(suite.T(), &api.RequestError{}, err)
}

func (suite *GlideTestSuite) TestCustomCommand_closedClient() {
	client := suite.defaultClient()
	client.Close()

	result, err := client.CustomCommand([]string{"ping"})

	assert.Nil(suite.T(), result)
	assert.NotNil(suite.T(), err)
	assert.IsType(suite.T(), &api.ClosingError{}, err)
}

func (suite *GlideTestSuite) TestConfigSetAndGet_multipleArgs() {
	client := suite.defaultClient()

	if suite.serverVersion < "7.0.0" {
		suite.T().Skip("This feature is added in version 7")
	}
	configMap := map[string]string{"timeout": "1000", "maxmemory": "1GB"}
	key1 := api.CreateStringResult("timeout")
	value1 := api.CreateStringResult("1000")
	key2 := api.CreateStringResult("maxmemory")
	value2 := api.CreateStringResult("1073741824")
	resultConfigMap := map[api.Result[string]]api.Result[string]{key1: value1, key2: value2}
	result, err := client.ConfigSet(configMap)
	assert.Nil(suite.T(), err)
	assert.Equal(suite.T(), "OK", result.Value())

	result2, err := client.ConfigGet([]string{"timeout", "maxmemory"})
	assert.Nil(suite.T(), err)
	assert.Equal(suite.T(), resultConfigMap, result2)
}

func (suite *GlideTestSuite) TestConfigSetAndGet_noArgs() {
	client := suite.defaultClient()

	configMap := map[string]string{}

	result, err := client.ConfigSet(configMap)
	assert.Equal(suite.T(), api.CreateNilStringResult(), result)
	assert.NotNil(suite.T(), err)
	assert.IsType(suite.T(), &api.RequestError{}, err)

	result2, err := client.ConfigGet([]string{})
	assert.Nil(suite.T(), result2)
	assert.NotNil(suite.T(), err)
	assert.IsType(suite.T(), &api.RequestError{}, err)
}

func (suite *GlideTestSuite) TestConfigSetAndGet_invalidArgs() {
	client := suite.defaultClient()

	configMap := map[string]string{"time": "1000"}

	result, err := client.ConfigSet(configMap)
	assert.Equal(suite.T(), api.CreateNilStringResult(), result)
	assert.NotNil(suite.T(), err)
	assert.IsType(suite.T(), &api.RequestError{}, err)

	result2, err := client.ConfigGet([]string{"time"})
	assert.Equal(suite.T(), map[api.Result[string]]api.Result[string]{}, result2)
	assert.Nil(suite.T(), err)
}

func (suite *GlideTestSuite) TestUpdateConnectionPassword() {
	suite.runWithDefaultClientAndAuth(func(client api.GlideClient) {
		newPass := "newpass"
		res, err := client.UpdateConnectionPassword(&newPass, false)
		suite.verifyOK(res, err)

		key := uuid.NewString()
		value := uuid.NewString()

		set, err := client.Set(key, value)
		suite.verifyOK(set, err)

		get, err := client.Get(key)
		suite.verifyOK(set, err)
		assert.Equal(suite.T(), get.Value(), value)
	})
}

func (suite *GlideTestSuite) TestUpdateConnectionPassword_No_Server_Auth() {
	suite.runWithDefaultClientAndAuth(func(client api.GlideClient) {
		newPass := "newpass"
		res, err := client.UpdateConnectionPassword(&newPass, true)

		assert.NotNil(suite.T(), err)
		assert.IsType(suite.T(), &api.RequestError{}, err)
		assert.Empty(suite.T(), res.Value())
	})
}

func (suite *GlideTestSuite) TestUpdateConnectionPassword_Password_long() {
	suite.runWithDefaultClientAndAuth(func(client api.GlideClient) {
		password := strings.Repeat("p", 1000)

		res, err := client.UpdateConnectionPassword(&password, false)
		suite.verifyOK(res, err)
	})
}
