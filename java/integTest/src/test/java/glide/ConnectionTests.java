/** Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0 */
package glide;

import static glide.TestConfiguration.SERVER_VERSION;
import static glide.TestUtilities.azClusterClientConfig;
import static glide.TestUtilities.commonClientConfig;
import static glide.TestUtilities.commonClusterClientConfig;
import static glide.api.BaseClient.OK;
import static glide.api.models.configuration.RequestRoutingConfiguration.SimpleMultiNodeRoute.ALL_NODES;
import static glide.api.models.configuration.RequestRoutingConfiguration.SlotType.PRIMARY;
import static glide.api.models.configuration.RequestRoutingConfiguration.SlotType.REPLICA;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import glide.api.BaseClient;
import glide.api.GlideClient;
import glide.api.GlideClusterClient;
import glide.api.models.ClusterValue;
import glide.api.models.commands.InfoOptions;
import glide.api.models.configuration.AdvancedGlideClientConfiguration;
import glide.api.models.configuration.AdvancedGlideClusterClientConfiguration;
import glide.api.models.configuration.BackoffStrategy;
import glide.api.models.configuration.ReadFrom;
import glide.api.models.configuration.RequestRoutingConfiguration;
import glide.api.models.exceptions.ClosingException;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.stream.Stream;
import lombok.SneakyThrows;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

@Timeout(10) // seconds
public class ConnectionTests {

    @Test
    @SneakyThrows
    public void basic_client() {
        var regularClient = GlideClient.createClient(commonClientConfig().build()).get();
        regularClient.close();
    }

    @Test
    @SneakyThrows
    public void cluster_client() {
        var clusterClient = GlideClusterClient.createClient(commonClusterClientConfig().build()).get();
        clusterClient.close();
    }

    @SneakyThrows
    public GlideClusterClient createAzTestClient(String az) {
        return GlideClusterClient.createClient(
                        azClusterClientConfig()
                                .readFrom(ReadFrom.AZ_AFFINITY)
                                .clientAZ(az)
                                .requestTimeout(2000)
                                .build())
                .get();
    }

    @SneakyThrows
    public BaseClient createConnectionTimeoutClient(
            Boolean clusterMode,
            int connectionTimeout,
            int requestTimeout,
            BackoffStrategy backoffStrategy) {
        if (clusterMode) {
            var advancedConfiguration =
                    AdvancedGlideClusterClientConfiguration.builder()
                            .connectionTimeout(connectionTimeout)
                            .build();
            return GlideClusterClient.createClient(
                            commonClusterClientConfig()
                                    .advancedConfiguration(advancedConfiguration)
                                    .requestTimeout(requestTimeout)
                                    .build())
                    .get();
        }
        var advancedConfiguration =
                AdvancedGlideClientConfiguration.builder().connectionTimeout(connectionTimeout).build();
        return GlideClient.createClient(
                        commonClientConfig()
                                .advancedConfiguration(advancedConfiguration)
                                .requestTimeout(requestTimeout)
                                .reconnectStrategy(backoffStrategy)
                                .build())
                .get();
    }

    /**
     * Test that the client with AZ affinity strategy routes in a round-robin manner to all replicas
     * within the specified AZ.
     */
    @SneakyThrows
    @Test
    public void test_routing_by_slot_to_replica_with_az_affinity_strategy_to_all_replicas() {
        assumeTrue(SERVER_VERSION.isGreaterThanOrEqualTo("8.0.0"), "Skip for versions below 8");

        String az = "us-east-1a";

        // Create client for setting the configs
        GlideClusterClient configSetClient =
                GlideClusterClient.createClient(azClusterClientConfig().requestTimeout(2000).build()).get();
        assertEquals(configSetClient.configResetStat().get(), OK);

        // Get Replica Count for current cluster
        var clusterInfo =
                configSetClient
                        .customCommand(
                                new String[] {"INFO", "REPLICATION"},
                                new RequestRoutingConfiguration.SlotKeyRoute("key", PRIMARY))
                        .get();
        long nReplicas =
                Long.parseLong(
                        Stream.of(((String) clusterInfo.getSingleValue()).split("\\R"))
                                .map(line -> line.split(":", 2))
                                .filter(parts -> parts.length == 2 && parts[0].trim().equals("connected_slaves"))
                                .map(parts -> parts[1].trim())
                                .findFirst()
                                .get());
        long nGetCalls = 3 * nReplicas;
        String getCmdstat = String.format("cmdstat_get:calls=%d", 3);

        // Setting AZ for all Nodes
        configSetClient.configSet(Map.of("availability-zone", az), ALL_NODES).get();
        configSetClient.close();

        // Creating Client with AZ configuration for testing
        GlideClusterClient azTestClient = createAzTestClient(az);
        ClusterValue<Map<String, String>> azGetResult =
                azTestClient.configGet(new String[] {"availability-zone"}, ALL_NODES).get();
        Map<String, Map<String, String>> azData = azGetResult.getMultiValue();

        // Check that all replicas have the availability zone set to the az
        for (var entry : azData.entrySet()) {
            assertEquals(az, entry.getValue().get("availability-zone"));
        }

        // execute GET commands
        for (int i = 0; i < nGetCalls; i++) {
            azTestClient.get("foo").get();
        }

        ClusterValue<String> infoResult =
                azTestClient.info(new InfoOptions.Section[] {InfoOptions.Section.ALL}, ALL_NODES).get();
        Map<String, String> infoData = infoResult.getMultiValue();

        // Check that all replicas have the same number of GET calls
        long matchingEntries =
                infoData.values().stream()
                        .filter(value -> value.contains(getCmdstat) && value.contains(az))
                        .count();
        assertEquals(nReplicas, matchingEntries);
        azTestClient.close();
    }

    /**
     * Test that the client with az affinity strategy will only route to the 1 replica with the same
     * az.
     */
    @SneakyThrows
    @Test
    public void test_routing_with_az_affinity_strategy_to_1_replica() {
        assumeTrue(SERVER_VERSION.isGreaterThanOrEqualTo("8.0.0"), "Skip for versions below 8");

        String az = "us-east-1a";
        int nGetCalls = 3;
        String getCmdstat = String.format("cmdstat_get:calls=%d", nGetCalls);

        GlideClusterClient configSetClient =
                GlideClusterClient.createClient(azClusterClientConfig().requestTimeout(2000).build()).get();

        // reset availability zone for all nodes
        configSetClient.configSet(Map.of("availability-zone", ""), ALL_NODES).get();
        assertEquals(configSetClient.configResetStat().get(), OK);

        Long fooSlotKey =
                (Long)
                        configSetClient
                                .customCommand(new String[] {"CLUSTER", "KEYSLOT", "foo"})
                                .get()
                                .getSingleValue();
        int convertedKey = Integer.parseInt(fooSlotKey.toString());
        configSetClient
                .configSet(
                        Map.of("availability-zone", az),
                        new RequestRoutingConfiguration.SlotIdRoute(convertedKey, REPLICA))
                .get();
        configSetClient.close();

        GlideClusterClient azTestClient = createAzTestClient(az);

        // execute GET commands
        for (int i = 0; i < nGetCalls; i++) {
            azTestClient.get("foo").get();
        }

        ClusterValue<String> infoResult =
                azTestClient.info(new InfoOptions.Section[] {InfoOptions.Section.ALL}, ALL_NODES).get();
        Map<String, String> infoData = infoResult.getMultiValue();

        // Check that all replicas have the same number of GET calls
        long matchingEntries =
                infoData.values().stream()
                        .filter(value -> value.contains(getCmdstat) && value.contains(az))
                        .count();
        assertEquals(1, matchingEntries);
        azTestClient.close();
    }

    @SneakyThrows
    @Test
    public void test_az_affinity_non_existing_az() {
        assumeTrue(SERVER_VERSION.isGreaterThanOrEqualTo("8.0.0"), "Skip for versions below 8");

        int nGetCalls = 4;
        int nReplicaCalls = 1;
        String getCmdstat = String.format("cmdstat_get:calls=%d", nReplicaCalls);

        GlideClusterClient azTestClient = createAzTestClient("non-existing-az");
        assertEquals(azTestClient.configResetStat(ALL_NODES).get(), OK);

        // execute GET commands
        for (int i = 0; i < nGetCalls; i++) {
            azTestClient.get("foo").get();
        }

        ClusterValue<String> infoResult =
                azTestClient
                        .info(new InfoOptions.Section[] {InfoOptions.Section.COMMANDSTATS}, ALL_NODES)
                        .get();
        Map<String, String> infoData = infoResult.getMultiValue();

        //  We expect the calls to be distributed evenly among the replicas
        long matchingEntries =
                infoData.values().stream().filter(value -> value.contains(getCmdstat)).count();
        assertEquals(4, matchingEntries);
        azTestClient.close();
    }

    @SneakyThrows
    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    public void test_connection_timeout(boolean clusterMode) {
        assumeTrue(
                SERVER_VERSION.isGreaterThanOrEqualTo("7.0.0"),
                "DEBUG command only allowed from ver 7.0.0");

        var backoffStrategy =
                BackoffStrategy.builder().exponentBase(2).factor(100).numOfRetries(1).build();
        var client = createConnectionTimeoutClient(clusterMode, 250, 20000, backoffStrategy);

        // Run a long-running DEBUG SLEEP command to simulate a blocking operation
        CompletableFuture<Void> runDebugSleep =
                CompletableFuture.runAsync(
                        () -> {
                            try {
                                if (client instanceof GlideClusterClient) {
                                    ((GlideClusterClient) client)
                                            .customCommand(new String[] {"DEBUG", "sleep", "7"}, ALL_NODES)
                                            .get();
                                } else if (client instanceof GlideClient) {
                                    ((GlideClient) client).customCommand(new String[] {"DEBUG", "sleep", "7"}).get();
                                }
                            } catch (InterruptedException | ExecutionException e) {
                                throw new RuntimeException("Error during DEBUG SLEEP command", e);
                            }
                        });

        // Test case 1: Client connection failure due to timeout
        CompletableFuture<Void> failToConnect =
                CompletableFuture.runAsync(
                        () -> {
                            try {
                                // Attempt to connect with a small timeout
                                Thread.sleep(1000);
                                ExecutionException executionException =
                                        assertThrows(
                                                ExecutionException.class,
                                                () ->
                                                        createConnectionTimeoutClient(clusterMode, 100, 250, backoffStrategy));
                                assertInstanceOf(ClosingException.class, executionException.getCause());
                                assertTrue(executionException.getMessage().toLowerCase().contains("timed out"));
                            } catch (InterruptedException e) {
                                Thread.currentThread().interrupt();
                                throw new RuntimeException("Thread was interrupted", e);
                            }
                        });

        // Test case 2: Client connection success
        CompletableFuture<Void> connectToClient =
                CompletableFuture.runAsync(
                        () -> {
                            try {
                                // Create a second client with a connection timeout of 10 seconds
                                Thread.sleep(1000); // Wait to ensure the debug sleep command is running
                                var timeoutClient =
                                        createConnectionTimeoutClient(clusterMode, 10000, 250, backoffStrategy);
                                assertEquals(timeoutClient.set("key", "value").get(), "OK");
                                timeoutClient.close();
                            } catch (Exception e) {
                                throw new RuntimeException("Error during successful connection attempt", e);
                            }
                        });

        // Run all the futures concurrently
        CompletableFuture.allOf(runDebugSleep, failToConnect, connectToClient).join();

        // Clean up the main client
        if (client != null) {
            client.close();
        }
    }
}
