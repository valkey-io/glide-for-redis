// Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

package integTest

import (
	"errors"
	"flag"
	"fmt"
	"log"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
	"github.com/valkey-io/valkey-glide/go/api"
	"github.com/valkey-io/valkey-glide/go/api/config"
)

type GlideTestSuite struct {
	suite.Suite
	standaloneHosts []api.NodeAddress
	clusterHosts    []api.NodeAddress
	tls             bool
	serverVersion   string
	clients         []api.GlideClientCommands
	clusterClients  []api.GlideClusterClientCommands
}

var (
	tls             = flag.Bool("tls", false, "one")
	clusterHosts    = flag.String("cluster-endpoints", "", "two")
	standaloneHosts = flag.String("standalone-endpoints", "", "three")
)

func (suite *GlideTestSuite) SetupSuite() {
	// Stop cluster in case previous test run was interrupted or crashed and didn't stop.
	// If an error occurs, we ignore it in case the servers actually were stopped before running this.
	runClusterManager(suite, []string{"stop", "--prefix", "cluster"}, true)

	// Delete dirs if stop failed due to https://github.com/valkey-io/valkey-glide/issues/849
	err := os.RemoveAll("../../utils/clusters")
	if err != nil && !os.IsNotExist(err) {
		log.Fatal(err)
	}

	cmd := []string{}
	suite.tls = false
	if *tls {
		cmd = []string{"--tls"}
		suite.tls = true
	}
	suite.T().Logf("TLS = %t", suite.tls)

	// Note: code does not start standalone if cluster hosts are given and vice versa
	startServer := true

	if *standaloneHosts != "" {
		suite.standaloneHosts = parseHosts(suite, *standaloneHosts)
		startServer = false
	}
	if *clusterHosts != "" {
		suite.clusterHosts = parseHosts(suite, *clusterHosts)
		startServer = false
	}
	if startServer {
		// Start standalone instance
		clusterManagerOutput := runClusterManager(suite, append(cmd, "start", "-r", "3"), false)
		suite.standaloneHosts = extractAddresses(suite, clusterManagerOutput)

		// Start cluster
		clusterManagerOutput = runClusterManager(suite, append(cmd, "start", "--cluster-mode", "-r", "3"), false)
		suite.clusterHosts = extractAddresses(suite, clusterManagerOutput)
	}

	suite.T().Logf("Standalone hosts = %s", fmt.Sprint(suite.standaloneHosts))
	suite.T().Logf("Cluster hosts = %s", fmt.Sprint(suite.clusterHosts))

	// Get server version
	suite.serverVersion = getServerVersion(suite)
	suite.T().Logf("Detected server version = %s", suite.serverVersion)
}

func parseHosts(suite *GlideTestSuite, addresses string) []api.NodeAddress {
	var result []api.NodeAddress

	addressList := strings.Split(addresses, ",")
	for _, address := range addressList {
		parts := strings.Split(address, ":")
		port, err := strconv.Atoi(parts[1])
		if err != nil {
			suite.T().Fatalf("Failed to parse port from string %s: %s", parts[1], err.Error())
		}

		result = append(result, api.NodeAddress{Host: parts[0], Port: port})
	}
	return result
}

func extractAddresses(suite *GlideTestSuite, output string) []api.NodeAddress {
	for _, line := range strings.Split(output, "\n") {
		if !strings.HasPrefix(line, "CLUSTER_NODES=") {
			continue
		}

		addresses := strings.Split(line, "=")[1]
		return parseHosts(suite, addresses)
	}

	suite.T().Fatalf("Failed to parse port from cluster_manager.py output")
	return []api.NodeAddress{}
}

func runClusterManager(suite *GlideTestSuite, args []string, ignoreExitCode bool) string {
	pythonArgs := append([]string{"../../utils/cluster_manager.py"}, args...)
	output, err := exec.Command("python3", pythonArgs...).CombinedOutput()
	if len(output) > 0 && !ignoreExitCode {
		suite.T().Logf("cluster_manager.py output:\n====\n%s\n====\n", string(output))
	}

	if err != nil {
		var exitError *exec.ExitError
		isExitError := errors.As(err, &exitError)
		if !isExitError {
			suite.T().Fatalf("Unexpected error while executing cluster_manager.py: %s", err.Error())
		}

		if len(exitError.Stderr) > 0 {
			suite.T().Logf("cluster_manager.py stderr:\n====\n%s\n====\n", string(exitError.Stderr))
		}

		if !ignoreExitCode {
			suite.T().Fatalf("cluster_manager.py script failed: %s", exitError.Error())
		}
	}

	return string(output)
}

func getServerVersion(suite *GlideTestSuite) string {
	var err error = nil
	if len(suite.standaloneHosts) > 0 {
		clientConfig := api.NewGlideClientConfiguration().
			WithAddress(&suite.standaloneHosts[0]).
			WithUseTLS(suite.tls).
			WithRequestTimeout(5000)

		client, err := api.NewGlideClient(clientConfig)
		if err == nil && client != nil {
			defer client.Close()
			info, _ := client.InfoWithOptions(api.InfoOptions{Sections: []api.Section{api.Server}})
			return extractServerVersion(suite, info)
		}
	}
	if len(suite.clusterHosts) == 0 {
		if err != nil {
			suite.T().Fatalf("No cluster hosts configured, standalone failed with %s", err.Error())
		}
		suite.T().Fatal("No server hosts configured")
	}

	clientConfig := api.NewGlideClusterClientConfiguration().
		WithAddress(&suite.clusterHosts[0]).
		WithUseTLS(suite.tls).
		WithRequestTimeout(5000)

	client, err := api.NewGlideClusterClient(clientConfig)
	if err == nil && client != nil {
		defer client.Close()

		info, _ := client.InfoWithOptions(
			api.ClusterInfoOptions{
				InfoOptions: &api.InfoOptions{Sections: []api.Section{api.Server}},
				Route:       config.RandomRoute.ToPtr(),
			},
		)
		return extractServerVersion(suite, info.SingleValue())
	}
	suite.T().Fatalf("Can't connect to any server to get version: %s", err.Error())
	return ""
}

func extractServerVersion(suite *GlideTestSuite, output string) string {
	// output format:
	//   # Server
	//   redis_version:7.2.3
	//	 ...
	// It can contain `redis_version` or `valkey_version` key or both. If both, `valkey_version` should be taken
	for _, line := range strings.Split(output, "\r\n") {
		if strings.Contains(line, "valkey_version") {
			return strings.Split(line, ":")[1]
		}
	}

	for _, line := range strings.Split(output, "\r\n") {
		if strings.Contains(line, "redis_version") {
			return strings.Split(line, ":")[1]
		}
	}
	suite.T().Fatalf("Can't read server version from INFO command output: %s", output)
	return ""
}

func TestGlideTestSuite(t *testing.T) {
	suite.Run(t, new(GlideTestSuite))
}

func (suite *GlideTestSuite) TearDownSuite() {
	runClusterManager(suite, []string{"stop", "--prefix", "cluster", "--keep-folder"}, false)
}

func (suite *GlideTestSuite) TearDownTest() {
	for _, client := range suite.clients {
		client.Close()
	}

	for _, client := range suite.clusterClients {
		client.Close()
	}
}

func (suite *GlideTestSuite) runWithDefaultClients(test func(client api.BaseClient)) {
	clients := suite.getDefaultClients()
	suite.runWithClients(clients, test)
}

func (suite *GlideTestSuite) getDefaultClients() []api.BaseClient {
	return []api.BaseClient{suite.defaultClient(), suite.defaultClusterClient()}
}

func (suite *GlideTestSuite) defaultClient() api.GlideClientCommands {
	config := api.NewGlideClientConfiguration().
		WithAddress(&suite.standaloneHosts[0]).
		WithUseTLS(suite.tls).
		WithRequestTimeout(5000)
	return suite.client(config)
}

func (suite *GlideTestSuite) client(config *api.GlideClientConfiguration) api.GlideClientCommands {
	client, err := api.NewGlideClient(config)

	assert.Nil(suite.T(), err)
	assert.NotNil(suite.T(), client)

	suite.clients = append(suite.clients, client)
	return client
}

func (suite *GlideTestSuite) defaultClusterClient() api.GlideClusterClientCommands {
	config := api.NewGlideClusterClientConfiguration().
		WithAddress(&suite.clusterHosts[0]).
		WithUseTLS(suite.tls).
		WithRequestTimeout(5000)
	return suite.clusterClient(config)
}

func (suite *GlideTestSuite) clusterClient(config *api.GlideClusterClientConfiguration) api.GlideClusterClientCommands {
	client, err := api.NewGlideClusterClient(config)

	assert.Nil(suite.T(), err)
	assert.NotNil(suite.T(), client)

	suite.clusterClients = append(suite.clusterClients, client)
	return client
}

func (suite *GlideTestSuite) runWithClients(clients []api.BaseClient, test func(client api.BaseClient)) {
	for _, client := range clients {
		suite.T().Run(fmt.Sprintf("%T", client)[5:], func(t *testing.T) {
			test(client)
		})
	}
}

func (suite *GlideTestSuite) verifyOK(result string, err error) {
	assert.Nil(suite.T(), err)
	assert.Equal(suite.T(), api.OK, result)
}

func (suite *GlideTestSuite) SkipIfServerVersionLowerThanBy(version string) {
	if suite.serverVersion < version {
		suite.T().Skipf("This feature is added in version %s", version)
	}
}
