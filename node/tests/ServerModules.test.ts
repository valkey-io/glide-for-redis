/**
 * Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0
 */
import {
    afterAll,
    afterEach,
    beforeAll,
    describe,
    expect,
    it,
} from "@jest/globals";
import { v4 as uuidv4 } from "uuid";
import {
    ClusterTransaction,
    ConditionalChange,
    convertGlideRecordToRecord,
    Decoder,
    FtAggregateOptions,
    FtAggregateReturnType,
    FtSearchOptions,
    FtSearchReturnType,
    GlideClusterClient,
    GlideFt,
    GlideJson,
    GlideRecord,
    GlideString,
    InfoOptions,
    JsonGetOptions,
    ProtocolVersion,
    RequestError,
    SortOrder,
    VectorField,
} from "..";
import { ValkeyCluster } from "../../utils/TestUtils";
import {
    flushAndCloseClient,
    getClientConfigurationOption,
    getServerVersion,
    parseEndpoints,
    transactionMultiJson,
    transactionMultiJsonForArrCommands,
    validateTransactionResponse,
} from "./TestUtilities";

const TIMEOUT = 50000;
/** Waiting interval to let server process the data before querying */
const DATA_PROCESSING_TIMEOUT = 1000;

describe("Server Module Tests", () => {
    let cluster: ValkeyCluster;

    beforeAll(async () => {
        const clusterAddresses = global.CLUSTER_ENDPOINTS;
        cluster = await ValkeyCluster.initFromExistingCluster(
            true,
            parseEndpoints(clusterAddresses),
            getServerVersion,
        );
    }, 40000);

    afterAll(async () => {
        await cluster.close();
    }, TIMEOUT);

    describe.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        "GlideJson",
        (protocol) => {
            let client: GlideClusterClient;

            afterEach(async () => {
                await flushAndCloseClient(true, cluster.getAddresses(), client);
            });

            it("check modules loaded", async () => {
                client = await GlideClusterClient.createClient(
                    getClientConfigurationOption(
                        cluster.getAddresses(),
                        protocol,
                    ),
                );
                const info = await client.info({
                    sections: [InfoOptions.Modules],
                    route: "randomNode",
                });
                expect(info).toContain("# json_core_metrics");
                expect(info).toContain("# search_index_stats");
            });

            it("json.set and json.get tests", async () => {
                client = await GlideClusterClient.createClient(
                    getClientConfigurationOption(
                        cluster.getAddresses(),
                        protocol,
                    ),
                );
                const key = uuidv4();
                const jsonValue = { a: 1.0, b: 2 };

                // JSON.set
                expect(
                    await GlideJson.set(
                        client,
                        key,
                        "$",
                        JSON.stringify(jsonValue),
                    ),
                ).toBe("OK");

                // JSON.get
                let result = await GlideJson.get(client, key, { path: "." });
                expect(JSON.parse(result.toString())).toEqual(jsonValue);

                // binary buffer test
                result = await GlideJson.get(client, Buffer.from(key), {
                    path: Buffer.from("."),
                    decoder: Decoder.Bytes,
                });
                expect(result).toEqual(Buffer.from(JSON.stringify(jsonValue)));

                expect(
                    await GlideJson.set(
                        client,
                        Buffer.from(key),
                        Buffer.from("$"),
                        Buffer.from(JSON.stringify({ a: 1.0, b: 3 })),
                    ),
                ).toBe("OK");

                // JSON.get with array of paths
                result = await GlideJson.get(client, key, {
                    path: ["$.a", "$.b"],
                });
                expect(JSON.parse(result.toString())).toEqual({
                    "$.a": [1.0],
                    "$.b": [3],
                });

                // JSON.get with non-existing key
                expect(
                    await GlideJson.get(client, "non_existing_key", {
                        path: ["$"],
                    }),
                );

                // JSON.get with non-existing path
                result = await GlideJson.get(client, key, { path: "$.d" });
                expect(result).toEqual("[]");
            });

            it("json.set and json.get tests with multiple value", async () => {
                client = await GlideClusterClient.createClient(
                    getClientConfigurationOption(
                        cluster.getAddresses(),
                        protocol,
                    ),
                );
                const key = uuidv4();

                // JSON.set with complex object
                expect(
                    await GlideJson.set(
                        client,
                        key,
                        "$",
                        JSON.stringify({
                            a: { c: 1, d: 4 },
                            b: { c: 2 },
                            c: true,
                        }),
                    ),
                ).toBe("OK");

                // JSON.get with deep path
                let result = await GlideJson.get(client, key, {
                    path: "$..c",
                });
                expect(JSON.parse(result.toString())).toEqual([true, 1, 2]);

                // JSON.set with deep path
                expect(
                    await GlideJson.set(client, key, "$..c", '"new_value"'),
                ).toBe("OK");

                // verify JSON.set result
                result = await GlideJson.get(client, key, { path: "$..c" });
                expect(JSON.parse(result.toString())).toEqual([
                    "new_value",
                    "new_value",
                    "new_value",
                ]);
            });

            it("json.set conditional set", async () => {
                client = await GlideClusterClient.createClient(
                    getClientConfigurationOption(
                        cluster.getAddresses(),
                        protocol,
                    ),
                );
                const key = uuidv4();
                const value = JSON.stringify({ a: 1.0, b: 2 });

                expect(
                    await GlideJson.set(client, key, "$", value, {
                        conditionalChange: ConditionalChange.ONLY_IF_EXISTS,
                    }),
                ).toBeNull();

                expect(
                    await GlideJson.set(client, key, "$", value, {
                        conditionalChange:
                            ConditionalChange.ONLY_IF_DOES_NOT_EXIST,
                    }),
                ).toBe("OK");

                expect(
                    await GlideJson.set(client, key, "$.a", "4.5", {
                        conditionalChange:
                            ConditionalChange.ONLY_IF_DOES_NOT_EXIST,
                    }),
                ).toBeNull();
                let result = await GlideJson.get(client, key, {
                    path: ".a",
                });
                expect(result).toEqual("1");

                expect(
                    await GlideJson.set(client, key, "$.a", "4.5", {
                        conditionalChange: ConditionalChange.ONLY_IF_EXISTS,
                    }),
                ).toBe("OK");
                result = await GlideJson.get(client, key, { path: ".a" });
                expect(result).toEqual("4.5");
            });

            it("json.get formatting", async () => {
                client = await GlideClusterClient.createClient(
                    getClientConfigurationOption(
                        cluster.getAddresses(),
                        protocol,
                    ),
                );
                const key = uuidv4();
                // Set initial JSON value
                expect(
                    await GlideJson.set(
                        client,
                        key,
                        "$",
                        JSON.stringify({ a: 1.0, b: 2, c: { d: 3, e: 4 } }),
                    ),
                ).toBe("OK");
                // JSON.get with formatting options
                let result = await GlideJson.get(client, key, {
                    path: "$",
                    indent: "  ",
                    newline: "\n",
                    space: " ",
                } as JsonGetOptions);

                const expectedResult1 =
                    '[\n  {\n    "a": 1,\n    "b": 2,\n    "c": {\n      "d": 3,\n      "e": 4\n    }\n  }\n]';
                expect(result).toEqual(expectedResult1);
                // JSON.get with different formatting options
                result = await GlideJson.get(client, key, {
                    path: "$",
                    indent: "~",
                    newline: "\n",
                    space: "*",
                } as JsonGetOptions);

                const expectedResult2 =
                    '[\n~{\n~~"a":*1,\n~~"b":*2,\n~~"c":*{\n~~~"d":*3,\n~~~"e":*4\n~~}\n~}\n]';
                expect(result).toEqual(expectedResult2);

                // binary buffer test
                const result3 = await GlideJson.get(client, Buffer.from(key), {
                    path: Buffer.from("$"),
                    indent: Buffer.from("~"),
                    newline: Buffer.from("\n"),
                    space: Buffer.from("*"),
                } as JsonGetOptions);
                expect(result3).toEqual(expectedResult2);
            });

            it("json.mget", async () => {
                client = await GlideClusterClient.createClient(
                    getClientConfigurationOption(
                        cluster.getAddresses(),
                        protocol,
                    ),
                );
                const key1 = uuidv4();
                const key2 = uuidv4();
                const data = {
                    [key1]: '{"a": 1, "b": ["one", "two"]}',
                    [key2]: '{"a": 1, "c": false}',
                };

                for (const key of Object.keys(data)) {
                    await GlideJson.set(client, key, ".", data[key]);
                }

                expect(
                    await GlideJson.mget(
                        client,
                        [key1, key2, uuidv4()],
                        Buffer.from("$.c"),
                    ),
                ).toEqual(["[]", "[false]", null]);
                expect(
                    await GlideJson.mget(
                        client,
                        [Buffer.from(key1), key2],
                        ".b[*]",
                        { decoder: Decoder.Bytes },
                    ),
                ).toEqual([Buffer.from('"one"'), null]);
            });

            it("json.arrinsert", async () => {
                client = await GlideClusterClient.createClient(
                    getClientConfigurationOption(
                        cluster.getAddresses(),
                        protocol,
                    ),
                );

                const key = uuidv4();
                const doc = {
                    a: [],
                    b: { a: [1, 2, 3, 4] },
                    c: { a: "not an array" },
                    d: [{ a: ["x", "y"] }, { a: [["foo"]] }],
                    e: [{ a: 42 }, { a: {} }],
                    f: { a: [true, false, null] },
                };
                expect(
                    await GlideJson.set(client, key, "$", JSON.stringify(doc)),
                ).toBe("OK");

                const result = await GlideJson.arrinsert(
                    client,
                    key,
                    "$..a",
                    0,
                    [
                        '"string_value"',
                        "123",
                        '{"key": "value"}',
                        "true",
                        "null",
                        '["bar"]',
                    ],
                );
                expect(result).toEqual([6, 10, null, 8, 7, null, null, 9]);

                const expected = {
                    a: [
                        "string_value",
                        123,
                        { key: "value" },
                        true,
                        null,
                        ["bar"],
                    ],
                    b: {
                        a: [
                            "string_value",
                            123,
                            { key: "value" },
                            true,
                            null,
                            ["bar"],
                            1,
                            2,
                            3,
                            4,
                        ],
                    },
                    c: { a: "not an array" },
                    d: [
                        {
                            a: [
                                "string_value",
                                123,
                                { key: "value" },
                                true,
                                null,
                                ["bar"],
                                "x",
                                "y",
                            ],
                        },
                        {
                            a: [
                                "string_value",
                                123,
                                { key: "value" },
                                true,
                                null,
                                ["bar"],
                                ["foo"],
                            ],
                        },
                    ],
                    e: [{ a: 42 }, { a: {} }],
                    f: {
                        a: [
                            "string_value",
                            123,
                            { key: "value" },
                            true,
                            null,
                            ["bar"],
                            true,
                            false,
                            null,
                        ],
                    },
                };
                expect(
                    JSON.parse((await GlideJson.get(client, key)) as string),
                ).toEqual(expected);

                // Binary buffer test
                expect(
                    JSON.parse(
                        (await GlideJson.get(
                            client,
                            Buffer.from(key),
                        )) as string,
                    ),
                ).toEqual(expected);
            });

            it("json.arrpop", async () => {
                client = await GlideClusterClient.createClient(
                    getClientConfigurationOption(
                        cluster.getAddresses(),
                        protocol,
                    ),
                );

                const key = uuidv4();
                let doc =
                    '{"a": [1, 2, true], "b": {"a": [3, 4, ["value", 3, false], 5], "c": {"a": 42}}}';
                expect(await GlideJson.set(client, key, "$", doc)).toBe("OK");

                let res = await GlideJson.arrpop(client, key, {
                    path: "$.a",
                    index: 1,
                });
                expect(res).toEqual(["2"]);

                res = await GlideJson.arrpop(client, Buffer.from(key), {
                    path: "$..a",
                });
                expect(res).toEqual(["true", "5", null]);

                res = await GlideJson.arrpop(client, key, {
                    path: "..a",
                    decoder: Decoder.Bytes,
                });
                expect(res).toEqual(Buffer.from("1"));

                // Even if only one array element was returned, ensure second array at `..a` was popped
                doc = (await GlideJson.get(client, key, {
                    path: ["$..a"],
                })) as string;
                expect(doc).toEqual("[[],[3,4],42]");

                // Out of index
                res = await GlideJson.arrpop(client, key, {
                    path: Buffer.from("$..a"),
                    index: 10,
                });
                expect(res).toEqual([null, "4", null]);

                // pop without options
                expect(await GlideJson.set(client, key, "$", doc)).toEqual(
                    "OK",
                );
                expect(await GlideJson.arrpop(client, key)).toEqual("42");

                // Binary buffer test
                expect(
                    await GlideJson.arrpop(client, Buffer.from(key)),
                ).toEqual("[3,4]");
            });

            it("json.arrlen", async () => {
                client = await GlideClusterClient.createClient(
                    getClientConfigurationOption(
                        cluster.getAddresses(),
                        protocol,
                    ),
                );

                const key = uuidv4();
                const doc =
                    '{"a": [1, 2, 3], "b": {"a": [1, 2], "c": {"a": 42}}}';
                expect(await GlideJson.set(client, key, "$", doc)).toBe("OK");

                expect(
                    await GlideJson.arrlen(client, key, { path: "$.a" }),
                ).toEqual([3]);
                expect(
                    await GlideJson.arrlen(client, key, { path: "$..a" }),
                ).toEqual([3, 2, null]);
                // Legacy path retrieves the first array match at ..a
                expect(
                    await GlideJson.arrlen(client, key, { path: "..a" }),
                ).toEqual(3);
                // Value at path is not an array
                expect(
                    await GlideJson.arrlen(client, key, { path: "$" }),
                ).toEqual([null]);

                await expect(
                    GlideJson.arrlen(client, key, { path: "." }),
                ).rejects.toThrow();

                expect(
                    await GlideJson.set(client, key, "$", "[1, 2, 3, 4]"),
                ).toBe("OK");
                expect(await GlideJson.arrlen(client, key)).toEqual(4);

                // Binary buffer test
                expect(
                    await GlideJson.arrlen(client, Buffer.from(key)),
                ).toEqual(4);
            });

            it("json.arrindex", async () => {
                client = await GlideClusterClient.createClient(
                    getClientConfigurationOption(
                        cluster.getAddresses(),
                        protocol,
                    ),
                );

                const key1 = uuidv4();
                const key2 = uuidv4();
                const doc1 =
                    '{"a": [1, 3, true, "hello"], "b": {"a": [3, 4, [3, false], 5], "c": {"a": 42}}}';

                expect(await GlideJson.set(client, key1, "$", doc1)).toBe("OK");

                // Verify scalar type
                expect(
                    await GlideJson.arrindex(client, key1, "$..a", true),
                ).toEqual([2, -1, null]);
                expect(
                    await GlideJson.arrindex(client, key1, "..a", true),
                ).toEqual(2);

                expect(
                    await GlideJson.arrindex(client, key1, "$..a", 3),
                ).toEqual([1, 0, null]);
                expect(
                    await GlideJson.arrindex(client, key1, "..a", 3),
                ).toEqual(1);

                expect(
                    await GlideJson.arrindex(client, key1, "$..a", '"hello"'),
                ).toEqual([3, -1, null]);
                expect(
                    await GlideJson.arrindex(client, key1, "..a", '"hello"'),
                ).toEqual(3);

                expect(
                    await GlideJson.arrindex(client, key1, "$..a", null),
                ).toEqual([-1, -1, null]);
                expect(
                    await GlideJson.arrindex(client, key1, "..a", null),
                ).toEqual(-1);

                // Value at the path is not an array
                expect(
                    await GlideJson.arrindex(client, key1, "$..c", 42),
                ).toEqual([null]);
                await expect(
                    GlideJson.arrindex(client, key1, "..c", 42),
                ).rejects.toThrow(RequestError);

                const doc2 =
                    '{"a": [1, 3, true, "foo", "meow", "m", "foo", "lol", false],' +
                    ' "b": {"a": [3, 4, ["value", 3, false], 5], "c": {"a": 42}}}';

                expect(await GlideJson.set(client, key2, "$", doc2)).toBe("OK");

                // Verify optional `start` and `end`
                expect(
                    await GlideJson.arrindex(client, key2, "$..a", '"foo"', {
                        start: 6,
                        end: 8,
                    }),
                ).toEqual([6, -1, null]);
                expect(
                    await GlideJson.arrindex(client, key2, "$..a", '"foo"', {
                        start: 2,
                        end: 8,
                    }),
                ).toEqual([3, -1, null]);
                expect(
                    await GlideJson.arrindex(client, key2, "..a", '"meow"', {
                        start: 2,
                        end: 8,
                    }),
                ).toEqual(4);

                // Verify without optional `end`
                expect(
                    await GlideJson.arrindex(client, key2, "$..a", '"foo"', {
                        start: 6,
                    }),
                ).toEqual([6, -1, null]);
                expect(
                    await GlideJson.arrindex(client, key2, "..a", '"foo"', {
                        start: 6,
                    }),
                ).toEqual(6);

                // Verify optional `end` with 0 or -1 (means the last element is included)
                expect(
                    await GlideJson.arrindex(client, key2, "$..a", '"foo"', {
                        start: 6,
                        end: 0,
                    }),
                ).toEqual([6, -1, null]);
                expect(
                    await GlideJson.arrindex(client, key2, "..a", '"foo"', {
                        start: 6,
                        end: 0,
                    }),
                ).toEqual(6);
                expect(
                    await GlideJson.arrindex(client, key2, "$..a", '"foo"', {
                        start: 6,
                        end: -1,
                    }),
                ).toEqual([6, -1, null]);
                expect(
                    await GlideJson.arrindex(client, key2, "..a", '"foo"', {
                        start: 6,
                        end: -1,
                    }),
                ).toEqual(6);

                // Test with binary input
                expect(
                    await GlideJson.arrindex(
                        client,
                        Buffer.from(key2),
                        Buffer.from("$..a"),
                        Buffer.from('"foo"'),
                        {
                            start: 6,
                            end: -1,
                        },
                    ),
                ).toEqual([6, -1, null]);
                expect(
                    await GlideJson.arrindex(
                        client,
                        Buffer.from(key2),
                        Buffer.from("..a"),
                        Buffer.from('"foo"'),
                        {
                            start: 6,
                            end: -1,
                        },
                    ),
                ).toEqual(6);

                // Test with non-existent path
                expect(
                    await GlideJson.arrindex(
                        client,
                        key2,
                        "$.nonexistent",
                        true,
                    ),
                ).toEqual([]);
                await expect(
                    GlideJson.arrindex(client, key2, "nonexistent", true),
                ).rejects.toThrow(RequestError);

                // Test with non-existent key
                await expect(
                    GlideJson.arrindex(client, "non_existing_key", "$", true),
                ).rejects.toThrow(RequestError);
                await expect(
                    GlideJson.arrindex(client, "non_existing_key", ".", true),
                ).rejects.toThrow(RequestError);
            });

            it("json.toggle tests", async () => {
                client = await GlideClusterClient.createClient(
                    getClientConfigurationOption(
                        cluster.getAddresses(),
                        protocol,
                    ),
                );
                const key = uuidv4();
                const key2 = uuidv4();
                const jsonValue = {
                    bool: true,
                    nested: { bool: false, nested: { bool: 10 } },
                };
                expect(
                    await GlideJson.set(
                        client,
                        key,
                        "$",
                        JSON.stringify(jsonValue),
                    ),
                ).toBe("OK");
                expect(
                    await GlideJson.toggle(client, key, { path: "$..bool" }),
                ).toEqual([false, true, null]);
                expect(
                    await GlideJson.toggle(client, key, { path: "bool" }),
                ).toBe(true);
                expect(
                    await GlideJson.toggle(client, key, {
                        path: "$.non_existing",
                    }),
                ).toEqual([]);
                expect(
                    await GlideJson.toggle(client, key, { path: "$.nested" }),
                ).toEqual([null]);

                // testing behavior with default pathing
                expect(await GlideJson.set(client, key2, ".", "true")).toBe(
                    "OK",
                );
                expect(await GlideJson.toggle(client, key2)).toBe(false);
                expect(await GlideJson.toggle(client, key2)).toBe(true);

                // expect request errors
                await expect(
                    GlideJson.toggle(client, key, { path: "nested" }),
                ).rejects.toThrow(RequestError);
                await expect(
                    GlideJson.toggle(client, key, { path: ".non_existing" }),
                ).rejects.toThrow(RequestError);
                await expect(
                    GlideJson.toggle(client, "non_existing_key", { path: "$" }),
                ).rejects.toThrow(RequestError);

                // Binary buffer test
                expect(await GlideJson.toggle(client, Buffer.from(key2))).toBe(
                    false,
                );
            });

            it("json.del tests", async () => {
                client = await GlideClusterClient.createClient(
                    getClientConfigurationOption(
                        cluster.getAddresses(),
                        protocol,
                    ),
                );
                const key = uuidv4();
                const jsonValue = { a: 1.0, b: { a: 1, b: 2.5, c: true } };
                // setup
                expect(
                    await GlideJson.set(
                        client,
                        key,
                        "$",
                        JSON.stringify(jsonValue),
                    ),
                ).toBe("OK");

                // non-existing paths
                expect(
                    await GlideJson.del(client, key, { path: "$..path" }),
                ).toBe(0);
                expect(
                    await GlideJson.del(client, key, { path: "..path" }),
                ).toBe(0);

                // deleting existing path
                expect(await GlideJson.del(client, key, { path: "$..a" })).toBe(
                    2,
                );
                expect(await GlideJson.get(client, key, { path: "$..a" })).toBe(
                    "[]",
                );
                expect(
                    await GlideJson.set(
                        client,
                        key,
                        "$",
                        JSON.stringify(jsonValue),
                    ),
                ).toBe("OK");
                expect(await GlideJson.del(client, key, { path: "..a" })).toBe(
                    2,
                );
                await expect(
                    GlideJson.get(client, key, { path: "..a" }),
                ).rejects.toThrow(RequestError);

                // verify result
                const result = await GlideJson.get(client, key, {
                    path: "$",
                });
                expect(JSON.parse(result as string)).toEqual([
                    { b: { b: 2.5, c: true } },
                ]);

                // test root deletion operations
                expect(await GlideJson.del(client, key, { path: "$" })).toBe(1);

                // reset and test dot deletion
                expect(
                    await GlideJson.set(
                        client,
                        key,
                        "$",
                        JSON.stringify(jsonValue),
                    ),
                ).toBe("OK");
                expect(await GlideJson.del(client, key, { path: "." })).toBe(1);

                // reset and test key deletion
                expect(
                    await GlideJson.set(
                        client,
                        key,
                        "$",
                        JSON.stringify(jsonValue),
                    ),
                ).toBe("OK");
                expect(await GlideJson.del(client, key)).toBe(1);
                expect(await GlideJson.del(client, key)).toBe(0);
                expect(
                    await GlideJson.get(client, key, { path: "$" }),
                ).toBeNull();

                // Binary buffer test
                expect(await GlideJson.del(client, Buffer.from(key))).toBe(0);

                // non-existing keys
                expect(
                    await GlideJson.del(client, "non_existing_key", {
                        path: "$",
                    }),
                ).toBe(0);
                expect(
                    await GlideJson.del(client, "non_existing_key", {
                        path: ".",
                    }),
                ).toBe(0);
            });

            it("json.forget tests", async () => {
                client = await GlideClusterClient.createClient(
                    getClientConfigurationOption(
                        cluster.getAddresses(),
                        protocol,
                    ),
                );
                const key = uuidv4();
                const jsonValue = { a: 1.0, b: { a: 1, b: 2.5, c: true } };
                // setup
                expect(
                    await GlideJson.set(
                        client,
                        key,
                        "$",
                        JSON.stringify(jsonValue),
                    ),
                ).toBe("OK");

                // non-existing paths
                expect(
                    await GlideJson.forget(client, key, { path: "$..path" }),
                ).toBe(0);
                expect(
                    await GlideJson.forget(client, key, { path: "..path" }),
                ).toBe(0);

                // deleting existing paths
                expect(
                    await GlideJson.forget(client, key, { path: "$..a" }),
                ).toBe(2);
                expect(await GlideJson.get(client, key, { path: "$..a" })).toBe(
                    "[]",
                );
                expect(
                    await GlideJson.set(
                        client,
                        key,
                        "$",
                        JSON.stringify(jsonValue),
                    ),
                ).toBe("OK");
                expect(
                    await GlideJson.forget(client, key, { path: "..a" }),
                ).toBe(2);
                await expect(
                    GlideJson.get(client, key, { path: "..a" }),
                ).rejects.toThrow(RequestError);

                // verify result
                const result = await GlideJson.get(client, key, {
                    path: "$",
                });
                expect(JSON.parse(result as string)).toEqual([
                    { b: { b: 2.5, c: true } },
                ]);

                // test root deletion operations
                expect(await GlideJson.forget(client, key, { path: "$" })).toBe(
                    1,
                );

                // reset and test dot deletion
                expect(
                    await GlideJson.set(
                        client,
                        key,
                        "$",
                        JSON.stringify(jsonValue),
                    ),
                ).toBe("OK");
                expect(await GlideJson.forget(client, key, { path: "." })).toBe(
                    1,
                );

                // reset and test key deletion
                expect(
                    await GlideJson.set(
                        client,
                        key,
                        "$",
                        JSON.stringify(jsonValue),
                    ),
                ).toBe("OK");
                expect(await GlideJson.forget(client, key)).toBe(1);
                expect(await GlideJson.forget(client, key)).toBe(0);
                expect(
                    await GlideJson.get(client, key, { path: "$" }),
                ).toBeNull();

                // Binary buffer test
                expect(await GlideJson.forget(client, Buffer.from(key))).toBe(
                    0,
                );

                // non-existing keys
                expect(
                    await GlideJson.forget(client, "non_existing_key", {
                        path: "$",
                    }),
                ).toBe(0);
                expect(
                    await GlideJson.forget(client, "non_existing_key", {
                        path: ".",
                    }),
                ).toBe(0);
            });

            it("json.type tests", async () => {
                client = await GlideClusterClient.createClient(
                    getClientConfigurationOption(
                        cluster.getAddresses(),
                        protocol,
                    ),
                );
                const key = uuidv4();
                const jsonValue = [1, 2.3, "foo", true, null, {}, []];
                // setup
                expect(
                    await GlideJson.set(
                        client,
                        key,
                        "$",
                        JSON.stringify(jsonValue),
                    ),
                ).toBe("OK");
                expect(
                    await GlideJson.type(client, key, { path: "$[*]" }),
                ).toEqual([
                    "integer",
                    "number",
                    "string",
                    "boolean",
                    "null",
                    "object",
                    "array",
                ]);
                expect(
                    await GlideJson.type(client, "non_existing", {
                        path: "$[*]",
                    }),
                ).toBeNull();
                expect(
                    await GlideJson.type(client, key, {
                        path: "$non_existing",
                    }),
                ).toEqual([]);

                const key2 = uuidv4();
                const jsonValue2 = { Name: "John", Age: 27 };
                // setup
                expect(
                    await GlideJson.set(
                        client,
                        key2,
                        "$",
                        JSON.stringify(jsonValue2),
                    ),
                ).toBe("OK");
                expect(
                    await GlideJson.type(client, key2, { path: "." }),
                ).toEqual("object");
                expect(
                    await GlideJson.type(client, key2, { path: ".Age" }),
                ).toEqual("integer");
                expect(
                    await GlideJson.type(client, key2, { path: ".Job" }),
                ).toBeNull();
                expect(
                    await GlideJson.type(client, "non_existing", { path: "." }),
                ).toBeNull();

                // Binary buffer test
                expect(
                    await GlideJson.type(client, Buffer.from(key2), {
                        path: Buffer.from(".Age"),
                    }),
                ).toEqual("integer");
            });

            it("json.clear tests", async () => {
                client = await GlideClusterClient.createClient(
                    getClientConfigurationOption(
                        cluster.getAddresses(),
                        protocol,
                    ),
                );
                const key = uuidv4();
                const jsonValue = {
                    obj: { a: 1, b: 2 },
                    arr: [1, 2, 3],
                    str: "foo",
                    bool: true,
                    int: 42,
                    float: 3.14,
                    nullVal: null,
                };

                expect(
                    await GlideJson.set(
                        client,
                        key,
                        "$",
                        JSON.stringify(jsonValue),
                    ),
                ).toBe("OK");

                expect(
                    await GlideJson.clear(client, key, { path: "$.*" }),
                ).toBe(6);

                const result = await GlideJson.get(client, key, {
                    path: ["$"],
                });

                expect(JSON.parse(result as string)).toEqual([
                    {
                        obj: {},
                        arr: [],
                        str: "",
                        bool: false,
                        int: 0,
                        float: 0.0,
                        nullVal: null,
                    },
                ]);

                expect(
                    await GlideJson.clear(client, key, { path: "$.*" }),
                ).toBe(0);

                expect(
                    await GlideJson.set(
                        client,
                        key,
                        "$",
                        JSON.stringify(jsonValue),
                    ),
                ).toBe("OK");

                expect(await GlideJson.clear(client, key, { path: "*" })).toBe(
                    6,
                );

                const jsonValue2 = {
                    a: 1,
                    b: { a: [5, 6, 7], b: { a: true } },
                    c: { a: "value", b: { a: 3.5 } },
                    d: { a: { foo: "foo" } },
                    nullVal: null,
                };
                expect(
                    await GlideJson.set(
                        client,
                        key,
                        "$",
                        JSON.stringify(jsonValue2),
                    ),
                ).toBe("OK");

                expect(
                    await GlideJson.clear(client, key, {
                        path: "b.a[1:3]",
                    }),
                ).toBe(2);

                expect(
                    await GlideJson.clear(client, key, {
                        path: "b.a[1:3]",
                    }),
                ).toBe(0);

                expect(
                    JSON.parse(
                        (await GlideJson.get(client, key, {
                            path: ["$..a"],
                        })) as string,
                    ),
                ).toEqual([1, [5, 0, 0], true, "value", 3.5, { foo: "foo" }]);

                expect(
                    await GlideJson.clear(client, key, { path: "..a" }),
                ).toBe(6);

                expect(
                    JSON.parse(
                        (await GlideJson.get(client, key, {
                            path: ["$..a"],
                        })) as string,
                    ),
                ).toEqual([0, [], false, "", 0.0, {}]);

                expect(
                    await GlideJson.clear(client, key, { path: "$..a" }),
                ).toBe(0);

                // Path doesn't exist
                expect(
                    await GlideJson.clear(client, key, { path: "$.path" }),
                ).toBe(0);

                expect(
                    await GlideJson.clear(client, key, { path: "path" }),
                ).toBe(0);

                // Key doesn't exist
                await expect(
                    GlideJson.clear(client, "non_existing_key"),
                ).rejects.toThrow(RequestError);

                await expect(
                    GlideJson.clear(client, "non_existing_key", {
                        path: "$",
                    }),
                ).rejects.toThrow(RequestError);

                await expect(
                    GlideJson.clear(client, "non_existing_key", {
                        path: ".",
                    }),
                ).rejects.toThrow(RequestError);
            });

            it("json.resp tests", async () => {
                client = await GlideClusterClient.createClient(
                    getClientConfigurationOption(
                        cluster.getAddresses(),
                        protocol,
                    ),
                );
                const key = uuidv4();
                const jsonValue = {
                    obj: { a: 1, b: 2 },
                    arr: [1, 2, 3],
                    str: "foo",
                    bool: true,
                    int: 42,
                    float: 3.14,
                    nullVal: null,
                };
                // setup
                expect(
                    await GlideJson.set(
                        client,
                        key,
                        "$",
                        JSON.stringify(jsonValue),
                    ),
                ).toBe("OK");
                expect(
                    await GlideJson.resp(client, key, { path: "$.*" }),
                ).toEqual([
                    ["{", ["a", 1], ["b", 2]],
                    ["[", 1, 2, 3],
                    "foo",
                    "true",
                    42,
                    "3.14",
                    null,
                ]); // leading "{" - JSON objects, leading "[" - JSON arrays

                // multiple path match, the first will be returned
                expect(
                    await GlideJson.resp(client, key, { path: "*" }),
                ).toEqual(["{", ["a", 1], ["b", 2]]);

                // testing $ path
                expect(
                    await GlideJson.resp(client, key, { path: "$" }),
                ).toEqual([
                    [
                        "{",
                        ["obj", ["{", ["a", 1], ["b", 2]]],
                        ["arr", ["[", 1, 2, 3]],
                        ["str", "foo"],
                        ["bool", "true"],
                        ["int", 42],
                        ["float", "3.14"],
                        ["nullVal", null],
                    ],
                ]);

                // testing . path
                expect(
                    await GlideJson.resp(client, key, { path: "." }),
                ).toEqual([
                    "{",
                    ["obj", ["{", ["a", 1], ["b", 2]]],
                    ["arr", ["[", 1, 2, 3]],
                    ["str", "foo"],
                    ["bool", "true"],
                    ["int", 42],
                    ["float", "3.14"],
                    ["nullVal", null],
                ]);

                // $.str and .str
                expect(
                    await GlideJson.resp(client, key, { path: "$.str" }),
                ).toEqual(["foo"]);
                expect(
                    await GlideJson.resp(client, key, { path: ".str" }),
                ).toEqual("foo");

                // setup new json value
                const jsonValue2 = {
                    a: [1, 2, 3],
                    b: { a: [1, 2], c: { a: 42 } },
                };
                expect(
                    await GlideJson.set(
                        client,
                        key,
                        "$",
                        JSON.stringify(jsonValue2),
                    ),
                ).toBe("OK");

                expect(
                    await GlideJson.resp(client, key, { path: "..a" }),
                ).toEqual(["[", 1, 2, 3]);

                expect(
                    await GlideJson.resp(client, key, {
                        path: "$.nonexistent",
                    }),
                ).toEqual([]);

                // error case
                await expect(
                    GlideJson.resp(client, key, { path: "nonexistent" }),
                ).rejects.toThrow(RequestError);

                // non-existent key
                expect(
                    await GlideJson.resp(client, "nonexistent_key", {
                        path: "$",
                    }),
                ).toBeNull();
                expect(
                    await GlideJson.resp(client, "nonexistent_key", {
                        path: ".",
                    }),
                ).toBeNull();
                expect(
                    await GlideJson.resp(client, "nonexistent_key"),
                ).toBeNull();

                // binary buffer test
                expect(
                    await GlideJson.resp(client, Buffer.from(key), {
                        path: Buffer.from("..a"),
                        decoder: Decoder.Bytes,
                    }),
                ).toEqual([Buffer.from("["), 1, 2, 3]);
            });

            it("json.arrtrim tests", async () => {
                client = await GlideClusterClient.createClient(
                    getClientConfigurationOption(
                        cluster.getAddresses(),
                        protocol,
                    ),
                );

                const key = uuidv4();
                const jsonValue = {
                    a: [0, 1, 2, 3, 4, 5, 6, 7, 8],
                    b: { a: [0, 9, 10, 11, 12, 13], c: { a: 42 } },
                };

                // setup
                expect(
                    await GlideJson.set(
                        client,
                        key,
                        "$",
                        JSON.stringify(jsonValue),
                    ),
                ).toBe("OK");

                // Basic trim
                expect(
                    await GlideJson.arrtrim(client, key, "$..a", 1, 7),
                ).toEqual([7, 5, null]);

                // Test end >= size (should be treated as size-1)
                expect(
                    await GlideJson.arrtrim(client, key, "$.a", 0, 10),
                ).toEqual([7]);
                expect(
                    await GlideJson.arrtrim(client, key, ".a", 0, 10),
                ).toEqual(7);

                // Test negative start (should be treated as 0)
                expect(
                    await GlideJson.arrtrim(client, key, "$.a", -1, 5),
                ).toEqual([6]);
                expect(
                    await GlideJson.arrtrim(client, key, ".a", -1, 5),
                ).toEqual(6);

                // Test start >= size (should empty the array)
                expect(
                    await GlideJson.arrtrim(client, key, "$.a", 7, 10),
                ).toEqual([0]);
                const jsonValue2 = ["a", "b", "c"];
                expect(
                    await GlideJson.set(
                        client,
                        key,
                        ".a",
                        JSON.stringify(jsonValue2),
                    ),
                ).toBe("OK");
                expect(
                    await GlideJson.arrtrim(client, key, ".a", 7, 10),
                ).toEqual(0);

                // Test start > end (should empty the array)
                expect(
                    await GlideJson.arrtrim(client, key, "$..a", 2, 1),
                ).toEqual([0, 0, null]);
                const jsonValue3 = ["a", "b", "c", "d"];
                expect(
                    await GlideJson.set(
                        client,
                        key,
                        "..a",
                        JSON.stringify(jsonValue3),
                    ),
                ).toBe("OK");
                expect(
                    await GlideJson.arrtrim(client, key, "..a", 2, 1),
                ).toEqual(0);

                // Multiple path match
                expect(
                    await GlideJson.set(
                        client,
                        key,
                        "$",
                        JSON.stringify(jsonValue),
                    ),
                ).toBe("OK");
                expect(
                    await GlideJson.arrtrim(client, key, "..a", 1, 10),
                ).toEqual(8);

                // Test with non-existent path
                await expect(
                    GlideJson.arrtrim(client, key, "nonexistent", 0, 1),
                ).rejects.toThrow(RequestError);
                expect(
                    await GlideJson.arrtrim(client, key, "$.nonexistent", 0, 1),
                ).toEqual([]);

                // Test with non-array path
                expect(await GlideJson.arrtrim(client, key, "$", 0, 1)).toEqual(
                    [null],
                );
                await expect(
                    GlideJson.arrtrim(client, key, ".", 0, 1),
                ).rejects.toThrow(RequestError);

                // Test with non-existent key
                await expect(
                    GlideJson.arrtrim(client, "non_existing_key", "$", 0, 1),
                ).rejects.toThrow(RequestError);
                await expect(
                    GlideJson.arrtrim(client, "non_existing_key", ".", 0, 1),
                ).rejects.toThrow(RequestError);

                // Test empty array
                expect(
                    await GlideJson.set(
                        client,
                        key,
                        "$.empty",
                        JSON.stringify([]),
                    ),
                ).toBe("OK");
                expect(
                    await GlideJson.arrtrim(client, key, "$.empty", 0, 1),
                ).toEqual([0]);
                expect(
                    await GlideJson.arrtrim(client, key, ".empty", 0, 1),
                ).toEqual(0);
            });

            it("json.strlen tests", async () => {
                client = await GlideClusterClient.createClient(
                    getClientConfigurationOption(
                        cluster.getAddresses(),
                        protocol,
                    ),
                );
                const key = uuidv4();
                const jsonValue = {
                    a: "foo",
                    nested: { a: "hello" },
                    nested2: { a: 31 },
                };
                // setup
                expect(
                    await GlideJson.set(
                        client,
                        key,
                        "$",
                        JSON.stringify(jsonValue),
                    ),
                ).toBe("OK");

                expect(
                    await GlideJson.strlen(client, key, { path: "$..a" }),
                ).toEqual([3, 5, null]);
                expect(await GlideJson.strlen(client, key, { path: "a" })).toBe(
                    3,
                );

                expect(
                    await GlideJson.strlen(client, key, {
                        path: "$.nested",
                    }),
                ).toEqual([null]);
                expect(
                    await GlideJson.strlen(client, key, { path: "$..a" }),
                ).toEqual([3, 5, null]);

                expect(
                    await GlideJson.strlen(client, "non_existing_key", {
                        path: ".",
                    }),
                ).toBeNull();
                expect(
                    await GlideJson.strlen(client, "non_existing_key", {
                        path: "$",
                    }),
                ).toBeNull();
                expect(
                    await GlideJson.strlen(client, key, {
                        path: "$.non_existing_path",
                    }),
                ).toEqual([]);

                // error case
                await expect(
                    GlideJson.strlen(client, key, { path: "nested" }),
                ).rejects.toThrow(RequestError);
                await expect(GlideJson.strlen(client, key)).rejects.toThrow(
                    RequestError,
                );
                // Binary buffer test
                expect(
                    await GlideJson.strlen(client, Buffer.from(key), {
                        path: Buffer.from("$..a"),
                    }),
                ).toEqual([3, 5, null]);
            });

            it("json.arrappend", async () => {
                client = await GlideClusterClient.createClient(
                    getClientConfigurationOption(
                        cluster.getAddresses(),
                        protocol,
                    ),
                );
                const key = uuidv4();
                let doc = { a: 1, b: ["one", "two"] };
                expect(
                    await GlideJson.set(client, key, "$", JSON.stringify(doc)),
                ).toBe("OK");

                expect(
                    await GlideJson.arrappend(client, key, Buffer.from("$.b"), [
                        '"three"',
                    ]),
                ).toEqual([3]);
                expect(
                    await GlideJson.arrappend(client, key, ".b", [
                        '"four"',
                        '"five"',
                    ]),
                ).toEqual(5);
                doc = JSON.parse(
                    (await GlideJson.get(client, key, { path: "." })) as string,
                );
                expect(doc).toEqual({
                    a: 1,
                    b: ["one", "two", "three", "four", "five"],
                });

                expect(
                    await GlideJson.arrappend(client, key, "$.a", ['"value"']),
                ).toEqual([null]);
            });

            it("json.strappend tests", async () => {
                client = await GlideClusterClient.createClient(
                    getClientConfigurationOption(
                        cluster.getAddresses(),
                        protocol,
                    ),
                );
                const key = uuidv4();
                const jsonValue = {
                    a: "foo",
                    nested: { a: "hello" },
                    nested2: { a: 31 },
                };
                // setup
                expect(
                    await GlideJson.set(
                        client,
                        key,
                        "$",
                        JSON.stringify(jsonValue),
                    ),
                ).toBe("OK");

                expect(
                    await GlideJson.strappend(client, key, '"bar"', {
                        path: "$..a",
                    }),
                ).toEqual([6, 8, null]);
                expect(
                    await GlideJson.strappend(
                        client,
                        key,
                        JSON.stringify("foo"),
                        {
                            path: "a",
                        },
                    ),
                ).toBe(9);

                expect(await GlideJson.get(client, key, { path: "." })).toEqual(
                    JSON.stringify({
                        a: "foobarfoo",
                        nested: { a: "hellobar" },
                        nested2: { a: 31 },
                    }),
                );

                // Binary buffer test
                expect(
                    await GlideJson.strappend(
                        client,
                        Buffer.from(key),
                        Buffer.from(JSON.stringify("foo")),
                        {
                            path: Buffer.from("a"),
                        },
                    ),
                ).toBe(12);

                expect(
                    await GlideJson.strappend(
                        client,
                        key,
                        JSON.stringify("bar"),
                        {
                            path: "$.nested",
                        },
                    ),
                ).toEqual([null]);

                await expect(
                    GlideJson.strappend(client, key, JSON.stringify("bar"), {
                        path: ".nested",
                    }),
                ).rejects.toThrow(RequestError);
                await expect(
                    GlideJson.strappend(client, key, JSON.stringify("bar")),
                ).rejects.toThrow(RequestError);

                expect(
                    await GlideJson.strappend(
                        client,
                        key,
                        JSON.stringify("try"),
                        {
                            path: "$.non_existing_path",
                        },
                    ),
                ).toEqual([]);

                await expect(
                    GlideJson.strappend(client, key, JSON.stringify("try"), {
                        path: ".non_existing_path",
                    }),
                ).rejects.toThrow(RequestError);
                await expect(
                    GlideJson.strappend(
                        client,
                        "non_existing_key",
                        JSON.stringify("try"),
                    ),
                ).rejects.toThrow(RequestError);
            });

            it("json.numincrby tests", async () => {
                client = await GlideClusterClient.createClient(
                    getClientConfigurationOption(
                        cluster.getAddresses(),
                        protocol,
                    ),
                );
                const key = uuidv4();
                const jsonValue = {
                    key1: 1,
                    key2: 3.5,
                    key3: { nested_key: { key1: [4, 5] } },
                    key4: [1, 2, 3],
                    key5: 0,
                    key6: "hello",
                    key7: null,
                    key8: { nested_key: { key1: 69 } },
                    key9: 1.7976931348623157e308,
                };
                // setup
                expect(
                    await GlideJson.set(
                        client,
                        key,
                        "$",
                        JSON.stringify(jsonValue),
                    ),
                ).toBe("OK");

                // Increment integer value (key1) by 5
                expect(
                    await GlideJson.numincrby(client, key, "$.key1", 5),
                ).toBe("[6]"); // 1 + 5 = 6

                // Increment float value (key2) by 2.5
                expect(
                    await GlideJson.numincrby(client, key, "$.key2", 2.5),
                ).toBe("[6]"); // 3.5 + 2.5 = 6

                // Increment nested object (key3.nested_key.key1[0]) by 7
                expect(
                    await GlideJson.numincrby(
                        client,
                        key,
                        "$.key3.nested_key.key1[1]",
                        7,
                    ),
                ).toBe("[12]"); // 4 + 7 = 12

                // Increment array element (key4[1]) by 1
                expect(
                    await GlideJson.numincrby(client, key, "$.key4[1]", 1),
                ).toBe("[3]"); // 2 + 1 = 3

                // Increment zero value (key5) by 10.23 (float number)
                expect(
                    await GlideJson.numincrby(client, key, "$.key5", 10.23),
                ).toBe("[10.23]"); // 0 + 10.23 = 10.23

                // Increment a string value (key6) by a number
                expect(
                    await GlideJson.numincrby(client, key, "$.key6", 99),
                ).toBe("[null]"); // null

                // Increment a None value (key7) by a number
                expect(
                    await GlideJson.numincrby(client, key, "$.key7", 51),
                ).toBe("[null]"); // null

                // Check increment for all numbers in the document using JSON Path (First Null: key3 as an entire object. Second Null: The path checks under key3, which is an object, for numeric values).
                expect(await GlideJson.numincrby(client, key, "$..*", 5)).toBe(
                    "[11,11,null,null,15.23,null,null,null,1.7976931348623157e+308,null,null,9,17,6,8,8,null,74]",
                );

                // Check for multiple path match in enhanced
                expect(
                    await GlideJson.numincrby(client, key, "$..key1", 1),
                ).toBe("[12,null,75]");

                // Check for non existent path in JSONPath
                expect(
                    await GlideJson.numincrby(client, key, "$.key10", 51),
                ).toBe("[]"); // empty array

                // Check for non existent key in JSONPath
                await expect(
                    GlideJson.numincrby(
                        client,
                        "non_existing_key",
                        "$.key10",
                        51,
                    ),
                ).rejects.toThrow(RequestError);

                // Check for Overflow in JSONPath
                await expect(
                    GlideJson.numincrby(
                        client,
                        key,
                        "$.key9",
                        1.7976931348623157e308,
                    ),
                ).rejects.toThrow(RequestError);

                // Decrement integer value (key1) by 12
                expect(
                    await GlideJson.numincrby(client, key, "$.key1", -12),
                ).toBe("[0]"); // 12 - 12 = 0

                // Decrement integer value (key1) by 0.5
                expect(
                    await GlideJson.numincrby(client, key, "$.key1", -0.5),
                ).toBe("[-0.5]"); // 0 - 0.5 = -0.5

                // Test Legacy Path
                // Increment float value (key1) by 5 (integer)
                expect(await GlideJson.numincrby(client, key, "key1", 5)).toBe(
                    "4.5",
                ); // -0.5 + 5 = 4.5

                // Decrement float value (key1) by 5.5 (integer)
                expect(
                    await GlideJson.numincrby(client, key, "key1", -5.5),
                ).toBe("-1"); // 4.5 - 5.5 = -1

                // Increment int value (key2) by 2.5 (a float number)
                expect(
                    await GlideJson.numincrby(client, key, "key2", 2.5),
                ).toBe("13.5"); // 11 + 2.5 = 13.5

                // Increment nested value (key3.nested_key.key1[0]) by 7
                expect(
                    await GlideJson.numincrby(
                        client,
                        key,
                        "key3.nested_key.key1[0]",
                        7,
                    ),
                ).toBe("16"); // 9 + 7 = 16

                // Increment array element (key4[1]) by 1
                expect(
                    await GlideJson.numincrby(client, key, "key4[1]", 1),
                ).toBe("9"); // 8 + 1 = 9

                // Increment a float value (key5) by 10.2 (a float number)
                expect(
                    await GlideJson.numincrby(client, key, "key5", 10.2),
                ).toBe("25.43"); // 15.23 + 10.2 = 25.43

                // Check for multiple path match in legacy and assure that the result of the last updated value is returned
                expect(
                    await GlideJson.numincrby(client, key, "..key1", 1),
                ).toBe("76");

                // Check if the rest of the key1 path matches were updated and not only the last value
                expect(
                    await GlideJson.get(client, key, { path: "$..key1" }),
                ).toBe("[0,[16,17],76]");
                // First is 0 as 0 + 0 = 0, Second doesn't change as its an array type (non-numeric), third is 76 as 0 + 76 = 0

                // Check for non existent path in legacy
                await expect(
                    GlideJson.numincrby(client, key, ".key10", 51),
                ).rejects.toThrow(RequestError);

                // Check for non existent key in legacy
                await expect(
                    GlideJson.numincrby(
                        client,
                        "non_existent_key",
                        ".key10",
                        51,
                    ),
                ).rejects.toThrow(RequestError);

                // Check for Overflow in legacy
                await expect(
                    GlideJson.numincrby(
                        client,
                        key,
                        ".key9",
                        1.7976931348623157e308,
                    ),
                ).rejects.toThrow(RequestError);

                // binary buffer test
                expect(
                    await GlideJson.numincrby(
                        client,
                        Buffer.from(key),
                        Buffer.from("key5"),
                        1,
                    ),
                ).toBe("26.43");
            });

            it("json.nummultiby tests", async () => {
                client = await GlideClusterClient.createClient(
                    getClientConfigurationOption(
                        cluster.getAddresses(),
                        protocol,
                    ),
                );
                const key = uuidv4();
                const jsonValue =
                    "{" +
                    ' "key1": 1,' +
                    ' "key2": 3.5,' +
                    ' "key3": {"nested_key": {"key1": [4, 5]}},' +
                    ' "key4": [1, 2, 3],' +
                    ' "key5": 0,' +
                    ' "key6": "hello",' +
                    ' "key7": null,' +
                    ' "key8": {"nested_key": {"key1": 69}},' +
                    ' "key9": 3.5953862697246314e307' +
                    "}";
                // setup
                expect(await GlideJson.set(client, key, "$", jsonValue)).toBe(
                    "OK",
                );

                // Test JSONPath
                // Multiply integer value (key1) by 5
                expect(
                    await GlideJson.nummultby(client, key, "$.key1", 5),
                ).toBe("[5]"); //  1 * 5 = 5

                // Multiply float value (key2) by 2.5
                expect(
                    await GlideJson.nummultby(client, key, "$.key2", 2.5),
                ).toBe("[8.75]"); //  3.5 * 2.5 = 8.75

                // Multiply nested object (key3.nested_key.key1[1]) by 7
                expect(
                    await GlideJson.nummultby(
                        client,
                        key,
                        "$.key3.nested_key.key1[1]",
                        7,
                    ),
                ).toBe("[35]"); //  5 * 7 = 5

                // Multiply array element (key4[1]) by 1
                expect(
                    await GlideJson.nummultby(client, key, "$.key4[1]", 1),
                ).toBe("[2]"); //  2 * 1 = 2

                // Multiply zero value (key5) by 10.23 (float number)
                expect(
                    await GlideJson.nummultby(client, key, "$.key5", 10.23),
                ).toBe("[0]"); // 0 * 10.23 = 0

                // Multiply a string value (key6) by a number
                expect(
                    await GlideJson.nummultby(client, key, "$.key6", 99),
                ).toBe("[null]");

                // Multiply a None value (key7) by a number
                expect(
                    await GlideJson.nummultby(client, key, "$.key7", 51),
                ).toBe("[null]");

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
                expect(await GlideJson.nummultby(client, key, "$..*", 5)).toBe(
                    "[25,43.75,null,null,0,null,null,null,1.7976931348623157e+308,null,null,20,175,5,10,15,null,345]",
                );

                // Check for multiple path matches in JSONPath
                // key1: 25 * 2 = 50
                // key8.nested_key.key1: 345 * 2 = 690
                expect(
                    await GlideJson.nummultby(client, key, "$..key1", 2),
                ).toBe("[50,null,690]"); //  After previous multiplications

                // Check for non-existent path in JSONPath
                expect(
                    await GlideJson.nummultby(client, key, "$.key10", 51),
                ).toBe("[]"); //  Empty Array

                // Check for non-existent key in JSONPath
                await expect(
                    GlideJson.numincrby(
                        client,
                        "non_existent_key",
                        "$.key10",
                        51,
                    ),
                ).rejects.toThrow(RequestError);

                // Check for Overflow in JSONPath
                await expect(
                    GlideJson.numincrby(
                        client,
                        key,
                        "$.key9",
                        1.7976931348623157e308,
                    ),
                ).rejects.toThrow(RequestError);

                // Multiply integer value (key1) by -12
                expect(
                    await GlideJson.nummultby(client, key, "$.key1", -12),
                ).toBe("[-600]"); // 50 * -12 = -600

                // Multiply integer value (key1) by -0.5
                expect(
                    await GlideJson.nummultby(client, key, "$.key1", -0.5),
                ).toBe("[300]"); //  -600 * -0.5 = 300

                // Test Legacy Path
                // Multiply int value (key1) by 5 (integer)
                expect(await GlideJson.nummultby(client, key, "key1", 5)).toBe(
                    "1500",
                ); //  300 * 5 = -1500

                // Multiply int value (key1) by -5.5 (float number)
                expect(
                    await GlideJson.nummultby(client, key, "key1", -5.5),
                ).toBe("-8250"); //  -150 * -5.5 = -8250

                // Multiply int float (key2) by 2.5 (a float number)
                expect(
                    await GlideJson.nummultby(client, key, "key2", 2.5),
                ).toBe("109.375"); // 109.375

                // Multiply nested value (key3.nested_key.key1[0]) by 7
                expect(
                    await GlideJson.nummultby(
                        client,
                        key,
                        "key3.nested_key.key1[0]",
                        7,
                    ),
                ).toBe("140"); // 20 * 7 = 140

                // Multiply array element (key4[1]) by 1
                expect(
                    await GlideJson.nummultby(client, key, "key4[1]", 1),
                ).toBe("10"); //  10 * 1 = 10

                // Multiply a float value (key5) by 10.2 (a float number)
                expect(
                    await GlideJson.nummultby(client, key, "key5", 10.2),
                ).toBe("0"); // 0 * 10.2 = 0

                // Check for multiple path matches in legacy and assure that the result of the last updated value is returned
                // last updated value is key8.nested_key.key1: 690 * 2 = 1380
                expect(
                    await GlideJson.nummultby(client, key, "..key1", 2),
                ).toBe("1380"); //  the last updated key1 value multiplied by 2

                // Check if the rest of the key1 path matches were updated and not only the last value
                expect(
                    await GlideJson.get(client, key, { path: "$..key1" }),
                ).toBe("[-16500,[140,175],1380]");

                // Check for non-existent path in legacy
                await expect(
                    GlideJson.numincrby(client, key, ".key10", 51),
                ).rejects.toThrow(RequestError);

                // Check for non-existent key in legacy
                await expect(
                    GlideJson.numincrby(
                        client,
                        "non_existent_key",
                        ".key10",
                        51,
                    ),
                ).rejects.toThrow(RequestError);

                // Check for Overflow in legacy
                await expect(
                    GlideJson.numincrby(
                        client,
                        key,
                        ".key9",
                        1.7976931348623157e308,
                    ),
                ).rejects.toThrow(RequestError);

                // binary buffer tests
                expect(
                    await GlideJson.nummultby(
                        client,
                        Buffer.from(key),
                        Buffer.from("key5"),
                        10.2,
                    ),
                ).toBe("0"); // 0 * 10.2 = 0
            });

            it("json.debug tests", async () => {
                client = await GlideClusterClient.createClient(
                    getClientConfigurationOption(
                        cluster.getAddresses(),
                        protocol,
                    ),
                );
                const key = uuidv4();
                const jsonValue =
                    '{ "key1": 1, "key2": 3.5, "key3": {"nested_key": {"key1": [4, 5]}}, "key4":' +
                    ' [1, 2, 3], "key5": 0, "key6": "hello", "key7": null, "key8":' +
                    ' {"nested_key": {"key1": 3.5953862697246314e307}}, "key9":' +
                    ' 3.5953862697246314e307, "key10": true }';
                // setup
                expect(await GlideJson.set(client, key, "$", jsonValue)).toBe(
                    "OK",
                );

                expect(
                    await GlideJson.debugFields(client, key, {
                        path: "$.key1",
                    }),
                ).toEqual([1]);

                expect(
                    await GlideJson.debugFields(client, key, {
                        path: "$.key3.nested_key.key1",
                    }),
                ).toEqual([2]);

                expect(
                    await GlideJson.debugMemory(client, key, {
                        path: "$.key4[2]",
                    }),
                ).toEqual([16]);

                expect(
                    await GlideJson.debugMemory(client, key, {
                        path: ".key6",
                    }),
                ).toEqual(16);

                expect(await GlideJson.debugMemory(client, key)).toEqual(504);

                expect(await GlideJson.debugFields(client, key)).toEqual(19);

                // testing binary input
                expect(
                    await GlideJson.debugMemory(client, Buffer.from(key)),
                ).toEqual(504);

                expect(
                    await GlideJson.debugFields(client, Buffer.from(key)),
                ).toEqual(19);
            });

            it("json.objlen tests", async () => {
                client = await GlideClusterClient.createClient(
                    getClientConfigurationOption(
                        cluster.getAddresses(),
                        protocol,
                    ),
                );
                const key = uuidv4();
                const jsonValue = {
                    a: 1.0,
                    b: { a: { x: 1, y: 2 }, b: 2.5, c: true },
                };

                // setup
                expect(
                    await GlideJson.set(
                        client,
                        key,
                        "$",
                        JSON.stringify(jsonValue),
                    ),
                ).toBe("OK");

                expect(
                    await GlideJson.objlen(client, key, { path: "$" }),
                ).toEqual([2]);

                expect(
                    await GlideJson.objlen(client, key, { path: "." }),
                ).toEqual(2);

                expect(
                    await GlideJson.objlen(client, key, { path: "$.." }),
                ).toEqual([2, 3, 2]);

                expect(
                    await GlideJson.objlen(client, key, { path: ".." }),
                ).toEqual(2);

                expect(
                    await GlideJson.objlen(client, key, { path: "$..b" }),
                ).toEqual([3, null]);

                expect(
                    await GlideJson.objlen(client, key, { path: "..b" }),
                ).toEqual(3);

                expect(
                    await GlideJson.objlen(client, Buffer.from(key), {
                        path: Buffer.from("..a"),
                    }),
                ).toEqual(2);

                expect(await GlideJson.objlen(client, key)).toEqual(2);

                // path doesn't exist
                expect(
                    await GlideJson.objlen(client, key, {
                        path: "$.non_existing_path",
                    }),
                ).toEqual([]);

                await expect(
                    GlideJson.objlen(client, key, {
                        path: "non_existing_path",
                    }),
                ).rejects.toThrow(RequestError);

                // Value at path isnt an object
                expect(
                    await GlideJson.objlen(client, key, {
                        path: "$.non_existing_path",
                    }),
                ).toEqual([]);

                await expect(
                    GlideJson.objlen(client, key, { path: ".a" }),
                ).rejects.toThrow(RequestError);

                // Non-existing key
                expect(
                    await GlideJson.objlen(client, "non_existing_key", {
                        path: "$",
                    }),
                ).toBeNull();

                expect(
                    await GlideJson.objlen(client, "non_existing_key", {
                        path: ".",
                    }),
                ).toBeNull();

                expect(
                    await GlideJson.set(
                        client,
                        key,
                        "$",
                        '{"a": 1, "b": 2, "c":3, "d":4}',
                    ),
                ).toBe("OK");
                expect(await GlideJson.objlen(client, key)).toEqual(4);
            });

            it("json.objkeys tests", async () => {
                client = await GlideClusterClient.createClient(
                    getClientConfigurationOption(
                        cluster.getAddresses(),
                        protocol,
                    ),
                );
                const key = uuidv4();
                const jsonValue = {
                    a: 1.0,
                    b: { a: { x: 1, y: 2 }, b: 2.5, c: true },
                };

                // setup
                expect(
                    await GlideJson.set(
                        client,
                        key,
                        "$",
                        JSON.stringify(jsonValue),
                    ),
                ).toBe("OK");

                expect(
                    await GlideJson.objkeys(client, key, { path: "$" }),
                ).toEqual([["a", "b"]]);

                expect(
                    await GlideJson.objkeys(client, key, {
                        path: ".",
                        decoder: Decoder.Bytes,
                    }),
                ).toEqual([Buffer.from("a"), Buffer.from("b")]);

                expect(
                    await GlideJson.objkeys(client, Buffer.from(key), {
                        path: Buffer.from("$.."),
                    }),
                ).toEqual([
                    ["a", "b"],
                    ["a", "b", "c"],
                    ["x", "y"],
                ]);

                expect(
                    await GlideJson.objkeys(client, key, { path: ".." }),
                ).toEqual(["a", "b"]);

                expect(
                    await GlideJson.objkeys(client, key, { path: "$..b" }),
                ).toEqual([["a", "b", "c"], []]);

                expect(
                    await GlideJson.objkeys(client, key, { path: "..b" }),
                ).toEqual(["a", "b", "c"]);

                // path doesn't exist
                expect(
                    await GlideJson.objkeys(client, key, {
                        path: "$.non_existing_path",
                    }),
                ).toEqual([]);

                expect(
                    await GlideJson.objkeys(client, key, {
                        path: "non_existing_path",
                    }),
                ).toBeNull();

                // Value at path isnt an object
                expect(
                    await GlideJson.objkeys(client, key, { path: "$.a" }),
                ).toEqual([[]]);

                await expect(
                    GlideJson.objkeys(client, key, { path: ".a" }),
                ).rejects.toThrow(RequestError);

                // Non-existing key
                expect(
                    await GlideJson.objkeys(client, "non_existing_key", {
                        path: "$",
                    }),
                ).toBeNull();

                expect(
                    await GlideJson.objkeys(client, "non_existing_key", {
                        path: ".",
                    }),
                ).toBeNull();
            });

            it("can send GlideMultiJson transactions for ARR commands", async () => {
                client = await GlideClusterClient.createClient(
                    getClientConfigurationOption(
                        cluster.getAddresses(),
                        protocol,
                    ),
                );
                const clusterTransaction = new ClusterTransaction();
                const expectedRes =
                    await transactionMultiJsonForArrCommands(
                        clusterTransaction,
                    );
                const result = await client.exec(clusterTransaction);

                validateTransactionResponse(result, expectedRes);
                client.close();
            });

            it("can send GlideMultiJson transactions general commands", async () => {
                client = await GlideClusterClient.createClient(
                    getClientConfigurationOption(
                        cluster.getAddresses(),
                        protocol,
                    ),
                );
                const clusterTransaction = new ClusterTransaction();
                const expectedRes =
                    await transactionMultiJson(clusterTransaction);
                const result = await client.exec(clusterTransaction);

                validateTransactionResponse(result, expectedRes);
                client.close();
            });
        },
    );

    describe("GlideFt", () => {
        let client: GlideClusterClient;

        afterEach(async () => {
            await flushAndCloseClient(true, cluster.getAddresses(), client);
        });

        it("ServerModules check Vector Search module is loaded", async () => {
            client = await GlideClusterClient.createClient(
                getClientConfigurationOption(
                    cluster.getAddresses(),
                    ProtocolVersion.RESP3,
                ),
            );
            const info = await client.info({
                sections: [InfoOptions.Modules],
                route: "randomNode",
            });
            expect(info).toContain("# search_index_stats");
        });

        it("FT.CREATE test", async () => {
            client = await GlideClusterClient.createClient(
                getClientConfigurationOption(
                    cluster.getAddresses(),
                    ProtocolVersion.RESP3,
                ),
            );

            // Create a few simple indices:
            const vectorField_1: VectorField = {
                type: "VECTOR",
                name: "vec",
                alias: "VEC",
                attributes: {
                    algorithm: "HNSW",
                    type: "FLOAT32",
                    dimensions: 2,
                    distanceMetric: "L2",
                },
            };
            expect(
                await GlideFt.create(client, uuidv4(), [vectorField_1]),
            ).toEqual("OK");

            expect(
                await GlideFt.create(
                    client,
                    "json_idx1",
                    [
                        {
                            type: "VECTOR",
                            name: "$.vec",
                            alias: "VEC",
                            attributes: {
                                algorithm: "HNSW",
                                type: "FLOAT32",
                                dimensions: 6,
                                distanceMetric: "L2",
                                numberOfEdges: 32,
                            },
                        },
                    ],
                    {
                        dataType: "JSON",
                        prefixes: ["json:"],
                    },
                ),
            ).toEqual("OK");

            const vectorField_2: VectorField = {
                type: "VECTOR",
                name: "$.vec",
                alias: "VEC",
                attributes: {
                    algorithm: "FLAT",
                    type: "FLOAT32",
                    dimensions: 6,
                    distanceMetric: "L2",
                },
            };
            expect(
                await GlideFt.create(client, uuidv4(), [vectorField_2]),
            ).toEqual("OK");

            // create an index with HNSW vector with additional parameters
            const vectorField_3: VectorField = {
                type: "VECTOR",
                name: "doc_embedding",
                attributes: {
                    algorithm: "HNSW",
                    type: "FLOAT32",
                    dimensions: 1536,
                    distanceMetric: "COSINE",
                    numberOfEdges: 40,
                    vectorsExaminedOnConstruction: 250,
                    vectorsExaminedOnRuntime: 40,
                },
            };
            expect(
                await GlideFt.create(client, uuidv4(), [vectorField_3], {
                    dataType: "HASH",
                    prefixes: ["docs:"],
                }),
            ).toEqual("OK");

            // create an index with multiple fields
            expect(
                await GlideFt.create(
                    client,
                    uuidv4(),
                    [
                        { type: "TEXT", name: "title" },
                        { type: "NUMERIC", name: "published_at" },
                        { type: "TAG", name: "category" },
                    ],
                    { dataType: "HASH", prefixes: ["blog:post:"] },
                ),
            ).toEqual("OK");

            // create an index with multiple prefixes
            const name = uuidv4();
            expect(
                await GlideFt.create(
                    client,
                    name,
                    [
                        { type: "TAG", name: "author_id" },
                        { type: "TAG", name: "author_ids" },
                        { type: "TEXT", name: "title" },
                        { type: "TEXT", name: "name" },
                    ],
                    {
                        dataType: "HASH",
                        prefixes: ["author:details:", "book:details:"],
                    },
                ),
            ).toEqual("OK");

            // create a duplicating index - expect a RequestError
            try {
                expect(
                    await GlideFt.create(client, name, [
                        { type: "TEXT", name: "title" },
                        { type: "TEXT", name: "name" },
                    ]),
                ).rejects.toThrow();
            } catch (e) {
                expect((e as Error).message).toContain("already exists");
            }

            // create an index without fields - expect a RequestError
            try {
                expect(
                    await GlideFt.create(client, uuidv4(), []),
                ).rejects.toThrow();
            } catch (e) {
                expect((e as Error).message).toContain(
                    "wrong number of arguments",
                );
            }

            // duplicated field name - expect a RequestError
            try {
                expect(
                    await GlideFt.create(client, uuidv4(), [
                        { type: "TEXT", name: "name" },
                        { type: "TEXT", name: "name" },
                    ]),
                ).rejects.toThrow();
            } catch (e) {
                expect((e as Error).message).toContain("already exists");
            }
        });

        it("FT.DROPINDEX FT._LIST FT.LIST", async () => {
            client = await GlideClusterClient.createClient(
                getClientConfigurationOption(
                    cluster.getAddresses(),
                    ProtocolVersion.RESP3,
                ),
            );

            // create an index
            const index = uuidv4();
            expect(
                await GlideFt.create(client, index, [
                    {
                        type: "VECTOR",
                        name: "vec",
                        attributes: {
                            algorithm: "HNSW",
                            distanceMetric: "L2",
                            dimensions: 2,
                        },
                    },
                    { type: "NUMERIC", name: "published_at" },
                    { type: "TAG", name: "category" },
                ]),
            ).toEqual("OK");

            const before = await GlideFt.list(client);
            expect(before).toContain(index);

            // DROP it
            expect(await GlideFt.dropindex(client, index)).toEqual("OK");

            const after = await GlideFt.list(client);
            expect(after).not.toContain(index);

            // dropping the index again results in an error
            try {
                expect(
                    await GlideFt.dropindex(client, index),
                ).rejects.toThrow();
            } catch (e) {
                expect((e as Error).message).toContain("Index does not exist");
            }
        });

        it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
            "FT.INFO ft.info",
            async (protocol) => {
                client = await GlideClusterClient.createClient(
                    getClientConfigurationOption(
                        cluster.getAddresses(),
                        protocol,
                    ),
                );

                const index = uuidv4();
                expect(
                    await GlideFt.create(
                        client,
                        Buffer.from(index),
                        [
                            {
                                type: "VECTOR",
                                name: "$.vec",
                                alias: "VEC",
                                attributes: {
                                    algorithm: "HNSW",
                                    distanceMetric: "COSINE",
                                    dimensions: 42,
                                },
                            },
                            { type: "TEXT", name: "$.name" },
                        ],
                        { dataType: "JSON", prefixes: ["123"] },
                    ),
                ).toEqual("OK");

                let response = await GlideFt.info(client, Buffer.from(index));

                expect(response).toMatchObject({
                    index_name: index,
                    key_type: "JSON",
                    key_prefixes: ["123"],
                    fields: [
                        {
                            identifier: "$.name",
                            type: "TEXT",
                            field_name: "$.name",
                            option: "",
                        },
                        {
                            identifier: "$.vec",
                            type: "VECTOR",
                            field_name: "VEC",
                            option: "",
                            vector_params: {
                                distance_metric: "COSINE",
                                dimension: 42,
                            },
                        },
                    ],
                });

                response = await GlideFt.info(client, index, {
                    decoder: Decoder.Bytes,
                });
                expect(response).toMatchObject({
                    index_name: Buffer.from(index),
                });

                expect(await GlideFt.dropindex(client, index)).toEqual("OK");
                // querying a missing index
                await expect(GlideFt.info(client, index)).rejects.toThrow(
                    "Index not found",
                );
            },
        );

        it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
            "FT.AGGREGATE on JSON",
            async (protocol) => {
                client = await GlideClusterClient.createClient(
                    getClientConfigurationOption(
                        cluster.getAddresses(),
                        protocol,
                    ),
                );

                const isResp3 = protocol == ProtocolVersion.RESP3;
                const prefixBicycles = "{bicycles}:";
                const indexBicycles = prefixBicycles + uuidv4();
                const query = "*";

                // FT.CREATE idx:bicycle ON JSON PREFIX 1 bicycle: SCHEMA $.model AS model TEXT $.description AS
                // description TEXT $.price AS price NUMERIC $.condition AS condition TAG SEPARATOR ,
                expect(
                    await GlideFt.create(
                        client,
                        indexBicycles,
                        [
                            { type: "TEXT", name: "$.model", alias: "model" },
                            {
                                type: "TEXT",
                                name: "$.description",
                                alias: "description",
                            },
                            {
                                type: "NUMERIC",
                                name: "$.price",
                                alias: "price",
                            },
                            {
                                type: "TAG",
                                name: "$.condition",
                                alias: "condition",
                                separator: ",",
                            },
                        ],
                        { prefixes: [prefixBicycles], dataType: "JSON" },
                    ),
                ).toEqual("OK");

                // TODO check JSON module loaded
                expect(
                    await GlideJson.set(
                        client,
                        prefixBicycles + 0,
                        ".",
                        '{"brand": "Velorim", "model": "Jigger", "price": 270, "condition": "new"}',
                    ),
                ).toEqual("OK");

                expect(
                    await GlideJson.set(
                        client,
                        prefixBicycles + 1,
                        ".",
                        '{"brand": "Bicyk", "model": "Hillcraft", "price": 1200, "condition": "used"}',
                    ),
                ).toEqual("OK");

                expect(
                    await GlideJson.set(
                        client,
                        prefixBicycles + 2,
                        ".",
                        '{"brand": "Nord", "model": "Chook air 5", "price": 815, "condition": "used"}',
                    ),
                ).toEqual("OK");

                expect(
                    await GlideJson.set(
                        client,
                        prefixBicycles + 3,
                        ".",
                        '{"brand": "Eva", "model": "Eva 291", "price": 3400, "condition": "used"}',
                    ),
                ).toEqual("OK");

                expect(
                    await GlideJson.set(
                        client,
                        prefixBicycles + 4,
                        ".",
                        '{"brand": "Noka Bikes", "model": "Kahuna", "price": 3200, "condition": "used"}',
                    ),
                ).toEqual("OK");

                expect(
                    await GlideJson.set(
                        client,
                        prefixBicycles + 5,
                        ".",
                        '{"brand": "Breakout", "model": "XBN 2.1 Alloy", "price": 810, "condition": "new"}',
                    ),
                ).toEqual("OK");

                expect(
                    await GlideJson.set(
                        client,
                        prefixBicycles + 6,
                        ".",
                        '{"brand": "ScramBikes", "model": "WattBike", "price": 2300, "condition": "new"}',
                    ),
                ).toEqual("OK");

                expect(
                    await GlideJson.set(
                        client,
                        prefixBicycles + 7,
                        ".",
                        '{"brand": "Peaknetic", "model": "Secto", "price": 430, "condition": "new"}',
                    ),
                ).toEqual("OK");

                expect(
                    await GlideJson.set(
                        client,
                        prefixBicycles + 8,
                        ".",
                        '{"brand": "nHill", "model": "Summit", "price": 1200, "condition": "new"}',
                    ),
                ).toEqual("OK");

                expect(
                    await GlideJson.set(
                        client,
                        prefixBicycles + 9,
                        ".",
                        '{"model": "ThrillCycle", "brand": "BikeShind", "price": 815, "condition": "refurbished"}',
                    ),
                ).toEqual("OK");

                // let server digest the data and update index
                await new Promise((resolve) =>
                    setTimeout(resolve, DATA_PROCESSING_TIMEOUT),
                );

                // FT.AGGREGATE idx:bicycle * LOAD 1 __key GROUPBY 1 @condition REDUCE COUNT 0 AS bicycles
                const options: FtAggregateOptions = {
                    loadFields: ["__key"],
                    clauses: [
                        {
                            type: "GROUPBY",
                            properties: ["@condition"],
                            reducers: [
                                {
                                    function: "COUNT",
                                    args: [],
                                    name: "bicycles",
                                },
                            ],
                        },
                    ],
                };
                const aggreg = await GlideFt.aggregate(
                    client,
                    indexBicycles,
                    query,
                    options,
                );
                const expectedAggreg = [
                    {
                        condition: "new",
                        bicycles: isResp3 ? 5 : "5",
                    },
                    {
                        condition: "refurbished",
                        bicycles: isResp3 ? 1 : "1",
                    },
                    {
                        condition: "used",
                        bicycles: isResp3 ? 4 : "4",
                    },
                ];
                expect(
                    aggreg
                        .map(convertGlideRecordToRecord)
                        // elements (records in array) could be reordered
                        .sort((a, b) =>
                            a["condition"]! > b["condition"]! ? 1 : -1,
                        ),
                ).toEqual(expectedAggreg);

                const aggregProfile: [
                    FtAggregateReturnType,
                    Record<string, number>,
                ] = await GlideFt.profileAggregate(
                    client,
                    indexBicycles,
                    "*",
                    options,
                );
                // profile metrics and categories are subject to change
                expect(aggregProfile[1]).toBeTruthy();
                expect(
                    aggregProfile[0]
                        .map(convertGlideRecordToRecord)
                        // elements (records in array) could be reordered
                        .sort((a, b) =>
                            a["condition"]! > b["condition"]! ? 1 : -1,
                        ),
                ).toEqual(expectedAggreg);

                await GlideFt.dropindex(client, indexBicycles);
            },
        );

        it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
            "FT.AGGREGATE on HASH",
            async (protocol) => {
                client = await GlideClusterClient.createClient(
                    getClientConfigurationOption(
                        cluster.getAddresses(),
                        protocol,
                    ),
                );

                const isResp3 = protocol == ProtocolVersion.RESP3;
                const prefixMovies = "{movies}:";
                const indexMovies = prefixMovies + uuidv4();
                const query = "*";

                // FT.CREATE idx:movie ON hash PREFIX 1 "movie:" SCHEMA title TEXT release_year NUMERIC
                // rating NUMERIC genre TAG votes NUMERIC
                expect(
                    await GlideFt.create(
                        client,
                        indexMovies,
                        [
                            { type: "TEXT", name: "title" },
                            { type: "NUMERIC", name: "release_year" },
                            { type: "NUMERIC", name: "rating" },
                            { type: "TAG", name: "genre" },
                            { type: "NUMERIC", name: "votes" },
                        ],
                        { prefixes: [prefixMovies], dataType: "HASH" },
                    ),
                ).toEqual("OK");

                await client.hset(prefixMovies + 11002, {
                    title: "Star Wars: Episode V - The Empire Strikes Back",
                    release_year: "1980",
                    genre: "Action",
                    rating: "8.7",
                    votes: "1127635",
                    imdb_id: "tt0080684",
                });

                await client.hset(prefixMovies + 11003, {
                    title: "The Godfather",
                    release_year: "1972",
                    genre: "Drama",
                    rating: "9.2",
                    votes: "1563839",
                    imdb_id: "tt0068646",
                });

                await client.hset(prefixMovies + 11004, {
                    title: "Heat",
                    release_year: "1995",
                    genre: "Thriller",
                    rating: "8.2",
                    votes: "559490",
                    imdb_id: "tt0113277",
                });

                await client.hset(prefixMovies + 11005, {
                    title: "Star Wars: Episode VI - Return of the Jedi",
                    release_year: "1983",
                    genre: "Action",
                    rating: "8.3",
                    votes: "906260",
                    imdb_id: "tt0086190",
                });

                // let server digest the data and update index
                await new Promise((resolve) =>
                    setTimeout(resolve, DATA_PROCESSING_TIMEOUT),
                );

                // FT.AGGREGATE idx:movie * LOAD * APPLY ceil(@rating) as r_rating GROUPBY 1 @genre REDUCE
                // COUNT 0 AS nb_of_movies REDUCE SUM 1 votes AS nb_of_votes REDUCE AVG 1 r_rating AS avg_rating
                // SORTBY 4 @avg_rating DESC @nb_of_votes DESC
                const options: FtAggregateOptions = {
                    loadAll: true,
                    clauses: [
                        {
                            type: "APPLY",
                            expression: "ceil(@rating)",
                            name: "r_rating",
                        },
                        {
                            type: "GROUPBY",
                            properties: ["@genre"],
                            reducers: [
                                {
                                    function: "COUNT",
                                    args: [],
                                    name: "nb_of_movies",
                                },
                                {
                                    function: "SUM",
                                    args: ["votes"],
                                    name: "nb_of_votes",
                                },
                                {
                                    function: "AVG",
                                    args: ["r_rating"],
                                    name: "avg_rating",
                                },
                            ],
                        },
                        {
                            type: "SORTBY",
                            properties: [
                                {
                                    property: "@avg_rating",
                                    order: SortOrder.DESC,
                                },
                                {
                                    property: "@nb_of_votes",
                                    order: SortOrder.DESC,
                                },
                            ],
                        },
                    ],
                };
                const aggreg = await GlideFt.aggregate(
                    client,
                    indexMovies,
                    query,
                    options,
                );
                const expectedAggreg = [
                    {
                        genre: "Action",
                        nb_of_movies: isResp3 ? 2.0 : "2",
                        nb_of_votes: isResp3 ? 2033895.0 : "2033895",
                        avg_rating: isResp3 ? 9.0 : "9",
                    },
                    {
                        genre: "Drama",
                        nb_of_movies: isResp3 ? 1.0 : "1",
                        nb_of_votes: isResp3 ? 1563839.0 : "1563839",
                        avg_rating: isResp3 ? 10.0 : "10",
                    },
                    {
                        genre: "Thriller",
                        nb_of_movies: isResp3 ? 1.0 : "1",
                        nb_of_votes: isResp3 ? 559490.0 : "559490",
                        avg_rating: isResp3 ? 9.0 : "9",
                    },
                ];
                expect(
                    aggreg
                        .map(convertGlideRecordToRecord)
                        // elements (records in array) could be reordered
                        .sort((a, b) => (a["genre"]! > b["genre"]! ? 1 : -1)),
                ).toEqual(expectedAggreg);

                const aggregProfile: [
                    FtAggregateReturnType,
                    Record<string, number>,
                ] = await GlideFt.profileAggregate(
                    client,
                    indexMovies,
                    query,
                    options,
                );
                // profile metrics and categories are subject to change
                expect(aggregProfile[1]).toBeTruthy();
                expect(
                    aggregProfile[0]
                        .map(convertGlideRecordToRecord)
                        // elements (records in array) could be reordered
                        .sort((a, b) => (a["genre"]! > b["genre"]! ? 1 : -1)),
                ).toEqual(expectedAggreg);

                await GlideFt.dropindex(client, indexMovies);
            },
        );

        it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
            "FT.SEARCH binary on HASH",
            async (protocol) => {
                client = await GlideClusterClient.createClient(
                    getClientConfigurationOption(
                        cluster.getAddresses(),
                        protocol,
                    ),
                );
                const prefix = "{" + uuidv4() + "}:";
                const index = prefix + "index";
                const query = "*=>[KNN 2 @VEC $query_vec]";

                // setup a hash index:
                expect(
                    await GlideFt.create(
                        client,
                        index,
                        [
                            {
                                type: "VECTOR",
                                name: "vec",
                                alias: "VEC",
                                attributes: {
                                    algorithm: "HNSW",
                                    distanceMetric: "L2",
                                    dimensions: 2,
                                },
                            },
                        ],
                        {
                            dataType: "HASH",
                            prefixes: [prefix],
                        },
                    ),
                ).toEqual("OK");

                const binaryValue1 = Buffer.alloc(8);
                expect(
                    await client.hset(Buffer.from(prefix + "0"), [
                        // value of <Buffer 00 00 00 00 00 00 00 00 00>
                        { field: "vec", value: binaryValue1 },
                    ]),
                ).toEqual(1);

                const binaryValue2: Buffer = Buffer.alloc(8);
                binaryValue2[6] = 0x80;
                binaryValue2[7] = 0xbf;
                expect(
                    await client.hset(Buffer.from(prefix + "1"), [
                        // value of <Buffer 00 00 00 00 00 00 00 80 BF>
                        { field: "vec", value: binaryValue2 },
                    ]),
                ).toEqual(1);

                // let server digest the data and update index
                const sleep = new Promise((resolve) =>
                    setTimeout(resolve, DATA_PROCESSING_TIMEOUT),
                );
                await sleep;

                // With the `COUNT` parameters - returns only the count
                const optionsWithCount: FtSearchOptions = {
                    params: [{ key: "query_vec", value: binaryValue1 }],
                    timeout: 10000,
                    count: true,
                };
                const binaryResultCount: FtSearchReturnType =
                    await GlideFt.search(client, index, query, {
                        decoder: Decoder.Bytes,
                        ...optionsWithCount,
                    });
                expect(binaryResultCount).toEqual([2]);

                const options: FtSearchOptions = {
                    params: [{ key: "query_vec", value: binaryValue1 }],
                    timeout: 10000,
                };
                const binaryResult: FtSearchReturnType = await GlideFt.search(
                    client,
                    index,
                    query,
                    {
                        decoder: Decoder.Bytes,
                        ...options,
                    },
                );

                const expectedBinaryResult: FtSearchReturnType = [
                    2,
                    [
                        {
                            key: Buffer.from(prefix + "1"),
                            value: [
                                {
                                    key: Buffer.from("vec"),
                                    value: binaryValue2,
                                },
                                {
                                    key: Buffer.from("__VEC_score"),
                                    value: Buffer.from("1"),
                                },
                            ],
                        },
                        {
                            key: Buffer.from(prefix + "0"),
                            value: [
                                {
                                    key: Buffer.from("vec"),
                                    value: binaryValue1,
                                },
                                {
                                    key: Buffer.from("__VEC_score"),
                                    value: Buffer.from("0"),
                                },
                            ],
                        },
                    ],
                ];
                expect(binaryResult).toEqual(expectedBinaryResult);

                const binaryProfileResult: [
                    FtSearchReturnType,
                    Record<string, number>,
                ] = await GlideFt.profileSearch(client, index, query, {
                    decoder: Decoder.Bytes,
                    ...options,
                });
                // profile metrics and categories are subject to change
                expect(binaryProfileResult[1]).toBeTruthy();
                expect(binaryProfileResult[0]).toEqual(expectedBinaryResult);
            },
        );

        it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
            "FT.SEARCH binary on JSON",
            async (protocol) => {
                client = await GlideClusterClient.createClient(
                    getClientConfigurationOption(
                        cluster.getAddresses(),
                        protocol,
                    ),
                );

                const prefix = "{" + uuidv4() + "}:";
                const index = prefix + "index";
                const query = "*";

                // set string values
                expect(
                    await GlideJson.set(
                        client,
                        prefix + "1",
                        "$",
                        '[{"arr": 42}, {"val": "hello"}, {"val": "world"}]',
                    ),
                ).toEqual("OK");

                // setup a json index:
                expect(
                    await GlideFt.create(
                        client,
                        index,
                        [
                            {
                                type: "NUMERIC",
                                name: "$..arr",
                                alias: "arr",
                            },
                            {
                                type: "TEXT",
                                name: "$..val",
                                alias: "val",
                            },
                        ],
                        {
                            dataType: "JSON",
                            prefixes: [prefix],
                        },
                    ),
                ).toEqual("OK");

                // let server digest the data and update index
                const sleep = new Promise((resolve) =>
                    setTimeout(resolve, DATA_PROCESSING_TIMEOUT),
                );
                await sleep;

                const optionsWithLimit: FtSearchOptions = {
                    returnFields: [
                        { fieldIdentifier: "$..arr", alias: "myarr" },
                        { fieldIdentifier: "$..val", alias: "myval" },
                    ],
                    timeout: 10000,
                    limit: { offset: 0, count: 2 },
                };
                const stringResult: FtSearchReturnType = await GlideFt.search(
                    client,
                    index,
                    query,
                    optionsWithLimit,
                );
                const expectedStringResult: FtSearchReturnType = [
                    1,
                    [
                        {
                            key: prefix + "1",
                            value: [
                                {
                                    key: "myarr",
                                    value: "42",
                                },
                                {
                                    key: "myval",
                                    value: "hello",
                                },
                            ],
                        },
                    ],
                ];
                expect(stringResult).toEqual(expectedStringResult);

                const stringProfileResult: [
                    FtSearchReturnType,
                    Record<string, number>,
                ] = await GlideFt.profileSearch(
                    client,
                    index,
                    query,
                    optionsWithLimit,
                );
                // profile metrics and categories are subject to change
                expect(stringProfileResult[1]).toBeTruthy();
                expect(stringProfileResult[0]).toEqual(expectedStringResult);
            },
        );

        it("FT.EXPLAIN ft.explain FT.EXPLAINCLI ft.explaincli", async () => {
            client = await GlideClusterClient.createClient(
                getClientConfigurationOption(
                    cluster.getAddresses(),
                    ProtocolVersion.RESP3,
                ),
            );

            const index = uuidv4();
            expect(
                await GlideFt.create(client, index, [
                    { type: "NUMERIC", name: "price" },
                    { type: "TEXT", name: "title" },
                ]),
            ).toEqual("OK");

            let explain = await GlideFt.explain(
                client,
                Buffer.from(index),
                "@price:[0 10]",
            );
            expect(explain).toContain("price");
            expect(explain).toContain("10");

            explain = (
                (await GlideFt.explain(client, index, "@price:[0 10]", {
                    decoder: Decoder.Bytes,
                })) as Buffer
            ).toString();
            expect(explain).toContain("price");
            expect(explain).toContain("10");

            explain = await GlideFt.explain(client, index, "*");
            expect(explain).toContain("*");

            let explaincli = (
                await GlideFt.explaincli(
                    client,
                    Buffer.from(index),
                    "@price:[0 10]",
                )
            ).map((s) => (s as string).trim());
            expect(explaincli).toContain("price");
            expect(explaincli).toContain("0");
            expect(explaincli).toContain("10");

            explaincli = (
                await GlideFt.explaincli(client, index, "@price:[0 10]", {
                    decoder: Decoder.Bytes,
                })
            ).map((s) => (s as Buffer).toString().trim());
            expect(explaincli).toContain("price");
            expect(explaincli).toContain("0");
            expect(explaincli).toContain("10");

            expect(await GlideFt.dropindex(client, index)).toEqual("OK");
            // querying a missing index
            await expect(GlideFt.explain(client, index, "*")).rejects.toThrow(
                "Index not found",
            );
            await expect(
                GlideFt.explaincli(client, index, "*"),
            ).rejects.toThrow("Index not found");
        });

        it("FT.ALIASADD, FT.ALIASUPDATE and FT.ALIASDEL test", async () => {
            client = await GlideClusterClient.createClient(
                getClientConfigurationOption(
                    cluster.getAddresses(),
                    ProtocolVersion.RESP3,
                ),
            );
            const index = uuidv4();
            const alias = uuidv4() + "-alias";

            // Create an index.
            expect(
                await GlideFt.create(client, index, [
                    { type: "NUMERIC", name: "published_at" },
                    { type: "TAG", name: "category" },
                ]),
            ).toEqual("OK");
            // Check if the index created successfully.
            expect(await client.customCommand(["FT._LIST"])).toContain(index);

            // Add an alias to the index.
            expect(await GlideFt.aliasadd(client, index, alias)).toEqual("OK");

            const newIndex = uuidv4();
            const newAlias = uuidv4();

            // Create a second index.
            expect(
                await GlideFt.create(client, newIndex, [
                    { type: "NUMERIC", name: "published_at" },
                    { type: "TAG", name: "category" },
                ]),
            ).toEqual("OK");
            // Check if the second index created successfully.
            expect(await client.customCommand(["FT._LIST"])).toContain(
                newIndex,
            );

            // Add an alias to second index and also test addalias for bytes type input.
            expect(
                await GlideFt.aliasadd(
                    client,
                    Buffer.from(newIndex),
                    Buffer.from(newAlias),
                ),
            ).toEqual("OK");

            // Test if updating an already existing alias to point to an existing index returns "OK".
            expect(await GlideFt.aliasupdate(client, newAlias, index)).toEqual(
                "OK",
            );
            // Test alias update for byte type input.
            expect(
                await GlideFt.aliasupdate(
                    client,
                    Buffer.from(alias),
                    Buffer.from(newIndex),
                ),
            ).toEqual("OK");

            // Test if an existing alias is deleted successfully.
            expect(await GlideFt.aliasdel(client, alias)).toEqual("OK");

            // Test if an existing alias is deleted successfully for bytes type input.
            expect(
                await GlideFt.aliasdel(client, Buffer.from(newAlias)),
            ).toEqual("OK");

            // Drop both indexes.
            expect(await GlideFt.dropindex(client, index)).toEqual("OK");
            expect(await client.customCommand(["FT._LIST"])).not.toContain(
                index,
            );
            expect(await GlideFt.dropindex(client, newIndex)).toEqual("OK");
            expect(await client.customCommand(["FT._LIST"])).not.toContain(
                newIndex,
            );
        });

        it("FT._ALIASLIST test", async () => {
            client = await GlideClusterClient.createClient(
                getClientConfigurationOption(
                    cluster.getAddresses(),
                    ProtocolVersion.RESP3,
                ),
            );
            const index1 = uuidv4();
            const alias1 = uuidv4() + "-alias";
            const index2 = uuidv4();
            const alias2 = uuidv4() + "-alias";

            //Create the 2 test indexes.
            expect(
                await GlideFt.create(client, index1, [
                    { type: "NUMERIC", name: "published_at" },
                    { type: "TAG", name: "category" },
                ]),
            ).toEqual("OK");
            expect(
                await GlideFt.create(client, index2, [
                    { type: "NUMERIC", name: "published_at" },
                    { type: "TAG", name: "category" },
                ]),
            ).toEqual("OK");

            //Check if the two indexes created successfully.
            expect(await client.customCommand(["FT._LIST"])).toContain(index1);
            expect(await client.customCommand(["FT._LIST"])).toContain(index2);

            //Add aliases to the 2 indexes.
            expect(await GlideFt.aliasadd(client, index1, alias1)).toBe("OK");
            expect(await GlideFt.aliasadd(client, index2, alias2)).toBe("OK");

            //Test if the aliaslist command return the added alias.
            const result = await GlideFt.aliaslist(client);
            const expected: GlideRecord<GlideString> = [
                {
                    key: alias2,
                    value: index2,
                },
                {
                    key: alias1,
                    value: index1,
                },
            ];

            const compareFunction = function (
                a: { key: GlideString; value: GlideString },
                b: { key: GlideString; value: GlideString },
            ) {
                return a.key.toString().localeCompare(b.key.toString()) > 0
                    ? 1
                    : -1;
            };

            expect(result.sort(compareFunction)).toEqual(
                expected.sort(compareFunction),
            );
        });
    });
});
