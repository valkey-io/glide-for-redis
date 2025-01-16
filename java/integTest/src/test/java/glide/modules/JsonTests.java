/** Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0 */
package glide.modules;

import static glide.TestUtilities.assertDeepEquals;
import static glide.TestUtilities.commonClusterClientConfig;
import static glide.api.BaseClient.OK;
import static glide.api.models.GlideString.gs;
import static glide.api.models.configuration.RequestRoutingConfiguration.SimpleMultiNodeRoute.ALL_PRIMARIES;
import static glide.api.models.configuration.RequestRoutingConfiguration.SimpleSingleNodeRoute.RANDOM;
import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.google.gson.JsonParser;
import glide.api.GlideClusterClient;
import glide.api.commands.servermodules.Json;
import glide.api.commands.servermodules.MultiJson;
import glide.api.models.ClusterTransaction;
import glide.api.models.GlideString;
import glide.api.models.commands.ConditionalChange;
import glide.api.models.commands.FlushMode;
import glide.api.models.commands.InfoOptions.Section;
import glide.api.models.commands.json.JsonArrindexOptions;
import glide.api.models.commands.json.JsonGetOptions;
import java.util.ArrayList;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ExecutionException;
import lombok.SneakyThrows;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

public class JsonTests {

    private static GlideClusterClient client;

    @BeforeAll
    @SneakyThrows
    public static void init() {
        client =
                GlideClusterClient.createClient(commonClusterClientConfig().requestTimeout(5000).build())
                        .get();
        client.flushall(FlushMode.SYNC, ALL_PRIMARIES).get();
    }

    @AfterAll
    @SneakyThrows
    public static void teardown() {
        client.close();
    }

    @Test
    @SneakyThrows
    public void check_module_loaded() {
        var info = client.info(new Section[] {Section.MODULES}, RANDOM).get().getSingleValue();
        assertTrue(info.contains("# json_core_metrics"));
    }

    @Test
    @SneakyThrows
    public void json_set_get() {
        String key = UUID.randomUUID().toString();
        String jsonValue = "{\"a\": 1.0,\"b\": 2}";

        assertEquals(OK, Json.set(client, key, "$", jsonValue).get());

        String getResult = Json.get(client, key).get();

        assertEquals(JsonParser.parseString(jsonValue), JsonParser.parseString(getResult));

        String getResultWithMultiPaths = Json.get(client, key, new String[] {"$.a", "$.b"}).get();

        assertEquals(
                JsonParser.parseString("{\"$.a\":[1.0],\"$.b\":[2]}"),
                JsonParser.parseString(getResultWithMultiPaths));

        assertNull(Json.get(client, "non_existing_key").get());
        assertEquals("[]", Json.get(client, key, new String[] {"$.d"}).get());
    }

    @Test
    @SneakyThrows
    public void json_set_get_multiple_values() {
        String key = UUID.randomUUID().toString();
        String jsonValue = "{\"a\": {\"c\": 1, \"d\": 4}, \"b\": {\"c\": 2}, \"c\": true}";

        assertEquals(OK, Json.set(client, gs(key), gs("$"), gs(jsonValue)).get());

        GlideString getResult = Json.get(client, gs(key), new GlideString[] {gs("$..c")}).get();

        assertEquals(
                JsonParser.parseString("[true, 1, 2]"), JsonParser.parseString(getResult.getString()));

        String getResultWithMultiPaths = Json.get(client, key, new String[] {"$..c", "$.c"}).get();

        assertEquals(
                JsonParser.parseString("{\"$..c\": [True, 1, 2], \"$.c\": [True]}"),
                JsonParser.parseString(getResultWithMultiPaths));

        assertEquals(OK, Json.set(client, key, "$..c", "\"new_value\"").get());
        String getResultAfterSetNewValue = Json.get(client, key, new String[] {"$..c"}).get();
        assertEquals(
                JsonParser.parseString("[\"new_value\", \"new_value\", \"new_value\"]"),
                JsonParser.parseString(getResultAfterSetNewValue));
    }

    @Test
    @SneakyThrows
    public void json_set_get_conditional_set() {
        String key = UUID.randomUUID().toString();
        String jsonValue = "{\"a\": 1.0, \"b\": 2}";

        assertNull(Json.set(client, key, "$", jsonValue, ConditionalChange.ONLY_IF_EXISTS).get());
        assertEquals(
                OK, Json.set(client, key, "$", jsonValue, ConditionalChange.ONLY_IF_DOES_NOT_EXIST).get());
        assertNull(Json.set(client, key, "$.a", "4.5", ConditionalChange.ONLY_IF_DOES_NOT_EXIST).get());
        assertEquals("1.0", Json.get(client, key, new String[] {".a"}).get());
        assertEquals(OK, Json.set(client, key, "$.a", "4.5", ConditionalChange.ONLY_IF_EXISTS).get());
        assertEquals("4.5", Json.get(client, key, new String[] {".a"}).get());
    }

    @Test
    @SneakyThrows
    public void json_set_get_formatting() {
        String key = UUID.randomUUID().toString();

        assertEquals(
                OK,
                Json.set(client, key, "$", "{\"a\": 1.0, \"b\": 2, \"c\": {\"d\": 3, \"e\": 4}}").get());

        String expectedGetResult =
                "[\n"
                        + "  {\n"
                        + "    \"a\": 1.0,\n"
                        + "    \"b\": 2,\n"
                        + "    \"c\": {\n"
                        + "      \"d\": 3,\n"
                        + "      \"e\": 4\n"
                        + "    }\n"
                        + "  }\n"
                        + "]";
        String actualGetResult =
                Json.get(
                                client,
                                key,
                                new String[] {"$"},
                                JsonGetOptions.builder().indent("  ").newline("\n").space(" ").build())
                        .get();
        assertEquals(expectedGetResult, actualGetResult);

        String expectedGetResult2 =
                "[\n~{\n~~\"a\":*1.0,\n~~\"b\":*2,\n~~\"c\":*{\n~~~\"d\":*3,\n~~~\"e\":*4\n~~}\n~}\n]";
        String actualGetResult2 =
                Json.get(
                                client,
                                key,
                                new String[] {"$"},
                                JsonGetOptions.builder().indent("~").newline("\n").space("*").build())
                        .get();
        assertEquals(expectedGetResult2, actualGetResult2);
    }

    @Test
    @SneakyThrows
    public void arrappend() {
        String key = UUID.randomUUID().toString();
        String doc = "{\"a\": 1, \"b\": [\"one\", \"two\"]}";

        assertEquals(OK, Json.set(client, key, "$", doc).get());

        assertArrayEquals(
                new Object[] {3L},
                (Object[]) Json.arrappend(client, key, "$.b", new String[] {"\"three\""}).get());
        assertEquals(
                5L, Json.arrappend(client, key, ".b", new String[] {"\"four\"", "\"five\""}).get());

        String getResult = Json.get(client, key, new String[] {"$"}).get();
        String expectedGetResult =
                "[{\"a\": 1, \"b\": [\"one\", \"two\", \"three\", \"four\", \"five\"]}]";
        assertEquals(JsonParser.parseString(expectedGetResult), JsonParser.parseString(getResult));

        assertArrayEquals(
                new Object[] {null},
                (Object[]) Json.arrappend(client, key, "$.a", new String[] {"\"value\""}).get());

        // JSONPath, path doesn't exist
        assertArrayEquals(
                new Object[] {},
                (Object[])
                        Json.arrappend(client, gs(key), gs("$.c"), new GlideString[] {gs("\"value\"")}).get());

        // Legacy path, path doesn't exist
        assertThrows(
                ExecutionException.class,
                () -> Json.arrappend(client, key, ".c", new String[] {"\"value\""}).get());

        // Legacy path, the JSON value at path is not a array
        assertThrows(
                ExecutionException.class,
                () -> Json.arrappend(client, key, ".a", new String[] {"\"value\""}).get());

        assertThrows(
                ExecutionException.class,
                () -> Json.arrappend(client, "non_existing_key", "$.b", new String[] {"\"six\""}).get());

        assertThrows(
                ExecutionException.class,
                () -> Json.arrappend(client, "non_existing_key", ".b", new String[] {"\"six\""}).get());
    }

    @Test
    @SneakyThrows
    public void arrindex() {
        String key1 = UUID.randomUUID().toString();
        String key2 = UUID.randomUUID().toString();
        String key3 = UUID.randomUUID().toString();

        String doc1 =
                "{\"a\": [1, 3, true], \"b\": {\"a\": [3, 4, [\"value\", 3, false], 5], \"c\": {\"a\":"
                        + " 42}}}";

        String doc2 =
                "{\"a\": [1, 3, true, \"foo\", \"meow\", \"m\", \"foo\", \"lol\", false], \"b\": {\"a\":"
                        + " [3, 4, [\"value\", 3, false], 5], \"c\": {\"a\": 42}, \"empty\": []}}";

        String doc3 = "{\"a\": 123123}";

        assertEquals("OK", Json.set(client, key1, "$", doc1).get());
        assertArrayEquals(
                new Object[] {2L, -1L, null}, (Object[]) Json.arrindex(client, key1, "$..a", "true").get());

        assertArrayEquals(
                new Object[] {1L, 0L, null},
                (Object[]) Json.arrindex(client, gs(key1), gs("$..a"), gs("3")).get());

        assertEquals("OK", Json.set(client, key2, "$", doc2).get());

        assertArrayEquals(
                new Object[] {6L, -1L, null},
                (Object[])
                        Json.arrindex(client, key2, "$..a", "\"foo\"", new JsonArrindexOptions(6L, 8L)).get());

        assertArrayEquals(
                new Object[] {-1L, -1L, null},
                (Object[])
                        Json.arrindex(client, key2, "$..a", "null", new JsonArrindexOptions(6L, 8L)).get());
        assertArrayEquals(
                new Object[] {-1L, -1L, null},
                (Object[])
                        Json.arrindex(client, gs(key2), gs("$..a"), gs("null"), new JsonArrindexOptions(6L, 8L))
                                .get());

        assertArrayEquals(
                new Object[] {6L, -1L, null},
                (Object[])
                        Json.arrindex(
                                        client, gs(key2), gs("$..a"), gs("\"foo\""), new JsonArrindexOptions(6L, 8L))
                                .get());

        assertArrayEquals(
                new Object[] {6L, -1L, null},
                (Object[])
                        Json.arrindex(client, key2, "$..a", "\"foo\"", new JsonArrindexOptions(6L)).get());

        // value doesn't exist
        assertArrayEquals(
                new Object[] {null},
                (Object[])
                        Json.arrindex(client, key1, "$..b", "true", new JsonArrindexOptions(1L, 3L)).get());

        // with legacy path
        assertEquals(2L, Json.arrindex(client, key1, ".a", "true").get());

        // element doesn't exist
        assertEquals(-1L, Json.arrindex(client, key1, ".a", "\"nonexistent-element\"").get());

        // empty array
        assertThrows(
                ExecutionException.class,
                () -> Json.arrindex(client, key1, ".empty", "\"nonexistent-element\"").get());

        assertEquals("OK", Json.set(client, key3, "$", doc3).get());

        // wrong type error
        assertThrows(ExecutionException.class, () -> Json.arrindex(client, key3, ".a", "42").get());

        // JsonScalar is null
        assertThrows(ExecutionException.class, () -> Json.arrindex(client, key3, ".a", "null").get());

        // start index is larger than the end index
        assertEquals(
                -1L, Json.arrindex(client, key2, ".a", "false", new JsonArrindexOptions(4L, 2L)).get());

        // end index is larger than the length of the array
        assertEquals(
                8L,
                Json.arrindex(client, key2, ".a", "false", new JsonArrindexOptions(0L, 12378798798721L))
                        .get());
    }

    @Test
    @SneakyThrows
    public void arrinsert() {
        String key = UUID.randomUUID().toString();

        String doc =
                "{"
                        + "\"a\": [],"
                        + "\"b\": { \"a\": [1, 2, 3, 4] },"
                        + "\"c\": { \"a\": \"not an array\" },"
                        + "\"d\": [{ \"a\": [\"x\", \"y\"] }, { \"a\": [[\"foo\"]] }],"
                        + "\"e\": [{ \"a\": 42 }, { \"a\": {} }],"
                        + "\"f\": { \"a\": [true, false, null] }"
                        + "}";
        assertEquals("OK", Json.set(client, key, "$", doc).get());

        String[] values =
                new String[] {
                    "\"string_value\"", "123", "{\"key\": \"value\"}", "true", "null", "[\"bar\"]"
                };
        var res = Json.arrinsert(client, key, "$..a", 0, values).get();

        doc = Json.get(client, key).get();
        var expected =
                "{"
                        + "    \"a\": [\"string_value\", 123, {\"key\": \"value\"}, true, null, [\"bar\"]],"
                        + "    \"b\": {"
                        + "        \"a\": ["
                        + "            \"string_value\","
                        + "            123,"
                        + "            {\"key\": \"value\"},"
                        + "            true,"
                        + "            null,"
                        + "            [\"bar\"],"
                        + "            1,"
                        + "            2,"
                        + "            3,"
                        + "            4"
                        + "        ]"
                        + "    },"
                        + "    \"c\": {\"a\": \"not an array\"},"
                        + "    \"d\": ["
                        + "        {"
                        + "            \"a\": ["
                        + "                \"string_value\","
                        + "                123,"
                        + "                {\"key\": \"value\"},"
                        + "                true,"
                        + "                null,"
                        + "                [\"bar\"],"
                        + "                \"x\","
                        + "                \"y\""
                        + "            ]"
                        + "        },"
                        + "        {"
                        + "            \"a\": ["
                        + "                \"string_value\","
                        + "                123,"
                        + "                {\"key\": \"value\"},"
                        + "                true,"
                        + "                null,"
                        + "                [\"bar\"],"
                        + "                [\"foo\"]"
                        + "            ]"
                        + "        }"
                        + "    ],"
                        + "    \"e\": [{\"a\": 42}, {\"a\": {}}],"
                        + "    \"f\": {"
                        + "        \"a\": ["
                        + "            \"string_value\","
                        + "            123,"
                        + "            {\"key\": \"value\"},"
                        + "            true,"
                        + "            null,"
                        + "            [\"bar\"],"
                        + "            true,"
                        + "            false,"
                        + "            null"
                        + "        ]"
                        + "    }"
                        + "}";

        assertEquals(JsonParser.parseString(expected), JsonParser.parseString(doc));
    }

    @Test
    @SneakyThrows
    public void debug() {
        String key = UUID.randomUUID().toString();

        var doc =
                "{ \"key1\": 1, \"key2\": 3.5, \"key3\": {\"nested_key\": {\"key1\": [4, 5]}}, \"key4\":"
                        + " [1, 2, 3], \"key5\": 0, \"key6\": \"hello\", \"key7\": null, \"key8\":"
                        + " {\"nested_key\": {\"key1\": 3.5953862697246314e307}}, \"key9\":"
                        + " 3.5953862697246314e307, \"key10\": true }";
        assertEquals("OK", Json.set(client, key, "$", doc).get());

        assertArrayEquals(new Object[] {1L}, (Object[]) Json.debugFields(client, key, "$.key1").get());

        assertEquals(2L, Json.debugFields(client, gs(key), gs(".key3.nested_key.key1")).get());

        assertArrayEquals(
                new Object[] {16L}, (Object[]) Json.debugMemory(client, key, "$.key4[2]").get());

        assertEquals(16L, Json.debugMemory(client, gs(key), gs(".key6")).get());

        assertEquals(504L, Json.debugMemory(client, key).get());
        assertEquals(19L, Json.debugFields(client, gs(key)).get());
    }

    @Test
    @SneakyThrows
    public void arrlen() {
        String key = UUID.randomUUID().toString();

        String doc = "{\"a\": [1, 2, 3], \"b\": {\"a\": [1, 2], \"c\": {\"a\": 42}}}";
        assertEquals("OK", Json.set(client, key, "$", doc).get());

        var res = Json.arrlen(client, key, "$.a").get();
        assertArrayEquals(new Object[] {3L}, (Object[]) res);

        res = Json.arrlen(client, key, "$..a").get();
        assertArrayEquals(new Object[] {3L, 2L, null}, (Object[]) res);

        // Legacy path retrieves the first array match at ..a
        res = Json.arrlen(client, gs(key), gs("..a")).get();
        assertEquals(3L, res);

        doc = "[1, 2, true, null, \"tree\"]";
        assertEquals("OK", Json.set(client, key, "$", doc).get());

        // no path
        res = Json.arrlen(client, key).get();
        assertEquals(5L, res);
        res = Json.arrlen(client, gs(key)).get();
        assertEquals(5L, res);
    }

    @Test
    @SneakyThrows
    public void arrpop() {
        String key = UUID.randomUUID().toString();
        String doc =
                "{\"a\": [1, 2, true], \"b\": {\"a\": [3, 4, [\"value\", 3, false], 5], \"c\": {\"a\":"
                        + " 42}}}";
        assertEquals(OK, Json.set(client, key, "$", doc).get());

        var res = Json.arrpop(client, key, "$.a", 1).get();
        assertArrayEquals(new Object[] {"2"}, (Object[]) res);

        res = Json.arrpop(client, gs(key), gs("$..a")).get();
        assertArrayEquals(new Object[] {gs("true"), gs("5"), null}, (Object[]) res);

        res = Json.arrpop(client, key, "..a").get();
        assertEquals("1", res);

        // Even if only one array element was returned, ensure second array at `..a` was popped
        doc = Json.get(client, key, new String[] {"$..a"}).get();
        assertEquals("[[],[3,4],42]", doc);

        // Out of index
        res = Json.arrpop(client, key, "$..a", 10).get();
        assertArrayEquals(new Object[] {null, "4", null}, (Object[]) res);

        // pop without options
        assertEquals(OK, Json.set(client, key, "$", doc).get());
        res = Json.arrpop(client, key).get();
        assertEquals("42", res);
        res = Json.arrpop(client, gs(key)).get();
        assertEquals(gs("[3,4]"), res);
    }

    @Test
    @SneakyThrows
    public void clear() {
        String key = UUID.randomUUID().toString();
        String json =
                "{\"obj\": {\"a\":1, \"b\":2}, \"arr\":[1, 2, 3], \"str\": \"foo\", \"bool\": true,"
                        + " \"int\": 42, \"float\": 3.14, \"nullVal\": null}";

        assertEquals("OK", Json.set(client, key, "$", json).get());

        assertEquals(6L, Json.clear(client, key, "$.*").get());
        var doc = Json.get(client, key, new String[] {"$"}).get();
        assertEquals(
                "[{\"obj\":{},\"arr\":[],\"str\":\"\",\"bool\":false,\"int\":0,\"float\":0.0,\"nullVal\":null}]",
                doc);
        assertEquals(0L, Json.clear(client, gs(key), gs(".*")).get());

        assertEquals(1L, Json.clear(client, gs(key)).get());
        doc = Json.get(client, key, new String[] {"$"}).get();
        assertEquals("[{}]", doc);

        assertThrows(
                ExecutionException.class, () -> Json.clear(client, UUID.randomUUID().toString()).get());
    }

    @Test
    @SneakyThrows
    void numincrby() {
        String key = UUID.randomUUID().toString();

        var jsonValue =
                "{"
                        + "    \"key1\": 1,"
                        + "    \"key2\": 3.5,"
                        + "    \"key3\": {\"nested_key\": {\"key1\": [4, 5]}},"
                        + "    \"key4\": [1, 2, 3],"
                        + "    \"key5\": 0,"
                        + "    \"key6\": \"hello\","
                        + "    \"key7\": null,"
                        + "    \"key8\": {\"nested_key\": {\"key1\": 69}},"
                        + "    \"key9\": 1.7976931348623157e308"
                        + "}";

        // Set the initial JSON document at the key
        assertEquals("OK", Json.set(client, key, "$", jsonValue).get());

        // Test JSONPath
        // Increment integer value (key1) by 5
        String result = Json.numincrby(client, key, "$.key1", 5).get();
        assertEquals("[6]", result); // Expect 1 + 5 = 6

        // Increment float value (key2) by 2.5
        result = Json.numincrby(client, key, "$.key2", 2.5).get();
        assertEquals("[6]", result); // Expect 3.5 + 2.5 = 6

        // Increment nested object (key3.nested_key.key1[0]) by 7
        result = Json.numincrby(client, key, "$.key3.nested_key.key1[1]", 7).get();
        assertEquals("[12]", result); // Expect 4 + 7 = 12

        // Increment array element (key4[1]) by 1
        result = Json.numincrby(client, key, "$.key4[1]", 1).get();
        assertEquals("[3]", result); // Expect 2 + 1 = 3

        // Increment zero value (key5) by 10.23 (float number)
        result = Json.numincrby(client, key, "$.key5", 10.23).get();
        assertEquals("[10.23]", result); // Expect 0 + 10.23 = 10.23

        // Increment a string value (key6) by a number
        result = Json.numincrby(client, key, "$.key6", 99).get();
        assertEquals("[null]", result); // Expect null

        // Increment a None value (key7) by a number
        result = Json.numincrby(client, key, "$.key7", 51).get();
        assertEquals("[null]", result); // Expect null

        // Check increment for all numbers in the document using JSON Path (First Null: key3 as an
        // entire object. Second Null: The path checks under key3, which is an object, for numeric
        // values).
        result = Json.numincrby(client, key, "$..*", 5).get();
        assertEquals(
                "[11,11,null,null,15.23,null,null,null,1.7976931348623157e+308,null,null,9,17,6,8,8,null,74]",
                result);

        // Check for multiple path match in enhanced
        result = Json.numincrby(client, key, "$..key1", 1).get();
        assertEquals("[12,null,75]", result); // Expect null

        // Check for non existent path in JSONPath
        result = Json.numincrby(client, key, "$.key10", 51).get();
        assertEquals("[]", result); // Expect Empty Array

        // Check for non existent key in JSONPath
        assertThrows(
                ExecutionException.class,
                () -> Json.numincrby(client, "non_existent_key", "$.key10", 51).get());

        // Check for Overflow in JSONPath
        assertThrows(
                ExecutionException.class,
                () -> Json.numincrby(client, key, "$.key9", 1.7976931348623157e308).get());

        // Decrement integer value (key1) by 12
        result = Json.numincrby(client, key, "$.key1", -12).get();
        assertEquals("[0]", result); // Expect 12 - 12 = 0

        // Decrement integer value (key1) by 0.5
        result = Json.numincrby(client, key, "$.key1", -0.5).get();
        assertEquals("[-0.5]", result); // Expect 0 - 0.5 = -0.5

        // Test Legacy Path
        // Increment float value (key1) by 5 (integer)
        result = Json.numincrby(client, key, "key1", 5).get();
        assertEquals("4.5", result); // Expect -0.5 + 5 = 4.5

        // Decrement float value (key1) by 5.5 (integer)
        result = Json.numincrby(client, key, "key1", -5.5).get();
        assertEquals("-1", result); // Expect 4.5 - 5.5 = -1

        // Increment int value (key2) by 2.5 (a float number)
        result = Json.numincrby(client, key, "key2", 2.5).get();
        assertEquals("13.5", result); // Expect 11 + 2.5 = 13.5

        // Increment nested value (key3.nested_key.key1[0]) by 7
        result = Json.numincrby(client, key, "key3.nested_key.key1[0]", 7).get();
        assertEquals("16", result); // Expect 9 + 7 = 16

        // Increment array element (key4[1]) by 1
        result = Json.numincrby(client, key, "key4[1]", 1).get();
        assertEquals("9", result); // Expect 8 + 1 = 9

        // Increment a float value (key5) by 10.2 (a float number)
        result = Json.numincrby(client, key, "key5", 10.2).get();
        assertEquals("25.43", result); // Expect 15.23 + 10.2 = 25.43

        // Check for multiple path match in legacy and assure that the result of the last updated value
        // is returned
        result = Json.numincrby(client, key, "..key1", 1).get();
        assertEquals("76", result);

        // Check if the rest of the key1 path matches were updated and not only the last value
        result = Json.get(client, key, new String[] {"$..key1"}).get();
        assertEquals(
                "[0,[16,17],76]",
                result); // First is 0 as 0 + 0 = 0, Second doesn't change as its an array type
        // (non-numeric), third is 76 as 0 + 76 = 0

        // Check for non existent path in legacy
        assertThrows(ExecutionException.class, () -> Json.numincrby(client, key, ".key10", 51).get());

        // Check for non existent key in legacy
        assertThrows(
                ExecutionException.class,
                () -> Json.numincrby(client, "non_existent_key", ".key10", 51).get());

        // Check for Overflow in legacy
        assertThrows(
                ExecutionException.class,
                () -> Json.numincrby(client, key, ".key9", 1.7976931348623157e308).get());

        // Binary tests
        // Binary integer test
        GlideString binaryResult = Json.numincrby(client, gs(key), gs("key4[1]"), 1).get();
        assertEquals(gs("10"), binaryResult); // Expect 9 + 1 = 10

        // Binary float test
        binaryResult = Json.numincrby(client, gs(key), gs("key5"), 1.0).get();
        assertEquals(gs("26.43"), binaryResult); // Expect 25.43 + 1.0 = 26.43
    }

    @Test
    @SneakyThrows
    void nummultby() {
        String key = UUID.randomUUID().toString();
        var jsonValue =
                "{"
                        + "    \"key1\": 1,"
                        + "    \"key2\": 3.5,"
                        + "    \"key3\": {\"nested_key\": {\"key1\": [4, 5]}},"
                        + "    \"key4\": [1, 2, 3],"
                        + "    \"key5\": 0,"
                        + "    \"key6\": \"hello\","
                        + "    \"key7\": null,"
                        + "    \"key8\": {\"nested_key\": {\"key1\": 69}},"
                        + "    \"key9\": 3.5953862697246314e307"
                        + "}";

        // Set the initial JSON document at the key
        assertEquals("OK", Json.set(client, key, "$", jsonValue).get());

        // Test JSONPath
        // Multiply integer value (key1) by 5
        String result = Json.nummultby(client, key, "$.key1", 5).get();
        assertEquals("[5]", result); // Expect 1 * 5 = 5

        // Multiply float value (key2) by 2.5
        result = Json.nummultby(client, key, "$.key2", 2.5).get();
        assertEquals("[8.75]", result); // Expect 3.5 * 2.5 = 8.75

        // Multiply nested object (key3.nested_key.key1[1]) by 7
        result = Json.nummultby(client, key, "$.key3.nested_key.key1[1]", 7).get();
        assertEquals("[35]", result); // Expect 5 * 7 = 35

        // Multiply array element (key4[1]) by 1
        result = Json.nummultby(client, key, "$.key4[1]", 1).get();
        assertEquals("[2]", result); // Expect 2 * 1 = 2

        // Multiply zero value (key5) by 10.23 (float number)
        result = Json.nummultby(client, key, "$.key5", 10.23).get();
        assertEquals("[0]", result); // Expect 0 * 10.23 = 0

        // Multiply a string value (key6) by a number
        result = Json.nummultby(client, key, "$.key6", 99).get();
        assertEquals("[null]", result); // Expect null

        // Multiply a None value (key7) by a number
        result = Json.nummultby(client, key, "$.key7", 51).get();
        assertEquals("[null]", result); // Expect null

        // Check multiplication for all numbers in the document using JSON Path
        // key1: 5 * 5 = 25
        // key2: 8.75 * 5 = 43.75
        // key3.nested_key.key1[0]: 4 * 5 = 20
        // key3.nested_key.key1[1]: 35 * 5 = 175
        // key4[0]: 1 * 5 = 5
        // key4[1]: 2 * 5 = 10
        // key4[2]: 3 * 5 = 15
        // key5: 0 * 5 = 0
        // key8.nested_key.key1: 69 * 5 = 345
        // key9: 3.5953862697246314e307 * 5 = 1.7976931348623157e308
        result = Json.nummultby(client, key, "$..*", 5).get();
        assertEquals(
                "[25,43.75,null,null,0,null,null,null,1.7976931348623157e+308,null,null,20,175,5,10,15,null,345]",
                result);

        // Check for multiple path matches in JSONPath
        // key1: 25 * 2 = 50
        // key8.nested_key.key1: 345 * 2 = 690
        result = Json.nummultby(client, key, "$..key1", 2).get();
        assertEquals("[50,null,690]", result); // After previous multiplications

        // Check for non-existent path in JSONPath
        result = Json.nummultby(client, key, "$.key10", 51).get();
        assertEquals("[]", result); // Expect Empty Array

        // Check for non-existent key in JSONPath
        assertThrows(
                ExecutionException.class,
                () -> Json.nummultby(client, "non_existent_key", "$.key10", 51).get());

        // Check for Overflow in JSONPath
        assertThrows(
                ExecutionException.class,
                () -> Json.nummultby(client, key, "$.key9", 1.7976931348623157e308).get());

        // Multiply integer value (key1) by -12
        result = Json.nummultby(client, key, "$.key1", -12).get();
        assertEquals("[-600]", result); // Expect 50 * -12 = -600

        // Multiply integer value (key1) by -0.5
        result = Json.nummultby(client, key, "$.key1", -0.5).get();
        assertEquals("[300]", result); // Expect -600 * -0.5 = 300

        // Test Legacy Path
        // Multiply int value (key1) by 5 (integer)
        result = Json.nummultby(client, key, "key1", 5).get();
        assertEquals("1500", result); // Expect 300 * 5 = -1500

        // Multiply int value (key1) by -5.5 (float number)
        result = Json.nummultby(client, key, "key1", -5.5).get();
        assertEquals("-8250", result); // Expect -150 * -5.5 = -8250

        // Multiply int float (key2) by 2.5 (a float number)
        result = Json.nummultby(client, key, "key2", 2.5).get();
        assertEquals("109.375", result); // Expect 43.75 * 2.5 = 109.375

        // Multiply nested value (key3.nested_key.key1[0]) by 7
        result = Json.nummultby(client, key, "key3.nested_key.key1[0]", 7).get();
        assertEquals("140", result); // Expect 20 * 7 = 140

        // Multiply array element (key4[1]) by 1
        result = Json.nummultby(client, key, "key4[1]", 1).get();
        assertEquals("10", result); // Expect 10 * 1 = 10

        // Multiply a float value (key5) by 10.2 (a float number)
        result = Json.nummultby(client, key, "key5", 10.2).get();
        assertEquals("0", result); // Expect 0 * 10.2 = 0

        // Check for multiple path matches in legacy and assure that the result of the last updated
        // value is returned
        // last updated value is key8.nested_key.key1: 690 * 2 = 1380
        result = Json.nummultby(client, key, "..key1", 2).get();
        assertEquals("1380", result); // Expect the last updated key1 value multiplied by 2

        // Check if the rest of the key1 path matches were updated and not only the last value
        result = Json.get(client, key, new String[] {"$..key1"}).get();
        assertEquals(result, "[-16500,[140,175],1380]");

        // Check for non-existent path in legacy
        assertThrows(ExecutionException.class, () -> Json.nummultby(client, key, ".key10", 51).get());

        // Check for non-existent key in legacy
        assertThrows(
                ExecutionException.class,
                () -> Json.nummultby(client, "non_existent_key", ".key10", 51).get());

        // Check for Overflow in legacy
        assertThrows(
                ExecutionException.class,
                () -> Json.nummultby(client, key, ".key9", 1.7976931348623157e308).get());

        // Binary tests
        // Binary integer test
        GlideString binaryResult = Json.nummultby(client, gs(key), gs("key4[1]"), 1).get();
        assertEquals(gs("10"), binaryResult); // Expect 10 * 1 = 10

        // Binary float test
        binaryResult = Json.nummultby(client, gs(key), gs("key5"), 10.2).get();
        assertEquals(gs("0"), binaryResult); // Expect 0 * 10.2 = 0
    }

    @Test
    @SneakyThrows
    public void arrtrim() {
        String key = UUID.randomUUID().toString();

        String doc =
                "{\"a\": [0, 1, 2, 3, 4, 5, 6, 7, 8], \"b\": {\"a\": [0, 9, 10, 11, 12, 13], \"c\": {\"a\":"
                        + " 42}}}";
        assertEquals("OK", Json.set(client, key, "$", doc).get());

        // Basic trim
        var res = Json.arrtrim(client, key, "$..a", 1, 7).get();
        assertArrayEquals(new Object[] {7L, 5L, null}, (Object[]) res);

        String getResult = Json.get(client, key, new String[] {"$..a"}).get();
        String expectedGetResult = "[[1, 2, 3, 4, 5, 6, 7], [9, 10, 11, 12, 13], 42]";
        assertEquals(JsonParser.parseString(expectedGetResult), JsonParser.parseString(getResult));

        // Test end >= size (should be treated as size-1)
        res = Json.arrtrim(client, key, "$.a", 0, 10).get();
        assertArrayEquals(new Object[] {7L}, (Object[]) res);
        res = Json.arrtrim(client, key, ".a", 0, 10).get();
        assertEquals(7L, res);

        // Test negative start (should be treated as 0)
        res = Json.arrtrim(client, key, "$.a", -1, 5).get();
        assertArrayEquals(new Object[] {6L}, (Object[]) res);
        res = Json.arrtrim(client, key, ".a", -1, 5).get();
        assertEquals(6L, res);

        // Test start >= size (should empty the array)
        res = Json.arrtrim(client, key, "$.a", 7, 10).get();
        assertArrayEquals(new Object[] {0L}, (Object[]) res);

        assertEquals("OK", Json.set(client, key, ".a", "[\"a\", \"b\", \"c\"]").get());
        res = Json.arrtrim(client, key, ".a", 7, 10).get();
        assertEquals(0L, res);

        // Test start > end (should empty the array)
        res = Json.arrtrim(client, key, "$..a", 2, 1).get();
        assertArrayEquals(new Object[] {0L, 0L, null}, (Object[]) res);

        assertEquals("OK", Json.set(client, key, ".a", "[\"a\", \"b\", \"c\", \"d\"]").get());
        res = Json.arrtrim(client, key, "..a", 2, 1).get();
        assertEquals(0L, res);

        // Multiple path match
        assertEquals("OK", Json.set(client, key, "$", doc).get());
        res = Json.arrtrim(client, key, "..a", 1, 10).get();
        assertEquals(8L, res);

        getResult = Json.get(client, key, new String[] {"$..a"}).get();
        expectedGetResult = "[[1,2,3,4,5,6,7,8], [9,10,11,12,13], 42]";
        assertEquals(JsonParser.parseString(expectedGetResult), JsonParser.parseString(getResult));

        // Test with non-existing path
        var exception =
                assertThrows(
                        ExecutionException.class, () -> Json.arrtrim(client, key, ".non_existing", 0, 1).get());

        res = Json.arrtrim(client, key, "$.non_existing", 0, 1).get();
        assertArrayEquals(new Object[] {}, (Object[]) res);

        // Test with non-array path
        res = Json.arrtrim(client, key, "$", 0, 1).get();
        assertArrayEquals(new Object[] {null}, (Object[]) res);

        exception =
                assertThrows(ExecutionException.class, () -> Json.arrtrim(client, key, ".", 0, 1).get());

        // Test with non-existing key
        exception =
                assertThrows(
                        ExecutionException.class,
                        () -> Json.arrtrim(client, "non_existing_key", "$", 0, 1).get());

        exception =
                assertThrows(
                        ExecutionException.class,
                        () -> Json.arrtrim(client, "non_existing_key", ".", 0, 1).get());

        // Test with empty array
        assertEquals("OK", Json.set(client, key, "$.empty", "[]").get());
        res = Json.arrtrim(client, key, "$.empty", 0, 1).get();
        assertArrayEquals(new Object[] {0L}, (Object[]) res);
        res = Json.arrtrim(client, key, ".empty", 0, 1).get();
        assertEquals(0L, res);
    }

    @Test
    @SneakyThrows
    public void objlen() {
        String key = UUID.randomUUID().toString();

        String doc = "{\"a\": 1.0, \"b\": {\"a\": {\"x\": 1, \"y\": 2}, \"b\": 2.5, \"c\": true}}";
        assertEquals("OK", Json.set(client, key, "$", doc).get());

        var res = Json.objlen(client, key, "$..").get();
        assertArrayEquals(new Object[] {2L, 3L, 2L}, (Object[]) res);

        res = Json.objlen(client, gs(key), gs("..b")).get();
        assertEquals(3L, res);

        // without path
        res = Json.objlen(client, key).get();
        assertEquals(2L, res);
        res = Json.objlen(client, gs(key)).get();
        assertEquals(2L, res);
    }

    @Test
    @SneakyThrows
    public void json_del() {
        String key = UUID.randomUUID().toString();
        assertEquals(
                OK,
                Json.set(client, key, "$", "{\"a\": 1.0, \"b\": {\"a\": 1, \"b\": 2.5, \"c\": true}}")
                        .get());
        assertEquals(2L, Json.del(client, key, "$..a").get());
        assertEquals("[]", Json.get(client, key, new String[] {"$..a"}).get());
        String expectedGetResult = "{\"b\": {\"b\": 2.5, \"c\": true}}";
        String actualGetResult = Json.get(client, key).get();
        assertEquals(
                JsonParser.parseString(expectedGetResult), JsonParser.parseString(actualGetResult));

        assertEquals(1L, Json.del(client, gs(key), gs("$")).get());
        assertEquals(0L, Json.del(client, key).get());
        assertNull(Json.get(client, key, new String[] {"$"}).get());
    }

    @Test
    @SneakyThrows
    public void objkeys() {
        String key = UUID.randomUUID().toString();

        String doc = "{\"a\": 1.0, \"b\": {\"a\": {\"x\": 1, \"y\": 2}, \"b\": 2.5, \"c\": true}}";
        assertEquals("OK", Json.set(client, key, "$", doc).get());

        var res = Json.objkeys(client, key, "..").get();
        assertArrayEquals(new Object[] {"a", "b"}, res);

        res = Json.objkeys(client, gs(key), gs("$..b")).get();
        assertArrayEquals(new Object[][] {{gs("a"), gs("b"), gs("c")}, {}}, res);

        // without path
        res = Json.objkeys(client, key).get();
        assertArrayEquals(new Object[] {"a", "b"}, res);
        res = Json.objkeys(client, gs(key)).get();
        assertArrayEquals(new Object[] {gs("a"), gs("b")}, res);
    }

    @Test
    @SneakyThrows
    public void mget() {
        String key1 = UUID.randomUUID().toString();
        String key2 = UUID.randomUUID().toString();
        var data =
                Map.of(
                        key1, "{\"a\": 1, \"b\": [\"one\", \"two\"]}",
                        key2, "{\"a\": 1, \"c\": false}");

        for (var entry : data.entrySet()) {
            assertEquals("OK", Json.set(client, entry.getKey(), "$", entry.getValue()).get());
        }

        var res1 =
                Json.mget(client, new String[] {key1, key2, UUID.randomUUID().toString()}, "$.c").get();
        assertArrayEquals(new String[] {"[]", "[false]", null}, res1);

        var res2 = Json.mget(client, new GlideString[] {gs(key1), gs(key2)}, gs(".b[*]")).get();
        assertArrayEquals(new GlideString[] {gs("\"one\""), null}, res2);
    }

    @Test
    @SneakyThrows
    public void json_forget() {
        String key = UUID.randomUUID().toString();
        assertEquals(
                OK,
                Json.set(client, key, "$", "{\"a\": 1.0, \"b\": {\"a\": 1, \"b\": 2.5, \"c\": true}}")
                        .get());
        assertEquals(2L, Json.forget(client, key, "$..a").get());
        assertEquals("[]", Json.get(client, key, new String[] {"$..a"}).get());
        String expectedGetResult = "{\"b\": {\"b\": 2.5, \"c\": true}}";
        String actualGetResult = Json.get(client, key).get();
        assertEquals(
                JsonParser.parseString(expectedGetResult), JsonParser.parseString(actualGetResult));

        assertEquals(1L, Json.forget(client, gs(key), gs("$")).get());
        assertEquals(0L, Json.forget(client, key).get());
        assertNull(Json.get(client, key, new String[] {"$"}).get());
    }

    @Test
    @SneakyThrows
    public void toggle() {
        String key = UUID.randomUUID().toString();
        String key2 = UUID.randomUUID().toString();
        String doc = "{\"bool\": true, \"nested\": {\"bool\": false, \"nested\": {\"bool\": 10}}}";

        assertEquals("OK", Json.set(client, key, "$", doc).get());

        assertArrayEquals(
                new Object[] {false, true, null}, (Object[]) Json.toggle(client, key, "$..bool").get());

        assertEquals(true, Json.toggle(client, gs(key), gs("bool")).get());

        assertArrayEquals(new Object[] {}, (Object[]) Json.toggle(client, key, "$.non_existing").get());
        assertArrayEquals(new Object[] {null}, (Object[]) Json.toggle(client, key, "$.nested").get());

        // testing behaviour with default path
        assertEquals("OK", Json.set(client, key2, ".", "true").get());
        assertEquals(false, Json.toggle(client, key2).get());
        assertEquals(true, Json.toggle(client, gs(key2)).get());

        // expect request errors
        assertThrows(ExecutionException.class, () -> Json.toggle(client, key, "nested").get());
        assertThrows(ExecutionException.class, () -> Json.toggle(client, key, ".non_existing").get());
        assertThrows(
                ExecutionException.class, () -> Json.toggle(client, "non_existing_key", "$").get());
    }

    @Test
    @SneakyThrows
    public void strappend() {
        String key = UUID.randomUUID().toString();
        String jsonValue = "{\"a\": \"foo\", \"nested\": {\"a\": \"hello\"}, \"nested2\": {\"a\": 31}}";
        assertEquals("OK", Json.set(client, key, "$", jsonValue).get());

        assertArrayEquals(
                new Object[] {6L, 8L, null},
                (Object[]) Json.strappend(client, key, "\"bar\"", "$..a").get());
        assertEquals(9L, (Long) Json.strappend(client, key, "\"foo\"", "a").get());

        String jsonStr = Json.get(client, key, new String[] {"."}).get();
        assertEquals(
                "{\"a\":\"foobarfoo\",\"nested\":{\"a\":\"hellobar\"},\"nested2\":{\"a\":31}}", jsonStr);

        assertArrayEquals(
                new Object[] {null}, (Object[]) Json.strappend(client, key, "\"bar\"", "$.nested").get());

        assertThrows(
                ExecutionException.class, () -> Json.strappend(client, key, "\"bar\"", ".nested").get());

        assertThrows(ExecutionException.class, () -> Json.strappend(client, key, "\"bar\"").get());

        assertArrayEquals(
                new Object[] {},
                (Object[]) Json.strappend(client, key, "\"try\"", "$.non_existing_path").get());

        assertThrows(
                ExecutionException.class,
                () -> Json.strappend(client, key, "\"try\"", "non_existing_path").get());

        assertThrows(
                ExecutionException.class,
                () -> Json.strappend(client, "non_existing_key", "\"try\"").get());

        // Binary test
        // Binary with path
        assertEquals(12L, (Long) Json.strappend(client, gs(key), gs("\"foo\""), gs("a")).get());
        jsonStr = Json.get(client, key, new String[] {"."}).get();
        assertEquals(
                "{\"a\":\"foobarfoofoo\",\"nested\":{\"a\":\"hellobar\"},\"nested2\":{\"a\":31}}", jsonStr);

        // Binary no path
        assertEquals("OK", Json.set(client, key, "$", "\"hi\"").get());
        assertEquals(5L, Json.strappend(client, gs(key), gs("\"foo\"")).get());
        jsonStr = Json.get(client, key, new String[] {"."}).get();
        assertEquals("\"hifoo\"", jsonStr);
    }

    @Test
    @SneakyThrows
    public void strlen() {
        String key = UUID.randomUUID().toString();
        String jsonValue = "{\"a\": \"foo\", \"nested\": {\"a\": \"hello\"}, \"nested2\": {\"a\": 31}}";
        assertEquals("OK", Json.set(client, key, "$", jsonValue).get());

        assertArrayEquals(
                new Object[] {3L, 5L, null}, (Object[]) Json.strlen(client, key, "$..a").get());
        assertEquals(3L, (Long) Json.strlen(client, key, "a").get());

        assertArrayEquals(new Object[] {null}, (Object[]) Json.strlen(client, key, "$.nested").get());

        assertThrows(ExecutionException.class, () -> Json.strlen(client, key, "nested").get());

        assertThrows(ExecutionException.class, () -> Json.strlen(client, key).get());

        assertArrayEquals(
                new Object[] {}, (Object[]) Json.strlen(client, key, "$.non_existing_path").get());
        assertThrows(
                ExecutionException.class, () -> Json.strlen(client, key, ".non_existing_path").get());

        assertNull(Json.strlen(client, "non_existing_key", ".").get());
        assertNull(Json.strlen(client, "non_existing_key", "$").get());

        // Binary test
        // Binary with path
        assertEquals(3L, (Long) Json.strlen(client, gs(key), gs("a")).get());

        // Binary no path
        assertEquals("OK", Json.set(client, key, "$", "\"hi\"").get());
        assertEquals(2L, Json.strlen(client, gs(key)).get());
    }

    @Test
    @SneakyThrows
    public void json_resp() {
        String key = UUID.randomUUID().toString();
        String jsonValue =
                "{\"obj\":{\"a\":1, \"b\":2}, \"arr\":[1,2,3], \"str\": \"foo\", \"bool\": true, \"int\":"
                        + " 42, \"float\": 3.14, \"nullVal\": null}";
        assertEquals(OK, Json.set(client, key, "$", jsonValue).get());

        Object actualResult1 = Json.resp(client, key, "$.*").get();
        Object[] expectedResult1 =
                new Object[] {
                    new Object[] {
                        "{",
                        new Object[] {"a", 1L},
                        new Object[] {"b", 2L} // leading "{" indicates JSON objects
                    },
                    new Object[] {"[", 1L, 2L, 3L}, // leading "[" indicates JSON arrays
                    "foo",
                    "true",
                    42L,
                    "3.14",
                    null
                };
        assertInstanceOf(Object[].class, actualResult1);
        assertArrayEquals(expectedResult1, (Object[]) actualResult1);

        // multiple path match, the first will be returned
        Object actualResult2 = Json.resp(client, key, "*").get();
        Object[] expectedResult2 = new Object[] {"{", new Object[] {"a", 1L}, new Object[] {"b", 2L}};
        assertInstanceOf(Object[].class, actualResult2);
        assertArrayEquals(expectedResult2, (Object[]) actualResult2);

        Object actualResult3 = Json.resp(client, key, "$").get();
        Object[] expectedResult3 =
                new Object[] {
                    new Object[] {
                        "{",
                        new Object[] {
                            "obj", new Object[] {"{", new Object[] {"a", 1L}, new Object[] {"b", 2L}}
                        },
                        new Object[] {"arr", new Object[] {"[", 1L, 2L, 3L}},
                        new Object[] {"str", "foo"},
                        new Object[] {"bool", "true"},
                        new Object[] {"int", 42L},
                        new Object[] {"float", "3.14"},
                        new Object[] {"nullVal", null}
                    }
                };
        assertInstanceOf(Object[].class, actualResult3);
        assertArrayEquals(expectedResult3, (Object[]) actualResult3);

        Object actualResult4 = Json.resp(client, key, ".").get();
        Object[] expectedResult4 =
                new Object[] {
                    "{",
                    new Object[] {"obj", new Object[] {"{", new Object[] {"a", 1L}, new Object[] {"b", 2L}}},
                    new Object[] {"arr", new Object[] {"[", 1L, 2L, 3L}},
                    new Object[] {"str", "foo"},
                    new Object[] {"bool", "true"},
                    new Object[] {"int", 42L},
                    new Object[] {"float", "3.14"},
                    new Object[] {"nullVal", null}
                };
        assertInstanceOf(Object[].class, actualResult4);
        assertArrayEquals(expectedResult4, (Object[]) actualResult4);
        // resp without path defaults to the same behavior of passing "." as path
        Object actualResult4WithoutPath = Json.resp(client, key).get();
        assertArrayEquals(expectedResult4, (Object[]) actualResult4WithoutPath);
        assertArrayEquals(expectedResult4, (Object[]) actualResult4WithoutPath);

        Object actualResult5 = Json.resp(client, gs(key), gs("$.str")).get();
        Object[] expectedResult5 = new Object[] {gs("foo")};
        assertInstanceOf(Object[].class, actualResult5);
        assertArrayEquals(expectedResult5, (Object[]) actualResult5);

        Object actualResult6 = Json.resp(client, key, ".str").get();
        String expectedResult6 = "foo";
        assertEquals(expectedResult6, actualResult6);

        assertArrayEquals(new Object[] {}, (Object[]) Json.resp(client, key, "$.nonexistent").get());

        assertThrows(ExecutionException.class, () -> Json.resp(client, key, "nonexistent").get());

        assertNull(Json.resp(client, "nonexistent_key", "$").get());
        assertNull(Json.resp(client, "nonexistent_key", ".").get());
        assertNull(Json.resp(client, "nonexistent_key").get());
    }

    @Test
    @SneakyThrows
    public void json_type() {
        String key = UUID.randomUUID().toString();
        String jsonValue =
                "{\"key1\": \"value1\", \"key2\": 2, \"key3\": [1, 2, 3], \"key4\": {\"nested_key\":"
                        + " {\"key1\": [4, 5]}}, \"key5\": null, \"key6\": true, \"dec_key\": 2.3}";
        assertEquals(OK, Json.set(client, key, "$", jsonValue).get());

        assertArrayEquals(new Object[] {"object"}, (Object[]) Json.type(client, key, "$").get());
        assertArrayEquals(
                new Object[] {gs("string"), gs("array")},
                (Object[]) Json.type(client, gs(key), gs("$..key1")).get());
        assertArrayEquals(new Object[] {"integer"}, (Object[]) Json.type(client, key, "$.key2").get());
        assertArrayEquals(new Object[] {"array"}, (Object[]) Json.type(client, key, "$.key3").get());
        assertArrayEquals(new Object[] {"object"}, (Object[]) Json.type(client, key, "$.key4").get());
        assertArrayEquals(
                new Object[] {"object"}, (Object[]) Json.type(client, key, "$.key4.nested_key").get());
        assertArrayEquals(new Object[] {"null"}, (Object[]) Json.type(client, key, "$.key5").get());
        assertArrayEquals(new Object[] {"boolean"}, (Object[]) Json.type(client, key, "$.key6").get());
        // Check for non-existent path in enhanced mode $.key7
        assertArrayEquals(new Object[] {}, (Object[]) Json.type(client, key, "$.key7").get());
        // Check for non-existent path within an existing key (array bound)
        assertArrayEquals(new Object[] {}, (Object[]) Json.type(client, key, "$.key3[3]").get());
        // Legacy path (without $) - will return None for non-existing path
        assertNull(Json.type(client, key, "key7").get());
        // Check for multiple path match in legacy
        assertEquals("string", Json.type(client, key, "..key1").get());
        // Check for non-existent key with enhanced path
        assertNull(Json.type(client, "non_existing_key", "$.key1").get());
        // Check for non-existent key with legacy path
        assertNull(Json.type(client, "non_existing_key", "key1").get());
        // Check for all types in the JSON document using JSON Path
        Object[] actualResult = (Object[]) Json.type(client, key, "$[*]").get();
        Object[] expectedResult =
                new Object[] {"string", "integer", "array", "object", "null", "boolean", "number"};
        assertArrayEquals(expectedResult, actualResult);
        // Check for all types in the JSON document using legacy path
        assertEquals("string", Json.type(client, key, "[*]").get());
    }

    @SneakyThrows
    @Test
    public void transaction_tests() {

        ClusterTransaction transaction = new ClusterTransaction();
        ArrayList<Object> expectedResult = new ArrayList<>();

        String key1 = "{key}-1" + UUID.randomUUID();
        String key2 = "{key}-2" + UUID.randomUUID();
        String key3 = "{key}-3" + UUID.randomUUID();
        String key4 = "{key}-4" + UUID.randomUUID();
        String key5 = "{key}-5" + UUID.randomUUID();
        String key6 = "{key}-6" + UUID.randomUUID();

        MultiJson.set(transaction, key1, "$", "{\"a\": \"one\", \"b\": [\"one\", \"two\"]}");
        expectedResult.add(OK);

        MultiJson.set(
                transaction,
                key1,
                "$",
                "{\"a\": \"one\", \"b\": [\"one\", \"two\"]}",
                ConditionalChange.ONLY_IF_DOES_NOT_EXIST);
        expectedResult.add(null);

        MultiJson.get(transaction, key1);
        expectedResult.add("{\"a\":\"one\",\"b\":[\"one\",\"two\"]}");

        MultiJson.get(transaction, key1, new String[] {"$.a", "$.b"});
        expectedResult.add("{\"$.a\":[\"one\"],\"$.b\":[[\"one\",\"two\"]]}");

        MultiJson.get(transaction, key1, JsonGetOptions.builder().space(" ").build());
        expectedResult.add("{\"a\": \"one\",\"b\": [\"one\",\"two\"]}");

        MultiJson.get(
                transaction,
                key1,
                new String[] {"$.a", "$.b"},
                JsonGetOptions.builder().space(" ").build());
        expectedResult.add("{\"$.a\": [\"one\"],\"$.b\": [[\"one\",\"two\"]]}");

        MultiJson.arrappend(
                transaction, key1, "$.b", new String[] {"\"3\"", "\"4\"", "\"5\"", "\"6\""});
        expectedResult.add(new Object[] {6L});

        MultiJson.arrindex(transaction, key1, "$..b", "\"one\"");
        expectedResult.add(new Object[] {0L});

        MultiJson.arrindex(transaction, key1, "$..b", "\"one\"", new JsonArrindexOptions(0L));
        expectedResult.add(new Object[] {0L});

        MultiJson.arrinsert(transaction, key1, "$..b", 4, new String[] {"\"7\""});
        expectedResult.add(new Object[] {7L});

        MultiJson.arrlen(transaction, key1, "$..b");
        expectedResult.add(new Object[] {7L});

        MultiJson.arrpop(transaction, key1, "$..b", 6L);
        expectedResult.add(new Object[] {"\"6\""});

        MultiJson.arrpop(transaction, key1, "$..b");
        expectedResult.add(new Object[] {"\"5\""});

        MultiJson.arrtrim(transaction, key1, "$..b", 2, 3);
        expectedResult.add(new Object[] {2L});

        MultiJson.objlen(transaction, key1);
        expectedResult.add(2L);

        MultiJson.objlen(transaction, key1, "$..b");
        expectedResult.add(new Object[] {null});

        MultiJson.objkeys(transaction, key1, "..");
        expectedResult.add(new Object[] {"a", "b"});

        MultiJson.objkeys(transaction, key1);
        expectedResult.add(new Object[] {"a", "b"});

        MultiJson.del(transaction, key1);
        expectedResult.add(1L);

        MultiJson.set(
                transaction,
                key1,
                "$",
                "{\"c\": [1, 2], \"d\": true, \"e\": [\"hello\", \"clouds\"], \"f\": {\"a\": \"hello\"}}");
        expectedResult.add(OK);

        MultiJson.del(transaction, key1, "$");
        expectedResult.add(1L);

        MultiJson.set(
                transaction,
                key1,
                "$",
                "{\"c\": [1, 2], \"d\": true, \"e\": [\"hello\", \"clouds\"], \"f\": {\"a\": \"hello\"}}");
        expectedResult.add(OK);

        MultiJson.numincrby(transaction, key1, "$.c[*]", 10.0);
        expectedResult.add("[11,12]");

        MultiJson.nummultby(transaction, key1, "$.c[*]", 10.0);
        expectedResult.add("[110,120]");

        MultiJson.strappend(transaction, key1, "\"bar\"", "$..a");
        expectedResult.add(new Object[] {8L});

        MultiJson.strlen(transaction, key1, "$..a");
        expectedResult.add(new Object[] {8L});

        MultiJson.type(transaction, key1, "$..a");
        expectedResult.add(new Object[] {"string"});

        MultiJson.toggle(transaction, key1, "..d");
        expectedResult.add(false);

        MultiJson.resp(transaction, key1, "$..a");
        expectedResult.add(new Object[] {"hellobar"});

        MultiJson.del(transaction, key1, "$..a");
        expectedResult.add(1L);

        // then delete the entire key
        MultiJson.del(transaction, key1, "$");
        expectedResult.add(1L);

        // 2nd key
        MultiJson.set(transaction, key2, "$", "[1, 2, true, null, \"tree\", \"tree2\" ]");
        expectedResult.add(OK);

        MultiJson.arrlen(transaction, key2);
        expectedResult.add(6L);

        MultiJson.arrpop(transaction, key2);
        expectedResult.add("\"tree2\"");

        MultiJson.debugFields(transaction, key2);
        expectedResult.add(5L);

        MultiJson.debugFields(transaction, key2, "$");
        expectedResult.add(new Object[] {5L});

        // 3rd key
        MultiJson.set(transaction, key3, "$", "\"abc\"");
        expectedResult.add(OK);

        MultiJson.strappend(transaction, key3, "\"bar\"");
        expectedResult.add(6L);

        MultiJson.strlen(transaction, key3);
        expectedResult.add(6L);

        MultiJson.type(transaction, key3);
        expectedResult.add("string");

        MultiJson.resp(transaction, key3);
        expectedResult.add("abcbar");

        // 4th key
        MultiJson.set(transaction, key4, "$", "true");
        expectedResult.add(OK);

        MultiJson.toggle(transaction, key4);
        expectedResult.add(false);

        MultiJson.debugMemory(transaction, key4);
        expectedResult.add(24L);

        MultiJson.debugMemory(transaction, key4, "$");
        expectedResult.add(new Object[] {16L});

        MultiJson.clear(transaction, key2, "$.a");
        expectedResult.add(0L);

        MultiJson.clear(transaction, key2);
        expectedResult.add(1L);

        MultiJson.forget(transaction, key3);
        expectedResult.add(1L);

        MultiJson.forget(transaction, key4, "$");
        expectedResult.add(1L);

        // mget, key5 and key6
        MultiJson.set(transaction, key5, "$", "{\"a\": 1, \"b\": [\"one\", \"two\"]}");
        expectedResult.add(OK);

        MultiJson.set(transaction, key6, "$", "{\"a\": 1, \"c\": false}");
        expectedResult.add(OK);

        MultiJson.mget(transaction, new String[] {key5, key6}, "$.c");
        expectedResult.add(new String[] {"[]", "[false]"});

        Object[] results = client.exec(transaction).get();
        assertDeepEquals(expectedResult.toArray(), results);
    }
}
