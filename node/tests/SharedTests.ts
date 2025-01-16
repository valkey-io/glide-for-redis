/**
 * Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0
 */

// This file contains tests common for standalone and cluster clients, it covers API defined in
// BaseClient.ts - commands which manipulate with keys.
// Each test cases has access to a client instance and, optionally, to a cluster - object, which
// represents a running server instance. See first 2 test cases as examples.

import { expect, it } from "@jest/globals";
import { v4 as uuidv4 } from "uuid";
import {
    BaseClientConfiguration,
    BitFieldGet,
    BitFieldIncrBy,
    BitFieldOverflow,
    BitFieldSet,
    BitOffset,
    BitOffsetMultiplier,
    BitOverflowControl,
    BitmapIndexType,
    BitwiseOperation,
    ClusterTransaction,
    ConditionalChange,
    Decoder,
    ExpireOptions,
    FlushMode,
    GeoUnit,
    GeospatialData,
    GlideClient,
    GlideClusterClient,
    GlideRecord,
    GlideReturnType,
    GlideString,
    HashDataType,
    InfBoundary,
    InfoOptions,
    InsertPosition,
    ListDirection,
    ProtocolVersion,
    RequestError,
    ScoreFilter,
    Script,
    SignedEncoding,
    SingleNodeRoute,
    SortOrder,
    SortedSetDataType,
    TimeUnit,
    Transaction,
    UnsignedEncoding,
    UpdateByScore,
    convertElementsAndScores,
    convertFieldsAndValuesToHashDataType,
    convertGlideRecordToRecord,
    parseInfoResponse,
} from "..";
import { ValkeyCluster } from "../../utils/TestUtils";
import { Client, GetAndSetRandomValue, getFirstResult } from "./TestUtilities";

export type BaseClient = GlideClient | GlideClusterClient;

// Same as `BaseClientConfiguration`, but all fields are optional
export type ClientConfig = Partial<BaseClientConfiguration>;

export function runBaseTests(config: {
    init: (
        protocol: ProtocolVersion,
        configOverrides?: ClientConfig,
    ) => Promise<{
        client: BaseClient;
        cluster: ValkeyCluster;
    }>;
    close: (testSucceeded: boolean) => void;
    timeout?: number;
}) {
    runCommonTests({
        init: () => config.init(ProtocolVersion.RESP2),
        close: config.close,
        timeout: config.timeout,
    });

    const runTest = async (
        test: (client: BaseClient, cluster: ValkeyCluster) => Promise<void>,
        protocol: ProtocolVersion,
        configOverrides?: ClientConfig,
    ) => {
        const { client, cluster } = await config.init(
            protocol,
            configOverrides,
        );
        let testSucceeded = false;

        try {
            await test(client, cluster);
            testSucceeded = true;
        } finally {
            config.close(testSucceeded);
        }
    };

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `should register client library name and version_%p`,
        async (protocol) => {
            await runTest(
                async (client: BaseClient, cluster: ValkeyCluster) => {
                    if (cluster.checkIfServerVersionLessThan("7.2.0")) {
                        return;
                    }

                    const result = await client.customCommand([
                        "CLIENT",
                        "INFO",
                    ]);
                    expect(result).toContain("lib-name=GlideJS");
                    expect(result).toContain("lib-ver=unknown");
                },
                protocol,
            );
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `closed client raises error_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                client.close();

                await expect(client.set("foo", "bar")).rejects.toThrow(
                    "Unable to execute requests; the client is closed. Please create a new client.",
                );
            }, protocol);
        },
        config.timeout,
    );

    it(
        `Check protocol version is RESP3`,
        async () => {
            await runTest(async (client: BaseClient) => {
                const result = convertGlideRecordToRecord(
                    (await client.customCommand([
                        "HELLO",
                    ])) as GlideRecord<number>,
                );
                expect(result?.proto).toEqual(3);
            }, ProtocolVersion.RESP3);
        },
        config.timeout,
    );

    it(
        `Check possible to opt-in to RESP2`,
        async () => {
            await runTest(async (client: BaseClient) => {
                const result = convertGlideRecordToRecord(
                    (await client.customCommand([
                        "HELLO",
                    ])) as GlideRecord<number>,
                );
                expect(result?.proto).toEqual(2);
            }, ProtocolVersion.RESP2);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `Check client name is configured correctly_%p`,
        async (protocol) => {
            await runTest(
                async (client: BaseClient) => {
                    expect(await client.clientGetName()).toEqual("TEST_CLIENT");

                    if (client instanceof GlideClient) {
                        expect(
                            await client.clientGetName({
                                decoder: Decoder.Bytes,
                            }),
                        ).toEqual(Buffer.from("TEST_CLIENT"));
                    } else {
                        expect(
                            await client.clientGetName({
                                decoder: Decoder.Bytes,
                            }),
                        ).toEqual(Buffer.from("TEST_CLIENT"));
                    }
                },
                protocol,
                { clientName: "TEST_CLIENT" },
            );
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `custom command works_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = uuidv4();
                // Adding random repetition, to prevent the inputs from always having the same alignment.
                const value = uuidv4() + "0".repeat(Math.random() * 7);
                const setResult = await client.customCommand([
                    "SET",
                    key,
                    value,
                ]);
                expect(setResult).toEqual("OK");
                const result = await client.customCommand(["GET", key]);
                expect(result).toEqual(value);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `getting array return value works_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = "{key}" + uuidv4();
                const key2 = "{key}" + uuidv4();
                const key3 = "{key}" + uuidv4();
                // Adding random repetition, to prevent the inputs from always having the same alignment.
                const value1 = uuidv4() + "0".repeat(Math.random() * 7);
                const value2 = uuidv4() + "0".repeat(Math.random() * 7);
                const setResult1 = await client.customCommand([
                    "SET",
                    key1,
                    value1,
                ]);
                expect(setResult1).toEqual("OK");
                const setResult2 = await client.customCommand([
                    "SET",
                    key2,
                    value2,
                ]);
                expect(setResult2).toEqual("OK");
                const mget_result = await client.customCommand([
                    "MGET",
                    key1,
                    key2,
                    key3,
                ]);
                expect(mget_result).toEqual([value1, value2, null]);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `delete multiple existing keys and an non existing key_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = "{key}" + uuidv4();
                const key2 = "{key}" + uuidv4();
                const key3 = "{key}" + uuidv4();
                const value = uuidv4();
                let result = await client.set(key1, value);
                expect(result).toEqual("OK");
                result = await client.set(key2, value);
                expect(result).toEqual("OK");
                result = await client.set(key3, value);
                expect(result).toEqual("OK");
                let deletedKeysNum = await client.del([
                    key1,
                    Buffer.from(key2),
                    key3,
                ]);
                expect(deletedKeysNum).toEqual(3);
                deletedKeysNum = await client.del([uuidv4()]);
                expect(deletedKeysNum).toEqual(0);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `testing clientGetName_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                expect(await client.clientGetName()).toBeNull();
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `test config rewrite_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const serverInfo = await client.info([InfoOptions.Server]);
                const conf_file = parseInfoResponse(
                    getFirstResult(serverInfo).toString(),
                )["config_file"];

                if (conf_file.length > 0) {
                    expect(await client.configRewrite()).toEqual("OK");
                } else {
                    /// We expect Valkey to return an error since the test cluster doesn't use redis.conf file
                    await expect(client.configRewrite()).rejects.toThrow(
                        "The server is running without a config file",
                    );
                }
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `info stats before and after Config ResetStat is different_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                /// we execute set and info so the commandstats will show `cmdstat_set::calls` greater than 1
                /// after the configResetStat call we initiate an info command and the the commandstats won't contain `cmdstat_set`.
                await client.set("foo", "bar");
                const oldResult =
                    client instanceof GlideClient
                        ? await client.info([InfoOptions.Commandstats])
                        : Object.values(
                              await client.info({
                                  sections: [InfoOptions.Commandstats],
                              }),
                          ).join();
                expect(oldResult).toContain("cmdstat_set");
                expect(await client.configResetStat()).toEqual("OK");

                const result =
                    client instanceof GlideClient
                        ? await client.info([InfoOptions.Commandstats])
                        : Object.values(
                              await client.info({
                                  sections: [InfoOptions.Commandstats],
                              }),
                          ).join();
                expect(result).not.toContain("cmdstat_set");
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        "lastsave %p",
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const today = new Date();
                today.setDate(today.getDate() - 1);
                const yesterday = today.getTime() / 1000; // as epoch time

                expect(await client.lastsave()).toBeGreaterThan(yesterday);

                if (client instanceof GlideClusterClient) {
                    Object.values(
                        await client.lastsave({ route: "allNodes" }),
                    ).forEach((v) => expect(v).toBeGreaterThan(yesterday));
                }

                const response =
                    client instanceof GlideClient
                        ? await client.exec(new Transaction().lastsave())
                        : await client.exec(
                              new ClusterTransaction().lastsave(),
                          );
                expect(response?.[0]).toBeGreaterThan(yesterday);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `testing mset and mget with multiple existing keys and one non existing key_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = uuidv4();
                const key2 = uuidv4();
                const key3 = uuidv4();
                const value = uuidv4();
                const keyValueList = [
                    { key: key1, value },
                    { key: key2, value },
                    { key: key3, value },
                ];

                expect(await client.mset(keyValueList)).toEqual("OK");
                expect(
                    await client.mget([key1, key2, "nonExistingKey", key3]),
                ).toEqual([value, value, null, value]);

                //mget & mset with binary buffers
                const key1Encoded = Buffer.from(key1);
                const key3Encoded = Buffer.from(key3);
                const valueEncoded = Buffer.from(value);
                const keyValueListEncoded: GlideRecord<GlideString> = [
                    { key: key1Encoded, value: valueEncoded },
                    { key: key2, value },
                    { key: key3Encoded, value: valueEncoded },
                ];

                expect(await client.mset(keyValueListEncoded)).toEqual("OK");
                expect(
                    await client.mget(
                        [key1Encoded, key2, "nonExistingKey", key3Encoded],
                        {
                            decoder: Decoder.Bytes,
                        },
                    ),
                ).toEqual([valueEncoded, valueEncoded, null, valueEncoded]);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `msetnx test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = "{key}-1" + uuidv4();
                const key2 = "{key}-2" + uuidv4();
                const key3 = "{key}-3" + uuidv4();
                const nonExistingKey = uuidv4();
                const value = uuidv4();
                const keyValueMap1 = {
                    [key1]: value,
                    [key2]: value,
                };
                const key2Encoded = Buffer.from(key2);
                const valueEncoded = Buffer.from(value);
                const keyValueMap2 = [
                    { key: key2Encoded, value: valueEncoded },
                    { key: key3, value: valueEncoded },
                ];

                expect(await client.msetnx(keyValueMap1)).toEqual(true);

                expect(await client.mget([key1, key2, nonExistingKey])).toEqual(
                    [value, value, null],
                );

                expect(await client.msetnx(keyValueMap2)).toEqual(false);

                expect(await client.get(key3)).toEqual(null);
                expect(await client.get(key2)).toEqual(value);

                // empty map and RequestError is thrown
                const emptyMap = {};
                await expect(client.msetnx(emptyMap)).rejects.toThrow(
                    RequestError,
                );
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `incr, incrBy and incrByFloat with existing key_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = uuidv4();
                const keyEncoded = Buffer.from(key);
                expect(await client.set(key, "10")).toEqual("OK");
                expect(await client.incr(key)).toEqual(11);
                expect(await client.incr(keyEncoded)).toEqual(12);
                expect(await client.get(key)).toEqual("12");
                expect(await client.incrBy(key, 4)).toEqual(16);
                expect(await client.incrBy(keyEncoded, 1)).toEqual(17);
                expect(await client.get(key)).toEqual("17");
                expect(await client.incrByFloat(key, 1.5)).toEqual(18.5);
                expect(await client.incrByFloat(key, 1.5)).toEqual(20);
                expect(await client.get(key)).toEqual("20");
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `incr, incrBy and incrByFloat with non existing key_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = uuidv4();
                const key2 = uuidv4();
                const key3 = uuidv4();
                /// key1 and key2 does not exist, so it set to 0 before performing the operation.
                expect(await client.incr(key1)).toEqual(1);
                expect(await client.get(key1)).toEqual("1");
                expect(await client.incrBy(key2, 2)).toEqual(2);
                expect(await client.get(key2)).toEqual("2");
                expect(await client.incrByFloat(key3, -0.5)).toEqual(-0.5);
                expect(await client.get(key3)).toEqual("-0.5");
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `incr, incrBy and incrByFloat with a key that contains a value of string that can not be represented as integer_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = uuidv4();
                expect(await client.set(key, "foo")).toEqual("OK");

                await expect(client.incr(key)).rejects.toThrow(
                    "value is not an integer",
                );

                await expect(client.incrBy(key, 1)).rejects.toThrow(
                    "value is not an integer",
                );
                await expect(client.incrByFloat(key, 1.5)).rejects.toThrow(
                    "value is not a valid float",
                );
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `ping test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const pongEncoded = Buffer.from("PONG");
                expect(await client.ping()).toEqual("PONG");
                expect(await client.ping({ message: "Hello" })).toEqual(
                    "Hello",
                );
                expect(
                    await client.ping({
                        message: pongEncoded,
                        decoder: Decoder.String,
                    }),
                ).toEqual("PONG");
                expect(await client.ping({ decoder: Decoder.Bytes })).toEqual(
                    pongEncoded,
                );
                expect(
                    await client.ping({
                        message: "Hello",
                        decoder: Decoder.Bytes,
                    }),
                ).toEqual(Buffer.from("Hello"));
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `clientId test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                expect(getFirstResult(await client.clientId())).toBeGreaterThan(
                    0,
                );
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `decr and decrBy existing key_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = uuidv4();
                const keyEncoded = Buffer.from(key);
                expect(await client.set(key, "10")).toEqual("OK");
                expect(await client.decr(key)).toEqual(9);
                expect(await client.decr(keyEncoded)).toEqual(8);
                expect(await client.get(key)).toEqual("8");
                expect(await client.decrBy(key, 4)).toEqual(4);
                expect(await client.decrBy(keyEncoded, 1)).toEqual(3);
                expect(await client.get(key)).toEqual("3");
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `decr and decrBy with non existing key_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = uuidv4();
                const key2 = uuidv4();
                /// key1 and key2 does not exist, so it set to 0 before performing the operation.
                expect(await client.get(key1)).toBeNull();
                expect(await client.decr(key1)).toEqual(-1);
                expect(await client.get(key1)).toEqual("-1");
                expect(await client.get(key2)).toBeNull();
                expect(await client.decrBy(key2, 3)).toEqual(-3);
                expect(await client.get(key2)).toEqual("-3");
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `decr and decrBy with a key that contains a value of string that can not be represented as integer_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = uuidv4();
                expect(await client.set(key, "foo")).toEqual("OK");

                await expect(client.decr(key)).rejects.toThrow(
                    "value is not an integer",
                );

                await expect(client.decrBy(key, 3)).rejects.toThrow(
                    "value is not an integer",
                );
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `bitop test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = `{key}-${uuidv4()}`;
                const key2 = `{key}-${uuidv4()}`;
                const key3 = `{key}-${uuidv4()}`;
                const keys = [key1, key2];
                const keysEncoded = [Buffer.from(key1), Buffer.from(key2)];
                const destination = `{key}-${uuidv4()}`;
                const nonExistingKey1 = `{key}-${uuidv4()}`;
                const nonExistingKey2 = `{key}-${uuidv4()}`;
                const nonExistingKey3 = `{key}-${uuidv4()}`;
                const nonExistingKeys = [
                    nonExistingKey1,
                    nonExistingKey2,
                    nonExistingKey3,
                ];
                const setKey = `{key}-${uuidv4()}`;
                const value1 = "foobar";
                const value2 = "abcdef";

                expect(await client.set(key1, value1)).toEqual("OK");
                expect(await client.set(key2, value2)).toEqual("OK");
                expect(
                    await client.bitop(BitwiseOperation.AND, destination, keys),
                ).toEqual(6);
                expect(await client.get(destination)).toEqual("`bc`ab");
                expect(
                    await client.bitop(
                        BitwiseOperation.OR,
                        destination,
                        keysEncoded,
                    ),
                ).toEqual(6);
                expect(await client.get(destination)).toEqual("goofev");

                // reset values for simplicity of results in XOR
                expect(await client.set(key1, "a")).toEqual("OK");
                expect(await client.set(key2, "b")).toEqual("OK");
                expect(
                    await client.bitop(BitwiseOperation.XOR, destination, keys),
                ).toEqual(1);
                expect(await client.get(destination)).toEqual("\u0003");

                // test single source key
                expect(
                    await client.bitop(BitwiseOperation.AND, destination, [
                        key1,
                    ]),
                ).toEqual(1);
                expect(await client.get(destination)).toEqual("a");
                expect(
                    await client.bitop(BitwiseOperation.OR, destination, [
                        key1,
                    ]),
                ).toEqual(1);
                expect(await client.get(destination)).toEqual("a");
                expect(
                    await client.bitop(BitwiseOperation.XOR, destination, [
                        key1,
                    ]),
                ).toEqual(1);
                expect(await client.get(destination)).toEqual("a");

                // Sets to a string (not a space character) with value 11000010 10011110.
                expect(await client.set(key3, "")).toEqual("OK");
                expect(await client.getbit(key3, 0)).toEqual(1);
                expect(
                    await client.bitop(BitwiseOperation.NOT, destination, [
                        key3,
                    ]),
                ).toEqual(2);
                // Value becomes 00111101 01100001.
                expect(await client.get(destination)).toEqual("=a");

                expect(await client.setbit(key1, 0, 1)).toEqual(0);
                expect(
                    await client.bitop(BitwiseOperation.NOT, destination, [
                        key1,
                    ]),
                ).toEqual(1);
                expect(await client.get(destination)).toEqual("\u001e");

                // stores null when all keys hold empty strings
                expect(
                    await client.bitop(
                        BitwiseOperation.AND,
                        destination,
                        nonExistingKeys,
                    ),
                ).toEqual(0);
                expect(await client.get(destination)).toBeNull();
                expect(
                    await client.bitop(
                        BitwiseOperation.OR,
                        destination,
                        nonExistingKeys,
                    ),
                ).toEqual(0);
                expect(await client.get(destination)).toBeNull();
                expect(
                    await client.bitop(
                        BitwiseOperation.XOR,
                        destination,
                        nonExistingKeys,
                    ),
                ).toEqual(0);
                expect(await client.get(destination)).toBeNull();
                expect(
                    await client.bitop(BitwiseOperation.NOT, destination, [
                        nonExistingKey1,
                    ]),
                ).toEqual(0);
                expect(await client.get(destination)).toBeNull();

                // invalid argument - source key list cannot be empty
                await expect(
                    client.bitop(BitwiseOperation.OR, destination, []),
                ).rejects.toThrow(RequestError);

                // invalid arguments - NOT cannot be passed more than 1 key
                await expect(
                    client.bitop(BitwiseOperation.NOT, destination, keys),
                ).rejects.toThrow(RequestError);

                expect(await client.sadd(setKey, ["foo"])).toEqual(1);
                // invalid argument - source key has the wrong type
                await expect(
                    client.bitop(BitwiseOperation.AND, destination, [setKey]),
                ).rejects.toThrow(RequestError);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `getbit test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = `{key}-${uuidv4()}`;
                const nonExistingKey = `{key}-${uuidv4()}`;
                const setKey = `{key}-${uuidv4()}`;

                expect(await client.set(key, "foo")).toEqual("OK");
                expect(await client.getbit(key, 1)).toEqual(1);
                // When offset is beyond the string length, the string is assumed to be a contiguous space with 0 bits.
                expect(await client.getbit(Buffer.from(key), 1000)).toEqual(0);
                // When key does not exist it is assumed to be an empty string, so offset is always out of range and the
                // value is also assumed to be a contiguous space with 0 bits.
                expect(await client.getbit(nonExistingKey, 1)).toEqual(0);

                // invalid argument - offset can't be negative
                await expect(client.getbit(key, -1)).rejects.toThrow(
                    RequestError,
                );

                // key exists, but it is not a string
                expect(await client.sadd(setKey, ["foo"])).toEqual(1);
                await expect(client.getbit(setKey, 0)).rejects.toThrow(
                    RequestError,
                );
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `setbit test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = `{key}-${uuidv4()}`;
                const setKey = `{key}-${uuidv4()}`;

                expect(await client.setbit(key, 1, 1)).toEqual(0);
                expect(await client.setbit(Buffer.from(key), 1, 0)).toEqual(1);

                // invalid argument - offset can't be negative
                await expect(client.setbit(key, -1, 1)).rejects.toThrow(
                    RequestError,
                );

                // invalid argument - "value" arg must be 0 or 1
                await expect(client.setbit(key, 0, 2)).rejects.toThrow(
                    RequestError,
                );

                // key exists, but it is not a string
                expect(await client.sadd(setKey, ["foo"])).toEqual(1);
                await expect(client.setbit(setKey, 0, 0)).rejects.toThrow(
                    RequestError,
                );
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `bitpos test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient, cluster) => {
                const key = `{key}-${uuidv4()}`;
                const nonExistingKey = `{key}-${uuidv4()}`;
                const setKey = `{key}-${uuidv4()}`;
                const value = "?f0obar"; // 00111111 01100110 00110000 01101111 01100010 01100001 01110010

                expect(await client.set(key, value)).toEqual("OK");
                expect(await client.bitpos(key, 0)).toEqual(0);
                expect(await client.bitpos(Buffer.from(key), 1)).toEqual(2);
                expect(await client.bitpos(key, 1, { start: 1 })).toEqual(9);
                expect(
                    await client.bitpos(key, 0, { start: 3, end: 5 }),
                ).toEqual(24);

                expect(
                    await client.bitpos(Buffer.from(key), 0, {
                        start: 3,
                        end: 5,
                    }),
                ).toEqual(24);

                // -1 is returned if start > end
                expect(
                    await client.bitpos(key, 0, { start: 1, end: 0 }),
                ).toEqual(-1);

                // `BITPOS` returns -1 for non-existing strings
                expect(await client.bitpos(nonExistingKey, 1)).toEqual(-1);
                expect(
                    await client.bitpos(nonExistingKey, 1, {
                        start: 3,
                        end: 5,
                    }),
                ).toEqual(-1);

                // invalid argument - bit value must be 0 or 1
                await expect(client.bitpos(key, 2)).rejects.toThrow(
                    RequestError,
                );
                await expect(
                    client.bitpos(key, 2, { start: 3, end: 5 }),
                ).rejects.toThrow(RequestError);

                // key exists, but it is not a string
                expect(await client.sadd(setKey, ["foo"])).toEqual(1);
                await expect(client.bitpos(setKey, 1)).rejects.toThrow(
                    RequestError,
                );
                await expect(
                    client.bitpos(setKey, 1, { start: 1, end: -1 }),
                ).rejects.toThrow(RequestError);

                if (cluster.checkIfServerVersionLessThan("7.0.0")) {
                    await expect(
                        client.bitpos(key, 1, {
                            start: 1,
                            end: -1,
                            indexType: BitmapIndexType.BYTE,
                        }),
                    ).rejects.toThrow(RequestError);
                    await expect(
                        client.bitpos(key, 1, {
                            start: 1,
                            end: -1,
                            indexType: BitmapIndexType.BIT,
                        }),
                    ).rejects.toThrow(RequestError);
                } else {
                    expect(
                        await client.bitpos(key, 0, {
                            start: 3,
                            end: 5,
                            indexType: BitmapIndexType.BYTE,
                        }),
                    ).toEqual(24);
                    expect(
                        await client.bitpos(key, 1, {
                            start: 43,
                            end: -2,
                            indexType: BitmapIndexType.BIT,
                        }),
                    ).toEqual(47);
                    expect(
                        await client.bitpos(nonExistingKey, 1, {
                            start: 3,
                            end: 5,
                            indexType: BitmapIndexType.BYTE,
                        }),
                    ).toEqual(-1);
                    expect(
                        await client.bitpos(nonExistingKey, 1, {
                            start: 3,
                            end: 5,
                            indexType: BitmapIndexType.BIT,
                        }),
                    ).toEqual(-1);

                    // -1 is returned if the bit value wasn't found
                    expect(
                        await client.bitpos(key, 1, {
                            start: -1,
                            end: -1,
                            indexType: BitmapIndexType.BIT,
                        }),
                    ).toEqual(-1);

                    // key exists, but it is not a string
                    await expect(
                        client.bitpos(setKey, 1, {
                            start: 1,
                            end: -1,
                            indexType: BitmapIndexType.BIT,
                        }),
                    ).rejects.toThrow(RequestError);
                }
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `bitfield test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = `{key}-${uuidv4()}`;
                const key2 = `{key}-${uuidv4()}`;
                const nonExistingKey = `{key}-${uuidv4()}`;
                const setKey = `{key}-${uuidv4()}`;
                const foobar = "foobar";
                const u2 = new UnsignedEncoding(2);
                const u7 = new UnsignedEncoding(7);
                const i3 = new SignedEncoding(3);
                const i8 = new SignedEncoding(8);
                const offset1 = new BitOffset(1);
                const offset5 = new BitOffset(5);
                const offset_multiplier4 = new BitOffsetMultiplier(4);
                const offset_multiplier8 = new BitOffsetMultiplier(8);
                const overflowSet = new BitFieldSet(u2, offset1, -10);
                const overflowGet = new BitFieldGet(u2, offset1);

                // binary value: 01100110 01101111 01101111 01100010 01100001 01110010
                expect(await client.set(key1, foobar)).toEqual("OK");

                // SET tests
                expect(
                    await client.bitfield(key1, [
                        // binary value becomes: 0(10)00110 01101111 01101111 01100010 01100001 01110010
                        new BitFieldSet(u2, offset1, 2),
                        // binary value becomes: 01000(011) 01101111 01101111 01100010 01100001 01110010
                        new BitFieldSet(i3, offset5, 3),
                        // binary value becomes: 01000011 01101111 01101111 0110(0010 010)00001 01110010
                        new BitFieldSet(u7, offset_multiplier4, 18),
                        // addressing with SET or INCRBY bits outside the current string length will enlarge the string,
                        // zero-padding it, as needed, for the minimal length needed, according to the most far bit touched.
                        //
                        // binary value becomes:
                        // 01000011 01101111 01101111 01100010 01000001 01110010 00000000 00000000 (00010100)
                        new BitFieldSet(i8, offset_multiplier8, 20),
                        new BitFieldGet(u2, offset1),
                        new BitFieldGet(i3, offset5),
                        new BitFieldGet(u7, offset_multiplier4),
                        new BitFieldGet(i8, offset_multiplier8),
                    ]),
                ).toEqual([3, -2, 19, 0, 2, 3, 18, 20]);

                // INCRBY tests
                expect(
                    await client.bitfield(Buffer.from(key1), [
                        // binary value becomes:
                        // 0(11)00011 01101111 01101111 01100010 01000001 01110010 00000000 00000000 00010100
                        new BitFieldIncrBy(u2, offset1, 1),
                        // binary value becomes:
                        // 01100(101) 01101111 01101111 01100010 01000001 01110010 00000000 00000000 00010100
                        new BitFieldIncrBy(i3, offset5, 2),
                        // binary value becomes:
                        // 01100101 01101111 01101111 0110(0001 111)00001 01110010 00000000 00000000 00010100
                        new BitFieldIncrBy(u7, offset_multiplier4, -3),
                        // binary value becomes:
                        // 01100101 01101111 01101111 01100001 11100001 01110010 00000000 00000000 (00011110)
                        new BitFieldIncrBy(i8, offset_multiplier8, 10),
                    ]),
                ).toEqual([3, -3, 15, 30]);

                // OVERFLOW WRAP is used by default if no OVERFLOW is specified
                expect(
                    await client.bitfield(key2, [
                        overflowSet,
                        new BitFieldOverflow(BitOverflowControl.WRAP),
                        overflowSet,
                        overflowGet,
                    ]),
                ).toEqual([0, 2, 2]);

                // OVERFLOW affects only SET or INCRBY after OVERFLOW subcommand
                expect(
                    await client.bitfield(key2, [
                        overflowSet,
                        new BitFieldOverflow(BitOverflowControl.SAT),
                        overflowSet,
                        overflowGet,
                        new BitFieldOverflow(BitOverflowControl.FAIL),
                        overflowSet,
                    ]),
                ).toEqual([2, 2, 3, null]);

                // if the key doesn't exist, the operation is performed as though the missing value was a string with all bits
                // set to 0.
                expect(
                    await client.bitfield(nonExistingKey, [
                        new BitFieldSet(
                            new UnsignedEncoding(2),
                            new BitOffset(3),
                            2,
                        ),
                    ]),
                ).toEqual([0]);

                // empty subcommands argument returns an empty list
                expect(await client.bitfield(key1, [])).toEqual([]);

                // invalid argument - offset must be >= 0
                await expect(
                    client.bitfield(key1, [
                        new BitFieldSet(
                            new UnsignedEncoding(5),
                            new BitOffset(-1),
                            1,
                        ),
                    ]),
                ).rejects.toThrow(RequestError);

                // invalid argument - encoding size must be > 0
                await expect(
                    client.bitfield(key1, [
                        new BitFieldSet(
                            new UnsignedEncoding(0),
                            new BitOffset(1),
                            1,
                        ),
                    ]),
                ).rejects.toThrow(RequestError);

                // invalid argument - unsigned encoding must be < 64
                await expect(
                    client.bitfield(key1, [
                        new BitFieldSet(
                            new UnsignedEncoding(64),
                            new BitOffset(1),
                            1,
                        ),
                    ]),
                ).rejects.toThrow(RequestError);

                // invalid argument - signed encoding must be < 65
                await expect(
                    client.bitfield(key1, [
                        new BitFieldSet(
                            new SignedEncoding(65),
                            new BitOffset(1),
                            1,
                        ),
                    ]),
                ).rejects.toThrow(RequestError);

                // key exists, but it is not a string
                expect(await client.sadd(setKey, [foobar])).toEqual(1);
                await expect(
                    client.bitfield(setKey, [
                        new BitFieldSet(
                            new SignedEncoding(3),
                            new BitOffset(1),
                            2,
                        ),
                    ]),
                ).rejects.toThrow(RequestError);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `bitfieldReadOnly test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient, cluster) => {
                if (cluster.checkIfServerVersionLessThan("6.0.0")) {
                    return;
                }

                const key = `{key}-${uuidv4()}`;
                const nonExistingKey = `{key}-${uuidv4()}`;
                const setKey = `{key}-${uuidv4()}`;
                const foobar = "foobar";
                const unsignedOffsetGet = new BitFieldGet(
                    new UnsignedEncoding(2),
                    new BitOffset(1),
                );

                // binary value: 01100110 01101111 01101111 01100010 01100001 01110010
                expect(await client.set(key, foobar)).toEqual("OK");
                expect(
                    await client.bitfieldReadOnly(key, [
                        // Get value in: 0(11)00110 01101111 01101111 01100010 01100001 01110010 00010100
                        unsignedOffsetGet,
                        // Get value in: 01100(110) 01101111 01101111 01100010 01100001 01110010 00010100
                        new BitFieldGet(
                            new SignedEncoding(3),
                            new BitOffset(5),
                        ),
                        // Get value in: 01100110 01101111 01101(111 0110)0010 01100001 01110010 00010100
                        new BitFieldGet(
                            new UnsignedEncoding(7),
                            new BitOffsetMultiplier(3),
                        ),
                        // Get value in: 01100110 01101111 (01101111) 01100010 01100001 01110010 00010100
                        new BitFieldGet(
                            new SignedEncoding(8),
                            new BitOffsetMultiplier(2),
                        ),
                    ]),
                ).toEqual([3, -2, 118, 111]);

                // offset is greater than current length of string: the operation is performed like the missing part all
                // consists of bits set to 0.
                expect(
                    await client.bitfieldReadOnly(Buffer.from(key), [
                        new BitFieldGet(
                            new UnsignedEncoding(3),
                            new BitOffset(100),
                        ),
                    ]),
                ).toEqual([0]);

                // similarly, if the key doesn't exist, the operation is performed as though the missing value was a string with
                // all bits set to 0.
                expect(
                    await client.bitfieldReadOnly(nonExistingKey, [
                        unsignedOffsetGet,
                    ]),
                ).toEqual([0]);

                // empty subcommands argument returns an empty list
                expect(await client.bitfieldReadOnly(key, [])).toEqual([]);

                // invalid argument - offset must be >= 0
                await expect(
                    client.bitfieldReadOnly(key, [
                        new BitFieldGet(
                            new UnsignedEncoding(5),
                            new BitOffset(-1),
                        ),
                    ]),
                ).rejects.toThrow(RequestError);

                // invalid argument - encoding size must be > 0
                await expect(
                    client.bitfieldReadOnly(key, [
                        new BitFieldGet(
                            new UnsignedEncoding(0),
                            new BitOffset(1),
                        ),
                    ]),
                ).rejects.toThrow(RequestError);

                // invalid argument - unsigned encoding must be < 64
                await expect(
                    client.bitfieldReadOnly(key, [
                        new BitFieldGet(
                            new UnsignedEncoding(64),
                            new BitOffset(1),
                        ),
                    ]),
                ).rejects.toThrow(RequestError);

                // invalid argument - signed encoding must be < 65
                await expect(
                    client.bitfieldReadOnly(key, [
                        new BitFieldGet(
                            new SignedEncoding(65),
                            new BitOffset(1),
                        ),
                    ]),
                ).rejects.toThrow(RequestError);

                // key exists, but it is not a string
                expect(await client.sadd(setKey, [foobar])).toEqual(1);
                await expect(
                    client.bitfieldReadOnly(setKey, [
                        new BitFieldGet(
                            new SignedEncoding(3),
                            new BitOffset(1),
                        ),
                    ]),
                ).rejects.toThrow(RequestError);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `config get and config set with multiple parameters_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient, cluster) => {
                const prevTimeout = (await client.configGet([
                    "timeout",
                ])) as Record<string, GlideString>;
                expect(await client.configSet({ timeout: "1000" })).toEqual(
                    "OK",
                );
                const currTimeout = (await client.configGet([
                    "timeout",
                ])) as Record<string, GlideString>;
                expect(currTimeout).toEqual({ timeout: "1000" });
                /// Revert to the pervious configuration
                expect(
                    await client.configSet({
                        timeout: prevTimeout["timeout"],
                    }),
                ).toEqual("OK");

                if (!cluster.checkIfServerVersionLessThan("7.0.0")) {
                    const prevTimeout = (await client.configGet([
                        "timeout",
                    ])) as Record<string, GlideString>;
                    const prevClusterNodeTimeout = (await client.configGet([
                        "cluster-node-timeout",
                    ])) as Record<string, GlideString>;
                    expect(
                        await client.configSet({
                            timeout: "1000",
                            "cluster-node-timeout": "16000",
                        }),
                    ).toEqual("OK");
                    const currParameterValues = (await client.configGet([
                        "timeout",
                        "cluster-node-timeout",
                    ])) as Record<string, GlideString>;
                    expect(currParameterValues).toEqual({
                        timeout: "1000",
                        "cluster-node-timeout": "16000",
                    });
                    /// Revert to the previous configuration
                    expect(
                        await client.configSet({
                            timeout: prevTimeout["timeout"],
                            "cluster-node-timeout":
                                prevClusterNodeTimeout["cluster-node-timeout"],
                        }),
                    ).toEqual("OK");
                }
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `getdel test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = uuidv4();
                const value1 = uuidv4();
                const value1Encoded = Buffer.from(value1);
                const key2 = uuidv4();

                expect(await client.set(key1, value1)).toEqual("OK");
                expect(await client.getdel(key1)).toEqual(value1);
                expect(await client.getdel(key1)).toEqual(null);

                expect(await client.set(key1, value1)).toEqual("OK");
                expect(
                    await client.getdel(key1, { decoder: Decoder.Bytes }),
                ).toEqual(value1Encoded);
                expect(
                    await client.getdel(key1, { decoder: Decoder.Bytes }),
                ).toEqual(null);

                // key isn't a string
                expect(await client.sadd(key2, ["a"])).toEqual(1);
                await expect(client.getdel(key2)).rejects.toThrow(RequestError);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `getrange test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = uuidv4();
                const nonStringKey = uuidv4();
                const valueEncoded = Buffer.from("This is a string");

                expect(await client.set(key, "This is a string")).toEqual("OK");
                expect(await client.getrange(key, 0, 3)).toEqual("This");
                expect(await client.getrange(key, -3, -1)).toEqual("ing");
                expect(await client.getrange(key, 0, -1)).toEqual(
                    "This is a string",
                );

                // range of binary buffer
                expect(await client.set(key, "This is a string")).toEqual("OK");
                expect(
                    await client.getrange(key, 0, 3, {
                        decoder: Decoder.Bytes,
                    }),
                ).toEqual(valueEncoded.subarray(0, 4));
                expect(
                    await client.getrange(key, -3, -1, {
                        decoder: Decoder.Bytes,
                    }),
                ).toEqual(valueEncoded.subarray(-3, valueEncoded.length));
                expect(
                    await client.getrange(key, 0, -1, {
                        decoder: Decoder.Bytes,
                    }),
                ).toEqual(valueEncoded.subarray(0, valueEncoded.length));

                // out of range
                expect(await client.getrange(key, 10, 100)).toEqual("string");
                expect(await client.getrange(key, -200, -3)).toEqual(
                    "This is a stri",
                );
                expect(await client.getrange(key, 100, 200)).toEqual("");

                // incorrect range
                expect(await client.getrange(key, -1, -3)).toEqual("");

                expect(await client.getrange(key, -200, -100)).toEqual("T");

                // empty key (returning null isn't implemented)
                expect(await client.getrange(nonStringKey, 0, -1)).toEqual("");

                // non-string key
                expect(await client.lpush(nonStringKey, ["_"])).toEqual(1);
                await expect(
                    client.getrange(nonStringKey, 0, -1),
                ).rejects.toThrow(RequestError);

                // unique chars key
                expect(await client.set(key, "爱和美力")).toEqual("OK");
                expect(await client.getrange(key, 0, 5)).toEqual("爱和");

                expect(await client.set(key, "😊🌸")).toEqual("OK");
                expect(await client.getrange(key, 4, 7)).toEqual("🌸");
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `testing hset and hget with multiple existing fields and one non existing field_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = uuidv4();
                const field1 = uuidv4();
                const field2 = uuidv4();
                const value = uuidv4();
                const fieldValueList: HashDataType = [
                    {
                        field: Buffer.from(field1),
                        value: Buffer.from(value),
                    },
                    {
                        field: Buffer.from(field2),
                        value: Buffer.from(value),
                    },
                ];

                const valueEncoded = Buffer.from(value);

                expect(await client.hset(key, fieldValueList)).toEqual(2);
                expect(
                    await client.hget(Buffer.from(key), Buffer.from(field1)),
                ).toEqual(value);
                expect(await client.hget(key, field2)).toEqual(value);
                expect(await client.hget(key, "nonExistingField")).toEqual(
                    null,
                );

                //hget with binary buffer
                expect(
                    await client.hget(key, field1, { decoder: Decoder.Bytes }),
                ).toEqual(valueEncoded);
                expect(
                    await client.hget(key, field2, { decoder: Decoder.Bytes }),
                ).toEqual(valueEncoded);
                expect(
                    await client.hget(key, "nonExistingField", {
                        decoder: Decoder.Bytes,
                    }),
                ).toEqual(null);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `testing hkeys with exiting, an non exising key and error request key_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = uuidv4();
                const key2 = uuidv4();
                const field1 = uuidv4();
                const field2 = uuidv4();
                const value = uuidv4();
                const value2 = uuidv4();
                const fieldValueMap = {
                    [field1]: value,
                    [field2]: value2,
                };
                const field2Encoded = Buffer.from(field2);

                // set up hash with two keys/values
                expect(await client.hset(key, fieldValueMap)).toEqual(2);
                expect(await client.hkeys(key)).toEqual([field1, field2]);

                // remove one key
                expect(await client.hdel(key, [field1])).toEqual(1);
                expect(
                    await client.hkeys(Buffer.from(key), {
                        decoder: Decoder.Bytes,
                    }),
                ).toEqual([field2Encoded]);

                // non-existing key returns an empty list
                expect(await client.hkeys("nonExistingKey")).toEqual([]);

                // Key exists, but it is not a hash
                expect(await client.set(key2, value)).toEqual("OK");
                await expect(client.hkeys(key2)).rejects.toThrow();
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `hscan test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient, cluster) => {
                const key1 = "{key}-1" + uuidv4();
                const initialCursor = "0";
                const defaultCount = 20;
                const resultCursorIndex = 0;
                const resultCollectionIndex = 1;

                // Setup test data - use a large number of entries to force an iterative cursor.
                const numberMap: Record<string, string> = {};

                for (let i = 0; i < 50000; i++) {
                    numberMap[i.toString()] = "num" + i;
                }

                const charMembers = ["a", "b", "c", "d", "e"];
                const charMap: Record<string, string> = {};

                for (let i = 0; i < charMembers.length; i++) {
                    charMap[charMembers[i]] = i.toString();
                }

                // Result contains the whole set
                expect(await client.hset(key1, charMap)).toEqual(
                    charMembers.length,
                );
                let result = await client.hscan(key1, initialCursor);
                expect(result[resultCursorIndex]).toEqual(initialCursor);
                expect(result[resultCollectionIndex].length).toEqual(
                    Object.keys(charMap).length * 2, // Length includes the score which is twice the map size
                );

                const resultArray = result[resultCollectionIndex];
                const resultKeys = [];
                const resultValues: string[] = [];

                for (let i = 0; i < resultArray.length; i += 2) {
                    resultKeys.push(resultArray[i].toString());
                    resultValues.push(resultArray[i + 1].toString());
                }

                // Verify if all keys from charMap are in resultKeys
                const allKeysIncluded = resultKeys.every(
                    (key) => key in charMap,
                );
                expect(allKeysIncluded).toEqual(true);

                const allValuesIncluded = Object.values(charMap).every(
                    (value) => value in resultValues,
                );
                expect(allValuesIncluded).toEqual(true);

                // Test hscan with match
                result = await client.hscan(key1, initialCursor, {
                    match: "a",
                    decoder: Decoder.Bytes,
                });

                expect(result[resultCursorIndex]).toEqual(initialCursor);
                expect(result[resultCollectionIndex]).toEqual(
                    ["a", "0"].map(Buffer.from),
                );

                // Set up testing data with the numberMap set to be used for the next set test keys and test results.
                expect(await client.hset(Buffer.from(key1), numberMap)).toEqual(
                    Object.keys(numberMap).length,
                );

                let resultCursor = initialCursor;
                const secondResultAllKeys: string[] = [];
                const secondResultAllValues: string[] = [];
                let isFirstLoop = true;

                do {
                    result = await client.hscan(key1, resultCursor);
                    resultCursor = result[resultCursorIndex].toString();
                    const resultEntry = result[resultCollectionIndex];

                    for (let i = 0; i < resultEntry.length; i += 2) {
                        secondResultAllKeys.push(resultEntry[i].toString());
                        secondResultAllValues.push(
                            resultEntry[i + 1].toString(),
                        );
                    }

                    if (isFirstLoop) {
                        expect(resultCursor).not.toBe("0");
                        isFirstLoop = false;
                    } else if (resultCursor === initialCursor) {
                        break;
                    }

                    // Scan with result cursor has a different set
                    const secondResult = await client.hscan(key1, resultCursor);
                    const newResultCursor =
                        secondResult[resultCursorIndex].toString();
                    expect(resultCursor).not.toBe(newResultCursor);
                    resultCursor = newResultCursor;
                    const secondResultEntry =
                        secondResult[resultCollectionIndex];

                    expect(result[resultCollectionIndex]).not.toBe(
                        secondResult[resultCollectionIndex],
                    );

                    for (let i = 0; i < secondResultEntry.length; i += 2) {
                        secondResultAllKeys.push(
                            secondResultEntry[i].toString(),
                        );
                        secondResultAllValues.push(
                            secondResultEntry[i + 1].toString(),
                        );
                    }
                } while (resultCursor != initialCursor); // 0 is returned for the cursor of the last iteration.

                // Verify all data is found in hscan
                const allSecondResultKeys = Object.keys(numberMap).every(
                    (key) => key in secondResultAllKeys,
                );
                expect(allSecondResultKeys).toEqual(true);

                const allSecondResultValues = Object.keys(numberMap).every(
                    (value) => value in secondResultAllValues,
                );
                expect(allSecondResultValues).toEqual(true);

                // Test match pattern
                result = await client.hscan(key1, initialCursor, {
                    match: "*",
                });
                expect(result[resultCursorIndex]).not.toEqual(initialCursor);
                expect(
                    result[resultCollectionIndex].length,
                ).toBeGreaterThanOrEqual(defaultCount);

                // Test count
                result = await client.hscan(key1, initialCursor, {
                    count: 25,
                });
                expect(result[resultCursorIndex]).not.toEqual(initialCursor);
                expect(
                    result[resultCollectionIndex].length,
                ).toBeGreaterThanOrEqual(25);

                // Test count with match returns a non-empty list
                result = await client.hscan(key1, initialCursor, {
                    match: "1*",
                    count: 1000,
                });
                expect(result[resultCursorIndex]).not.toEqual(initialCursor);
                expect(result[resultCollectionIndex].length).toBeGreaterThan(0);

                if (!cluster.checkIfServerVersionLessThan("8.0.0")) {
                    const result = await client.hscan(key1, initialCursor, {
                        noValues: true,
                    });
                    const resultCursor = result[resultCursorIndex];
                    const fieldsArray = result[
                        resultCollectionIndex
                    ] as string[];

                    // Verify that the cursor is not "0" and values are not included
                    expect(resultCursor).not.toEqual("0");
                    expect(
                        fieldsArray.every((field) => !field.startsWith("num")),
                    ).toBeTruthy();
                }
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `hscan and sscan empty set, negative cursor, negative count, and non-hash key exception tests`,
        async (protocol) => {
            await runTest(
                async (client: BaseClient, cluster: ValkeyCluster) => {
                    const key1 = "{key}-1" + uuidv4();
                    const key2 = "{key}-2" + uuidv4();
                    const initialCursor = "0";
                    const resultCursorIndex = 0;
                    const resultCollectionIndex = 1;

                    // Empty set
                    let result = await client.hscan(key1, initialCursor);
                    expect(result[resultCursorIndex]).toEqual(initialCursor);
                    expect(result[resultCollectionIndex]).toEqual([]);

                    let result2 = await client.sscan(key1, initialCursor);
                    expect(result2[resultCursorIndex]).toEqual(initialCursor);
                    expect(result2[resultCollectionIndex]).toEqual([]);

                    // Negative cursor
                    if (cluster.checkIfServerVersionLessThan("8.0.0")) {
                        result = await client.hscan(key1, "-1");
                        expect(result[resultCursorIndex]).toEqual(
                            initialCursor,
                        );
                        expect(result[resultCollectionIndex]).toEqual([]);

                        result2 = await client.sscan(key1, "-1");
                        expect(result2[resultCursorIndex]).toEqual(
                            initialCursor,
                        );
                        expect(result2[resultCollectionIndex]).toEqual([]);
                    } else {
                        await expect(client.hscan(key1, "-1")).rejects.toThrow(
                            RequestError,
                        );
                        await expect(client.sscan(key1, "-1")).rejects.toThrow(
                            RequestError,
                        );
                    }

                    // Exceptions
                    // Non-hash key
                    expect(await client.set(key2, "test")).toEqual("OK");
                    await expect(
                        client.hscan(key2, initialCursor),
                    ).rejects.toThrow(RequestError);
                    await expect(
                        client.hscan(key2, initialCursor, {
                            match: "test",
                            count: 20,
                        }),
                    ).rejects.toThrow(RequestError);

                    await expect(
                        client.sscan(key2, initialCursor),
                    ).rejects.toThrow(RequestError);
                    await expect(
                        client.sscan(key2, initialCursor, {
                            match: "test",
                            count: 30,
                        }),
                    ).rejects.toThrow(RequestError);

                    // Negative count
                    await expect(
                        client.hscan(key2, initialCursor, {
                            count: -1,
                        }),
                    ).rejects.toThrow(RequestError);

                    await expect(
                        client.sscan(key2, initialCursor, {
                            count: -1,
                        }),
                    ).rejects.toThrow(RequestError);
                },
                protocol,
            );
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `encoder test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = uuidv4();
                const value = uuidv4();
                const valueEncoded = Buffer.from(value);

                expect(await client.set(key, value)).toEqual("OK");
                expect(await client.get(key)).toEqual(value);
                expect(
                    await client.get(key, { decoder: Decoder.Bytes }),
                ).toEqual(valueEncoded);
                expect(
                    await client.get(key, { decoder: Decoder.String }),
                ).toEqual(value);

                // Setting the encoded value. Should behave as the previous test since the default is String decoding.
                expect(await client.set(key, valueEncoded)).toEqual("OK");
                expect(await client.get(key)).toEqual(value);
                expect(
                    await client.get(key, { decoder: Decoder.Bytes }),
                ).toEqual(valueEncoded);
                expect(
                    await client.get(key, { decoder: Decoder.String }),
                ).toEqual(value);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `hdel multiple existing fields, an non existing field and an non existing key_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = uuidv4();
                const field1 = uuidv4();
                const field2 = uuidv4();
                const field3 = uuidv4();
                const value = uuidv4();
                const fieldValueMap = {
                    [field1]: value,
                    [field2]: value,
                    [field3]: value,
                };

                expect(await client.hset(key, fieldValueMap)).toEqual(3);
                expect(
                    await client.hdel(Buffer.from(key), [field1, field2]),
                ).toEqual(2);
                expect(await client.hdel(key, ["nonExistingField"])).toEqual(0);
                expect(await client.hdel("nonExistingKey", [field3])).toEqual(
                    0,
                );
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `testing hmget with multiple existing fields, an non existing field and an non existing key_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = uuidv4();
                const field1 = uuidv4();
                const field2 = uuidv4();
                const value = uuidv4();
                const fieldValueMap = {
                    [field1]: value,
                    [field2]: value,
                };
                expect(await client.hset(key, fieldValueMap)).toEqual(2);
                expect(
                    await client.hmget(key, [
                        field1,
                        "nonExistingField",
                        field2,
                    ]),
                ).toEqual([value, null, value]);
                expect(
                    await client.hmget(
                        Buffer.from("nonExistingKey"),
                        [field1, field2],
                        { decoder: Decoder.Bytes },
                    ),
                ).toEqual([null, null]);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `hexists existing field, an non existing field and an non existing key_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = uuidv4();
                const field1 = uuidv4();
                const field2 = uuidv4();
                const fieldValueMap = {
                    [field1]: "value1",
                    [field2]: "value2",
                };
                expect(await client.hset(key, fieldValueMap)).toEqual(2);
                expect(
                    await client.hexists(Buffer.from(key), Buffer.from(field1)),
                ).toEqual(true);
                expect(await client.hexists(key, "nonExistingField")).toEqual(
                    false,
                );
                expect(await client.hexists("nonExistingKey", field2)).toEqual(
                    false,
                );
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `hgetall with multiple fields in an existing key and one non existing key_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = uuidv4();
                const field1 = uuidv4();
                const field2 = uuidv4();
                const value = uuidv4();
                const fieldValueMap = {
                    [field1]: value,
                    [field2]: value,
                };
                expect(await client.hset(key, fieldValueMap)).toEqual(2);

                expect(await client.hgetall(key)).toEqual(
                    convertFieldsAndValuesToHashDataType({
                        [field1]: value,
                        [field2]: value,
                    }),
                );

                expect(
                    await client.hgetall(key, { decoder: Decoder.Bytes }),
                ).toEqual([
                    {
                        field: Buffer.from(field1),
                        value: Buffer.from(value),
                    },
                    {
                        field: Buffer.from(field2),
                        value: Buffer.from(value),
                    },
                ]);

                expect(
                    await client.hgetall(Buffer.from("nonExistingKey")),
                ).toEqual([]);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `hincrBy and hincrByFloat with existing key and field_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = uuidv4();
                const field = uuidv4();
                const fieldValueMap = {
                    [field]: "10",
                };
                expect(await client.hset(key, fieldValueMap)).toEqual(1);
                expect(await client.hincrBy(key, field, 1)).toEqual(11);
                expect(
                    await client.hincrBy(
                        Buffer.from(key),
                        Buffer.from(field),
                        4,
                    ),
                ).toEqual(15);
                expect(
                    await client.hincrByFloat(
                        Buffer.from(key),
                        Buffer.from(field),
                        1.5,
                    ),
                ).toEqual(16.5);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `hincrBy and hincrByFloat with non existing key and non existing field_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = uuidv4();
                const key2 = uuidv4();
                const field = uuidv4();
                const fieldValueMap = {
                    [field]: "10",
                };
                expect(
                    await client.hincrBy("nonExistingKey", field, 1),
                ).toEqual(1);
                expect(await client.hset(key1, fieldValueMap)).toEqual(1);
                expect(
                    await client.hincrBy(key1, "nonExistingField", 2),
                ).toEqual(2);
                expect(await client.hset(key2, fieldValueMap)).toEqual(1);
                expect(
                    await client.hincrByFloat(key2, "nonExistingField", -0.5),
                ).toEqual(-0.5);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `hincrBy and hincrByFloat with a field that contains a value of string that can not be represented as as integer or float_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = uuidv4();
                const field = uuidv4();
                const fieldValueMap = {
                    [field]: "foo",
                };
                expect(await client.hset(key, fieldValueMap)).toEqual(1);

                await expect(client.hincrBy(key, field, 2)).rejects.toThrow(
                    "hash value is not an integer",
                );
                await expect(
                    client.hincrByFloat(key, field, 1.5),
                ).rejects.toThrow("hash value is not a float");
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `hlen test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = uuidv4();
                const field1 = uuidv4();
                const field2 = uuidv4();
                const fieldValueList = [
                    {
                        field: field1,
                        value: "value1",
                    },
                    {
                        field: field2,
                        value: "value2",
                    },
                ];

                expect(await client.hset(key1, fieldValueList)).toEqual(2);
                expect(await client.hlen(key1)).toEqual(2);
                expect(await client.hdel(key1, [field1])).toEqual(1);
                expect(await client.hlen(Buffer.from(key1))).toEqual(1);
                expect(await client.hlen("nonExistingHash")).toEqual(0);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `hvals test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = uuidv4();
                const key2 = uuidv4();
                const field1 = uuidv4();
                const field2 = uuidv4();
                const fieldValueMap = {
                    [field1]: "value1",
                    [field2]: "value2",
                };
                const value1Encoded = Buffer.from("value1");
                const value2Encoded = Buffer.from("value2");

                expect(
                    await client.hset(Buffer.from(key1), fieldValueMap),
                ).toEqual(2);
                expect(await client.hvals(key1)).toEqual(["value1", "value2"]);
                expect(await client.hdel(key1, [field1])).toEqual(1);
                expect(await client.hvals(Buffer.from(key1))).toEqual([
                    "value2",
                ]);
                expect(await client.hvals("nonExistingHash")).toEqual([]);

                //hvals with binary buffers
                expect(await client.hset(key2, fieldValueMap)).toEqual(2);
                expect(
                    await client.hvals(key2, { decoder: Decoder.Bytes }),
                ).toEqual([value1Encoded, value2Encoded]);
                expect(await client.hdel(key2, [field1])).toEqual(1);
                expect(
                    await client.hvals(key2, { decoder: Decoder.Bytes }),
                ).toEqual([value2Encoded]);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `hsetnx test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = uuidv4();
                const key2 = uuidv4();
                const field = uuidv4();

                expect(await client.hsetnx(key1, field, "value")).toEqual(true);
                expect(
                    await client.hsetnx(
                        Buffer.from(key1),
                        Buffer.from(field),
                        "newValue",
                    ),
                ).toEqual(false);
                expect(await client.hget(key1, field)).toEqual("value");

                expect(await client.set(key2, "value")).toEqual("OK");
                await expect(
                    client.hsetnx(key2, field, "value"),
                ).rejects.toThrow();
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `hstrlen test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = uuidv4();
                const key2 = uuidv4();
                const field = uuidv4();

                expect(await client.hset(key1, { field: "value" })).toBe(1);
                expect(await client.hstrlen(key1, "field")).toBe(5);

                // missing value
                expect(await client.hstrlen(key1, "nonExistingField")).toBe(0);

                // missing key
                expect(await client.hstrlen(key2, "field")).toBe(0);

                // key exists but holds non hash type value
                expect(await client.set(key2, "value")).toEqual("OK");
                await expect(
                    client.hstrlen(Buffer.from(key2), Buffer.from(field)),
                ).rejects.toThrow(RequestError);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `hrandfield test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient, cluster) => {
                if (cluster.checkIfServerVersionLessThan("6.2.0")) {
                    return;
                }

                const key1 = uuidv4();
                const key2 = uuidv4();

                // key does not exist
                expect(
                    await client.hrandfield(Buffer.from(key1), {
                        decoder: Decoder.Bytes,
                    }),
                ).toBeNull();
                expect(await client.hrandfieldCount(key1, 5)).toEqual([]);
                expect(await client.hrandfieldWithValues(key1, 5)).toEqual([]);

                const data = { "f 1": "v 1", "f 2": "v 2", "f 3": "v 3" };
                const fields = Object.keys(data);
                const entries = Object.entries(data);
                const encodedFields = fields.map(Buffer.from);
                const encodedEntries = entries.map((e) => e.map(Buffer.from));
                expect(await client.hset(key1, data)).toEqual(3);

                expect(fields).toContain(await client.hrandfield(key1));

                // With Count - positive count
                let result = await client.hrandfieldCount(key1, 5);
                expect(result).toEqual(fields);

                // With Count - negative count
                result = await client.hrandfieldCount(Buffer.from(key1), -5, {
                    decoder: Decoder.Bytes,
                });
                expect(result.length).toEqual(5);
                result.map((r) => expect(encodedFields).toContainEqual(r));

                // With values - positive count
                let result2 = await client.hrandfieldWithValues(
                    Buffer.from(key1),
                    5,
                    { decoder: Decoder.Bytes },
                );
                expect(result2).toEqual(encodedEntries);

                // With values - negative count
                result2 = await client.hrandfieldWithValues(key1, -5);
                expect(result2.length).toEqual(5);
                result2.map((r) => expect(entries).toContainEqual(r));

                // key exists but holds non hash type value
                expect(await client.set(key2, "value")).toEqual("OK");
                await expect(client.hrandfield(key2)).rejects.toThrow(
                    RequestError,
                );
                await expect(client.hrandfieldCount(key2, 42)).rejects.toThrow(
                    RequestError,
                );
                await expect(
                    client.hrandfieldWithValues(key2, 42),
                ).rejects.toThrow(RequestError);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `lpush, lpop and lrange with existing and non existing key_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = uuidv4();
                const key2 = Buffer.from(uuidv4());
                const valueList1 = ["value4", "value3", "value2", "value1"];
                const valueList2 = ["value7", "value6", "value5"];
                const encodedValues = [
                    Buffer.from("value6"),
                    Buffer.from("value7"),
                ];
                expect(await client.lpush(key1, valueList1)).toEqual(4);
                expect(await client.lpop(key1)).toEqual("value1");
                expect(await client.lrange(key1, 0, -1)).toEqual([
                    "value2",
                    "value3",
                    "value4",
                ]);
                expect(await client.lpopCount(key1, 2)).toEqual([
                    "value2",
                    "value3",
                ]);
                expect(await client.lrange("nonExistingKey", 0, -1)).toEqual(
                    [],
                );
                expect(await client.lpop("nonExistingKey")).toEqual(null);
                expect(await client.lpush(key2, valueList2)).toEqual(3);
                expect(
                    await client.lpop(key2, { decoder: Decoder.Bytes }),
                ).toEqual(Buffer.from("value5"));
                expect(
                    await client.lrange(key2, 0, -1, {
                        decoder: Decoder.Bytes,
                    }),
                ).toEqual(encodedValues);
                expect(
                    await client.lpopCount(key2, 2, { decoder: Decoder.Bytes }),
                ).toEqual(encodedValues);
                expect(
                    await client.lpush(key2, [Buffer.from("value8")]),
                ).toEqual(1);
                expect(
                    await client.lpop(key2, { decoder: Decoder.Bytes }),
                ).toEqual(Buffer.from("value8"));
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `lpush, lpop and lrange with key that holds a value that is not a list_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = uuidv4();
                expect(await client.set(key, "foo")).toEqual("OK");

                await expect(client.lpush(key, ["bar"])).rejects.toThrow(
                    "Operation against a key holding the wrong kind of value",
                );
                await expect(client.lpop(key)).rejects.toThrow(
                    "Operation against a key holding the wrong kind of value",
                );
                await expect(client.lrange(key, 0, -1)).rejects.toThrow(
                    "Operation against a key holding the wrong kind of value",
                );
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `lpushx list_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = uuidv4();
                const key2 = uuidv4();
                const key3 = uuidv4();
                expect(await client.lpush(key1, ["0"])).toEqual(1);
                expect(await client.lpushx(key1, ["1", "2", "3"])).toEqual(4);
                expect(await client.lrange(key1, 0, -1)).toEqual([
                    "3",
                    "2",
                    "1",
                    "0",
                ]);

                expect(await client.lpushx(key2, ["1"])).toEqual(0);
                expect(await client.lrange(key2, 0, -1)).toEqual([]);

                // Key exists, but is not a list
                expect(await client.set(key3, "bar"));
                await expect(client.lpushx(key3, ["_"])).rejects.toThrow(
                    RequestError,
                );

                // Empty element list
                await expect(client.lpushx(key2, [])).rejects.toThrow(
                    RequestError,
                );

                // test for binary key as input
                const key4 = uuidv4();
                expect(await client.lpush(key4, ["0"])).toEqual(1);
                expect(
                    await client.lpushx(Buffer.from(key4), [
                        Buffer.from("1"),
                        Buffer.from("2"),
                        Buffer.from("3"),
                    ]),
                ).toEqual(4);
                expect(await client.lrange(key4, 0, -1)).toEqual([
                    "3",
                    "2",
                    "1",
                    "0",
                ]);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `llen with existing, non-existing key and key that holds a value that is not a list_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = uuidv4();
                const key2 = uuidv4();
                const valueList = ["value4", "value3", "value2", "value1"];
                expect(await client.lpush(key1, valueList)).toEqual(4);
                expect(await client.llen(key1)).toEqual(4);
                expect(await client.llen(Buffer.from(key1))).toEqual(4);

                expect(await client.llen("nonExistingKey")).toEqual(0);

                expect(await client.set(key2, "foo")).toEqual("OK");

                await expect(client.llen(key2)).rejects.toThrow(
                    "Operation against a key holding the wrong kind of value",
                );
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `lmove list_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient, cluster) => {
                if (cluster.checkIfServerVersionLessThan("6.2.0")) {
                    return;
                }

                const key1 = "{key}-1" + uuidv4();
                const key2 = "{key}-2" + uuidv4();
                const key1Encoded = Buffer.from("{key}-1" + uuidv4());
                const key2Encoded = Buffer.from("{key}-2" + uuidv4());
                const lpushArgs1 = ["2", "1"];
                const lpushArgs2 = ["4", "3"];

                // Initialize the tests
                expect(await client.lpush(key1, lpushArgs1)).toEqual(2);
                expect(await client.lpush(key2, lpushArgs2)).toEqual(2);
                expect(await client.lpush(key1Encoded, lpushArgs1)).toEqual(2);
                expect(await client.lpush(key2Encoded, lpushArgs2)).toEqual(2);

                // Move from LEFT to LEFT
                expect(
                    await client.lmove(
                        key1,
                        key2,
                        ListDirection.LEFT,
                        ListDirection.LEFT,
                    ),
                ).toEqual("1");

                // Move from LEFT to RIGHT
                expect(
                    await client.lmove(
                        key1,
                        key2,
                        ListDirection.LEFT,
                        ListDirection.RIGHT,
                    ),
                ).toEqual("2");

                expect(await client.lrange(key2, 0, -1)).toEqual([
                    "1",
                    "3",
                    "4",
                    "2",
                ]);
                expect(await client.lrange(key1, 0, -1)).toEqual([]);

                // Move from RIGHT to LEFT - non-existing destination key
                expect(
                    await client.lmove(
                        key2,
                        key1,
                        ListDirection.RIGHT,
                        ListDirection.LEFT,
                    ),
                ).toEqual("2");

                // Move from RIGHT to RIGHT
                expect(
                    await client.lmove(
                        key2,
                        key1,
                        ListDirection.RIGHT,
                        ListDirection.RIGHT,
                    ),
                ).toEqual("4");

                expect(await client.lrange(key2, 0, -1)).toEqual(["1", "3"]);
                expect(await client.lrange(key1, 0, -1)).toEqual(["2", "4"]);

                // Move from RIGHT to LEFT with encoded return value
                expect(
                    await client.lmove(
                        key1,
                        key2,
                        ListDirection.RIGHT,
                        ListDirection.LEFT,
                        { decoder: Decoder.Bytes },
                    ),
                ).toEqual(Buffer.from("4"));

                // Move from RIGHT to LEFT with encoded list keys
                expect(
                    await client.lmove(
                        key1Encoded,
                        key2Encoded,
                        ListDirection.RIGHT,
                        ListDirection.LEFT,
                    ),
                ).toEqual("2");

                // Non-existing source key
                expect(
                    await client.lmove(
                        "{key}-non_existing_key" + uuidv4(),
                        key1,
                        ListDirection.LEFT,
                        ListDirection.LEFT,
                    ),
                ).toEqual(null);

                // Non-list source key
                const key3 = "{key}-3" + uuidv4();
                expect(await client.set(key3, "value")).toEqual("OK");
                await expect(
                    client.lmove(
                        key3,
                        key1,
                        ListDirection.LEFT,
                        ListDirection.LEFT,
                    ),
                ).rejects.toThrow(RequestError);

                // Non-list destination key
                await expect(
                    client.lmove(
                        key1,
                        key3,
                        ListDirection.LEFT,
                        ListDirection.LEFT,
                    ),
                ).rejects.toThrow(RequestError);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `blmove list_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient, cluster) => {
                if (cluster.checkIfServerVersionLessThan("6.2.0")) {
                    return;
                }

                const key1 = "{key}-1" + uuidv4();
                const key2 = "{key}-2" + uuidv4();
                const key1Encoded = Buffer.from("{key}-1" + uuidv4());
                const key2Encoded = Buffer.from("{key}-2" + uuidv4());
                const lpushArgs1 = ["2", "1"];
                const lpushArgs2 = ["4", "3"];

                // Initialize the tests
                expect(await client.lpush(key1, lpushArgs1)).toEqual(2);
                expect(await client.lpush(key2, lpushArgs2)).toEqual(2);
                expect(await client.lpush(key1Encoded, lpushArgs1)).toEqual(2);
                expect(await client.lpush(key2Encoded, lpushArgs2)).toEqual(2);

                // Move from LEFT to LEFT with blocking
                expect(
                    await client.blmove(
                        key1,
                        key2,
                        ListDirection.LEFT,
                        ListDirection.LEFT,
                        0.1,
                    ),
                ).toEqual("1");

                // Move from LEFT to RIGHT with blocking
                expect(
                    await client.blmove(
                        key1,
                        key2,
                        ListDirection.LEFT,
                        ListDirection.RIGHT,
                        0.1,
                    ),
                ).toEqual("2");

                expect(await client.lrange(key2, 0, -1)).toEqual([
                    "1",
                    "3",
                    "4",
                    "2",
                ]);
                expect(await client.lrange(key1, 0, -1)).toEqual([]);

                // Move from RIGHT to LEFT non-existing destination with blocking
                expect(
                    await client.blmove(
                        key2,
                        key1,
                        ListDirection.RIGHT,
                        ListDirection.LEFT,
                        0.1,
                    ),
                ).toEqual("2");

                expect(await client.lrange(key2, 0, -1)).toEqual([
                    "1",
                    "3",
                    "4",
                ]);
                expect(await client.lrange(key1, 0, -1)).toEqual(["2"]);

                // Move from RIGHT to RIGHT with blocking
                expect(
                    await client.blmove(
                        key2,
                        key1,
                        ListDirection.RIGHT,
                        ListDirection.RIGHT,
                        0.1,
                    ),
                ).toEqual("4");

                expect(await client.lrange(key2, 0, -1)).toEqual(["1", "3"]);
                expect(await client.lrange(key1, 0, -1)).toEqual(["2", "4"]);

                // Move from RIGHT to LEFT with blocking and encoded return value
                expect(
                    await client.blmove(
                        key1,
                        key2,
                        ListDirection.RIGHT,
                        ListDirection.LEFT,
                        0.1,
                        { decoder: Decoder.Bytes },
                    ),
                ).toEqual(Buffer.from("4"));

                // Move from RIGHT to LEFT with encoded list keys
                expect(
                    await client.blmove(
                        key1Encoded,
                        key2Encoded,
                        ListDirection.RIGHT,
                        ListDirection.LEFT,
                        0.1,
                    ),
                ).toEqual("2");

                // Non-existing source key with blocking
                expect(
                    await client.blmove(
                        "{key}-non_existing_key" + uuidv4(),
                        key1,
                        ListDirection.LEFT,
                        ListDirection.LEFT,
                        0.1,
                    ),
                ).toEqual(null);

                // Non-list source key with blocking
                const key3 = "{key}-3" + uuidv4();
                expect(await client.set(key3, "value")).toEqual("OK");
                await expect(
                    client.blmove(
                        key3,
                        key1,
                        ListDirection.LEFT,
                        ListDirection.LEFT,
                        0.1,
                    ),
                ).rejects.toThrow(RequestError);

                // Non-list destination key
                await expect(
                    client.blmove(
                        key1,
                        key3,
                        ListDirection.LEFT,
                        ListDirection.LEFT,
                        0.1,
                    ),
                ).rejects.toThrow(RequestError);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `lset test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = uuidv4();
                const nonExistingKey = uuidv4();
                const index = 0;
                const oobIndex = 10;
                const negativeIndex = -1;
                const element = "zero";
                const lpushArgs = ["four", "three", "two", "one"];
                const expectedList = ["zero", "two", "three", "four"];
                const expectedList2 = ["zero", "two", "three", "zero"];

                // key does not exist
                await expect(
                    client.lset(nonExistingKey, index, element),
                ).rejects.toThrow(RequestError);

                expect(await client.lpush(key, lpushArgs)).toEqual(4);

                // index out of range
                await expect(
                    client.lset(key, oobIndex, element),
                ).rejects.toThrow(RequestError);

                // assert lset result
                expect(await client.lset(key, index, element)).toEqual("OK");
                expect(await client.lrange(key, 0, negativeIndex)).toEqual(
                    expectedList,
                );

                // assert lset with a negative index for the last element in the list
                expect(await client.lset(key, negativeIndex, element)).toEqual(
                    "OK",
                );
                expect(await client.lrange(key, 0, negativeIndex)).toEqual(
                    expectedList2,
                );

                // assert lset against a non-list key
                const nonListKey = "nonListKey";
                expect(await client.sadd(nonListKey, ["a"])).toEqual(1);

                await expect(client.lset(nonListKey, 0, "b")).rejects.toThrow(
                    RequestError,
                );

                //test lset for binary key and element values
                const key2 = uuidv4();
                expect(await client.lpush(key2, lpushArgs)).toEqual(4);
                // assert lset result
                expect(
                    await client.lset(Buffer.from(key2), index, element),
                ).toEqual("OK");
                expect(await client.lrange(key2, 0, negativeIndex)).toEqual(
                    expectedList,
                );
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `ltrim with existing key and key that holds a value that is not a list_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = uuidv4();
                const valueList = ["value4", "value3", "value2", "value1"];
                expect(await client.lpush(key, valueList)).toEqual(4);
                expect(await client.ltrim(key, 0, 1)).toEqual("OK");
                expect(await client.lrange(key, 0, -1)).toEqual([
                    "value1",
                    "value2",
                ]);

                /// `start` is greater than `end` so the key will be removed.
                expect(await client.ltrim(key, 4, 2)).toEqual("OK");
                expect(await client.lrange(key, 0, -1)).toEqual([]);

                expect(await client.set(key, "foo")).toEqual("OK");

                await expect(client.ltrim(key, 0, 1)).rejects.toThrow(
                    "Operation against a key holding the wrong kind of value",
                );

                //test for binary key as input to the command
                const key2 = uuidv4();
                expect(await client.lpush(key2, valueList)).toEqual(4);
                expect(await client.ltrim(Buffer.from(key2), 0, 1)).toEqual(
                    "OK",
                );
                expect(await client.lrange(key2, 0, -1)).toEqual([
                    "value1",
                    "value2",
                ]);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `lrem with existing key and non existing key_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = uuidv4();
                const valueList = [
                    "value1",
                    "value2",
                    "value1",
                    "value1",
                    "value2",
                ];
                expect(await client.lpush(key1, valueList)).toEqual(5);
                expect(await client.lrem(key1, 2, "value1")).toEqual(2);
                expect(await client.lrange(key1, 0, -1)).toEqual([
                    "value2",
                    "value2",
                    "value1",
                ]);
                expect(await client.lrem(key1, -1, "value2")).toEqual(1);
                expect(await client.lrange(key1, 0, -1)).toEqual([
                    "value2",
                    "value1",
                ]);
                expect(await client.lrem(key1, 0, "value2")).toEqual(1);
                expect(await client.lrange(key1, 0, -1)).toEqual(["value1"]);
                expect(await client.lrem("nonExistingKey", 2, "value")).toEqual(
                    0,
                );

                // test for binary key and element as input to the command
                const key2 = uuidv4();
                expect(await client.lpush(key2, valueList)).toEqual(5);
                expect(
                    await client.lrem(
                        Buffer.from(key2),
                        2,
                        Buffer.from("value1"),
                    ),
                ).toEqual(2);
                expect(await client.lrange(key2, 0, -1)).toEqual([
                    "value2",
                    "value2",
                    "value1",
                ]);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `rpush and rpop with existing and non existing key_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = uuidv4();
                const key2 = Buffer.from(uuidv4());
                const valueList1 = ["value1", "value2", "value3", "value4"];
                const valueList2 = ["value5", "value6", "value7"];
                expect(await client.rpush(key1, valueList1)).toEqual(4);
                expect(await client.rpop(key1)).toEqual("value4");
                expect(await client.rpopCount(key1, 2)).toEqual([
                    "value3",
                    "value2",
                ]);
                expect(await client.rpop("nonExistingKey")).toEqual(null);

                expect(await client.rpush(key2, valueList2)).toEqual(3);
                expect(
                    await client.rpop(key2, { decoder: Decoder.Bytes }),
                ).toEqual(Buffer.from("value7"));
                expect(
                    await client.rpopCount(key2, 2, { decoder: Decoder.Bytes }),
                ).toEqual([Buffer.from("value6"), Buffer.from("value5")]);
                expect(
                    await client.rpush(key2, [Buffer.from("value8")]),
                ).toEqual(1);
                expect(
                    await client.rpop(key2, { decoder: Decoder.Bytes }),
                ).toEqual(Buffer.from("value8"));
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `rpush and rpop with key that holds a value that is not a list_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = uuidv4();
                expect(await client.set(key, "foo")).toEqual("OK");

                await expect(client.rpush(key, ["bar"])).rejects.toThrow(
                    "Operation against a key holding the wrong kind of value",
                );
                await expect(client.rpop(key)).rejects.toThrow(
                    "Operation against a key holding the wrong kind of value",
                );
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `rpushx list_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = uuidv4();
                const key2 = uuidv4();
                const key3 = uuidv4();

                expect(await client.rpush(key1, ["0"])).toEqual(1);
                expect(await client.rpushx(key1, ["1", "2", "3"])).toEqual(4);
                expect(await client.lrange(key1, 0, -1)).toEqual([
                    "0",
                    "1",
                    "2",
                    "3",
                ]);

                expect(await client.rpushx(key2, ["1"])).toEqual(0);
                expect(await client.lrange(key2, 0, -1)).toEqual([]);

                // Key exists, but is not a list
                expect(await client.set(key3, "bar"));
                await expect(client.rpushx(key3, ["_"])).rejects.toThrow(
                    RequestError,
                );

                // Empty element list
                await expect(client.rpushx(key2, [])).rejects.toThrow(
                    RequestError,
                );

                //test for binary key and elemnts as inputs to the command.
                const key4 = uuidv4();
                expect(await client.rpush(key4, ["0"])).toEqual(1);
                expect(
                    await client.rpushx(Buffer.from(key4), [
                        Buffer.from("1"),
                        Buffer.from("2"),
                        Buffer.from("3"),
                    ]),
                ).toEqual(4);
                expect(await client.lrange(key4, 0, -1)).toEqual([
                    "0",
                    "1",
                    "2",
                    "3",
                ]);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `sadd, srem, scard and smembers with existing set_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = uuidv4();
                const keyEncoded = Buffer.from(key);
                const valueList = ["member1", "member2", "member3", "member4"];
                expect(await client.sadd(key, valueList)).toEqual(4);
                expect(
                    await client.srem(key, ["member3", "nonExistingMember"]),
                ).toEqual(1);

                /// compare the 2 sets.
                expect(await client.smembers(key)).toEqual(
                    new Set(["member1", "member2", "member4"]),
                );
                expect(await client.srem(key, ["member1"])).toEqual(1);
                expect(await client.scard(key)).toEqual(2);

                // with key and members as buffers
                expect(
                    await client.sadd(keyEncoded, [Buffer.from("member5")]),
                ).toEqual(1);
                expect(
                    await client.srem(keyEncoded, [Buffer.from("member2")]),
                ).toEqual(1);
                expect(
                    await client.smembers(keyEncoded, {
                        decoder: Decoder.Bytes,
                    }),
                ).toEqual(
                    new Set([Buffer.from("member4"), Buffer.from("member5")]),
                );
                expect(await client.scard(Buffer.from(key))).toEqual(2);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `smove test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = "{key}" + uuidv4();
                const key2 = "{key}" + uuidv4();
                const key3 = "{key}" + uuidv4();
                const string_key = "{key}" + uuidv4();
                const non_existing_key = "{key}" + uuidv4();

                expect(await client.sadd(key1, ["1", "2", "3"])).toEqual(3);
                expect(await client.sadd(key2, ["2", "3"])).toEqual(2);

                // move an element, test key as buffer
                expect(await client.smove(Buffer.from(key1), key2, "1"));
                expect(await client.smembers(key1)).toEqual(
                    new Set(["2", "3"]),
                );
                expect(await client.smembers(key2)).toEqual(
                    new Set(["1", "2", "3"]),
                );

                // moved element already exists in the destination set, test member as buffer
                expect(await client.smove(key2, key1, Buffer.from("2")));
                expect(await client.smembers(key1)).toEqual(
                    new Set(["2", "3"]),
                );
                expect(await client.smembers(key2)).toEqual(
                    new Set(["1", "3"]),
                );

                // attempt to move from a non-existing key
                expect(await client.smove(non_existing_key, key1, "4")).toEqual(
                    false,
                );
                expect(await client.smembers(key1)).toEqual(
                    new Set(["2", "3"]),
                );

                // move to a new set
                expect(await client.smove(key1, key3, "2"));
                expect(await client.smembers(key1)).toEqual(new Set(["3"]));
                expect(await client.smembers(key3)).toEqual(new Set(["2"]));

                // attempt to move a missing element
                expect(await client.smove(key1, key3, "42")).toEqual(false);
                expect(await client.smembers(key1)).toEqual(new Set(["3"]));
                expect(await client.smembers(key3)).toEqual(new Set(["2"]));

                // move missing element to missing key
                expect(
                    await client.smove(key1, non_existing_key, "42"),
                ).toEqual(false);
                expect(await client.smembers(key1)).toEqual(new Set(["3"]));
                expect(await client.type(non_existing_key)).toEqual("none");

                // key exists, but it is not a set
                expect(await client.set(string_key, "value")).toEqual("OK");
                await expect(
                    client.smove(string_key, key1, "_"),
                ).rejects.toThrow();
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `srem, scard and smembers with non existing key_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                expect(await client.srem("nonExistingKey", ["member"])).toEqual(
                    0,
                );
                expect(await client.scard("nonExistingKey")).toEqual(0);
                expect(await client.smembers("nonExistingKey")).toEqual(
                    new Set(),
                );
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `sadd, srem, scard and smembers with with key that holds a value that is not a set_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = uuidv4();
                expect(await client.set(key, "foo")).toEqual("OK");

                await expect(client.sadd(key, ["bar"])).rejects.toThrow(
                    "Operation against a key holding the wrong kind of value",
                );
                await expect(client.srem(key, ["bar"])).rejects.toThrow(
                    "Operation against a key holding the wrong kind of value",
                );
                await expect(client.scard(key)).rejects.toThrow(
                    "Operation against a key holding the wrong kind of value",
                );
                await expect(client.smembers(key)).rejects.toThrow(
                    "Operation against a key holding the wrong kind of value",
                );
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `sinter test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = `{key}-1-${uuidv4()}`;
                const key2 = `{key}-2-${uuidv4()}`;
                const non_existing_key = `{key}`;
                const member1_list = ["a", "b", "c", "d"];
                const member2_list = ["c", "d", "e"];

                // positive test case
                expect(await client.sadd(key1, member1_list)).toEqual(4);
                expect(await client.sadd(key2, member2_list)).toEqual(3);
                expect(await client.sinter([key1, key2])).toEqual(
                    new Set(["c", "d"]),
                );

                // positive test case with keys and return value as buffers
                expect(
                    await client.sinter(
                        [Buffer.from(key1), Buffer.from(key2)],
                        { decoder: Decoder.Bytes },
                    ),
                ).toEqual(new Set([Buffer.from("c"), Buffer.from("d")]));

                // invalid argument - key list must not be empty
                await expect(client.sinter([])).rejects.toThrow(
                    "wrong number of arguments",
                );

                // non-existing key returns empty set
                expect(await client.sinter([key1, non_existing_key])).toEqual(
                    new Set(),
                );

                // non-set key
                expect(await client.set(key2, "value")).toEqual("OK");

                await expect(client.sinter([key2])).rejects.toThrow(
                    "Operation against a key holding the wrong kind of value",
                );
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `sintercard test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient, cluster) => {
                if (cluster.checkIfServerVersionLessThan("7.0.0")) {
                    return;
                }

                const key1 = `{key}-${uuidv4()}`;
                const key2 = `{key}-${uuidv4()}`;
                const nonExistingKey = `{key}-${uuidv4()}`;
                const stringKey = `{key}-${uuidv4()}`;
                const member1_list = ["a", "b", "c", "d"];
                const member2_list = ["b", "c", "d", "e"];

                expect(await client.sadd(key1, member1_list)).toEqual(4);
                expect(await client.sadd(key2, member2_list)).toEqual(4);

                expect(await client.sintercard([key1, key2])).toEqual(3);

                // returns limit as cardinality when the limit is reached partway through the computation
                const limit = 2;
                expect(
                    await client.sintercard([key1, key2], { limit }),
                ).toEqual(limit);

                // returns actual cardinality if limit is higher
                expect(
                    await client.sintercard([key1, key2], { limit: 4 }),
                ).toEqual(3);

                // one of the keys is empty, intersection is empty, cardinality equals 0
                expect(await client.sintercard([key1, nonExistingKey])).toEqual(
                    0,
                );

                expect(
                    await client.sintercard([nonExistingKey, nonExistingKey]),
                ).toEqual(0);
                expect(
                    await client.sintercard([nonExistingKey, nonExistingKey], {
                        limit: 2,
                    }),
                ).toEqual(0);

                // with keys as binary buffers
                expect(
                    await client.sintercard([
                        Buffer.from(key1),
                        Buffer.from(key2),
                    ]),
                ).toEqual(3);

                // invalid argument - key list must not be empty
                await expect(client.sintercard([])).rejects.toThrow(
                    RequestError,
                );

                // source key exists, but it is not a set
                expect(await client.set(stringKey, "foo")).toEqual("OK");
                await expect(
                    client.sintercard([key1, stringKey]),
                ).rejects.toThrow(RequestError);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `sinterstore test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = `{key}-1-${uuidv4()}`;
                const key2 = `{key}-2-${uuidv4()}`;
                const key3 = `{key}-3-${uuidv4()}`;
                const nonExistingKey = `{key}-4-${uuidv4()}`;
                const stringKey = `{key}-5-${uuidv4()}`;
                const member1_list = ["a", "b", "c"];
                const member2_list = ["c", "d", "e"];

                expect(await client.sadd(key1, member1_list)).toEqual(3);
                expect(await client.sadd(key2, member2_list)).toEqual(3);

                // store in a new key
                expect(await client.sinterstore(key3, [key1, key2])).toEqual(1);
                expect(await client.smembers(key3)).toEqual(new Set(["c"]));

                // overwrite existing set, which is also a source set
                expect(await client.sinterstore(key2, [key2, key3])).toEqual(1);
                expect(await client.smembers(key2)).toEqual(new Set(["c"]));

                // source set is the same as the existing set
                expect(await client.sinterstore(key2, [key2])).toEqual(1);
                expect(await client.smembers(key2)).toEqual(new Set(["c"]));

                // intersection with non-existing key
                expect(
                    await client.sinterstore(key1, [key2, nonExistingKey]),
                ).toEqual(0);
                expect(await client.smembers(key1)).toEqual(new Set());

                // invalid argument - key list must not be empty
                await expect(client.sinterstore(key3, [])).rejects.toThrow();

                // non-set key
                expect(await client.set(stringKey, "foo")).toEqual("OK");
                await expect(
                    client.sinterstore(key3, [stringKey]),
                ).rejects.toThrow();

                // overwrite non-set key
                expect(await client.sinterstore(stringKey, [key2])).toEqual(1);
                expect(await client.smembers(stringKey)).toEqual(new Set("c"));

                // with destination and keys as binary buffers
                expect(await client.sadd(key1, ["a", "b", "c"]));
                expect(await client.sadd(key2, ["c", "d", "e"]));
                expect(
                    await client.sinterstore(Buffer.from(key3), [
                        Buffer.from(key1),
                        Buffer.from(key2),
                    ]),
                ).toEqual(1);
                expect(await client.smembers(key3)).toEqual(new Set(["c"]));
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `sdiff test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = `{key}-1-${uuidv4()}`;
                const key2 = `{key}-2-${uuidv4()}`;
                const stringKey = `{key}-3-${uuidv4()}`;
                const nonExistingKey = `{key}-4-${uuidv4()}`;
                const member1_list = ["a", "b", "c"];
                const member2_list = ["c", "d", "e"];

                expect(await client.sadd(key1, member1_list)).toEqual(3);
                expect(await client.sadd(key2, member2_list)).toEqual(3);

                expect(await client.sdiff([key1, key2])).toEqual(
                    new Set(["a", "b"]),
                );
                expect(await client.sdiff([key2, key1])).toEqual(
                    new Set(["d", "e"]),
                );

                expect(await client.sdiff([key1, nonExistingKey])).toEqual(
                    new Set(["a", "b", "c"]),
                );
                expect(await client.sdiff([nonExistingKey, key1])).toEqual(
                    new Set(),
                );

                // key and return value as binary buffers
                expect(
                    await client.sdiff([Buffer.from(key1), Buffer.from(key2)], {
                        decoder: Decoder.Bytes,
                    }),
                ).toEqual(new Set([Buffer.from("a"), Buffer.from("b")]));
                expect(
                    await client.sdiff([Buffer.from(key2), Buffer.from(key1)], {
                        decoder: Decoder.Bytes,
                    }),
                ).toEqual(new Set([Buffer.from("d"), Buffer.from("e")]));

                // invalid arg - key list must not be empty
                await expect(client.sdiff([])).rejects.toThrow();

                // key exists, but it is not a set
                expect(await client.set(stringKey, "foo")).toEqual("OK");
                await expect(client.sdiff([stringKey])).rejects.toThrow();
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `sdiffstore test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = `{key}-1-${uuidv4()}`;
                const key2 = `{key}-2-${uuidv4()}`;
                const key3 = `{key}-3-${uuidv4()}`;
                const stringKey = `{key}-4-${uuidv4()}`;
                const nonExistingKey = `{key}-5-${uuidv4()}`;
                const member1_list = ["a", "b", "c"];
                const member2_list = ["c", "d", "e"];

                expect(await client.sadd(key1, member1_list)).toEqual(3);
                expect(await client.sadd(key2, member2_list)).toEqual(3);

                // store diff in new key
                expect(await client.sdiffstore(key3, [key1, key2])).toEqual(2);
                expect(await client.smembers(key3)).toEqual(
                    new Set(["a", "b"]),
                );

                // overwrite existing set
                expect(await client.sdiffstore(key3, [key2, key1])).toEqual(2);
                expect(await client.smembers(key3)).toEqual(
                    new Set(["d", "e"]),
                );

                // overwrite one of the source sets
                expect(await client.sdiffstore(key3, [key2, key3])).toEqual(1);
                expect(await client.smembers(key3)).toEqual(new Set(["c"]));

                // diff between non-empty set and empty set
                expect(
                    await client.sdiffstore(key3, [key1, nonExistingKey]),
                ).toEqual(3);
                expect(await client.smembers(key3)).toEqual(
                    new Set(["a", "b", "c"]),
                );

                // diff between empty set and non-empty set
                expect(
                    await client.sdiffstore(key3, [nonExistingKey, key1]),
                ).toEqual(0);
                expect(await client.smembers(key3)).toEqual(new Set());

                // invalid argument - key list must not be empty
                await expect(client.sdiffstore(key3, [])).rejects.toThrow();

                // source key exists, but it is not a set
                expect(await client.set(stringKey, "foo")).toEqual("OK");
                await expect(
                    client.sdiffstore(key3, [stringKey]),
                ).rejects.toThrow();

                // overwrite a key holding a non-set value
                expect(
                    await client.sdiffstore(stringKey, [key1, key2]),
                ).toEqual(2);
                expect(await client.smembers(stringKey)).toEqual(
                    new Set(["a", "b"]),
                );

                // with destination and keys as binary buffers
                expect(
                    await client.sdiffstore(Buffer.from(key3), [
                        Buffer.from(key1),
                        Buffer.from(key2),
                    ]),
                ).toEqual(2);
                expect(await client.smembers(key3)).toEqual(
                    new Set(["a", "b"]),
                );
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `sscan test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = "{key}-1" + uuidv4();
                const initialCursor = "0";
                const defaultCount = 10;

                const numberMembers: string[] = [];

                for (let i = 0; i < 50000; i++) {
                    numberMembers[i] = i.toString();
                }

                const numberMembersSet: string[] = numberMembers;
                const charMembers: string[] = ["a", "b", "c", "d", "e"];
                const charMembersSet = new Set<string>(charMembers);
                const resultCursorIndex = 0;
                const resultCollectionIndex = 1;

                // Result contains the whole set
                expect(await client.sadd(key1, charMembers)).toEqual(
                    charMembers.length,
                );
                let result = await client.sscan(key1, initialCursor);
                expect(await result[resultCursorIndex]).toEqual(initialCursor);
                expect(result[resultCollectionIndex].length).toEqual(
                    charMembers.length,
                );

                const resultMembers = result[resultCollectionIndex] as string[];

                const allResultMember = resultMembers.every((member) =>
                    charMembersSet.has(member),
                );
                expect(allResultMember).toEqual(true);

                // Test with key, cursor, result value as binary buffers
                const encodedResult = await client.sscan(
                    Buffer.from(key1),
                    Buffer.from(initialCursor),
                    { decoder: Decoder.Bytes },
                );
                const encodedResultMembers = encodedResult[
                    resultCollectionIndex
                ] as GlideString[];
                const allEncodedResultMembers = encodedResultMembers.every(
                    (member) => charMembersSet.has(member.toString()),
                );
                expect(allEncodedResultMembers).toEqual(true);

                // Testing sscan with match
                result = await client.sscan(key1, initialCursor, {
                    match: "a",
                });
                expect(result[resultCursorIndex]).toEqual(initialCursor);
                expect(result[resultCollectionIndex]).toEqual(["a"]);

                // Result contains a subset of the key
                expect(await client.sadd(key1, numberMembers)).toEqual(
                    numberMembers.length,
                );

                let resultCursor = "0";
                let secondResultValues: GlideString[] = [];

                let isFirstLoop = true;

                do {
                    result = await client.sscan(key1, resultCursor);
                    resultCursor = result[resultCursorIndex].toString();
                    secondResultValues = result[resultCollectionIndex];

                    if (isFirstLoop) {
                        expect(resultCursor).not.toBe("0");
                        isFirstLoop = false;
                    } else if (resultCursor === initialCursor) {
                        break;
                    }

                    // Scan with result cursor has a different set
                    const secondResult = await client.sscan(key1, resultCursor);
                    const newResultCursor =
                        secondResult[resultCursorIndex].toString();
                    expect(resultCursor).not.toBe(newResultCursor);
                    resultCursor = newResultCursor;
                    expect(result[resultCollectionIndex]).not.toBe(
                        secondResult[resultCollectionIndex],
                    );
                    secondResultValues = secondResult[resultCollectionIndex];
                } while (resultCursor != initialCursor); // 0 is returned for the cursor of the last iteration.

                const allSecondResultValues = Object.keys(
                    secondResultValues,
                ).every((value) => value in numberMembersSet);
                expect(allSecondResultValues).toEqual(true);

                // Test match pattern
                result = await client.sscan(key1, initialCursor, {
                    match: "*",
                });
                expect(result[resultCursorIndex]).not.toEqual(initialCursor);
                expect(
                    result[resultCollectionIndex].length,
                ).toBeGreaterThanOrEqual(defaultCount);

                // Test count
                result = await client.sscan(key1, initialCursor, { count: 20 });
                expect(result[resultCursorIndex]).not.toEqual(0);
                expect(
                    result[resultCollectionIndex].length,
                ).toBeGreaterThanOrEqual(20);

                // Test count with match returns a non-empty list
                result = await client.sscan(key1, initialCursor, {
                    match: "1*",
                    count: 30,
                });
                expect(result[resultCursorIndex]).not.toEqual(initialCursor);
                expect(
                    result[resultCollectionIndex].length,
                ).toBeGreaterThanOrEqual(0);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `sunion test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = `{key}:${uuidv4()}`;
                const key2 = `{key}:${uuidv4()}`;
                const stringKey = `{key}:${uuidv4()}`;
                const nonExistingKey = `{key}:${uuidv4()}`;
                const memberList1 = ["a", "b", "c"];
                const memberList2 = ["b", "c", "d", "e"];

                expect(await client.sadd(key1, memberList1)).toEqual(3);
                expect(await client.sadd(key2, memberList2)).toEqual(4);
                expect(await client.sunion([key1, key2])).toEqual(
                    new Set(["a", "b", "c", "d", "e"]),
                );

                // with return value as binary buffers
                expect(
                    await client.sunion([key1, Buffer.from(key2)], {
                        decoder: Decoder.Bytes,
                    }),
                ).toEqual(
                    new Set(
                        ["a", "b", "c", "d", "e"].map((member) =>
                            Buffer.from(member),
                        ),
                    ),
                );

                // invalid argument - key list must not be empty
                await expect(client.sunion([])).rejects.toThrow();

                // non-existing key returns the set of existing keys
                expect(await client.sunion([key1, nonExistingKey])).toEqual(
                    new Set(memberList1),
                );

                // key exists, but it is not a set
                expect(await client.set(stringKey, "foo")).toEqual("OK");
                await expect(client.sunion([stringKey])).rejects.toThrow();
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `sunionstore test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = `{key}:${uuidv4()}`;
                const key2 = `{key}:${uuidv4()}`;
                const key3 = `{key}:${uuidv4()}`;
                const key4 = `{key}:${uuidv4()}`;
                const stringKey = `{key}:${uuidv4()}`;
                const nonExistingKey = `{key}:${uuidv4()}`;

                expect(await client.sadd(key1, ["a", "b", "c"])).toEqual(3);
                expect(await client.sadd(key2, ["c", "d", "e"])).toEqual(3);
                expect(await client.sadd(key3, ["e", "f", "g"])).toEqual(3);

                // store union in new key
                expect(await client.sunionstore(key4, [key1, key2])).toEqual(5);
                expect(await client.smembers(key4)).toEqual(
                    new Set(["a", "b", "c", "d", "e"]),
                );

                // overwrite existing set, test with binary option
                expect(
                    await client.sunionstore(Buffer.from(key1), [
                        Buffer.from(key4),
                        Buffer.from(key2),
                    ]),
                ).toEqual(5);
                expect(await client.smembers(key1)).toEqual(
                    new Set(["a", "b", "c", "d", "e"]),
                );

                // overwrite one of the source keys
                expect(await client.sunionstore(key2, [key4, key2])).toEqual(5);
                expect(await client.smembers(key2)).toEqual(
                    new Set(["a", "b", "c", "d", "e"]),
                );

                // union with a non-existing key
                expect(
                    await client.sunionstore(key2, [nonExistingKey]),
                ).toEqual(0);
                expect(await client.smembers(key2)).toEqual(new Set());

                // invalid argument - key list must not be empty
                await expect(client.sunionstore(key4, [])).rejects.toThrow();

                // key exists, but it is not a set
                expect(await client.set(stringKey, "foo")).toEqual("OK");
                await expect(
                    client.sunionstore(key4, [stringKey, key1]),
                ).rejects.toThrow();

                // overwrite destination when destination is not a set
                expect(
                    await client.sunionstore(stringKey, [key1, key3]),
                ).toEqual(7);
                expect(await client.smembers(stringKey)).toEqual(
                    new Set(["a", "b", "c", "d", "e", "f", "g"]),
                );
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `sismember test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = uuidv4();
                const key2 = uuidv4();
                expect(await client.sadd(key1, ["member1"])).toEqual(1);
                expect(await client.sismember(key1, "member1")).toEqual(true);
                expect(
                    await client.sismember(
                        Buffer.from(key1),
                        Buffer.from("member1"),
                    ),
                ).toEqual(true);
                expect(
                    await client.sismember(key1, "nonExistingMember"),
                ).toEqual(false);
                expect(
                    await client.sismember("nonExistingKey", "member1"),
                ).toEqual(false);

                expect(await client.set(key2, "foo")).toEqual("OK");
                await expect(
                    client.sismember(key2, "member1"),
                ).rejects.toThrow();
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `smismember test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient, cluster) => {
                if (cluster.checkIfServerVersionLessThan("6.2.0")) {
                    return;
                }

                const key = uuidv4();
                const stringKey = uuidv4();
                const nonExistingKey = uuidv4();

                expect(await client.sadd(key, ["a", "b"])).toEqual(2);
                expect(
                    await client.smismember(Buffer.from(key), [
                        Buffer.from("b"),
                        "c",
                    ]),
                ).toEqual([true, false]);

                expect(await client.smismember(nonExistingKey, ["b"])).toEqual([
                    false,
                ]);

                // invalid argument - member list must not be empty
                await expect(client.smismember(key, [])).rejects.toThrow(
                    RequestError,
                );

                // key exists, but it is not a set
                expect(await client.set(stringKey, "foo")).toEqual("OK");
                await expect(
                    client.smismember(stringKey, ["a"]),
                ).rejects.toThrow(RequestError);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `spop and spopCount test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = uuidv4();
                const key2 = uuidv4();
                const key2Encoded = Buffer.from(key2);
                let members = ["member1", "member2", "member3"];
                let members2 = ["member1", "member2", "member3"];

                expect(await client.sadd(key1, members)).toEqual(3);
                expect(await client.sadd(key2, members2)).toEqual(3);

                const result1 = await client.spop(key1);
                expect(members).toContain(result1);

                members = members.filter((item) => item != result1);
                const result2 = await client.spopCount(key1, 2);
                expect(result2).toEqual(new Set(members));
                expect(await client.spop("nonExistingKey")).toEqual(null);
                expect(await client.spopCount("nonExistingKey", 1)).toEqual(
                    new Set(),
                );

                // with keys and return values as buffers
                const result3 = await client.spop(key2Encoded, {
                    decoder: Decoder.Bytes,
                });
                expect(members2).toContain(result3?.toString());

                members2 = members2.filter(
                    (item) => item != result3?.toString(),
                );
                const result4 = await client.spopCount(key2Encoded, 2, {
                    decoder: Decoder.Bytes,
                });
                expect(result4).toEqual(
                    new Set(members2.map((item) => Buffer.from(item))),
                );
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `srandmember and srandmemberCount test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = uuidv4();
                const members = ["member1", "member2", "member3"];
                expect(await client.sadd(key, members)).toEqual(3);

                const result2 = await client.srandmember(key);
                expect(members).toContain(result2);
                expect(await client.srandmember("nonExistingKey")).toEqual(
                    null,
                );

                // with key and return value as buffers
                const result3 = await client.srandmember(Buffer.from(key), {
                    decoder: Decoder.Bytes,
                });
                expect(members).toContain(result3?.toString());

                // unique values are expected as count is positive
                let result = await client.srandmemberCount(key, 4);
                expect(result.length).toEqual(3);
                expect(new Set(result)).toEqual(new Set(members));

                // with key and return value as buffers
                result = await client.srandmemberCount(Buffer.from(key), 4, {
                    decoder: Decoder.Bytes,
                });
                expect(new Set(result)).toEqual(
                    new Set(members.map((member) => Buffer.from(member))),
                );

                // duplicate values are expected as count is negative
                result = await client.srandmemberCount(key, -4);
                expect(result.length).toEqual(4);
                result.forEach((member) => {
                    expect(members).toContain(member);
                });

                // empty return values for non-existing or empty keys
                result = await client.srandmemberCount(key, 0);
                expect(result.length).toEqual(0);
                expect(result).toEqual([]);
                expect(
                    await client.srandmemberCount("nonExistingKey", 0),
                ).toEqual([]);

                expect(await client.set(key, "value")).toBe("OK");
                await expect(client.srandmember(key)).rejects.toThrow();
                await expect(client.srandmemberCount(key, 2)).rejects.toThrow();
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `exists with existing keys, an non existing key_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = uuidv4();
                const key2 = uuidv4();
                const value = uuidv4();
                expect(await client.set(key1, value)).toEqual("OK");
                expect(await client.exists([key1])).toEqual(1);
                expect(await client.set(key2, value)).toEqual("OK");
                expect(
                    await client.exists([
                        key1,
                        "nonExistingKey",
                        Buffer.from(key2),
                    ]),
                ).toEqual(2);
                expect(await client.exists([key1, key1])).toEqual(2);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `unlink multiple existing keys and an non existing key_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = "{key}" + uuidv4();
                const key2 = "{key}" + uuidv4();
                const key3 = "{key}" + uuidv4();
                const value = uuidv4();
                expect(await client.set(key1, value)).toEqual("OK");
                expect(await client.set(key2, value)).toEqual("OK");
                expect(await client.set(key3, value)).toEqual("OK");
                expect(
                    await client.unlink([
                        key1,
                        key2,
                        "nonExistingKey",
                        Buffer.from(key3),
                    ]),
                ).toEqual(3);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `expire, pexpire and ttl with positive timeout_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient, cluster) => {
                const key = uuidv4();
                expect(await client.set(key, "foo")).toEqual("OK");
                expect(await client.expire(key, 10)).toEqual(true);
                expect(await client.ttl(key)).toBeLessThanOrEqual(10);
                /// set command clears the timeout.
                expect(await client.set(key, "bar")).toEqual("OK");
                const versionLessThan =
                    cluster.checkIfServerVersionLessThan("7.0.0");

                if (versionLessThan) {
                    expect(
                        await client.pexpire(Buffer.from(key), 10000),
                    ).toEqual(true);
                } else {
                    expect(
                        await client.pexpire(Buffer.from(key), 10000, {
                            expireOption: ExpireOptions.HasNoExpiry,
                        }),
                    ).toEqual(true);
                }

                expect(await client.ttl(Buffer.from(key))).toBeLessThanOrEqual(
                    10,
                );

                /// TTL will be updated to the new value = 15
                if (versionLessThan) {
                    expect(await client.expire(Buffer.from(key), 15)).toEqual(
                        true,
                    );
                } else {
                    expect(
                        await client.expire(Buffer.from(key), 15, {
                            expireOption: ExpireOptions.HasExistingExpiry,
                        }),
                    ).toEqual(true);
                    expect(await client.expiretime(key)).toBeGreaterThan(
                        Math.floor(Date.now() / 1000),
                    );
                    expect(await client.pexpiretime(key)).toBeGreaterThan(
                        Date.now(),
                    );
                    // test Buffer input argument
                    expect(
                        await client.expiretime(Buffer.from(key)),
                    ).toBeGreaterThan(Math.floor(Date.now() / 1000));
                    expect(
                        await client.pexpiretime(Buffer.from(key)),
                    ).toBeGreaterThan(Date.now());
                }

                expect(await client.ttl(key)).toBeLessThanOrEqual(15);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `expireAt, pexpireAt and ttl with positive timeout_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient, cluster) => {
                const key = uuidv4();
                expect(await client.set(key, "foo")).toEqual("OK");
                expect(
                    await client.expireAt(
                        key,
                        Math.floor(Date.now() / 1000) + 10,
                    ),
                ).toEqual(true);
                expect(await client.ttl(key)).toBeLessThanOrEqual(10);
                const versionLessThan =
                    cluster.checkIfServerVersionLessThan("7.0.0");

                if (versionLessThan) {
                    expect(
                        await client.expireAt(
                            Buffer.from(key),
                            Math.floor(Date.now() / 1000) + 50,
                        ),
                    ).toEqual(true);
                } else {
                    expect(
                        await client.expireAt(
                            Buffer.from(key),
                            Math.floor(Date.now() / 1000) + 50,
                            {
                                expireOption:
                                    ExpireOptions.NewExpiryGreaterThanCurrent,
                            },
                        ),
                    ).toEqual(true);
                }

                expect(await client.ttl(key)).toBeLessThanOrEqual(50);

                /// set command clears the timeout.
                expect(await client.set(key, "bar")).toEqual("OK");

                if (!versionLessThan) {
                    expect(
                        await client.pexpireAt(key, Date.now() + 50000, {
                            expireOption: ExpireOptions.HasExistingExpiry,
                        }),
                    ).toEqual(false);
                    // test Buffer input argument
                    expect(
                        await client.pexpireAt(
                            Buffer.from(key),
                            Date.now() + 50000,
                            { expireOption: ExpireOptions.HasExistingExpiry },
                        ),
                    ).toEqual(false);
                }
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `expire, pexpire, expireAt and pexpireAt with timestamp in the past or negative timeout_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient, cluster) => {
                const key = uuidv4();
                expect(await client.set(key, "foo")).toEqual("OK");
                expect(await client.ttl(key)).toEqual(-1);
                expect(await client.expire(key, -10)).toEqual(true);
                expect(await client.ttl(key)).toEqual(-2);
                expect(await client.set(key, "foo")).toEqual("OK");
                expect(await client.pexpire(key, -10000)).toEqual(true);
                expect(await client.ttl(key)).toEqual(-2);
                expect(await client.set(key, "foo")).toEqual("OK");
                expect(
                    await client.expireAt(
                        key,
                        Math.floor(Date.now() / 1000) - 50, /// timeout in the past
                    ),
                ).toEqual(true);
                expect(await client.ttl(key)).toEqual(-2);
                expect(await client.set(key, "foo")).toEqual("OK");

                // no timeout set yet
                if (!cluster.checkIfServerVersionLessThan("7.0.0")) {
                    expect(await client.expiretime(key)).toEqual(-1);
                    expect(await client.pexpiretime(key)).toEqual(-1);
                }

                expect(
                    await client.pexpireAt(
                        key,
                        Date.now() - 50000, /// timeout in the past
                    ),
                ).toEqual(true);
                expect(await client.ttl(key)).toEqual(-2);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `expire, pexpire, expireAt, pexpireAt and ttl with non-existing key_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient, cluster) => {
                const key = uuidv4();
                expect(await client.expire(key, 10)).toEqual(false);
                expect(await client.pexpire(key, 10000)).toEqual(false);
                expect(
                    await client.expireAt(
                        key,
                        Math.floor(Date.now() / 1000) + 50, /// timeout in the past
                    ),
                ).toEqual(false);
                expect(
                    await client.pexpireAt(
                        key,
                        Date.now() + 50000, /// timeout in the past
                    ),
                ).toEqual(false);
                expect(await client.ttl(key)).toEqual(-2);

                if (!cluster.checkIfServerVersionLessThan("7.0.0")) {
                    expect(await client.expiretime(key)).toEqual(-2);
                    expect(await client.pexpiretime(key)).toEqual(-2);
                }
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `script test_decoder_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = Buffer.from(uuidv4());
                const key2 = Buffer.from(uuidv4());

                let script = new Script(Buffer.from("return 'Hello'"));
                expect(
                    await client.invokeScript(script, {
                        decoder: Decoder.Bytes,
                    }),
                ).toEqual(Buffer.from("Hello"));

                script = new Script(
                    Buffer.from("return redis.call('SET', KEYS[1], ARGV[1])"),
                );
                expect(
                    await client.invokeScript(script, {
                        keys: [key1],
                        args: [Buffer.from("value1")],
                        decoder: Decoder.Bytes,
                    }),
                ).toEqual("OK");

                /// Reuse the same script with different parameters.
                expect(
                    await client.invokeScript(script, {
                        keys: [key2],
                        args: [Buffer.from("value2")],
                    }),
                ).toEqual("OK");

                script = new Script(
                    Buffer.from("return redis.call('GET', KEYS[1])"),
                );
                expect(
                    await client.invokeScript(script, { keys: [key1] }),
                ).toEqual("value1");

                expect(
                    await client.invokeScript(script, { keys: [key2] }),
                ).toEqual("value2");
                // Get bytes rsponse
                expect(
                    await client.invokeScript(script, {
                        keys: [key1],
                        decoder: Decoder.Bytes,
                    }),
                ).toEqual(Buffer.from("value1"));

                expect(
                    await client.invokeScript(script, {
                        keys: [key2],
                        decoder: Decoder.Bytes,
                    }),
                ).toEqual(Buffer.from("value2"));
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `script test_binary_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = Buffer.from(uuidv4());
                const key2 = Buffer.from(uuidv4());

                let script = new Script(Buffer.from("return 'Hello'"));
                expect(await client.invokeScript(script)).toEqual("Hello");

                script = new Script(
                    Buffer.from("return redis.call('SET', KEYS[1], ARGV[1])"),
                );
                expect(
                    await client.invokeScript(script, {
                        keys: [key1],
                        args: [Buffer.from("value1")],
                    }),
                ).toEqual("OK");

                /// Reuse the same script with different parameters.
                expect(
                    await client.invokeScript(script, {
                        keys: [key2],
                        args: [Buffer.from("value2")],
                    }),
                ).toEqual("OK");

                script = new Script(
                    Buffer.from("return redis.call('GET', KEYS[1])"),
                );
                expect(
                    await client.invokeScript(script, { keys: [key1] }),
                ).toEqual("value1");

                expect(
                    await client.invokeScript(script, { keys: [key2] }),
                ).toEqual("value2");
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `script test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = uuidv4();
                const key2 = uuidv4();

                let script = new Script("return 'Hello'");
                expect(await client.invokeScript(script)).toEqual("Hello");

                script = new Script(
                    "return redis.call('SET', KEYS[1], ARGV[1])",
                );
                expect(
                    await client.invokeScript(script, {
                        keys: [key1],
                        args: ["value1"],
                    }),
                ).toEqual("OK");

                /// Reuse the same script with different parameters.
                expect(
                    await client.invokeScript(script, {
                        keys: [key2],
                        args: ["value2"],
                    }),
                ).toEqual("OK");

                script = new Script("return redis.call('GET', KEYS[1])");
                expect(
                    await client.invokeScript(script, { keys: [key1] }),
                ).toEqual("value1");

                expect(
                    await client.invokeScript(script, { keys: [key2] }),
                ).toEqual("value2");
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        "script exists test_%p",
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const script1 = new Script("return 'Hello'");
                const script2 = new Script("return 'World'");
                const script3 = new Script("return 'Hello World'");

                // Load script1 to all nodes, do not load script2 and load script3 with a SlotKeyRoute
                await client.invokeScript(script1);
                await client.invokeScript(script3);

                // Get the SHA1 digests of the scripts
                const sha1 = script1.getHash();
                const sha2 = script2.getHash();
                const sha3 = script3.getHash();
                const nonExistentSha = `0`.repeat(40);

                // Check existence of scripts
                const results = await client.scriptExists([
                    sha1,
                    sha2,
                    sha3,
                    nonExistentSha,
                ]);

                // script1 is loaded and returns true.
                // script2 is only cached and not loaded, returns false.
                // script3 is invoked with a SlotKeyRoute. Despite SCRIPT EXIST uses LogicalAggregate AND on the results,
                //  SCRIPT LOAD during internal execution so the script still gets loaded on all nodes, returns true.
                // non-existing sha returns false.
                expect(results).toEqual([true, false, true, false]);

                client.close();
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        "script flush test_%p",
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                // Load a script
                const script = new Script("return 'Hello'");
                expect(await client.invokeScript(script)).toEqual("Hello");

                // Check existence of script
                expect(await client.scriptExists([script.getHash()])).toEqual([
                    true,
                ]);

                // Flush the script cache
                expect(await client.scriptFlush()).toEqual("OK");

                // Check that the script no longer exists
                expect(await client.scriptExists([script.getHash()])).toEqual([
                    false,
                ]);

                // Test with ASYNC mode
                await client.invokeScript(script);
                expect(await client.scriptFlush(FlushMode.ASYNC)).toEqual("OK");
                expect(await client.scriptExists([script.getHash()])).toEqual([
                    false,
                ]);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `script show test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient, cluster) => {
                if (cluster.checkIfServerVersionLessThan("8.0.0")) {
                    return;
                }

                const value = uuidv4();
                const code = `return '${value}'`;
                const script = new Script(Buffer.from(code));

                expect(await client.invokeScript(script)).toEqual(value);

                // Get the SHA1 digests of the script
                const sha1 = script.getHash();

                expect(await client.scriptShow(sha1)).toEqual(code);

                await expect(
                    client.scriptShow("non existing sha1"),
                ).rejects.toThrow(RequestError);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `zadd and zaddIncr test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = uuidv4();
                const membersScores = { one: 1, two: 2, three: 3 };
                const newMembersScores: SortedSetDataType = [
                    { element: "one", score: 2 },
                    { element: Buffer.from("two"), score: 3 },
                ];

                expect(await client.zadd(key, membersScores)).toEqual(3);
                expect(await client.zaddIncr(key, "one", 2)).toEqual(3.0);
                expect(
                    await client.zadd(key, newMembersScores, { changed: true }),
                ).toEqual(2);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        "script kill killable test_%p",
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                await expect(client.scriptKill()).rejects.toThrow(
                    "No scripts in execution right now",
                );
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `zadd and zaddIncr with NX XX test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = uuidv4();
                const membersScores = { one: 1, two: 2, three: 3 };
                expect(
                    await client.zadd(key, membersScores, {
                        conditionalChange: ConditionalChange.ONLY_IF_EXISTS,
                    }),
                ).toEqual(0);

                expect(
                    await client.zadd(key, membersScores, {
                        conditionalChange:
                            ConditionalChange.ONLY_IF_DOES_NOT_EXIST,
                    }),
                ).toEqual(3);

                expect(
                    await client.zaddIncr(key, Buffer.from("one"), 5.0, {
                        conditionalChange:
                            ConditionalChange.ONLY_IF_DOES_NOT_EXIST,
                    }),
                ).toEqual(null);

                expect(
                    await client.zaddIncr(key, "one", 5.0, {
                        conditionalChange: ConditionalChange.ONLY_IF_EXISTS,
                    }),
                ).toEqual(6.0);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `zadd and zaddIncr with GT LT test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = uuidv4();
                const membersScores = { one: -3, two: 2, three: 3 };

                expect(await client.zadd(key, membersScores)).toEqual(3);
                membersScores["one"] = 10;

                expect(
                    await client.zadd(key, membersScores, {
                        updateOptions: UpdateByScore.GREATER_THAN,
                        changed: true,
                    }),
                ).toEqual(1);

                expect(
                    await client.zadd(key, membersScores, {
                        updateOptions: UpdateByScore.LESS_THAN,
                        changed: true,
                    }),
                ).toEqual(0);

                expect(
                    await client.zaddIncr(key, "one", -3.0, {
                        updateOptions: UpdateByScore.LESS_THAN,
                    }),
                ).toEqual(7.0);

                expect(
                    await client.zaddIncr(key, "one", -3.0, {
                        updateOptions: UpdateByScore.GREATER_THAN,
                    }),
                ).toEqual(null);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `zrem test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = uuidv4();
                const membersScores = { one: 1, two: 2, three: 3 };
                expect(await client.zadd(key, membersScores)).toEqual(3);
                expect(await client.zrem(Buffer.from(key), ["one"])).toEqual(1);
                expect(
                    await client.zrem(key, [
                        "one",
                        Buffer.from("two"),
                        "three",
                    ]),
                ).toEqual(2);
                expect(
                    await client.zrem("non_existing_set", ["member"]),
                ).toEqual(0);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `zcard test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = uuidv4();
                const membersScores = { one: 1, two: 2, three: 3 };
                expect(await client.zadd(key, membersScores)).toEqual(3);
                expect(await client.zcard(key)).toEqual(3);
                expect(await client.zrem(key, ["one"])).toEqual(1);
                expect(await client.zcard(Buffer.from(key))).toEqual(2);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `zintercard test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient, cluster) => {
                if (cluster.checkIfServerVersionLessThan("7.0.0")) {
                    return;
                }

                const key1 = `{key}:${uuidv4()}`;
                const key2 = `{key}:${uuidv4()}`;
                const stringKey = `{key}:${uuidv4()}`;
                const nonExistingKey = `{key}:${uuidv4()}`;
                const memberScores1 = { one: 1, two: 2, three: 3 };
                const memberScores2 = { two: 2, three: 3, four: 4 };

                expect(await client.zadd(key1, memberScores1)).toEqual(3);
                expect(await client.zadd(key2, memberScores2)).toEqual(3);

                expect(
                    await client.zintercard([key1, Buffer.from(key2)]),
                ).toEqual(2);
                expect(await client.zintercard([key1, nonExistingKey])).toEqual(
                    0,
                );

                expect(
                    await client.zintercard([key1, key2], { limit: 0 }),
                ).toEqual(2);
                expect(
                    await client.zintercard([key1, key2], { limit: 1 }),
                ).toEqual(1);
                expect(
                    await client.zintercard([key1, key2], { limit: 2 }),
                ).toEqual(2);

                // invalid argument - key list must not be empty
                await expect(client.zintercard([])).rejects.toThrow();

                // invalid argument - limit must be non-negative
                await expect(
                    client.zintercard([key1, key2], { limit: -1 }),
                ).rejects.toThrow();

                // key exists, but it is not a sorted set
                expect(await client.set(stringKey, "foo")).toEqual("OK");
                await expect(client.zintercard([stringKey])).rejects.toThrow();
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `zdiff test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient, cluster) => {
                if (cluster.checkIfServerVersionLessThan("6.2.0")) {
                    return;
                }

                const key1 = `{key}-${uuidv4()}`;
                const key2 = `{key}-${uuidv4()}`;
                const key3 = `{key}-${uuidv4()}`;
                const nonExistingKey = `{key}-${uuidv4()}`;
                const stringKey = `{key}-${uuidv4()}`;

                const entries1 = {
                    one: 1.0,
                    two: 2.0,
                    three: 3.0,
                };
                const entries2 = { two: 2.0 };
                const entries3 = {
                    one: 1.0,
                    two: 2.0,
                    three: 3.0,
                    four: 4.0,
                };

                expect(await client.zadd(key1, entries1)).toEqual(3);
                expect(await client.zadd(key2, entries2)).toEqual(1);
                expect(await client.zadd(key3, entries3)).toEqual(4);

                expect(await client.zdiff([key1, Buffer.from(key2)])).toEqual([
                    "one",
                    "three",
                ]);
                expect(
                    await client.zdiff([key1, key2], {
                        decoder: Decoder.Bytes,
                    }),
                ).toEqual([Buffer.from("one"), Buffer.from("three")]);
                expect(await client.zdiff([key1, key3])).toEqual([]);
                expect(await client.zdiff([nonExistingKey, key3])).toEqual([]);

                let result = await client.zdiffWithScores([key1, key2]);
                const expected = convertElementsAndScores({
                    one: 1.0,
                    three: 3.0,
                });
                expect(result).toEqual(expected);

                // same with byte[]
                result = await client.zdiffWithScores(
                    [key1, Buffer.from(key2)],
                    { decoder: Decoder.Bytes },
                );
                expect(result).toEqual([
                    {
                        element: Buffer.from("one"),
                        score: 1.0,
                    },
                    {
                        element: Buffer.from("three"),
                        score: 3.0,
                    },
                ]);

                result = await client.zdiffWithScores([key1, key3]);
                expect(result).toEqual([]);

                result = await client.zdiffWithScores([nonExistingKey, key3]);
                expect(result).toEqual([]);

                // invalid arg - key list must not be empty
                await expect(client.zdiff([])).rejects.toThrow(RequestError);
                await expect(client.zdiffWithScores([])).rejects.toThrow(
                    RequestError,
                );

                // key exists, but it is not a sorted set
                expect(await client.set(stringKey, "foo")).toEqual("OK");
                await expect(client.zdiff([stringKey, key1])).rejects.toThrow();
                await expect(
                    client.zdiffWithScores([stringKey, key1]),
                ).rejects.toThrow();
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `zdiffstore test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient, cluster) => {
                if (cluster.checkIfServerVersionLessThan("6.2.0")) {
                    return;
                }

                const key1 = `{key}-${uuidv4()}`;
                const key2 = `{key}-${uuidv4()}`;
                const key3 = `{key}-${uuidv4()}`;
                const key4 = `{key}-${uuidv4()}`;
                const nonExistingKey = `{key}-${uuidv4()}`;
                const stringKey = `{key}-${uuidv4()}`;

                const entries1 = {
                    one: 1.0,
                    two: 2.0,
                    three: 3.0,
                };
                const entries2 = { two: 2.0 };
                const entries3 = {
                    one: 1.0,
                    two: 2.0,
                    three: 3.0,
                    four: 4.0,
                };

                expect(await client.zadd(key1, entries1)).toEqual(3);
                expect(await client.zadd(key2, entries2)).toEqual(1);
                expect(await client.zadd(key3, entries3)).toEqual(4);

                expect(await client.zdiffstore(key4, [key1, key2])).toEqual(2);
                const result1 = await client.zrangeWithScores(key4, {
                    start: 0,
                    end: -1,
                });
                const expected1 = convertElementsAndScores({
                    one: 1.0,
                    three: 3.0,
                });
                expect(result1).toEqual(expected1);

                expect(
                    await client.zdiffstore(Buffer.from(key4), [
                        key3,
                        key2,
                        key1,
                    ]),
                ).toEqual(1);
                const result2 = await client.zrangeWithScores(key4, {
                    start: 0,
                    end: -1,
                });
                expect(result2).toEqual(
                    convertElementsAndScores({ four: 4.0 }),
                );

                expect(
                    await client.zdiffstore(key4, [Buffer.from(key1), key3]),
                ).toEqual(0);
                const result3 = await client.zrangeWithScores(key4, {
                    start: 0,
                    end: -1,
                });
                expect(result3).toEqual([]);

                expect(
                    await client.zdiffstore(key4, [nonExistingKey, key1]),
                ).toEqual(0);
                const result4 = await client.zrangeWithScores(key4, {
                    start: 0,
                    end: -1,
                });
                expect(result4).toEqual([]);

                // invalid arg - key list must not be empty
                await expect(client.zdiffstore(key4, [])).rejects.toThrow(
                    RequestError,
                );

                // key exists, but it is not a sorted set
                expect(await client.set(stringKey, "foo")).toEqual("OK");
                await expect(
                    client.zdiffstore(key4, [stringKey, key1]),
                ).rejects.toThrow(RequestError);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `zscore test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = uuidv4();
                const key2 = uuidv4();
                const membersScores = { one: 1, two: 2, three: 3 };
                expect(await client.zadd(key1, membersScores)).toEqual(3);
                expect(await client.zscore(key1, "one")).toEqual(1.0);
                expect(
                    await client.zscore(Buffer.from(key1), Buffer.from("one")),
                ).toEqual(1.0);
                expect(await client.zscore(key1, "nonExistingMember")).toEqual(
                    null,
                );
                expect(
                    await client.zscore("nonExistingKey", "nonExistingMember"),
                ).toEqual(null);

                expect(await client.set(key2, "foo")).toEqual("OK");
                await expect(client.zscore(key2, "foo")).rejects.toThrow();
            }, protocol);
        },
        config.timeout,
    );

    // ZUnionStore command tests
    async function zunionStoreWithMaxAggregation(client: BaseClient) {
        const key1 = "{testKey}:1-" + uuidv4();
        const key2 = "{testKey}:2-" + uuidv4();
        const key3 = "{testKey}:3-" + uuidv4();
        const range = {
            start: 0,
            end: -1,
        };

        const membersScores1 = { one: 1.0, two: 2.0 };
        const membersScores2 = { one: 1.5, two: 2.5, three: 3.5 };

        expect(await client.zadd(key1, membersScores1)).toEqual(2);
        expect(await client.zadd(key2, membersScores2)).toEqual(3);

        // Union results are aggregated by the MAX score of elements
        expect(
            await client.zunionstore(key3, [key1, Buffer.from(key2)], {
                aggregationType: "MAX",
            }),
        ).toEqual(3);
        const zunionstoreMapMax = await client.zrangeWithScores(key3, range);
        const expectedMapMax = {
            one: 1.5,
            two: 2.5,
            three: 3.5,
        };
        expect(zunionstoreMapMax).toEqual(
            convertElementsAndScores(expectedMapMax),
        );
    }

    async function zunionStoreWithMinAggregation(client: BaseClient) {
        const key1 = "{testKey}:1-" + uuidv4();
        const key2 = "{testKey}:2-" + uuidv4();
        const key3 = "{testKey}:3-" + uuidv4();
        const range = {
            start: 0,
            end: -1,
        };

        const membersScores1 = { one: 1.0, two: 2.0 };
        const membersScores2 = { one: 1.5, two: 2.5, three: 3.5 };

        expect(await client.zadd(key1, membersScores1)).toEqual(2);
        expect(await client.zadd(key2, membersScores2)).toEqual(3);

        // Union results are aggregated by the MIN score of elements
        expect(
            await client.zunionstore(Buffer.from(key3), [key1, key2], {
                aggregationType: "MIN",
            }),
        ).toEqual(3);
        const zunionstoreMapMin = await client.zrangeWithScores(key3, range);
        const expectedMapMin = {
            one: 1.0,
            two: 2.0,
            three: 3.5,
        };
        expect(zunionstoreMapMin).toEqual(
            convertElementsAndScores(expectedMapMin),
        );
    }

    async function zunionStoreWithSumAggregation(client: BaseClient) {
        const key1 = "{testKey}:1-" + uuidv4();
        const key2 = "{testKey}:2-" + uuidv4();
        const key3 = "{testKey}:3-" + uuidv4();
        const range = {
            start: 0,
            end: -1,
        };

        const membersScores1 = { one: 1.0, two: 2.0 };
        const membersScores2 = { one: 1.5, two: 2.5, three: 3.5 };

        expect(await client.zadd(key1, membersScores1)).toEqual(2);
        expect(await client.zadd(key2, membersScores2)).toEqual(3);

        // Union results are aggregated by the SUM score of elements
        expect(
            await client.zunionstore(key3, [key1, key2], {
                aggregationType: "SUM",
            }),
        ).toEqual(3);
        const zunionstoreMapSum = await client.zrangeWithScores(key3, range);
        const expectedMapSum = {
            one: 2.5,
            two: 4.5,
            three: 3.5,
        };
        expect(zunionstoreMapSum).toEqual(
            convertElementsAndScores(expectedMapSum).sort(
                (a, b) => a.score - b.score,
            ),
        );
    }

    async function zunionStoreBasicTest(client: BaseClient) {
        const key1 = "{testKey}:1-" + uuidv4();
        const key2 = "{testKey}:2-" + uuidv4();
        const key3 = "{testKey}:3-" + uuidv4();
        const range = {
            start: 0,
            end: -1,
        };

        const membersScores1 = { one: 1.0, two: 2.0 };
        const membersScores2 = { one: 2.0, two: 3.0, three: 4.0 };

        expect(await client.zadd(key1, membersScores1)).toEqual(2);
        expect(await client.zadd(key2, membersScores2)).toEqual(3);

        expect(await client.zunionstore(key3, [key1, key2])).toEqual(3);
        const zunionstoreMap = await client.zrangeWithScores(key3, range);
        const expectedMap = {
            one: 3.0,
            three: 4.0,
            two: 5.0,
        };
        expect(zunionstoreMap).toEqual(convertElementsAndScores(expectedMap));
    }

    async function zunionStoreWithWeightsAndAggregation(client: BaseClient) {
        const key1 = "{testKey}:1-" + uuidv4();
        const key2 = "{testKey}:2-" + uuidv4();
        const key3 = "{testKey}:3-" + uuidv4();
        const range = {
            start: 0,
            end: -1,
        };
        const membersScores1 = { one: 1.0, two: 2.0 };
        const membersScores2 = { one: 1.5, two: 2.5, three: 3.5 };

        expect(await client.zadd(key1, membersScores1)).toEqual(2);
        expect(await client.zadd(key2, membersScores2)).toEqual(3);

        // Scores are multiplied by 2.0 for key1 and key2 during aggregation.
        expect(
            await client.zunionstore(
                key3,
                [
                    [key1, 2.0],
                    [Buffer.from(key2), 2.0],
                ],
                { aggregationType: "SUM" },
            ),
        ).toEqual(3);
        const zunionstoreMapMultiplied = await client.zrangeWithScores(
            key3,
            range,
        );
        const expectedMapMultiplied = {
            one: 5.0,
            three: 7.0,
            two: 9.0,
        };
        expect(zunionstoreMapMultiplied).toEqual(
            convertElementsAndScores(expectedMapMultiplied),
        );
    }

    async function zunionStoreEmptyCases(client: BaseClient) {
        const key1 = "{testKey}:1-" + uuidv4();
        const key2 = "{testKey}:2-" + uuidv4();
        const range = {
            start: 0,
            end: -1,
        };
        const membersScores1 = { one: 1.0, two: 2.0 };

        expect(await client.zadd(key1, membersScores1)).toEqual(2);

        // Non existing key
        expect(
            await client.zunionstore(key2, [
                key1,
                "{testKey}-non_existing_key",
            ]),
        ).toEqual(2);

        const zunionstore_map_nonexistingkey = await client.zrangeWithScores(
            key2,
            range,
        );

        const expectedMapMultiplied = {
            one: 1.0,
            two: 2.0,
        };
        expect(zunionstore_map_nonexistingkey).toEqual(
            convertElementsAndScores(expectedMapMultiplied),
        );

        // Empty list check
        await expect(client.zunionstore("{xyz}", [])).rejects.toThrow();
    }

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `zunionstore test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                await zunionStoreBasicTest(client);
                await zunionStoreWithMaxAggregation(client);
                await zunionStoreWithMinAggregation(client);
                await zunionStoreWithSumAggregation(client);
                await zunionStoreWithWeightsAndAggregation(client);
                await zunionStoreEmptyCases(client);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `zmscore test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient, cluster) => {
                if (cluster.checkIfServerVersionLessThan("6.2.0")) {
                    return;
                }

                const key1 = `{key}-${uuidv4()}`;
                const nonExistingKey = `{key}-${uuidv4()}`;
                const stringKey = `{key}-${uuidv4()}`;

                const entries = {
                    one: 1.0,
                    two: 2.0,
                    three: 3.0,
                };
                expect(await client.zadd(key1, entries)).toEqual(3);

                expect(
                    await client.zmscore(Buffer.from(key1), [
                        "one",
                        "three",
                        "two",
                    ]),
                ).toEqual([1.0, 3.0, 2.0]);
                expect(
                    await client.zmscore(key1, [
                        Buffer.from("one"),
                        "nonExistingMember",
                        "two",
                        "nonExistingMember",
                    ]),
                ).toEqual([1.0, null, 2.0, null]);
                expect(await client.zmscore(nonExistingKey, ["one"])).toEqual([
                    null,
                ]);

                // invalid arg - member list must not be empty
                await expect(client.zmscore(key1, [])).rejects.toThrow(
                    RequestError,
                );

                // key exists, but it is not a sorted set
                expect(await client.set(stringKey, "foo")).toEqual("OK");
                await expect(
                    client.zmscore(stringKey, ["one"]),
                ).rejects.toThrow(RequestError);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `zcount test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = uuidv4();
                const key2 = uuidv4();
                const membersScores = { one: 1, two: 2, three: 3 };
                expect(await client.zadd(key1, membersScores)).toEqual(3);
                expect(
                    await client.zcount(
                        key1,
                        InfBoundary.NegativeInfinity,
                        InfBoundary.PositiveInfinity,
                    ),
                ).toEqual(3);
                expect(
                    await client.zcount(
                        key1,
                        { value: 1, isInclusive: false },
                        { value: 3, isInclusive: false },
                    ),
                ).toEqual(1);
                expect(
                    await client.zcount(
                        key1,
                        { value: 1, isInclusive: false },
                        { value: 3 },
                    ),
                ).toEqual(2);
                expect(
                    await client.zcount(
                        Buffer.from(key1),
                        InfBoundary.NegativeInfinity,
                        {
                            value: 3,
                        },
                    ),
                ).toEqual(3);
                expect(
                    await client.zcount(key1, InfBoundary.PositiveInfinity, {
                        value: 3,
                    }),
                ).toEqual(0);
                expect(
                    await client.zcount(
                        Buffer.from("nonExistingKey"),
                        InfBoundary.NegativeInfinity,
                        InfBoundary.PositiveInfinity,
                    ),
                ).toEqual(0);

                expect(await client.set(key2, "foo")).toEqual("OK");
                await expect(
                    client.zcount(
                        key2,
                        InfBoundary.NegativeInfinity,
                        InfBoundary.PositiveInfinity,
                    ),
                ).rejects.toThrow();
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `zrange by index test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = uuidv4();
                const membersScores = { one: 1, two: 2, three: 3 };
                expect(await client.zadd(key, membersScores)).toEqual(3);

                expect(await client.zrange(key, { start: 0, end: 1 })).toEqual([
                    "one",
                    "two",
                ]);
                const result = await client.zrangeWithScores(key, {
                    start: 0,
                    end: -1,
                });

                expect(result).toEqual(
                    convertElementsAndScores({
                        one: 1.0,
                        two: 2.0,
                        three: 3.0,
                    }),
                );
                expect(
                    await client.zrange(
                        Buffer.from(key),
                        { start: 0, end: 1 },
                        { reverse: true, decoder: Decoder.Bytes },
                    ),
                ).toEqual([Buffer.from("three"), Buffer.from("two")]);
                expect(await client.zrange(key, { start: 3, end: 1 })).toEqual(
                    [],
                );
                expect(
                    await client.zrangeWithScores(key, { start: 3, end: 1 }),
                ).toEqual([]);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `zrange by score test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = uuidv4();
                const membersScores = { one: 1, two: 2, three: 3 };
                expect(await client.zadd(key, membersScores)).toEqual(3);

                expect(
                    await client.zrange(key, {
                        start: InfBoundary.NegativeInfinity,
                        end: { value: 3, isInclusive: false },
                        type: "byScore",
                    }),
                ).toEqual(["one", "two"]);
                const result = await client.zrangeWithScores(Buffer.from(key), {
                    start: InfBoundary.NegativeInfinity,
                    end: InfBoundary.PositiveInfinity,
                    type: "byScore",
                });

                expect(result).toEqual(
                    convertElementsAndScores({
                        one: 1.0,
                        two: 2.0,
                        three: 3.0,
                    }),
                );
                expect(
                    await client.zrange(
                        key,
                        {
                            start: { value: 3, isInclusive: false },
                            end: InfBoundary.NegativeInfinity,
                            type: "byScore",
                        },
                        { reverse: true },
                    ),
                ).toEqual(["two", "one"]);

                expect(
                    await client.zrange(
                        key,
                        {
                            start: InfBoundary.NegativeInfinity,
                            end: InfBoundary.PositiveInfinity,
                            limit: { offset: 1, count: 2 },
                            type: "byScore",
                        },
                        { reverse: false },
                    ),
                ).toEqual(["two", "three"]);

                expect(
                    await client.zrange(
                        key,
                        {
                            start: InfBoundary.NegativeInfinity,
                            end: { value: 3, isInclusive: false },
                            type: "byScore",
                        },
                        { reverse: true },
                    ),
                ).toEqual([]);

                expect(
                    await client.zrange(key, {
                        start: InfBoundary.PositiveInfinity,
                        end: { value: 3, isInclusive: false },
                        type: "byScore",
                    }),
                ).toEqual([]);

                expect(
                    await client.zrangeWithScores(
                        key,
                        {
                            start: InfBoundary.NegativeInfinity,
                            end: { value: 3, isInclusive: false },
                            type: "byScore",
                        },
                        { reverse: true },
                    ),
                ).toEqual([]);

                expect(
                    await client.zrangeWithScores(key, {
                        start: InfBoundary.PositiveInfinity,
                        end: { value: 3, isInclusive: false },
                        type: "byScore",
                    }),
                ).toEqual([]);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `zrange by lex test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = uuidv4();
                const membersScores = { a: 1, b: 2, c: 3 };
                expect(await client.zadd(key, membersScores)).toEqual(3);

                expect(
                    await client.zrange(Buffer.from(key), {
                        start: InfBoundary.NegativeInfinity,
                        end: { value: Buffer.from("c"), isInclusive: false },
                        type: "byLex",
                    }),
                ).toEqual(["a", "b"]);

                expect(
                    await client.zrange(
                        key,
                        {
                            start: InfBoundary.PositiveInfinity,
                            end: InfBoundary.NegativeInfinity,
                            limit: { offset: 1, count: 2 },
                            type: "byLex",
                        },
                        { reverse: true, decoder: Decoder.Bytes },
                    ),
                ).toEqual([Buffer.from("b"), Buffer.from("a")]);

                expect(
                    await client.zrange(
                        key,
                        {
                            start: { value: "c", isInclusive: false },
                            end: InfBoundary.NegativeInfinity,
                            type: "byLex",
                        },
                        { reverse: true },
                    ),
                ).toEqual(["b", "a"]);

                expect(
                    await client.zrange(
                        key,
                        {
                            start: InfBoundary.NegativeInfinity,
                            end: { value: "c", isInclusive: false },
                            type: "byLex",
                        },
                        { reverse: true },
                    ),
                ).toEqual([]);

                expect(
                    await client.zrange(key, {
                        start: InfBoundary.PositiveInfinity,
                        end: { value: "c", isInclusive: false },
                        type: "byLex",
                    }),
                ).toEqual([]);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `zrangeStore by index test_%p`,
        async (protocol) => {
            await runTest(
                async (client: BaseClient, cluster: ValkeyCluster) => {
                    if (cluster.checkIfServerVersionLessThan("6.2.0")) return;

                    const key = "{testKey}:1-" + uuidv4();
                    const destkey = "{testKey}:2-" + uuidv4();
                    const membersScores = { one: 1, two: 2, three: 3 };
                    expect(await client.zadd(key, membersScores)).toEqual(3);

                    expect(
                        await client.zrangeStore(destkey, Buffer.from(key), {
                            start: 0,
                            end: 1,
                        }),
                    ).toEqual(2);
                    expect(
                        await client.zrange(destkey, {
                            start: 0,
                            end: -1,
                        }),
                    ).toEqual(["one", "two"]);

                    expect(
                        await client.zrangeStore(
                            Buffer.from(destkey),
                            key,
                            { start: 0, end: 1 },
                            true,
                        ),
                    ).toEqual(2);
                    expect(
                        await client.zrange(
                            destkey,
                            {
                                start: 0,
                                end: -1,
                            },
                            { reverse: true },
                        ),
                    ).toEqual(["three", "two"]);

                    expect(
                        await client.zrangeStore(destkey, key, {
                            start: 3,
                            end: 1,
                        }),
                    ).toEqual(0);
                },
                protocol,
            );
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `zrangeStore by score test_%p`,
        async (protocol) => {
            await runTest(
                async (client: BaseClient, cluster: ValkeyCluster) => {
                    if (cluster.checkIfServerVersionLessThan("6.2.0")) return;
                    const key = "{testKey}:1-" + uuidv4();
                    const destkey = "{testKey}:2-" + uuidv4();
                    const membersScores = { one: 1, two: 2, three: 3 };
                    expect(await client.zadd(key, membersScores)).toEqual(3);

                    expect(
                        await client.zrangeStore(destkey, key, {
                            start: InfBoundary.NegativeInfinity,
                            end: { value: 3, isInclusive: false },
                            type: "byScore",
                        }),
                    ).toEqual(2);
                    expect(
                        await client.zrange(destkey, {
                            start: 0,
                            end: -1,
                        }),
                    ).toEqual(["one", "two"]);

                    expect(
                        await client.zrangeStore(
                            destkey,
                            key,
                            {
                                start: { value: 3, isInclusive: false },
                                end: InfBoundary.NegativeInfinity,
                                type: "byScore",
                            },
                            true,
                        ),
                    ).toEqual(2);
                    expect(
                        await client.zrange(
                            destkey,
                            {
                                start: 0,
                                end: -1,
                            },
                            { reverse: true },
                        ),
                    ).toEqual(["two", "one"]);

                    expect(
                        await client.zrangeStore(destkey, key, {
                            start: InfBoundary.NegativeInfinity,
                            end: InfBoundary.PositiveInfinity,
                            limit: { offset: 1, count: 2 },
                            type: "byScore",
                        }),
                    ).toEqual(2);
                    expect(
                        await client.zrange(destkey, {
                            start: 0,
                            end: -1,
                        }),
                    ).toEqual(["two", "three"]);

                    expect(
                        await client.zrangeStore(
                            destkey,
                            key,
                            {
                                start: InfBoundary.NegativeInfinity,
                                end: { value: 3, isInclusive: false },
                                type: "byScore",
                            },
                            true,
                        ),
                    ).toEqual(0);

                    expect(
                        await client.zrangeStore(destkey, key, {
                            start: InfBoundary.PositiveInfinity,
                            end: { value: 3, isInclusive: false },
                            type: "byScore",
                        }),
                    ).toEqual(0);
                },
                protocol,
            );
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `zrangeStore by lex test_%p`,
        async (protocol) => {
            await runTest(
                async (client: BaseClient, cluster: ValkeyCluster) => {
                    if (cluster.checkIfServerVersionLessThan("6.2.0")) return;
                    const key = "{testKey}:1-" + uuidv4();
                    const destkey = "{testKey}:2-" + uuidv4();
                    const membersScores = { a: 1, b: 2, c: 3 };
                    expect(await client.zadd(key, membersScores)).toEqual(3);

                    expect(
                        await client.zrangeStore(destkey, key, {
                            start: InfBoundary.NegativeInfinity,
                            end: {
                                value: Buffer.from("c"),
                                isInclusive: false,
                            },
                            type: "byLex",
                        }),
                    ).toEqual(2);
                    expect(
                        await client.zrange(destkey, {
                            start: 0,
                            end: -1,
                        }),
                    ).toEqual(["a", "b"]);

                    expect(
                        await client.zrangeStore(destkey, key, {
                            start: InfBoundary.NegativeInfinity,
                            end: InfBoundary.PositiveInfinity,
                            limit: { offset: 1, count: 2 },
                            type: "byLex",
                        }),
                    ).toEqual(2);
                    expect(
                        await client.zrange(destkey, {
                            start: 0,
                            end: -1,
                        }),
                    ).toEqual(["b", "c"]);

                    expect(
                        await client.zrangeStore(
                            destkey,
                            key,
                            {
                                start: { value: "c", isInclusive: false },
                                end: InfBoundary.NegativeInfinity,
                                type: "byLex",
                            },
                            true,
                        ),
                    ).toEqual(2);
                    expect(
                        await client.zrange(
                            destkey,
                            {
                                start: 0,
                                end: -1,
                            },
                            { reverse: true },
                        ),
                    ).toEqual(["b", "a"]);

                    expect(
                        await client.zrangeStore(
                            destkey,
                            key,
                            {
                                start: InfBoundary.NegativeInfinity,
                                end: { value: "c", isInclusive: false },
                                type: "byLex",
                            },
                            true,
                        ),
                    ).toEqual(0);

                    expect(
                        await client.zrangeStore(destkey, key, {
                            start: InfBoundary.PositiveInfinity,
                            end: { value: "c", isInclusive: false },
                            type: "byLex",
                        }),
                    ).toEqual(0);
                },
                protocol,
            );
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `zrange and zrangeStore different types of keys test_%p`,
        async (protocol) => {
            await runTest(
                async (client: BaseClient, cluster: ValkeyCluster) => {
                    const key = "{testKey}:1-" + uuidv4();
                    const nonExistingKey = "{testKey}:2-" + uuidv4();
                    const destkey = "{testKey}:3-" + uuidv4();

                    // test non-existing key - return an empty set
                    expect(
                        await client.zrange(nonExistingKey, {
                            start: 0,
                            end: 1,
                        }),
                    ).toEqual([]);

                    expect(
                        await client.zrangeWithScores(nonExistingKey, {
                            start: 0,
                            end: 1,
                        }),
                    ).toEqual([]);

                    // test against a non-sorted set - throw RequestError
                    expect(await client.set(key, "value")).toEqual("OK");

                    await expect(
                        client.zrange(key, { start: 0, end: 1 }),
                    ).rejects.toThrow();

                    await expect(
                        client.zrangeWithScores(key, { start: 0, end: 1 }),
                    ).rejects.toThrow();

                    // test zrangeStore - added in version 6.2.0
                    if (cluster.checkIfServerVersionLessThan("6.2.0")) return;

                    // test non-existing key - stores an empty set
                    expect(
                        await client.zrangeStore(destkey, nonExistingKey, {
                            start: 0,
                            end: 1,
                        }),
                    ).toEqual(0);

                    // test against a non-sorted set - throw RequestError
                    await expect(
                        client.zrangeStore(destkey, key, { start: 0, end: 1 }),
                    ).rejects.toThrow();
                },
                protocol,
            );
        },
        config.timeout,
    );

    // Zinterstore command tests
    async function zinterstoreWithAggregation(client: BaseClient) {
        const key1 = "{testKey}:1-" + uuidv4();
        const key2 = "{testKey}:2-" + uuidv4();
        const key3 = "{testKey}:3-" + uuidv4();
        const range = {
            start: 0,
            end: -1,
        };

        const membersScores1 = { one: 1.0, two: 2.0 };
        const membersScores2 = { one: 2.0, two: 3.0, three: 4.0 };

        expect(await client.zadd(key1, membersScores1)).toEqual(2);
        expect(await client.zadd(key2, membersScores2)).toEqual(3);

        // Intersection results are aggregated by the MAX score of elements
        expect(
            await client.zinterstore(key3, [key1, key2], {
                aggregationType: "MAX",
            }),
        ).toEqual(2);
        const zinterstoreMapMax = await client.zrangeWithScores(key3, range);
        const expectedMapMax = {
            one: 2,
            two: 3,
        };
        expect(zinterstoreMapMax).toEqual(
            convertElementsAndScores(expectedMapMax),
        );

        // Intersection results are aggregated by the MIN score of elements
        expect(
            await client.zinterstore(Buffer.from(key3), [key1, key2], {
                aggregationType: "MIN",
            }),
        ).toEqual(2);
        const zinterstoreMapMin = await client.zrangeWithScores(key3, range);
        const expectedMapMin = {
            one: 1,
            two: 2,
        };
        expect(zinterstoreMapMin).toEqual(
            convertElementsAndScores(expectedMapMin),
        );

        // Intersection results are aggregated by the SUM score of elements
        expect(
            await client.zinterstore(key3, [Buffer.from(key1), key2], {
                aggregationType: "SUM",
            }),
        ).toEqual(2);
        const zinterstoreMapSum = await client.zrangeWithScores(key3, range);
        const expectedMapSum = {
            one: 3,
            two: 5,
        };
        expect(zinterstoreMapSum).toEqual(
            convertElementsAndScores(expectedMapSum),
        );
    }

    async function zinterstoreBasicTest(client: BaseClient) {
        const key1 = "{testKey}:1-" + uuidv4();
        const key2 = "{testKey}:2-" + uuidv4();
        const key3 = "{testKey}:3-" + uuidv4();
        const range = {
            start: 0,
            end: -1,
        };

        const membersScores1 = { one: 1.0, two: 2.0 };
        const membersScores2 = { one: 2.0, two: 3.0, three: 4.0 };

        expect(await client.zadd(key1, membersScores1)).toEqual(2);
        expect(await client.zadd(key2, membersScores2)).toEqual(3);

        expect(await client.zinterstore(key3, [key1, key2])).toEqual(2);
        const zinterstoreMap = await client.zrangeWithScores(key3, range);
        const expectedMap = {
            one: 3,
            two: 5,
        };
        expect(zinterstoreMap).toEqual(convertElementsAndScores(expectedMap));
    }

    async function zinterstoreWithWeightsAndAggregation(client: BaseClient) {
        const key1 = "{testKey}:1-" + uuidv4();
        const key2 = "{testKey}:2-" + uuidv4();
        const key3 = "{testKey}:3-" + uuidv4();
        const range = {
            start: 0,
            end: -1,
        };
        const membersScores1 = { one: 1.0, two: 2.0 };
        const membersScores2 = { one: 2.0, two: 3.0, three: 4.0 };

        expect(await client.zadd(key1, membersScores1)).toEqual(2);
        expect(await client.zadd(key2, membersScores2)).toEqual(3);

        // Scores are multiplied by 2.0 for key1 and key2 during aggregation.
        expect(
            await client.zinterstore(
                key3,
                [
                    [key1, 2.0],
                    [key2, 2.0],
                ],
                { aggregationType: "SUM" },
            ),
        ).toEqual(2);
        const zinterstoreMapMultiplied = await client.zrangeWithScores(
            key3,
            range,
        );
        const expectedMapMultiplied = {
            one: 6,
            two: 10,
        };
        expect(zinterstoreMapMultiplied).toEqual(
            convertElementsAndScores(expectedMapMultiplied),
        );
    }

    async function zinterstoreEmptyCases(client: BaseClient) {
        const key1 = "{testKey}:1-" + uuidv4();
        const key2 = "{testKey}:2-" + uuidv4();

        // Non existing key
        expect(
            await client.zinterstore(key2, [
                key1,
                "{testKey}-non_existing_key",
            ]),
        ).toEqual(0);

        // Empty list check
        await expect(client.zinterstore("{xyz}", [])).rejects.toThrow();
    }

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `zinterstore test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                await zinterstoreBasicTest(client);
                await zinterstoreWithAggregation(client);
                await zinterstoreWithWeightsAndAggregation(client);
                await zinterstoreEmptyCases(client);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `zinter basic test_%p`,
        async (protocol) => {
            await runTest(
                async (client: BaseClient, cluster: ValkeyCluster) => {
                    if (cluster.checkIfServerVersionLessThan("6.2.0")) return;
                    const key1 = "{testKey}:1-" + uuidv4();
                    const key2 = "{testKey}:2-" + uuidv4();

                    const membersScores1 = { one: 1.0, two: 2.0 };
                    const membersScores2 = { one: 1.5, two: 2.5, three: 3.5 };

                    expect(await client.zadd(key1, membersScores1)).toEqual(2);
                    expect(await client.zadd(key2, membersScores2)).toEqual(3);

                    expect(await client.zinter([key1, key2])).toEqual([
                        "one",
                        "two",
                    ]);
                    expect(
                        await client.zinter([key1, Buffer.from(key2)]),
                    ).toEqual(["one", "two"]);
                    expect(
                        await client.zinter([key1, key2], {
                            decoder: Decoder.Bytes,
                        }),
                    ).toEqual([Buffer.from("one"), Buffer.from("two")]);
                },
                protocol,
            );
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `zinter with scores basic test_%p`,
        async (protocol) => {
            await runTest(
                async (client: BaseClient, cluster: ValkeyCluster) => {
                    if (cluster.checkIfServerVersionLessThan("6.2.0")) return;
                    const key1 = "{testKey}:1-" + uuidv4();
                    const key2 = "{testKey}:2-" + uuidv4();

                    const membersScores1 = { one: 1.0, two: 2.0 };
                    const membersScores2 = { one: 1.5, two: 2.5, three: 3.5 };

                    expect(await client.zadd(key1, membersScores1)).toEqual(2);
                    expect(await client.zadd(key2, membersScores2)).toEqual(3);

                    const resultZinterWithScores =
                        await client.zinterWithScores([
                            key1,
                            Buffer.from(key2),
                        ]);
                    const expectedZinterWithScores = {
                        one: 2.5,
                        two: 4.5,
                    };
                    expect(resultZinterWithScores).toEqual(
                        convertElementsAndScores(expectedZinterWithScores),
                    );
                },
                protocol,
            );
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `zinter with scores with max aggregation test_%p`,
        async (protocol) => {
            await runTest(
                async (client: BaseClient, cluster: ValkeyCluster) => {
                    if (cluster.checkIfServerVersionLessThan("6.2.0")) return;
                    const key1 = "{testKey}:1-" + uuidv4();
                    const key2 = "{testKey}:2-" + uuidv4();

                    const membersScores1 = { one: 1.0, two: 2.0 };
                    const membersScores2 = { one: 1.5, two: 2.5, three: 3.5 };

                    expect(await client.zadd(key1, membersScores1)).toEqual(2);
                    expect(await client.zadd(key2, membersScores2)).toEqual(3);

                    // Intersection results are aggregated by the MAX score of elements
                    const zinterWithScoresResults =
                        await client.zinterWithScores([key1, key2], {
                            aggregationType: "MAX",
                            decoder: Decoder.Bytes,
                        });
                    const expected = [
                        {
                            element: Buffer.from("one"),
                            score: 1.5,
                        },
                        {
                            element: Buffer.from("two"),
                            score: 2.5,
                        },
                    ];
                    expect(zinterWithScoresResults).toEqual(expected);
                },
                protocol,
            );
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `zinter with scores with min aggregation test_%p`,
        async (protocol) => {
            await runTest(
                async (client: BaseClient, cluster: ValkeyCluster) => {
                    if (cluster.checkIfServerVersionLessThan("6.2.0")) return;
                    const key1 = "{testKey}:1-" + uuidv4();
                    const key2 = "{testKey}:2-" + uuidv4();

                    const membersScores1 = { one: 1.0, two: 2.0 };
                    const membersScores2 = { one: 1.5, two: 2.5, three: 3.5 };

                    expect(await client.zadd(key1, membersScores1)).toEqual(2);
                    expect(await client.zadd(key2, membersScores2)).toEqual(3);

                    // Intersection results are aggregated by the MIN score of elements
                    const zinterWithScoresResults =
                        await client.zinterWithScores([key1, key2], {
                            aggregationType: "MIN",
                        });
                    const expectedMapMin = {
                        one: 1.0,
                        two: 2.0,
                    };
                    expect(zinterWithScoresResults).toEqual(
                        convertElementsAndScores(expectedMapMin),
                    );
                },
                protocol,
            );
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `zinter with scores with sum aggregation test_%p`,
        async (protocol) => {
            await runTest(
                async (client: BaseClient, cluster: ValkeyCluster) => {
                    if (cluster.checkIfServerVersionLessThan("6.2.0")) return;
                    const key1 = "{testKey}:1-" + uuidv4();
                    const key2 = "{testKey}:2-" + uuidv4();

                    const membersScores1 = { one: 1.0, two: 2.0 };
                    const membersScores2 = { one: 1.5, two: 2.5, three: 3.5 };

                    expect(await client.zadd(key1, membersScores1)).toEqual(2);
                    expect(await client.zadd(key2, membersScores2)).toEqual(3);

                    // Intersection results are aggregated by the SUM score of elements
                    const zinterWithScoresResults =
                        await client.zinterWithScores([key1, key2], {
                            aggregationType: "SUM",
                        });
                    const expectedMapSum = {
                        one: 2.5,
                        two: 4.5,
                    };
                    expect(zinterWithScoresResults).toEqual(
                        convertElementsAndScores(expectedMapSum),
                    );
                },
                protocol,
            );
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `zinter with scores with weights and aggregation test_%p`,
        async (protocol) => {
            await runTest(
                async (client: BaseClient, cluster: ValkeyCluster) => {
                    if (cluster.checkIfServerVersionLessThan("6.2.0")) return;
                    const key1 = "{testKey}:1-" + uuidv4();
                    const key2 = "{testKey}:2-" + uuidv4();

                    const membersScores1 = { one: 1.0, two: 2.0 };
                    const membersScores2 = { one: 1.5, two: 2.5, three: 3.5 };

                    expect(await client.zadd(key1, membersScores1)).toEqual(2);
                    expect(await client.zadd(key2, membersScores2)).toEqual(3);

                    // Intersection results are aggregated by the SUM score of elements with weights
                    const zinterWithScoresResults =
                        await client.zinterWithScores(
                            [
                                [key1, 3],
                                [key2, 2],
                            ],
                            { aggregationType: "SUM" },
                        );
                    const expectedMapSum = {
                        one: 6,
                        two: 11,
                    };
                    expect(zinterWithScoresResults).toEqual(
                        convertElementsAndScores(expectedMapSum),
                    );
                },
                protocol,
            );
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `zinter empty test_%p`,
        async (protocol) => {
            await runTest(
                async (client: BaseClient, cluster: ValkeyCluster) => {
                    if (cluster.checkIfServerVersionLessThan("6.2.0")) return;
                    const key1 = "{testKey}:1-" + uuidv4();

                    // Non existing key zinter
                    expect(
                        await client.zinter([
                            key1,
                            "{testKey}-non_existing_key",
                        ]),
                    ).toEqual([]);

                    // Non existing key zinterWithScores
                    expect(
                        await client.zinterWithScores([
                            key1,
                            "{testKey}-non_existing_key",
                        ]),
                    ).toEqual([]);

                    // Empty list check zinter
                    await expect(client.zinter([])).rejects.toThrow();

                    // Empty list check zinterWithScores
                    await expect(client.zinterWithScores([])).rejects.toThrow();
                },
                protocol,
            );
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `zunion basic test_%p`,
        async (protocol) => {
            await runTest(
                async (client: BaseClient, cluster: ValkeyCluster) => {
                    if (cluster.checkIfServerVersionLessThan("6.2.0")) return;
                    const key1 = "{testKey}:1-" + uuidv4();
                    const key2 = "{testKey}:2-" + uuidv4();

                    const membersScores1 = { one: 1.0, two: 2.0 };
                    const membersScores2 = { one: 1.5, two: 2.5, three: 3.5 };

                    expect(await client.zadd(key1, membersScores1)).toEqual(2);
                    expect(await client.zadd(key2, membersScores2)).toEqual(3);

                    const expectedZunion = ["one", "two", "three"].sort();

                    expect(
                        (await client.zunion([key1, Buffer.from(key2)])).sort(),
                    ).toEqual(expectedZunion);
                    expect(
                        (
                            await client.zunion([key1, key2], {
                                decoder: Decoder.Bytes,
                            })
                        ).sort(),
                    ).toEqual(expectedZunion.map(Buffer.from));
                },
                protocol,
            );
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `zunion with scores basic test_%p`,
        async (protocol) => {
            await runTest(
                async (client: BaseClient, cluster: ValkeyCluster) => {
                    if (cluster.checkIfServerVersionLessThan("6.2.0")) return;
                    const key1 = "{testKey}:1-" + uuidv4();
                    const key2 = "{testKey}:2-" + uuidv4();

                    const membersScores1 = { one: 1.0, two: 2.0 };
                    const membersScores2 = { one: 1.5, two: 2.5, three: 3.5 };

                    expect(await client.zadd(key1, membersScores1)).toEqual(2);
                    expect(await client.zadd(key2, membersScores2)).toEqual(3);

                    const resultZunionWithScores =
                        await client.zunionWithScores([key1, key2]);
                    const expectedZunionWithScores = {
                        one: 2.5,
                        two: 4.5,
                        three: 3.5,
                    };
                    expect(resultZunionWithScores).toEqual(
                        convertElementsAndScores(expectedZunionWithScores).sort(
                            (a, b) => a.score - b.score,
                        ),
                    );
                },
                protocol,
            );
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `zunion with scores with max aggregation test_%p`,
        async (protocol) => {
            await runTest(
                async (client: BaseClient, cluster: ValkeyCluster) => {
                    if (cluster.checkIfServerVersionLessThan("6.2.0")) return;
                    const key1 = "{testKey}:1-" + uuidv4();
                    const key2 = "{testKey}:2-" + uuidv4();

                    const membersScores1 = { one: 1.0, two: 2.0 };
                    const membersScores2 = { one: 1.5, two: 2.5, three: 3.5 };

                    expect(await client.zadd(key1, membersScores1)).toEqual(2);
                    expect(await client.zadd(key2, membersScores2)).toEqual(3);

                    // Union results are aggregated by the MAX score of elements
                    const zunionWithScoresResults =
                        await client.zunionWithScores(
                            [key1, Buffer.from(key2)],
                            { aggregationType: "MAX", decoder: Decoder.Bytes },
                        );
                    const expected = [
                        {
                            element: Buffer.from("one"),
                            score: 1.5,
                        },
                        {
                            element: Buffer.from("two"),
                            score: 2.5,
                        },
                        {
                            element: Buffer.from("three"),
                            score: 3.5,
                        },
                    ];
                    expect(zunionWithScoresResults).toEqual(expected);
                },
                protocol,
            );
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `zunion with scores with min aggregation test_%p`,
        async (protocol) => {
            await runTest(
                async (client: BaseClient, cluster: ValkeyCluster) => {
                    if (cluster.checkIfServerVersionLessThan("6.2.0")) return;
                    const key1 = "{testKey}:1-" + uuidv4();
                    const key2 = "{testKey}:2-" + uuidv4();

                    const membersScores1 = { one: 1.0, two: 2.0 };
                    const membersScores2 = { one: 1.5, two: 2.5, three: 3.5 };

                    expect(await client.zadd(key1, membersScores1)).toEqual(2);
                    expect(await client.zadd(key2, membersScores2)).toEqual(3);

                    // Union results are aggregated by the MIN score of elements
                    const zunionWithScoresResults =
                        await client.zunionWithScores([key1, key2], {
                            aggregationType: "MIN",
                        });
                    const expectedMapMin = {
                        one: 1.0,
                        two: 2.0,
                        three: 3.5,
                    };
                    expect(zunionWithScoresResults).toEqual(
                        convertElementsAndScores(expectedMapMin),
                    );
                },
                protocol,
            );
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `zunion with scores with sum aggregation test_%p`,
        async (protocol) => {
            await runTest(
                async (client: BaseClient, cluster: ValkeyCluster) => {
                    if (cluster.checkIfServerVersionLessThan("6.2.0")) return;
                    const key1 = "{testKey}:1-" + uuidv4();
                    const key2 = "{testKey}:2-" + uuidv4();

                    const membersScores1 = { one: 1.0, two: 2.0 };
                    const membersScores2 = { one: 1.5, two: 2.5, three: 3.5 };

                    expect(await client.zadd(key1, membersScores1)).toEqual(2);
                    expect(await client.zadd(key2, membersScores2)).toEqual(3);

                    // Union results are aggregated by the SUM score of elements
                    const zunionWithScoresResults =
                        await client.zunionWithScores([key1, key2], {
                            aggregationType: "SUM",
                        });
                    const expectedMapSum = {
                        one: 2.5,
                        two: 4.5,
                        three: 3.5,
                    };
                    expect(zunionWithScoresResults).toEqual(
                        convertElementsAndScores(expectedMapSum).sort(
                            (a, b) => a.score - b.score,
                        ),
                    );
                },
                protocol,
            );
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `zunion with scores with weights and aggregation test_%p`,
        async (protocol) => {
            await runTest(
                async (client: BaseClient, cluster: ValkeyCluster) => {
                    if (cluster.checkIfServerVersionLessThan("6.2.0")) return;
                    const key1 = "{testKey}:1-" + uuidv4();
                    const key2 = "{testKey}:2-" + uuidv4();

                    const membersScores1 = { one: 1.0, two: 2.0 };
                    const membersScores2 = { one: 1.5, two: 2.5, three: 3.5 };

                    expect(await client.zadd(key1, membersScores1)).toEqual(2);
                    expect(await client.zadd(key2, membersScores2)).toEqual(3);

                    // Union results are aggregated by the SUM score of elements with weights
                    const zunionWithScoresResults =
                        await client.zunionWithScores(
                            [
                                [key1, 3],
                                [Buffer.from(key2), 2],
                            ],
                            { aggregationType: "SUM" },
                        );
                    const expectedMapSum = {
                        one: 6,
                        two: 11,
                        three: 7,
                    };
                    expect(zunionWithScoresResults).toEqual(
                        convertElementsAndScores(expectedMapSum).sort(
                            (a, b) => a.score - b.score,
                        ),
                    );
                },
                protocol,
            );
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `zunion empty test_%p`,
        async (protocol) => {
            await runTest(
                async (client: BaseClient, cluster: ValkeyCluster) => {
                    if (cluster.checkIfServerVersionLessThan("6.2.0")) return;
                    const key1 = "{testKey}:1-" + uuidv4();

                    const membersScores1 = { one: 1.0, two: 2.0 };

                    expect(await client.zadd(key1, membersScores1)).toEqual(2);

                    // Non existing key zunion
                    expect(
                        await client.zunion([
                            key1,
                            "{testKey}-non_existing_key",
                        ]),
                    ).toEqual(["one", "two"]);

                    // Non existing key zunionWithScores
                    expect(
                        await client.zunionWithScores([
                            key1,
                            "{testKey}-non_existing_key",
                        ]),
                    ).toEqual(convertElementsAndScores(membersScores1));

                    // Empty list check zunion
                    await expect(client.zunion([])).rejects.toThrow();

                    // Empty list check zunionWithScores
                    await expect(client.zunionWithScores([])).rejects.toThrow();
                },
                protocol,
            );
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `type test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = uuidv4();
                expect(await client.set(key, "value")).toEqual("OK");
                expect(await client.type(key)).toEqual("string");
                expect(await client.del([key])).toEqual(1);

                expect(await client.lpush(key, ["value"])).toEqual(1);
                expect(await client.type(Buffer.from(key))).toEqual("list");
                expect(await client.del([key])).toEqual(1);

                expect(await client.sadd(key, ["value"])).toEqual(1);
                expect(await client.type(key)).toEqual("set");
                expect(await client.del([key])).toEqual(1);

                expect(await client.zadd(key, { member: 1.0 })).toEqual(1);
                expect(await client.type(key)).toEqual("zset");
                expect(await client.del([key])).toEqual(1);

                expect(await client.hset(key, { field: "value" })).toEqual(1);
                expect(await client.type(Buffer.from(key))).toEqual("hash");
                expect(await client.del([key])).toEqual(1);

                await client.xadd(key, [["field", "value"]]);
                expect(await client.type(key)).toEqual("stream");
                expect(await client.del([key])).toEqual(1);
                expect(await client.type(key)).toEqual("none");
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `echo test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const message = uuidv4();
                expect(await client.echo(message)).toEqual(message);
                expect(
                    client instanceof GlideClient
                        ? await client.echo(message, {
                              decoder: Decoder.String,
                          })
                        : await client.echo(message, {
                              decoder: Decoder.String,
                          }),
                ).toEqual(message);
                expect(
                    client instanceof GlideClient
                        ? await client.echo(message, { decoder: Decoder.Bytes })
                        : await client.echo(message, {
                              decoder: Decoder.Bytes,
                          }),
                ).toEqual(Buffer.from(message));
                expect(
                    client instanceof GlideClient
                        ? await client.echo(Buffer.from(message), {
                              decoder: Decoder.String,
                          })
                        : await client.echo(Buffer.from(message), {
                              decoder: Decoder.String,
                          }),
                ).toEqual(message);
                expect(await client.echo(Buffer.from(message))).toEqual(
                    message,
                );
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `strlen test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = uuidv4();
                const key1Value = uuidv4();
                const key1ValueLength = key1Value.length;
                expect(await client.set(key1, key1Value)).toEqual("OK");
                expect(await client.strlen(key1)).toEqual(key1ValueLength);

                expect(await client.strlen(Buffer.from("nonExistKey"))).toEqual(
                    0,
                );

                const listName = "myList";
                const listKey1Value = uuidv4();
                const listKey2Value = uuidv4();

                expect(
                    await client.lpush(listName, [
                        listKey1Value,
                        listKey2Value,
                    ]),
                ).toEqual(2);
                // An error is returned when key holds a non-string value
                await expect(client.strlen(listName)).rejects.toThrow();
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `lindex test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const listName = uuidv4();
                const encodedListName = Buffer.from(uuidv4());
                const listKey1Value = uuidv4();
                const listKey2Value = uuidv4();
                expect(
                    await client.lpush(listName, [
                        listKey1Value,
                        listKey2Value,
                    ]),
                ).toEqual(2);
                expect(
                    await client.lpush(encodedListName, [
                        Buffer.from(listKey1Value),
                        Buffer.from(listKey2Value),
                    ]),
                ).toEqual(2);
                expect(await client.lindex(listName, 0)).toEqual(listKey2Value);
                expect(await client.lindex(listName, 1)).toEqual(listKey1Value);
                expect(await client.lindex("notExsitingList", 1)).toEqual(null);
                expect(await client.lindex(listName, 3)).toEqual(null);
                expect(
                    await client.lindex(listName, 0, {
                        decoder: Decoder.Bytes,
                    }),
                ).toEqual(Buffer.from(listKey2Value));
                expect(
                    await client.lindex(listName, 1, {
                        decoder: Decoder.Bytes,
                    }),
                ).toEqual(Buffer.from(listKey1Value));
                expect(await client.lindex(encodedListName, 0)).toEqual(
                    listKey2Value,
                );
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `linsert test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = uuidv4();
                const key2 = uuidv4();
                const key2Encoded = Buffer.from(key2);
                const stringKey = uuidv4();
                const nonExistingKey = uuidv4();

                expect(await client.lpush(key1, ["4", "3", "2", "1"])).toEqual(
                    4,
                );
                expect(
                    await client.linsert(
                        key1,
                        InsertPosition.Before,
                        "2",
                        "1.5",
                    ),
                ).toEqual(5);
                expect(
                    await client.linsert(
                        key1,
                        InsertPosition.After,
                        "3",
                        "3.5",
                    ),
                ).toEqual(6);
                expect(await client.lrange(key1, 0, -1)).toEqual([
                    "1",
                    "1.5",
                    "2",
                    "3",
                    "3.5",
                    "4",
                ]);

                expect(
                    await client.linsert(
                        key1,
                        InsertPosition.Before,
                        "nonExistingPivot",
                        "4",
                    ),
                ).toEqual(-1);
                expect(
                    await client.linsert(
                        nonExistingKey,
                        InsertPosition.Before,
                        "pivot",
                        "elem",
                    ),
                ).toEqual(0);

                // key, pivot and element as buffers
                expect(await client.lpush(key2, ["4", "3", "2", "1"])).toEqual(
                    4,
                );
                expect(
                    await client.linsert(
                        key2Encoded,
                        InsertPosition.Before,
                        Buffer.from("2"),
                        Buffer.from("1.5"),
                    ),
                ).toEqual(5);
                expect(
                    await client.linsert(
                        key2Encoded,
                        InsertPosition.After,
                        Buffer.from("3"),
                        Buffer.from("3.5"),
                    ),
                ).toEqual(6);
                expect(await client.lrange(key2Encoded, 0, -1)).toEqual([
                    "1",
                    "1.5",
                    "2",
                    "3",
                    "3.5",
                    "4",
                ]);

                // key exists, but it is not a list
                expect(await client.set(stringKey, "value")).toEqual("OK");
                await expect(
                    client.linsert(stringKey, InsertPosition.Before, "a", "b"),
                ).rejects.toThrow();
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `zpopmin test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = uuidv4();
                const membersScores = { a: 1, b: 2, c: 3 };
                expect(await client.zadd(key, membersScores)).toEqual(3);
                expect(await client.zpopmin(Buffer.from(key))).toEqual(
                    convertElementsAndScores({ a: 1.0 }),
                );

                expect(
                    await client.zpopmin(key, {
                        count: 3,
                        decoder: Decoder.Bytes,
                    }),
                ).toEqual([
                    {
                        element: Buffer.from("b"),
                        score: 2.0,
                    },
                    {
                        element: Buffer.from("c"),
                        score: 3.0,
                    },
                ]);
                expect(await client.zpopmin(key)).toEqual([]);
                expect(await client.set(key, "value")).toEqual("OK");
                await expect(client.zpopmin(key)).rejects.toThrow();
                expect(await client.zpopmin("notExsitingKey")).toEqual([]);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `zpopmax test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = uuidv4();
                const membersScores = { a: 1, b: 2, c: 3 };
                expect(await client.zadd(key, membersScores)).toEqual(3);
                expect(await client.zpopmax(Buffer.from(key))).toEqual(
                    convertElementsAndScores({ c: 3.0 }),
                );

                expect(
                    await client.zpopmax(key, {
                        count: 3,
                        decoder: Decoder.Bytes,
                    }),
                ).toEqual([
                    {
                        element: Buffer.from("b"),
                        score: 2.0,
                    },
                    {
                        element: Buffer.from("a"),
                        score: 1.0,
                    },
                ]);
                expect(await client.zpopmax(key)).toEqual([]);
                expect(await client.set(key, "value")).toEqual("OK");
                await expect(client.zpopmax(key)).rejects.toThrow();
                expect(await client.zpopmax("notExsitingKey")).toEqual([]);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `bzpopmax test_%p`,
        async (protocol) => {
            await runTest(
                async (client: BaseClient, cluster: ValkeyCluster) => {
                    const key1 = "{key}-1" + uuidv4();
                    const key2 = "{key}-2" + uuidv4();
                    const key3 = "{key}-3" + uuidv4();

                    expect(await client.zadd(key1, { a: 1.0, b: 1.5 })).toBe(2);
                    expect(await client.zadd(key2, { c: 2.0 })).toBe(1);
                    expect(await client.bzpopmax([key1, key2], 0.5)).toEqual([
                        key1,
                        "b",
                        1.5,
                    ]);

                    // nothing popped out / key does not exist
                    expect(
                        await client.bzpopmax(
                            [key3],
                            cluster.checkIfServerVersionLessThan("7.0.0")
                                ? 1.0
                                : 0.01,
                        ),
                    ).toBeNull();

                    // pops from the second key
                    expect(
                        await client.bzpopmax([key3, Buffer.from(key2)], 0.5),
                    ).toEqual([key2, "c", 2.0]);
                    // pop with decoder
                    expect(
                        await client.bzpopmax([key1], 0.5, {
                            decoder: Decoder.Bytes,
                        }),
                    ).toEqual([Buffer.from(key1), Buffer.from("a"), 1.0]);

                    // key exists but holds non-ZSET value
                    expect(await client.set(key3, "bzpopmax")).toBe("OK");
                    await expect(client.bzpopmax([key3], 0.5)).rejects.toThrow(
                        RequestError,
                    );
                },
                protocol,
            );
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `bzpopmin test_%p`,
        async (protocol) => {
            await runTest(
                async (client: BaseClient, cluster: ValkeyCluster) => {
                    const key1 = "{key}-1" + uuidv4();
                    const key2 = "{key}-2" + uuidv4();
                    const key3 = "{key}-3" + uuidv4();

                    expect(await client.zadd(key1, { a: 1.0, b: 1.5 })).toBe(2);
                    expect(await client.zadd(key2, { c: 2.0 })).toBe(1);
                    expect(await client.bzpopmin([key1, key2], 0.5)).toEqual([
                        key1,
                        "a",
                        1.0,
                    ]);

                    // nothing popped out / key does not exist
                    expect(
                        await client.bzpopmin(
                            [key3],
                            cluster.checkIfServerVersionLessThan("7.0.0")
                                ? 1.0
                                : 0.01,
                        ),
                    ).toBeNull();

                    // pops from the second key
                    expect(
                        await client.bzpopmin([key3, Buffer.from(key2)], 0.5),
                    ).toEqual([key2, "c", 2.0]);
                    // pop with decoder
                    expect(
                        await client.bzpopmin([key1], 0.5, {
                            decoder: Decoder.Bytes,
                        }),
                    ).toEqual([Buffer.from(key1), Buffer.from("b"), 1.5]);

                    // key exists but holds non-ZSET value
                    expect(await client.set(key3, "bzpopmin")).toBe("OK");
                    await expect(client.bzpopmin([key3], 0.5)).rejects.toThrow(
                        RequestError,
                    );
                },
                protocol,
            );
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `Pttl test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = uuidv4();
                expect(await client.pttl(key)).toEqual(-2);

                expect(await client.set(key, "value")).toEqual("OK");
                expect(await client.pttl(key)).toEqual(-1);

                expect(await client.expire(key, 10)).toEqual(true);
                let result = await client.pttl(Buffer.from(key));
                expect(result).toBeGreaterThan(0);
                expect(result).toBeLessThanOrEqual(10000);

                expect(
                    await client.expireAt(
                        key,
                        Math.floor(Date.now() / 1000) + 20,
                    ),
                ).toEqual(true);
                result = await client.pttl(key);
                expect(result).toBeGreaterThan(0);
                expect(result).toBeLessThanOrEqual(20000);

                expect(await client.pexpireAt(key, Date.now() + 30000)).toEqual(
                    true,
                );
                result = await client.pttl(key);
                expect(result).toBeGreaterThan(0);
                expect(result).toBeLessThanOrEqual(30000);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `zremRangeByRank test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = uuidv4();
                const membersScores = { one: 1, two: 2, three: 3 };
                expect(await client.zadd(key, membersScores)).toEqual(3);
                expect(await client.zremRangeByRank(key, 2, 1)).toEqual(0);
                expect(
                    await client.zremRangeByRank(Buffer.from(key), 0, 1),
                ).toEqual(2);
                expect(await client.zremRangeByRank(key, 0, 10)).toEqual(1);
                expect(
                    await client.zremRangeByRank("nonExistingKey", 0, -1),
                ).toEqual(0);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `zrank test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient, cluster) => {
                const key1 = uuidv4();
                const key2 = uuidv4();
                const membersScores = { one: 1.5, two: 2, three: 3 };
                expect(await client.zadd(key1, membersScores)).toEqual(3);
                expect(await client.zrank(key1, "one")).toEqual(0);
                expect(
                    await client.zrank(Buffer.from(key1), Buffer.from("one")),
                ).toEqual(0);

                if (!cluster.checkIfServerVersionLessThan("7.2.0")) {
                    expect(await client.zrankWithScore(key1, "one")).toEqual([
                        0, 1.5,
                    ]);
                    expect(
                        await client.zrankWithScore(
                            Buffer.from(key1),
                            Buffer.from("one"),
                        ),
                    ).toEqual([0, 1.5]);
                    expect(
                        await client.zrankWithScore(key1, "nonExistingMember"),
                    ).toEqual(null);
                    expect(
                        await client.zrankWithScore("nonExistingKey", "member"),
                    ).toEqual(null);
                }

                expect(await client.zrank(key1, "nonExistingMember")).toEqual(
                    null,
                );
                expect(await client.zrank("nonExistingKey", "member")).toEqual(
                    null,
                );

                expect(await client.set(key2, "value")).toEqual("OK");
                await expect(client.zrank(key2, "member")).rejects.toThrow();
            }, protocol);
        },
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `zrevrank test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient, cluster) => {
                const key = uuidv4();
                const nonSetKey = uuidv4();
                const membersScores = { one: 1.5, two: 2, three: 3 };
                expect(await client.zadd(key, membersScores)).toEqual(3);
                expect(await client.zrevrank(key, "three")).toEqual(0);
                expect(
                    await client.zrevrank(
                        Buffer.from(key),
                        Buffer.from("three"),
                    ),
                ).toEqual(0);

                if (!cluster.checkIfServerVersionLessThan("7.2.0")) {
                    expect(await client.zrevrankWithScore(key, "one")).toEqual([
                        2, 1.5,
                    ]);
                    expect(
                        await client.zrevrankWithScore(
                            Buffer.from(key),
                            Buffer.from("one"),
                        ),
                    ).toEqual([2, 1.5]);
                    expect(
                        await client.zrevrankWithScore(
                            key,
                            "nonExistingMember",
                        ),
                    ).toBeNull();
                    expect(
                        await client.zrevrankWithScore(
                            "nonExistingKey",
                            "member",
                        ),
                    ).toBeNull();
                }

                expect(
                    await client.zrevrank(key, "nonExistingMember"),
                ).toBeNull();
                expect(
                    await client.zrevrank("nonExistingKey", "member"),
                ).toBeNull();

                // Key exists, but is not a sorted set
                expect(await client.set(nonSetKey, "value")).toEqual("OK");
                await expect(
                    client.zrevrank(nonSetKey, "member"),
                ).rejects.toThrow();
            }, protocol);
        },
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `test brpop test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                expect(
                    await client.rpush("brpop-test", ["foo", "bar", "baz"]),
                ).toEqual(3);
                // Test basic usage
                expect(await client.brpop(["brpop-test"], 0.1)).toEqual([
                    "brpop-test",
                    "baz",
                ]);
                // Test encoded value
                expect(
                    await client.brpop(["brpop-test"], 0.1, {
                        decoder: Decoder.Bytes,
                    }),
                ).toEqual([Buffer.from("brpop-test"), Buffer.from("bar")]);
                // Delete all values from list
                expect(await client.del(["brpop-test"])).toEqual(1);
                // Test null return when key doesn't exist
                expect(await client.brpop(["brpop-test"], 0.1)).toEqual(null);
                // key exists, but it is not a list
                await client.set("foo", "bar");
                await expect(client.brpop(["foo"], 0.1)).rejects.toThrow();
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `test blpop test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                expect(
                    await client.rpush("blpop-test", ["foo", "bar", "baz"]),
                ).toEqual(3);
                // Test basic usage
                expect(await client.blpop(["blpop-test"], 0.1)).toEqual([
                    "blpop-test",
                    "foo",
                ]);
                // Test decoded value
                expect(
                    await client.blpop(["blpop-test"], 0.1, {
                        decoder: Decoder.Bytes,
                    }),
                ).toEqual([Buffer.from("blpop-test"), Buffer.from("bar")]);
                // Delete all values from list
                expect(await client.del(["blpop-test"])).toEqual(1);
                // Test null return when key doesn't exist
                expect(await client.blpop(["blpop-test"], 0.1)).toEqual(null);
                // key exists, but it is not a list
                await client.set("foo", "bar");
                await expect(client.blpop(["foo"], 0.1)).rejects.toThrow();
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `persist test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = uuidv4();
                expect(await client.set(key, "foo")).toEqual("OK");
                expect(await client.persist(key)).toEqual(false);

                expect(await client.expire(key, 10)).toEqual(true);
                expect(await client.persist(Buffer.from(key))).toEqual(true);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `streams add, trim, and len test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = uuidv4();
                const nonExistingKey = uuidv4();
                const stringKey = uuidv4();
                const field1 = uuidv4();
                const field2 = uuidv4();

                const nullResult = await client.xadd(
                    key,
                    [
                        [field1, "foo"],
                        [field2, "bar"],
                    ],
                    {
                        makeStream: false,
                    },
                );
                expect(nullResult).toBeNull();

                const timestamp1 = await client.xadd(
                    key,
                    [
                        [field1, "foo1"],
                        [field2, "bar1"],
                    ],
                    { id: "0-1" },
                );
                expect(timestamp1).toEqual("0-1");
                expect(
                    await client.xadd(key, [
                        [field1, "foo2"],
                        [field2, "bar2"],
                    ]),
                ).not.toBeNull();
                expect(await client.xlen(key)).toEqual(2);

                // this will trim the first entry.
                const id = await client.xadd(
                    key,
                    [
                        [field1, "foo3"],
                        [field2, "bar3"],
                    ],
                    {
                        trim: {
                            method: "maxlen",
                            threshold: 2,
                            exact: true,
                        },
                    },
                );
                expect(id).not.toBeNull();
                expect(await client.xlen(Buffer.from(key))).toEqual(2);

                // this will trim the 2nd entry.
                expect(
                    await client.xadd(
                        key,
                        [
                            [field1, "foo4"],
                            [field2, "bar4"],
                        ],
                        {
                            trim: {
                                method: "minid",
                                threshold: id as string,
                                exact: true,
                            },
                        },
                    ),
                ).not.toBeNull();
                expect(await client.xlen(key)).toEqual(2);

                expect(
                    await client.xtrim(Buffer.from(key), {
                        method: "maxlen",
                        threshold: 1,
                        exact: true,
                    }),
                ).toEqual(1);
                expect(await client.xlen(key)).toEqual(1);

                expect(
                    await client.xtrim(key, {
                        method: "maxlen",
                        threshold: 0,
                        exact: true,
                    }),
                ).toEqual(1);
                // Unlike other Valkey collection types, stream keys still exist even after removing all entries
                expect(await client.exists([key])).toEqual(1);
                expect(await client.xlen(key)).toEqual(0);

                expect(
                    await client.xtrim(nonExistingKey, {
                        method: "maxlen",
                        threshold: 1,
                        exact: true,
                    }),
                ).toEqual(0);
                expect(await client.xlen(nonExistingKey)).toEqual(0);

                // key exists, but it is not a stream
                expect(await client.set(stringKey, "foo")).toEqual("OK");
                await expect(
                    client.xtrim(stringKey, {
                        method: "maxlen",
                        threshold: 1,
                        exact: true,
                    }),
                ).rejects.toThrow();
                await expect(client.xlen(stringKey)).rejects.toThrow();
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `xrange and xrevrange test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient, cluster) => {
                const key = uuidv4();
                const nonExistingKey = uuidv4();
                const stringKey = uuidv4();
                const streamId1 = "0-1";
                const streamId2 = "0-2";
                const streamId3 = "0-3";

                expect(
                    await client.xadd(key, [["f1", "v1"]], { id: streamId1 }),
                ).toEqual(streamId1);
                expect(
                    await client.xadd(key, [["f2", "v2"]], { id: streamId2 }),
                ).toEqual(streamId2);
                expect(await client.xlen(key)).toEqual(2);

                // get everything from the stream
                expect(
                    await client.xrange(
                        key,
                        InfBoundary.NegativeInfinity,
                        InfBoundary.PositiveInfinity,
                    ),
                ).toEqual({
                    [streamId1]: [["f1", "v1"]],
                    [streamId2]: [["f2", "v2"]],
                });

                expect(
                    await client.xrevrange(
                        Buffer.from(key),
                        InfBoundary.PositiveInfinity,
                        InfBoundary.NegativeInfinity,
                    ),
                ).toEqual({
                    [streamId2]: [["f2", "v2"]],
                    [streamId1]: [["f1", "v1"]],
                });

                // returns empty mapping if + before -
                expect(
                    await client.xrange(
                        key,
                        InfBoundary.PositiveInfinity,
                        InfBoundary.NegativeInfinity,
                    ),
                ).toEqual({});
                // rev search returns empty mapping if - before +
                expect(
                    await client.xrevrange(
                        key,
                        InfBoundary.NegativeInfinity,
                        InfBoundary.PositiveInfinity,
                    ),
                ).toEqual({});

                expect(
                    await client.xadd(key, [["f3", "v3"]], { id: streamId3 }),
                ).toEqual(streamId3);

                // get the newest entry
                if (!cluster.checkIfServerVersionLessThan("6.2.0")) {
                    expect(
                        await client.xrange(
                            Buffer.from(key),
                            { isInclusive: false, value: streamId2 },
                            { value: "5" },
                            { count: 1 },
                        ),
                    ).toEqual({ [streamId3]: [["f3", "v3"]] });

                    expect(
                        await client.xrevrange(
                            key,
                            { value: "5" },
                            { isInclusive: false, value: streamId2 },
                            { count: 1 },
                        ),
                    ).toEqual({ [streamId3]: [["f3", "v3"]] });
                }

                // xrange/xrevrange against an emptied stream
                expect(
                    await client.xdel(key, [streamId1, streamId2, streamId3]),
                ).toEqual(3);
                expect(
                    await client.xrange(
                        key,
                        InfBoundary.NegativeInfinity,
                        InfBoundary.PositiveInfinity,
                        { count: 10 },
                    ),
                ).toEqual({});
                expect(
                    await client.xrevrange(
                        key,
                        InfBoundary.PositiveInfinity,
                        InfBoundary.NegativeInfinity,
                        { count: 10 },
                    ),
                ).toEqual({});

                expect(
                    await client.xrange(
                        nonExistingKey,
                        InfBoundary.NegativeInfinity,
                        InfBoundary.PositiveInfinity,
                    ),
                ).toEqual({});
                expect(
                    await client.xrevrange(
                        nonExistingKey,
                        InfBoundary.PositiveInfinity,
                        InfBoundary.NegativeInfinity,
                    ),
                ).toEqual({});

                // count value < 1 returns null
                expect(
                    await client.xrange(
                        key,
                        InfBoundary.NegativeInfinity,
                        InfBoundary.PositiveInfinity,
                        { count: 0 },
                    ),
                ).toEqual(null);
                expect(
                    await client.xrange(
                        key,
                        InfBoundary.NegativeInfinity,
                        InfBoundary.PositiveInfinity,
                        { count: -1 },
                    ),
                ).toEqual(null);
                expect(
                    await client.xrevrange(
                        key,
                        InfBoundary.PositiveInfinity,
                        InfBoundary.NegativeInfinity,
                        { count: 0 },
                    ),
                ).toEqual(null);
                expect(
                    await client.xrevrange(
                        key,
                        InfBoundary.PositiveInfinity,
                        InfBoundary.NegativeInfinity,
                        { count: -1 },
                    ),
                ).toEqual(null);

                // key exists, but it is not a stream
                expect(await client.set(stringKey, "foo"));
                await expect(
                    client.xrange(
                        stringKey,
                        InfBoundary.NegativeInfinity,
                        InfBoundary.PositiveInfinity,
                    ),
                ).rejects.toThrow(RequestError);
                await expect(
                    client.xrevrange(
                        stringKey,
                        InfBoundary.PositiveInfinity,
                        InfBoundary.NegativeInfinity,
                    ),
                ).rejects.toThrow(RequestError);

                // invalid start bound
                await expect(
                    client.xrange(
                        key,
                        { value: "not_a_stream_id" },
                        InfBoundary.PositiveInfinity,
                    ),
                ).rejects.toThrow(RequestError);
                await expect(
                    client.xrevrange(key, InfBoundary.PositiveInfinity, {
                        value: "not_a_stream_id",
                    }),
                ).rejects.toThrow(RequestError);

                // invalid end bound
                await expect(
                    client.xrange(key, InfBoundary.NegativeInfinity, {
                        value: "not_a_stream_id",
                    }),
                ).rejects.toThrow(RequestError);
                await expect(
                    client.xrevrange(
                        key,
                        {
                            value: "not_a_stream_id",
                        },
                        InfBoundary.NegativeInfinity,
                    ),
                ).rejects.toThrow(RequestError);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `zremRangeByLex test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = uuidv4();
                const stringKey = uuidv4();
                const membersScores = { a: 1, b: 2, c: 3, d: 4 };
                expect(await client.zadd(key, membersScores)).toEqual(4);

                expect(
                    await client.zremRangeByLex(
                        key,
                        { value: Buffer.from("a"), isInclusive: false },
                        { value: "c" },
                    ),
                ).toEqual(2);

                expect(
                    await client.zremRangeByLex(
                        Buffer.from(key),
                        { value: "d" },
                        InfBoundary.PositiveInfinity,
                    ),
                ).toEqual(1);

                // MinLex > MaxLex
                expect(
                    await client.zremRangeByLex(
                        key,
                        { value: Buffer.from("a") },
                        InfBoundary.NegativeInfinity,
                    ),
                ).toEqual(0);

                expect(
                    await client.zremRangeByLex(
                        "nonExistingKey",
                        InfBoundary.NegativeInfinity,
                        InfBoundary.PositiveInfinity,
                    ),
                ).toEqual(0);

                // Key exists, but it is not a set
                expect(await client.set(stringKey, "foo")).toEqual("OK");
                await expect(
                    client.zremRangeByLex(
                        stringKey,
                        InfBoundary.NegativeInfinity,
                        InfBoundary.PositiveInfinity,
                    ),
                ).rejects.toThrow(RequestError);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `zremRangeByScore test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = uuidv4();
                const membersScores = { one: 1, two: 2, three: 3 };
                expect(await client.zadd(key, membersScores)).toEqual(3);

                expect(
                    await client.zremRangeByScore(
                        Buffer.from(key),
                        { value: 1, isInclusive: false },
                        { value: 2 },
                    ),
                ).toEqual(1);

                expect(
                    await client.zremRangeByScore(
                        key,
                        { value: 1 },
                        InfBoundary.NegativeInfinity,
                    ),
                ).toEqual(0);

                expect(
                    await client.zremRangeByScore(
                        "nonExistingKey",
                        InfBoundary.NegativeInfinity,
                        InfBoundary.PositiveInfinity,
                    ),
                ).toEqual(0);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `zlexcount test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = uuidv4();
                const stringKey = uuidv4();
                const membersScores = { a: 1, b: 2, c: 3 };
                expect(await client.zadd(key, membersScores)).toEqual(3);

                // In range negative to positive infinity.
                expect(
                    await client.zlexcount(
                        key,
                        InfBoundary.NegativeInfinity,
                        InfBoundary.PositiveInfinity,
                    ),
                ).toEqual(3);

                // In range a (exclusive) to positive infinity
                expect(
                    await client.zlexcount(
                        Buffer.from(key),
                        { value: "a", isInclusive: false },
                        InfBoundary.PositiveInfinity,
                    ),
                ).toEqual(2);

                // In range negative infinity to c (inclusive)
                expect(
                    await client.zlexcount(key, InfBoundary.NegativeInfinity, {
                        value: Buffer.from("c"),
                        isInclusive: true,
                    }),
                ).toEqual(3);

                // Incorrect range start > end
                expect(
                    await client.zlexcount(key, InfBoundary.PositiveInfinity, {
                        value: "c",
                        isInclusive: true,
                    }),
                ).toEqual(0);

                // Non-existing key
                expect(
                    await client.zlexcount(
                        "non_existing_key",
                        InfBoundary.NegativeInfinity,
                        InfBoundary.PositiveInfinity,
                    ),
                ).toEqual(0);

                // Key exists, but it is not a set
                expect(await client.set(stringKey, "foo")).toEqual("OK");
                await expect(
                    client.zlexcount(
                        stringKey,
                        InfBoundary.NegativeInfinity,
                        InfBoundary.PositiveInfinity,
                    ),
                ).rejects.toThrow(RequestError);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        "time test_%p",
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                // Take the time now, convert to 10 digits and subtract 1 second
                const now = Math.floor(new Date().getTime() / 1000 - 1);
                const result = (await client.time()) as [string, string];
                expect(result?.length).toEqual(2);
                expect(Number(result?.at(0))).toBeGreaterThan(now);
                // Test its not more than 1 second
                expect(Number(result?.at(1))).toBeLessThan(1000000);
            }, protocol);
        },
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `streams xread test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = "{xread}-1-" + uuidv4();
                const key2 = "{xread}-2-" + uuidv4();
                const key3 = "{xread}-3-" + uuidv4();
                const field1 = "foo";
                const field2 = "bar";
                const field3 = "barvaz";

                const timestamp_1_1 = (await client.xadd(key1, [
                    [field1, "foo1"],
                    [field3, "barvaz1"],
                ])) as string;
                expect(timestamp_1_1).not.toBeNull();
                const timestamp_2_1 = (await client.xadd(key2, [
                    [field2, "bar1"],
                ])) as string;
                expect(timestamp_2_1).not.toBeNull();
                const timestamp_1_2 = (await client.xadd(key1, [
                    [field1, "foo2"],
                ])) as string;
                const timestamp_2_2 = (await client.xadd(key2, [
                    [field2, "bar2"],
                ])) as string;
                const timestamp_1_3 = (await client.xadd(key1, [
                    [field1, "foo3"],
                    [field3, "barvaz3"],
                ])) as string;
                const timestamp_2_3 = (await client.xadd(key2, [
                    [field2, "bar3"],
                ])) as string;

                const result = await client.xread(
                    [
                        {
                            key: Buffer.from(key1),
                            value: timestamp_1_1,
                        },
                        {
                            key: key2,
                            value: timestamp_2_1,
                        },
                    ],
                    {
                        block: 1,
                    },
                );

                const expected = {
                    [key1]: {
                        [timestamp_1_2]: [[field1, "foo2"]],
                        [timestamp_1_3]: [
                            [field1, "foo3"],
                            [field3, "barvaz3"],
                        ],
                    },
                    [key2]: {
                        [timestamp_2_2]: [["bar", "bar2"]],
                        [timestamp_2_3]: [["bar", "bar3"]],
                    },
                };
                expect(convertGlideRecordToRecord(result!)).toEqual(expected);

                // key does not exist
                expect(await client.xread({ [key3]: "0-0" })).toBeNull();
                expect(
                    await client.xread(
                        {
                            [key2]: timestamp_2_1,
                            [key3]: "0-0",
                        },
                        { decoder: Decoder.Bytes },
                    ),
                ).toEqual([
                    {
                        key: Buffer.from(key2),
                        value: {
                            [timestamp_2_2]: [
                                [Buffer.from("bar"), Buffer.from("bar2")],
                            ],
                            [timestamp_2_3]: [
                                [Buffer.from("bar"), Buffer.from("bar3")],
                            ],
                        },
                    },
                ]);

                // key is not a stream
                expect(await client.set(key3, uuidv4())).toEqual("OK");
                await expect(client.xread({ [key3]: "0-0" })).rejects.toThrow(
                    RequestError,
                );
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `xreadgroup test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = "{xreadgroup}-1-" + uuidv4();
                const key2 = "{xreadgroup}-2-" + uuidv4();
                const key3 = "{xreadgroup}-3-" + uuidv4();
                const group = uuidv4();
                const consumer = uuidv4();

                // setup data & test binary parameters in XGROUP CREATE commands
                expect(
                    await client.xgroupCreate(
                        Buffer.from(key1),
                        Buffer.from(group),
                        "0",
                        {
                            mkStream: true,
                        },
                    ),
                ).toEqual("OK");

                expect(
                    await client.xgroupCreateConsumer(
                        Buffer.from(key1),
                        Buffer.from(group),
                        Buffer.from(consumer),
                    ),
                ).toBeTruthy();

                const entry1 = (await client.xadd(key1, [
                    ["a", "b"],
                ])) as string;
                const entry2 = (await client.xadd(key1, [
                    ["c", "d"],
                ])) as string;

                // read the entire stream for the consumer and mark messages as pending
                expect(
                    convertGlideRecordToRecord(
                        (await client.xreadgroup(
                            Buffer.from(group),
                            Buffer.from(consumer),
                            [
                                {
                                    key: Buffer.from(key1),
                                    value: ">",
                                },
                            ],
                        ))!,
                    ),
                ).toEqual({
                    [key1]: {
                        [entry1]: [["a", "b"]],
                        [entry2]: [["c", "d"]],
                    },
                });

                // delete one of the entries
                expect(await client.xdel(key1, [entry1])).toEqual(1);

                // now xreadgroup returns one empty entry and one non-empty entry
                expect(
                    convertGlideRecordToRecord(
                        (await client.xreadgroup(group, consumer, {
                            [key1]: "0",
                        }))!,
                    ),
                ).toEqual({
                    [key1]: {
                        [entry1]: null,
                        [entry2]: [["c", "d"]],
                    },
                });

                // try to read new messages only
                expect(
                    await client.xreadgroup(group, consumer, { [key1]: ">" }),
                ).toBeNull();

                // add a message and read it with ">"
                const entry3 = (await client.xadd(key1, [
                    ["e", "f"],
                ])) as string;
                expect(
                    convertGlideRecordToRecord(
                        (await client.xreadgroup(group, consumer, {
                            [key1]: ">",
                        }))!,
                    ),
                ).toEqual({
                    [key1]: {
                        [entry3]: [["e", "f"]],
                    },
                });

                // add second key with a group and a consumer, but no messages
                expect(
                    await client.xgroupCreate(key2, group, "0", {
                        mkStream: true,
                    }),
                ).toEqual("OK");
                expect(
                    await client.xgroupCreateConsumer(key2, group, consumer),
                ).toBeTruthy();

                // read both keys
                expect(
                    convertGlideRecordToRecord(
                        (await client.xreadgroup(group, consumer, {
                            [key1]: "0",
                            [key2]: "0",
                        }))!,
                    ),
                ).toEqual({
                    [key1]: {
                        [entry1]: null,
                        [entry2]: [["c", "d"]],
                        [entry3]: [["e", "f"]],
                    },
                    [key2]: {},
                });

                // error cases:
                // key does not exist
                await expect(
                    client.xreadgroup("_", "_", { [key3]: "0-0" }),
                ).rejects.toThrow(RequestError);
                // key is not a stream
                expect(await client.set(key3, uuidv4())).toEqual("OK");
                await expect(
                    client.xreadgroup("_", "_", { [key3]: "0-0" }),
                ).rejects.toThrow(RequestError);
                expect(await client.del([key3])).toEqual(1);
                // group and consumer don't exist
                await client.xadd(key3, [["a", "b"]]);
                await expect(
                    client.xreadgroup("_", "_", { [key3]: "0-0" }),
                ).rejects.toThrow(RequestError);
                // consumer don't exist
                expect(await client.xgroupCreate(key3, group, "0-0")).toEqual(
                    "OK",
                );
                expect(
                    convertGlideRecordToRecord(
                        (await client.xreadgroup(group, "_", {
                            [key3]: "0-0",
                        }))!,
                    ),
                ).toEqual({
                    [key3]: {},
                });
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `xinfo stream xinfosream test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient, cluster) => {
                const key = uuidv4();
                const groupName = `group-${uuidv4()}`;
                const consumerName = `consumer-${uuidv4()}`;
                const streamId0_0 = "0-0";
                const streamId1_0 = "1-0";
                const streamId1_1 = "1-1";

                expect(
                    await client.xadd(
                        key,
                        [
                            ["a", "b"],
                            ["c", "d"],
                        ],
                        { id: streamId1_0 },
                    ),
                ).toEqual(streamId1_0);

                expect(
                    await client.xgroupCreate(key, groupName, streamId0_0),
                ).toEqual("OK");

                await client.xreadgroup(groupName, consumerName, {
                    [key]: ">",
                });

                const result = (await client.xinfoStream(key)) as {
                    length: number;
                    "radix-tree-keys": number;
                    "radix-tree-nodes": number;
                    "last-generated-id": string;
                    "max-deleted-entry-id": string;
                    "entries-added": number;
                    "recorded-first-entry-id": string;
                    "first-entry": (string | number | string[])[];
                    "last-entry": (string | number | string[])[];
                    groups: number;
                };

                expect(result.length).toEqual(1);
                const expectedFirstEntry = ["1-0", ["a", "b", "c", "d"]];
                expect(result["first-entry"]).toEqual(expectedFirstEntry);
                expect(result["last-entry"]).toEqual(expectedFirstEntry);
                expect(result.groups).toEqual(1);

                expect(
                    await client.xadd(key, [["foo", "bar"]], {
                        id: streamId1_1,
                    }),
                ).toEqual(streamId1_1);
                const fullResult = (await client.xinfoStream(Buffer.from(key), {
                    fullOptions: 1,
                })) as {
                    length: number;
                    "radix-tree-keys": number;
                    "radix-tree-nodes": number;
                    "last-generated-id": string;
                    "max-deleted-entry-id": string;
                    "entries-added": number;
                    "recorded-first-entry-id": string;
                    entries: (string | number | string[])[][];
                    groups: [
                        {
                            name: string;
                            "last-delivered-id": string;
                            "entries-read": number;
                            lag: number;
                            "pel-count": number;
                            pending: (string | number)[][];
                            consumers: [
                                {
                                    name: string;
                                    "seen-time": number;
                                    "active-time": number;
                                    "pel-count": number;
                                    pending: (string | number)[][];
                                },
                            ];
                        },
                    ];
                };

                // verify full result like:
                // {
                //   length: 2,
                //   'radix-tree-keys': 1,
                //   'radix-tree-nodes': 2,
                //   'last-generated-id': '1-1',
                //   'max-deleted-entry-id': '0-0',
                //   'entries-added': 2,
                //   'recorded-first-entry-id': '1-0',
                //   entries: [ [ '1-0', ['a', 'b', ...] ] ],
                //   groups: [ {
                //     name: 'group',
                //     'last-delivered-id': '1-0',
                //     'entries-read': 1,
                //     lag: 1,
                //     'pel-count': 1,
                //     pending: [ [ '1-0', 'consumer', 1722624726802, 1 ] ],
                //     consumers: [ {
                //         name: 'consumer',
                //         'seen-time': 1722624726802,
                //         'active-time': 1722624726802,
                //         'pel-count': 1,
                //         pending: [ [ '1-0', 'consumer', 1722624726802, 1 ] ],
                //         }
                //       ]
                //     }
                //   ]
                // }
                expect(fullResult.length).toEqual(2);

                if (!cluster.checkIfServerVersionLessThan("7.0.0")) {
                    expect(fullResult["recorded-first-entry-id"]).toEqual(
                        streamId1_0,
                    );
                }

                if (cluster.checkIfServerVersionLessThan("7.0.0")) {
                    expect(fullResult["max-deleted-entry-id"]).toBeUndefined();
                    expect(fullResult["entries-added"]).toBeUndefined();
                    expect(
                        fullResult.groups[0]["entries-read"],
                    ).toBeUndefined();
                    expect(fullResult.groups[0]["lag"]).toBeUndefined();
                } else if (cluster.checkIfServerVersionLessThan("7.2.0")) {
                    expect(fullResult["recorded-first-entry-id"]).toEqual(
                        streamId1_0,
                    );

                    expect(
                        fullResult.groups[0].consumers[0]["active-time"],
                    ).toBeUndefined();
                    expect(
                        fullResult.groups[0].consumers[0]["seen-time"],
                    ).toBeDefined();
                } else {
                    expect(
                        fullResult.groups[0].consumers[0]["active-time"],
                    ).toBeDefined();
                    expect(
                        fullResult.groups[0].consumers[0]["seen-time"],
                    ).toBeDefined();
                }
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `xinfo stream edge cases and failures test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = `{key}-1-${uuidv4()}`;
                const stringKey = `{key}-2-${uuidv4()}`;
                const nonExistentKey = `{key}-3-${uuidv4()}`;
                const streamId1_0 = "1-0";

                // Setup: create empty stream
                expect(
                    await client.xadd(key, [["field", "value"]], {
                        id: streamId1_0,
                    }),
                ).toEqual(streamId1_0);
                expect(await client.xdel(key, [streamId1_0])).toEqual(1);

                // XINFO STREAM called against empty stream
                const result = await client.xinfoStream(key);
                expect(result["length"]).toEqual(0);
                expect(result["first-entry"]).toEqual(null);
                expect(result["last-entry"]).toEqual(null);

                // XINFO STREAM FULL called against empty stream. Negative count values are ignored.
                const fullResult = await client.xinfoStream(key, {
                    fullOptions: -3,
                });
                expect(fullResult["length"]).toEqual(0);
                expect(fullResult["entries"]).toEqual([]);
                expect(fullResult["groups"]).toEqual([]);

                // Calling XINFO STREAM with a non-existing key raises an error
                await expect(
                    client.xinfoStream(nonExistentKey),
                ).rejects.toThrow();
                await expect(
                    client.xinfoStream(nonExistentKey, { fullOptions: true }),
                ).rejects.toThrow();
                await expect(
                    client.xinfoStream(nonExistentKey, { fullOptions: 2 }),
                ).rejects.toThrow();

                // Key exists, but it is not a stream
                await client.set(stringKey, "boofar");
                await expect(client.xinfoStream(stringKey)).rejects.toThrow();
                await expect(
                    client.xinfoStream(stringKey, { fullOptions: true }),
                ).rejects.toThrow();
                await expect(
                    client.xinfoStream(stringKey, { fullOptions: 2 }),
                ).rejects.toThrow();
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        "rename test_%p",
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                // Making sure both keys will be oart of the same slot
                const key = uuidv4() + "{123}";
                const newKey = uuidv4() + "{123}";
                await client.set(key, "value");
                expect(await client.rename(key, newKey)).toEqual("OK");
                expect(await client.get(newKey)).toEqual("value");
                // If key doesn't exist it should throw, it also test that key has successfully been renamed
                await expect(client.rename(key, newKey)).rejects.toThrow();
                // rename back
                expect(
                    await client.rename(Buffer.from(newKey), Buffer.from(key)),
                ).toEqual("OK");
                expect(await client.get(key)).toEqual("value");
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        "renamenx test_%p",
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = `{key}-1-${uuidv4()}`;
                const key2 = `{key}-2-${uuidv4()}`;
                const key3 = `{key}-3-${uuidv4()}`;

                // renamenx missing key
                await expect(client.renamenx(key1, key2)).rejects.toThrow(
                    "no such key",
                );

                // renamenx a string
                await client.set(key1, "key1");
                await client.set(key3, "key3");
                // Test that renamenx can rename key1 to key2 (non-existing value)
                expect(await client.renamenx(Buffer.from(key1), key2)).toEqual(
                    true,
                );
                // sanity check
                expect(await client.get(key2)).toEqual("key1");
                // Test that renamenx doesn't rename key2 to key3 (with an existing value)
                expect(await client.renamenx(key2, Buffer.from(key3))).toEqual(
                    false,
                );
                // sanity check
                expect(await client.get(key3)).toEqual("key3");
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        "dump and restore test_%p",
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = "{key}-1" + uuidv4();
                const key2 = "{key}-2" + uuidv4();
                const key3 = "{key}-3" + uuidv4();
                const key4 = "{key}-4" + uuidv4();
                const key5 = "{key}-5" + uuidv4();
                const nonExistingkey = "{nonExistingkey}-" + uuidv4();
                const value = "orange";
                const valueEncode = Buffer.from(value);

                expect(await client.set(key1, value)).toEqual("OK");

                // Dump non-existing key
                expect(await client.dump(nonExistingkey)).toBeNull();

                // Dump existing key
                let data = (await client.dump(key1)) as Buffer;
                expect(data).not.toBeNull();

                // Restore to a new key without option
                expect(await client.restore(key2, 0, data)).toEqual("OK");
                expect(
                    await client.get(key2, { decoder: Decoder.String }),
                ).toEqual(value);
                expect(
                    await client.get(key2, { decoder: Decoder.Bytes }),
                ).toEqual(valueEncode);

                // Restore to an existing key
                await expect(client.restore(key2, 0, data)).rejects.toThrow(
                    "BUSYKEY: Target key name already exists.",
                );

                // Restore with `REPLACE` and existing key holding different value
                expect(await client.sadd(key3, ["a"])).toEqual(1);
                expect(
                    await client.restore(key3, 0, data, { replace: true }),
                ).toEqual("OK");

                // Restore with `REPLACE` option
                expect(
                    await client.restore(key2, 0, data, { replace: true }),
                ).toEqual("OK");

                // Restore with `REPLACE`, `ABSTTL`, and positive TTL
                expect(
                    await client.restore(key2, 1000, data, {
                        replace: true,
                        absttl: true,
                    }),
                ).toEqual("OK");

                // Restore with `REPLACE`, `ABSTTL`, and negative TTL
                await expect(
                    client.restore(key2, -10, data, {
                        replace: true,
                        absttl: true,
                    }),
                ).rejects.toThrow("Invalid TTL value");

                // Restore with REPLACE and positive idletime
                expect(
                    await client.restore(key2, 0, data, {
                        replace: true,
                        idletime: 10,
                    }),
                ).toEqual("OK");

                // Restore with REPLACE and negative idletime
                await expect(
                    client.restore(key2, 0, data, {
                        replace: true,
                        idletime: -10,
                    }),
                ).rejects.toThrow("Invalid IDLETIME value");

                // Restore with REPLACE and positive frequency
                expect(
                    await client.restore(key2, 0, data, {
                        replace: true,
                        frequency: 10,
                    }),
                ).toEqual("OK");

                // Restore with REPLACE and negative frequency
                await expect(
                    client.restore(key2, 0, data, {
                        replace: true,
                        frequency: -10,
                    }),
                ).rejects.toThrow("Invalid FREQ value");

                // Restore only uses IDLETIME or FREQ modifiers
                // Error will be raised if both options are set
                await expect(
                    client.restore(key2, 0, data, {
                        replace: true,
                        idletime: 10,
                        frequency: 10,
                    }),
                ).rejects.toThrow("syntax error");

                // Restore with checksumto error
                await expect(
                    client.restore(key2, 0, valueEncode, { replace: true }),
                ).rejects.toThrow("DUMP payload version or checksum are wrong");

                // Transaction tests
                let response =
                    client instanceof GlideClient
                        ? await client.exec(new Transaction().dump(key1), {
                              decoder: Decoder.Bytes,
                          })
                        : await client.exec(
                              new ClusterTransaction().dump(key1),
                              { decoder: Decoder.Bytes },
                          );
                expect(response?.[0]).not.toBeNull();
                data = response?.[0] as Buffer;

                // Restore with `String` exec decoder
                response =
                    client instanceof GlideClient
                        ? await client.exec(
                              new Transaction()
                                  .restore(key4, 0, data)
                                  .get(key4),
                              { decoder: Decoder.String },
                          )
                        : await client.exec(
                              new ClusterTransaction()
                                  .restore(key4, 0, data)
                                  .get(key4),
                              { decoder: Decoder.String },
                          );
                expect(response?.[0]).toEqual("OK");
                expect(response?.[1]).toEqual(value);

                // Restore with `Bytes` exec decoder
                response =
                    client instanceof GlideClient
                        ? await client.exec(
                              new Transaction()
                                  .restore(key5, 0, data)
                                  .get(key5),
                              { decoder: Decoder.Bytes },
                          )
                        : await client.exec(
                              new ClusterTransaction()
                                  .restore(key5, 0, data)
                                  .get(key5),
                              { decoder: Decoder.Bytes },
                          );
                expect(response?.[0]).toEqual("OK");
                expect(response?.[1]).toEqual(valueEncode);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        "pfadd test_%p",
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = uuidv4();
                expect(await client.pfadd(key, [])).toEqual(1);
                expect(await client.pfadd(key, ["one", "two"])).toEqual(1);
                expect(
                    await client.pfadd(Buffer.from(key), [Buffer.from("two")]),
                ).toEqual(0);
                expect(await client.pfadd(key, [])).toEqual(0);

                // key exists, but it is not a HyperLogLog
                expect(await client.set("foo", "value")).toEqual("OK");
                await expect(client.pfadd("foo", [])).rejects.toThrow();
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        "pfcount test_%p",
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = `{key}-1-${uuidv4()}`;
                const key2 = `{key}-2-${uuidv4()}`;
                const key3 = `{key}-3-${uuidv4()}`;
                const stringKey = `{key}-4-${uuidv4()}`;
                const nonExistingKey = `{key}-5-${uuidv4()}`;

                expect(await client.pfadd(key1, ["a", "b", "c"])).toEqual(1);
                expect(await client.pfadd(key2, ["b", "c", "d"])).toEqual(1);
                expect(await client.pfcount([key1])).toEqual(3);
                expect(await client.pfcount([Buffer.from(key2)])).toEqual(3);
                expect(await client.pfcount([key1, key2])).toEqual(4);
                expect(
                    await client.pfcount([key1, key2, nonExistingKey]),
                ).toEqual(4);

                // empty HyperLogLog data set
                expect(await client.pfadd(key3, [])).toEqual(1);
                expect(await client.pfcount([key3])).toEqual(0);

                // invalid argument - key list must not be empty
                await expect(client.pfcount([])).rejects.toThrow(
                    "ResponseError: wrong number of arguments",
                );

                // key exists, but it is not a HyperLogLog
                expect(await client.set(stringKey, "value")).toEqual("OK");
                await expect(client.pfcount([stringKey])).rejects.toThrow();
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        "pfmerget test_%p",
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = `{key}-1-${uuidv4()}`;
                const key2 = `{key}-2-${uuidv4()}`;
                const key3 = `{key}-3-${uuidv4()}`;
                const stringKey = `{key}-4-${uuidv4()}`;
                const nonExistingKey = `{key}-5-${uuidv4()}`;

                expect(await client.pfadd(key1, ["a", "b", "c"])).toEqual(1);
                expect(await client.pfadd(key2, ["b", "c", "d"])).toEqual(1);

                // merge into new HyperLogLog data set
                expect(
                    await client.pfmerge(Buffer.from(key3), [key1, key2]),
                ).toEqual("OK");
                expect(await client.pfcount([key3])).toEqual(4);

                // merge into existing HyperLogLog data set
                expect(await client.pfmerge(key1, [Buffer.from(key2)])).toEqual(
                    "OK",
                );
                expect(await client.pfcount([key1])).toEqual(4);

                // non-existing source key
                expect(
                    await client.pfmerge(key2, [key1, nonExistingKey]),
                ).toEqual("OK");
                expect(await client.pfcount([key2])).toEqual(4);

                // empty source key list
                expect(await client.pfmerge(key1, [])).toEqual("OK");
                expect(await client.pfcount([key1])).toEqual(4);

                // source key exists, but it is not a HyperLogLog
                await client.set(stringKey, "foo");
                await expect(client.pfmerge(key3, [stringKey])).rejects.toThrow(
                    RequestError,
                );

                // destination key exists, but it is not a HyperLogLog
                await expect(client.pfmerge(stringKey, [key3])).rejects.toThrow(
                    RequestError,
                );
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        "setrange test_%p",
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = uuidv4();
                const key_2 = uuidv4();
                const key_3 = uuidv4();
                const nonStringKey = uuidv4();

                // new key
                expect(await client.setrange(key, 0, "Hello World")).toBe(11);

                // existing key
                expect(await client.setrange(key, 6, "GLIDE")).toBe(11);
                expect(await client.get(key)).toEqual("Hello GLIDE");

                // unique chars keys, size of 3 bytes each
                expect(await client.setrange(key_2, 0, "爱和美力")).toBe(12);

                expect(await client.setrange(key_2, 3, "abc")).toBe(12);
                expect(await client.get(key_2)).toEqual("爱abc美力");

                // unique char key, size of 4 bytes
                expect(await client.setrange(key_3, 0, "😊")).toBe(4);

                expect(await client.setrange(key_3, 4, "GLIDE")).toBe(9);
                expect(await client.get(key_3)).toEqual("😊GLIDE");

                // offset > len
                expect(await client.setrange(key, 15, "GLIDE")).toBe(20);
                expect(await client.get(key)).toEqual(
                    "Hello GLIDE\0\0\0\0GLIDE",
                );

                // non-string key
                expect(await client.lpush(nonStringKey, ["_"])).toBe(1);
                await expect(
                    client.setrange(nonStringKey, 0, "_"),
                ).rejects.toThrow(RequestError);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        "append test_%p",
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = uuidv4();
                const key2 = uuidv4();
                const key3 = uuidv4();
                const value = uuidv4();
                const valueEncoded = Buffer.from(value);

                // Append on non-existing string(similar to SET)
                expect(await client.append(key1, value)).toBe(value.length);
                expect(await client.append(key1, value)).toBe(value.length * 2);
                expect(await client.get(key1)).toEqual(value.concat(value));

                // key exists but holding the wrong kind of value
                expect(await client.sadd(key2, ["a"])).toBe(1);
                await expect(client.append(key2, "_")).rejects.toThrow(
                    RequestError,
                );

                // Key and value as buffers
                expect(await client.append(key3, valueEncoded)).toBe(
                    value.length,
                );
                expect(await client.append(key3, valueEncoded)).toBe(
                    valueEncoded.length * 2,
                );
                expect(
                    await client.get(key3, { decoder: Decoder.Bytes }),
                ).toEqual(Buffer.concat([valueEncoded, valueEncoded]));
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        "wait test_%p",
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = uuidv4();
                const value1 = uuidv4();
                const value2 = uuidv4();

                // assert that wait returns 0 under standalone and 1 under cluster mode.
                expect(await client.set(key, value1)).toEqual("OK");

                if (client instanceof GlideClusterClient) {
                    expect(await client.wait(1, 1000)).toBeGreaterThanOrEqual(
                        1,
                    );
                } else {
                    expect(await client.wait(1, 1000)).toBeGreaterThanOrEqual(
                        0,
                    );
                }

                // command should fail on a negative timeout value
                await expect(client.wait(1, -1)).rejects.toThrow(RequestError);

                // ensure that command doesn't time out even if timeout > request timeout (250ms by default)
                expect(await client.set(key, value2)).toEqual("OK");
                expect(await client.wait(100, 500)).toBeGreaterThanOrEqual(0);
            }, protocol);
        },
        config.timeout,
    );

    // Set command tests

    async function setWithExpiryOptions(client: BaseClient) {
        const key = uuidv4();
        const value = uuidv4();
        const setResWithExpirySetMilli = await client.set(key, value, {
            expiry: {
                type: TimeUnit.Milliseconds,
                count: 500,
            },
        });
        expect(setResWithExpirySetMilli).toEqual("OK");
        const getWithExpirySetMilli = await client.get(key);
        expect(getWithExpirySetMilli).toEqual(value);

        const setResWithExpirySec = await client.set(key, value, {
            expiry: {
                type: TimeUnit.Seconds,
                count: 1,
            },
        });
        expect(setResWithExpirySec).toEqual("OK");
        const getResWithExpirySec = await client.get(key);
        expect(getResWithExpirySec).toEqual(value);

        const setWithUnixSec = await client.set(key, value, {
            expiry: {
                type: TimeUnit.UnixSeconds,
                count: Math.floor(Date.now() / 1000) + 1,
            },
        });
        expect(setWithUnixSec).toEqual("OK");
        const getWithUnixSec = await client.get(key);
        expect(getWithUnixSec).toEqual(value);

        const setResWithExpiryKeep = await client.set(key, value, {
            expiry: "keepExisting",
        });
        expect(setResWithExpiryKeep).toEqual("OK");
        const getResWithExpiryKeep = await client.get(key);
        expect(getResWithExpiryKeep).toEqual(value);
        // wait for the key to expire base on the previous set
        let sleep = new Promise((resolve) => setTimeout(resolve, 1000));
        await sleep;
        const getResExpire = await client.get(key);
        // key should have expired
        expect(getResExpire).toEqual(null);
        const setResWithExpiryWithUmilli = await client.set(key, value, {
            expiry: {
                type: TimeUnit.UnixMilliseconds,
                count: Date.now() + 1000,
            },
        });
        expect(setResWithExpiryWithUmilli).toEqual("OK");
        // wait for the key to expire
        sleep = new Promise((resolve) => setTimeout(resolve, 1001));
        await sleep;
        const getResWithExpiryWithUmilli = await client.get(key);
        // key should have expired
        expect(getResWithExpiryWithUmilli).toEqual(null);
    }

    async function setWithOnlyIfExistOptions(client: BaseClient) {
        const key = uuidv4();
        const value = uuidv4();
        const setKey = await client.set(key, value);
        expect(setKey).toEqual("OK");
        const getRes = await client.get(key);
        expect(getRes).toEqual(value);
        const setExistingKeyRes = await client.set(key, value, {
            conditionalSet: "onlyIfExists",
        });
        expect(setExistingKeyRes).toEqual("OK");
        const getExistingKeyRes = await client.get(key);
        expect(getExistingKeyRes).toEqual(value);

        const notExistingKeyRes = await client.set(key + 1, value, {
            conditionalSet: "onlyIfExists",
        });
        // key does not exist, so it should not be set
        expect(notExistingKeyRes).toEqual(null);
        const getNotExistingKey = await client.get(key + 1);
        // key should not have been set
        expect(getNotExistingKey).toEqual(null);
    }

    async function setWithOnlyIfEquals(client: BaseClient) {
        const key = uuidv4();
        const initialValue = uuidv4();
        const newValue = uuidv4();
        const setKey = await client.set(key, initialValue);
        expect(setKey).toEqual("OK");
        const getRes = await client.get(key);
        expect(getRes).toEqual(initialValue);

        // Attempt to set with a non-matching value (should fail -> return null)
        const conditionalSetFailResponse = await client.set(key, newValue, {
            conditionalSet: "onlyIfEqual",
            comparisonValue: newValue,
        });
        expect(conditionalSetFailResponse).toEqual(null);

        // Attempt to set with a matching value (should succeed -> return OK)
        const conditionalSetSuccessResponse = await client.set(key, newValue, {
            conditionalSet: "onlyIfEqual",
            comparisonValue: initialValue,
        });
        expect(conditionalSetSuccessResponse).toEqual("OK");

        // Retrieve the updated value of the key
        const updatedGetResponse = await client.get(key);
        expect(updatedGetResponse).toEqual(newValue);
    }

    async function setWithOnlyIfNotExistOptions(client: BaseClient) {
        const key = uuidv4();
        const value = uuidv4();
        const notExistingKeyRes = await client.set(key, value, {
            conditionalSet: "onlyIfDoesNotExist",
        });
        // key does not exist, so it should be set
        expect(notExistingKeyRes).toEqual("OK");
        const getNotExistingKey = await client.get(key);
        // key should have been set
        expect(getNotExistingKey).toEqual(value);

        const existingKeyRes = await client.set(key, value, {
            conditionalSet: "onlyIfDoesNotExist",
        });
        // key exists, so it should not be set
        expect(existingKeyRes).toEqual(null);
        const getExistingKey = await client.get(key);
        // key should not have been set
        expect(getExistingKey).toEqual(value);
    }

    async function setWithGetOldOptions(client: BaseClient) {
        const key = uuidv4();
        const value = uuidv4();

        const setResGetNotExistOld = await client.set(key, value, {
            returnOldValue: true,
        });
        // key does not exist, so old value should be null
        expect(setResGetNotExistOld).toEqual(null);
        // key should have been set
        const getResGetNotExistOld = await client.get(key);
        expect(getResGetNotExistOld).toEqual(value);

        const setResGetExistOld = await client.set(key, value, {
            returnOldValue: true,
        });
        // key exists, so old value should be returned
        expect(setResGetExistOld).toEqual(value);
        // key should have been set
        const getResGetExistOld = await client.get(key);
        expect(getResGetExistOld).toEqual(value);
    }

    async function setWithAllOptions(client: BaseClient) {
        const key = uuidv4();
        const value = uuidv4();

        // set with multiple options:
        // * only apply SET if the key already exists
        // * expires after 1 second
        // * returns the old value
        const setResWithAllOptions = await client.set(key, value, {
            expiry: {
                type: TimeUnit.UnixSeconds,
                count: Math.floor(Date.now() / 1000) + 1,
            },
            conditionalSet: "onlyIfExists",
            returnOldValue: true,
        });
        // key does not exist, so old value should be null
        expect(setResWithAllOptions).toEqual(null);
        // key does not exist, so SET should not have applied
        expect(await client.get(key)).toEqual(null);
    }

    async function setIfeqWithAllOptions(client: BaseClient) {
        const key = uuidv4();
        const initialValue = uuidv4();
        const newValue = uuidv4();

        await client.set(key, initialValue);
        // set with multiple options:
        // * only apply SET if the provided value equals oldValue
        // * expires after 1 second
        // * returns the old value
        const setResWithAllOptions = await client.set(key, newValue, {
            expiry: {
                type: TimeUnit.UnixSeconds,
                count: Math.floor(Date.now() / 1000) + 1,
            },
            conditionalSet: "onlyIfEqual",
            comparisonValue: initialValue,
            returnOldValue: true,
        });
        // initialValue should be get from the key
        expect(setResWithAllOptions).toEqual(initialValue);
        // newValue should be set as the key value
        expect(await client.get(key)).toEqual(newValue);

        // fail command
        const wrongValue = "wrong value";
        const setResFailedWithAllOptions = await client.set(key, wrongValue, {
            expiry: {
                type: TimeUnit.UnixSeconds,
                count: Math.floor(Date.now() / 1000) + 1,
            },
            conditionalSet: "onlyIfEqual",
            comparisonValue: wrongValue,
            returnOldValue: true,
        });
        // current value of key should be newValue
        expect(setResFailedWithAllOptions).toEqual(newValue);
        // key should not be set. it remains the same
        expect(await client.get(key)).toEqual(newValue);
    }

    async function testSetWithAllCombination(
        client: BaseClient,
        cluster: ValkeyCluster,
    ) {
        const key = uuidv4();
        const value = uuidv4(); // Initial value
        const value2 = uuidv4(); // New value for IFEQ testing
        const count = 2;
        const expiryCombination = [
            { type: TimeUnit.Seconds, count },
            { type: TimeUnit.Milliseconds, count },
            { type: TimeUnit.UnixSeconds, count },
            { type: TimeUnit.UnixMilliseconds, count },
            "keepExisting",
        ];
        let exist = false;

        // onlyIfDoesNotExist tests
        for (const expiryVal of expiryCombination) {
            const setRes = await client.set(key, value, {
                expiry: expiryVal as
                    | "keepExisting"
                    | {
                          type:
                              | TimeUnit.Seconds
                              | TimeUnit.Milliseconds
                              | TimeUnit.UnixSeconds
                              | TimeUnit.UnixMilliseconds;
                          count: number;
                      },
                conditionalSet: "onlyIfDoesNotExist",
            });

            if (exist == false) {
                expect(setRes).toEqual("OK");
                exist = true;
            } else {
                expect(setRes).toEqual(null);
            }

            const getRes = await client.get(key);
            expect(getRes).toEqual(value);
        }

        // OnlyIfExist tests
        for (const expiryVal of expiryCombination) {
            const setRes = await client.set(key, value, {
                expiry: expiryVal as
                    | "keepExisting"
                    | {
                          type:
                              | TimeUnit.Seconds
                              | TimeUnit.Milliseconds
                              | TimeUnit.UnixSeconds
                              | TimeUnit.UnixMilliseconds;
                          count: number;
                      },

                conditionalSet: "onlyIfExists",
                returnOldValue: true,
            });

            expect(setRes).toBeDefined();
        }

        //  onlyIfEqual tests
        if (!cluster.checkIfServerVersionLessThan("8.1.0")) {
            for (const expiryVal of expiryCombination) {
                // Set the key with the initial value
                await client.set(key, value);

                const setRes = await client.set(key, value2, {
                    expiry: expiryVal as
                        | "keepExisting"
                        | {
                              type:
                                  | TimeUnit.Seconds
                                  | TimeUnit.Milliseconds
                                  | TimeUnit.UnixSeconds
                                  | TimeUnit.UnixMilliseconds;
                              count: number;
                          },
                    conditionalSet: "onlyIfEqual",
                    comparisonValue: value, // Ensure it matches the current key's value
                });

                if (setRes) {
                    expect(setRes).toEqual("OK"); // Should return 'OK' if the condition is met
                } else {
                    // If condition fails, ensure value remains unchanged
                    const getRes = await client.get(key);
                    expect(getRes).toEqual(value);
                }
            }
        }
    }

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        "Set commands with options test_%p",
        async (protocol) => {
            await runTest(async (client: BaseClient, cluster) => {
                await setWithExpiryOptions(client);
                await setWithOnlyIfExistOptions(client);
                await setWithOnlyIfNotExistOptions(client);
                await setWithGetOldOptions(client);
                await setWithAllOptions(client);

                if (!cluster.checkIfServerVersionLessThan("8.1.0")) {
                    await setWithOnlyIfEquals(client);
                    await setIfeqWithAllOptions(client);
                }

                await testSetWithAllCombination(client, cluster);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        "object encoding test_%p",
        async (protocol) => {
            await runTest(async (client: BaseClient, cluster) => {
                const string_key = uuidv4();
                const list_key = uuidv4();
                const hashtable_key = uuidv4();
                const intset_key = uuidv4();
                const set_listpack_key = uuidv4();
                const hash_hashtable_key = uuidv4();
                const hash_listpack_key = uuidv4();
                const skiplist_key = uuidv4();
                const zset_listpack_key = uuidv4();
                const stream_key = uuidv4();
                const non_existing_key = uuidv4();
                const versionLessThan7 =
                    cluster.checkIfServerVersionLessThan("7.0.0");
                const versionLessThan72 =
                    cluster.checkIfServerVersionLessThan("7.2.0");

                expect(await client.objectEncoding(non_existing_key)).toEqual(
                    null,
                );

                expect(
                    await client.set(
                        string_key,
                        "a really loooooooooooooooooooooooooooooooooooooooong value",
                    ),
                ).toEqual("OK");

                expect(await client.objectEncoding(string_key)).toEqual("raw");

                expect(await client.set(string_key, "2")).toEqual("OK");
                expect(
                    await client.objectEncoding(Buffer.from(string_key)),
                ).toEqual("int");

                expect(await client.set(string_key, "value")).toEqual("OK");
                expect(await client.objectEncoding(string_key)).toEqual(
                    "embstr",
                );

                expect(await client.lpush(list_key, ["1"])).toEqual(1);

                if (versionLessThan72) {
                    expect(await client.objectEncoding(list_key)).toEqual(
                        "quicklist",
                    );
                } else {
                    expect(await client.objectEncoding(list_key)).toEqual(
                        "listpack",
                    );
                }

                // The default value of set-max-intset-entries is 512
                for (let i = 0; i < 513; i++) {
                    expect(
                        await client.sadd(hashtable_key, [String(i)]),
                    ).toEqual(1);
                }

                expect(await client.objectEncoding(hashtable_key)).toEqual(
                    "hashtable",
                );

                expect(await client.sadd(intset_key, ["1"])).toEqual(1);
                expect(await client.objectEncoding(intset_key)).toEqual(
                    "intset",
                );

                expect(await client.sadd(set_listpack_key, ["foo"])).toEqual(1);

                if (versionLessThan72) {
                    expect(
                        await client.objectEncoding(set_listpack_key),
                    ).toEqual("hashtable");
                } else {
                    expect(
                        await client.objectEncoding(set_listpack_key),
                    ).toEqual("listpack");
                }

                // The default value of hash-max-listpack-entries is 512
                for (let i = 0; i < 513; i++) {
                    expect(
                        await client.hset(hash_hashtable_key, {
                            [String(i)]: "2",
                        }),
                    ).toEqual(1);
                }

                expect(await client.objectEncoding(hash_hashtable_key)).toEqual(
                    "hashtable",
                );

                expect(
                    await client.hset(hash_listpack_key, { "1": "2" }),
                ).toEqual(1);

                if (versionLessThan7) {
                    expect(
                        await client.objectEncoding(hash_listpack_key),
                    ).toEqual("ziplist");
                } else {
                    expect(
                        await client.objectEncoding(hash_listpack_key),
                    ).toEqual("listpack");
                }

                // The default value of zset-max-listpack-entries is 128
                for (let i = 0; i < 129; i++) {
                    expect(
                        await client.zadd(skiplist_key, { [String(i)]: 2.0 }),
                    ).toEqual(1);
                }

                expect(await client.objectEncoding(skiplist_key)).toEqual(
                    "skiplist",
                );

                expect(
                    await client.zadd(zset_listpack_key, { "1": 2.0 }),
                ).toEqual(1);

                if (versionLessThan7) {
                    expect(
                        await client.objectEncoding(
                            Buffer.from(zset_listpack_key),
                        ),
                    ).toEqual("ziplist");
                } else {
                    expect(
                        await client.objectEncoding(zset_listpack_key),
                    ).toEqual("listpack");
                }

                expect(
                    await client.xadd(stream_key, [["field", "value"]]),
                ).not.toBeNull();
                expect(await client.objectEncoding(stream_key)).toEqual(
                    "stream",
                );
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        "object freq test_%p",
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = uuidv4();
                const nonExistingKey = uuidv4();
                const maxmemoryPolicyKey = "maxmemory-policy";
                const config = await client.configGet([maxmemoryPolicyKey]);
                const maxmemoryPolicy = config[maxmemoryPolicyKey] as string;

                try {
                    expect(
                        await client.configSet({
                            [maxmemoryPolicyKey]: "allkeys-lfu",
                        }),
                    ).toEqual("OK");
                    expect(await client.objectFreq(nonExistingKey)).toEqual(
                        null,
                    );
                    expect(await client.set(key, "foobar")).toEqual("OK");
                    expect(
                        await client.objectFreq(Buffer.from(key)),
                    ).toBeGreaterThanOrEqual(0);
                } finally {
                    expect(
                        await client.configSet({
                            [maxmemoryPolicyKey]: maxmemoryPolicy,
                        }),
                    ).toEqual("OK");
                }
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        "object idletime test_%p",
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = uuidv4();
                const nonExistingKey = uuidv4();
                const maxmemoryPolicyKey = "maxmemory-policy";
                const config = await client.configGet([maxmemoryPolicyKey]);
                const maxmemoryPolicy = config[maxmemoryPolicyKey] as string;

                try {
                    expect(
                        await client.configSet({
                            // OBJECT IDLETIME requires a non-LFU maxmemory-policy
                            [maxmemoryPolicyKey]: "allkeys-random",
                        }),
                    ).toEqual("OK");
                    expect(await client.objectIdletime(nonExistingKey)).toEqual(
                        null,
                    );
                    expect(await client.set(key, "foobar")).toEqual("OK");

                    await wait(2000);

                    expect(
                        await client.objectIdletime(Buffer.from(key)),
                    ).toBeGreaterThan(0);
                } finally {
                    expect(
                        await client.configSet({
                            [maxmemoryPolicyKey]: maxmemoryPolicy,
                        }),
                    ).toEqual("OK");
                }
            }, protocol);
        },
        config.timeout,
    );

    function wait(numMilliseconds: number) {
        return new Promise((resolve) => {
            setTimeout(resolve, numMilliseconds);
        });
    }

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `object refcount test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = `{key}:${uuidv4()}`;
                const nonExistingKey = `{key}:${uuidv4()}`;

                expect(await client.objectRefcount(nonExistingKey)).toBeNull();
                expect(await client.set(key, "foo")).toEqual("OK");
                expect(
                    await client.objectRefcount(Buffer.from(key)),
                ).toBeGreaterThanOrEqual(1);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `flushall test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                // Test FLUSHALL SYNC
                expect(await client.flushall(FlushMode.SYNC)).toBe("OK");

                // TODO: replace with KEYS command when implemented
                const keysAfter = (await client.customCommand([
                    "keys",
                    "*",
                ])) as string[];
                expect(keysAfter.length).toBe(0);

                // Test various FLUSHALL calls
                expect(await client.flushall()).toBe("OK");
                expect(await client.flushall(FlushMode.ASYNC)).toBe("OK");

                if (client instanceof GlideClusterClient) {
                    const key = uuidv4();
                    const primaryRoute: SingleNodeRoute = {
                        type: "primarySlotKey",
                        key: key,
                    };
                    expect(await client.flushall({ route: primaryRoute })).toBe(
                        "OK",
                    );
                    expect(
                        await client.flushall({
                            mode: FlushMode.ASYNC,
                            route: primaryRoute,
                        }),
                    ).toBe("OK");

                    //Test FLUSHALL on replica (should fail)
                    const key2 = uuidv4();
                    const replicaRoute: SingleNodeRoute = {
                        type: "replicaSlotKey",
                        key: key2,
                    };
                    await expect(
                        client.flushall({ route: replicaRoute }),
                    ).rejects.toThrowError();
                }
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `lpos test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = `{key}:${uuidv4()}`;
                const valueArray = ["a", "a", "b", "c", "a", "b"];
                expect(await client.rpush(key, valueArray)).toEqual(6);

                // simplest case
                expect(await client.lpos(key, "a")).toEqual(0);
                expect(await client.lpos(key, "b", { rank: 2 })).toEqual(5);

                // element doesn't exist
                expect(await client.lpos(key, "e")).toBeNull();

                // reverse traversal
                expect(await client.lpos(key, "b", { rank: -2 })).toEqual(2);

                // reverse traversal with binary key and element.
                expect(
                    await client.lpos(Buffer.from(key), Buffer.from("b"), {
                        rank: -2,
                    }),
                ).toEqual(2);

                // unlimited comparisons
                expect(
                    await client.lpos(key, "a", { rank: 1, maxLength: 0 }),
                ).toEqual(0);

                // limited comparisons
                expect(
                    await client.lpos(key, "c", { rank: 1, maxLength: 2 }),
                ).toBeNull();

                // invalid rank value
                await expect(
                    client.lpos(key, "a", { rank: 0 }),
                ).rejects.toThrow(RequestError);

                // invalid maxlen value
                await expect(
                    client.lpos(key, "a", { maxLength: -1 }),
                ).rejects.toThrow(RequestError);

                // non-existent key
                expect(await client.lpos("non-existent_key", "e")).toBeNull();

                // wrong key data type
                const wrongDataType = `{key}:${uuidv4()}`;
                expect(await client.sadd(wrongDataType, ["a", "b"])).toEqual(2);

                await expect(client.lpos(wrongDataType, "a")).rejects.toThrow(
                    RequestError,
                );

                // invalid count value
                await expect(
                    client.lpos(key, "a", { count: -1 }),
                ).rejects.toThrow(RequestError);

                // with count
                expect(await client.lpos(key, "a", { count: 2 })).toEqual([
                    0, 1,
                ]);
                expect(await client.lpos(key, "a", { count: 0 })).toEqual([
                    0, 1, 4,
                ]);
                expect(
                    await client.lpos(key, "a", { rank: 1, count: 0 }),
                ).toEqual([0, 1, 4]);
                expect(
                    await client.lpos(key, "a", { rank: 2, count: 0 }),
                ).toEqual([1, 4]);
                expect(
                    await client.lpos(key, "a", { rank: 3, count: 0 }),
                ).toEqual([4]);

                // reverse traversal
                expect(
                    await client.lpos(key, "a", { rank: -1, count: 0 }),
                ).toEqual([4, 1, 0]);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `dbsize test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                // flush all data
                expect(await client.flushall()).toBe("OK");

                // check that DBSize is 0
                expect(await client.dbsize()).toBe(0);

                // set 10 random key-value pairs
                for (let i = 0; i < 10; i++) {
                    const key = `{key}:${uuidv4()}`;
                    const value = "0".repeat(Math.random() * 7);

                    expect(await client.set(key, value)).toBe("OK");
                }

                // check DBSIZE after setting
                expect(await client.dbsize()).toBe(10);

                // additional test for the standalone client
                if (client instanceof GlideClient) {
                    expect(await client.flushall()).toBe("OK");
                    const key = uuidv4();
                    expect(await client.set(key, "value")).toBe("OK");
                    expect(await client.dbsize()).toBe(1);
                    // switching to another db to check size
                    expect(await client.select(1)).toBe("OK");
                    expect(await client.dbsize()).toBe(0);
                }

                // additional test for the cluster client
                if (client instanceof GlideClusterClient) {
                    expect(await client.flushall()).toBe("OK");
                    const key = uuidv4();
                    expect(await client.set(key, "value")).toBe("OK");
                    const primaryRoute: SingleNodeRoute = {
                        type: "primarySlotKey",
                        key: key,
                    };
                    expect(await client.dbsize({ route: primaryRoute })).toBe(
                        1,
                    );
                }
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `bitcount test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient, cluster) => {
                const key1 = uuidv4();
                const key2 = uuidv4();
                const value = "foobar";

                expect(await client.set(key1, value)).toEqual("OK");
                expect(await client.bitcount(key1)).toEqual(26);
                expect(
                    await client.bitcount(Buffer.from(key1), {
                        start: 1,
                        end: 1,
                    }),
                ).toEqual(6);
                expect(
                    await client.bitcount(key1, { start: 0, end: -5 }),
                ).toEqual(10);
                // non-existing key
                expect(await client.bitcount(uuidv4())).toEqual(0);
                expect(
                    await client.bitcount(uuidv4(), { start: 5, end: 30 }),
                ).toEqual(0);
                // key exists, but it is not a string
                expect(await client.sadd(key2, [value])).toEqual(1);
                await expect(client.bitcount(key2)).rejects.toThrow(
                    RequestError,
                );
                await expect(
                    client.bitcount(key2, { start: 1, end: 1 }),
                ).rejects.toThrow(RequestError);

                if (cluster.checkIfServerVersionLessThan("7.0.0")) {
                    await expect(
                        client.bitcount(key1, {
                            start: 2,
                            end: 5,
                            indexType: BitmapIndexType.BIT,
                        }),
                    ).rejects.toThrow();
                    await expect(
                        client.bitcount(key1, {
                            start: 2,
                            end: 5,
                            indexType: BitmapIndexType.BYTE,
                        }),
                    ).rejects.toThrow();
                } else {
                    expect(
                        await client.bitcount(key1, {
                            start: 2,
                            end: 5,
                            indexType: BitmapIndexType.BYTE,
                        }),
                    ).toEqual(16);
                    expect(
                        await client.bitcount(key1, {
                            start: 5,
                            end: 30,
                            indexType: BitmapIndexType.BIT,
                        }),
                    ).toEqual(17);
                    expect(
                        await client.bitcount(key1, {
                            start: 5,
                            end: -5,
                            indexType: BitmapIndexType.BIT,
                        }),
                    ).toEqual(23);
                    expect(
                        await client.bitcount(uuidv4(), {
                            start: 2,
                            end: 5,
                            indexType: BitmapIndexType.BYTE,
                        }),
                    ).toEqual(0);
                    // key exists, but it is not a string
                    await expect(
                        client.bitcount(key2, {
                            start: 1,
                            end: 1,
                            indexType: BitmapIndexType.BYTE,
                        }),
                    ).rejects.toThrow(RequestError);
                }

                if (cluster.checkIfServerVersionLessThan("8.0.0")) {
                    await expect(
                        client.bitcount(key1, {
                            start: 2,
                        }),
                    ).rejects.toThrow();
                } else {
                    expect(
                        await client.bitcount(key1, {
                            start: 0,
                        }),
                    ).toEqual(26);
                    expect(
                        await client.bitcount(key1, {
                            start: 5,
                        }),
                    ).toEqual(4);
                    expect(
                        await client.bitcount(key1, {
                            start: 80,
                        }),
                    ).toEqual(0);
                    expect(
                        await client.bitcount(uuidv4(), {
                            start: 80,
                        }),
                    ).toEqual(0);

                    // key exists, but it is not a string
                    await expect(
                        client.bitcount(key2, {
                            start: 1,
                        }),
                    ).rejects.toThrow(RequestError);
                }
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `geoadd geopos test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = uuidv4();
                const key2 = uuidv4();
                const membersToCoordinates = new Map<string, GeospatialData>();
                membersToCoordinates.set("Palermo", {
                    longitude: 13.361389,
                    latitude: 38.115556,
                });
                membersToCoordinates.set("Catania", {
                    longitude: 15.087269,
                    latitude: 37.502669,
                });

                // default geoadd
                expect(await client.geoadd(key1, membersToCoordinates)).toBe(2);

                let geopos = await client.geopos(key1, [
                    "Palermo",
                    "Catania",
                    "New York",
                ]);
                // inner array is possibly null, we need a null check or a cast
                expect(geopos[0]?.[0]).toBeCloseTo(13.361389, 5);
                expect(geopos[0]?.[1]).toBeCloseTo(38.115556, 5);
                expect(geopos[1]?.[0]).toBeCloseTo(15.087269, 5);
                expect(geopos[1]?.[1]).toBeCloseTo(37.502669, 5);
                expect(geopos[2]).toBeNull();

                // empty array of places
                geopos = await client.geopos(key1, []);
                expect(geopos).toEqual([]);

                // not existing key
                geopos = await client.geopos(key2, []);
                expect(geopos).toEqual([]);
                geopos = await client.geopos(key2, ["Palermo"]);
                expect(geopos).toEqual([null]);

                // with update mode options
                membersToCoordinates.set("Catania", {
                    longitude: 15.087269,
                    latitude: 39,
                });
                expect(
                    await client.geoadd(key1, membersToCoordinates, {
                        updateMode: ConditionalChange.ONLY_IF_DOES_NOT_EXIST,
                    }),
                ).toBe(0);
                expect(
                    await client.geoadd(key1, membersToCoordinates, {
                        updateMode: ConditionalChange.ONLY_IF_EXISTS,
                    }),
                ).toBe(0);

                // with changed option
                membersToCoordinates.set("Catania", {
                    longitude: 15.087269,
                    latitude: 40,
                });
                membersToCoordinates.set("Tel-Aviv", {
                    longitude: 32.0853,
                    latitude: 34.7818,
                });
                expect(
                    await client.geoadd(key1, membersToCoordinates, {
                        changed: true,
                    }),
                ).toBe(2);

                // key exists but holding non-zset value
                expect(await client.set(key2, "foo")).toBe("OK");
                await expect(
                    client.geoadd(key2, membersToCoordinates),
                ).rejects.toThrow();
                await expect(client.geopos(key2, ["*_*"])).rejects.toThrow();
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `geoadd invalid args test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = uuidv4();

                // empty coordinate map
                await expect(client.geoadd(key, new Map())).rejects.toThrow();

                // coordinate out of bound
                await expect(
                    client.geoadd(
                        key,
                        new Map([["Place", { longitude: -181, latitude: 0 }]]),
                    ),
                ).rejects.toThrow();
                await expect(
                    client.geoadd(
                        key,
                        new Map([["Place", { longitude: 181, latitude: 0 }]]),
                    ),
                ).rejects.toThrow();
                await expect(
                    client.geoadd(
                        key,
                        new Map([["Place", { longitude: 0, latitude: 86 }]]),
                    ),
                ).rejects.toThrow();
                await expect(
                    client.geoadd(
                        key,
                        new Map([["Place", { longitude: 0, latitude: -86 }]]),
                    ),
                ).rejects.toThrow();
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `geosearch geosearchstore test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient, cluster) => {
                if (cluster.checkIfServerVersionLessThan("6.2.0")) return;

                const key1 = "{geosearch}" + uuidv4();
                const key2 = "{geosearch}" + uuidv4();
                const key3 = "{geosearch}" + uuidv4();

                const members: string[] = [
                    "Catania",
                    "Palermo",
                    "edge2",
                    "edge1",
                ];
                const membersSet = new Set<string>(members);
                const membersCoordinates: [number, number][] = [
                    [15.087269, 37.502669],
                    [13.361389, 38.115556],
                    [17.24151, 38.788135],
                    [12.758489, 38.788135],
                ];

                const membersGeoData: GeospatialData[] = [];

                for (const [lon, lat] of membersCoordinates) {
                    membersGeoData.push({ longitude: lon, latitude: lat });
                }

                const membersToCoordinates = new Map<string, GeospatialData>();

                for (let i = 0; i < members.length; i++) {
                    membersToCoordinates.set(members[i], membersGeoData[i]);
                }

                const expectedResult = [
                    [
                        members[0],
                        [
                            56.4413,
                            3479447370796909,
                            [15.087267458438873, 37.50266842333162],
                        ],
                    ],
                    [
                        members[1],
                        [
                            190.4424,
                            3479099956230698,
                            [13.361389338970184, 38.1155563954963],
                        ],
                    ],
                    [
                        members[2],
                        [
                            279.7403,
                            3481342659049484,
                            [17.241510450839996, 38.78813451624225],
                        ],
                    ],
                    [
                        members[3],
                        [
                            279.7405,
                            3479273021651468,
                            [12.75848776102066, 38.78813451624225],
                        ],
                    ],
                ];

                // geoadd
                expect(await client.geoadd(key1, membersToCoordinates)).toBe(
                    members.length,
                );

                let searchResult = await client.geosearch(
                    key1,
                    { position: { longitude: 15, latitude: 37 } },
                    { width: 400, height: 400, unit: GeoUnit.KILOMETERS },
                );
                // using set to compare, because results are reordrered
                expect(new Set(searchResult)).toEqual(membersSet);
                // same with geosearchstore
                expect(
                    await client.geosearchstore(
                        key2,
                        key1,
                        { position: { longitude: 15, latitude: 37 } },
                        { width: 400, height: 400, unit: GeoUnit.KILOMETERS },
                    ),
                ).toEqual(4);
                expect(
                    await client.zrange(key2, { start: 0, end: -1 }),
                ).toEqual(searchResult);

                // order search result
                searchResult = await client.geosearch(
                    key1,
                    { position: { longitude: 15, latitude: 37 } },
                    { width: 400, height: 400, unit: GeoUnit.KILOMETERS },
                    { sortOrder: SortOrder.ASC },
                );
                expect(searchResult).toEqual(members);
                // same with geosearchstore
                expect(
                    await client.geosearchstore(
                        key2,
                        key1,
                        { position: { longitude: 15, latitude: 37 } },
                        { width: 400, height: 400, unit: GeoUnit.KILOMETERS },
                        { sortOrder: SortOrder.ASC, storeDist: true },
                    ),
                ).toEqual(4);
                expect(
                    await client.zrange(key2, { start: 0, end: -1 }),
                ).toEqual(searchResult);

                // order and query all extra data
                searchResult = await client.geosearch(
                    key1,
                    { position: { longitude: 15, latitude: 37 } },
                    { width: 400, height: 400, unit: GeoUnit.KILOMETERS },
                    {
                        sortOrder: SortOrder.ASC,
                        withCoord: true,
                        withDist: true,
                        withHash: true,
                    },
                );
                expect(searchResult).toEqual(expectedResult);

                // order, query and limit by 1
                searchResult = await client.geosearch(
                    key1,
                    { position: { longitude: 15, latitude: 37 } },
                    { width: 400, height: 400, unit: GeoUnit.KILOMETERS },
                    {
                        sortOrder: SortOrder.ASC,
                        withCoord: true,
                        withDist: true,
                        withHash: true,
                        count: 1,
                    },
                );
                expect(searchResult).toEqual(expectedResult.slice(0, 1));
                // same with geosearchstore
                expect(
                    await client.geosearchstore(
                        key2,
                        key1,
                        { position: { longitude: 15, latitude: 37 } },
                        { width: 400, height: 400, unit: GeoUnit.KILOMETERS },
                        {
                            sortOrder: SortOrder.ASC,
                            count: 1,
                            storeDist: true,
                        },
                    ),
                ).toEqual(1);
                expect(
                    await client.zrange(key2, { start: 0, end: -1 }),
                ).toEqual([members[0]]);

                // test search by box, unit: meters, from member, with distance
                const meters = 400 * 1000;
                searchResult = await client.geosearch(
                    key1,
                    { member: "Catania" },
                    { width: meters, height: meters, unit: GeoUnit.METERS },
                    {
                        withDist: true,
                        withCoord: false,
                        sortOrder: SortOrder.DESC,
                    },
                );
                expect(searchResult).toEqual([
                    ["edge2", [236529.1799]],
                    ["Palermo", [166274.1516]],
                    ["Catania", [0.0]],
                ]);
                // same with geosearchstore
                expect(
                    await client.geosearchstore(
                        key2,
                        key1,
                        { member: "Catania" },
                        { width: meters, height: meters, unit: GeoUnit.METERS },
                        { sortOrder: SortOrder.DESC, storeDist: true },
                    ),
                ).toEqual(3);
                expect(
                    await client.zrangeWithScores(
                        key2,
                        { start: 0, end: -1 },
                        { reverse: true },
                    ),
                ).toEqual(
                    expect.arrayContaining([
                        {
                            element: "edge2",
                            score: expect.closeTo(236529.17986494553, 0.0001),
                        },
                        {
                            element: "Palermo",
                            score: expect.closeTo(166274.15156960033, 0.0001),
                        },
                        {
                            element: "Catania",
                            score: expect.closeTo(0.0, 0.0001),
                        },
                    ]),
                );

                // test search by box, unit: feet, from member, with limited count 2, with hash
                const feet = 400 * 3280.8399;
                searchResult = await client.geosearch(
                    key1,
                    { member: "Palermo" },
                    { width: feet, height: feet, unit: GeoUnit.FEET },
                    {
                        withDist: false,
                        withCoord: false,
                        withHash: true,
                        sortOrder: SortOrder.ASC,
                        count: 2,
                    },
                );
                expect(searchResult).toEqual([
                    ["Palermo", [3479099956230698]],
                    ["edge1", [3479273021651468]],
                ]);
                // same with geosearchstore
                expect(
                    await client.geosearchstore(
                        key2,
                        key1,
                        { member: "Palermo" },
                        { width: feet, height: feet, unit: GeoUnit.FEET },
                        {
                            sortOrder: SortOrder.ASC,
                            count: 2,
                        },
                    ),
                ).toEqual(2);
                expect(
                    await client.zrangeWithScores(key2, { start: 0, end: -1 }),
                ).toEqual(
                    convertElementsAndScores({
                        Palermo: 3479099956230698,
                        edge1: 3479273021651468,
                    }),
                );

                // test search by box, unit: miles, from geospatial position, with limited ANY count to 1
                const miles = 250;
                searchResult = await client.geosearch(
                    key1,
                    { position: { longitude: 15, latitude: 37 } },
                    { width: miles, height: miles, unit: GeoUnit.MILES },
                    { count: 1, isAny: true },
                );
                expect(members).toContainEqual(searchResult[0]);
                // same with geosearchstore
                expect(
                    await client.geosearchstore(
                        key2,
                        key1,
                        { position: { longitude: 15, latitude: 37 } },
                        { width: miles, height: miles, unit: GeoUnit.MILES },
                        { count: 1, isAny: true },
                    ),
                ).toEqual(1);
                expect(
                    await client.zrange(key2, { start: 0, end: -1 }),
                ).toEqual(searchResult);

                // test search by radius, units: feet, from member
                const feetRadius = 200 * 3280.8399;
                searchResult = await client.geosearch(
                    key1,
                    { member: "Catania" },
                    { radius: feetRadius, unit: GeoUnit.FEET },
                    { sortOrder: SortOrder.ASC },
                );
                expect(searchResult).toEqual(["Catania", "Palermo"]);
                // same with geosearchstore
                expect(
                    await client.geosearchstore(
                        key2,
                        key1,
                        { member: "Catania" },
                        { radius: feetRadius, unit: GeoUnit.FEET },
                        { sortOrder: SortOrder.ASC, storeDist: true },
                    ),
                ).toEqual(2);
                expect(
                    await client.zrange(key2, { start: 0, end: -1 }),
                ).toEqual(searchResult);

                // Test search by radius, unit: meters, from member
                const metersRadius = 200 * 1000;
                searchResult = await client.geosearch(
                    key1,
                    { member: "Catania" },
                    { radius: metersRadius, unit: GeoUnit.METERS },
                    { sortOrder: SortOrder.DESC },
                );
                expect(searchResult).toEqual(["Palermo", "Catania"]);
                // same with geosearchstore
                expect(
                    await client.geosearchstore(
                        key2,
                        key1,
                        { member: "Catania" },
                        { radius: metersRadius, unit: GeoUnit.METERS },
                        { sortOrder: SortOrder.DESC, storeDist: true },
                    ),
                ).toEqual(2);
                expect(
                    await client.zrange(
                        key2,
                        { start: 0, end: -1 },
                        { reverse: true },
                    ),
                ).toEqual(searchResult);

                searchResult = await client.geosearch(
                    key1,
                    { member: "Catania" },
                    { radius: metersRadius, unit: GeoUnit.METERS },
                    {
                        sortOrder: SortOrder.DESC,
                        withHash: true,
                    },
                );
                expect(searchResult).toEqual([
                    ["Palermo", [3479099956230698]],
                    ["Catania", [3479447370796909]],
                ]);

                // Test search by radius, unit: miles, from geospatial data
                searchResult = await client.geosearch(
                    key1,
                    { position: { longitude: 15, latitude: 37 } },
                    { radius: 175, unit: GeoUnit.MILES },
                    { sortOrder: SortOrder.DESC },
                );
                expect(searchResult).toEqual([
                    "edge1",
                    "edge2",
                    "Palermo",
                    "Catania",
                ]);
                // same with geosearchstore
                expect(
                    await client.geosearchstore(
                        key2,
                        key1,
                        { position: { longitude: 15, latitude: 37 } },
                        { radius: 175, unit: GeoUnit.MILES },
                        { sortOrder: SortOrder.DESC, storeDist: true },
                    ),
                ).toEqual(4);
                expect(
                    await client.zrange(
                        key2,
                        { start: 0, end: -1 },
                        { reverse: true },
                    ),
                ).toEqual(searchResult);

                // Test search by radius, unit: kilometers, from a geospatial data, with limited count to 2
                searchResult = await client.geosearch(
                    key1,
                    { position: { longitude: 15, latitude: 37 } },
                    { radius: 200, unit: GeoUnit.KILOMETERS },
                    {
                        sortOrder: SortOrder.ASC,
                        count: 2,
                        withHash: true,
                        withCoord: true,
                        withDist: true,
                    },
                );
                expect(searchResult).toEqual(expectedResult.slice(0, 2));
                // same with geosearchstore
                expect(
                    await client.geosearchstore(
                        key2,
                        key1,
                        { position: { longitude: 15, latitude: 37 } },
                        { radius: 200, unit: GeoUnit.KILOMETERS },
                        {
                            sortOrder: SortOrder.ASC,
                            count: 2,
                            storeDist: true,
                        },
                    ),
                ).toEqual(2);
                expect(
                    await client.zrange(key2, { start: 0, end: -1 }),
                ).toEqual(members.slice(0, 2));

                // Test search by radius, unit: kilometers, from a geospatial data, with limited ANY count to 1
                searchResult = await client.geosearch(
                    key1,
                    { position: { longitude: 15, latitude: 37 } },
                    { radius: 200, unit: GeoUnit.KILOMETERS },
                    {
                        sortOrder: SortOrder.ASC,
                        count: 1,
                        isAny: true,
                        withCoord: true,
                        withDist: true,
                        withHash: true,
                    },
                );
                expect(members).toContainEqual(searchResult[0][0]);
                // same with geosearchstore
                expect(
                    await client.geosearchstore(
                        key2,
                        key1,
                        { position: { longitude: 15, latitude: 37 } },
                        { radius: 200, unit: GeoUnit.KILOMETERS },
                        {
                            sortOrder: SortOrder.ASC,
                            count: 1,
                            isAny: true,
                        },
                    ),
                ).toEqual(1);
                expect(
                    await client.zrange(key2, { start: 0, end: -1 }),
                ).toEqual([searchResult[0][0]]);

                // no members within the area
                searchResult = await client.geosearch(
                    key1,
                    { position: { longitude: 15, latitude: 37 } },
                    { width: 50, height: 50, unit: GeoUnit.METERS },
                    { sortOrder: SortOrder.ASC },
                );
                expect(searchResult).toEqual([]);
                // same with geosearchstore
                expect(
                    await client.geosearchstore(
                        key2,
                        key1,
                        { position: { longitude: 15, latitude: 37 } },
                        { width: 50, height: 50, unit: GeoUnit.METERS },
                        { sortOrder: SortOrder.ASC },
                    ),
                ).toEqual(0);
                expect(await client.zcard(key2)).toEqual(0);

                // no members within the area
                searchResult = await client.geosearch(
                    key1,
                    { position: { longitude: 15, latitude: 37 } },
                    { radius: 5, unit: GeoUnit.METERS },
                    { sortOrder: SortOrder.ASC },
                );
                expect(searchResult).toEqual([]);
                // same with geosearchstore
                expect(
                    await client.geosearchstore(
                        key2,
                        key1,
                        { position: { longitude: 15, latitude: 37 } },
                        { radius: 5, unit: GeoUnit.METERS },
                        { sortOrder: SortOrder.ASC },
                    ),
                ).toEqual(0);
                expect(await client.zcard(key2)).toEqual(0);

                // member does not exist
                await expect(
                    client.geosearch(
                        key1,
                        { member: "non-existing-member" },
                        { radius: 100, unit: GeoUnit.METERS },
                    ),
                ).rejects.toThrow(RequestError);
                await expect(
                    client.geosearchstore(
                        key2,
                        key1,
                        { member: "non-existing-member" },
                        { radius: 100, unit: GeoUnit.METERS },
                    ),
                ).rejects.toThrow(RequestError);

                // key exists but holds a non-ZSET value
                expect(await client.set(key3, uuidv4())).toEqual("OK");
                await expect(
                    client.geosearch(
                        key3,
                        { position: { longitude: 15, latitude: 37 } },
                        { radius: 100, unit: GeoUnit.METERS },
                    ),
                ).rejects.toThrow(RequestError);
                await expect(
                    client.geosearchstore(
                        key2,
                        key3,
                        { position: { longitude: 15, latitude: 37 } },
                        { radius: 100, unit: GeoUnit.METERS },
                    ),
                ).rejects.toThrow(RequestError);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `zmpop test_%p`,
        async (protocol) => {
            await runTest(
                async (client: BaseClient, cluster: ValkeyCluster) => {
                    if (cluster.checkIfServerVersionLessThan("7.0.0")) return;
                    const key1 = "{key}-1" + uuidv4();
                    const key2 = "{key}-2" + uuidv4();
                    const nonExistingKey = "{key}-0" + uuidv4();
                    const stringKey = "{key}-string" + uuidv4();

                    expect(await client.zadd(key1, { a1: 1, b1: 2 })).toEqual(
                        2,
                    );
                    expect(
                        await client.zadd(key2, { a2: 0.1, b2: 0.2 }),
                    ).toEqual(2);

                    expect(
                        await client.zmpop([key1, key2], ScoreFilter.MAX),
                    ).toEqual([key1, convertElementsAndScores({ b1: 2 })]);
                    expect(
                        await client.zmpop(
                            [Buffer.from(key2), key1],
                            ScoreFilter.MAX,
                            {
                                count: 10,
                                decoder: Decoder.Bytes,
                            },
                        ),
                    ).toEqual([
                        Buffer.from(key2),

                        [
                            { element: Buffer.from("b2"), score: 0.2 },
                            { element: Buffer.from("a2"), score: 0.1 },
                        ],
                    ]);

                    expect(
                        await client.zmpop([nonExistingKey], ScoreFilter.MIN),
                    ).toBeNull();
                    expect(
                        await client.zmpop([nonExistingKey], ScoreFilter.MIN, {
                            count: 1,
                        }),
                    ).toBeNull();

                    // key exists, but it is not a sorted set
                    expect(await client.set(stringKey, "value")).toEqual("OK");
                    await expect(
                        client.zmpop([stringKey], ScoreFilter.MAX),
                    ).rejects.toThrow(RequestError);
                    await expect(
                        client.zmpop([stringKey], ScoreFilter.MAX, {
                            count: 1,
                        }),
                    ).rejects.toThrow(RequestError);

                    // incorrect argument: key list should not be empty
                    await expect(
                        client.zmpop([], ScoreFilter.MAX, { count: 1 }),
                    ).rejects.toThrow(RequestError);

                    // incorrect argument: count should be greater than 0
                    await expect(
                        client.zmpop([key1], ScoreFilter.MAX, { count: 0 }),
                    ).rejects.toThrow(RequestError);

                    // check that order of entries in the response is preserved
                    const entries: Record<string, number> = {};

                    for (let i = 0; i < 10; i++) {
                        // a0 => 0, a1 => 1 etc
                        entries["a" + i] = i;
                    }

                    expect(await client.zadd(key2, entries)).toEqual(10);
                    const result = await client.zmpop([key2], ScoreFilter.MIN, {
                        count: 10,
                    });

                    if (result) {
                        expect(result[1]).toEqual(
                            convertElementsAndScores(entries),
                        );
                    }
                },
                protocol,
            );
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `zincrby test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = "{key}" + uuidv4();
                const member = "{member}-1" + uuidv4();
                const othermember = "{member}-1" + uuidv4();
                const stringKey = "{key}-string" + uuidv4();

                // key does not exist
                expect(await client.zincrby(key, 2.5, member)).toEqual(2.5);
                expect(await client.zscore(key, member)).toEqual(2.5);

                // key exists, but value doesn't
                expect(
                    await client.zincrby(Buffer.from(key), -3.3, othermember),
                ).toEqual(-3.3);
                expect(await client.zscore(key, othermember)).toEqual(-3.3);

                // updating existing value in existing key
                expect(
                    await client.zincrby(key, 1.0, Buffer.from(member)),
                ).toEqual(3.5);
                expect(await client.zscore(key, member)).toEqual(3.5);

                // Key exists, but it is not a sorted set
                expect(await client.set(stringKey, "value")).toEqual("OK");
                await expect(
                    client.zincrby(stringKey, 0.5, "_"),
                ).rejects.toThrow(RequestError);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `zscan test_%p`,
        async (protocol) => {
            await runTest(
                async (client: BaseClient, cluster: ValkeyCluster) => {
                    const key1 = "{key}-1" + uuidv4();
                    const key2 = "{key}-2" + uuidv4();
                    const initialCursor = "0";
                    const defaultCount = 20;
                    const resultCursorIndex = 0;
                    const resultCollectionIndex = 1;

                    // Setup test data - use a large number of entries to force an iterative cursor.
                    const numberMap: Record<string, number> = {};

                    for (let i = 0; i < 50000; i++) {
                        numberMap["member" + i.toString()] = i;
                    }

                    const charMembers = ["a", "b", "c", "d", "e"];
                    const charMap: Record<string, number> = {};
                    const expectedCharMapArray: string[] = [];

                    for (let i = 0; i < charMembers.length; i++) {
                        expectedCharMapArray.push(charMembers[i]);
                        expectedCharMapArray.push(i.toString());
                        charMap[charMembers[i]] = i;
                    }

                    // Empty set
                    let result = await client.zscan(key1, initialCursor);
                    expect(result[resultCursorIndex]).toEqual(initialCursor);
                    expect(result[resultCollectionIndex]).toEqual([]);

                    // Negative cursor
                    if (cluster.checkIfServerVersionLessThan("8.0.0")) {
                        result = await client.zscan(key1, "-1");
                        expect(result[resultCursorIndex]).toEqual(
                            initialCursor,
                        );
                        expect(result[resultCollectionIndex]).toEqual([]);
                    } else {
                        await expect(client.zscan(key1, "-1")).rejects.toThrow(
                            "ResponseError: invalid cursor",
                        );
                    }

                    // Result contains the whole set
                    expect(await client.zadd(key1, charMap)).toEqual(
                        charMembers.length,
                    );
                    result = await client.zscan(key1, initialCursor, {
                        decoder: Decoder.Bytes,
                    });
                    expect(result[resultCursorIndex]).toEqual(initialCursor);
                    expect(result[resultCollectionIndex].length).toEqual(
                        expectedCharMapArray.length,
                    );
                    expect(result[resultCollectionIndex]).toEqual(
                        expectedCharMapArray.map(Buffer.from),
                    );

                    result = await client.zscan(
                        Buffer.from(key1),
                        initialCursor,
                        {
                            match: "a",
                        },
                    );
                    expect(result[resultCursorIndex]).toEqual(initialCursor);
                    expect(result[resultCollectionIndex]).toEqual(["a", "0"]);

                    // Result contains a subset of the key
                    expect(await client.zadd(key1, numberMap)).toEqual(
                        Object.keys(numberMap).length,
                    );

                    result = await client.zscan(key1, initialCursor);
                    let resultCursor = result[resultCursorIndex];
                    let resultIterationCollection =
                        result[resultCollectionIndex];
                    let fullResultMapArray = resultIterationCollection;
                    let nextResult;
                    let nextResultCursor;

                    // 0 is returned for the cursor of the last iteration.
                    while (resultCursor != "0") {
                        nextResult = await client.zscan(key1, resultCursor);
                        nextResultCursor = nextResult[resultCursorIndex];
                        expect(nextResultCursor).not.toEqual(resultCursor);

                        expect(nextResult[resultCollectionIndex]).not.toEqual(
                            resultIterationCollection,
                        );
                        fullResultMapArray = fullResultMapArray.concat(
                            nextResult[resultCollectionIndex],
                        );
                        resultIterationCollection =
                            nextResult[resultCollectionIndex];
                        resultCursor = nextResultCursor;
                    }

                    // Fetching by cursor is randomized.
                    const expectedFullMap: Record<string, number> = {
                        ...numberMap,
                        ...charMap,
                    };

                    expect(fullResultMapArray.length).toEqual(
                        Object.keys(expectedFullMap).length * 2,
                    );

                    for (let i = 0; i < fullResultMapArray.length; i += 2) {
                        expect(
                            (fullResultMapArray[i] as string) in
                                expectedFullMap,
                        ).toEqual(true);
                    }

                    // Test match pattern
                    result = await client.zscan(key1, initialCursor, {
                        match: "*",
                    });
                    expect(result[resultCursorIndex]).not.toEqual(
                        initialCursor,
                    );
                    expect(
                        result[resultCollectionIndex].length,
                    ).toBeGreaterThanOrEqual(defaultCount);

                    // Test count
                    result = await client.zscan(key1, initialCursor, {
                        count: 20,
                    });
                    expect(result[resultCursorIndex]).not.toEqual("0");
                    expect(
                        result[resultCollectionIndex].length,
                    ).toBeGreaterThanOrEqual(20);

                    // Test count with match returns a non-empty list
                    result = await client.zscan(key1, initialCursor, {
                        match: "member1*",
                        count: 1000,
                    });
                    expect(result[resultCursorIndex]).not.toEqual("0");
                    expect(
                        result[resultCollectionIndex].length,
                    ).toBeGreaterThan(0);

                    if (!cluster.checkIfServerVersionLessThan("8.0.0")) {
                        const result = await client.zscan(key1, initialCursor, {
                            noScores: true,
                        });
                        const resultCursor = result[resultCursorIndex];
                        const fieldsArray = result[
                            resultCollectionIndex
                        ] as string[];

                        // Verify that the cursor is not "0" and values are not included
                        expect(resultCursor).not.toEqual("0");
                        expect(
                            fieldsArray.every((field) =>
                                field.startsWith("member"),
                            ),
                        ).toBeTruthy();
                    }

                    // Exceptions
                    // Non-set key
                    expect(await client.set(key2, "test")).toEqual("OK");
                    await expect(
                        client.zscan(key2, initialCursor),
                    ).rejects.toThrow(RequestError);
                    await expect(
                        client.zscan(key2, initialCursor, {
                            match: "test",
                            count: 20,
                        }),
                    ).rejects.toThrow(RequestError);

                    // Negative count
                    await expect(
                        client.zscan(key2, initialCursor, { count: -1 }),
                    ).rejects.toThrow(RequestError);
                },
                protocol,
            );
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `bzmpop test_%p`,
        async (protocol) => {
            await runTest(
                async (client: BaseClient, cluster: ValkeyCluster) => {
                    if (cluster.checkIfServerVersionLessThan("7.0.0")) return;
                    const key1 = "{key}-1" + uuidv4();
                    const key2 = "{key}-2" + uuidv4();
                    const nonExistingKey = "{key}-0" + uuidv4();
                    const stringKey = "{key}-string" + uuidv4();

                    expect(await client.zadd(key1, { a1: 1, b1: 2 })).toEqual(
                        2,
                    );
                    expect(
                        await client.zadd(key2, { a2: 0.1, b2: 0.2 }),
                    ).toEqual(2);

                    expect(
                        await client.bzmpop([key1, key2], ScoreFilter.MAX, 0.1),
                    ).toEqual([key1, convertElementsAndScores({ b1: 2 })]);
                    expect(
                        await client.bzmpop(
                            [key2, Buffer.from(key1)],
                            ScoreFilter.MAX,
                            0.1,
                            {
                                count: 10,
                                decoder: Decoder.Bytes,
                            },
                        ),
                    ).toEqual([
                        Buffer.from(key2),
                        [
                            { element: Buffer.from("b2"), score: 0.2 },
                            { element: Buffer.from("a2"), score: 0.1 },
                        ],
                    ]);

                    // ensure that command doesn't time out even if timeout > request timeout (250ms by default)
                    expect(
                        await client.bzmpop(
                            [nonExistingKey],
                            ScoreFilter.MAX,
                            0.5,
                        ),
                    ).toBeNull();
                    expect(
                        await client.bzmpop(
                            [nonExistingKey],
                            ScoreFilter.MAX,
                            0.55,
                            { count: 1 },
                        ),
                    ).toBeNull();

                    // key exists, but it is not a sorted set
                    expect(await client.set(stringKey, "value")).toEqual("OK");
                    await expect(
                        client.bzmpop([stringKey], ScoreFilter.MAX, 0.1),
                    ).rejects.toThrow(RequestError);
                    await expect(
                        client.bzmpop([stringKey], ScoreFilter.MAX, 0.1, {
                            count: 1,
                        }),
                    ).rejects.toThrow(RequestError);

                    // incorrect argument: key list should not be empty
                    await expect(
                        client.bzmpop([], ScoreFilter.MAX, 0.1, { count: 1 }),
                    ).rejects.toThrow(RequestError);

                    // incorrect argument: count should be greater than 0
                    await expect(
                        client.bzmpop([key1], ScoreFilter.MAX, 0.1, {
                            count: 0,
                        }),
                    ).rejects.toThrow(RequestError);

                    // incorrect argument: timeout can not be a negative number
                    await expect(
                        client.bzmpop([key1], ScoreFilter.MAX, -1, {
                            count: 10,
                        }),
                    ).rejects.toThrow(RequestError);

                    // check that order of entries in the response is preserved
                    const entries: Record<string, number> = {};

                    for (let i = 0; i < 10; i++) {
                        // a0 => 0, a1 => 1 etc
                        entries["a" + i] = i;
                    }

                    expect(await client.zadd(key2, entries)).toEqual(10);
                    const result = await client.bzmpop(
                        [key2],
                        ScoreFilter.MIN,
                        0.1,
                        { count: 10 },
                    );

                    if (result) {
                        expect(result[1]).toEqual(
                            convertElementsAndScores(entries),
                        );
                    }
                },
                protocol,
            );
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `geodist test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = uuidv4();
                const key2 = uuidv4();
                const member1 = "Palermo";
                const member2 = "Catania";
                const nonExistingMember = "NonExisting";
                const expected = 166274.1516;
                const expectedKM = 166.2742;
                const delta = 1e-9;

                // adding the geo locations
                const membersToCoordinates = new Map<string, GeospatialData>();
                membersToCoordinates.set(member1, {
                    longitude: 13.361389,
                    latitude: 38.115556,
                });
                membersToCoordinates.set(member2, {
                    longitude: 15.087269,
                    latitude: 37.502669,
                });
                expect(await client.geoadd(key1, membersToCoordinates)).toBe(2);

                // checking result with default metric
                expect(
                    await client.geodist(key1, member1, member2),
                ).toBeCloseTo(expected, delta);

                // checking result with metric specification of kilometers
                expect(
                    await client.geodist(key1, member1, member2, {
                        unit: GeoUnit.KILOMETERS,
                    }),
                ).toBeCloseTo(expectedKM, delta);

                // null result when member index is missing
                expect(
                    await client.geodist(key1, member1, nonExistingMember),
                ).toBeNull();

                // key exists but holds non-ZSET value
                expect(await client.set(key2, "geodist")).toBe("OK");
                await expect(
                    client.geodist(key2, member1, member2),
                ).rejects.toThrow();
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `geohash test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = uuidv4();
                const key2 = uuidv4();
                const members = ["Palermo", "Catania", "NonExisting"];
                const empty: string[] = [];
                const expected = ["sqc8b49rny0", "sqdtr74hyu0", null];

                // adding the geo locations
                const membersToCoordinates = new Map<string, GeospatialData>();
                membersToCoordinates.set("Palermo", {
                    longitude: 13.361389,
                    latitude: 38.115556,
                });
                membersToCoordinates.set("Catania", {
                    longitude: 15.087269,
                    latitude: 37.502669,
                });
                expect(await client.geoadd(key1, membersToCoordinates)).toBe(2);

                // checking result with default metric
                expect(await client.geohash(key1, members)).toEqual(expected);

                // empty members array
                expect(await (await client.geohash(key1, empty)).length).toBe(
                    0,
                );

                // key exists but holds non-ZSET value
                expect(await client.set(key2, "geohash")).toBe("OK");
                await expect(client.geohash(key2, members)).rejects.toThrow();
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `geo commands binary %p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = "{geo-bin}-1-" + uuidv4();
                const key2 = "{geo-bin}-2-" + uuidv4();

                const members = [
                    "Catania",
                    Buffer.from("Palermo"),
                    "edge2",
                    "edge1",
                ];
                const membersCoordinates: [number, number][] = [
                    [15.087269, 37.502669],
                    [13.361389, 38.115556],
                    [17.24151, 38.788135],
                    [12.758489, 38.788135],
                ];

                const membersGeoData: GeospatialData[] = [];

                for (const [lon, lat] of membersCoordinates) {
                    membersGeoData.push({ longitude: lon, latitude: lat });
                }

                const membersToCoordinates = new Map();

                for (let i = 0; i < members.length; i++) {
                    membersToCoordinates.set(members[i], membersGeoData[i]);
                }

                // geoadd
                expect(
                    await client.geoadd(
                        Buffer.from(key1),
                        membersToCoordinates,
                    ),
                ).toBe(4);
                // geopos
                const geopos = await client.geopos(Buffer.from(key1), [
                    "Palermo",
                    Buffer.from("Catania"),
                    "New York",
                ]);
                // inner array is possibly null, we need a null check or a cast
                expect(geopos[0]?.[0]).toBeCloseTo(13.361389, 5);
                expect(geopos[0]?.[1]).toBeCloseTo(38.115556, 5);
                expect(geopos[1]?.[0]).toBeCloseTo(15.087269, 5);
                expect(geopos[1]?.[1]).toBeCloseTo(37.502669, 5);
                expect(geopos[2]).toBeNull();
                // geohash
                const geohash = await client.geohash(Buffer.from(key1), [
                    "Palermo",
                    Buffer.from("Catania"),
                    "New York",
                ]);
                expect(geohash).toEqual(["sqc8b49rny0", "sqdtr74hyu0", null]);
                // geodist
                expect(
                    await client.geodist(
                        Buffer.from(key1),
                        Buffer.from("Palermo"),
                        "Catania",
                    ),
                ).toBeCloseTo(166274.1516, 5);

                // geosearch with binary decoder
                let searchResult = await client.geosearch(
                    Buffer.from(key1),
                    { position: { longitude: 15, latitude: 37 } },
                    { width: 400, height: 400, unit: GeoUnit.KILOMETERS },
                    { decoder: Decoder.Bytes },
                );
                // using set to compare, because results are reordrered
                expect(new Set(searchResult)).toEqual(
                    new Set(members.map((m) => Buffer.from(m))),
                );
                // repeat geosearch with string decoder
                searchResult = await client.geosearch(
                    Buffer.from(key1),
                    { position: { longitude: 15, latitude: 37 } },
                    { width: 400, height: 400, unit: GeoUnit.KILOMETERS },
                );
                // using set to compare, because results are reordrered
                expect(new Set(searchResult)).toEqual(
                    new Set(members.map((m) => m.toString())),
                );
                // same with geosearchstore
                expect(
                    await client.geosearchstore(
                        Buffer.from(key2),
                        Buffer.from(key1),
                        { position: { longitude: 15, latitude: 37 } },
                        { width: 400, height: 400, unit: GeoUnit.KILOMETERS },
                    ),
                ).toEqual(4);
                expect(
                    await client.zrange(key2, { start: 0, end: -1 }),
                ).toEqual(searchResult);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `touch test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = `{key}-${uuidv4()}`;
                const key2 = `{key}-${uuidv4()}`;
                const nonExistingKey = `{key}-${uuidv4()}`;

                expect(
                    await client.mset({ [key1]: "value1", [key2]: "value2" }),
                ).toEqual("OK");
                expect(await client.touch([key1, Buffer.from(key2)])).toEqual(
                    2,
                );
                expect(
                    await client.touch([key2, nonExistingKey, key1]),
                ).toEqual(2);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `zrandmember test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = uuidv4();
                const key2 = uuidv4();

                const memberScores = { one: 1.0, two: 2.0 };
                const elements: GlideString[] = ["one", "two"];
                expect(await client.zadd(key1, memberScores)).toBe(2);

                // check random memember belongs to the set
                const randmember = await client.zrandmember(Buffer.from(key1));

                if (randmember !== null) {
                    expect(elements.includes(randmember)).toEqual(true);
                }

                // non existing key should return null
                expect(await client.zrandmember("nonExistingKey")).toBeNull();

                // Key exists, but is not a set
                expect(await client.set(key2, "foo")).toBe("OK");
                await expect(client.zrandmember(key2)).rejects.toThrow(
                    RequestError,
                );
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `zrandmemberWithCount test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = uuidv4();
                const key2 = uuidv4();

                const memberScores = { one: 1.0, two: 2.0 };
                expect(await client.zadd(key1, memberScores)).toBe(2);

                // unique values are expected as count is positive
                let randMembers = await client.zrandmemberWithCount(key1, 4);
                expect(randMembers.length).toBe(2);
                expect(randMembers.length).toEqual(new Set(randMembers).size);

                // Duplicate values are expected as count is negative
                randMembers = await client.zrandmemberWithCount(
                    Buffer.from(key1),
                    -4,
                );
                expect(randMembers.length).toBe(4);
                const randMemberSet = new Set<string>();

                for (const member of randMembers) {
                    const memberStr = member + "";

                    if (!randMemberSet.has(memberStr)) {
                        randMemberSet.add(memberStr);
                    }
                }

                expect(randMembers.length).not.toEqual(randMemberSet.size);

                // non existing key should return empty array
                randMembers = await client.zrandmemberWithCount(
                    "nonExistingKey",
                    -4,
                );
                expect(randMembers.length).toBe(0);

                // Key exists, but is not a set
                expect(await client.set(key2, "foo")).toBe("OK");
                await expect(
                    client.zrandmemberWithCount(key2, 1),
                ).rejects.toThrow();
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `zrandmemberWithCountWithScores test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key1 = uuidv4();
                const key2 = uuidv4();

                const memberScores = { one: 1.0, two: 2.0 };
                const memberScoreMap = new Map<string, number>([
                    ["one", 1.0],
                    ["two", 2.0],
                ]);
                expect(await client.zadd(key1, memberScores)).toBe(2);

                // unique values are expected as count is positive
                let randMembers = await client.zrandmemberWithCountWithScores(
                    Buffer.from(key1),
                    4,
                );

                for (const member of randMembers) {
                    const key = String(member[0]);
                    const score = Number(member[1]);
                    expect(score).toEqual(memberScoreMap.get(key));
                }

                // Duplicate values are expected as count is negative
                randMembers = await client.zrandmemberWithCountWithScores(
                    key1,
                    -4,
                );
                expect(randMembers.length).toBe(4);
                const keys = [];

                for (const member of randMembers) {
                    keys.push(String(member[0]));
                }

                expect(randMembers.length).not.toEqual(new Set(keys).size);

                // non existing key should return empty array
                randMembers = await client.zrandmemberWithCountWithScores(
                    "nonExistingKey",
                    -4,
                );
                expect(randMembers.length).toBe(0);

                // Key exists, but is not a set
                expect(await client.set(key2, "foo")).toBe("OK");
                await expect(
                    client.zrandmemberWithCount(key2, 1),
                ).rejects.toThrow();
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `lcs %p`,
        async (protocol) => {
            await runTest(async (client: BaseClient, cluster) => {
                if (cluster.checkIfServerVersionLessThan("7.0.0")) return;

                const key1 = "{lcs}" + uuidv4();
                const key2 = "{lcs}" + uuidv4();
                const key3 = "{lcs}" + uuidv4();
                const key4 = "{lcs}" + uuidv4();

                // keys does not exist or is empty
                expect(await client.lcs(key1, key2)).toEqual("");
                expect(
                    await client.lcs(Buffer.from(key1), Buffer.from(key2)),
                ).toEqual("");
                expect(await client.lcsLen(key1, key2)).toEqual(0);
                expect(
                    await client.lcsLen(Buffer.from(key1), Buffer.from(key2)),
                ).toEqual(0);
                expect(await client.lcsIdx(key1, key2)).toEqual({
                    matches: [],
                    len: 0,
                });
                expect(
                    await client.lcsIdx(Buffer.from(key1), Buffer.from(key2)),
                ).toEqual({
                    matches: [],
                    len: 0,
                });

                // LCS with some strings
                expect(
                    await client.mset({
                        [key1]: "abcdefghijk",
                        [key2]: "defjkjuighijk",
                        [key3]: "123",
                    }),
                ).toEqual("OK");
                expect(await client.lcs(key1, key2)).toEqual("defghijk");
                expect(await client.lcsLen(key1, key2)).toEqual(8);

                // LCS with only IDX
                expect(await client.lcsIdx(key1, key2)).toEqual({
                    matches: [
                        [
                            [6, 10],
                            [8, 12],
                        ],
                        [
                            [3, 5],
                            [0, 2],
                        ],
                    ],
                    len: 8,
                });
                expect(await client.lcsIdx(key1, key2, {})).toEqual({
                    matches: [
                        [
                            [6, 10],
                            [8, 12],
                        ],
                        [
                            [3, 5],
                            [0, 2],
                        ],
                    ],
                    len: 8,
                });
                expect(
                    await client.lcsIdx(key1, key2, { withMatchLen: false }),
                ).toEqual({
                    matches: [
                        [
                            [6, 10],
                            [8, 12],
                        ],
                        [
                            [3, 5],
                            [0, 2],
                        ],
                    ],
                    len: 8,
                });

                // LCS with IDX and WITHMATCHLEN
                expect(
                    await client.lcsIdx(key1, key2, { withMatchLen: true }),
                ).toEqual({
                    matches: [
                        [[6, 10], [8, 12], 5],
                        [[3, 5], [0, 2], 3],
                    ],
                    len: 8,
                });

                // LCS with IDX and MINMATCHLEN
                expect(
                    await client.lcsIdx(key1, key2, { minMatchLen: 4 }),
                ).toEqual({
                    matches: [
                        [
                            [6, 10],
                            [8, 12],
                        ],
                    ],
                    len: 8,
                });
                // LCS with IDX and a negative MINMATCHLEN
                expect(
                    await client.lcsIdx(key1, key2, { minMatchLen: -1 }),
                ).toEqual({
                    matches: [
                        [
                            [6, 10],
                            [8, 12],
                        ],
                        [
                            [3, 5],
                            [0, 2],
                        ],
                    ],
                    len: 8,
                });

                // LCS with IDX, MINMATCHLEN, and WITHMATCHLEN
                expect(
                    await client.lcsIdx(key1, key2, {
                        minMatchLen: 4,
                        withMatchLen: true,
                    }),
                ).toEqual({ matches: [[[6, 10], [8, 12], 5]], len: 8 });

                // non-string keys are used
                expect(await client.sadd(key4, ["_"])).toEqual(1);
                await expect(client.lcs(key1, key4)).rejects.toThrow(
                    RequestError,
                );
                await expect(client.lcsLen(key1, key4)).rejects.toThrow(
                    RequestError,
                );
                await expect(client.lcsIdx(key1, key4)).rejects.toThrow(
                    RequestError,
                );
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `xdel test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = uuidv4();
                const stringKey = uuidv4();
                const nonExistentKey = uuidv4();
                const streamId1 = "0-1";
                const streamId2 = "0-2";
                const streamId3 = "0-3";

                expect(
                    await client.xadd(
                        key,
                        [
                            ["f1", "foo1"],
                            ["f2", "foo2"],
                        ],
                        { id: streamId1 },
                    ),
                ).toEqual(streamId1);

                expect(
                    await client.xadd(
                        key,
                        [
                            ["f1", "foo1"],
                            ["f2", "foo2"],
                        ],
                        { id: streamId2 },
                    ),
                ).toEqual(streamId2);

                expect(await client.xlen(key)).toEqual(2);

                // deletes one stream id, and ignores anything invalid
                expect(await client.xdel(key, [streamId1, streamId3])).toEqual(
                    1,
                );
                expect(
                    await client.xdel(Buffer.from(nonExistentKey), [streamId3]),
                ).toEqual(0);

                // invalid argument - id list should not be empty
                await expect(client.xdel(key, [])).rejects.toThrow(
                    RequestError,
                );

                // key exists, but it is not a stream
                expect(await client.set(stringKey, "foo")).toEqual("OK");
                await expect(
                    client.xdel(stringKey, [streamId3]),
                ).rejects.toThrow(RequestError);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `xinfoconsumers xinfo consumers %p`,
        async (protocol) => {
            await runTest(async (client: BaseClient, cluster) => {
                const key = uuidv4();
                const stringKey = uuidv4();
                const groupName1 = uuidv4();
                const consumer1 = uuidv4();
                const consumer2 = uuidv4();
                const streamId1 = "0-1";
                const streamId2 = "0-2";
                const streamId3 = "0-3";
                const streamId4 = "0-4";

                expect(
                    await client.xadd(
                        key,
                        [
                            ["entry1_field1", "entry1_value1"],
                            ["entry1_field2", "entry1_value2"],
                        ],
                        { id: streamId1 },
                    ),
                ).toEqual(streamId1);

                expect(
                    await client.xadd(
                        key,
                        [
                            ["entry2_field1", "entry2_value1"],
                            ["entry2_field2", "entry2_value2"],
                        ],
                        { id: streamId2 },
                    ),
                ).toEqual(streamId2);

                expect(
                    await client.xadd(
                        key,
                        [["entry3_field1", "entry3_value1"]],
                        { id: streamId3 },
                    ),
                ).toEqual(streamId3);

                expect(
                    await client.xgroupCreate(key, groupName1, "0-0"),
                ).toEqual("OK");

                let xreadgroup = await client.xreadgroup(
                    groupName1,
                    consumer1,
                    { [key]: ">" },
                    { count: 1 },
                );
                expect(convertGlideRecordToRecord(xreadgroup!)).toEqual({
                    [key]: {
                        [streamId1]: [
                            ["entry1_field1", "entry1_value1"],
                            ["entry1_field2", "entry1_value2"],
                        ],
                    },
                });
                // Sleep to ensure the idle time value and inactive time value returned by xinfo_consumers is > 0
                await new Promise((resolve) => setTimeout(resolve, 2000));
                let result = await client.xinfoConsumers(key, groupName1);
                expect(result.length).toEqual(1);
                expect(result[0].name).toEqual(consumer1);
                expect(result[0].pending).toEqual(1);
                expect(result[0].idle).toBeGreaterThan(0);

                if (!cluster.checkIfServerVersionLessThan("7.2.0")) {
                    expect(result[0].inactive).toBeGreaterThan(0);
                }

                expect(
                    await client.xgroupCreateConsumer(
                        key,
                        groupName1,
                        consumer2,
                    ),
                ).toBeTruthy();
                xreadgroup = await client.xreadgroup(
                    groupName1,
                    consumer2,
                    {
                        [key]: ">",
                    },
                    { decoder: Decoder.Bytes },
                );
                expect(xreadgroup).toEqual([
                    {
                        key: Buffer.from(key),
                        value: {
                            [streamId2]: [
                                [
                                    Buffer.from("entry2_field1"),
                                    Buffer.from("entry2_value1"),
                                ],
                                [
                                    Buffer.from("entry2_field2"),
                                    Buffer.from("entry2_value2"),
                                ],
                            ],
                            [streamId3]: [
                                [
                                    Buffer.from("entry3_field1"),
                                    Buffer.from("entry3_value1"),
                                ],
                            ],
                        },
                    },
                ]);

                // Verify that xinfo_consumers contains info for 2 consumers now
                result = await client.xinfoConsumers(key, groupName1);
                expect(result.length).toEqual(2);

                // key exists, but it is not a stream
                expect(await client.set(stringKey, "foo")).toEqual("OK");
                await expect(
                    client.xinfoConsumers(stringKey, "_"),
                ).rejects.toThrow(RequestError);

                // Passing a non-existing key raises an error
                const key2 = uuidv4();
                await expect(client.xinfoConsumers(key2, "_")).rejects.toThrow(
                    RequestError,
                );

                expect(
                    await client.xadd(key2, [["field", "value"]], {
                        id: streamId4,
                    }),
                ).toEqual(streamId4);

                // Passing a non-existing group raises an error
                await expect(client.xinfoConsumers(key2, "_")).rejects.toThrow(
                    RequestError,
                );

                expect(
                    await client.xgroupCreate(key2, groupName1, "0-0"),
                ).toEqual("OK");
                expect(
                    await client.xinfoConsumers(Buffer.from(key2), groupName1),
                ).toEqual([]);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `xinfogroups xinfo groups %p`,
        async (protocol) => {
            await runTest(async (client: BaseClient, cluster) => {
                const key = uuidv4();
                const stringKey = uuidv4();
                const groupName1 = uuidv4();
                const consumer1 = uuidv4();
                const streamId1 = "0-1";
                const streamId2 = "0-2";
                const streamId3 = "0-3";

                expect(
                    await client.xgroupCreate(key, groupName1, "0-0", {
                        mkStream: true,
                    }),
                ).toEqual("OK");

                // one empty group exists
                expect(await client.xinfoGroups(Buffer.from(key))).toEqual(
                    cluster.checkIfServerVersionLessThan("7.0.0")
                        ? [
                              {
                                  name: groupName1,
                                  consumers: 0,
                                  pending: 0,
                                  "last-delivered-id": "0-0",
                              },
                          ]
                        : [
                              {
                                  name: groupName1,
                                  consumers: 0,
                                  pending: 0,
                                  "last-delivered-id": "0-0",
                                  "entries-read": null,
                                  lag: 0,
                              },
                          ],
                );

                expect(
                    await client.xadd(
                        key,
                        [
                            ["entry1_field1", "entry1_value1"],
                            ["entry1_field2", "entry1_value2"],
                        ],
                        { id: streamId1 },
                    ),
                ).toEqual(streamId1);

                expect(
                    await client.xadd(
                        key,
                        [
                            ["entry2_field1", "entry2_value1"],
                            ["entry2_field2", "entry2_value2"],
                        ],
                        { id: streamId2 },
                    ),
                ).toEqual(streamId2);

                expect(
                    await client.xadd(
                        key,
                        [["entry3_field1", "entry3_value1"]],
                        { id: streamId3 },
                    ),
                ).toEqual(streamId3);

                // same as previous check, bug lag = 3, there are 3 messages unread
                expect(await client.xinfoGroups(key)).toEqual(
                    cluster.checkIfServerVersionLessThan("7.0.0")
                        ? [
                              {
                                  name: groupName1,
                                  consumers: 0,
                                  pending: 0,
                                  "last-delivered-id": "0-0",
                              },
                          ]
                        : [
                              {
                                  name: groupName1,
                                  consumers: 0,
                                  pending: 0,
                                  "last-delivered-id": "0-0",
                                  "entries-read": null,
                                  lag: 3,
                              },
                          ],
                );

                const xreadgroup = await client.xreadgroup(
                    groupName1,
                    consumer1,
                    { [key]: ">" },
                );
                expect(convertGlideRecordToRecord(xreadgroup!)).toEqual({
                    [key]: {
                        [streamId1]: [
                            ["entry1_field1", "entry1_value1"],
                            ["entry1_field2", "entry1_value2"],
                        ],
                        [streamId2]: [
                            ["entry2_field1", "entry2_value1"],
                            ["entry2_field2", "entry2_value2"],
                        ],
                        [streamId3]: [["entry3_field1", "entry3_value1"]],
                    },
                });
                // after reading, `lag` is reset, and `pending`, consumer count and last ID are set
                expect(await client.xinfoGroups(key)).toEqual(
                    cluster.checkIfServerVersionLessThan("7.0.0")
                        ? [
                              {
                                  name: groupName1,
                                  consumers: 1,
                                  pending: 3,
                                  "last-delivered-id": streamId3,
                              },
                          ]
                        : [
                              {
                                  name: groupName1,
                                  consumers: 1,
                                  pending: 3,
                                  "last-delivered-id": streamId3,
                                  "entries-read": 3,
                                  lag: 0,
                              },
                          ],
                );

                expect(await client.xack(key, groupName1, [streamId1])).toEqual(
                    1,
                );
                // once message ack'ed, pending counter decreased
                expect(await client.xinfoGroups(key)).toEqual(
                    cluster.checkIfServerVersionLessThan("7.0.0")
                        ? [
                              {
                                  name: groupName1,
                                  consumers: 1,
                                  pending: 2,
                                  "last-delivered-id": streamId3,
                              },
                          ]
                        : [
                              {
                                  name: groupName1,
                                  consumers: 1,
                                  pending: 2,
                                  "last-delivered-id": streamId3,
                                  "entries-read": 3,
                                  lag: 0,
                              },
                          ],
                );

                // key exists, but it is not a stream
                expect(await client.set(stringKey, "foo")).toEqual("OK");
                await expect(client.xinfoGroups(stringKey)).rejects.toThrow(
                    RequestError,
                );

                // Passing a non-existing key raises an error
                const key2 = uuidv4();
                await expect(client.xinfoGroups(key2)).rejects.toThrow(
                    RequestError,
                );
                // create a second stream
                await client.xadd(key2, [["a", "b"]]);
                // no group yet exists
                expect(await client.xinfoGroups(key2)).toEqual([]);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `xgroupSetId test %p`,
        async (protocol) => {
            await runTest(
                async (client: BaseClient, cluster: ValkeyCluster) => {
                    const key = "testKey" + uuidv4();
                    const nonExistingKey = "group" + uuidv4();
                    const stringKey = "testKey" + uuidv4();
                    const groupName = uuidv4();
                    const consumerName = uuidv4();
                    const streamid0 = "0";
                    const streamid1_0 = "1-0";
                    const streamid1_1 = "1-1";
                    const streamid1_2 = "1-2";

                    // Setup: Create stream with 3 entries, create consumer group, read entries to add them to the Pending Entries List
                    expect(
                        await client.xadd(key, [["f0", "v0"]], {
                            id: streamid1_0,
                        }),
                    ).toBe(streamid1_0);
                    expect(
                        await client.xadd(key, [["f1", "v1"]], {
                            id: streamid1_1,
                        }),
                    ).toBe(streamid1_1);
                    expect(
                        await client.xadd(key, [["f2", "v2"]], {
                            id: streamid1_2,
                        }),
                    ).toBe(streamid1_2);

                    expect(
                        await client.xgroupCreate(key, groupName, streamid0),
                    ).toBe("OK");

                    expect(
                        convertGlideRecordToRecord(
                            (await client.xreadgroup(groupName, consumerName, {
                                [key]: ">",
                            }))!,
                        ),
                    ).toEqual({
                        [key]: {
                            [streamid1_0]: [["f0", "v0"]],
                            [streamid1_1]: [["f1", "v1"]],
                            [streamid1_2]: [["f2", "v2"]],
                        },
                    });

                    // Sanity check: xreadgroup should not return more entries since they're all already in the
                    // Pending Entries List.
                    expect(
                        await client.xreadgroup(groupName, consumerName, {
                            [key]: ">",
                        }),
                    ).toBeNull();

                    // Reset the last delivered ID for the consumer group to "1-1"
                    if (cluster.checkIfServerVersionLessThan("7.0.0")) {
                        expect(
                            await client.xgroupSetId(
                                key,
                                groupName,
                                streamid1_1,
                            ),
                        ).toBe("OK");
                    } else {
                        expect(
                            await client.xgroupSetId(
                                key,
                                groupName,
                                streamid1_1,
                                { entriesRead: 1 },
                            ),
                        ).toBe("OK");
                    }

                    // xreadgroup should only return entry 1-2 since we reset the last delivered ID to 1-1
                    const newResult = await client.xreadgroup(
                        groupName,
                        consumerName,
                        { [key]: ">" },
                    );
                    expect(convertGlideRecordToRecord(newResult!)).toEqual({
                        [key]: {
                            [streamid1_2]: [["f2", "v2"]],
                        },
                    });

                    // An error is raised if XGROUP SETID is called with a non-existing key
                    await expect(
                        client.xgroupSetId(
                            nonExistingKey,
                            groupName,
                            streamid0,
                        ),
                    ).rejects.toThrow(RequestError);

                    // An error is raised if XGROUP SETID is called with a non-existing group
                    await expect(
                        client.xgroupSetId(
                            key,
                            "non_existing_group",
                            streamid0,
                        ),
                    ).rejects.toThrow(RequestError);

                    // Setting the ID to a non-existing ID is allowed
                    expect(
                        await client.xgroupSetId(key, groupName, "99-99"),
                    ).toBe("OK");

                    // Testing binary parameters with an non-existing ID
                    expect(
                        await client.xgroupSetId(
                            Buffer.from(key),
                            Buffer.from(groupName),
                            "99-99",
                        ),
                    ).toBe("OK");

                    // key exists, but is not a stream
                    expect(await client.set(stringKey, "xgroup setid")).toBe(
                        "OK",
                    );
                    await expect(
                        client.xgroupSetId(stringKey, groupName, streamid1_0),
                    ).rejects.toThrow(RequestError);
                },
                protocol,
            );
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `xpending test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient, cluster) => {
                const key = uuidv4();
                const group = uuidv4();

                expect(
                    await client.xgroupCreate(key, group, "0", {
                        mkStream: true,
                    }),
                ).toEqual("OK");
                expect(
                    await client.xgroupCreateConsumer(key, group, "consumer"),
                ).toEqual(true);

                expect(
                    await client.xadd(
                        key,
                        [
                            ["entry1_field1", "entry1_value1"],
                            ["entry1_field2", "entry1_value2"],
                        ],
                        { id: "0-1" },
                    ),
                ).toEqual("0-1");
                expect(
                    await client.xadd(
                        key,
                        [["entry2_field1", "entry2_value1"]],
                        { id: "0-2" },
                    ),
                ).toEqual("0-2");

                expect(
                    convertGlideRecordToRecord(
                        (await client.xreadgroup(group, "consumer", {
                            [key]: ">",
                        }))!,
                    ),
                ).toEqual({
                    [key]: {
                        "0-1": [
                            ["entry1_field1", "entry1_value1"],
                            ["entry1_field2", "entry1_value2"],
                        ],
                        "0-2": [["entry2_field1", "entry2_value1"]],
                    },
                });

                // wait to get some minIdleTime
                await new Promise((resolve) => setTimeout(resolve, 500));

                expect(await client.xpending(Buffer.from(key), group)).toEqual([
                    2,
                    "0-1",
                    "0-2",
                    [["consumer", "2"]],
                ]);

                const result = await client.xpendingWithOptions(
                    key,
                    Buffer.from(group),
                    cluster.checkIfServerVersionLessThan("6.2.0")
                        ? {
                              start: InfBoundary.NegativeInfinity,
                              end: InfBoundary.PositiveInfinity,
                              count: 1,
                          }
                        : {
                              start: InfBoundary.NegativeInfinity,
                              end: InfBoundary.PositiveInfinity,
                              count: 1,
                              minIdleTime: 42,
                          },
                );
                result[0][2] = 0; // overwrite msec counter to avoid test flakyness
                expect(result).toEqual([["0-1", "consumer", 0, 1]]);

                // not existing consumer
                expect(
                    await client.xpendingWithOptions(key, group, {
                        start: { value: "0-1", isInclusive: true },
                        end: { value: "0-2", isInclusive: false },
                        count: 12,
                        consumer: Buffer.from("_"),
                    }),
                ).toEqual([]);

                // key exists, but it is not a stream
                const stringKey = uuidv4();
                expect(await client.set(stringKey, "foo")).toEqual("OK");
                await expect(client.xpending(stringKey, "_")).rejects.toThrow(
                    RequestError,
                );
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `xclaim test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = uuidv4();
                const group = uuidv4();

                expect(
                    await client.xgroupCreate(key, group, "0", {
                        mkStream: true,
                    }),
                ).toEqual("OK");
                expect(
                    await client.xgroupCreateConsumer(key, group, "consumer"),
                ).toEqual(true);

                expect(
                    await client.xadd(
                        key,
                        [
                            ["entry1_field1", "entry1_value1"],
                            ["entry1_field2", "entry1_value2"],
                        ],
                        { id: "0-1" },
                    ),
                ).toEqual("0-1");
                expect(
                    await client.xadd(
                        key,
                        [["entry2_field1", "entry2_value1"]],
                        { id: "0-2" },
                    ),
                ).toEqual("0-2");

                expect(
                    convertGlideRecordToRecord(
                        (await client.xreadgroup(group, "consumer", {
                            [key]: ">",
                        }))!,
                    ),
                ).toEqual({
                    [key]: {
                        "0-1": [
                            ["entry1_field1", "entry1_value1"],
                            ["entry1_field2", "entry1_value2"],
                        ],
                        "0-2": [["entry2_field1", "entry2_value1"]],
                    },
                });

                expect(
                    await client.xclaim(key, group, "consumer", 0, ["0-1"]),
                ).toEqual({
                    "0-1": [
                        ["entry1_field1", "entry1_value1"],
                        ["entry1_field2", "entry1_value2"],
                    ],
                });
                expect(
                    await client.xclaimJustId(key, group, "consumer", 0, [
                        "0-2",
                    ]),
                ).toEqual(["0-2"]);

                // add one more entry
                expect(
                    await client.xadd(
                        key,
                        [["entry3_field1", "entry3_value1"]],
                        { id: "0-3" },
                    ),
                ).toEqual("0-3");
                // using force, we can xclaim the message without reading it
                expect(
                    await client.xclaimJustId(
                        key,
                        group,
                        "consumer",
                        0,
                        ["0-3"],
                        { isForce: true, retryCount: 99 },
                    ),
                ).toEqual(["0-3"]);

                // incorrect IDs - response is empty
                expect(
                    await client.xclaim(
                        Buffer.from(key),
                        Buffer.from(group),
                        Buffer.from("consumer"),
                        0,
                        ["000"],
                    ),
                ).toEqual({});
                expect(
                    await client.xclaimJustId(key, group, "consumer", 0, [
                        "000",
                    ]),
                ).toEqual([]);

                // empty ID array
                await expect(
                    client.xclaim(key, group, "consumer", 0, []),
                ).rejects.toThrow(RequestError);

                // key exists, but it is not a stream
                const stringKey = uuidv4();
                expect(await client.set(stringKey, "foo")).toEqual("OK");
                await expect(
                    client.xclaim(stringKey, "_", "_", 0, ["_"]),
                ).rejects.toThrow(RequestError);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `xautoclaim test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient, cluster) => {
                const key = uuidv4();
                const group = uuidv4();

                expect(
                    await client.xgroupCreate(key, group, "0", {
                        mkStream: true,
                    }),
                ).toEqual("OK");
                expect(
                    await client.xgroupCreateConsumer(key, group, "consumer"),
                ).toEqual(true);

                expect(
                    await client.xadd(
                        key,
                        [
                            ["entry1_field1", "entry1_value1"],
                            ["entry1_field2", "entry1_value2"],
                        ],
                        { id: "0-1" },
                    ),
                ).toEqual("0-1");
                expect(
                    await client.xadd(
                        key,
                        [["entry2_field1", "entry2_value1"]],
                        { id: "0-2" },
                    ),
                ).toEqual("0-2");

                expect(
                    convertGlideRecordToRecord(
                        (await client.xreadgroup(group, "consumer", {
                            [key]: ">",
                        }))!,
                    ),
                ).toEqual({
                    [key]: {
                        "0-1": [
                            ["entry1_field1", "entry1_value1"],
                            ["entry1_field2", "entry1_value2"],
                        ],
                        "0-2": [["entry2_field1", "entry2_value1"]],
                    },
                });

                // testing binary parameters
                let result = await client.xautoclaim(
                    Buffer.from(key),
                    Buffer.from(group),
                    Buffer.from("consumer"),
                    0,
                    "0-0",
                    { count: 1 },
                );
                let expected: typeof result = [
                    "0-2",
                    {
                        "0-1": [
                            ["entry1_field1", "entry1_value1"],
                            ["entry1_field2", "entry1_value2"],
                        ],
                    },
                ];
                if (!cluster.checkIfServerVersionLessThan("7.0.0"))
                    expected.push([]);
                expect(result).toEqual(expected);

                let result2 = await client.xautoclaimJustId(
                    key,
                    group,
                    "consumer",
                    0,
                    "0-0",
                );
                let expected2: typeof result2 = ["0-0", ["0-1", "0-2"]];
                if (!cluster.checkIfServerVersionLessThan("7.0.0"))
                    expected2.push([]);
                expect(result2).toEqual(expected2);

                // add one more entry
                expect(
                    await client.xadd(
                        key,
                        [["entry3_field1", "entry3_value1"]],
                        { id: "0-3" },
                    ),
                ).toEqual("0-3");

                // incorrect IDs - response is empty
                result = await client.xautoclaim(
                    key,
                    group,
                    "consumer",
                    0,
                    "5-0",
                );
                expected = ["0-0", {}];
                if (!cluster.checkIfServerVersionLessThan("7.0.0"))
                    expected.push([]);
                expect(result).toEqual(expected);

                result2 = await client.xautoclaimJustId(
                    key,
                    group,
                    "consumer",
                    0,
                    "5-0",
                );
                expected2 = ["0-0", []];
                if (!cluster.checkIfServerVersionLessThan("7.0.0"))
                    expected2.push([]);
                expect(result2).toEqual(expected2);

                // key exists, but it is not a stream
                const stringKey = uuidv4();
                expect(await client.set(stringKey, "foo")).toEqual("OK");
                await expect(
                    client.xautoclaim(stringKey, "_", "_", 0, "_"),
                ).rejects.toThrow(RequestError);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `xack test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = "{testKey}:1-" + uuidv4();
                const nonExistingKey = "{testKey}:2-" + uuidv4();
                const string_key = "{testKey}:3-" + uuidv4();
                const groupName = uuidv4();
                const consumerName = uuidv4();
                const stream_id0 = "0";
                const stream_id1_0 = "1-0";
                const stream_id1_1 = "1-1";
                const stream_id1_2 = "1-2";

                // setup: add 2 entries to the stream, create consumer group and read to mark them as pending
                expect(
                    await client.xadd(key, [["f0", "v0"]], {
                        id: stream_id1_0,
                    }),
                ).toEqual(stream_id1_0);
                expect(
                    await client.xadd(key, [["f1", "v1"]], {
                        id: stream_id1_1,
                    }),
                ).toEqual(stream_id1_1);
                expect(
                    await client.xgroupCreate(key, groupName, stream_id0),
                ).toBe("OK");
                expect(
                    convertGlideRecordToRecord(
                        (await client.xreadgroup(groupName, consumerName, {
                            [key]: ">",
                        }))!,
                    ),
                ).toEqual({
                    [key]: {
                        [stream_id1_0]: [["f0", "v0"]],
                        [stream_id1_1]: [["f1", "v1"]],
                    },
                });

                // add one more entry
                expect(
                    await client.xadd(key, [["f2", "v2"]], {
                        id: stream_id1_2,
                    }),
                ).toEqual(stream_id1_2);

                // acknowledge the first 2 entries
                expect(
                    await client.xack(key, groupName, [
                        stream_id1_0,
                        stream_id1_1,
                    ]),
                ).toBe(2);

                // attempt to acknowledge the first 2 entries again, returns 0 since they were already acknowledged
                expect(
                    await client.xack(key, groupName, [
                        stream_id1_0,
                        stream_id1_1,
                    ]),
                ).toBe(0);

                // testing binary parameters
                expect(
                    await client.xack(
                        Buffer.from(key),
                        Buffer.from(groupName),
                        [stream_id1_0, stream_id1_1],
                    ),
                ).toBe(0);

                // read the last unacknowledged entry
                expect(
                    convertGlideRecordToRecord(
                        (await client.xreadgroup(groupName, consumerName, {
                            [key]: ">",
                        }))!,
                    ),
                ).toEqual({ [key]: { [stream_id1_2]: [["f2", "v2"]] } });

                // deleting the consumer, returns 1 since the last entry still hasn't been acknowledged
                expect(
                    await client.xgroupDelConsumer(
                        key,
                        groupName,
                        consumerName,
                    ),
                ).toBe(1);

                // attempt to acknowledge a non-existing key, returns 0
                expect(
                    await client.xack(nonExistingKey, groupName, [
                        stream_id1_0,
                    ]),
                ).toBe(0);

                // attempt to acknowledge a non-existing group name, returns 0
                expect(
                    await client.xack(key, "nonExistingGroup", [stream_id1_0]),
                ).toBe(0);

                // attempt to acknowledge a non-existing ID, returns 0
                expect(await client.xack(key, groupName, ["99-99"])).toBe(0);

                // invalid argument - ID list must not be empty
                await expect(client.xack(key, groupName, [])).rejects.toThrow(
                    RequestError,
                );

                // invalid argument - invalid stream ID format
                await expect(
                    client.xack(key, groupName, ["invalid stream ID format"]),
                ).rejects.toThrow(RequestError);

                // key exists, but is not a stream
                expect(await client.set(string_key, "xack")).toBe("OK");
                await expect(
                    client.xack(string_key, groupName, [stream_id1_0]),
                ).rejects.toThrow(RequestError);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `lmpop test_%p`,
        async (protocol) => {
            await runTest(
                async (client: BaseClient, cluster: ValkeyCluster) => {
                    if (cluster.checkIfServerVersionLessThan("7.0.0")) {
                        return;
                    }

                    const key1 = "{key}" + uuidv4();
                    const key2 = "{key}" + uuidv4();
                    const nonListKey = uuidv4();
                    const singleKeyArray = [key1];
                    const multiKeyArray = [key2, key1];
                    const count = 1;
                    const lpushArgs = ["one", "two", "three", "four", "five"];
                    const expected = { key: key1, elements: ["five"] };
                    const expected2 = { key: key2, elements: ["one", "two"] };

                    // nothing to be popped
                    expect(
                        await client.lmpop(singleKeyArray, ListDirection.LEFT, {
                            count,
                        }),
                    ).toBeNull();

                    // pushing to the arrays to be popped
                    expect(await client.lpush(key1, lpushArgs)).toEqual(5);
                    expect(await client.lpush(key2, lpushArgs)).toEqual(5);

                    // checking correct result from popping
                    expect(
                        await client.lmpop(singleKeyArray, ListDirection.LEFT),
                    ).toEqual(expected);

                    // popping multiple elements from the right
                    expect(
                        await client.lmpop(multiKeyArray, ListDirection.RIGHT, {
                            count: 2,
                            decoder: Decoder.String,
                        }),
                    ).toEqual(expected2);

                    // Key exists, but is not a set
                    expect(await client.set(nonListKey, "lmpop")).toBe("OK");
                    await expect(
                        client.lmpop([nonListKey], ListDirection.RIGHT),
                    ).rejects.toThrow(RequestError);

                    // Test with single binary key array as input
                    const key3 = "{key}" + uuidv4();
                    const singleKeyArrayWithKey3 = [Buffer.from(key3)];

                    // pushing to the arrays to be popped
                    expect(await client.lpush(key3, lpushArgs)).toEqual(5);
                    const expectedWithKey3 = { key: key3, elements: ["five"] };

                    // checking correct result from popping
                    expect(
                        await client.lmpop(
                            singleKeyArrayWithKey3,
                            ListDirection.LEFT,
                        ),
                    ).toEqual(expectedWithKey3);

                    // test with multiple binary keys array as input
                    const key4 = "{key}" + uuidv4();
                    const multiKeyArrayWithKey3AndKey4 = [
                        Buffer.from(key4),
                        Buffer.from(key3),
                    ];

                    // pushing to the arrays to be popped
                    expect(await client.lpush(key4, lpushArgs)).toEqual(5);
                    const expectedWithKey4 = {
                        key: Buffer.from(key4),
                        elements: [Buffer.from("one"), Buffer.from("two")],
                    };

                    // checking correct result from popping
                    expect(
                        await client.lmpop(
                            multiKeyArrayWithKey3AndKey4,
                            ListDirection.RIGHT,
                            { count: 2, decoder: Decoder.Bytes },
                        ),
                    ).toEqual(expectedWithKey4);
                },
                protocol,
            );
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `blmpop test_%p`,
        async (protocol) => {
            await runTest(
                async (client: BaseClient, cluster: ValkeyCluster) => {
                    if (cluster.checkIfServerVersionLessThan("7.0.0")) {
                        return;
                    }

                    const key1 = "{key}" + uuidv4();
                    const key2 = "{key}" + uuidv4();
                    const nonListKey = uuidv4();
                    const singleKeyArray = [key1];
                    const multiKeyArray = [key2, key1];
                    const count = 1;
                    const lpushArgs = ["one", "two", "three", "four", "five"];
                    const expected = { key: key1, elements: ["five"] };
                    const expected2 = { key: key2, elements: ["one", "two"] };

                    // nothing to be popped
                    expect(
                        await client.blmpop(
                            singleKeyArray,
                            ListDirection.LEFT,
                            0.1,
                            { count },
                        ),
                    ).toBeNull();

                    // pushing to the arrays to be popped
                    expect(await client.lpush(key1, lpushArgs)).toEqual(5);
                    expect(await client.lpush(key2, lpushArgs)).toEqual(5);

                    // checking correct result from popping
                    expect(
                        await client.blmpop(
                            singleKeyArray,
                            ListDirection.LEFT,
                            0.1,
                        ),
                    ).toEqual(expected);

                    // popping multiple elements from the right
                    expect(
                        await client.blmpop(
                            multiKeyArray,
                            ListDirection.RIGHT,
                            0.1,
                            { count: 2, decoder: Decoder.String },
                        ),
                    ).toEqual(expected2);

                    // Key exists, but is not a set
                    expect(await client.set(nonListKey, "blmpop")).toBe("OK");
                    await expect(
                        client.blmpop([nonListKey], ListDirection.RIGHT, 0.1, {
                            count: 1,
                        }),
                    ).rejects.toThrow(RequestError);

                    // Test with single binary key array as input
                    const key3 = "{key}" + uuidv4();
                    const singleKeyArrayWithKey3 = [Buffer.from(key3)];

                    // pushing to the arrays to be popped
                    expect(await client.lpush(key3, lpushArgs)).toEqual(5);
                    const expectedWithKey3 = { key: key3, elements: ["five"] };

                    // checking correct result from popping
                    expect(
                        await client.blmpop(
                            singleKeyArrayWithKey3,
                            ListDirection.LEFT,
                            0.1,
                        ),
                    ).toEqual(expectedWithKey3);

                    // test with multiple binary keys array as input
                    const key4 = "{key}" + uuidv4();
                    const multiKeyArrayWithKey3AndKey4 = [
                        Buffer.from(key4),
                        Buffer.from(key3),
                    ];

                    // pushing to the arrays to be popped
                    expect(await client.lpush(key4, lpushArgs)).toEqual(5);
                    const expectedWithKey4 = {
                        key: Buffer.from(key4),
                        elements: [Buffer.from("one"), Buffer.from("two")],
                    };

                    // checking correct result from popping
                    expect(
                        await client.blmpop(
                            multiKeyArrayWithKey3AndKey4,
                            ListDirection.RIGHT,
                            0.1,
                            { count: 2, decoder: Decoder.Bytes },
                        ),
                    ).toEqual(expectedWithKey4);
                },
                protocol,
            );
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `xgroupCreateConsumer and xgroupDelConsumer test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient) => {
                const key = uuidv4();
                const nonExistentKey = uuidv4();
                const stringKey = uuidv4();
                const groupName = uuidv4();
                const consumer = uuidv4();
                const streamId0 = "0";

                // create group and consumer for the group
                expect(
                    await client.xgroupCreate(key, groupName, streamId0, {
                        mkStream: true,
                    }),
                ).toEqual("OK");
                expect(
                    await client.xgroupCreateConsumer(key, groupName, consumer),
                ).toEqual(true);

                // attempting to create/delete a consumer for a group that does not exist results in a NOGROUP request error
                await expect(
                    client.xgroupCreateConsumer(
                        key,
                        "nonExistentGroup",
                        consumer,
                    ),
                ).rejects.toThrow(RequestError);
                await expect(
                    client.xgroupDelConsumer(key, "nonExistentGroup", consumer),
                ).rejects.toThrow(RequestError);

                // attempt to create consumer for group again
                expect(
                    await client.xgroupCreateConsumer(key, groupName, consumer),
                ).toEqual(false);

                // attempting to delete a consumer that has not been created yet returns 0
                expect(
                    await client.xgroupDelConsumer(
                        key,
                        groupName,
                        "nonExistentConsumer",
                    ),
                ).toEqual(0);

                // Add two stream entries
                const streamid1: GlideString | null = await client.xadd(key, [
                    ["field1", "value1"],
                ]);
                expect(streamid1).not.toBeNull();

                // testing binary parameters
                const streamid2 = await client.xadd(Buffer.from(key), [
                    [Buffer.from("field2"), Buffer.from("value2")],
                ]);
                expect(streamid2).not.toBeNull();

                // read the entire stream for the consumer and mark messages as pending
                expect(
                    convertGlideRecordToRecord(
                        (await client.xreadgroup(groupName, consumer, {
                            [key]: ">",
                        }))!,
                    ),
                ).toEqual({
                    [key]: {
                        [streamid1 as string]: [["field1", "value1"]],
                        [streamid2 as string]: [["field2", "value2"]],
                    },
                });

                // delete one of the streams & testing binary parameters
                expect(
                    await client.xgroupDelConsumer(
                        Buffer.from(key),
                        Buffer.from(groupName),
                        Buffer.from(consumer),
                    ),
                ).toEqual(2);

                // attempting to call XGROUP CREATECONSUMER or XGROUP DELCONSUMER with a non-existing key should raise an error
                await expect(
                    client.xgroupCreateConsumer(
                        nonExistentKey,
                        groupName,
                        consumer,
                    ),
                ).rejects.toThrow(RequestError);
                await expect(
                    client.xgroupDelConsumer(
                        nonExistentKey,
                        groupName,
                        consumer,
                    ),
                ).rejects.toThrow(RequestError);

                // key exists, but it is not a stream
                expect(await client.set(stringKey, "foo")).toEqual("OK");
                await expect(
                    client.xgroupCreateConsumer(stringKey, groupName, consumer),
                ).rejects.toThrow(RequestError);
                await expect(
                    client.xgroupDelConsumer(stringKey, groupName, consumer),
                ).rejects.toThrow(RequestError);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `xgroupCreate and xgroupDestroy test_%p`,
        async (protocol) => {
            await runTest(async (client: BaseClient, cluster) => {
                const key = uuidv4();
                const nonExistentKey = uuidv4();
                const stringKey = uuidv4();
                const groupName1 = uuidv4();
                const groupName2 = uuidv4();
                const streamId = "0-1";

                // trying to create a consumer group for a non-existing stream without the "MKSTREAM" arg results in error
                await expect(
                    client.xgroupCreate(nonExistentKey, groupName1, streamId),
                ).rejects.toThrow(RequestError);

                // calling with the "MKSTREAM" arg should create the new stream automatically
                expect(
                    await client.xgroupCreate(key, groupName1, streamId, {
                        mkStream: true,
                    }),
                ).toEqual("OK");

                // invalid arg - group names must be unique, but group_name1 already exists
                await expect(
                    client.xgroupCreate(key, groupName1, streamId),
                ).rejects.toThrow(RequestError);

                // Invalid stream ID format
                await expect(
                    client.xgroupCreate(
                        key,
                        groupName2,
                        "invalid_stream_id_format",
                    ),
                ).rejects.toThrow(RequestError);

                expect(await client.xgroupDestroy(key, groupName1)).toEqual(
                    true,
                );
                // calling xgroup_destroy again returns False because the group was already destroyed above
                expect(await client.xgroupDestroy(key, groupName1)).toEqual(
                    false,
                );
                // calling again with binary parameters, expecting the same result
                expect(
                    await client.xgroupDestroy(
                        Buffer.from(key),
                        Buffer.from(groupName1),
                    ),
                ).toEqual(false);

                // attempting to destroy a group for a non-existing key should raise an error
                await expect(
                    client.xgroupDestroy(nonExistentKey, groupName1),
                ).rejects.toThrow(RequestError);

                // "ENTRIESREAD" option was added in Valkey 7.0.0
                if (cluster.checkIfServerVersionLessThan("7.0.0")) {
                    await expect(
                        client.xgroupCreate(key, groupName1, streamId, {
                            entriesRead: "10",
                        }),
                    ).rejects.toThrow(RequestError);
                } else {
                    expect(
                        await client.xgroupCreate(key, groupName1, streamId, {
                            entriesRead: "10",
                        }),
                    ).toEqual("OK");

                    // invalid entries_read_id - cannot be the zero ("0-0") ID
                    await expect(
                        client.xgroupCreate(key, groupName1, streamId, {
                            entriesRead: "0-0",
                        }),
                    ).rejects.toThrow(RequestError);
                }

                // key exists, but it is not a stream
                expect(await client.set(stringKey, "foo")).toEqual("OK");
                await expect(
                    client.xgroupCreate(stringKey, groupName1, streamId, {
                        mkStream: true,
                    }),
                ).rejects.toThrow(RequestError);
                await expect(
                    client.xgroupDestroy(stringKey, groupName1),
                ).rejects.toThrow(RequestError);
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        "check that blocking commands never time out %p",
        async (protocol) => {
            await runTest(async (client: BaseClient, cluster) => {
                const key1 = "{blocking}-1-" + uuidv4();
                const key2 = "{blocking}-2-" + uuidv4();
                const key3 = "{blocking}-3-" + uuidv4(); // stream
                const keyz = [key1, key2];

                // create a group and a stream, so `xreadgroup` won't fail on missing group
                await client.xgroupCreate(key3, "group", "0", {
                    mkStream: true,
                });

                const promiseList: [string, Promise<GlideReturnType>][] = [
                    ["bzpopmax", client.bzpopmax(keyz, 0)],
                    ["bzpopmin", client.bzpopmin(keyz, 0)],
                    ["blpop", client.blpop(keyz, 0)],
                    ["brpop", client.brpop(keyz, 0)],
                    ["xread", client.xread({ [key3]: "0-0" }, { block: 0 })],
                    [
                        "xreadgroup",
                        client.xreadgroup(
                            "group",
                            "consumer",
                            { [key3]: "0-0" },
                            { block: 0 },
                        ),
                    ],
                    ["wait", client.wait(42, 0)],
                ];

                if (!cluster.checkIfServerVersionLessThan("6.2.0")) {
                    promiseList.push([
                        "blmove",
                        client.blmove(
                            key1,
                            key2,
                            ListDirection.LEFT,
                            ListDirection.LEFT,
                            0,
                        ),
                    ]);
                }

                if (!cluster.checkIfServerVersionLessThan("7.0.0")) {
                    promiseList.push(
                        ["blmpop", client.blmpop(keyz, ListDirection.LEFT, 0)],
                        ["bzmpop", client.bzmpop(keyz, ScoreFilter.MAX, 0)],
                    );
                }

                try {
                    for (const [name, promise] of promiseList) {
                        const timeoutPromise = new Promise((resolve) => {
                            setTimeout(resolve, 500, "timeOutPromiseWins");
                        });
                        // client has default request timeout 250 ms, we run all commands with infinite blocking
                        // we expect that all commands will still await for the response even after 500 ms
                        expect(
                            await Promise.race([
                                promise.finally(() =>
                                    fail(`${name} didn't block infintely`),
                                ),
                                timeoutPromise,
                            ]),
                        ).toEqual("timeOutPromiseWins");
                    }
                } finally {
                    client.close();
                }
            }, protocol);
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `getex test_%p`,
        async (protocol) => {
            await runTest(
                async (client: BaseClient, cluster: ValkeyCluster) => {
                    if (cluster.checkIfServerVersionLessThan("6.2.0")) {
                        return;
                    }

                    const key1 = "{key}" + uuidv4();
                    const key2 = "{key}" + uuidv4();
                    const value = uuidv4();

                    expect(await client.set(key1, value)).toBe("OK");
                    expect(await client.getex(key1)).toEqual(value);
                    expect(await client.ttl(key1)).toBe(-1);

                    expect(
                        await client.getex(key1, {
                            expiry: {
                                type: TimeUnit.Seconds,
                                duration: 15,
                            },
                        }),
                    ).toEqual(value);
                    // test the binary option
                    expect(
                        await client.getex(Buffer.from(key1), {
                            expiry: {
                                type: TimeUnit.Seconds,
                                duration: 1,
                            },
                        }),
                    ).toEqual(value);
                    expect(await client.ttl(key1)).toBeGreaterThan(0);
                    expect(
                        await client.getex(key1, { expiry: "persist" }),
                    ).toEqual(value);
                    expect(await client.ttl(key1)).toBe(-1);

                    // non existent key
                    expect(await client.getex(key2)).toBeNull();

                    // invalid time measurement
                    await expect(
                        client.getex(key1, {
                            expiry: {
                                type: TimeUnit.Seconds,
                                duration: -10,
                            },
                        }),
                    ).rejects.toThrow(RequestError);

                    // Key exists, but is not a string
                    expect(await client.sadd(key2, ["a"])).toBe(1);
                    await expect(client.getex(key2)).rejects.toThrow(
                        RequestError,
                    );
                },
                protocol,
            );
        },
        config.timeout,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        "sort sortstore sort_store sortro sort_ro sortreadonly test_%p",
        async (protocol) => {
            await runTest(
                async (client: BaseClient, cluster: ValkeyCluster) => {
                    if (
                        cluster.checkIfServerVersionLessThan("8.0.0") &&
                        client instanceof GlideClusterClient
                    ) {
                        return;
                    }

                    const setPrefix = "{slot}setKey" + uuidv4();
                    const hashPrefix = "{slot}hashKey" + uuidv4();
                    const list = "{slot}" + uuidv4();
                    const store = "{slot}" + uuidv4();
                    const names = ["Alice", "Bob", "Charlie", "Dave", "Eve"];
                    const ages = ["30", "25", "35", "20", "40"];

                    for (let i = 0; i < ages.length; i++) {
                        const fieldValueList: HashDataType = [
                            { field: "name", value: names[i] },
                            { field: "age", value: ages[i] },
                        ];
                        expect(
                            await client.hset(
                                setPrefix + (i + 1),
                                fieldValueList,
                            ),
                        ).toEqual(2);
                    }

                    expect(
                        await client.rpush(list, ["3", "1", "5", "4", "2"]),
                    ).toEqual(5);

                    expect(
                        await client.sort(list, {
                            limit: { offset: 0, count: 2 },
                            getPatterns: [setPrefix + "*->name"],
                        }),
                    ).toEqual(["Alice", "Bob"]);

                    expect(
                        await client.sort(Buffer.from(list), {
                            limit: { offset: 0, count: 2 },
                            getPatterns: [setPrefix + "*->name"],
                            orderBy: SortOrder.DESC,
                        }),
                    ).toEqual(["Eve", "Dave"]);

                    expect(
                        await client.sort(list, {
                            limit: { offset: 0, count: 2 },
                            byPattern: setPrefix + "*->age",
                            getPatterns: [
                                setPrefix + "*->name",
                                setPrefix + "*->age",
                            ],
                            orderBy: SortOrder.DESC,
                        }),
                    ).toEqual(["Eve", "40", "Charlie", "35"]);

                    // test binary decoder
                    expect(
                        await client.sort(list, {
                            limit: { offset: 0, count: 2 },
                            byPattern: setPrefix + "*->age",
                            getPatterns: [
                                setPrefix + "*->name",
                                setPrefix + "*->age",
                            ],
                            orderBy: SortOrder.DESC,
                            decoder: Decoder.Bytes,
                        }),
                    ).toEqual([
                        Buffer.from("Eve"),
                        Buffer.from("40"),
                        Buffer.from("Charlie"),
                        Buffer.from("35"),
                    ]);

                    // Non-existent key in the BY pattern will result in skipping the sorting operation
                    expect(
                        await client.sort(list, { byPattern: "noSort" }),
                    ).toEqual(["3", "1", "5", "4", "2"]);

                    // Non-existent key in the GET pattern results in nulls
                    expect(
                        await client.sort(list, {
                            isAlpha: true,
                            getPatterns: ["{slot}missing"],
                        }),
                    ).toEqual([null, null, null, null, null]);

                    // Missing key in the set
                    expect(await client.lpush(list, ["42"])).toEqual(6);
                    expect(
                        await client.sort(list, {
                            byPattern: setPrefix + "*->age",
                            getPatterns: [setPrefix + "*->name"],
                        }),
                    ).toEqual([null, "Dave", "Bob", "Alice", "Charlie", "Eve"]);
                    expect(await client.lpop(list)).toEqual("42");

                    // sort RO
                    if (!cluster.checkIfServerVersionLessThan("7.0.0")) {
                        expect(
                            await client.sortReadOnly(list, {
                                limit: { offset: 0, count: 2 },
                                getPatterns: [setPrefix + "*->name"],
                            }),
                        ).toEqual(["Alice", "Bob"]);

                        expect(
                            await client.sortReadOnly(list, {
                                limit: { offset: 0, count: 2 },
                                getPatterns: [setPrefix + "*->name"],
                                orderBy: SortOrder.DESC,
                                decoder: Decoder.Bytes,
                            }),
                        ).toEqual([Buffer.from("Eve"), Buffer.from("Dave")]);

                        expect(
                            await client.sortReadOnly(Buffer.from(list), {
                                limit: { offset: 0, count: 2 },
                                byPattern: setPrefix + "*->age",
                                getPatterns: [
                                    setPrefix + "*->name",
                                    setPrefix + "*->age",
                                ],
                                orderBy: SortOrder.DESC,
                            }),
                        ).toEqual(["Eve", "40", "Charlie", "35"]);

                        // Non-existent key in the BY pattern will result in skipping the sorting operation
                        expect(
                            await client.sortReadOnly(list, {
                                byPattern: "noSort",
                            }),
                        ).toEqual(["3", "1", "5", "4", "2"]);

                        // Non-existent key in the GET pattern results in nulls
                        expect(
                            await client.sortReadOnly(list, {
                                isAlpha: true,
                                getPatterns: ["{slot}missing"],
                            }),
                        ).toEqual([null, null, null, null, null]);

                        // Missing key in the set
                        expect(await client.lpush(list, ["42"])).toEqual(6);
                        expect(
                            await client.sortReadOnly(list, {
                                byPattern: setPrefix + "*->age",
                                getPatterns: [setPrefix + "*->name"],
                            }),
                        ).toEqual([
                            null,
                            "Dave",
                            "Bob",
                            "Alice",
                            "Charlie",
                            "Eve",
                        ]);
                        expect(await client.lpop(list)).toEqual("42");
                    }

                    // SORT with STORE
                    expect(
                        await client.sortStore(list, store, {
                            limit: { offset: 0, count: -1 },
                            byPattern: setPrefix + "*->age",
                            getPatterns: [setPrefix + "*->name"],
                            orderBy: SortOrder.ASC,
                        }),
                    ).toEqual(5);
                    expect(await client.lrange(store, 0, -1)).toEqual([
                        "Dave",
                        "Bob",
                        "Alice",
                        "Charlie",
                        "Eve",
                    ]);
                    expect(
                        await client.sortStore(Buffer.from(list), store, {
                            byPattern: setPrefix + "*->age",
                            getPatterns: [setPrefix + "*->name"],
                        }),
                    ).toEqual(5);
                    expect(await client.lrange(store, 0, -1)).toEqual([
                        "Dave",
                        "Bob",
                        "Alice",
                        "Charlie",
                        "Eve",
                    ]);

                    // transaction test
                    const transaction =
                        client instanceof GlideClient
                            ? new Transaction()
                            : new ClusterTransaction();
                    transaction
                        .hset(hashPrefix + 1, [
                            { field: "name", value: "Alice" },
                            { field: "age", value: "30" },
                        ])
                        .hset(hashPrefix + 2, {
                            name: "Bob",
                            age: "25",
                        })
                        .del([list])
                        .lpush(list, ["2", "1"])
                        .sort(list, {
                            byPattern: hashPrefix + "*->age",
                            getPatterns: [hashPrefix + "*->name"],
                        })
                        .sort(list, {
                            byPattern: hashPrefix + "*->age",
                            getPatterns: [hashPrefix + "*->name"],
                            orderBy: SortOrder.DESC,
                        })
                        .sortStore(list, store, {
                            byPattern: hashPrefix + "*->age",
                            getPatterns: [hashPrefix + "*->name"],
                        })
                        .lrange(store, 0, -1)
                        .sortStore(list, store, {
                            byPattern: hashPrefix + "*->age",
                            getPatterns: [hashPrefix + "*->name"],
                            orderBy: SortOrder.DESC,
                        })
                        .lrange(store, 0, -1);

                    if (!cluster.checkIfServerVersionLessThan("7.0.0")) {
                        transaction
                            .sortReadOnly(list, {
                                byPattern: hashPrefix + "*->age",
                                getPatterns: [hashPrefix + "*->name"],
                            })
                            .sortReadOnly(list, {
                                byPattern: hashPrefix + "*->age",
                                getPatterns: [hashPrefix + "*->name"],
                                orderBy: SortOrder.DESC,
                            });
                    }

                    const expectedResult = [
                        2,
                        2,
                        1,
                        2,
                        ["Bob", "Alice"],
                        ["Alice", "Bob"],
                        2,
                        ["Bob", "Alice"],
                        2,
                        ["Alice", "Bob"],
                    ];

                    if (!cluster.checkIfServerVersionLessThan("7.0.0")) {
                        expectedResult.push(["Bob", "Alice"], ["Alice", "Bob"]);
                    }

                    const result =
                        client instanceof GlideClient
                            ? await client.exec(transaction as Transaction)
                            : await client.exec(
                                  transaction as ClusterTransaction,
                              );
                    expect(result).toEqual(expectedResult);

                    client.close();
                },
                protocol,
            );
        },
        config.timeout,
    );
}

export function runCommonTests(config: {
    init: () => Promise<{ client: Client }>;
    close: (testSucceeded: boolean) => void;
    timeout?: number;
}) {
    const runTest = async (test: (client: Client) => Promise<void>) => {
        const { client } = await config.init();
        let testSucceeded = false;

        try {
            await test(client);
            testSucceeded = true;
        } finally {
            config.close(testSucceeded);
        }
    };

    it(
        "set and get flow works",
        async () => {
            await runTest((client: Client) => GetAndSetRandomValue(client));
        },
        config.timeout,
    );

    it(
        "can set and get non-ASCII unicode without modification",
        async () => {
            await runTest(async (client: Client) => {
                const key = uuidv4();
                const value = "שלום hello 汉字";
                await client.set(key, value);
                const result = await client.get(key);
                expect(result).toEqual(value);
            });
        },
        config.timeout,
    );

    it(
        "get for missing key returns null",
        async () => {
            await runTest(async (client: Client) => {
                const result = await client.get(uuidv4());

                expect(result).toEqual(null);
            });
        },
        config.timeout,
    );

    it(
        "get for empty string",
        async () => {
            await runTest(async (client: Client) => {
                const key = uuidv4();
                await client.set(key, "");
                const result = await client.get(key);

                expect(result).toEqual("");
            });
        },
        config.timeout,
    );

    it(
        "send very large values",
        async () => {
            await runTest(async (client: Client) => {
                const WANTED_LENGTH = Math.pow(2, 16);

                const getLongUUID = () => {
                    let id = uuidv4();

                    while (id.length < WANTED_LENGTH) {
                        id += uuidv4();
                    }

                    return id;
                };

                const key = getLongUUID();
                const value = getLongUUID();
                await client.set(key, value);
                const result = await client.get(key);

                expect(result).toEqual(value);
            });
        },
        config.timeout,
    );

    it(
        "can handle concurrent operations without dropping or changing values",
        async () => {
            await runTest(async (client: Client) => {
                const singleOp = async (index: number) => {
                    if (index % 2 === 0) {
                        await GetAndSetRandomValue(client);
                    } else {
                        const result = await client.get(uuidv4());
                        expect(result).toEqual(null);
                    }
                };

                const operations: Promise<void>[] = [];

                for (let i = 0; i < 100; ++i) {
                    operations.push(singleOp(i));
                }

                await Promise.all(operations);
            });
        },
        config.timeout,
    );
}
