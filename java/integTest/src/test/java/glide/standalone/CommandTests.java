/** Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0 */
package glide.standalone;

import static glide.TestConfiguration.SERVER_VERSION;
import static glide.TestUtilities.assertDeepEquals;
import static glide.TestUtilities.checkFunctionListResponse;
import static glide.TestUtilities.checkFunctionListResponseBinary;
import static glide.TestUtilities.checkFunctionStatsBinaryResponse;
import static glide.TestUtilities.checkFunctionStatsResponse;
import static glide.TestUtilities.commonClientConfig;
import static glide.TestUtilities.createLongRunningLuaScript;
import static glide.TestUtilities.createLuaLibWithLongRunningFunction;
import static glide.TestUtilities.generateLuaLibCode;
import static glide.TestUtilities.generateLuaLibCodeBinary;
import static glide.TestUtilities.getValueFromInfo;
import static glide.TestUtilities.parseInfoResponseToMap;
import static glide.TestUtilities.waitForNotBusy;
import static glide.api.BaseClient.OK;
import static glide.api.models.GlideString.gs;
import static glide.api.models.commands.FlushMode.ASYNC;
import static glide.api.models.commands.FlushMode.SYNC;
import static glide.api.models.commands.InfoOptions.Section.CLUSTER;
import static glide.api.models.commands.InfoOptions.Section.CPU;
import static glide.api.models.commands.InfoOptions.Section.EVERYTHING;
import static glide.api.models.commands.InfoOptions.Section.MEMORY;
import static glide.api.models.commands.InfoOptions.Section.SERVER;
import static glide.api.models.commands.InfoOptions.Section.STATS;
import static glide.api.models.commands.function.FunctionRestorePolicy.APPEND;
import static glide.api.models.commands.function.FunctionRestorePolicy.FLUSH;
import static glide.api.models.commands.function.FunctionRestorePolicy.REPLACE;
import static glide.api.models.commands.scan.ScanOptions.ObjectType.HASH;
import static glide.api.models.commands.scan.ScanOptions.ObjectType.SET;
import static glide.api.models.commands.scan.ScanOptions.ObjectType.STRING;
import static glide.cluster.CommandTests.DEFAULT_INFO_SECTIONS;
import static glide.cluster.CommandTests.EVERYTHING_INFO_SECTIONS;
import static glide.utils.ArrayTransformUtils.concatenateArrays;
import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;
import static org.junit.jupiter.api.Named.named;

import glide.api.GlideClient;
import glide.api.models.GlideString;
import glide.api.models.Script;
import glide.api.models.commands.FlushMode;
import glide.api.models.commands.InfoOptions.Section;
import glide.api.models.commands.ScriptOptions;
import glide.api.models.commands.ScriptOptionsGlideString;
import glide.api.models.commands.scan.ScanOptions;
import glide.api.models.configuration.ProtocolVersion;
import glide.api.models.exceptions.RequestException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.stream.Stream;
import lombok.SneakyThrows;
import org.apache.commons.lang3.ArrayUtils;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

@Timeout(10) // seconds
public class CommandTests {

    private static final String INITIAL_VALUE = "VALUE";

    @SneakyThrows
    public static Stream<Arguments> getClients() {
        return Stream.of(
                Arguments.of(
                        named(
                                "RESP2",
                                GlideClient.createClient(
                                                commonClientConfig()
                                                        .requestTimeout(7000)
                                                        .protocol(ProtocolVersion.RESP2)
                                                        .build())
                                        .get())),
                Arguments.of(
                        named(
                                "RESP3",
                                GlideClient.createClient(
                                                commonClientConfig()
                                                        .requestTimeout(7000)
                                                        .protocol(ProtocolVersion.RESP3)
                                                        .build())
                                        .get())));
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void custom_command_info(GlideClient regularClient) {
        Object data = regularClient.customCommand(new String[] {"info"}).get();
        assertTrue(((String) data).contains("# Stats"));
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void custom_command_info_binary(GlideClient regularClient) {
        Object data = regularClient.customCommand(new GlideString[] {gs("info")}).get();
        assertInstanceOf(GlideString.class, data);
        assertTrue(data.toString().contains("# Stats"));
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void custom_command_del_returns_a_number(GlideClient regularClient) {
        String key = "custom_command_del_returns_a_number";
        regularClient.set(key, INITIAL_VALUE).get();
        var del = regularClient.customCommand(new String[] {"DEL", key}).get();
        assertEquals(1L, del);
        var data = regularClient.get(key).get();
        assertNull(data);
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void ping(GlideClient regularClient) {
        String data = regularClient.ping().get();
        assertEquals("PONG", data);
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void ping_with_message(GlideClient regularClient) {
        String data = regularClient.ping("H3LL0").get();
        assertEquals("H3LL0", data);
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void ping_binary_with_message(GlideClient regularClient) {
        GlideString data = regularClient.ping(gs("H3LL0")).get();
        assertEquals(gs("H3LL0"), data);
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void info_without_options(GlideClient regularClient) {
        String data = regularClient.info().get();
        for (String section : DEFAULT_INFO_SECTIONS) {
            assertTrue(data.contains("# " + section), "Section " + section + " is missing");
        }
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void info_with_multiple_options(GlideClient regularClient) {
        Section[] sections = {CLUSTER};
        if (SERVER_VERSION.isGreaterThanOrEqualTo("7.0.0")) {
            sections = concatenateArrays(sections, new Section[] {CPU, MEMORY});
        }
        String data = regularClient.info(sections).get();
        for (Section section : sections) {
            assertTrue(
                    data.toLowerCase().contains("# " + section.toString().toLowerCase()),
                    "Section " + section + " is missing");
        }
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void info_with_everything_option(GlideClient regularClient) {
        String data = regularClient.info(new Section[] {EVERYTHING}).get();
        for (String section : EVERYTHING_INFO_SECTIONS) {
            assertTrue(data.contains("# " + section), "Section " + section + " is missing");
        }
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void simple_select_test(GlideClient regularClient) {
        assertEquals(OK, regularClient.select(0).get());

        String key = UUID.randomUUID().toString();
        String value = UUID.randomUUID().toString();
        assertEquals(OK, regularClient.set(key, value).get());

        assertEquals(OK, regularClient.select(1).get());
        assertNull(regularClient.get(key).get());

        assertEquals(OK, regularClient.select(0).get());
        assertEquals(value, regularClient.get(key).get());
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void select_test_gives_error(GlideClient regularClient) {
        ExecutionException e =
                assertThrows(ExecutionException.class, () -> regularClient.select(-1).get());
        assertInstanceOf(RequestException.class, e.getCause());
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void move(GlideClient regularClient) {
        String key1 = UUID.randomUUID().toString();
        String key2 = UUID.randomUUID().toString();
        String value1 = UUID.randomUUID().toString();
        String value2 = UUID.randomUUID().toString();
        String nonExistingKey = UUID.randomUUID().toString();
        assertEquals(OK, regularClient.select(0).get());

        assertEquals(false, regularClient.move(nonExistingKey, 1L).get());
        assertEquals(OK, regularClient.set(key1, value1).get());
        assertEquals(OK, regularClient.set(key2, value2).get());
        assertEquals(true, regularClient.move(key1, 1L).get());
        assertNull(regularClient.get(key1).get());

        assertEquals(OK, regularClient.select(1).get());
        assertEquals(value1, regularClient.get(key1).get());

        assertEquals(OK, regularClient.set(key2, value2).get());
        // Move does not occur because key2 already exists in DB 0
        assertEquals(false, regularClient.move(key2, 0).get());
        assertEquals(value2, regularClient.get(key2).get());

        // Incorrect argument - DB index must be non-negative
        ExecutionException e =
                assertThrows(ExecutionException.class, () -> regularClient.move(key1, -1L).get());
        assertInstanceOf(RequestException.class, e.getCause());
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void move_binary(GlideClient regularClient) {
        GlideString key1 = gs(UUID.randomUUID().toString());
        GlideString key2 = gs(UUID.randomUUID().toString());
        GlideString value1 = gs(UUID.randomUUID().toString());
        GlideString value2 = gs(UUID.randomUUID().toString());
        GlideString nonExistingKey = gs(UUID.randomUUID().toString());
        assertEquals(OK, regularClient.select(0).get());

        assertEquals(false, regularClient.move(nonExistingKey, 1L).get());
        assertEquals(OK, regularClient.set(key1, value1).get());
        assertEquals(OK, regularClient.set(key2, value2).get());
        assertEquals(true, regularClient.move(key1, 1L).get());
        assertNull(regularClient.get(key1).get());

        assertEquals(OK, regularClient.select(1).get());
        assertEquals(value1, regularClient.get(key1).get());

        assertEquals(OK, regularClient.set(key2, value2).get());
        // Move does not occur because key2 already exists in DB 0
        assertEquals(false, regularClient.move(key2, 0).get());
        assertEquals(value2, regularClient.get(key2).get());

        // Incorrect argument - DB index must be non-negative
        ExecutionException e =
                assertThrows(ExecutionException.class, () -> regularClient.move(key1, -1L).get());
        assertInstanceOf(RequestException.class, e.getCause());
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void clientId(GlideClient regularClient) {
        var id = regularClient.clientId().get();
        assertTrue(id > 0);
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void clientGetName(GlideClient regularClient) {
        // TODO replace with the corresponding command once implemented
        regularClient.customCommand(new String[] {"client", "setname", "clientGetName"}).get();

        var name = regularClient.clientGetName().get();

        assertEquals("clientGetName", name);
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void config_reset_stat(GlideClient regularClient) {
        String data = regularClient.info(new Section[] {STATS}).get();
        long value_before = getValueFromInfo(data, "total_net_input_bytes");

        var result = regularClient.configResetStat().get();
        assertEquals(OK, result);

        data = regularClient.info(new Section[] {STATS}).get();
        long value_after = getValueFromInfo(data, "total_net_input_bytes");
        assertTrue(value_after < value_before);
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void config_rewrite_non_existent_config_file(GlideClient regularClient) {
        var info = regularClient.info(new Section[] {SERVER}).get();
        var configFile = parseInfoResponseToMap(info).get("config_file");

        if (configFile.isEmpty()) {
            ExecutionException executionException =
                    assertThrows(ExecutionException.class, () -> regularClient.configRewrite().get());
            assertInstanceOf(RequestException.class, executionException.getCause());
        } else {
            assertEquals(OK, regularClient.configRewrite().get());
        }
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void configGet_with_no_args_returns_error(GlideClient regularClient) {
        var exception =
                assertThrows(
                        ExecutionException.class, () -> regularClient.configGet(new String[] {}).get());
        assertInstanceOf(RequestException.class, exception.getCause());
        assertTrue(exception.getCause().getMessage().contains("wrong number of arguments"));
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void configGet_with_wildcard(GlideClient regularClient) {
        var data = regularClient.configGet(new String[] {"*file"}).get();
        assertTrue(data.size() > 5);
        assertTrue(data.containsKey("pidfile"));
        assertTrue(data.containsKey("logfile"));
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void configGet_with_multiple_params(GlideClient regularClient) {
        assumeTrue(SERVER_VERSION.isGreaterThanOrEqualTo("7.0.0"), "This feature added in version 7");
        var data = regularClient.configGet(new String[] {"pidfile", "logfile"}).get();
        assertAll(
                () -> assertEquals(2, data.size()),
                () -> assertTrue(data.containsKey("pidfile")),
                () -> assertTrue(data.containsKey("logfile")));
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void configSet_with_unknown_parameter_returns_error(GlideClient regularClient) {
        var exception =
                assertThrows(
                        ExecutionException.class,
                        () -> regularClient.configSet(Map.of("Unknown Option", "Unknown Value")).get());
        assertInstanceOf(RequestException.class, exception.getCause());
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void configSet_a_parameter(GlideClient regularClient) {
        var oldValue = regularClient.configGet(new String[] {"maxclients"}).get().get("maxclients");

        var response = regularClient.configSet(Map.of("maxclients", "42")).get();
        assertEquals(OK, response);
        var newValue = regularClient.configGet(new String[] {"maxclients"}).get();
        assertEquals("42", newValue.get("maxclients"));

        response = regularClient.configSet(Map.of("maxclients", oldValue)).get();
        assertEquals(OK, response);
    }

    @SneakyThrows
    @ParameterizedTest
    @MethodSource("getClients")
    public void echo(GlideClient regularClient) {
        String message = "GLIDE";
        String response = regularClient.echo(message).get();
        assertEquals(message, response);
        message = "";
        response = regularClient.echo(message).get();
        assertEquals(message, response);
    }

    @SneakyThrows
    @ParameterizedTest
    @MethodSource("getClients")
    public void echo_gs(GlideClient regularClient) {
        byte[] message = {(byte) 0x01, (byte) 0x00, (byte) 0x01, (byte) 0x00, (byte) 0x02};
        GlideString response = regularClient.echo(gs(message)).get();
        assertEquals(gs(message), response);
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void time(GlideClient regularClient) {
        // Take the time now, convert to 10 digits and subtract 1 second
        long now = Instant.now().getEpochSecond() - 1L;
        String[] result = regularClient.time().get();

        assertEquals(2, result.length);

        assertTrue(
                Long.parseLong(result[0]) > now,
                "Time() result (" + result[0] + ") should be greater than now (" + now + ")");
        assertTrue(Long.parseLong(result[1]) < 1000000);
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void lastsave(GlideClient regularClient) {
        long result = regularClient.lastsave().get();
        var yesterday = Instant.now().minus(1, ChronoUnit.DAYS);
        assertTrue(Instant.ofEpochSecond(result).isAfter(yesterday));
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void lolwut_lolwut(GlideClient regularClient) {
        var response = regularClient.lolwut().get();
        System.out.printf("%nLOLWUT standalone client standard response%n%s%n", response);
        assertTrue(response.contains("Redis ver. " + SERVER_VERSION));

        response = regularClient.lolwut(new int[] {30, 4, 4}).get();
        System.out.printf(
                "%nLOLWUT standalone client standard response with params 30 4 4%n%s%n", response);
        assertTrue(response.contains("Redis ver. " + SERVER_VERSION));

        response = regularClient.lolwut(5).get();
        System.out.printf("%nLOLWUT standalone client ver 5 response%n%s%n", response);
        assertTrue(response.contains("Redis ver. " + SERVER_VERSION));

        response = regularClient.lolwut(6, new int[] {50, 20}).get();
        System.out.printf(
                "%nLOLWUT standalone client ver 6 response with params 50 20%n%s%n", response);
        assertTrue(response.contains("Redis ver. " + SERVER_VERSION));
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void dbsize_and_flushdb(GlideClient regularClient) {
        assertEquals(OK, regularClient.flushall().get());
        assertEquals(OK, regularClient.select(0).get());

        // fill DB and check size
        int numKeys = 10;
        for (int i = 0; i < numKeys; i++) {
            assertEquals(OK, regularClient.set(UUID.randomUUID().toString(), "foo").get());
        }
        assertEquals(10L, regularClient.dbsize().get());

        // check another empty DB
        assertEquals(OK, regularClient.select(1).get());
        assertEquals(0L, regularClient.dbsize().get());

        // check non-empty
        assertEquals(OK, regularClient.set(UUID.randomUUID().toString(), "foo").get());
        assertEquals(1L, regularClient.dbsize().get());

        // flush and check again
        if (SERVER_VERSION.isGreaterThanOrEqualTo("6.2.0")) {
            assertEquals(OK, regularClient.flushdb(SYNC).get());
        } else {
            var executionException =
                    assertThrows(ExecutionException.class, () -> regularClient.flushdb(SYNC).get());
            assertInstanceOf(RequestException.class, executionException.getCause());
            assertEquals(OK, regularClient.flushdb(ASYNC).get());
        }
        assertEquals(0L, regularClient.dbsize().get());

        // switch to DB 0 and flush and check
        assertEquals(OK, regularClient.select(0).get());
        assertEquals(10L, regularClient.dbsize().get());
        assertEquals(OK, regularClient.flushdb().get());
        assertEquals(0L, regularClient.dbsize().get());
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void objectFreq(GlideClient regularClient) {
        String key = UUID.randomUUID().toString();
        String maxmemoryPolicy = "maxmemory-policy";
        String oldPolicy =
                regularClient.configGet(new String[] {maxmemoryPolicy}).get().get(maxmemoryPolicy);
        try {
            assertEquals(OK, regularClient.configSet(Map.of(maxmemoryPolicy, "allkeys-lfu")).get());
            assertEquals(OK, regularClient.set(key, "").get());
            assertTrue(regularClient.objectFreq(key).get() >= 0L);
        } finally {
            regularClient.configSet(Map.of(maxmemoryPolicy, oldPolicy)).get();
        }
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void flushall(GlideClient regularClient) {
        if (SERVER_VERSION.isGreaterThanOrEqualTo("6.2.0")) {
            assertEquals(OK, regularClient.flushall(SYNC).get());
        } else {
            var executionException =
                    assertThrows(ExecutionException.class, () -> regularClient.flushall(SYNC).get());
            assertInstanceOf(RequestException.class, executionException.getCause());
            assertEquals(OK, regularClient.flushall(ASYNC).get());
        }

        // TODO replace with KEYS command when implemented
        Object[] keysAfter = (Object[]) regularClient.customCommand(new String[] {"keys", "*"}).get();
        assertEquals(0, keysAfter.length);

        assertEquals(OK, regularClient.flushall().get());
        assertEquals(OK, regularClient.flushall(ASYNC).get());
    }

    @SneakyThrows
    @ParameterizedTest
    @MethodSource("getClients")
    public void function_commands(GlideClient regularClient) {
        assumeTrue(SERVER_VERSION.isGreaterThanOrEqualTo("7.0.0"), "This feature added in version 7");

        assertEquals(OK, regularClient.functionFlush(SYNC).get());

        String libName = "mylib1c";
        String funcName = "myfunc1c";
        // function $funcName returns first argument
        String code = generateLuaLibCode(libName, Map.of(funcName, "return args[1]"), true);
        assertEquals(libName, regularClient.functionLoad(code, false).get());

        var functionResult =
                regularClient.fcall(funcName, new String[0], new String[] {"one", "two"}).get();
        assertEquals("one", functionResult);
        functionResult =
                regularClient.fcallReadOnly(funcName, new String[0], new String[] {"one", "two"}).get();
        assertEquals("one", functionResult);

        var flist = regularClient.functionList(false).get();
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

        flist = regularClient.functionList(true).get();
        checkFunctionListResponse(
                flist, libName, expectedDescription, expectedFlags, Optional.of(code));

        // re-load library without overwriting
        var executionException =
                assertThrows(ExecutionException.class, () -> regularClient.functionLoad(code, false).get());
        assertInstanceOf(RequestException.class, executionException.getCause());
        assertTrue(
                executionException.getMessage().contains("Library '" + libName + "' already exists"));

        // re-load library with overwriting
        assertEquals(libName, regularClient.functionLoad(code, true).get());
        String newFuncName = "myfunc2c";
        // function $funcName returns first argument
        // function $newFuncName returns argument array len
        String newCode =
                generateLuaLibCode(
                        libName, Map.of(funcName, "return args[1]", newFuncName, "return #args"), true);
        assertEquals(libName, regularClient.functionLoad(newCode, true).get());

        // load new lib and delete it - first lib remains loaded
        String anotherLib = generateLuaLibCode("anotherLib", Map.of("anotherFunc", ""), false);
        assertEquals("anotherLib", regularClient.functionLoad(anotherLib, true).get());
        assertEquals(OK, regularClient.functionDelete("anotherLib").get());

        // delete missing lib returns a error
        executionException =
                assertThrows(
                        ExecutionException.class, () -> regularClient.functionDelete("anotherLib").get());
        assertInstanceOf(RequestException.class, executionException.getCause());
        assertTrue(executionException.getMessage().contains("Library not found"));

        flist = regularClient.functionList(libName, false).get();
        expectedDescription.put(newFuncName, null);
        expectedFlags.put(newFuncName, Set.of("no-writes"));
        checkFunctionListResponse(flist, libName, expectedDescription, expectedFlags, Optional.empty());

        flist = regularClient.functionList(libName, true).get();
        checkFunctionListResponse(
                flist, libName, expectedDescription, expectedFlags, Optional.of(newCode));

        functionResult =
                regularClient.fcall(newFuncName, new String[0], new String[] {"one", "two"}).get();
        assertEquals(2L, functionResult);
        functionResult =
                regularClient.fcallReadOnly(newFuncName, new String[0], new String[] {"one", "two"}).get();
        assertEquals(2L, functionResult);

        assertEquals(OK, regularClient.functionFlush(ASYNC).get());
    }

    @SneakyThrows
    @ParameterizedTest
    @MethodSource("getClients")
    public void function_commands_binary(GlideClient regularClient) {
        assumeTrue(SERVER_VERSION.isGreaterThanOrEqualTo("7.0.0"), "This feature added in version 7");

        assertEquals(OK, regularClient.functionFlush(SYNC).get());

        GlideString libName = gs("mylib1c");
        GlideString funcName = gs("myfunc1c");
        // function $funcName returns first argument
        GlideString code =
                generateLuaLibCodeBinary(libName, Map.of(funcName, gs("return args[1]")), true);
        assertEquals(libName, regularClient.functionLoad(code, false).get());

        var functionResult =
                regularClient
                        .fcall(funcName, new GlideString[0], new GlideString[] {gs("one"), gs("two")})
                        .get();
        assertEquals(gs("one"), functionResult);
        functionResult =
                regularClient
                        .fcallReadOnly(funcName, new GlideString[0], new GlideString[] {gs("one"), gs("two")})
                        .get();
        assertEquals(gs("one"), functionResult);

        var flist = regularClient.functionListBinary(false).get();
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

        flist = regularClient.functionListBinary(true).get();
        checkFunctionListResponseBinary(
                flist, libName, expectedDescription, expectedFlags, Optional.of(code));

        // re-load library without overwriting
        var executionException =
                assertThrows(ExecutionException.class, () -> regularClient.functionLoad(code, false).get());
        assertInstanceOf(RequestException.class, executionException.getCause());
        assertTrue(
                executionException.getMessage().contains("Library '" + libName + "' already exists"));

        // re-load library with overwriting
        assertEquals(libName, regularClient.functionLoad(code, true).get());
        GlideString newFuncName = gs("myfunc2c");
        // function $funcName returns first argument
        // function $newFuncName returns argument array len
        GlideString newCode =
                generateLuaLibCodeBinary(
                        libName, Map.of(funcName, gs("return args[1]"), newFuncName, gs("return #args")), true);
        assertEquals(libName, regularClient.functionLoad(newCode, true).get());

        // load new lib and delete it - first lib remains loaded
        GlideString anotherLib =
                generateLuaLibCodeBinary(gs("anotherLib"), Map.of(gs("anotherFunc"), gs("")), false);
        assertEquals(gs("anotherLib"), regularClient.functionLoad(anotherLib, true).get());
        assertEquals(OK, regularClient.functionDelete(gs("anotherLib")).get());

        // delete missing lib returns a error
        executionException =
                assertThrows(
                        ExecutionException.class, () -> regularClient.functionDelete(gs("anotherLib")).get());
        assertInstanceOf(RequestException.class, executionException.getCause());
        assertTrue(executionException.getMessage().contains("Library not found"));

        flist = regularClient.functionListBinary(libName, false).get();
        expectedDescription.put(newFuncName, null);
        expectedFlags.put(newFuncName, Set.of(gs("no-writes")));
        checkFunctionListResponseBinary(
                flist, libName, expectedDescription, expectedFlags, Optional.empty());

        flist = regularClient.functionListBinary(libName, true).get();
        checkFunctionListResponseBinary(
                flist, libName, expectedDescription, expectedFlags, Optional.of(newCode));

        functionResult =
                regularClient
                        .fcall(newFuncName, new GlideString[0], new GlideString[] {gs("one"), gs("two")})
                        .get();
        assertEquals(2L, functionResult);
        functionResult =
                regularClient
                        .fcallReadOnly(
                                newFuncName, new GlideString[0], new GlideString[] {gs("one"), gs("two")})
                        .get();
        assertEquals(2L, functionResult);

        assertEquals(OK, regularClient.functionFlush(ASYNC).get());
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void copy(GlideClient regularClient) {
        assumeTrue(
                SERVER_VERSION.isGreaterThanOrEqualTo("6.2.0"), "This feature added in version 6.2.0");
        // setup
        String source = "{key}-1" + UUID.randomUUID();
        String destination = "{key}-2" + UUID.randomUUID();
        long index1 = 1;
        long index2 = 2;

        try {
            // neither key exists, returns false
            assertFalse(regularClient.copy(source, destination, index1, false).get());

            // source exists, destination does not
            regularClient.set(source, "one").get();
            assertTrue(regularClient.copy(source, destination, index1, false).get());
            regularClient.select(1).get();
            assertEquals("one", regularClient.get(destination).get());

            // new value for source key
            regularClient.select(0).get();
            regularClient.set(source, "two").get();

            // no REPLACE, copying to existing key on DB 0&1, non-existing key on DB 2
            assertFalse(regularClient.copy(source, destination, index1, false).get());
            assertTrue(regularClient.copy(source, destination, index2, false).get());

            // new value only gets copied to DB 2
            regularClient.select(1).get();
            assertEquals("one", regularClient.get(destination).get());
            regularClient.select(2).get();
            assertEquals("two", regularClient.get(destination).get());

            // both exists, with REPLACE, when value isn't the same, source always get copied to
            // destination
            regularClient.select(0).get();
            assertTrue(regularClient.copy(source, destination, index1, true).get());
            regularClient.select(1).get();
            assertEquals("two", regularClient.get(destination).get());
        }

        // switching back to db 0
        finally {
            regularClient.select(0).get();
        }
    }

    @Timeout(20)
    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void functionKill_no_write(GlideClient regularClient) {
        assumeTrue(SERVER_VERSION.isGreaterThanOrEqualTo("7.0.0"), "This feature added in version 7");

        String libName = "functionKill_no_write";
        String funcName = "deadlock";
        String code = createLuaLibWithLongRunningFunction(libName, funcName, 6, true);

        assertEquals(OK, regularClient.functionFlush(SYNC).get());

        // nothing to kill
        var exception =
                assertThrows(ExecutionException.class, () -> regularClient.functionKill().get());
        assertInstanceOf(RequestException.class, exception.getCause());
        assertTrue(exception.getMessage().toLowerCase().contains("notbusy"));

        // load the lib
        assertEquals(libName, regularClient.functionLoad(code, true).get());

        try (var testClient =
                GlideClient.createClient(commonClientConfig().requestTimeout(10000).build()).get()) {
            try {
                // call the function without await
                testClient.fcall(funcName);

                Thread.sleep(1000);

                // Run FKILL until it returns OK
                boolean functionKilled = false;
                int timeout = 4000; // ms
                while (timeout >= 0) {
                    try {
                        assertEquals(OK, regularClient.functionKill().get());
                        functionKilled = true;
                        break;
                    } catch (RequestException ignored) {
                    }
                    Thread.sleep(500);
                    timeout -= 500;
                }

                assertTrue(functionKilled);
            } finally {
                waitForNotBusy(regularClient::functionKill);
            }
        }
    }

    @Timeout(20)
    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void functionKillBinary_no_write(GlideClient regularClient) {
        assumeTrue(SERVER_VERSION.isGreaterThanOrEqualTo("7.0.0"), "This feature added in version 7");

        GlideString libName = gs("functionKillBinary_no_write");
        GlideString funcName = gs("binary_deadlock");
        GlideString code =
                gs(createLuaLibWithLongRunningFunction(libName.toString(), funcName.toString(), 6, true));

        assertEquals(OK, regularClient.functionFlush(SYNC).get());

        // nothing to kill
        var exception =
                assertThrows(ExecutionException.class, () -> regularClient.functionKill().get());
        assertInstanceOf(RequestException.class, exception.getCause());
        assertTrue(exception.getMessage().toLowerCase().contains("notbusy"));

        // load the lib
        assertEquals(libName, regularClient.functionLoad(code, true).get());

        try (var testClient =
                GlideClient.createClient(commonClientConfig().requestTimeout(10000).build()).get()) {
            try {
                // call the function without await
                testClient.fcall(funcName);

                Thread.sleep(1000);

                // Run FKILL until it returns OK
                boolean functionKilled = false;
                int timeout = 4000; // ms
                while (timeout >= 0) {
                    try {
                        assertEquals(OK, regularClient.functionKill().get());
                        functionKilled = true;
                        break;
                    } catch (RequestException ignored) {
                    }
                    Thread.sleep(500);
                    timeout -= 500;
                }

                assertTrue(functionKilled);
            } finally {
                waitForNotBusy(regularClient::functionKill);
            }
        }
    }

    @Timeout(20)
    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void functionKill_write_function(GlideClient regularClient) {
        assumeTrue(SERVER_VERSION.isGreaterThanOrEqualTo("7.0.0"), "This feature added in version 7");

        String libName = "functionKill_write_function";
        String funcName = "deadlock_write_function";
        String key = libName;
        String code = createLuaLibWithLongRunningFunction(libName, funcName, 6, false);
        CompletableFuture<Object> promise = new CompletableFuture<>();
        promise.complete(null);

        assertEquals(OK, regularClient.functionFlush(SYNC).get());

        // nothing to kill
        var exception =
                assertThrows(ExecutionException.class, () -> regularClient.functionKill().get());
        assertInstanceOf(RequestException.class, exception.getCause());
        assertTrue(exception.getMessage().toLowerCase().contains("notbusy"));

        // load the lib
        assertEquals(libName, regularClient.functionLoad(code, true).get());

        try (var testClient =
                GlideClient.createClient(commonClientConfig().requestTimeout(10000).build()).get()) {
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
                        regularClient.functionKill().get();
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
    public void functionKillBinary_write_function(GlideClient regularClient) {
        assumeTrue(SERVER_VERSION.isGreaterThanOrEqualTo("7.0.0"), "This feature added in version 7");

        GlideString libName = gs("functionKill_write_function");
        GlideString funcName = gs("deadlock_write_function");
        GlideString key = libName;
        GlideString code =
                gs(createLuaLibWithLongRunningFunction(libName.toString(), funcName.toString(), 6, false));
        CompletableFuture<Object> promise = new CompletableFuture<>();
        promise.complete(null);

        assertEquals(OK, regularClient.functionFlush(SYNC).get());

        // nothing to kill
        var exception =
                assertThrows(ExecutionException.class, () -> regularClient.functionKill().get());
        assertInstanceOf(RequestException.class, exception.getCause());
        assertTrue(exception.getMessage().toLowerCase().contains("notbusy"));

        // load the lib
        assertEquals(libName, regularClient.functionLoad(code, true).get());

        try (var testClient =
                GlideClient.createClient(commonClientConfig().requestTimeout(10000).build()).get()) {
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
                        regularClient.functionKill().get();
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
    public void functionStats(GlideClient regularClient) {
        assumeTrue(SERVER_VERSION.isGreaterThanOrEqualTo("7.0.0"), "This feature added in version 7");

        String libName = "functionStats";
        String funcName = libName;
        assertEquals(OK, regularClient.functionFlush(SYNC).get());

        // function $funcName returns first argument
        String code = generateLuaLibCode(libName, Map.of(funcName, "return args[1]"), false);
        assertEquals(libName, regularClient.functionLoad(code, true).get());

        var response = regularClient.functionStats().get();
        for (var nodeResponse : response.values()) {
            checkFunctionStatsResponse(nodeResponse, new String[0], 1, 1);
        }

        code =
                generateLuaLibCode(
                        libName + "_2",
                        Map.of(funcName + "_2", "return 'OK'", funcName + "_3", "return 42"),
                        false);
        assertEquals(libName + "_2", regularClient.functionLoad(code, true).get());

        response = regularClient.functionStats().get();
        for (var nodeResponse : response.values()) {
            checkFunctionStatsResponse(nodeResponse, new String[0], 2, 3);
        }

        assertEquals(OK, regularClient.functionFlush(SYNC).get());

        response = regularClient.functionStats().get();
        for (var nodeResponse : response.values()) {
            checkFunctionStatsResponse(nodeResponse, new String[0], 0, 0);
        }
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void functionStatsBinary(GlideClient regularClient) {
        assumeTrue(SERVER_VERSION.isGreaterThanOrEqualTo("7.0.0"), "This feature added in version 7");

        GlideString libName = gs("functionStats");
        GlideString funcName = libName;
        assertEquals(OK, regularClient.functionFlush(SYNC).get());

        // function $funcName returns first argument
        GlideString code =
                generateLuaLibCodeBinary(libName, Map.of(funcName, gs("return args[1]")), false);
        assertEquals(libName, regularClient.functionLoad(code, true).get());

        var response = regularClient.functionStatsBinary().get();
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
        assertEquals(gs(libName.toString() + "_2"), regularClient.functionLoad(code, true).get());

        response = regularClient.functionStatsBinary().get();
        for (var nodeResponse : response.values()) {
            checkFunctionStatsBinaryResponse(nodeResponse, new GlideString[0], 2, 3);
        }

        assertEquals(OK, regularClient.functionFlush(SYNC).get());

        response = regularClient.functionStatsBinary().get();
        for (var nodeResponse : response.values()) {
            checkFunctionStatsBinaryResponse(nodeResponse, new GlideString[0], 0, 0);
        }
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void function_dump_and_restore(GlideClient regularClient) {
        assumeTrue(SERVER_VERSION.isGreaterThanOrEqualTo("7.0.0"), "This feature added in version 7");

        assertEquals(OK, regularClient.functionFlush(SYNC).get());

        // dumping an empty lib
        byte[] emptyDump = regularClient.functionDump().get();
        assertTrue(emptyDump.length > 0);

        String name1 = "Foster";
        String name2 = "Dogster";

        // function $name1 returns first argument
        // function $name2 returns argument array len
        String code =
                generateLuaLibCode(name1, Map.of(name1, "return args[1]", name2, "return #args"), false);
        assertEquals(name1, regularClient.functionLoad(code, true).get());
        var flist = regularClient.functionList(true).get();

        final byte[] dump = regularClient.functionDump().get();

        // restore without cleaning the lib and/or overwrite option causes an error
        var executionException =
                assertThrows(ExecutionException.class, () -> regularClient.functionRestore(dump).get());
        assertInstanceOf(RequestException.class, executionException.getCause());
        assertTrue(executionException.getMessage().contains("Library " + name1 + " already exists"));

        // APPEND policy also fails for the same reason (name collision)
        executionException =
                assertThrows(
                        ExecutionException.class, () -> regularClient.functionRestore(dump, APPEND).get());
        assertInstanceOf(RequestException.class, executionException.getCause());
        assertTrue(executionException.getMessage().contains("Library " + name1 + " already exists"));

        // REPLACE policy succeeds
        assertEquals(OK, regularClient.functionRestore(dump, REPLACE).get());
        // but nothing changed - all code overwritten
        assertDeepEquals(flist, regularClient.functionList(true).get());

        // create lib with another name, but with the same function names
        assertEquals(OK, regularClient.functionFlush(SYNC).get());
        code = generateLuaLibCode(name2, Map.of(name1, "return args[1]", name2, "return #args"), false);
        assertEquals(name2, regularClient.functionLoad(code, true).get());

        // REPLACE policy now fails due to a name collision
        executionException =
                assertThrows(
                        ExecutionException.class, () -> regularClient.functionRestore(dump, REPLACE).get());
        assertInstanceOf(RequestException.class, executionException.getCause());
        // valkey checks names in random order and blames on first collision
        assertTrue(
                executionException.getMessage().contains("Function " + name1 + " already exists")
                        || executionException.getMessage().contains("Function " + name2 + " already exists"));

        // FLUSH policy succeeds, but deletes the second lib
        assertEquals(OK, regularClient.functionRestore(dump, FLUSH).get());
        assertDeepEquals(flist, regularClient.functionList(true).get());

        // call restored functions
        assertEquals(
                "meow", regularClient.fcall(name1, new String[0], new String[] {"meow", "woem"}).get());
        assertEquals(
                2L, regularClient.fcall(name2, new String[0], new String[] {"meow", "woem"}).get());
    }

    @SneakyThrows
    @ParameterizedTest
    @MethodSource("getClients")
    public void randomkey(GlideClient regularClient) {
        String key1 = "{key}" + UUID.randomUUID();
        String key2 = "{key}" + UUID.randomUUID();

        assertEquals(OK, regularClient.set(key1, "a").get());
        assertEquals(OK, regularClient.set(key2, "b").get());

        String randomKey = regularClient.randomKey().get();
        assertEquals(1L, regularClient.exists(new String[] {randomKey}).get());

        // no keys in database
        assertEquals(OK, regularClient.flushall().get());
        assertNull(regularClient.randomKey().get());
    }

    @SneakyThrows
    @ParameterizedTest
    @MethodSource("getClients")
    public void randomKeyBinary(GlideClient regularClient) {
        GlideString key1 = gs("{key}" + UUID.randomUUID());
        GlideString key2 = gs("{key}" + UUID.randomUUID());

        assertEquals(OK, regularClient.set(key1, gs("a")).get());
        assertEquals(OK, regularClient.set(key2, gs("b")).get());

        GlideString randomKeyBinary = regularClient.randomKeyBinary().get();
        assertEquals(1L, regularClient.exists(new GlideString[] {randomKeyBinary}).get());

        // no keys in database
        assertEquals(OK, regularClient.flushall().get());
        assertNull(regularClient.randomKeyBinary().get());
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void scan(GlideClient regularClient) {
        String initialCursor = "0";

        int numberKeys = 500;
        Map<String, String> keys = new HashMap<>();
        for (int i = 0; i < numberKeys; i++) {
            keys.put("{key}-" + i + "-" + UUID.randomUUID(), "{value}-" + i + "-" + UUID.randomUUID());
        }

        int resultCursorIndex = 0;
        int resultCollectionIndex = 1;

        // empty the database
        assertEquals(OK, regularClient.flushdb().get());

        // Empty return
        Object[] emptyResult = regularClient.scan(initialCursor).get();
        assertEquals(initialCursor, emptyResult[resultCursorIndex]);
        assertDeepEquals(new String[] {}, emptyResult[resultCollectionIndex]);

        // Negative cursor
        if (SERVER_VERSION.isGreaterThanOrEqualTo("8.0.0")) {
            ExecutionException executionException =
                    assertThrows(ExecutionException.class, () -> regularClient.scan("-1").get());
        } else {
            Object[] negativeResult = regularClient.scan("-1").get();
            assertEquals(initialCursor, negativeResult[resultCursorIndex]);
            assertDeepEquals(new String[] {}, negativeResult[resultCollectionIndex]);
        }

        // Add keys to the database using mset
        regularClient.mset(keys).get();

        Object[] result;
        Object[] keysFound = new String[0];
        String resultCursor = "0";
        boolean isFirstLoop = true;
        do {
            result = regularClient.scan(resultCursor).get();
            resultCursor = result[resultCursorIndex].toString();
            Object[] resultKeys = (Object[]) result[resultCollectionIndex];
            keysFound = ArrayUtils.addAll(keysFound, resultKeys);

            if (isFirstLoop) {
                assertNotEquals("0", resultCursor);
                isFirstLoop = false;
            } else if (resultCursor.equals("0")) {
                break;
            }
        } while (!resultCursor.equals("0")); // 0 is returned for the cursor of the last iteration.

        // check that each key added to the database is found through the cursor
        Object[] finalKeysFound = keysFound;
        keys.forEach((key, value) -> assertTrue(ArrayUtils.contains(finalKeysFound, key)));
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void scan_binary(GlideClient regularClient) {
        GlideString initialCursor = gs("0");

        int numberKeys = 500;
        Map<GlideString, GlideString> keys = new HashMap<>();
        for (int i = 0; i < numberKeys; i++) {
            keys.put(
                    gs("{key}-" + i + "-" + UUID.randomUUID()), gs("{value}-" + i + "-" + UUID.randomUUID()));
        }

        int resultCursorIndex = 0;
        int resultCollectionIndex = 1;

        // empty the database
        assertEquals(OK, regularClient.flushdb().get());

        // Empty return
        Object[] emptyResult = regularClient.scan(initialCursor).get();
        assertEquals(initialCursor, emptyResult[resultCursorIndex]);
        assertDeepEquals(new String[] {}, emptyResult[resultCollectionIndex]);

        // Negative cursor
        if (SERVER_VERSION.isGreaterThanOrEqualTo("8.0.0")) {
            ExecutionException executionException =
                    assertThrows(ExecutionException.class, () -> regularClient.scan(gs("-1")).get());
        } else {
            Object[] negativeResult = regularClient.scan(gs("-1")).get();
            assertEquals(initialCursor, negativeResult[resultCursorIndex]);
            assertDeepEquals(new String[] {}, negativeResult[resultCollectionIndex]);
        }

        // Add keys to the database using mset
        regularClient.msetBinary(keys).get();

        Object[] result;
        Object[] keysFound = new GlideString[0];
        GlideString resultCursor = gs("0");
        boolean isFirstLoop = true;
        do {
            result = regularClient.scan(resultCursor).get();
            resultCursor = (GlideString) result[resultCursorIndex];
            Object[] resultKeys = (Object[]) result[resultCollectionIndex];
            keysFound = ArrayUtils.addAll(keysFound, resultKeys);

            if (isFirstLoop) {
                assertNotEquals(gs("0"), resultCursor);
                isFirstLoop = false;
            } else if (resultCursor.equals(gs("0"))) {
                break;
            }
        } while (!resultCursor.equals(gs("0"))); // 0 is returned for the cursor of the last iteration.

        // check that each key added to the database is found through the cursor
        Object[] finalKeysFound = keysFound;
        keys.forEach((key, value) -> assertTrue(ArrayUtils.contains(finalKeysFound, key)));
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void scan_with_options(GlideClient regularClient) {
        String initialCursor = "0";
        String matchPattern = UUID.randomUUID().toString();

        int resultCursorIndex = 0;
        int resultCollectionIndex = 1;

        // Add string keys to the database using mset
        Map<String, String> stringKeys = new HashMap<>();
        for (int i = 0; i < 10; i++) {
            stringKeys.put("{key}-" + i + "-" + matchPattern, "{value}-" + i + "-" + matchPattern);
        }
        regularClient.mset(stringKeys).get();

        // Add set keys to the database using sadd
        List<String> setKeys = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            String key = "{key}-set-" + i + "-" + matchPattern;
            regularClient.sadd(
                    gs(key),
                    new GlideString[] {gs(UUID.randomUUID().toString()), gs(UUID.randomUUID().toString())});
            setKeys.add(key);
        }

        // Empty return - match a random UUID
        ScanOptions options = ScanOptions.builder().matchPattern("*" + UUID.randomUUID()).build();
        Object[] emptyResult = regularClient.scan(initialCursor, options).get();
        assertNotEquals(initialCursor, emptyResult[resultCursorIndex]);
        assertDeepEquals(new String[] {}, emptyResult[resultCollectionIndex]);

        // Negative cursor
        if (SERVER_VERSION.isGreaterThanOrEqualTo("8.0.0")) {
            final ScanOptions finalOptions = options;
            ExecutionException executionException =
                    assertThrows(
                            ExecutionException.class, () -> regularClient.scan("-1", finalOptions).get());
        } else {
            Object[] negativeResult = regularClient.scan("-1", options).get();
            assertEquals(initialCursor, negativeResult[resultCursorIndex]);
            assertDeepEquals(new String[] {}, negativeResult[resultCollectionIndex]);
        }

        // scan for strings by match pattern:
        options =
                ScanOptions.builder().matchPattern("*" + matchPattern).count(100L).type(STRING).build();
        Object[] result;
        Object[] keysFound = new String[0];
        String resultCursor = "0";
        do {
            result = regularClient.scan(resultCursor, options).get();
            resultCursor = result[resultCursorIndex].toString();
            Object[] resultKeys = (Object[]) result[resultCollectionIndex];
            keysFound = ArrayUtils.addAll(keysFound, resultKeys);
        } while (!resultCursor.equals("0")); // 0 is returned for the cursor of the last iteration.

        // check that each key added to the database is found through the cursor
        Object[] finalKeysFound = keysFound;
        stringKeys.forEach((key, value) -> assertTrue(ArrayUtils.contains(finalKeysFound, key)));

        // scan for sets by match pattern:
        options = ScanOptions.builder().matchPattern("*" + matchPattern).count(100L).type(SET).build();
        Object[] setResult;
        Object[] setsFound = new String[0];
        String setCursor = "0";
        do {
            setResult = regularClient.scan(setCursor, options).get();
            setCursor = setResult[resultCursorIndex].toString();
            Object[] resultKeys = (Object[]) setResult[resultCollectionIndex];
            setsFound = ArrayUtils.addAll(setsFound, resultKeys);
        } while (!setCursor.equals("0")); // 0 is returned for the cursor of the last iteration.

        // check that each key added to the database is found through the cursor
        Object[] finalSetsFound = setsFound;
        setKeys.forEach(k -> assertTrue(ArrayUtils.contains(finalSetsFound, k)));

        // scan for hashes by match pattern:
        // except in this case, we should never find anything
        options = ScanOptions.builder().matchPattern("*" + matchPattern).count(100L).type(HASH).build();
        String hashCursor = "0";
        do {
            Object[] hashResult = regularClient.scan(hashCursor, options).get();
            hashCursor = hashResult[resultCursorIndex].toString();
            assertEquals(0, ((Object[]) hashResult[resultCollectionIndex]).length);
        } while (!hashCursor.equals("0")); // 0 is returned for the cursor of the last iteration.
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void scan_binary_with_options(GlideClient regularClient) {
        GlideString initialCursor = gs("0");
        String matchPattern = UUID.randomUUID().toString();

        int resultCursorIndex = 0;
        int resultCollectionIndex = 1;

        // Add string keys to the database using mset
        Map<GlideString, GlideString> stringKeys = new HashMap<>();
        for (int i = 0; i < 10; i++) {
            stringKeys.put(
                    gs("{key}-" + i + "-" + matchPattern), gs("{value}-" + i + "-" + matchPattern));
        }
        regularClient.msetBinary(stringKeys).get();

        // Add set keys to the database using sadd
        List<GlideString> setKeys = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            GlideString key = gs("{key}-set-" + i + "-" + matchPattern);
            regularClient.sadd(
                    key,
                    new GlideString[] {gs(UUID.randomUUID().toString()), gs(UUID.randomUUID().toString())});
            setKeys.add(key);
        }

        // Empty return - match a random UUID
        ScanOptions options = ScanOptions.builder().matchPattern("*" + UUID.randomUUID()).build();
        Object[] emptyResult = regularClient.scan(initialCursor, options).get();
        assertNotEquals(initialCursor, emptyResult[resultCursorIndex]);
        assertDeepEquals(new String[] {}, emptyResult[resultCollectionIndex]);

        // Negative cursor
        if (SERVER_VERSION.isGreaterThanOrEqualTo("8.0.0")) {
            final ScanOptions finalOptions = options;
            ExecutionException executionException =
                    assertThrows(
                            ExecutionException.class, () -> regularClient.scan(gs("-1"), finalOptions).get());
        } else {
            Object[] negativeResult = regularClient.scan(gs("-1"), options).get();
            assertEquals(initialCursor, negativeResult[resultCursorIndex]);
            assertDeepEquals(new String[] {}, negativeResult[resultCollectionIndex]);
        }

        // scan for strings by match pattern:
        options =
                ScanOptions.builder().matchPattern("*" + matchPattern).count(100L).type(STRING).build();
        Object[] result;
        Object[] keysFound = new GlideString[0];
        GlideString resultCursor = gs("0");
        do {
            result = regularClient.scan(resultCursor, options).get();
            resultCursor = (GlideString) result[resultCursorIndex];
            Object[] resultKeys = (Object[]) result[resultCollectionIndex];
            keysFound = ArrayUtils.addAll(keysFound, resultKeys);
        } while (!resultCursor.equals(gs("0"))); // 0 is returned for the cursor of the last iteration.

        // check that each key added to the database is found through the cursor
        Object[] finalKeysFound = keysFound;
        stringKeys.forEach((key, value) -> assertTrue(ArrayUtils.contains(finalKeysFound, key)));

        // scan for sets by match pattern:
        options = ScanOptions.builder().matchPattern("*" + matchPattern).count(100L).type(SET).build();
        Object[] setResult;
        Object[] setsFound = new GlideString[0];
        GlideString setCursor = gs("0");
        do {
            setResult = regularClient.scan(setCursor, options).get();
            setCursor = (GlideString) setResult[resultCursorIndex];
            Object[] resultKeys = (Object[]) setResult[resultCollectionIndex];
            setsFound = ArrayUtils.addAll(setsFound, resultKeys);
        } while (!setCursor.equals(gs("0"))); // 0 is returned for the cursor of the last iteration.

        // check that each key added to the database is found through the cursor
        Object[] finalSetsFound = setsFound;
        setKeys.forEach(k -> assertTrue(ArrayUtils.contains(finalSetsFound, k)));

        // scan for hashes by match pattern:
        // except in this case, we should never find anything
        options = ScanOptions.builder().matchPattern("*" + matchPattern).count(100L).type(HASH).build();
        GlideString hashCursor = gs("0");
        do {
            Object[] hashResult = regularClient.scan(hashCursor, options).get();
            hashCursor = (GlideString) hashResult[resultCursorIndex];
            assertEquals(0, ((Object[]) hashResult[resultCollectionIndex]).length);
        } while (!hashCursor.equals(gs("0"))); // 0 is returned for the cursor of the last iteration.
    }

    @SneakyThrows
    @ParameterizedTest
    @MethodSource("getClients")
    public void invokeScript_test(GlideClient regularClient) {
        String key1 = UUID.randomUUID().toString();
        String key2 = UUID.randomUUID().toString();

        try (Script script = new Script("return 'Hello'", false)) {
            Object response = regularClient.invokeScript(script).get();
            assertEquals("Hello", response);
        }

        try (Script script = new Script("return redis.call('SET', KEYS[1], ARGV[1])", false)) {
            Object setResponse1 =
                    regularClient
                            .invokeScript(script, ScriptOptions.builder().key(key1).arg("value1").build())
                            .get();
            assertEquals(OK, setResponse1);

            Object setResponse2 =
                    regularClient
                            .invokeScript(script, ScriptOptions.builder().key(key2).arg("value2").build())
                            .get();
            assertEquals(OK, setResponse2);
        }

        try (Script script = new Script("return redis.call('GET', KEYS[1])", false)) {
            Object getResponse1 =
                    regularClient.invokeScript(script, ScriptOptions.builder().key(key1).build()).get();
            assertEquals("value1", getResponse1);

            // Use GlideString in option but we still expect nonbinary output
            Object getResponse2 =
                    regularClient
                            .invokeScript(script, ScriptOptionsGlideString.builder().key(gs(key2)).build())
                            .get();
            assertEquals("value2", getResponse2);
        }
    }

    @SneakyThrows
    @ParameterizedTest
    @MethodSource("getClients")
    public void script_large_keys_and_or_args(GlideClient regularClient) {
        String str1 = "0".repeat(1 << 12); // 4k
        String str2 = "0".repeat(1 << 12); // 4k

        try (Script script = new Script("return KEYS[1]", false)) {
            // 1 very big key
            Object response =
                    regularClient
                            .invokeScript(script, ScriptOptions.builder().key(str1 + str2).build())
                            .get();
            assertEquals(str1 + str2, response);
        }

        try (Script script = new Script("return KEYS[1]", false)) {
            // 2 big keys
            Object response =
                    regularClient
                            .invokeScript(script, ScriptOptions.builder().key(str1).key(str2).build())
                            .get();
            assertEquals(str1, response);
        }

        try (Script script = new Script("return ARGV[1]", false)) {
            // 1 very big arg
            Object response =
                    regularClient
                            .invokeScript(script, ScriptOptions.builder().arg(str1 + str2).build())
                            .get();
            assertEquals(str1 + str2, response);
        }

        try (Script script = new Script("return ARGV[1]", false)) {
            // 1 big arg + 1 big key
            Object response =
                    regularClient
                            .invokeScript(script, ScriptOptions.builder().arg(str1).key(str2).build())
                            .get();
            assertEquals(str2, response);
        }
    }

    @SneakyThrows
    @ParameterizedTest
    @MethodSource("getClients")
    public void invokeScript_gs_test(GlideClient regularClient) {
        GlideString key1 = gs(UUID.randomUUID().toString());
        GlideString key2 = gs(UUID.randomUUID().toString());

        try (Script script = new Script(gs("return 'Hello'"), true)) {
            Object response = regularClient.invokeScript(script).get();
            assertEquals(gs("Hello"), response);
        }

        try (Script script = new Script(gs("return redis.call('SET', KEYS[1], ARGV[1])"), true)) {
            Object setResponse1 =
                    regularClient
                            .invokeScript(
                                    script, ScriptOptionsGlideString.builder().key(key1).arg(gs("value1")).build())
                            .get();
            assertEquals(OK, setResponse1);

            Object setResponse2 =
                    regularClient
                            .invokeScript(
                                    script, ScriptOptionsGlideString.builder().key(key2).arg(gs("value2")).build())
                            .get();
            assertEquals(OK, setResponse2);
        }

        try (Script script = new Script(gs("return redis.call('GET', KEYS[1])"), true)) {
            Object getResponse1 =
                    regularClient
                            .invokeScript(script, ScriptOptionsGlideString.builder().key(key1).build())
                            .get();
            assertEquals(gs("value1"), getResponse1);

            // Use String in option but we still expect binary output (GlideString)
            Object getResponse2 =
                    regularClient
                            .invokeScript(script, ScriptOptions.builder().key(key2.toString()).build())
                            .get();
            assertEquals(gs("value2"), getResponse2);
        }
    }

    @SneakyThrows
    public void scriptExists(GlideClient regularClient) {
        Script script1 = new Script("return 'Hello'", true);
        Script script2 = new Script("return 'World'", true);
        Boolean[] expected = new Boolean[] {true, false, false};

        // Load script1 to all nodes, do not load script2 and load script3 with a SlotKeyRoute
        regularClient.invokeScript(script1).get();

        // Get the SHA1 digests of the scripts
        String sha1_1 = script1.getHash();
        String sha1_2 = script2.getHash();
        String nonExistentSha1 = "0".repeat(40); // A SHA1 that doesn't exist

        // Check existence of scripts
        Boolean[] result =
                regularClient.scriptExists(new String[] {sha1_1, sha1_2, nonExistentSha1}).get();
        assertArrayEquals(expected, result);
        script1.close();
        script2.close();
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void scriptExistsBinary(GlideClient regularClient) {
        Script script1 = new Script(gs("return 'Hello'"), true);
        Script script2 = new Script(gs("return 'World'"), true);
        Boolean[] expected = new Boolean[] {true, false, false};

        // Load script1 to all nodes, do not load script2 and load script3 with a SlotKeyRoute
        regularClient.invokeScript(script1).get();

        // Get the SHA1 digests of the scripts
        GlideString sha1_1 = gs(script1.getHash());
        GlideString sha1_2 = gs(script2.getHash());
        GlideString nonExistentSha1 = gs("0".repeat(40)); // A SHA1 that doesn't exist

        // Check existence of scripts
        Boolean[] result =
                regularClient.scriptExists(new GlideString[] {sha1_1, sha1_2, nonExistentSha1}).get();
        assertArrayEquals(expected, result);
        script1.close();
        script2.close();
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void scriptFlush(GlideClient regularClient) {
        Script script = new Script("return 'Hello'", true);

        // Load script
        regularClient.invokeScript(script).get();

        // Check existence of scripts
        Boolean[] result = regularClient.scriptExists(new String[] {script.getHash()}).get();
        assertArrayEquals(new Boolean[] {true}, result);

        // flush the script cache
        assertEquals(OK, regularClient.scriptFlush().get());

        // check that the script no longer exists
        result = regularClient.scriptExists(new String[] {script.getHash()}).get();
        assertArrayEquals(new Boolean[] {false}, result);

        // Test with ASYNC mode
        regularClient.invokeScript(script).get();
        assertEquals(OK, regularClient.scriptFlush(FlushMode.ASYNC).get());
        result = regularClient.scriptExists(new String[] {script.getHash()}).get();
        assertArrayEquals(new Boolean[] {false}, result);
        script.close();
    }

    @ParameterizedTest
    @MethodSource("getClients")
    @SneakyThrows
    public void scriptKill(GlideClient regularClient) {
        // Verify that script_kill raises an error when no script is running
        ExecutionException executionException =
                assertThrows(ExecutionException.class, () -> regularClient.scriptKill().get());
        assertInstanceOf(RequestException.class, executionException.getCause());
        assertTrue(
                executionException
                        .getMessage()
                        .toLowerCase()
                        .contains("no scripts in execution right now"));

        CompletableFuture<Object> promise = new CompletableFuture<>();
        promise.complete(null);

        // create and load a long-running script
        Script script = new Script(createLongRunningLuaScript(5, true), true);

        try (var testClient =
                GlideClient.createClient(commonClientConfig().requestTimeout(10000).build()).get()) {
            try {
                testClient.invokeScript(script);

                Thread.sleep(1000);

                // Run script kill until it returns OK
                boolean scriptKilled = false;
                int timeout = 4000; // ms
                while (timeout >= 0) {
                    try {
                        assertEquals(OK, regularClient.scriptKill().get());
                        scriptKilled = true;
                        break;
                    } catch (RequestException ignored) {
                    }
                    Thread.sleep(500);
                    timeout -= 500;
                }

                assertTrue(scriptKilled);
            } finally {
                waitForNotBusy(regularClient::scriptKill);
                script.close();
            }
        }

        // Verify that script_kill raises an error when no script is running
        executionException =
                assertThrows(ExecutionException.class, () -> regularClient.scriptKill().get());
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
    public void scriptKill_unkillable(GlideClient regularClient) {
        String key = UUID.randomUUID().toString();
        String code = createLongRunningLuaScript(6, false);
        Script script = new Script(code, false);

        CompletableFuture<Object> promise = new CompletableFuture<>();
        promise.complete(null);

        try (var testClient =
                GlideClient.createClient(commonClientConfig().requestTimeout(10000).build()).get()) {
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
                        regularClient.scriptKill().get();
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
