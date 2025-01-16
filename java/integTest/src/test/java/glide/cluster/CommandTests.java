/** Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0 */
package glide.cluster;

import static glide.TestConfiguration.SERVER_VERSION;
import static glide.TestUtilities.assertDeepEquals;
import static glide.TestUtilities.checkFunctionListResponse;
import static glide.TestUtilities.checkFunctionListResponseBinary;
import static glide.TestUtilities.checkFunctionStatsBinaryResponse;
import static glide.TestUtilities.checkFunctionStatsResponse;
import static glide.TestUtilities.commonClusterClientConfig;
import static glide.TestUtilities.createLongRunningLuaScript;
import static glide.TestUtilities.createLuaLibWithLongRunningFunction;
import static glide.TestUtilities.generateLuaLibCode;
import static glide.TestUtilities.generateLuaLibCodeBinary;
import static glide.TestUtilities.getFirstEntryFromMultiValue;
import static glide.TestUtilities.getValueFromInfo;
import static glide.TestUtilities.parseInfoResponseToMap;
import static glide.TestUtilities.waitForNotBusy;
import static glide.api.BaseClient.OK;
import static glide.api.models.GlideString.gs;
import static glide.api.models.commands.FlushMode.ASYNC;
import static glide.api.models.commands.FlushMode.SYNC;
import static glide.api.models.commands.InfoOptions.Section.CLIENTS;
import static glide.api.models.commands.InfoOptions.Section.CLUSTER;
import static glide.api.models.commands.InfoOptions.Section.COMMANDSTATS;
import static glide.api.models.commands.InfoOptions.Section.CPU;
import static glide.api.models.commands.InfoOptions.Section.EVERYTHING;
import static glide.api.models.commands.InfoOptions.Section.MEMORY;
import static glide.api.models.commands.InfoOptions.Section.REPLICATION;
import static glide.api.models.commands.InfoOptions.Section.SERVER;
import static glide.api.models.commands.InfoOptions.Section.STATS;
import static glide.api.models.commands.ScoreFilter.MAX;
import static glide.api.models.commands.SortBaseOptions.OrderBy.DESC;
import static glide.api.models.commands.function.FunctionRestorePolicy.APPEND;
import static glide.api.models.commands.function.FunctionRestorePolicy.FLUSH;
import static glide.api.models.commands.function.FunctionRestorePolicy.REPLACE;
import static glide.api.models.configuration.RequestRoutingConfiguration.SimpleMultiNodeRoute.ALL_NODES;
import static glide.api.models.configuration.RequestRoutingConfiguration.SimpleMultiNodeRoute.ALL_PRIMARIES;
import static glide.api.models.configuration.RequestRoutingConfiguration.SimpleSingleNodeRoute.RANDOM;
import static glide.api.models.configuration.RequestRoutingConfiguration.SlotType.PRIMARY;
import static glide.api.models.configuration.RequestRoutingConfiguration.SlotType.REPLICA;
import static glide.utils.ArrayTransformUtils.concatenateArrays;
import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;
import static org.junit.jupiter.api.Named.named;

import glide.api.GlideClusterClient;
import glide.api.models.ClusterTransaction;
import glide.api.models.ClusterValue;
import glide.api.models.GlideString;
import glide.api.models.Script;
import glide.api.models.commands.FlushMode;
import glide.api.models.commands.InfoOptions.Section;
import glide.api.models.commands.ListDirection;
import glide.api.models.commands.RangeOptions.RangeByIndex;
import glide.api.models.commands.ScriptOptions;
import glide.api.models.commands.ScriptOptionsGlideString;
import glide.api.models.commands.SortBaseOptions;
import glide.api.models.commands.SortOptions;
import glide.api.models.commands.SortOptionsBinary;
import glide.api.models.commands.WeightAggregateOptions.KeyArray;
import glide.api.models.commands.bitmap.BitwiseOperation;
import glide.api.models.commands.geospatial.GeoSearchOrigin;
import glide.api.models.commands.geospatial.GeoSearchResultOptions;
import glide.api.models.commands.geospatial.GeoSearchShape;
import glide.api.models.commands.geospatial.GeoSearchStoreOptions;
import glide.api.models.commands.geospatial.GeoUnit;
import glide.api.models.commands.scan.ClusterScanCursor;
import glide.api.models.commands.scan.ScanOptions;
import glide.api.models.configuration.ProtocolVersion;
import glide.api.models.configuration.RequestRoutingConfiguration;
import glide.api.models.configuration.RequestRoutingConfiguration.ByAddressRoute;
import glide.api.models.configuration.RequestRoutingConfiguration.Route;
import glide.api.models.configuration.RequestRoutingConfiguration.SingleNodeRoute;
import glide.api.models.configuration.RequestRoutingConfiguration.SlotKeyRoute;
import glide.api.models.exceptions.GlideException;
import glide.api.models.exceptions.RequestException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.SneakyThrows;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

@Timeout(30) // seconds
public class CommandTests {

    private static final String INITIAL_VALUE = "VALUE";

    public static final List<String> DEFAULT_INFO_SECTIONS =
            List.of(
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
                    "Keyspace");
    public static final List<String> EVERYTHING_INFO_SECTIONS =
            SERVER_VERSION.isGreaterThanOrEqualTo("7.0.0")
                    // Latencystats was added in Valkey 7
                    ? List.of(
                            "Server",
                            "Clients",
                            "Memory",
                            "Persistence",
                            "Stats",
                            "Replication",
                            "CPU",
                            "Modules",
                            "Commandstats",
                            "Errorstats",
                            "Latencystats",
                            "Cluster",
                            "Keyspace")
                    : List.of(
                            "Server",
                            "Clients",
                            "Memory",
                            "Persistence",
                            "Stats",
                            "Replication",
                            "CPU",
                            "Modules",
                            "Commandstats",
                            "Errorstats",
                            "Cluster",
                            "Keyspace");

    @SneakyThrows
    public static Stream<Arguments> getClients() {
        return Stream.of(
                Arguments.of(
                        named(
                                "RESP2",
                                GlideClusterClient.createClient(
                                                commonClusterClientConfig()
                                                        .requestTimeout(7000)
                                                        .protocol(ProtocolVersion.RESP2)
                                                        .build())
                                        .get())),
                Arguments.of(
                        named(
                                "RESP3",
                                GlideClusterClient.createClient(
                                                commonClusterClientConfig()
                                                        .requestTimeout(7000)
                                                        .protocol(ProtocolVersion.RESP3)
                                                        .build())
                                        .get())));
    }

    private static Stream<Arguments> getTestScenarios() {
        return getClients()
                .flatMap(
                        clientArg ->
                                Stream.of(
                                        Arguments.of(clientArg.get()[0], named("single node route", true)),
                                        Arguments.of(clientArg.get()[0], named("multi node route", false))));
    }

    public static Stream<Arguments> getClientsAndPrefixes() {
        return getClients()
                .flatMap(
                        clientArg ->
                                Stream.of(
                                        Arguments.of(clientArg.get()[0], "abc"),
                                        Arguments.of(clientArg.get()[0], "kln"),
                                        Arguments.of(clientArg.get()[0], "xyz")));
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void custom_command_info(GlideClusterClient clusterClient) {
        ClusterValue<Object> data = clusterClient.customCommand(new String[] {"info"}).get();
        assertTrue(data.hasMultiData());
        for (Object info : data.getMultiValue().values()) {
            assertTrue(((String) info).contains("# Stats"));
        }
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void custom_command_info_binary(GlideClusterClient clusterClient) {
        ClusterValue<Object> data = clusterClient.customCommand(new GlideString[] {gs("info")}).get();
        assertTrue(data.hasMultiData());
        for (Object info : data.getMultiValue().values()) {
            assertInstanceOf(GlideString.class, info);
            assertTrue(info.toString().contains("# Stats"));
        }
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void custom_command_ping(GlideClusterClient clusterClient) {
        ClusterValue<Object> data = clusterClient.customCommand(new String[] {"ping"}).get();
        assertEquals("PONG", data.getSingleValue());
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void custom_command_ping_binary(GlideClusterClient clusterClient) {
        ClusterValue<Object> data = clusterClient.customCommand(new GlideString[] {gs("ping")}).get();
        assertEquals(gs("PONG"), data.getSingleValue());
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void custom_command_binary_with_route(GlideClusterClient clusterClient) {
        ClusterValue<Object> data =
                clusterClient.customCommand(new GlideString[] {gs("info")}, ALL_NODES).get();
        for (Object info : data.getMultiValue().values()) {
            assertInstanceOf(GlideString.class, info);
            assertTrue(info.toString().contains("# Stats"));
        }

        data = clusterClient.customCommand(new GlideString[] {gs("info")}, RANDOM).get();
        assertInstanceOf(GlideString.class, data.getSingleValue());
        assertTrue(data.getSingleValue().toString().contains("# Stats"));
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void custom_command_del_returns_a_number(GlideClusterClient clusterClient) {
        String key = "custom_command_del_returns_a_number";
        clusterClient.set(key, INITIAL_VALUE).get();
        var del = clusterClient.customCommand(new String[] {"DEL", key}).get();
        assertEquals(1L, del.getSingleValue());
        var data = clusterClient.get(key).get();
        assertNull(data);
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void ping(GlideClusterClient clusterClient) {
        String data = clusterClient.ping().get();
        assertEquals("PONG", data);
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void ping_with_message(GlideClusterClient clusterClient) {
        String data = clusterClient.ping("H3LL0").get();
        assertEquals("H3LL0", data);
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void ping_binary_with_message(GlideClusterClient clusterClient) {
        GlideString data = clusterClient.ping(gs("H3LL0")).get();
        assertEquals(gs("H3LL0"), data);
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void ping_with_route(GlideClusterClient clusterClient) {
        String data = clusterClient.ping(ALL_NODES).get();
        assertEquals("PONG", data);
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void ping_with_message_with_route(GlideClusterClient clusterClient) {
        String data = clusterClient.ping("H3LL0", ALL_PRIMARIES).get();
        assertEquals("H3LL0", data);
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void ping_binary_with_message_with_route(GlideClusterClient clusterClient) {
        GlideString data = clusterClient.ping(gs("H3LL0"), ALL_PRIMARIES).get();
        assertEquals(gs("H3LL0"), data);
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void info_without_options(GlideClusterClient clusterClient) {
        ClusterValue<String> data = clusterClient.info().get();
        assertTrue(data.hasMultiData());
        for (String info : data.getMultiValue().values()) {
            for (String section : DEFAULT_INFO_SECTIONS) {
                assertTrue(info.contains("# " + section), "Section " + section + " is missing");
            }
        }
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void info_with_single_node_route(GlideClusterClient clusterClient) {
        ClusterValue<String> data = clusterClient.info(RANDOM).get();
        assertTrue(data.hasSingleData());
        String infoData = data.getSingleValue();
        for (String section : DEFAULT_INFO_SECTIONS) {
            assertTrue(infoData.contains("# " + section), "Section " + section + " is missing");
        }
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void info_with_multi_node_route(GlideClusterClient clusterClient) {
        ClusterValue<String> data = clusterClient.info(ALL_NODES).get();
        assertTrue(data.hasMultiData());
        for (String info : data.getMultiValue().values()) {
            for (String section : DEFAULT_INFO_SECTIONS) {
                assertTrue(info.contains("# " + section), "Section " + section + " is missing");
            }
        }
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void info_with_multiple_options(GlideClusterClient clusterClient) {
        Section[] sections = {CLUSTER};
        if (SERVER_VERSION.isGreaterThanOrEqualTo("7.0.0")) {
            sections = concatenateArrays(sections, new Section[] {CPU, MEMORY});
        }
        ClusterValue<String> data = clusterClient.info(sections).get();
        for (String info : data.getMultiValue().values()) {
            for (Section section : sections) {
                assertTrue(
                        info.toLowerCase().contains("# " + section.toString().toLowerCase()),
                        "Section " + section + " is missing");
            }
        }
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void info_with_everything_option(GlideClusterClient clusterClient) {
        ClusterValue<String> data = clusterClient.info(new Section[] {EVERYTHING}).get();
        assertTrue(data.hasMultiData());
        for (String info : data.getMultiValue().values()) {
            for (String section : EVERYTHING_INFO_SECTIONS) {
                assertTrue(info.contains("# " + section), "Section " + section + " is missing");
            }
        }
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void info_with_single_node_route_and_options(GlideClusterClient clusterClient) {
        ClusterValue<Object> slotData =
                clusterClient.customCommand(new String[] {"cluster", "slots"}).get();

        // Nested Object arrays like
        // 1) 1) (integer) 0
        //    2) (integer) 5460
        //    3) 1) "127.0.0.1"
        //       2) (integer) 7000
        //       3) "92d73b6eb847604b63c7f7cbbf39b148acdd1318"
        //       4) (empty array)
        // Extracting first slot key
        var slotKey =
                (String) ((Object[]) ((Object[]) ((Object[]) slotData.getSingleValue())[0])[2])[2];

        Section[] sections = {CLIENTS};
        if (SERVER_VERSION.isGreaterThanOrEqualTo("7.0.0")) {
            sections = concatenateArrays(sections, new Section[] {COMMANDSTATS, REPLICATION});
        }
        SlotKeyRoute routing = new SlotKeyRoute(slotKey, PRIMARY);
        ClusterValue<String> data = clusterClient.info(sections, routing).get();

        for (Section section : sections) {
            assertTrue(
                    data.getSingleValue().toLowerCase().contains("# " + section.toString().toLowerCase()),
                    "Section " + section + " is missing");
        }
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void info_with_multi_node_route_and_options(GlideClusterClient clusterClient) {
        Section[] sections = {CLIENTS};
        if (SERVER_VERSION.isGreaterThanOrEqualTo("7.0.0")) {
            sections = concatenateArrays(sections, new Section[] {COMMANDSTATS, REPLICATION});
        }
        ClusterValue<String> data = clusterClient.info(sections, ALL_NODES).get();

        for (String info : data.getMultiValue().values()) {
            for (Section section : sections) {
                assertTrue(
                        info.toLowerCase().contains("# " + section.toString().toLowerCase()),
                        "Section " + section + " is missing");
            }
        }
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void clientId(GlideClusterClient clusterClient) {
        var id = clusterClient.clientId().get();
        assertTrue(id > 0);
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void clientId_with_single_node_route(GlideClusterClient clusterClient) {
        var data = clusterClient.clientId(RANDOM).get();
        assertTrue(data.getSingleValue() > 0L);
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void clientId_with_multi_node_route(GlideClusterClient clusterClient) {
        var data = clusterClient.clientId(ALL_NODES).get();
        data.getMultiValue().values().forEach(id -> assertTrue(id > 0));
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void clientGetName(GlideClusterClient clusterClient) {
        // TODO replace with the corresponding command once implemented
        clusterClient.customCommand(new String[] {"client", "setname", "clientGetName"}).get();

        var name = clusterClient.clientGetName().get();

        assertEquals("clientGetName", name);
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void clientGetName_with_single_node_route(GlideClusterClient clusterClient) {
        // TODO replace with the corresponding command once implemented
        clusterClient
                .customCommand(
                        new String[] {"client", "setname", "clientGetName_with_single_node_route"}, ALL_NODES)
                .get();

        var name = clusterClient.clientGetName(RANDOM).get();

        assertEquals("clientGetName_with_single_node_route", name.getSingleValue());
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void clientGetName_with_multi_node_route(GlideClusterClient clusterClient) {
        // TODO replace with the corresponding command once implemented
        clusterClient
                .customCommand(
                        new String[] {"client", "setname", "clientGetName_with_multi_node_route"}, ALL_NODES)
                .get();

        var name = clusterClient.clientGetName(ALL_NODES).get();

        assertEquals("clientGetName_with_multi_node_route", getFirstEntryFromMultiValue(name));
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void config_reset_stat(GlideClusterClient clusterClient) {
        var data = clusterClient.info(new Section[] {STATS}).get();
        String firstNodeInfo = getFirstEntryFromMultiValue(data);
        long value_before = getValueFromInfo(firstNodeInfo, "total_net_input_bytes");

        var result = clusterClient.configResetStat().get();
        assertEquals(OK, result);

        data = clusterClient.info(new Section[] {STATS}).get();
        firstNodeInfo = getFirstEntryFromMultiValue(data);
        long value_after = getValueFromInfo(firstNodeInfo, "total_net_input_bytes");
        assertTrue(value_after < value_before);
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void config_rewrite_non_existent_config_file(GlideClusterClient clusterClient) {
        var info = clusterClient.info(new Section[] {SERVER}, RANDOM).get();
        var configFile = parseInfoResponseToMap(info.getSingleValue()).get("config_file");

        if (configFile.isEmpty()) {
            ExecutionException executionException =
                    assertThrows(ExecutionException.class, () -> clusterClient.configRewrite().get());
            assertInstanceOf(RequestException.class, executionException.getCause());
        } else {
            assertEquals(OK, clusterClient.configRewrite().get());
        }
    }

    // returns the line that contains the word "myself", up to that point. This is done because the
    // values after it might change with time.
    private String cleanResult(String value) {
        return Arrays.stream(value.split("\n"))
                .filter(line -> line.contains("myself"))
                .findFirst()
                .map(line -> line.substring(0, line.indexOf("myself") + "myself".length()))
                .orElse(null);
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void configGet_with_no_args_returns_error(GlideClusterClient clusterClient) {
        var exception =
                assertThrows(
                        ExecutionException.class, () -> clusterClient.configGet(new String[] {}).get());
        assertInstanceOf(GlideException.class, exception.getCause());
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void configGet_with_wildcard(GlideClusterClient clusterClient) {
        var data = clusterClient.configGet(new String[] {"*file"}).get();
        assertTrue(data.size() > 5);
        assertTrue(data.containsKey("pidfile"));
        assertTrue(data.containsKey("logfile"));
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void configGet_with_multiple_params(GlideClusterClient clusterClient) {
        assumeTrue(SERVER_VERSION.isGreaterThanOrEqualTo("7.0.0"), "This feature added in version 7");
        var data = clusterClient.configGet(new String[] {"pidfile", "logfile"}).get();
        assertAll(
                () -> assertEquals(2, data.size()),
                () -> assertTrue(data.containsKey("pidfile")),
                () -> assertTrue(data.containsKey("logfile")));
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void configGet_with_wildcard_and_multi_node_route(GlideClusterClient clusterClient) {
        var data = clusterClient.configGet(new String[] {"*file"}, ALL_PRIMARIES).get();
        assertTrue(data.hasMultiData());
        assertTrue(data.getMultiValue().size() > 1);
        Map<String, String> config =
                data.getMultiValue().get(data.getMultiValue().keySet().toArray(String[]::new)[0]);
        assertAll(
                () -> assertTrue(config.size() > 5),
                () -> assertTrue(config.containsKey("pidfile")),
                () -> assertTrue(config.containsKey("logfile")));
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void configSet_a_parameter(GlideClusterClient clusterClient) {
        var oldValue = clusterClient.configGet(new String[] {"maxclients"}).get().get("maxclients");

        var response = clusterClient.configSet(Map.of("maxclients", "42")).get();
        assertEquals(OK, response);
        var newValue = clusterClient.configGet(new String[] {"maxclients"}).get();
        assertEquals("42", newValue.get("maxclients"));

        response = clusterClient.configSet(Map.of("maxclients", oldValue)).get();
        assertEquals(OK, response);
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void configSet_a_parameter_with_routing(GlideClusterClient clusterClient) {
        var oldValue =
                clusterClient
                        .configGet(new String[] {"cluster-node-timeout"})
                        .get()
                        .get("cluster-node-timeout");

        var response =
                clusterClient.configSet(Map.of("cluster-node-timeout", "100500"), ALL_NODES).get();
        assertEquals(OK, response);

        var newValue = clusterClient.configGet(new String[] {"cluster-node-timeout"}).get();
        assertEquals("100500", newValue.get("cluster-node-timeout"));

        response = clusterClient.configSet(Map.of("cluster-node-timeout", oldValue), ALL_NODES).get();
        assertEquals(OK, response);
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void cluster_route_by_address_reaches_correct_node(GlideClusterClient clusterClient) {
        // Masks timestamps in the cluster nodes output to avoid flakiness due to dynamic values.
        String initialNode =
                cleanResult(
                        (String)
                                clusterClient
                                        .customCommand(new String[] {"cluster", "nodes"}, RANDOM)
                                        .get()
                                        .getSingleValue());

        String host = initialNode.split(" ")[1].split("@")[0];
        assertNotNull(host);

        String specifiedClusterNode1 =
                cleanResult(
                        (String)
                                clusterClient
                                        .customCommand(new String[] {"cluster", "nodes"}, new ByAddressRoute(host))
                                        .get()
                                        .getSingleValue());
        assertEquals(initialNode, specifiedClusterNode1);

        String[] splitHost = host.split(":");
        String specifiedClusterNode2 =
                cleanResult(
                        (String)
                                clusterClient
                                        .customCommand(
                                                new String[] {"cluster", "nodes"},
                                                new ByAddressRoute(splitHost[0], Integer.parseInt(splitHost[1])))
                                        .get()
                                        .getSingleValue());
        assertEquals(initialNode, specifiedClusterNode2);
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void cluster_fail_routing_by_address_if_no_port_is_provided(
            GlideClusterClient clusterClient) {
        assertThrows(RequestException.class, () -> clusterClient.info(new ByAddressRoute("foo")).get());
    }

    @SneakyThrows
    @ParameterizedTest
    @MethodSource("getClients")
    public void echo(GlideClusterClient clusterClient) {
        String message = "GLIDE";
        String response = clusterClient.echo(message).get();
        assertEquals(message, response);
    }

    @SneakyThrows
    @ParameterizedTest
    @MethodSource("getClients")
    public void echo_with_route(GlideClusterClient clusterClient) {
        String message = "GLIDE";

        String singlePayload = clusterClient.echo(message, RANDOM).get().getSingleValue();
        assertEquals(message, singlePayload);

        Map<String, String> multiPayload = clusterClient.echo(message, ALL_NODES).get().getMultiValue();
        multiPayload.forEach((key, value) -> assertEquals(message, value));
    }

    @SneakyThrows
    @ParameterizedTest
    @MethodSource("getClients")
    public void echo_gs(GlideClusterClient clusterClient) {
        byte[] message = {(byte) 0x01, (byte) 0x00, (byte) 0x01, (byte) 0x00, (byte) 0x02};
        GlideString response = clusterClient.echo(gs(message)).get();
        assertEquals(gs(message), response);
    }

    @SneakyThrows
    @ParameterizedTest
    @MethodSource("getClients")
    public void echo_gs_with_route(GlideClusterClient clusterClient) {
        byte[] message = {(byte) 0x01, (byte) 0x00, (byte) 0x01, (byte) 0x00, (byte) 0x02};
        GlideString singlePayload = clusterClient.echo(gs(message), RANDOM).get().getSingleValue();
        assertEquals(gs(message), singlePayload);

        Map<String, GlideString> multiPayload =
                clusterClient.echo(gs(message), ALL_NODES).get().getMultiValue();
        multiPayload.forEach((key, value) -> assertEquals(gs(message), value));
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void time(GlideClusterClient clusterClient) {
        // Take the time now, convert to 10 digits and subtract 1 second
        long now = Instant.now().getEpochSecond() - 1L;
        String[] result = clusterClient.time().get();
        assertEquals(2, result.length);
        assertTrue(
                Long.parseLong(result[0]) > now,
                "Time() result (" + result[0] + ") should be greater than now (" + now + ")");
        assertTrue(Long.parseLong(result[1]) < 1000000);
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void time_with_route(GlideClusterClient clusterClient) {
        // Take the time now, convert to 10 digits and subtract 1 second
        long now = Instant.now().getEpochSecond() - 1L;

        ClusterValue<String[]> result = clusterClient.time(ALL_PRIMARIES).get();
        assertTrue(result.hasMultiData());
        assertTrue(result.getMultiValue().size() > 1);

        // check the first node's server time
        Object[] serverTime =
                result.getMultiValue().get(result.getMultiValue().keySet().toArray(String[]::new)[0]);

        assertEquals(2, serverTime.length);
        assertTrue(
                Long.parseLong((String) serverTime[0]) > now,
                "Time() result (" + serverTime[0] + ") should be greater than now (" + now + ")");
        assertTrue(Long.parseLong((String) serverTime[1]) < 1000000);
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void lastsave(GlideClusterClient clusterClient) {
        long result = clusterClient.lastsave().get();
        var yesterday = Instant.now().minus(1, ChronoUnit.DAYS);

        assertTrue(Instant.ofEpochSecond(result).isAfter(yesterday));

        ClusterValue<Long> data = clusterClient.lastsave(ALL_NODES).get();
        for (var value : data.getMultiValue().values()) {
            assertTrue(Instant.ofEpochSecond(value).isAfter(yesterday));
        }
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void lolwut_lolwut(GlideClusterClient clusterClient) {
        var response = clusterClient.lolwut().get();
        System.out.printf("%nLOLWUT cluster client standard response%n%s%n", response);
        assertTrue(response.contains("Redis ver. " + SERVER_VERSION));

        response = clusterClient.lolwut(new int[] {50, 20}).get();
        System.out.printf(
                "%nLOLWUT cluster client standard response with params 50 20%n%s%n", response);
        assertTrue(response.contains("Redis ver. " + SERVER_VERSION));

        response = clusterClient.lolwut(6).get();
        System.out.printf("%nLOLWUT cluster client ver 6 response%n%s%n", response);
        assertTrue(response.contains("Redis ver. " + SERVER_VERSION));

        response = clusterClient.lolwut(5, new int[] {30, 4, 4}).get();
        System.out.printf("%nLOLWUT cluster client ver 5 response with params 30 4 4%n%s%n", response);
        assertTrue(response.contains("Redis ver. " + SERVER_VERSION));

        var clusterResponse = clusterClient.lolwut(ALL_NODES).get();
        for (var nodeResponse : clusterResponse.getMultiValue().values()) {
            assertTrue(nodeResponse.contains("Redis ver. " + SERVER_VERSION));
        }

        clusterResponse = clusterClient.lolwut(new int[] {10, 20}, ALL_NODES).get();
        for (var nodeResponse : clusterResponse.getMultiValue().values()) {
            assertTrue(nodeResponse.contains("Redis ver. " + SERVER_VERSION));
        }

        clusterResponse = clusterClient.lolwut(2, RANDOM).get();
        assertTrue(clusterResponse.getSingleValue().contains("Redis ver. " + SERVER_VERSION));

        clusterResponse = clusterClient.lolwut(2, new int[] {10, 20}, RANDOM).get();
        assertTrue(clusterResponse.getSingleValue().contains("Redis ver. " + SERVER_VERSION));
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void dbsize_and_flushdb(GlideClusterClient clusterClient) {
        boolean is62orHigher = SERVER_VERSION.isGreaterThanOrEqualTo("6.2.0");

        assertEquals(OK, clusterClient.flushall().get());
        // dbsize should be 0 after flushall() because all keys have been deleted
        assertEquals(0L, clusterClient.dbsize().get());

        int numKeys = 10;
        for (int i = 0; i < numKeys; i++) {
            assertEquals(OK, clusterClient.set(UUID.randomUUID().toString(), "foo").get());
        }
        assertEquals(10L, clusterClient.dbsize(ALL_PRIMARIES).get());

        // test dbsize with routing - flush the database first to ensure the set() call is directed to a
        // node with 0 keys.
        assertEquals(OK, clusterClient.flushdb().get());
        assertEquals(0L, clusterClient.dbsize().get());

        String key = UUID.randomUUID().toString();
        SingleNodeRoute route = new SlotKeyRoute(key, PRIMARY);

        // add a key, measure DB size, flush DB and measure again - with all arg combinations
        assertEquals(OK, clusterClient.set(key, "foo").get());
        assertEquals(1L, clusterClient.dbsize(route).get());
        if (is62orHigher) {
            assertEquals(OK, clusterClient.flushdb(SYNC).get());
        } else {
            assertEquals(OK, clusterClient.flushdb(ASYNC).get());
        }
        assertEquals(0L, clusterClient.dbsize().get());

        assertEquals(OK, clusterClient.set(key, "foo").get());
        assertEquals(1L, clusterClient.dbsize(route).get());
        assertEquals(OK, clusterClient.flushdb(route).get());
        assertEquals(0L, clusterClient.dbsize(route).get());

        assertEquals(OK, clusterClient.set(key, "foo").get());
        assertEquals(1L, clusterClient.dbsize(route).get());
        if (is62orHigher) {
            assertEquals(OK, clusterClient.flushdb(SYNC, route).get());
        } else {
            assertEquals(OK, clusterClient.flushdb(ASYNC, route).get());
        }
        assertEquals(0L, clusterClient.dbsize(route).get());

        if (!is62orHigher) {
            var executionException =
                    assertThrows(ExecutionException.class, () -> clusterClient.flushdb(SYNC).get());
            assertInstanceOf(RequestException.class, executionException.getCause());
        }
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void objectFreq(GlideClusterClient clusterClient) {
        String key = UUID.randomUUID().toString();
        String maxmemoryPolicy = "maxmemory-policy";
        String oldPolicy =
                clusterClient.configGet(new String[] {maxmemoryPolicy}).get().get(maxmemoryPolicy);
        try {
            assertEquals(OK, clusterClient.configSet(Map.of(maxmemoryPolicy, "allkeys-lfu")).get());
            assertEquals(OK, clusterClient.set(key, "").get());
            assertTrue(clusterClient.objectFreq(key).get() >= 0L);
        } finally {
            clusterClient.configSet(Map.of(maxmemoryPolicy, oldPolicy)).get();
        }
    }

    @SneakyThrows
    public static Stream<Arguments> callCrossSlotCommandsWhichShouldFail() {
        var clusterClient = GlideClusterClient.createClient(commonClusterClientConfig().build()).get();
        return Stream.of(
                Arguments.of("smove", null, clusterClient.smove("abc", "zxy", "lkn")),
                Arguments.of("rename", null, clusterClient.rename("abc", "xyz")),
                Arguments.of("renamenx", null, clusterClient.renamenx("abc", "zxy")),
                Arguments.of(
                        "sinterstore", null, clusterClient.sinterstore("abc", new String[] {"zxy", "lkn"})),
                Arguments.of(
                        "sinterstore_gs",
                        null,
                        clusterClient.sinterstore(gs("abc"), new GlideString[] {gs("zxy"), gs("lkn")})),
                Arguments.of("sdiff", null, clusterClient.sdiff(new String[] {"abc", "zxy", "lkn"})),
                Arguments.of(
                        "sdiff_gs",
                        null,
                        clusterClient.sdiff(new GlideString[] {gs("abc"), gs("zxy"), gs("lkn")})),
                Arguments.of(
                        "sdiffstore", null, clusterClient.sdiffstore("abc", new String[] {"zxy", "lkn"})),
                Arguments.of(
                        "sdiffstore_gs",
                        null,
                        clusterClient.sdiffstore(gs("abc"), new GlideString[] {gs("zxy"), gs("lkn")})),
                Arguments.of("sinter", null, clusterClient.sinter(new String[] {"abc", "zxy", "lkn"})),
                Arguments.of(
                        "sinter_gs",
                        null,
                        clusterClient.sinter(new GlideString[] {gs("abc"), gs("zxy"), gs("lkn")})),
                Arguments.of(
                        "sunionstore", null, clusterClient.sunionstore("abc", new String[] {"zxy", "lkn"})),
                Arguments.of(
                        "sunionstore binary",
                        null,
                        clusterClient.sunionstore(gs("abc"), new GlideString[] {gs("zxy"), gs("lkn")})),
                Arguments.of("zdiff", null, clusterClient.zdiff(new String[] {"abc", "zxy", "lkn"})),
                Arguments.of(
                        "zdiffWithScores",
                        null,
                        clusterClient.zdiffWithScores(new String[] {"abc", "zxy", "lkn"})),
                Arguments.of(
                        "zdiffstore", null, clusterClient.zdiffstore("abc", new String[] {"zxy", "lkn"})),
                Arguments.of(
                        "zunion", null, clusterClient.zunion(new KeyArray(new String[] {"abc", "zxy", "lkn"}))),
                Arguments.of(
                        "zinter",
                        "6.2.0",
                        clusterClient.zinter(new KeyArray(new String[] {"abc", "zxy", "lkn"}))),
                Arguments.of(
                        "zrangestore", null, clusterClient.zrangestore("abc", "zxy", new RangeByIndex(3, 1))),
                Arguments.of(
                        "zinterstore",
                        null,
                        clusterClient.zinterstore("foo", new KeyArray(new String[] {"abc", "zxy", "lkn"}))),
                Arguments.of(
                        "zintercard", "7.0.0", clusterClient.zintercard(new String[] {"abc", "zxy", "lkn"})),
                Arguments.of("brpop", null, clusterClient.brpop(new String[] {"abc", "zxy", "lkn"}, .1)),
                Arguments.of(
                        "brpop binary",
                        null,
                        clusterClient.brpop(new GlideString[] {gs("abc"), gs("zxy"), gs("lkn")}, .1)),
                Arguments.of("blpop", null, clusterClient.blpop(new String[] {"abc", "zxy", "lkn"}, .1)),
                Arguments.of(
                        "blpop binary",
                        null,
                        clusterClient.blpop(new GlideString[] {gs("abc"), gs("zxy"), gs("lkn")}, .1)),
                Arguments.of("pfcount", null, clusterClient.pfcount(new String[] {"abc", "zxy", "lkn"})),
                Arguments.of(
                        "pfcount binary",
                        null,
                        clusterClient.pfcount(new GlideString[] {gs("abc"), gs("zxy"), gs("lkn")})),
                Arguments.of("pfmerge", null, clusterClient.pfmerge("abc", new String[] {"zxy", "lkn"})),
                Arguments.of(
                        "pfmerge binary",
                        null,
                        clusterClient.pfmerge(gs("abc"), new GlideString[] {gs("zxy"), gs("lkn")})),
                Arguments.of(
                        "bzpopmax", "5.0.0", clusterClient.bzpopmax(new String[] {"abc", "zxy", "lkn"}, .1)),
                Arguments.of(
                        "bzpopmax binary",
                        "5.0.0",
                        clusterClient.bzpopmax(new GlideString[] {gs("abc"), gs("zxy"), gs("lkn")}, .1)),
                Arguments.of(
                        "bzpopmin", "5.0.0", clusterClient.bzpopmin(new String[] {"abc", "zxy", "lkn"}, .1)),
                Arguments.of(
                        "bzpopmin binary",
                        "5.0.0",
                        clusterClient.bzpopmin(new GlideString[] {gs("abc"), gs("zxy"), gs("lkn")}, .1)),
                Arguments.of(
                        "zmpop", "7.0.0", clusterClient.zmpop(new String[] {"abc", "zxy", "lkn"}, MAX)),
                Arguments.of(
                        "zmpop binary",
                        "7.0.0",
                        clusterClient.zmpop(new GlideString[] {gs("abc"), gs("zxy"), gs("lkn")}, MAX)),
                Arguments.of(
                        "bzmpop", "7.0.0", clusterClient.bzmpop(new String[] {"abc", "zxy", "lkn"}, MAX, .1)),
                Arguments.of(
                        "bzmpop binary",
                        "7.0.0",
                        clusterClient.bzmpop(new GlideString[] {gs("abc"), gs("zxy"), gs("lkn")}, MAX, .1)),
                Arguments.of(
                        "lmpop",
                        "7.0.0",
                        clusterClient.lmpop(new String[] {"abc", "def"}, ListDirection.LEFT, 1L)),
                Arguments.of(
                        "lmpop binary",
                        "7.0.0",
                        clusterClient.lmpop(new GlideString[] {gs("abc"), gs("def")}, ListDirection.LEFT, 1L)),
                Arguments.of(
                        "bitop",
                        null,
                        clusterClient.bitop(BitwiseOperation.OR, "abc", new String[] {"zxy", "lkn"})),
                Arguments.of(
                        "blmpop",
                        "7.0.0",
                        clusterClient.blmpop(new String[] {"abc", "def"}, ListDirection.LEFT, 1L, 0.1)),
                Arguments.of(
                        "blmpop binary",
                        "7.0.0",
                        clusterClient.blmpop(
                                new GlideString[] {gs("abc"), gs("def")}, ListDirection.LEFT, 1L, 0.1)),
                Arguments.of(
                        "lmove",
                        "6.2.0",
                        clusterClient.lmove("abc", "def", ListDirection.LEFT, ListDirection.LEFT)),
                Arguments.of(
                        "blmove",
                        "6.2.0",
                        clusterClient.blmove("abc", "def", ListDirection.LEFT, ListDirection.LEFT, 1)),
                Arguments.of("sintercard", "7.0.0", clusterClient.sintercard(new String[] {"abc", "def"})),
                Arguments.of(
                        "sintercard_gs",
                        "7.0.0",
                        clusterClient.sintercard(new GlideString[] {gs("abc"), gs("def")})),
                Arguments.of(
                        "sintercard", "7.0.0", clusterClient.sintercard(new String[] {"abc", "def"}, 1)),
                Arguments.of(
                        "sintercard_gs",
                        "7.0.0",
                        clusterClient.sintercard(new GlideString[] {gs("abc"), gs("def")}, 1)),
                Arguments.of(
                        "fcall",
                        "7.0.0",
                        clusterClient.fcall("func", new String[] {"abc", "zxy", "lkn"}, new String[0])),
                Arguments.of(
                        "fcall binary",
                        "7.0.0",
                        clusterClient.fcall(
                                gs("func"),
                                new GlideString[] {gs("abc"), gs("zxy"), gs("lkn")},
                                new GlideString[0])),
                Arguments.of(
                        "fcallReadOnly",
                        "7.0.0",
                        clusterClient.fcallReadOnly("func", new String[] {"abc", "zxy", "lkn"}, new String[0])),
                Arguments.of(
                        "fcallReadOnly binary",
                        "7.0.0",
                        clusterClient.fcallReadOnly(
                                gs("func"),
                                new GlideString[] {gs("abc"), gs("zxy"), gs("lkn")},
                                new GlideString[0])),
                Arguments.of(
                        "xread", null, clusterClient.xread(Map.of("abc", "stream1", "zxy", "stream2"))),
                Arguments.of("copy", "6.2.0", clusterClient.copy("abc", "def", true)),
                Arguments.of("msetnx", null, clusterClient.msetnx(Map.of("abc", "def", "ghi", "jkl"))),
                Arguments.of("lcs", "7.0.0", clusterClient.lcs("abc", "def")),
                Arguments.of("lcsLEN", "7.0.0", clusterClient.lcsLen("abc", "def")),
                Arguments.of("lcsIdx", "7.0.0", clusterClient.lcsIdx("abc", "def")),
                Arguments.of("lcsIdx", "7.0.0", clusterClient.lcsIdx("abc", "def", 10)),
                Arguments.of("lcsIdxWithMatchLen", "7.0.0", clusterClient.lcsIdxWithMatchLen("abc", "def")),
                Arguments.of(
                        "lcsIdxWithMatchLen", "7.0.0", clusterClient.lcsIdxWithMatchLen("abc", "def", 10)),
                Arguments.of("sunion", "1.0.0", clusterClient.sunion(new String[] {"abc", "def", "ghi"})),
                Arguments.of(
                        "sunion binary",
                        "1.0.0",
                        clusterClient.sunion(new GlideString[] {gs("abc"), gs("def"), gs("ghi")})),
                Arguments.of("sortStore", "1.0.0", clusterClient.sortStore("abc", "def")),
                Arguments.of(
                        "sortStore",
                        "1.0.0",
                        clusterClient.sortStore("abc", "def", SortOptions.builder().alpha().build())),
                Arguments.of(
                        "geosearchstore",
                        "6.2.0",
                        clusterClient.geosearchstore(
                                "dest",
                                "source",
                                new GeoSearchOrigin.MemberOrigin("abc"),
                                new GeoSearchShape(1, GeoUnit.METERS),
                                GeoSearchStoreOptions.builder().build(),
                                new GeoSearchResultOptions(1, true))));
    }

    @SneakyThrows
    @ParameterizedTest(name = "{0} cross slot keys will throw RequestException")
    @MethodSource("callCrossSlotCommandsWhichShouldFail")
    public void check_throws_cross_slot_error(
            String testName, String minVer, CompletableFuture<?> future) {
        if (minVer != null) {
            assumeTrue(SERVER_VERSION.isGreaterThanOrEqualTo(minVer));
        }
        var executionException = assertThrows(ExecutionException.class, future::get);
        assertInstanceOf(RequestException.class, executionException.getCause());
        assertTrue(executionException.getMessage().toLowerCase().contains("crossslot"));
    }

    @SneakyThrows
    public static Stream<Arguments> callCrossSlotCommandsWhichShouldPass() {
        var clusterClient = GlideClusterClient.createClient(commonClusterClientConfig().build()).get();
        return Stream.of(
                Arguments.of("exists", clusterClient.exists(new String[] {"abc", "zxy", "lkn"})),
                Arguments.of("unlink", clusterClient.unlink(new String[] {"abc", "zxy", "lkn"})),
                Arguments.of("del", clusterClient.del(new String[] {"abc", "zxy", "lkn"})),
                Arguments.of("mget", clusterClient.mget(new String[] {"abc", "zxy", "lkn"})),
                Arguments.of("mset", clusterClient.mset(Map.of("abc", "1", "zxy", "2", "lkn", "3"))),
                Arguments.of("touch", clusterClient.touch(new String[] {"abc", "zxy", "lkn"})),
                Arguments.of(
                        "touch binary",
                        clusterClient.touch(new GlideString[] {gs("abc"), gs("zxy"), gs("lkn")})),
                Arguments.of("watch", clusterClient.watch(new String[] {"ghi", "zxy", "lkn"})));
    }

    @SneakyThrows
    @ParameterizedTest(name = "{0} cross slot keys are allowed")
    @MethodSource("callCrossSlotCommandsWhichShouldPass")
    public void check_does_not_throw_cross_slot_error(String testName, CompletableFuture<?> future) {
        future.get();
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void flushall(GlideClusterClient clusterClient) {
        if (SERVER_VERSION.isGreaterThanOrEqualTo("6.2.0")) {
            assertEquals(OK, clusterClient.flushall(SYNC).get());
        } else {
            var executionException =
                    assertThrows(ExecutionException.class, () -> clusterClient.flushall(SYNC).get());
            assertInstanceOf(RequestException.class, executionException.getCause());
            assertEquals(OK, clusterClient.flushall(ASYNC).get());
        }

        // TODO replace with KEYS command when implemented
        Object[] keysAfter =
                (Object[]) clusterClient.customCommand(new String[] {"keys", "*"}).get().getSingleValue();
        assertEquals(0, keysAfter.length);

        var route = new SlotKeyRoute("key", PRIMARY);
        assertEquals(OK, clusterClient.flushall().get());
        assertEquals(OK, clusterClient.flushall(route).get());
        assertEquals(OK, clusterClient.flushall(ASYNC).get());
        assertEquals(OK, clusterClient.flushall(ASYNC, route).get());

        var replicaRoute = new SlotKeyRoute("key", REPLICA);
        if (SERVER_VERSION.isGreaterThanOrEqualTo("8.0.0")) {
            // Since Valkey 8.0.0 flushall can run on replicas
            assertEquals(OK, clusterClient.flushall(route).get());
        } else {
            // command should fail on a replica, because it is read-only
            ExecutionException executionException =
                    assertThrows(ExecutionException.class, () -> clusterClient.flushall(replicaRoute).get());
            assertInstanceOf(RequestException.class, executionException.getCause());
            assertTrue(
                    executionException
                            .getMessage()
                            .toLowerCase()
                            .contains("can't write against a read only replica"));
        }
    }

    @SneakyThrows
    @ParameterizedTest
    @MethodSource("getTestScenarios")
    public void function_commands_without_keys_with_route(
            GlideClusterClient clusterClient, boolean singleNodeRoute) {
        assumeTrue(SERVER_VERSION.isGreaterThanOrEqualTo("7.0.0"), "This feature added in version 7");

        String libName = "mylib1c_" + singleNodeRoute;
        String funcName = "myfunc1c_" + singleNodeRoute;
        // function $funcName returns first argument
        String code = generateLuaLibCode(libName, Map.of(funcName, "return args[1]"), true);
        Route route = singleNodeRoute ? new SlotKeyRoute("1", PRIMARY) : ALL_PRIMARIES;

        assertEquals(OK, clusterClient.functionFlush(SYNC, route).get());
        assertEquals(libName, clusterClient.functionLoad(code, false, route).get());

        var fcallResult = clusterClient.fcall(funcName, new String[] {"one", "two"}, route).get();
        if (route instanceof SingleNodeRoute) {
            assertEquals("one", fcallResult.getSingleValue());
        } else {
            for (var nodeResponse : fcallResult.getMultiValue().values()) {
                assertEquals("one", nodeResponse);
            }
        }
        fcallResult = clusterClient.fcallReadOnly(funcName, new String[] {"one", "two"}, route).get();
        if (route instanceof SingleNodeRoute) {
            assertEquals("one", fcallResult.getSingleValue());
        } else {
            for (var nodeResponse : fcallResult.getMultiValue().values()) {
                assertEquals("one", nodeResponse);
            }
        }

        var expectedDescription =
                new HashMap<String, String>() {
                    {
                        put(funcName, null);
                    }
                };
        var expectedFlags =
                new HashMap<String, Set<String>>() {
                    {
                        put(funcName, Set.of("no-writes"));
                    }
                };

        var response = clusterClient.functionList(false, route).get();
        if (singleNodeRoute) {
            var flist = response.getSingleValue();
            checkFunctionListResponse(
                    flist, libName, expectedDescription, expectedFlags, Optional.empty());
        } else {
            for (var flist : response.getMultiValue().values()) {
                checkFunctionListResponse(
                        flist, libName, expectedDescription, expectedFlags, Optional.empty());
            }
        }

        response = clusterClient.functionList(true, route).get();
        if (singleNodeRoute) {
            var flist = response.getSingleValue();
            checkFunctionListResponse(
                    flist, libName, expectedDescription, expectedFlags, Optional.of(code));
        } else {
            for (var flist : response.getMultiValue().values()) {
                checkFunctionListResponse(
                        flist, libName, expectedDescription, expectedFlags, Optional.of(code));
            }
        }

        // re-load library without overwriting
        var executionException =
                assertThrows(
                        ExecutionException.class, () -> clusterClient.functionLoad(code, false, route).get());
        assertInstanceOf(RequestException.class, executionException.getCause());
        assertTrue(
                executionException.getMessage().contains("Library '" + libName + "' already exists"));

        // re-load library with overwriting
        assertEquals(libName, clusterClient.functionLoad(code, true, route).get());
        String newFuncName = "myfunc2c_" + singleNodeRoute;
        // function $funcName returns first argument
        // function $newFuncName returns argument array len
        String newCode =
                generateLuaLibCode(
                        libName, Map.of(funcName, "return args[1]", newFuncName, "return #args"), true);

        assertEquals(libName, clusterClient.functionLoad(newCode, true, route).get());

        expectedDescription.put(newFuncName, null);
        expectedFlags.put(newFuncName, Set.of("no-writes"));

        response = clusterClient.functionList(false, route).get();
        if (singleNodeRoute) {
            var flist = response.getSingleValue();
            checkFunctionListResponse(
                    flist, libName, expectedDescription, expectedFlags, Optional.empty());
        } else {
            for (var flist : response.getMultiValue().values()) {
                checkFunctionListResponse(
                        flist, libName, expectedDescription, expectedFlags, Optional.empty());
            }
        }

        // load new lib and delete it - first lib remains loaded
        String anotherLib = generateLuaLibCode("anotherLib", Map.of("anotherFunc", ""), false);
        assertEquals("anotherLib", clusterClient.functionLoad(anotherLib, true, route).get());
        assertEquals(OK, clusterClient.functionDelete("anotherLib", route).get());

        // delete missing lib returns a error
        executionException =
                assertThrows(
                        ExecutionException.class,
                        () -> clusterClient.functionDelete("anotherLib", route).get());
        assertInstanceOf(RequestException.class, executionException.getCause());
        assertTrue(executionException.getMessage().contains("Library not found"));

        response = clusterClient.functionList(true, route).get();
        if (singleNodeRoute) {
            var flist = response.getSingleValue();
            checkFunctionListResponse(
                    flist, libName, expectedDescription, expectedFlags, Optional.of(newCode));
        } else {
            for (var flist : response.getMultiValue().values()) {
                checkFunctionListResponse(
                        flist, libName, expectedDescription, expectedFlags, Optional.of(newCode));
            }
        }

        fcallResult = clusterClient.fcall(newFuncName, new String[] {"one", "two"}, route).get();
        if (route instanceof SingleNodeRoute) {
            assertEquals(2L, fcallResult.getSingleValue());
        } else {
            for (var nodeResponse : fcallResult.getMultiValue().values()) {
                assertEquals(2L, nodeResponse);
            }
        }
        fcallResult =
                clusterClient.fcallReadOnly(newFuncName, new String[] {"one", "two"}, route).get();
        if (route instanceof SingleNodeRoute) {
            assertEquals(2L, fcallResult.getSingleValue());
        } else {
            for (var nodeResponse : fcallResult.getMultiValue().values()) {
                assertEquals(2L, nodeResponse);
            }
        }

        assertEquals(OK, clusterClient.functionFlush(route).get());
    }

    @SneakyThrows
    @ParameterizedTest
    @MethodSource("getTestScenarios")
    public void function_commands_without_keys_with_route_binary(
            GlideClusterClient clusterClient, boolean singleNodeRoute) {
        assumeTrue(SERVER_VERSION.isGreaterThanOrEqualTo("7.0.0"), "This feature added in version 7");

        GlideString libName = gs("mylib1c_" + singleNodeRoute);
        GlideString funcName = gs("myfunc1c_" + singleNodeRoute);
        // function $funcName returns first argument
        GlideString code =
                generateLuaLibCodeBinary(libName, Map.of(funcName, gs("return args[1]")), true);
        Route route = singleNodeRoute ? new SlotKeyRoute("1", PRIMARY) : ALL_PRIMARIES;

        assertEquals(OK, clusterClient.functionFlush(SYNC, route).get());
        assertEquals(libName, clusterClient.functionLoad(code, false, route).get());

        var fcallResult =
                clusterClient.fcall(funcName, new GlideString[] {gs("one"), gs("two")}, route).get();
        if (route instanceof SingleNodeRoute) {
            assertEquals(gs("one"), fcallResult.getSingleValue());
        } else {
            for (var nodeResponse : fcallResult.getMultiValue().values()) {
                assertEquals(gs("one"), nodeResponse);
            }
        }
        fcallResult =
                clusterClient
                        .fcallReadOnly(funcName, new GlideString[] {gs("one"), gs("two")}, route)
                        .get();
        if (route instanceof SingleNodeRoute) {
            assertEquals(gs("one"), fcallResult.getSingleValue());
        } else {
            for (var nodeResponse : fcallResult.getMultiValue().values()) {
                assertEquals(gs("one"), nodeResponse);
            }
        }

        var expectedDescription =
                new HashMap<GlideString, GlideString>() {
                    {
                        put(funcName, null);
                    }
                };
        var expectedFlags =
                new HashMap<GlideString, Set<GlideString>>() {
                    {
                        put(funcName, Set.of(gs("no-writes")));
                    }
                };

        var response = clusterClient.functionListBinary(false, route).get();
        if (singleNodeRoute) {
            var flist = response.getSingleValue();
            checkFunctionListResponseBinary(
                    flist, libName, expectedDescription, expectedFlags, Optional.empty());
        } else {
            for (var flist : response.getMultiValue().values()) {
                checkFunctionListResponseBinary(
                        flist, libName, expectedDescription, expectedFlags, Optional.empty());
            }
        }

        response = clusterClient.functionListBinary(true, route).get();
        if (singleNodeRoute) {
            var flist = response.getSingleValue();
            checkFunctionListResponseBinary(
                    flist, libName, expectedDescription, expectedFlags, Optional.of(code));
        } else {
            for (var flist : response.getMultiValue().values()) {
                checkFunctionListResponseBinary(
                        flist, libName, expectedDescription, expectedFlags, Optional.of(code));
            }
        }

        // re-load library without overwriting
        var executionException =
                assertThrows(
                        ExecutionException.class, () -> clusterClient.functionLoad(code, false, route).get());
        assertInstanceOf(RequestException.class, executionException.getCause());
        assertTrue(
                executionException.getMessage().contains("Library '" + libName + "' already exists"));

        // re-load library with overwriting
        assertEquals(libName, clusterClient.functionLoad(code, true, route).get());
        GlideString newFuncName = gs("myfunc2c_" + singleNodeRoute);
        // function $funcName returns first argument
        // function $newFuncName returns argument array len
        GlideString newCode =
                generateLuaLibCodeBinary(
                        libName, Map.of(funcName, gs("return args[1]"), newFuncName, gs("return #args")), true);

        assertEquals(libName, clusterClient.functionLoad(newCode, true, route).get());

        expectedDescription.put(newFuncName, null);
        expectedFlags.put(newFuncName, Set.of(gs("no-writes")));

        response = clusterClient.functionListBinary(false, route).get();
        if (singleNodeRoute) {
            var flist = response.getSingleValue();
            checkFunctionListResponseBinary(
                    flist, libName, expectedDescription, expectedFlags, Optional.empty());
        } else {
            for (var flist : response.getMultiValue().values()) {
                checkFunctionListResponseBinary(
                        flist, libName, expectedDescription, expectedFlags, Optional.empty());
            }
        }

        // load new lib and delete it - first lib remains loaded
        GlideString anotherLib =
                generateLuaLibCodeBinary(gs("anotherLib"), Map.of(gs("anotherFunc"), gs("")), false);
        assertEquals(gs("anotherLib"), clusterClient.functionLoad(anotherLib, true, route).get());
        assertEquals(OK, clusterClient.functionDelete(gs("anotherLib"), route).get());

        // delete missing lib returns a error
        executionException =
                assertThrows(
                        ExecutionException.class,
                        () -> clusterClient.functionDelete(gs("anotherLib"), route).get());
        assertInstanceOf(RequestException.class, executionException.getCause());
        assertTrue(executionException.getMessage().contains("Library not found"));

        response = clusterClient.functionListBinary(true, route).get();
        if (singleNodeRoute) {
            var flist = response.getSingleValue();
            checkFunctionListResponseBinary(
                    flist, libName, expectedDescription, expectedFlags, Optional.of(newCode));
        } else {
            for (var flist : response.getMultiValue().values()) {
                checkFunctionListResponseBinary(
                        flist, libName, expectedDescription, expectedFlags, Optional.of(newCode));
            }
        }

        fcallResult =
                clusterClient.fcall(newFuncName, new GlideString[] {gs("one"), gs("two")}, route).get();
        if (route instanceof SingleNodeRoute) {
            assertEquals(2L, fcallResult.getSingleValue());
        } else {
            for (var nodeResponse : fcallResult.getMultiValue().values()) {
                assertEquals(2L, nodeResponse);
            }
        }
        fcallResult =
                clusterClient
                        .fcallReadOnly(newFuncName, new GlideString[] {gs("one"), gs("two")}, route)
                        .get();
        if (route instanceof SingleNodeRoute) {
            assertEquals(2L, fcallResult.getSingleValue());
        } else {
            for (var nodeResponse : fcallResult.getMultiValue().values()) {
                assertEquals(2L, nodeResponse);
            }
        }

        assertEquals(OK, clusterClient.functionFlush(route).get());
    }

    @SneakyThrows
    @ParameterizedTest
    @MethodSource("getClients")
    public void function_commands_without_keys_and_without_route(GlideClusterClient clusterClient) {
        assumeTrue(SERVER_VERSION.isGreaterThanOrEqualTo("7.0.0"), "This feature added in version 7");

        assertEquals(OK, clusterClient.functionFlush(SYNC).get());

        String libName = "mylib1c";
        String funcName = "myfunc1c";
        // function $funcName returns first argument
        // generating RO functions to execution on a replica (default routing goes to RANDOM including
        // replicas)
        String code = generateLuaLibCode(libName, Map.of(funcName, "return args[1]"), true);

        assertEquals(libName, clusterClient.functionLoad(code, false).get());

        assertEquals("one", clusterClient.fcall(funcName, new String[] {"one", "two"}).get());
        assertEquals("one", clusterClient.fcallReadOnly(funcName, new String[] {"one", "two"}).get());

        var flist = clusterClient.functionList(false).get();
        var expectedDescription =
                new HashMap<String, String>() {
                    {
                        put(funcName, null);
                    }
                };
        var expectedFlags =
                new HashMap<String, Set<String>>() {
                    {
                        put(funcName, Set.of("no-writes"));
                    }
                };
        checkFunctionListResponse(flist, libName, expectedDescription, expectedFlags, Optional.empty());

        flist = clusterClient.functionList(true).get();
        checkFunctionListResponse(
                flist, libName, expectedDescription, expectedFlags, Optional.of(code));

        // re-load library without overwriting
        var executionException =
                assertThrows(ExecutionException.class, () -> clusterClient.functionLoad(code, false).get());
        assertInstanceOf(RequestException.class, executionException.getCause());
        assertTrue(
                executionException.getMessage().contains("Library '" + libName + "' already exists"));

        // re-load library with overwriting
        assertEquals(libName, clusterClient.functionLoad(code, true).get());
        String newFuncName = "myfunc2c";
        // function $funcName returns first argument
        // function $newFuncName returns argument array len
        String newCode =
                generateLuaLibCode(
                        libName, Map.of(funcName, "return args[1]", newFuncName, "return #args"), true);

        assertEquals(libName, clusterClient.functionLoad(newCode, true).get());

        // load new lib and delete it - first lib remains loaded
        String anotherLib = generateLuaLibCode("anotherLib", Map.of("anotherFunc", ""), false);
        assertEquals("anotherLib", clusterClient.functionLoad(anotherLib, true).get());
        assertEquals(OK, clusterClient.functionDelete("anotherLib").get());

        // delete missing lib returns a error
        executionException =
                assertThrows(
                        ExecutionException.class, () -> clusterClient.functionDelete("anotherLib").get());
        assertInstanceOf(RequestException.class, executionException.getCause());
        assertTrue(executionException.getMessage().contains("Library not found"));

        flist = clusterClient.functionList(libName, false).get();
        expectedDescription.put(newFuncName, null);
        expectedFlags.put(newFuncName, Set.of("no-writes"));
        checkFunctionListResponse(flist, libName, expectedDescription, expectedFlags, Optional.empty());

        flist = clusterClient.functionList(libName, true).get();
        checkFunctionListResponse(
                flist, libName, expectedDescription, expectedFlags, Optional.of(newCode));

        assertEquals(2L, clusterClient.fcall(newFuncName, new String[] {"one", "two"}).get());
        assertEquals(2L, clusterClient.fcallReadOnly(newFuncName, new String[] {"one", "two"}).get());

        assertEquals(OK, clusterClient.functionFlush(ASYNC).get());
    }

    @SneakyThrows
    @ParameterizedTest
    @MethodSource("getClients")
    public void function_commands_without_keys_and_without_route_binary(
            GlideClusterClient clusterClient) {
        assumeTrue(SERVER_VERSION.isGreaterThanOrEqualTo("7.0.0"), "This feature added in version 7");

        assertEquals(OK, clusterClient.functionFlush(SYNC).get());

        GlideString libName = gs("mylib1c");
        GlideString funcName = gs("myfunc1c");
        // function $funcName returns first argument
        // generating RO functions to execution on a replica (default routing goes to RANDOM including
        // replicas)
        GlideString code =
                generateLuaLibCodeBinary(libName, Map.of(funcName, gs("return args[1]")), true);

        assertEquals(libName, clusterClient.functionLoad(code, false).get());

        assertEquals(
                gs("one"), clusterClient.fcall(funcName, new GlideString[] {gs("one"), gs("two")}).get());
        assertEquals(
                gs("one"),
                clusterClient.fcallReadOnly(funcName, new GlideString[] {gs("one"), gs("two")}).get());

        var flist = clusterClient.functionListBinary(false).get();
        var expectedDescription =
                new HashMap<GlideString, GlideString>() {
                    {
                        put(funcName, null);
                    }
                };
        var expectedFlags =
                new HashMap<GlideString, Set<GlideString>>() {
                    {
                        put(funcName, Set.of(gs("no-writes")));
                    }
                };
        checkFunctionListResponseBinary(
                flist, libName, expectedDescription, expectedFlags, Optional.empty());

        flist = clusterClient.functionListBinary(true).get();
        checkFunctionListResponseBinary(
                flist, libName, expectedDescription, expectedFlags, Optional.of(code));

        // re-load library without overwriting
        var executionException =
                assertThrows(ExecutionException.class, () -> clusterClient.functionLoad(code, false).get());
        assertInstanceOf(RequestException.class, executionException.getCause());
        assertTrue(
                executionException.getMessage().contains("Library '" + libName + "' already exists"));

        // re-load library with overwriting
        assertEquals(libName, clusterClient.functionLoad(code, true).get());
        GlideString newFuncName = gs("myfunc2c");
        // function $funcName returns first argument
        // function $newFuncName returns argument array len
        GlideString newCode =
                generateLuaLibCodeBinary(
                        libName, Map.of(funcName, gs("return args[1]"), newFuncName, gs("return #args")), true);

        assertEquals(libName, clusterClient.functionLoad(newCode, true).get());

        // load new lib and delete it - first lib remains loaded
        GlideString anotherLib =
                generateLuaLibCodeBinary(gs("anotherLib"), Map.of(gs("anotherFunc"), gs("")), false);
        assertEquals(gs("anotherLib"), clusterClient.functionLoad(anotherLib, true).get());
        assertEquals(OK, clusterClient.functionDelete(gs("anotherLib")).get());

        // delete missing lib returns a error
        executionException =
                assertThrows(
                        ExecutionException.class, () -> clusterClient.functionDelete(gs("anotherLib")).get());
        assertInstanceOf(RequestException.class, executionException.getCause());
        assertTrue(executionException.getMessage().contains("Library not found"));

        flist = clusterClient.functionListBinary(libName, false).get();
        expectedDescription.put(newFuncName, null);
        expectedFlags.put(newFuncName, Set.of(gs("no-writes")));
        checkFunctionListResponseBinary(
                flist, libName, expectedDescription, expectedFlags, Optional.empty());

        flist = clusterClient.functionListBinary(libName, true).get();
        checkFunctionListResponseBinary(
                flist, libName, expectedDescription, expectedFlags, Optional.of(newCode));

        assertEquals(
                2L, clusterClient.fcall(newFuncName, new GlideString[] {gs("one"), gs("two")}).get());
        assertEquals(
                2L,
                clusterClient.fcallReadOnly(newFuncName, new GlideString[] {gs("one"), gs("two")}).get());

        assertEquals(OK, clusterClient.functionFlush(ASYNC).get());
    }

    @ParameterizedTest
    @MethodSource("getClientsAndPrefixes")
    @SneakyThrows
    public void fcall_with_keys(GlideClusterClient clusterClient, String prefix) {
        assumeTrue(SERVER_VERSION.isGreaterThanOrEqualTo("7.0.0"), "This feature added in version 7");

        String key = "{" + prefix + "}-fcall_with_keys-";
        SingleNodeRoute route = new SlotKeyRoute(key, PRIMARY);
        String libName = "mylib_with_keys";
        String funcName = "myfunc_with_keys";
        // function $funcName returns array with first two arguments
        String code = generateLuaLibCode(libName, Map.of(funcName, "return {keys[1], keys[2]}"), true);

        // loading function to the node where key is stored
        assertEquals(libName, clusterClient.functionLoad(code, false, route).get());

        // due to common prefix, all keys are mapped to the same hash slot
        var functionResult =
                clusterClient.fcall(funcName, new String[] {key + 1, key + 2}, new String[0]).get();
        assertArrayEquals(new Object[] {key + 1, key + 2}, (Object[]) functionResult);
        functionResult =
                clusterClient.fcallReadOnly(funcName, new String[] {key + 1, key + 2}, new String[0]).get();
        assertArrayEquals(new Object[] {key + 1, key + 2}, (Object[]) functionResult);

        var transaction =
                new ClusterTransaction()
                        .fcall(funcName, new String[] {key + 1, key + 2}, new String[0])
                        .fcallReadOnly(funcName, new String[] {key + 1, key + 2}, new String[0]);

        // check response from a routed transaction request
        assertDeepEquals(
                new Object[][] {{key + 1, key + 2}, {key + 1, key + 2}},
                clusterClient.exec(transaction, route).get());
        // if no route given, GLIDE should detect it automatically
        assertDeepEquals(
                new Object[][] {{key + 1, key + 2}, {key + 1, key + 2}},
                clusterClient.exec(transaction).get());

        assertEquals(OK, clusterClient.functionDelete(libName, route).get());
    }

    @ParameterizedTest
    @MethodSource("getClientsAndPrefixes")
    @SneakyThrows
    public void fcall_binary_with_keys(GlideClusterClient clusterClient, String prefix) {
        assumeTrue(SERVER_VERSION.isGreaterThanOrEqualTo("7.0.0"), "This feature added in version 7");

        String key = "{" + prefix + "}-fcall_with_keys-";
        GlideString binaryString =
                gs(new byte[] {(byte) 0xFE, (byte) 0xEE, (byte) 0xEF, (byte) 252, (byte) 0});
        SingleNodeRoute route = new SlotKeyRoute(key, PRIMARY);
        String libName = "mylib_with_keys_" + prefix;
        GlideString funcName = gs("myfunc_with_keys_" + prefix);
        // function $funcName returns array with first argument
        String code =
                generateLuaLibCode(libName, Map.of(funcName.toString(), "return {args[1]}"), true);

        // loading function to the node where key is stored
        assertEquals(libName, clusterClient.functionLoad(code, false, route).get());

        var functionResult =
                clusterClient
                        .fcall(funcName, new GlideString[] {gs(key)}, new GlideString[] {binaryString})
                        .get();
        assertArrayEquals(new Object[] {binaryString}, (Object[]) functionResult);
        functionResult =
                clusterClient
                        .fcallReadOnly(funcName, new GlideString[] {gs(key)}, new GlideString[] {binaryString})
                        .get();
        assertArrayEquals(new Object[] {binaryString}, (Object[]) functionResult);

        var transaction =
                new ClusterTransaction()
                        .withBinaryOutput()
                        .fcall(funcName, new GlideString[] {gs(key)}, new GlideString[] {binaryString})
                        .fcallReadOnly(funcName, new GlideString[] {gs(key)}, new GlideString[] {binaryString});

        // check response from a routed transaction request
        assertDeepEquals(
                new Object[][] {{binaryString}, {binaryString}},
                clusterClient.exec(transaction, route).get());
        // if no route given, GLIDE should detect it automatically
        assertDeepEquals(
                new Object[][] {{binaryString}, {binaryString}}, clusterClient.exec(transaction).get());

        assertEquals(OK, clusterClient.functionDelete(libName, route).get());
    }

    @SneakyThrows
    @ParameterizedTest
    @MethodSource("getClients")
    public void fcall_readonly_function(GlideClusterClient clusterClient) {
        assumeTrue(SERVER_VERSION.isGreaterThanOrEqualTo("7.0.0"), "This feature added in version 7");

        String libName = "fcall_readonly_function";
        // intentionally using a REPLICA route
        Route replicaRoute = new SlotKeyRoute(libName, REPLICA);
        Route primaryRoute = new SlotKeyRoute(libName, PRIMARY);
        String funcName = "fcall_readonly_function";

        // function $funcName returns a magic number
        String code = generateLuaLibCode(libName, Map.of(funcName, "return 42"), false);

        assertEquals(libName, clusterClient.functionLoad(code, false).get());
        // let replica sync with the primary node
        assertEquals(1L, clusterClient.wait(1L, 4000L).get());

        // fcall on a replica node should fail, because a function isn't guaranteed to be RO
        var executionException =
                assertThrows(
                        ExecutionException.class, () -> clusterClient.fcall(funcName, replicaRoute).get());
        assertInstanceOf(RequestException.class, executionException.getCause());
        assertTrue(
                executionException.getMessage().contains("You can't write against a read only replica."));

        // fcall_ro also fails
        executionException =
                assertThrows(
                        ExecutionException.class,
                        () -> clusterClient.fcallReadOnly(funcName, replicaRoute).get());
        assertInstanceOf(RequestException.class, executionException.getCause());
        assertTrue(
                executionException.getMessage().contains("You can't write against a read only replica."));

        // fcall_ro also fails to run it even on primary - another error
        executionException =
                assertThrows(
                        ExecutionException.class,
                        () -> clusterClient.fcallReadOnly(funcName, primaryRoute).get());
        assertInstanceOf(RequestException.class, executionException.getCause());
        assertTrue(
                executionException
                        .getMessage()
                        .contains("Can not execute a script with write flag using *_ro command."));

        // create the same function, but with RO flag
        code = generateLuaLibCode(libName, Map.of(funcName, "return 42"), true);

        assertEquals(libName, clusterClient.functionLoad(code, true).get());

        // fcall should succeed now
        assertEquals(42L, clusterClient.fcall(funcName, replicaRoute).get().getSingleValue());

        assertEquals(OK, clusterClient.functionDelete(libName).get());
    }

    @SneakyThrows
    @ParameterizedTest
    @MethodSource("getClients")
    public void fcall_readonly_binary_function(GlideClusterClient clusterClient) {
        assumeTrue(SERVER_VERSION.isGreaterThanOrEqualTo("7.0.0"), "This feature added in version 7");
        assumeTrue(
                !SERVER_VERSION.isGreaterThanOrEqualTo("8.0.0"),
                "Temporary disabeling this test on valkey 8");

        String libName = "fcall_readonly_function";
        // intentionally using a REPLICA route
        Route replicaRoute = new SlotKeyRoute(libName, REPLICA);
        Route primaryRoute = new SlotKeyRoute(libName, PRIMARY);
        GlideString funcName = gs("fcall_readonly_function");

        // function $funcName returns a magic number
        String code = generateLuaLibCode(libName, Map.of(funcName.toString(), "return 42"), false);

        assertEquals(libName, clusterClient.functionLoad(code, false).get());

        // fcall on a replica node should fail, because a function isn't guaranteed to be RO
        var executionException =
                assertThrows(
                        ExecutionException.class, () -> clusterClient.fcall(funcName, replicaRoute).get());
        assertInstanceOf(RequestException.class, executionException.getCause());
        assertTrue(
                executionException.getMessage().contains("You can't write against a read only replica."));

        // fcall_ro also fails
        executionException =
                assertThrows(
                        ExecutionException.class,
                        () -> clusterClient.fcallReadOnly(funcName, replicaRoute).get());
        assertInstanceOf(RequestException.class, executionException.getCause());
        assertTrue(
                executionException.getMessage().contains("You can't write against a read only replica."));

        // fcall_ro also fails to run it even on primary - another error
        executionException =
                assertThrows(
                        ExecutionException.class,
                        () -> clusterClient.fcallReadOnly(funcName, primaryRoute).get());
        assertInstanceOf(RequestException.class, executionException.getCause());
        assertTrue(
                executionException
                        .getMessage()
                        .contains("Can not execute a script with write flag using *_ro command."));

        // create the same function, but with RO flag
        code = generateLuaLibCode(libName, Map.of(funcName.toString(), "return 42"), true);

        assertEquals(libName, clusterClient.functionLoad(code, true).get());

        // fcall should succeed now
        assertEquals(42L, clusterClient.fcall(funcName, replicaRoute).get().getSingleValue());

        assertEquals(OK, clusterClient.functionDelete(libName).get());
    }

    @Timeout(20)
    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void functionKill_no_write_without_route(GlideClusterClient clusterClient) {
        assumeTrue(SERVER_VERSION.isGreaterThanOrEqualTo("7.0.0"), "This feature added in version 7");

        String libName = "functionKill_no_write_without_route";
        String funcName = "deadlock_without_route";
        String code = createLuaLibWithLongRunningFunction(libName, funcName, 6, true);

        assertEquals(OK, clusterClient.functionFlush(SYNC).get());

        // nothing to kill
        var exception =
                assertThrows(ExecutionException.class, () -> clusterClient.functionKill().get());
        assertInstanceOf(RequestException.class, exception.getCause());
        assertTrue(exception.getMessage().toLowerCase().contains("notbusy"));

        // load the lib
        assertEquals(libName, clusterClient.functionLoad(code, true).get());

        try (var testClient =
                GlideClusterClient.createClient(commonClusterClientConfig().requestTimeout(10000).build())
                        .get()) {
            try {
                // call the function without await
                // Using a random primary node route, otherwise FCALL can go to a replica.
                // FKILL and FSTATS go to primary nodes if no route given, test fails in such case.
                Route route = new SlotKeyRoute(UUID.randomUUID().toString(), PRIMARY);
                testClient.fcall(funcName, route);

                Thread.sleep(1000);

                // Run FKILL until it returns OK
                boolean functionKilled = false;
                int timeout = 4000; // ms
                while (timeout >= 0) {
                    try {
                        assertEquals(OK, clusterClient.functionKill().get());
                        functionKilled = true;
                        break;
                    } catch (RequestException ignored) {
                    }
                    Thread.sleep(500);
                    timeout -= 500;
                }

                assertTrue(functionKilled);
            } finally {
                waitForNotBusy(clusterClient::functionKill);
            }
        }
    }

    @Timeout(20)
    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void functionKillBinary_no_write_without_route(GlideClusterClient clusterClient) {
        assumeTrue(SERVER_VERSION.isGreaterThanOrEqualTo("7.0.0"), "This feature added in version 7");

        GlideString libName = gs("functionKillBinary_no_write_without_route");
        GlideString funcName = gs("deadlock_without_route");
        GlideString code =
                gs(createLuaLibWithLongRunningFunction(libName.toString(), funcName.toString(), 6, true));

        assertEquals(OK, clusterClient.functionFlush(SYNC).get());

        // nothing to kill
        var exception =
                assertThrows(ExecutionException.class, () -> clusterClient.functionKill().get());
        assertInstanceOf(RequestException.class, exception.getCause());
        assertTrue(exception.getMessage().toLowerCase().contains("notbusy"));

        // load the lib
        assertEquals(libName, clusterClient.functionLoad(code, true).get());

        try (var testClient =
                GlideClusterClient.createClient(commonClusterClientConfig().requestTimeout(10000).build())
                        .get()) {
            try {
                // call the function without await
                // Using a random primary node route, otherwise FCALL can go to a replica.
                // FKILL go to primary nodes if no route given, test fails in such case.
                Route route = new SlotKeyRoute(UUID.randomUUID().toString(), PRIMARY);
                testClient.fcall(funcName, route);

                Thread.sleep(1000);

                // Run FKILL until it returns OK
                boolean functionKilled = false;
                int timeout = 4000; // ms
                while (timeout >= 0) {
                    try {
                        assertEquals(OK, clusterClient.functionKill().get());
                        functionKilled = true;
                        break;
                    } catch (RequestException ignored) {
                    }
                    Thread.sleep(500);
                    timeout -= 500;
                }

                assertTrue(functionKilled);
            } finally {
                waitForNotBusy(clusterClient::functionKill);
            }
        }
    }

    @Timeout(20)
    @ParameterizedTest
    @MethodSource("getTestScenarios")
    @SneakyThrows
    public void functionKill_no_write_with_route(
            GlideClusterClient clusterClient, boolean singleNodeRoute) {
        assumeTrue(SERVER_VERSION.isGreaterThanOrEqualTo("7.0.0"), "This feature added in version 7");

        String libName = "functionKill_no_write_with_route" + singleNodeRoute;
        String funcName = "deadlock_with_route_" + singleNodeRoute;
        String code = createLuaLibWithLongRunningFunction(libName, funcName, 6, true);
        Route route =
                singleNodeRoute ? new SlotKeyRoute(UUID.randomUUID().toString(), PRIMARY) : ALL_PRIMARIES;

        assertEquals(OK, clusterClient.functionFlush(SYNC, route).get());

        // nothing to kill
        var exception =
                assertThrows(ExecutionException.class, () -> clusterClient.functionKill(route).get());
        assertInstanceOf(RequestException.class, exception.getCause());
        assertTrue(exception.getMessage().toLowerCase().contains("notbusy"));

        // load the lib
        assertEquals(libName, clusterClient.functionLoad(code, true, route).get());

        try (var testClient =
                GlideClusterClient.createClient(commonClusterClientConfig().requestTimeout(10000).build())
                        .get()) {
            try {
                // call the function without await
                testClient.fcall(funcName, route);

                Thread.sleep(1000);
                boolean functionKilled = false;
                int timeout = 4000; // ms
                while (timeout >= 0) {
                    try {
                        assertEquals(OK, clusterClient.functionKill().get());
                        functionKilled = true;
                        break;
                    } catch (RequestException ignored) {
                    }
                    Thread.sleep(500);
                    timeout -= 500;
                }

                assertTrue(functionKilled);
            } finally {
                waitForNotBusy(clusterClient::functionKill);
            }
        }
    }

    @Timeout(20)
    @ParameterizedTest
    @MethodSource("getTestScenarios")
    @SneakyThrows
    public void functionKillBinary_no_write_with_route(
            GlideClusterClient clusterClient, boolean singleNodeRoute) {
        assumeTrue(SERVER_VERSION.isGreaterThanOrEqualTo("7.0.0"), "This feature added in version 7");

        GlideString libName = gs("functionKillBinary_no_write_with_route" + singleNodeRoute);
        GlideString funcName = gs("deadlock_with_route_" + singleNodeRoute);
        GlideString code =
                gs(createLuaLibWithLongRunningFunction(libName.toString(), funcName.toString(), 6, true));
        Route route =
                singleNodeRoute ? new SlotKeyRoute(UUID.randomUUID().toString(), PRIMARY) : ALL_PRIMARIES;

        assertEquals(OK, clusterClient.functionFlush(SYNC, route).get());

        // nothing to kill
        var exception =
                assertThrows(ExecutionException.class, () -> clusterClient.functionKill(route).get());
        assertInstanceOf(RequestException.class, exception.getCause());
        assertTrue(exception.getMessage().toLowerCase().contains("notbusy"));

        // load the lib
        assertEquals(libName, clusterClient.functionLoad(code, true, route).get());

        try (var testClient =
                GlideClusterClient.createClient(commonClusterClientConfig().requestTimeout(10000).build())
                        .get()) {
            try {
                // call the function without await
                testClient.fcall(funcName, route);

                Thread.sleep(1000);

                boolean functionKilled = false;
                int timeout = 4000; // ms
                while (timeout >= 0) {
                    try {
                        assertEquals(OK, clusterClient.functionKill().get());
                        functionKilled = true;
                        break;
                    } catch (RequestException ignored) {
                    }
                    Thread.sleep(500);
                    timeout -= 500;
                }

                assertTrue(functionKilled);
            } finally {
                waitForNotBusy(clusterClient::functionKill);
            }
        }
    }

    @Timeout(20)
    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void functionKill_key_based_write_function(GlideClusterClient clusterClient) {
        assumeTrue(SERVER_VERSION.isGreaterThanOrEqualTo("7.0.0"), "This feature added in version 7");

        String libName = "functionKill_key_based_write_function";
        String funcName = "deadlock_write_function_with_key_based_route";
        String key = libName;
        String code = createLuaLibWithLongRunningFunction(libName, funcName, 6, false);
        Route route = new SlotKeyRoute(key, PRIMARY);

        assertEquals(OK, clusterClient.functionFlush(SYNC, route).get());
        CompletableFuture<Object> promise = new CompletableFuture<>();
        promise.complete(null);

        // nothing to kill
        var exception =
                assertThrows(ExecutionException.class, () -> clusterClient.functionKill(route).get());
        assertInstanceOf(RequestException.class, exception.getCause());
        assertTrue(exception.getMessage().toLowerCase().contains("notbusy"));

        // load the lib
        assertEquals(libName, clusterClient.functionLoad(code, true, route).get());

        try (var testClient =
                GlideClusterClient.createClient(commonClusterClientConfig().requestTimeout(10000).build())
                        .get()) {
            try {
                // call the function without await
                promise = testClient.fcall(funcName, new String[] {key}, new String[0]);

                Thread.sleep(1000);

                boolean foundUnkillable = false;
                int timeout = 4000; // ms
                while (timeout >= 0) {
                    try {
                        // valkey kills a function with 5 sec delay
                        // but this will always throw an error in the test
                        clusterClient.functionKill(route).get();
                    } catch (ExecutionException executionException) {
                        // looking for an error with "unkillable" in the message
                        // at that point we can break the loop
                        if (executionException.getCause() instanceof RequestException
                                && executionException.getMessage().toLowerCase().contains("unkillable")) {
                            foundUnkillable = true;
                            break;
                        }
                    }
                    Thread.sleep(500);
                    timeout -= 500;
                }
                assertTrue(foundUnkillable);
            } finally {
                // If function wasn't killed, and it didn't time out - it blocks the server and cause rest
                // test to fail.
                // wait for the function to complete (we cannot kill it)
                try {
                    promise.get();
                } catch (Exception ignored) {
                }
            }
        }
    }

    @Timeout(20)
    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void functionKillBinary_key_based_write_function(GlideClusterClient clusterClient) {
        assumeTrue(SERVER_VERSION.isGreaterThanOrEqualTo("7.0.0"), "This feature added in version 7");

        GlideString libName = gs("functionKillBinary_key_based_write_function");
        GlideString funcName = gs("deadlock_write_function_with_key_based_route");
        GlideString key = libName;
        GlideString code =
                gs(createLuaLibWithLongRunningFunction(libName.toString(), funcName.toString(), 6, false));
        Route route = new SlotKeyRoute(key.toString(), PRIMARY);

        assertEquals(OK, clusterClient.functionFlush(SYNC, route).get());

        CompletableFuture<Object> promise = new CompletableFuture<>();
        promise.complete(null);

        // nothing to kill
        var exception =
                assertThrows(ExecutionException.class, () -> clusterClient.functionKill(route).get());
        assertInstanceOf(RequestException.class, exception.getCause());
        assertTrue(exception.getMessage().toLowerCase().contains("notbusy"));

        // load the lib
        assertEquals(libName, clusterClient.functionLoad(code, true, route).get());

        try (var testClient =
                GlideClusterClient.createClient(commonClusterClientConfig().requestTimeout(10000).build())
                        .get()) {
            try {
                // call the function without await
                promise = testClient.fcall(funcName, new GlideString[] {key}, new GlideString[0]);

                Thread.sleep(1000);

                boolean foundUnkillable = false;
                int timeout = 4000; // ms
                while (timeout >= 0) {
                    try {
                        // valkey kills a function with 5 sec delay
                        // but this will always throw an error in the test
                        clusterClient.functionKill(route).get();
                    } catch (ExecutionException executionException) {
                        // looking for an error with "unkillable" in the message
                        // at that point we can break the loop
                        if (executionException.getCause() instanceof RequestException
                                && executionException.getMessage().toLowerCase().contains("unkillable")) {
                            foundUnkillable = true;
                            break;
                        }
                    }
                    Thread.sleep(500);
                    timeout -= 500;
                }
                assertTrue(foundUnkillable);
            } finally {
                // If function wasn't killed, and it didn't time out - it blocks the server and cause rest
                // test to fail.
                // wait for the function to complete (we cannot kill it)
                try {
                    promise.get();
                } catch (Exception ignored) {
                }
            }
        }
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void functionStats_without_route(GlideClusterClient clusterClient) {
        assumeTrue(SERVER_VERSION.isGreaterThanOrEqualTo("7.0.0"), "This feature added in version 7");

        String libName = "functionStats_without_route";
        String funcName = libName;
        assertEquals(OK, clusterClient.functionFlush(SYNC).get());

        // function $funcName returns first argument
        String code = generateLuaLibCode(libName, Map.of(funcName, "return args[1]"), false);
        assertEquals(libName, clusterClient.functionLoad(code, true).get());

        var response = clusterClient.functionStats().get().getMultiValue();
        for (var nodeResponse : response.values()) {
            checkFunctionStatsResponse(nodeResponse, new String[0], 1, 1);
        }

        code =
                generateLuaLibCode(
                        libName + "_2",
                        Map.of(funcName + "_2", "return 'OK'", funcName + "_3", "return 42"),
                        false);
        assertEquals(libName + "_2", clusterClient.functionLoad(code, true).get());

        response = clusterClient.functionStats().get().getMultiValue();
        for (var nodeResponse : response.values()) {
            checkFunctionStatsResponse(nodeResponse, new String[0], 2, 3);
        }

        assertEquals(OK, clusterClient.functionFlush(SYNC).get());

        response = clusterClient.functionStats().get().getMultiValue();
        for (var nodeResponse : response.values()) {
            checkFunctionStatsResponse(nodeResponse, new String[0], 0, 0);
        }
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void functionStatsBinary_without_route(GlideClusterClient clusterClient) {
        assumeTrue(SERVER_VERSION.isGreaterThanOrEqualTo("7.0.0"), "This feature added in version 7");

        GlideString libName = gs("functionStats_without_route");
        GlideString funcName = libName;
        assertEquals(OK, clusterClient.functionFlush(SYNC).get());

        // function $funcName returns first argument
        GlideString code =
                generateLuaLibCodeBinary(libName, Map.of(funcName, gs("return args[1]")), false);
        assertEquals(libName, clusterClient.functionLoad(code, true).get());

        var response = clusterClient.functionStatsBinary().get().getMultiValue();
        for (var nodeResponse : response.values()) {
            checkFunctionStatsBinaryResponse(nodeResponse, new GlideString[0], 1, 1);
        }

        code =
                generateLuaLibCodeBinary(
                        gs(libName.toString() + "_2"),
                        Map.of(
                                gs(funcName.toString() + "_2"),
                                gs("return 'OK'"),
                                gs(funcName.toString() + "_3"),
                                gs("return 42")),
                        false);
        assertEquals(gs(libName.toString() + "_2"), clusterClient.functionLoad(code, true).get());

        response = clusterClient.functionStatsBinary().get().getMultiValue();
        for (var nodeResponse : response.values()) {
            checkFunctionStatsBinaryResponse(nodeResponse, new GlideString[0], 2, 3);
        }

        assertEquals(OK, clusterClient.functionFlush(SYNC).get());

        response = clusterClient.functionStatsBinary().get().getMultiValue();
        for (var nodeResponse : response.values()) {
            checkFunctionStatsBinaryResponse(nodeResponse, new GlideString[0], 0, 0);
        }
    }

    @ParameterizedTest
    @MethodSource("getTestScenarios")
    @SneakyThrows
    public void functionStats_with_route(GlideClusterClient clusterClient, boolean singleNodeRoute) {
        assumeTrue(SERVER_VERSION.isGreaterThanOrEqualTo("7.0.0"), "This feature added in version 7");
        Route route =
                singleNodeRoute ? new SlotKeyRoute(UUID.randomUUID().toString(), PRIMARY) : ALL_PRIMARIES;
        String libName = "functionStats_with_route_" + singleNodeRoute;
        String funcName = libName;

        assertEquals(OK, clusterClient.functionFlush(SYNC, route).get());

        // function $funcName returns first argument
        String code = generateLuaLibCode(libName, Map.of(funcName, "return args[1]"), false);
        assertEquals(libName, clusterClient.functionLoad(code, true, route).get());

        var response = clusterClient.functionStats(route).get();
        if (singleNodeRoute) {
            checkFunctionStatsResponse(response.getSingleValue(), new String[0], 1, 1);
        } else {
            for (var nodeResponse : response.getMultiValue().values()) {
                checkFunctionStatsResponse(nodeResponse, new String[0], 1, 1);
            }
        }

        code =
                generateLuaLibCode(
                        libName + "_2",
                        Map.of(funcName + "_2", "return 'OK'", funcName + "_3", "return 42"),
                        false);
        assertEquals(libName + "_2", clusterClient.functionLoad(code, true, route).get());

        response = clusterClient.functionStats(route).get();
        if (singleNodeRoute) {
            checkFunctionStatsResponse(response.getSingleValue(), new String[0], 2, 3);
        } else {
            for (var nodeResponse : response.getMultiValue().values()) {
                checkFunctionStatsResponse(nodeResponse, new String[0], 2, 3);
            }
        }

        assertEquals(OK, clusterClient.functionFlush(SYNC, route).get());

        response = clusterClient.functionStats(route).get();
        if (singleNodeRoute) {
            checkFunctionStatsResponse(response.getSingleValue(), new String[0], 0, 0);
        } else {
            for (var nodeResponse : response.getMultiValue().values()) {
                checkFunctionStatsResponse(nodeResponse, new String[0], 0, 0);
            }
        }
    }

    @ParameterizedTest
    @MethodSource("getTestScenarios")
    @SneakyThrows
    public void functionStatsBinary_with_route(
            GlideClusterClient clusterClient, boolean singleNodeRoute) {
        assumeTrue(SERVER_VERSION.isGreaterThanOrEqualTo("7.0.0"), "This feature added in version 7");
        Route route =
                singleNodeRoute ? new SlotKeyRoute(UUID.randomUUID().toString(), PRIMARY) : ALL_PRIMARIES;
        GlideString libName = gs("functionStats_with_route_" + singleNodeRoute);
        GlideString funcName = libName;

        assertEquals(OK, clusterClient.functionFlush(SYNC, route).get());

        // function $funcName returns first argument
        GlideString code =
                generateLuaLibCodeBinary(libName, Map.of(funcName, gs("return args[1]")), false);
        assertEquals(libName, clusterClient.functionLoad(code, true, route).get());

        var response = clusterClient.functionStatsBinary(route).get();
        if (singleNodeRoute) {
            checkFunctionStatsBinaryResponse(response.getSingleValue(), new GlideString[0], 1, 1);
        } else {
            for (var nodeResponse : response.getMultiValue().values()) {
                checkFunctionStatsBinaryResponse(nodeResponse, new GlideString[0], 1, 1);
            }
        }

        code =
                generateLuaLibCodeBinary(
                        gs(libName.toString() + "_2"),
                        Map.of(
                                gs(funcName.toString() + "_2"),
                                gs("return 'OK'"),
                                gs(funcName.toString() + "_3"),
                                gs("return 42")),
                        false);
        assertEquals(
                gs(libName.toString() + "_2"), clusterClient.functionLoad(code, true, route).get());

        response = clusterClient.functionStatsBinary(route).get();
        if (singleNodeRoute) {
            checkFunctionStatsBinaryResponse(response.getSingleValue(), new GlideString[0], 2, 3);
        } else {
            for (var nodeResponse : response.getMultiValue().values()) {
                checkFunctionStatsBinaryResponse(nodeResponse, new GlideString[0], 2, 3);
            }
        }

        assertEquals(OK, clusterClient.functionFlush(SYNC, route).get());

        response = clusterClient.functionStatsBinary(route).get();
        if (singleNodeRoute) {
            checkFunctionStatsBinaryResponse(response.getSingleValue(), new GlideString[0], 0, 0);
        } else {
            for (var nodeResponse : response.getMultiValue().values()) {
                checkFunctionStatsBinaryResponse(nodeResponse, new GlideString[0], 0, 0);
            }
        }
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void function_dump_and_restore(GlideClusterClient clusterClient) {
        assumeTrue(SERVER_VERSION.isGreaterThanOrEqualTo("7.0.0"), "This feature added in version 7");

        assertEquals(OK, clusterClient.functionFlush(SYNC).get());

        // dumping an empty lib
        byte[] emptyDump = clusterClient.functionDump().get();
        assertTrue(emptyDump.length > 0);

        String name1 = "Foster";
        String libname1 = "FosterLib";
        String name2 = "Dogster";
        String libname2 = "DogsterLib";

        // function $name1 returns first argument
        // function $name2 returns argument array len
        String code =
                generateLuaLibCode(libname1, Map.of(name1, "return args[1]", name2, "return #args"), true);
        assertEquals(libname1, clusterClient.functionLoad(code, true).get());
        Map<String, Object>[] flist = clusterClient.functionList(true).get();

        final byte[] dump = clusterClient.functionDump().get();

        // restore without cleaning the lib and/or overwrite option causes an error
        var executionException =
                assertThrows(ExecutionException.class, () -> clusterClient.functionRestore(dump).get());
        assertInstanceOf(RequestException.class, executionException.getCause());
        assertTrue(executionException.getMessage().contains("Library " + libname1 + " already exists"));

        // APPEND policy also fails for the same reason (name collision)
        executionException =
                assertThrows(
                        ExecutionException.class, () -> clusterClient.functionRestore(dump, APPEND).get());
        assertInstanceOf(RequestException.class, executionException.getCause());
        assertTrue(executionException.getMessage().contains("Library " + libname1 + " already exists"));

        // REPLACE policy succeeds
        assertEquals(OK, clusterClient.functionRestore(dump, REPLACE).get());
        // but nothing changed - all code overwritten
        var restoredFunctionList = clusterClient.functionList(true).get();
        assertEquals(1, restoredFunctionList.length);
        assertEquals(libname1, restoredFunctionList[0].get("library_name"));
        // Note that function ordering may differ across nodes so we can't do a deep equals
        assertEquals(2, ((Object[]) restoredFunctionList[0].get("functions")).length);

        // create lib with another name, but with the same function names
        assertEquals(OK, clusterClient.functionFlush(SYNC).get());
        code =
                generateLuaLibCode(libname2, Map.of(name1, "return args[1]", name2, "return #args"), true);
        assertEquals(libname2, clusterClient.functionLoad(code, true).get());
        restoredFunctionList = clusterClient.functionList(true).get();
        assertEquals(1, restoredFunctionList.length);
        assertEquals(libname2, restoredFunctionList[0].get("library_name"));

        // REPLACE policy now fails due to a name collision
        executionException =
                assertThrows(
                        ExecutionException.class, () -> clusterClient.functionRestore(dump, REPLACE).get());
        assertInstanceOf(RequestException.class, executionException.getCause());
        // valkey checks names in random order and blames on first collision
        assertTrue(
                executionException.getMessage().contains("Function " + name1 + " already exists")
                        || executionException.getMessage().contains("Function " + name2 + " already exists"));

        // FLUSH policy succeeds, but deletes the second lib
        assertEquals(OK, clusterClient.functionRestore(dump, FLUSH).get());
        restoredFunctionList = clusterClient.functionList(true).get();
        assertEquals(1, restoredFunctionList.length);
        assertEquals(libname1, restoredFunctionList[0].get("library_name"));
        // Note that function ordering may differ across nodes
        assertEquals(2, ((Object[]) restoredFunctionList[0].get("functions")).length);

        // call restored functions
        assertEquals(
                "meow",
                clusterClient.fcallReadOnly(name1, new String[0], new String[] {"meow", "woem"}).get());
        assertEquals(
                2L, clusterClient.fcallReadOnly(name2, new String[0], new String[] {"meow", "woem"}).get());
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void randomKey(GlideClusterClient clusterClient) {
        String key1 = "{key}" + UUID.randomUUID();
        String key2 = "{key}" + UUID.randomUUID();

        assertEquals(OK, clusterClient.set(key1, "a").get());
        assertEquals(OK, clusterClient.set(key2, "b").get());

        String randomKey = clusterClient.randomKey().get();
        assertEquals(1L, clusterClient.exists(new String[] {randomKey}).get());

        String randomKeyPrimaries = clusterClient.randomKey(ALL_PRIMARIES).get();
        assertEquals(1L, clusterClient.exists(new String[] {randomKeyPrimaries}).get());

        // no keys in database
        assertEquals(OK, clusterClient.flushall(SYNC).get());

        // no keys in database returns null
        assertNull(clusterClient.randomKey().get());
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void randomKeyBinary(GlideClusterClient clusterClient) {
        GlideString key1 = gs("{key}" + UUID.randomUUID());
        GlideString key2 = gs("{key}" + UUID.randomUUID());

        assertEquals(OK, clusterClient.set(key1, gs("a")).get());
        assertEquals(OK, clusterClient.set(key2, gs("b")).get());

        GlideString randomKey = clusterClient.randomKeyBinary().get();
        assertEquals(1L, clusterClient.exists(new GlideString[] {randomKey}).get());

        GlideString randomKeyPrimaries = clusterClient.randomKeyBinary(ALL_PRIMARIES).get();
        assertEquals(1L, clusterClient.exists(new GlideString[] {randomKeyPrimaries}).get());

        // no keys in database
        assertEquals(OK, clusterClient.flushall(SYNC).get());

        // no keys in database returns null
        assertNull(clusterClient.randomKey().get());
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void sort(GlideClusterClient clusterClient) {
        String key1 = "{key}-1" + UUID.randomUUID();
        String key2 = "{key}-2" + UUID.randomUUID();
        String key3 = "{key}-3" + UUID.randomUUID();
        String[] key1LpushArgs = {"2", "1", "4", "3"};
        String[] key1AscendingList = {"1", "2", "3", "4"};
        String[] key1DescendingList = {"4", "3", "2", "1"};
        String[] key2LpushArgs = {"2", "1", "a", "x", "c", "4", "3"};
        String[] key2DescendingList = {"x", "c", "a", "4", "3", "2", "1"};
        String[] key2DescendingListSubset = Arrays.copyOfRange(key2DescendingList, 0, 4);

        assertArrayEquals(new String[0], clusterClient.sort(key3).get());
        assertEquals(4, clusterClient.lpush(key1, key1LpushArgs).get());
        assertArrayEquals(
                new String[0],
                clusterClient
                        .sort(key1, SortOptions.builder().limit(new SortBaseOptions.Limit(0L, 0L)).build())
                        .get());
        assertArrayEquals(
                key1DescendingList,
                clusterClient.sort(key1, SortOptions.builder().orderBy(DESC).build()).get());
        assertArrayEquals(
                Arrays.copyOfRange(key1AscendingList, 0, 2),
                clusterClient
                        .sort(key1, SortOptions.builder().limit(new SortBaseOptions.Limit(0L, 2L)).build())
                        .get());
        assertEquals(7, clusterClient.lpush(key2, key2LpushArgs).get());
        assertArrayEquals(
                key2DescendingListSubset,
                clusterClient
                        .sort(
                                key2,
                                SortOptions.builder()
                                        .alpha()
                                        .orderBy(DESC)
                                        .limit(new SortBaseOptions.Limit(0L, 4L))
                                        .build())
                        .get());

        // SORT_R0
        if (SERVER_VERSION.isGreaterThanOrEqualTo("7.0.0")) {
            assertArrayEquals(
                    key1DescendingList,
                    clusterClient.sortReadOnly(key1, SortOptions.builder().orderBy(DESC).build()).get());
            assertArrayEquals(
                    Arrays.copyOfRange(key1AscendingList, 0, 2),
                    clusterClient
                            .sortReadOnly(
                                    key1, SortOptions.builder().limit(new SortBaseOptions.Limit(0L, 2L)).build())
                            .get());
            assertArrayEquals(
                    key2DescendingListSubset,
                    clusterClient
                            .sortReadOnly(
                                    key2,
                                    SortOptions.builder()
                                            .alpha()
                                            .orderBy(DESC)
                                            .limit(new SortBaseOptions.Limit(0L, 4L))
                                            .build())
                            .get());
        }

        // SORT with STORE
        assertEquals(
                4,
                clusterClient
                        .sortStore(
                                key2,
                                key3,
                                SortOptions.builder()
                                        .alpha()
                                        .orderBy(DESC)
                                        .limit(new SortBaseOptions.Limit(0L, 4L))
                                        .build())
                        .get());
        assertArrayEquals(key2DescendingListSubset, clusterClient.lrange(key3, 0, -1).get());
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void sort_binary(GlideClusterClient clusterClient) {
        GlideString key1 = gs("{key}-1" + UUID.randomUUID());
        GlideString key2 = gs("{key}-2" + UUID.randomUUID());
        GlideString key3 = gs("{key}-3" + UUID.randomUUID());
        GlideString[] key1LpushArgs = {gs("2"), gs("1"), gs("4"), gs("3")};
        GlideString[] key1AscendingList = {gs("1"), gs("2"), gs("3"), gs("4")};
        GlideString[] key1DescendingList = {gs("4"), gs("3"), gs("2"), gs("1")};
        GlideString[] key2LpushArgs = {gs("2"), gs("1"), gs("a"), gs("x"), gs("c"), gs("4"), gs("3")};
        GlideString[] key2DescendingList = {
            gs("x"), gs("c"), gs("a"), gs("4"), gs("3"), gs("2"), gs("1")
        };
        String[] key2DescendingList_strings = {"x", "c", "a", "4", "3", "2", "1"};
        GlideString[] key2DescendingListSubset = Arrays.copyOfRange(key2DescendingList, 0, 4);
        String[] key2DescendingListSubset_strings =
                Arrays.copyOfRange(key2DescendingList_strings, 0, 4);

        assertArrayEquals(new GlideString[0], clusterClient.sort(key3).get());
        assertEquals(4, clusterClient.lpush(key1, key1LpushArgs).get());
        assertArrayEquals(
                new GlideString[0],
                clusterClient
                        .sort(
                                key1, SortOptionsBinary.builder().limit(new SortBaseOptions.Limit(0L, 0L)).build())
                        .get());
        assertArrayEquals(
                key1DescendingList,
                clusterClient.sort(key1, SortOptionsBinary.builder().orderBy(DESC).build()).get());
        assertArrayEquals(
                Arrays.copyOfRange(key1AscendingList, 0, 2),
                clusterClient
                        .sort(
                                key1, SortOptionsBinary.builder().limit(new SortBaseOptions.Limit(0L, 2L)).build())
                        .get());
        assertEquals(7, clusterClient.lpush(key2, key2LpushArgs).get());
        assertArrayEquals(
                key2DescendingListSubset,
                clusterClient
                        .sort(
                                key2,
                                SortOptionsBinary.builder()
                                        .alpha()
                                        .orderBy(DESC)
                                        .limit(new SortBaseOptions.Limit(0L, 4L))
                                        .build())
                        .get());

        // SORT_R0
        if (SERVER_VERSION.isGreaterThanOrEqualTo("7.0.0")) {
            assertArrayEquals(
                    key1DescendingList,
                    clusterClient
                            .sortReadOnly(key1, SortOptionsBinary.builder().orderBy(DESC).build())
                            .get());
            assertArrayEquals(
                    Arrays.copyOfRange(key1AscendingList, 0, 2),
                    clusterClient
                            .sortReadOnly(
                                    key1,
                                    SortOptionsBinary.builder().limit(new SortBaseOptions.Limit(0L, 2L)).build())
                            .get());
            assertArrayEquals(
                    key2DescendingListSubset,
                    clusterClient
                            .sortReadOnly(
                                    key2,
                                    SortOptionsBinary.builder()
                                            .alpha()
                                            .orderBy(DESC)
                                            .limit(new SortBaseOptions.Limit(0L, 4L))
                                            .build())
                            .get());
        }

        // SORT with STORE
        assertEquals(
                4,
                clusterClient
                        .sortStore(
                                key2,
                                key3,
                                SortOptionsBinary.builder()
                                        .alpha()
                                        .orderBy(DESC)
                                        .limit(new SortBaseOptions.Limit(0L, 4L))
                                        .build())
                        .get());
        assertArrayEquals(
                key2DescendingListSubset_strings, clusterClient.lrange(key3.toString(), 0, -1).get());
    }

    @Timeout(20)
    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void test_cluster_scan_simple(GlideClusterClient clusterClient) {
        assertEquals(OK, clusterClient.flushall().get());

        String key = "key:test_cluster_scan_simple" + UUID.randomUUID();
        Map<String, String> expectedData = new LinkedHashMap<>();
        for (int i = 0; i < 100; i++) {
            expectedData.put(key + ":" + i, "value " + i);
        }

        assertEquals(OK, clusterClient.mset(expectedData).get());

        Set<String> result = new LinkedHashSet<>();
        ClusterScanCursor cursor = ClusterScanCursor.initalCursor();
        while (!cursor.isFinished()) {
            final Object[] response = clusterClient.scan(cursor).get();
            cursor.releaseCursorHandle();

            cursor = (ClusterScanCursor) response[0];
            final Object[] data = (Object[]) response[1];
            for (Object datum : data) {
                result.add(datum.toString());
            }
        }
        cursor.releaseCursorHandle();

        assertEquals(expectedData.keySet(), result);
    }

    @Timeout(20)
    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void test_cluster_scan_binary_simple(GlideClusterClient clusterClient) {
        assertEquals(OK, clusterClient.flushall().get());

        String key = "key:test_cluster_scan_simple" + UUID.randomUUID();
        Map<String, String> expectedData = new LinkedHashMap<>();
        for (int i = 0; i < 100; i++) {
            expectedData.put(key + ":" + i, "value " + i);
        }

        assertEquals(OK, clusterClient.mset(expectedData).get());

        Set<String> result = new LinkedHashSet<>();
        ClusterScanCursor cursor = ClusterScanCursor.initalCursor();
        while (!cursor.isFinished()) {
            final Object[] response = clusterClient.scanBinary(cursor).get();
            cursor.releaseCursorHandle();

            cursor = (ClusterScanCursor) response[0];
            final Object[] data = (Object[]) response[1];
            for (Object datum : data) {
                result.add(datum.toString());
            }
        }
        cursor.releaseCursorHandle();

        assertEquals(expectedData.keySet(), result);
    }

    @Timeout(20)
    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void test_cluster_scan_with_object_type_and_pattern(GlideClusterClient clusterClient) {
        assertEquals(OK, clusterClient.flushall().get());
        String key = "key:" + UUID.randomUUID();
        Map<String, String> expectedData = new LinkedHashMap<>();
        final int baseNumberOfEntries = 100;
        for (int i = 0; i < baseNumberOfEntries; i++) {
            expectedData.put(key + ":" + i, "value " + i);
        }

        assertEquals(OK, clusterClient.mset(expectedData).get());

        ArrayList<String> unexpectedTypeKeys = new ArrayList<>();
        for (int i = baseNumberOfEntries; i < baseNumberOfEntries + 100; i++) {
            unexpectedTypeKeys.add(key + ":" + i);
        }

        for (String keyStr : unexpectedTypeKeys) {
            assertEquals(1L, clusterClient.sadd(keyStr, new String[] {"value"}).get());
        }

        Map<String, String> unexpectedPatterns = new LinkedHashMap<>();
        for (int i = baseNumberOfEntries + 100; i < baseNumberOfEntries + 200; i++) {
            unexpectedPatterns.put("foo:" + i, "value " + i);
        }
        assertEquals(OK, clusterClient.mset(unexpectedPatterns).get());

        Set<String> result = new LinkedHashSet<>();
        ClusterScanCursor cursor = ClusterScanCursor.initalCursor();
        while (!cursor.isFinished()) {
            final Object[] response =
                    clusterClient
                            .scan(
                                    cursor,
                                    ScanOptions.builder()
                                            .matchPattern("key:*")
                                            .type(ScanOptions.ObjectType.STRING)
                                            .build())
                            .get();
            cursor.releaseCursorHandle();

            cursor = (ClusterScanCursor) response[0];
            final Object[] data = (Object[]) response[1];
            for (Object datum : data) {
                result.add(datum.toString());
            }
        }
        cursor.releaseCursorHandle();
        assertEquals(expectedData.keySet(), result);

        // Ensure that no unexpected types were in the result.
        assertFalse(new LinkedHashSet<>(result).removeAll(new LinkedHashSet<>(unexpectedTypeKeys)));
        assertFalse(new LinkedHashSet<>(result).removeAll(unexpectedPatterns.keySet()));
    }

    @Timeout(20)
    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void test_cluster_scan_with_count(GlideClusterClient clusterClient) {
        assertEquals(OK, clusterClient.flushall().get());
        String key = "key:" + UUID.randomUUID();
        Map<String, String> expectedData = new LinkedHashMap<>();
        final int baseNumberOfEntries = 2000;
        for (int i = 0; i < baseNumberOfEntries; i++) {
            expectedData.put(key + ":" + i, "value " + i);
        }

        assertEquals(OK, clusterClient.mset(expectedData).get());

        ClusterScanCursor cursor = ClusterScanCursor.initalCursor();
        Set<String> keys = new LinkedHashSet<>();
        int successfulComparedScans = 0;
        while (!cursor.isFinished()) {
            Object[] resultOf1 =
                    clusterClient.scan(cursor, ScanOptions.builder().count(1L).build()).get();
            cursor.releaseCursorHandle();
            cursor = (ClusterScanCursor) resultOf1[0];
            keys.addAll(
                    Arrays.stream((Object[]) resultOf1[1])
                            .map(Object::toString)
                            .collect(Collectors.toList()));
            if (cursor.isFinished()) {
                break;
            }

            Object[] resultOf100 =
                    clusterClient.scan(cursor, ScanOptions.builder().count(100L).build()).get();
            cursor.releaseCursorHandle();
            cursor = (ClusterScanCursor) resultOf100[0];
            keys.addAll(
                    Arrays.stream((Object[]) resultOf100[1])
                            .map(Object::toString)
                            .collect(Collectors.toList()));

            // Note: count is only an optimization hint. It does not have to return the size specified.
            if (resultOf1.length <= resultOf100.length) {
                successfulComparedScans++;
            }
        }
        cursor.releaseCursorHandle();
        assertTrue(successfulComparedScans > 0);
        assertEquals(expectedData.keySet(), keys);
    }

    @Timeout(20)
    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void test_cluster_scan_with_match(GlideClusterClient clusterClient) {
        assertEquals(OK, clusterClient.flushall().get());
        String key = "key:" + UUID.randomUUID();
        Map<String, String> expectedData = new LinkedHashMap<>();
        final int baseNumberOfEntries = 2000;
        for (int i = 0; i < baseNumberOfEntries; i++) {
            expectedData.put(key + ":" + i, "value " + i);
        }
        assertEquals(OK, clusterClient.mset(expectedData).get());

        Map<String, String> unexpectedPatterns = new LinkedHashMap<>();
        for (int i = baseNumberOfEntries + 100; i < baseNumberOfEntries + 200; i++) {
            unexpectedPatterns.put("foo:" + i, "value " + i);
        }
        assertEquals(OK, clusterClient.mset(unexpectedPatterns).get());

        ClusterScanCursor cursor = ClusterScanCursor.initalCursor();
        Set<String> keys = new LinkedHashSet<>();
        while (!cursor.isFinished()) {
            Object[] result =
                    clusterClient.scan(cursor, ScanOptions.builder().matchPattern("key:*").build()).get();
            cursor.releaseCursorHandle();
            cursor = (ClusterScanCursor) result[0];
            keys.addAll(
                    Arrays.stream((Object[]) result[1]).map(Object::toString).collect(Collectors.toList()));
        }
        cursor.releaseCursorHandle();
        assertEquals(expectedData.keySet(), keys);
        assertFalse(new LinkedHashSet<>(keys).removeAll(unexpectedPatterns.keySet()));
    }

    @Timeout(20)
    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void test_cluster_scan_cleaning_cursor(GlideClusterClient clusterClient) {
        // We test whether the cursor is cleaned up after it is deleted, which we expect to happen when
        // the GC is called.
        assertEquals(OK, clusterClient.flushall().get());

        String key = "key:" + UUID.randomUUID();
        Map<String, String> expectedData = new LinkedHashMap<>();
        final int baseNumberOfEntries = 100;
        for (int i = 0; i < baseNumberOfEntries; i++) {
            expectedData.put(key + ":" + i, "value " + i);
        }
        assertEquals(OK, clusterClient.mset(expectedData).get());

        ClusterScanCursor cursor = ClusterScanCursor.initalCursor();
        final Object[] response = clusterClient.scan(cursor).get();
        cursor = (ClusterScanCursor) (response[0]);
        cursor.releaseCursorHandle();
        final ClusterScanCursor brokenCursor = cursor;
        ExecutionException exception =
                assertThrows(ExecutionException.class, () -> clusterClient.scan(brokenCursor).get());
        assertInstanceOf(RequestException.class, exception.getCause());
        assertTrue(exception.getCause().getMessage().contains("Invalid scan_state_cursor id"));
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void test_cluster_scan_all_strings(GlideClusterClient clusterClient) {
        assertEquals(OK, clusterClient.flushall().get());

        String key = "key:" + UUID.randomUUID();
        Map<String, String> stringData = new LinkedHashMap<>();
        final int baseNumberOfEntries = 5;
        for (int i = 0; i < baseNumberOfEntries; i++) {
            stringData.put(key + ":" + i, "value " + i);
        }
        assertEquals(OK, clusterClient.mset(stringData).get());

        ClusterScanCursor cursor = ClusterScanCursor.initalCursor();
        Set<String> results = new LinkedHashSet<>();
        while (!cursor.isFinished()) {
            Object[] response =
                    clusterClient
                            .scan(cursor, ScanOptions.builder().type(ScanOptions.ObjectType.STRING).build())
                            .get();
            cursor.releaseCursorHandle();
            cursor = (ClusterScanCursor) response[0];
            results.addAll(
                    Arrays.stream((Object[]) response[1]).map(Object::toString).collect(Collectors.toSet()));
        }
        cursor.releaseCursorHandle();
        assertEquals(stringData.keySet(), results);
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void test_cluster_scan_all_set(GlideClusterClient clusterClient) {
        assertEquals(OK, clusterClient.flushall().get());
        final int baseNumberOfEntries = 5;

        String setKey = "setKey:" + UUID.randomUUID();
        Map<String, String> setData = new LinkedHashMap<>();
        for (int i = 0; i < baseNumberOfEntries; i++) {
            setData.put(setKey + ":" + i, "value " + i);
        }
        for (String k : setData.keySet()) {
            assertEquals(1L, clusterClient.sadd(k, new String[] {"value" + k}).get());
        }

        ClusterScanCursor cursor = ClusterScanCursor.initalCursor();
        Set<String> results = new LinkedHashSet<>();
        while (!cursor.isFinished()) {
            Object[] response =
                    clusterClient
                            .scan(cursor, ScanOptions.builder().type(ScanOptions.ObjectType.SET).build())
                            .get();
            cursor.releaseCursorHandle();
            cursor = (ClusterScanCursor) response[0];
            results.addAll(
                    Arrays.stream((Object[]) response[1]).map(Object::toString).collect(Collectors.toSet()));
        }
        cursor.releaseCursorHandle();
        assertEquals(setData.keySet(), results);
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void test_cluster_scan_all_hash(GlideClusterClient clusterClient) {
        assertEquals(OK, clusterClient.flushall().get());
        final int baseNumberOfEntries = 5;

        String hashKey = "hashKey:" + UUID.randomUUID();
        Map<String, String> hashData = new LinkedHashMap<>();
        for (int i = 0; i < baseNumberOfEntries; i++) {
            hashData.put(hashKey + ":" + i, "value " + i);
        }
        for (String k : hashData.keySet()) {
            assertEquals(1L, clusterClient.hset(k, Map.of("field" + k, "value" + k)).get());
        }

        ClusterScanCursor cursor = ClusterScanCursor.initalCursor();
        Set<String> results = new LinkedHashSet<>();
        while (!cursor.isFinished()) {
            Object[] response =
                    clusterClient
                            .scan(cursor, ScanOptions.builder().type(ScanOptions.ObjectType.HASH).build())
                            .get();
            cursor.releaseCursorHandle();
            cursor = (ClusterScanCursor) response[0];
            results.addAll(
                    Arrays.stream((Object[]) response[1]).map(Object::toString).collect(Collectors.toSet()));
        }
        cursor.releaseCursorHandle();
        assertEquals(hashData.keySet(), results);
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void test_cluster_scan_all_list(GlideClusterClient clusterClient) {
        assertEquals(OK, clusterClient.flushall().get());
        final int baseNumberOfEntries = 5;

        String listKey = "listKey:" + UUID.randomUUID();
        Map<String, String> listData = new LinkedHashMap<>();
        for (int i = 0; i < baseNumberOfEntries; i++) {
            listData.put(listKey + ":" + i, "value " + i);
        }
        for (String k : listData.keySet()) {
            assertEquals(1L, clusterClient.lpush(k, new String[] {"value" + k}).get());
        }

        ClusterScanCursor cursor = ClusterScanCursor.initalCursor();
        Set<String> results = new LinkedHashSet<>();
        while (!cursor.isFinished()) {
            Object[] response =
                    clusterClient
                            .scan(cursor, ScanOptions.builder().type(ScanOptions.ObjectType.LIST).build())
                            .get();
            cursor.releaseCursorHandle();
            cursor = (ClusterScanCursor) response[0];
            results.addAll(
                    Arrays.stream((Object[]) response[1]).map(Object::toString).collect(Collectors.toSet()));
        }
        cursor.releaseCursorHandle();
        assertEquals(listData.keySet(), results);
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void test_cluster_scan_all_sorted_set(GlideClusterClient clusterClient) {
        assertEquals(OK, clusterClient.flushall().get());
        final int baseNumberOfEntries = 5;

        String zSetKey = "zSetKey:" + UUID.randomUUID();
        Map<String, String> zSetData = new LinkedHashMap<>();
        for (int i = 0; i < baseNumberOfEntries; i++) {
            zSetData.put(zSetKey + ":" + i, "value " + i);
        }
        for (String k : zSetData.keySet()) {
            assertEquals(1L, clusterClient.zadd(k, Map.of(k, 1.0)).get());
        }

        ClusterScanCursor cursor = ClusterScanCursor.initalCursor();
        Set<String> results = new LinkedHashSet<>();

        while (!cursor.isFinished()) {
            Object[] response =
                    clusterClient
                            .scan(cursor, ScanOptions.builder().type(ScanOptions.ObjectType.ZSET).build())
                            .get();
            cursor.releaseCursorHandle();
            cursor = (ClusterScanCursor) response[0];
            results.addAll(
                    Arrays.stream((Object[]) response[1]).map(Object::toString).collect(Collectors.toSet()));
        }
        cursor.releaseCursorHandle();
        assertEquals(zSetData.keySet(), results);
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void test_cluster_scan_all_stream(GlideClusterClient clusterClient) {
        assertEquals(OK, clusterClient.flushall().get());
        final int baseNumberOfEntries = 5;

        String streamKey = "streamKey:" + UUID.randomUUID();
        Map<String, String> streamData = new LinkedHashMap<>();
        for (int i = 0; i < baseNumberOfEntries; i++) {
            streamData.put(streamKey + ":" + i, "value " + i);
        }
        for (String k : streamData.keySet()) {
            assertNotNull(clusterClient.xadd(k, Map.of(k, "value " + k)).get());
        }

        ClusterScanCursor cursor = ClusterScanCursor.initalCursor();
        Set<String> results = new LinkedHashSet<>();

        while (!cursor.isFinished()) {
            Object[] response =
                    clusterClient
                            .scan(cursor, ScanOptions.builder().type(ScanOptions.ObjectType.STREAM).build())
                            .get();
            cursor.releaseCursorHandle();
            cursor = (ClusterScanCursor) response[0];
            results.addAll(
                    Arrays.stream((Object[]) response[1]).map(Object::toString).collect(Collectors.toSet()));
        }
        cursor.releaseCursorHandle();
        assertEquals(streamData.keySet(), results);
    }

    @SneakyThrows
    @ParameterizedTest
    @MethodSource("getClients")
    public void invokeScript_test(GlideClusterClient clusterClient) {
        String key1 = UUID.randomUUID().toString();
        String key2 = UUID.randomUUID().toString();

        try (Script script = new Script("return 'Hello'", false)) {
            Object response = clusterClient.invokeScript(script).get();
            assertEquals("Hello", response);
        }

        try (Script script = new Script("return redis.call('SET', KEYS[1], ARGV[1])", false)) {
            Object setResponse1 =
                    clusterClient
                            .invokeScript(script, ScriptOptions.builder().key(key1).arg("value1").build())
                            .get();
            assertEquals(OK, setResponse1);

            Object setResponse2 =
                    clusterClient
                            .invokeScript(script, ScriptOptions.builder().key(key2).arg("value2").build())
                            .get();
            assertEquals(OK, setResponse2);
        }

        try (Script script = new Script("return redis.call('GET', KEYS[1])", false)) {
            Object getResponse1 =
                    clusterClient.invokeScript(script, ScriptOptions.builder().key(key1).build()).get();
            assertEquals("value1", getResponse1);

            // Use GlideString in option but we still expect nonbinary output
            Object getResponse2 =
                    clusterClient
                            .invokeScript(script, ScriptOptionsGlideString.builder().key(gs(key2)).build())
                            .get();
            assertEquals("value2", getResponse2);
        }
    }

    @SneakyThrows
    @ParameterizedTest
    @MethodSource("getClients")
    public void script_large_keys_and_or_args(GlideClusterClient clusterClient) {
        String str1 = "0".repeat(1 << 12); // 4k
        String str2 = "0".repeat(1 << 12); // 4k

        try (Script script = new Script("return KEYS[1]", false)) {
            // 1 very big key
            Object response =
                    clusterClient
                            .invokeScript(script, ScriptOptions.builder().key(str1 + str2).build())
                            .get();
            assertEquals(str1 + str2, response);
        }

        try (Script script = new Script("return KEYS[1]", false)) {
            // 2 big keys
            Object response =
                    clusterClient
                            .invokeScript(script, ScriptOptions.builder().key(str1).key(str2).build())
                            .get();
            assertEquals(str1, response);
        }

        try (Script script = new Script("return ARGV[1]", false)) {
            // 1 very big arg
            Object response =
                    clusterClient
                            .invokeScript(script, ScriptOptions.builder().arg(str1 + str2).build())
                            .get();
            assertEquals(str1 + str2, response);
        }

        try (Script script = new Script("return ARGV[1]", false)) {
            // 1 big arg + 1 big key
            Object response =
                    clusterClient
                            .invokeScript(script, ScriptOptions.builder().arg(str1).key(str2).build())
                            .get();
            assertEquals(str2, response);
        }
    }

    @SneakyThrows
    @ParameterizedTest
    @MethodSource("getClients")
    public void invokeScript_gs_test(GlideClusterClient clusterClient) {
        GlideString key1 = gs(UUID.randomUUID().toString());
        GlideString key2 = gs(UUID.randomUUID().toString());

        try (Script script = new Script(gs("return 'Hello'"), true)) {
            Object response = clusterClient.invokeScript(script).get();
            assertEquals(gs("Hello"), response);
        }

        try (Script script = new Script(gs("return redis.call('SET', KEYS[1], ARGV[1])"), true)) {
            Object setResponse1 =
                    clusterClient
                            .invokeScript(
                                    script, ScriptOptionsGlideString.builder().key(key1).arg(gs("value1")).build())
                            .get();
            assertEquals(OK, setResponse1);

            Object setResponse2 =
                    clusterClient
                            .invokeScript(
                                    script, ScriptOptionsGlideString.builder().key(key2).arg(gs("value2")).build())
                            .get();
            assertEquals(OK, setResponse2);
        }

        try (Script script = new Script(gs("return redis.call('GET', KEYS[1])"), true)) {
            Object getResponse1 =
                    clusterClient
                            .invokeScript(script, ScriptOptionsGlideString.builder().key(key1).build())
                            .get();
            assertEquals(gs("value1"), getResponse1);

            // Use String in option but we still expect binary output (GlideString)
            Object getResponse2 =
                    clusterClient
                            .invokeScript(script, ScriptOptions.builder().key(key2.toString()).build())
                            .get();
            assertEquals(gs("value2"), getResponse2);
        }
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void scriptExists(GlideClusterClient clusterClient) {
        Script script1 = new Script("return 'Hello'", true);
        Script script2 = new Script("return 'World'", true);
        Script script3 = new Script("return 'Hello World'", true);
        String key = UUID.randomUUID().toString();
        SingleNodeRoute route = new SlotKeyRoute(key, PRIMARY);
        Boolean[] expected = new Boolean[] {true, false, true, false};

        // Load script1 to all nodes, do not load script2 and load script3 with route
        clusterClient.invokeScript(script1).get();
        clusterClient.invokeScript(script3, route).get();

        // Get the SHA1 digests of the scripts
        String sha1_1 = script1.getHash();
        String sha1_2 = script2.getHash();
        String sha1_3 = script3.getHash();
        String nonExistentSha1 = "0".repeat(40); // A SHA1 that doesn't exist

        // Check existence of scripts
        Boolean[] result =
                clusterClient.scriptExists(new String[] {sha1_1, sha1_2, sha1_3, nonExistentSha1}).get();
        Boolean[] result2 =
                clusterClient
                        .scriptExists(new String[] {sha1_1, sha1_2, sha1_3, nonExistentSha1}, route)
                        .get();
        assertArrayEquals(expected, result);
        assertArrayEquals(expected, result2);
        script1.close();
        script2.close();
        script3.close();
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void scriptExistsBinary(GlideClusterClient clusterClient) {
        Script script1 = new Script(gs("return 'Hello'"), true);
        Script script2 = new Script(gs("return 'World'"), true);
        Script script3 = new Script(gs("return 'Hello World'"), true);
        String key = UUID.randomUUID().toString();
        SingleNodeRoute route = new SlotKeyRoute(key, PRIMARY);
        Boolean[] expected = new Boolean[] {true, false, true, false};

        // Load script1 to all nodes, do not load script2 and load script3 with route
        clusterClient.invokeScript(script1).get();
        clusterClient.invokeScript(script3, route).get();

        // Get the SHA1 digests of the scripts
        GlideString sha1_1 = gs(script1.getHash());
        GlideString sha1_2 = gs(script2.getHash());
        GlideString sha1_3 = gs(script3.getHash());
        GlideString nonExistentSha1 = gs("0".repeat(40)); // A SHA1 that doesn't exist

        // Check existence of scripts
        Boolean[] result =
                clusterClient
                        .scriptExists(new GlideString[] {sha1_1, sha1_2, sha1_3, nonExistentSha1})
                        .get();
        Boolean[] result2 =
                clusterClient
                        .scriptExists(new GlideString[] {sha1_1, sha1_2, sha1_3, nonExistentSha1}, route)
                        .get();
        assertArrayEquals(expected, result);
        assertArrayEquals(expected, result2);
        script1.close();
        script2.close();
        script3.close();
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void scriptFlush(GlideClusterClient clusterClient) {
        Script script = new Script("return 'Hello'", true);

        // Load script
        clusterClient.invokeScript(script, ALL_PRIMARIES).get();

        // Check existence of scripts
        Boolean[] result =
                clusterClient.scriptExists(new String[] {script.getHash()}, ALL_PRIMARIES).get();
        assertArrayEquals(new Boolean[] {true}, result);

        // flush the script cache
        assertEquals(OK, clusterClient.scriptFlush(ALL_PRIMARIES).get());

        // check that the script no longer exists
        result = clusterClient.scriptExists(new String[] {script.getHash()}, ALL_PRIMARIES).get();
        assertArrayEquals(new Boolean[] {false}, result);

        // Test with ASYNC mode
        clusterClient.invokeScript(script, ALL_PRIMARIES).get();
        assertEquals(OK, clusterClient.scriptFlush(FlushMode.ASYNC, ALL_PRIMARIES).get());
        result = clusterClient.scriptExists(new String[] {script.getHash()}, ALL_PRIMARIES).get();
        assertArrayEquals(new Boolean[] {false}, result);
        script.close();
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void scriptKill_with_route(GlideClusterClient clusterClient) {
        // create and load a long-running script and a primary node route
        Script script = new Script(createLongRunningLuaScript(5, true), true);
        RequestRoutingConfiguration.Route route =
                new RequestRoutingConfiguration.SlotKeyRoute(UUID.randomUUID().toString(), PRIMARY);

        // Verify that script_kill raises an error when no script is running
        ExecutionException executionException =
                assertThrows(ExecutionException.class, () -> clusterClient.scriptKill(route).get());
        assertInstanceOf(RequestException.class, executionException.getCause());
        assertTrue(
                executionException
                        .getMessage()
                        .toLowerCase()
                        .contains("no scripts in execution right now"));

        CompletableFuture<Object> promise = new CompletableFuture<>();
        promise.complete(null);

        try (var testClient =
                GlideClusterClient.createClient(commonClusterClientConfig().requestTimeout(10000).build())
                        .get()) {
            try {
                testClient.invokeScript(script, route);

                Thread.sleep(1000);

                // Run script kill until it returns OK
                boolean scriptKilled = false;
                int timeout = 4000; // ms
                while (timeout >= 0) {
                    try {
                        assertEquals(OK, clusterClient.scriptKill(route).get());
                        scriptKilled = true;
                        break;
                    } catch (RequestException ignored) {
                    }
                    Thread.sleep(500);
                    timeout -= 500;
                }

                assertTrue(scriptKilled);
            } finally {
                waitForNotBusy(clusterClient::scriptKill);
                script.close();
            }
        }

        // Verify that script_kill raises an error when no script is running
        executionException =
                assertThrows(ExecutionException.class, () -> clusterClient.scriptKill(route).get());
        assertInstanceOf(RequestException.class, executionException.getCause());
        assertTrue(
                executionException
                        .getMessage()
                        .toLowerCase()
                        .contains("no scripts in execution right now"));
    }

    @SneakyThrows
    @ParameterizedTest
    @MethodSource("getClients")
    public void scriptKill_unkillable(GlideClusterClient clusterClient) {
        String key = UUID.randomUUID().toString();
        RequestRoutingConfiguration.Route route =
                new RequestRoutingConfiguration.SlotKeyRoute(key, PRIMARY);
        String code = createLongRunningLuaScript(6, false);
        Script script = new Script(code, false);

        CompletableFuture<Object> promise = new CompletableFuture<>();
        promise.complete(null);

        try (var testClient =
                GlideClusterClient.createClient(commonClusterClientConfig().requestTimeout(10000).build())
                        .get()) {
            try {
                // run the script without await
                promise = testClient.invokeScript(script, ScriptOptions.builder().key(key).build());

                Thread.sleep(1000);

                boolean foundUnkillable = false;
                int timeout = 4000; // ms
                while (timeout >= 0) {
                    try {
                        // valkey kills a script with 5 sec delay
                        // but this will always throw an error in the test
                        clusterClient.scriptKill(route).get();
                    } catch (ExecutionException execException) {
                        // looking for an error with "unkillable" in the message
                        // at that point we can break the loop
                        if (execException.getCause() instanceof RequestException
                                && execException.getMessage().toLowerCase().contains("unkillable")) {
                            foundUnkillable = true;
                            break;
                        }
                    }
                    Thread.sleep(500);
                    timeout -= 500;
                }
                assertTrue(foundUnkillable);
            } finally {
                // If script wasn't killed, and it didn't time out - it blocks the server and cause rest
                // test to fail.
                // wait for the script to complete (we cannot kill it)
                try {
                    promise.get();
                } catch (Exception ignored) {
                }
                script.close();
            }
        }
    }
}
