/** Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0 */
package glide.cluster;

import static glide.TestConfiguration.SERVER_VERSION;
import static glide.TestUtilities.assertDeepEquals;
import static glide.TestUtilities.commonClusterClientConfig;
import static glide.TestUtilities.generateLuaLibCode;
import static glide.api.BaseClient.OK;
import static glide.api.models.GlideString.gs;
import static glide.api.models.commands.SortBaseOptions.OrderBy.DESC;
import static glide.api.models.configuration.RequestRoutingConfiguration.SimpleMultiNodeRoute.ALL_PRIMARIES;
import static glide.api.models.configuration.RequestRoutingConfiguration.SimpleSingleNodeRoute.RANDOM;
import static glide.utils.ArrayTransformUtils.concatenateArrays;
import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;
import static org.junit.jupiter.api.Named.named;

import glide.TransactionTestUtilities.TransactionBuilder;
import glide.api.GlideClusterClient;
import glide.api.models.ClusterTransaction;
import glide.api.models.GlideString;
import glide.api.models.commands.SortOptions;
import glide.api.models.commands.function.FunctionRestorePolicy;
import glide.api.models.commands.stream.StreamAddOptions;
import glide.api.models.configuration.ProtocolVersion;
import glide.api.models.configuration.RequestRoutingConfiguration.SingleNodeRoute;
import glide.api.models.configuration.RequestRoutingConfiguration.SlotIdRoute;
import glide.api.models.configuration.RequestRoutingConfiguration.SlotType;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Stream;
import lombok.SneakyThrows;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

@Timeout(10) // seconds
public class ClusterTransactionTests {

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

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void custom_command_info(GlideClusterClient clusterClient) {
        ClusterTransaction transaction = new ClusterTransaction().customCommand(new String[] {"info"});
        Object[] result = clusterClient.exec(transaction).get();
        assertTrue(((String) result[0]).contains("# Stats"));
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void info_simple_route_test(GlideClusterClient clusterClient) {
        ClusterTransaction transaction = new ClusterTransaction().info().info();
        Object[] result = clusterClient.exec(transaction, RANDOM).get();

        assertTrue(((String) result[0]).contains("# Stats"));
        assertTrue(((String) result[1]).contains("# Stats"));
    }

    public static Stream<Arguments> getCommonTransactionBuilders() {
        return glide.TransactionTestUtilities.getCommonTransactionBuilders()
                .flatMap(
                        test ->
                                getClients()
                                        .map(client -> Arguments.of(test.get()[0], test.get()[1], client.get()[0])));
    }

    @SneakyThrows
    @ParameterizedTest(name = "{0}")
    @MethodSource("getCommonTransactionBuilders")
    public void transactions_with_group_of_commands(
            String testName, TransactionBuilder builder, GlideClusterClient clusterClient) {
        ClusterTransaction transaction = new ClusterTransaction();
        Object[] expectedResult = builder.apply(transaction);

        Object[] results = clusterClient.exec(transaction).get();
        assertDeepEquals(expectedResult, results);
    }

    public static Stream<Arguments> getPrimaryNodeTransactionBuilders() {
        return glide.TransactionTestUtilities.getPrimaryNodeTransactionBuilders()
                .flatMap(
                        test ->
                                getClients()
                                        .map(client -> Arguments.of(test.get()[0], test.get()[1], client.get()[0])));
    }

    @SneakyThrows
    @ParameterizedTest(name = "{0}")
    @MethodSource("getPrimaryNodeTransactionBuilders")
    public void keyless_transactions_with_group_of_commands(
            String testName, TransactionBuilder builder, GlideClusterClient clusterClient) {
        ClusterTransaction transaction = new ClusterTransaction();
        Object[] expectedResult = builder.apply(transaction);

        SingleNodeRoute route = new SlotIdRoute(1, SlotType.PRIMARY);
        Object[] results = clusterClient.exec(transaction, route).get();
        assertDeepEquals(expectedResult, results);
    }

    @SneakyThrows
    @ParameterizedTest
    @MethodSource("getClients")
    public void test_transaction_large_values(GlideClusterClient clusterClient) {
        int length = 1 << 25; // 33mb
        String key = "0".repeat(length);
        String value = "0".repeat(length);

        ClusterTransaction transaction = new ClusterTransaction();
        transaction.set(key, value);
        transaction.get(key);

        Object[] expectedResult =
                new Object[] {
                    OK, // transaction.set(key, value);
                    value, // transaction.get(key);
                };

        Object[] result = clusterClient.exec(transaction).get();
        assertArrayEquals(expectedResult, result);
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void lastsave(GlideClusterClient clusterClient) {
        var yesterday = Instant.now().minus(1, ChronoUnit.DAYS);
        var response = clusterClient.exec(new ClusterTransaction().lastsave()).get();
        assertTrue(Instant.ofEpochSecond((long) response[0]).isAfter(yesterday));
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void objectFreq(GlideClusterClient clusterClient) {
        String objectFreqKey = "key";
        String maxmemoryPolicy = "maxmemory-policy";
        String oldPolicy =
                clusterClient.configGet(new String[] {maxmemoryPolicy}).get().get(maxmemoryPolicy);
        try {
            ClusterTransaction transaction = new ClusterTransaction();
            transaction.configSet(Map.of(maxmemoryPolicy, "allkeys-lfu"));
            transaction.set(objectFreqKey, "");
            transaction.objectFreq(objectFreqKey);
            var response = clusterClient.exec(transaction).get();
            assertEquals(OK, response[0]);
            assertEquals(OK, response[1]);
            assertTrue((long) response[2] >= 0L);
        } finally {
            clusterClient.configSet(Map.of(maxmemoryPolicy, oldPolicy));
        }
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void objectIdletime(GlideClusterClient clusterClient) {
        String objectIdletimeKey = "key";
        ClusterTransaction transaction = new ClusterTransaction();
        transaction.set(objectIdletimeKey, "");
        transaction.objectIdletime(objectIdletimeKey);
        var response = clusterClient.exec(transaction).get();
        assertEquals(OK, response[0]);
        assertTrue((long) response[1] >= 0L);
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void objectRefcount(GlideClusterClient clusterClient) {
        String objectRefcountKey = "key";
        ClusterTransaction transaction = new ClusterTransaction();
        transaction.set(objectRefcountKey, "");
        transaction.objectRefcount(objectRefcountKey);
        var response = clusterClient.exec(transaction).get();
        assertEquals(OK, response[0]);
        assertTrue((long) response[1] >= 0L);
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void zrank_zrevrank_withscores(GlideClusterClient clusterClient) {
        assumeTrue(SERVER_VERSION.isGreaterThanOrEqualTo("7.2.0"));
        String zSetKey1 = "{key}:zsetKey1-" + UUID.randomUUID();
        ClusterTransaction transaction = new ClusterTransaction();
        transaction.zadd(zSetKey1, Map.of("one", 1.0, "two", 2.0, "three", 3.0));
        transaction.zrankWithScore(zSetKey1, "one");
        transaction.zrevrankWithScore(zSetKey1, "one");

        Object[] result = clusterClient.exec(transaction).get();
        assertEquals(3L, result[0]);
        assertArrayEquals(new Object[] {0L, 1.0}, (Object[]) result[1]);
        assertArrayEquals(new Object[] {2L, 1.0}, (Object[]) result[2]);
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void watch(GlideClusterClient clusterClient) {
        String key1 = "{key}-1" + UUID.randomUUID();
        String key2 = "{key}-2" + UUID.randomUUID();
        String key3 = "{key}-3" + UUID.randomUUID();
        String key4 = "{key}-4" + UUID.randomUUID();
        String foobarString = "foobar";
        String helloString = "hello";
        String[] keys = new String[] {key1, key2, key3};
        ClusterTransaction setFoobarTransaction = new ClusterTransaction();
        ClusterTransaction setHelloTransaction = new ClusterTransaction();
        String[] expectedExecResponse = new String[] {OK, OK, OK};

        // Returns null when a watched key is modified before it is executed in a transaction command.
        // Transaction commands are not performed.
        assertEquals(OK, clusterClient.watch(keys).get());
        assertEquals(OK, clusterClient.set(key2, helloString).get());
        setFoobarTransaction.set(key1, foobarString).set(key2, foobarString).set(key3, foobarString);
        assertNull(clusterClient.exec(setFoobarTransaction).get()); // Sanity check
        assertNull(clusterClient.get(key1).get());
        assertEquals(helloString, clusterClient.get(key2).get());
        assertNull(clusterClient.get(key3).get());

        // Transaction executes command successfully with a read command on the watch key before
        // transaction is executed.
        assertEquals(OK, clusterClient.watch(keys).get());
        assertEquals(helloString, clusterClient.get(key2).get());
        assertArrayEquals(expectedExecResponse, clusterClient.exec(setFoobarTransaction).get());
        assertEquals(foobarString, clusterClient.get(key1).get()); // Sanity check
        assertEquals(foobarString, clusterClient.get(key2).get());
        assertEquals(foobarString, clusterClient.get(key3).get());

        // Transaction executes command successfully with unmodified watched keys
        assertEquals(OK, clusterClient.watch(keys).get());
        assertArrayEquals(expectedExecResponse, clusterClient.exec(setFoobarTransaction).get());
        assertEquals(foobarString, clusterClient.get(key1).get()); // Sanity check
        assertEquals(foobarString, clusterClient.get(key2).get());
        assertEquals(foobarString, clusterClient.get(key3).get());

        // Transaction executes command successfully with a modified watched key but is not in the
        // transaction.
        assertEquals(OK, clusterClient.watch(new String[] {key4}).get());
        setHelloTransaction.set(key1, helloString).set(key2, helloString).set(key3, helloString);
        assertArrayEquals(expectedExecResponse, clusterClient.exec(setHelloTransaction).get());
        assertEquals(helloString, clusterClient.get(key1).get()); // Sanity check
        assertEquals(helloString, clusterClient.get(key2).get());
        assertEquals(helloString, clusterClient.get(key3).get());

        // TODO activate test when https://github.com/valkey-io/valkey-glide/issues/2380 fixed
        // ExecutionException executionException =
        //         assertThrows(ExecutionException.class, () -> clusterClient.watch(new String[]
        // {}).get());
        // assertInstanceOf(RequestException.class, executionException.getCause());
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void unwatch(GlideClusterClient clusterClient) {
        String key1 = "{key}-1" + UUID.randomUUID();
        String key2 = "{key}-2" + UUID.randomUUID();
        String foobarString = "foobar";
        String helloString = "hello";
        String[] keys = new String[] {key1, key2};
        ClusterTransaction setFoobarTransaction = new ClusterTransaction();
        String[] expectedExecResponse = new String[] {OK, OK};

        // UNWATCH returns OK when there no watched keys
        assertEquals(OK, clusterClient.unwatch().get());

        // Transaction executes successfully after modifying a watched key then calling UNWATCH
        assertEquals(OK, clusterClient.watch(keys).get());
        assertEquals(OK, clusterClient.set(key2, helloString).get());
        assertEquals(OK, clusterClient.unwatch().get());
        assertEquals(OK, clusterClient.unwatch(ALL_PRIMARIES).get());
        setFoobarTransaction.set(key1, foobarString).set(key2, foobarString);
        assertArrayEquals(expectedExecResponse, clusterClient.exec(setFoobarTransaction).get());
        assertEquals(foobarString, clusterClient.get(key1).get());
        assertEquals(foobarString, clusterClient.get(key2).get());
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void spublish(GlideClusterClient clusterClient) {
        assumeTrue(SERVER_VERSION.isGreaterThanOrEqualTo("7.0.0"), "This feature added in version 7");
        ClusterTransaction transaction = new ClusterTransaction().publish("messagae", "Schannel", true);

        assertArrayEquals(new Object[] {0L}, clusterClient.exec(transaction).get());
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void sort(GlideClusterClient clusterClient) {
        var prefix = "{" + UUID.randomUUID() + "}:";
        String key1 = prefix + "1";
        String key2 = prefix + "2";
        String key3 = prefix + "3";
        String key4 = prefix + "4";
        String key5 = prefix + "5";
        String key6 = prefix + "6";
        String[] descendingList = new String[] {"3", "2", "1"};
        ClusterTransaction transaction = new ClusterTransaction();
        String[] ascendingListByAge = new String[] {"Bob", "Alice"};
        String[] descendingListByAge = new String[] {"Alice", "Bob"};
        transaction
                .lpush(key1, new String[] {"3", "1", "2"})
                .sort(key1, SortOptions.builder().orderBy(DESC).build())
                .sortStore(key1, key2, SortOptions.builder().orderBy(DESC).build())
                .lrange(key2, 0, -1);

        if (SERVER_VERSION.isGreaterThanOrEqualTo("7.0.0")) {
            transaction.sortReadOnly(key1, SortOptions.builder().orderBy(DESC).build());
        }

        if (SERVER_VERSION.isGreaterThanOrEqualTo("8.0.0")) {
            transaction
                    .hset(key3, Map.of("name", "Alice", "age", "30"))
                    .hset(key4, Map.of("name", "Bob", "age", "25"))
                    .lpush(key5, new String[] {"4", "3"})
                    .sort(
                            key5,
                            SortOptions.builder()
                                    .byPattern(prefix + "*->age")
                                    .getPattern(prefix + "*->name")
                                    .build())
                    .sort(
                            key5,
                            SortOptions.builder()
                                    .orderBy(DESC)
                                    .byPattern(prefix + "*->age")
                                    .getPattern(prefix + "*->name")
                                    .build())
                    .sortStore(
                            key5,
                            key6,
                            SortOptions.builder()
                                    .byPattern(prefix + "*->age")
                                    .getPattern(prefix + "*->name")
                                    .build())
                    .lrange(key6, 0, -1)
                    .sortStore(
                            key5,
                            key6,
                            SortOptions.builder()
                                    .orderBy(DESC)
                                    .byPattern(prefix + "*->age")
                                    .getPattern(prefix + "*->name")
                                    .build())
                    .lrange(key6, 0, -1);
        }

        Object[] results = clusterClient.exec(transaction).get();
        Object[] expectedResult =
                new Object[] {
                    3L, // lpush(key1, new String[] {"3", "1", "2"})
                    descendingList, // sort(key1, SortOptions.builder().orderBy(DESC).build())
                    3L, // sortStore(key1, key2, DESC))
                    descendingList, // lrange(key2, 0, -1)
                };

        if (SERVER_VERSION.isGreaterThanOrEqualTo("7.0.0")) {
            expectedResult =
                    concatenateArrays(
                            expectedResult, new Object[] {descendingList} // sortReadOnly(key1, DESC)
                            );
        }

        if (SERVER_VERSION.isGreaterThanOrEqualTo("8.0.0")) {
            expectedResult =
                    concatenateArrays(
                            expectedResult,
                            new Object[] {
                                2L, // hset(key3, Map.of("name", "Alice", "age", "30"))
                                2L, // hset(key4, Map.of("name", "Bob", "age", "25"))
                                2L, // lpush(key5, new String[] {"4", "3"})
                                ascendingListByAge, // sort(key5, SortOptions)
                                descendingListByAge, // sort(key5, SortOptions)
                                2L, // sortStore(key5, ksy6, SortOptions)
                                ascendingListByAge, // lrange(key6, 0, -1)
                                2L, // sortStore(key5, ksy6, SortOptions)
                                descendingListByAge, // lrange(key6, 0, -1)
                            });
        }

        assertDeepEquals(expectedResult, results);
    }

    @SneakyThrows
    @ParameterizedTest
    @MethodSource("getClients")
    public void waitTest(GlideClusterClient clusterClient) {
        // setup
        String key = UUID.randomUUID().toString();
        long numreplicas = 1L;
        long timeout = 1000L;
        ClusterTransaction transaction = new ClusterTransaction();

        transaction.set(key, "value").wait(numreplicas, timeout);
        Object[] results = clusterClient.exec(transaction).get();
        Object[] expectedResult =
                new Object[] {
                    OK, // set(key,  "value")
                    0L, // wait(numreplicas, timeout)
                };
        assertEquals(expectedResult[0], results[0]);
        assertTrue((Long) expectedResult[1] <= (Long) results[1]);
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void test_transaction_function_dump_restore(GlideClusterClient clusterClient) {
        assumeTrue(SERVER_VERSION.isGreaterThanOrEqualTo("7.0.0"));
        String libName = "mylib";
        String funcName = "myfun";
        String code = generateLuaLibCode(libName, Map.of(funcName, "return args[1]"), true);

        // Setup
        clusterClient.functionLoad(code, true).get();

        // Verify functionDump
        ClusterTransaction transaction = new ClusterTransaction().withBinaryOutput().functionDump();
        Object[] result = clusterClient.exec(transaction).get();
        GlideString payload = (GlideString) (result[0]);

        // Verify functionRestore
        transaction = new ClusterTransaction();
        transaction.functionRestore(payload.getBytes(), FunctionRestorePolicy.REPLACE);
        // For the cluster mode, PRIMARY SlotType is required to avoid the error:
        //  "RequestError: An error was signalled by the server -
        //   ReadOnly: You can't write against a read only replica."
        Object[] response = clusterClient.exec(transaction, new SlotIdRoute(1, SlotType.PRIMARY)).get();
        assertEquals(OK, response[0]);
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void test_transaction_xinfoStream(GlideClusterClient clusterClient) {
        ClusterTransaction transaction = new ClusterTransaction();
        final String streamKey = "{streamKey}-" + UUID.randomUUID();
        LinkedHashMap<String, Object> expectedStreamInfo =
                new LinkedHashMap<>() {
                    {
                        put("radix-tree-keys", 1L);
                        put("radix-tree-nodes", 2L);
                        put("length", 1L);
                        put("groups", 0L);
                        put("first-entry", new Object[] {"0-1", new Object[] {"field1", "value1"}});
                        put("last-generated-id", "0-1");
                        put("last-entry", new Object[] {"0-1", new Object[] {"field1", "value1"}});
                    }
                };
        LinkedHashMap<String, Object> expectedStreamFullInfo =
                new LinkedHashMap<>() {
                    {
                        put("radix-tree-keys", 1L);
                        put("radix-tree-nodes", 2L);
                        put("entries", new Object[][] {{"0-1", new Object[] {"field1", "value1"}}});
                        put("length", 1L);
                        put("groups", new Object[0]);
                        put("last-generated-id", "0-1");
                    }
                };

        transaction
                .xadd(streamKey, Map.of("field1", "value1"), StreamAddOptions.builder().id("0-1").build())
                .xinfoStream(streamKey)
                .xinfoStreamFull(streamKey);

        Object[] results = clusterClient.exec(transaction).get();

        if (SERVER_VERSION.isGreaterThanOrEqualTo("7.0.0")) {
            expectedStreamInfo.put("max-deleted-entry-id", "0-0");
            expectedStreamInfo.put("entries-added", 1L);
            expectedStreamInfo.put("recorded-first-entry-id", "0-1");
            expectedStreamFullInfo.put("max-deleted-entry-id", "0-0");
            expectedStreamFullInfo.put("entries-added", 1L);
            expectedStreamFullInfo.put("recorded-first-entry-id", "0-1");
        }

        assertDeepEquals(
                new Object[] {
                    "0-1", // xadd(streamKey1, Map.of("field1", "value1"), ... .id("0-1").build());
                    expectedStreamInfo, // xinfoStream(streamKey)
                    expectedStreamFullInfo, // xinfoStreamFull(streamKey1)
                },
                results);
    }

    @SneakyThrows
    @ParameterizedTest
    @MethodSource("getClients")
    public void binary_strings(GlideClusterClient clusterClient) {
        String key = UUID.randomUUID().toString();
        clusterClient.set(key, "_").get();
        // use dump to ensure that we have non-string convertible bytes
        var bytes = clusterClient.dump(gs(key)).get();

        var transaction =
                new ClusterTransaction().withBinaryOutput().set(gs(key), gs(bytes)).get(gs(key));

        var responses = clusterClient.exec(transaction).get();

        assertDeepEquals(
                new Object[] {
                    OK, gs(bytes),
                },
                responses);
    }
}
