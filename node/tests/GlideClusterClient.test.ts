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
import { gte } from "semver";
import { v4 as uuidv4 } from "uuid";
import {
    BitwiseOperation,
    ClusterTransaction,
    Decoder,
    FlushMode,
    FunctionListResponse,
    FunctionRestorePolicy,
    FunctionStatsSingleResponse,
    GeoUnit,
    GlideClusterClient,
    GlideReturnType,
    GlideString,
    InfoOptions,
    ListDirection,
    ProtocolVersion,
    RequestError,
    Routes,
    ScoreFilter,
    Script,
    SlotKeyTypes,
    SortOrder,
    convertGlideRecordToRecord,
    convertRecordToGlideRecord,
} from "..";
import { ValkeyCluster } from "../../utils/TestUtils";
import { runBaseTests } from "./SharedTests";
import {
    checkClusterResponse,
    checkFunctionListResponse,
    checkFunctionStatsResponse,
    createLongRunningLuaScript,
    createLuaLibWithLongRunningFunction,
    flushAndCloseClient,
    generateLuaLibCode,
    getClientConfigurationOption,
    getFirstResult,
    getServerVersion,
    intoArray,
    intoString,
    parseEndpoints,
    transactionTest,
    validateTransactionResponse,
    waitForNotBusy,
} from "./TestUtilities";

const TIMEOUT = 50000;

describe("GlideClusterClient", () => {
    let testsFailed = 0;
    let cluster: ValkeyCluster;
    let azCluster: ValkeyCluster;
    let client: GlideClusterClient;
    let azClient: GlideClusterClient;
    beforeAll(async () => {
        const clusterAddresses = global.CLUSTER_ENDPOINTS;

        if (clusterAddresses) {
            // Initialize current cluster from existing addresses
            cluster = await ValkeyCluster.initFromExistingCluster(
                true,
                parseEndpoints(clusterAddresses),
                getServerVersion,
            );

            // Initialize cluster from existing addresses for AzAffinity test
            azCluster = await ValkeyCluster.initFromExistingCluster(
                true,
                parseEndpoints(clusterAddresses),
                getServerVersion,
            );
        } else {
            cluster = await ValkeyCluster.createCluster(
                true,
                3,
                1,
                getServerVersion,
            );

            azCluster = await ValkeyCluster.createCluster(
                true,
                3,
                4,
                getServerVersion,
            );
        }
    }, 120000);

    afterEach(async () => {
        await flushAndCloseClient(true, cluster.getAddresses(), client);
        await flushAndCloseClient(true, azCluster.getAddresses(), azClient);
    });

    afterAll(async () => {
        if (testsFailed === 0) {
            if (cluster) await cluster.close();
            if (azCluster) await azCluster.close();
        } else {
            if (cluster) await cluster.close(true);
            if (azCluster) await azCluster.close(true);
        }
    });

    runBaseTests({
        init: async (protocol, configOverrides) => {
            const configCurrent = getClientConfigurationOption(
                cluster.getAddresses(),
                protocol,
                configOverrides,
            );
            client = await GlideClusterClient.createClient(configCurrent);

            const configNew = getClientConfigurationOption(
                azCluster.getAddresses(),
                protocol,
                configOverrides,
            );
            azClient = await GlideClusterClient.createClient(configNew);

            testsFailed += 1;
            return {
                client,
                azClient,
                cluster,
                azCluster,
            };
        },
        close: (testSucceeded: boolean) => {
            if (testSucceeded) {
                testsFailed -= 1;
            }
        },
        timeout: TIMEOUT,
    });

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `info with server and replication_%p`,
        async (protocol) => {
            client = await GlideClusterClient.createClient(
                getClientConfigurationOption(cluster.getAddresses(), protocol),
            );
            const info_server = getFirstResult(
                await client.info({ sections: [InfoOptions.Server] }),
            );
            expect(info_server).toEqual(expect.stringContaining("# Server"));

            const infoReplicationValues = Object.values(
                await client.info({ sections: [InfoOptions.Replication] }),
            );

            const replicationInfo = intoArray(infoReplicationValues);

            for (const item of replicationInfo) {
                expect(item).toContain("role:master");
                expect(item).toContain("# Replication");
            }
        },
        TIMEOUT,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `info with server and randomNode route_%p`,
        async (protocol) => {
            client = await GlideClusterClient.createClient(
                getClientConfigurationOption(cluster.getAddresses(), protocol),
            );
            const result = await client.info({
                sections: [InfoOptions.Server],
                route: "randomNode",
            });
            expect(result).toEqual(expect.stringContaining("# Server"));
            expect(result).toEqual(expect.not.stringContaining("# Errorstats"));
        },
        TIMEOUT,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `route by address reaches correct node_%p`,
        async (protocol) => {
            // returns the line that contains the word "myself", up to that point. This is done because the values after it might change with time.
            const cleanResult = (value: string) => {
                return (
                    value
                        .split("\n")
                        .find((line: string) => line.includes("myself"))
                        ?.split("myself")[0] ?? ""
                );
            };

            client = await GlideClusterClient.createClient(
                getClientConfigurationOption(cluster.getAddresses(), protocol),
            );
            const result = cleanResult(
                intoString(
                    await client.customCommand(["cluster", "nodes"], {
                        route: "randomNode",
                    }),
                ),
            );

            // check that routing without explicit port works
            const host = result.split(" ")[1].split("@")[0] ?? "";

            if (!host) {
                throw new Error("No host could be parsed");
            }

            const secondResult = cleanResult(
                intoString(
                    await client.customCommand(["cluster", "nodes"], {
                        route: {
                            type: "routeByAddress",
                            host,
                        },
                    }),
                ),
            );

            expect(result).toEqual(secondResult);

            const [host2, port] = host.split(":");

            // check that routing with explicit port works
            const thirdResult = cleanResult(
                intoString(
                    await client.customCommand(["cluster", "nodes"], {
                        route: {
                            type: "routeByAddress",
                            host: host2,
                            port: Number(port),
                        },
                    }),
                ),
            );

            expect(result).toEqual(thirdResult);
        },
        TIMEOUT,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `fail routing by address if no port is provided_%p`,
        async (protocol) => {
            client = await GlideClusterClient.createClient(
                getClientConfigurationOption(cluster.getAddresses(), protocol),
            );
            await expect(
                client.info({
                    route: {
                        type: "routeByAddress",
                        host: "foo",
                    },
                }),
            ).rejects.toThrowError(RequestError);
        },
        TIMEOUT,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `dump and restore custom command_%p`,
        async (protocol) => {
            client = await GlideClusterClient.createClient(
                getClientConfigurationOption(cluster.getAddresses(), protocol),
            );

            const key = uuidv4();
            const value = "value";
            const valueEncoded = Buffer.from(value);
            expect(await client.set(key, value)).toEqual("OK");
            // Since DUMP gets binary results, we cannot use the default decoder (string) here, so we expected to get an error.
            await expect(client.customCommand(["DUMP", key])).rejects.toThrow(
                /invalid utf-8 sequence|incomplete utf-8 byte sequence/,
            );

            const dumpResult = await client.customCommand(["DUMP", key], {
                decoder: Decoder.Bytes,
            });

            expect(await client.del([key])).toEqual(1);

            if (dumpResult instanceof Buffer) {
                // check the delete
                expect(await client.get(key)).toEqual(null);
                expect(
                    await client.customCommand(
                        ["RESTORE", key, "0", dumpResult],
                        { decoder: Decoder.Bytes },
                    ),
                ).toEqual("OK");
                // check the restore
                expect(await client.get(key)).toEqual(value);
                expect(
                    await client.get(key, { decoder: Decoder.Bytes }),
                ).toEqual(valueEncoded);
            }
        },
        TIMEOUT,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `config get and config set transactions test_%p`,
        async (protocol) => {
            client = await GlideClusterClient.createClient(
                getClientConfigurationOption(cluster.getAddresses(), protocol),
            );
            const transaction = new ClusterTransaction()
                .configSet({ timeout: "1000" })
                .configGet(["timeout"]);
            const result = await client.exec(transaction);
            expect(result).toEqual([
                "OK",
                convertRecordToGlideRecord({ timeout: "1000" }),
            ]);

            if (!cluster.checkIfServerVersionLessThan("7.0.0")) {
                const transaction = new ClusterTransaction()
                    .configSet({
                        timeout: "2000",
                        "cluster-node-timeout": "16000",
                    })
                    .configGet(["timeout", "cluster-node-timeout"]);
                const result = await client.exec(transaction);
                const convertedResult = [
                    result[0],
                    convertGlideRecordToRecord(result[1]),
                ];
                expect(convertedResult).toEqual([
                    "OK",
                    {
                        timeout: "2000",
                        "cluster-node-timeout": "16000",
                    },
                ]);
            }
        },
        TIMEOUT,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `config get with wildcard and multi node route %p`,
        async (protocol) => {
            client = await GlideClusterClient.createClient(
                getClientConfigurationOption(cluster.getAddresses(), protocol),
            );
            const result = await client.configGet(["*file"], {
                route: "allPrimaries",
            });
            Object.values(
                result as Record<string, Record<string, GlideString>>,
            ).forEach((resp) => {
                const keys = Object.keys(resp);
                expect(keys.length).toBeGreaterThan(5);
                expect(keys).toContain("pidfile");
                expect(keys).toContain("logfile");
            });
        },
        TIMEOUT,
    );

    describe.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        "Protocol is RESP2 = %s",
        (protocol) => {
            describe.each([Decoder.String, Decoder.Bytes])(
                "Decoder String = %s",
                (decoder) => {
                    it(
                        "can send transactions",
                        async () => {
                            client = await GlideClusterClient.createClient(
                                getClientConfigurationOption(
                                    cluster.getAddresses(),
                                    protocol,
                                ),
                            );

                            const transaction = new ClusterTransaction();

                            const expectedRes = await transactionTest(
                                transaction,
                                cluster,
                                decoder,
                            );

                            if (
                                !cluster.checkIfServerVersionLessThan("7.0.0")
                            ) {
                                transaction.publish("message", "key", true);
                                expectedRes.push([
                                    'publish("message", "key", true)',
                                    0,
                                ]);

                                transaction.pubsubShardChannels();
                                expectedRes.push(["pubsubShardChannels()", []]);
                                transaction.pubsubShardNumSub([]);
                                expectedRes.push(["pubsubShardNumSub()", []]);
                            }

                            const result = await client.exec(transaction, {
                                decoder: Decoder.String,
                            });
                            validateTransactionResponse(result, expectedRes);
                        },
                        TIMEOUT,
                    );
                },
            );
        },
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `can return null on WATCH transaction failures_%p`,
        async (protocol) => {
            const client1 = await GlideClusterClient.createClient(
                getClientConfigurationOption(cluster.getAddresses(), protocol),
            );
            const client2 = await GlideClusterClient.createClient(
                getClientConfigurationOption(cluster.getAddresses(), protocol),
            );
            const transaction = new ClusterTransaction();
            transaction.get("key");
            const result1 = await client1.watch(["key"]);
            expect(result1).toEqual("OK");

            const result2 = await client2.set("key", "foo");
            expect(result2).toEqual("OK");

            const result3 = await client1.exec(transaction);
            expect(result3).toBeNull();

            client1.close();
            client2.close();
        },
        TIMEOUT,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `echo with all nodes routing_%p`,
        async (protocol) => {
            client = await GlideClusterClient.createClient(
                getClientConfigurationOption(cluster.getAddresses(), protocol),
            );
            const message = uuidv4();
            const echoDict = await client.echo(message, { route: "allNodes" });

            expect(typeof echoDict).toBe("object");
            expect(intoArray(echoDict)).toEqual(
                expect.arrayContaining(intoArray([message])),
            );
        },
        TIMEOUT,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `check that multi key command returns a cross slot error`,
        async (protocol) => {
            const client = await GlideClusterClient.createClient(
                getClientConfigurationOption(cluster.getAddresses(), protocol),
            );

            const promises: Promise<unknown>[] = [
                client.blpop(["abc", "zxy", "lkn"], 0.1),
                client.rename("abc", "zxy"),
                client.msetnx({ abc: "xyz", def: "abc", hij: "def" }),
                client.brpop(["abc", "zxy", "lkn"], 0.1),
                client.bitop(BitwiseOperation.AND, "abc", ["zxy", "lkn"]),
                client.smove("abc", "zxy", "value"),
                client.renamenx("abc", "zxy"),
                client.sinter(["abc", "zxy", "lkn"]),
                client.sinterstore("abc", ["zxy", "lkn"]),
                client.zinterstore("abc", ["zxy", "lkn"]),
                client.zunionstore("abc", ["zxy", "lkn"]),
                client.sunionstore("abc", ["zxy", "lkn"]),
                client.sunion(["abc", "zxy", "lkn"]),
                client.pfcount(["abc", "zxy", "lkn"]),
                client.pfmerge("abc", ["def", "ghi"]),
                client.sdiff(["abc", "zxy", "lkn"]),
                client.sdiffstore("abc", ["zxy", "lkn"]),
                client.sortStore("abc", "zyx"),
                client.sortStore("abc", "zyx", { isAlpha: true }),
                client.bzpopmax(["abc", "def"], 0.5),
                client.bzpopmin(["abc", "def"], 0.5),
                client.xread({ abc: "0-0", zxy: "0-0", lkn: "0-0" }),
                client.xreadgroup("_", "_", { abc: ">", zxy: ">", lkn: ">" }),
            ];

            if (gte(cluster.getVersion(), "6.2.0")) {
                promises.push(
                    client.blmove(
                        "abc",
                        "def",
                        ListDirection.LEFT,
                        ListDirection.LEFT,
                        0.2,
                    ),
                    client.zdiff(["abc", "zxy", "lkn"]),
                    client.zdiffWithScores(["abc", "zxy", "lkn"]),
                    client.zdiffstore("abc", ["zxy", "lkn"]),
                    client.copy("abc", "zxy", { replace: true }),
                    client.geosearchstore(
                        "abc",
                        "zxy",
                        { member: "_" },
                        { radius: 5, unit: GeoUnit.METERS },
                    ),
                    client.zrangeStore("abc", "zyx", { start: 0, end: -1 }),
                    client.zinter(["abc", "zxy", "lkn"]),
                    client.zinterWithScores(["abc", "zxy", "lkn"]),
                    client.zunion(["abc", "zxy", "lkn"]),
                    client.zunionWithScores(["abc", "zxy", "lkn"]),
                );
            }

            if (gte(cluster.getVersion(), "7.0.0")) {
                promises.push(
                    client.sintercard(["abc", "zxy", "lkn"]),
                    client.zintercard(["abc", "zxy", "lkn"]),
                    client.zmpop(["abc", "zxy", "lkn"], ScoreFilter.MAX),
                    client.bzmpop(["abc", "zxy", "lkn"], ScoreFilter.MAX, 0.1),
                    client.lcs("abc", "xyz"),
                    client.lcsLen("abc", "xyz"),
                    client.lcsIdx("abc", "xyz"),
                    client.lmpop(["abc", "def"], ListDirection.LEFT, {
                        count: 1,
                    }),
                    client.blmpop(["abc", "def"], ListDirection.RIGHT, 0.1, {
                        count: 1,
                    }),
                );
            }

            await Promise.allSettled(promises).then((results) => {
                results.forEach((result) => {
                    expect(result.status).toBe("rejected");

                    if (result.status === "rejected") {
                        expect(result.reason.message).toContain("CrossSlot");
                    }
                });
            });

            client.close();
        },
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `check that multi key command routed to multiple nodes`,
        async (protocol) => {
            const client = await GlideClusterClient.createClient(
                getClientConfigurationOption(cluster.getAddresses(), protocol),
            );

            await client.exists(["abc", "zxy", "lkn"]);
            await client.unlink(["abc", "zxy", "lkn"]);
            await client.del(["abc", "zxy", "lkn"]);
            await client.mget(["abc", "zxy", "lkn"]);
            await client.mset({ abc: "1", zxy: "2", lkn: "3" });
            await client.touch(["abc", "zxy", "lkn"]);
            await client.watch(["ghi", "zxy", "lkn"]);
            client.close();
        },
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        "object freq transaction test_%p",
        async (protocol) => {
            const client = await GlideClusterClient.createClient(
                getClientConfigurationOption(cluster.getAddresses(), protocol),
            );

            const key = uuidv4();
            const maxmemoryPolicyKey = "maxmemory-policy";
            const config = await client.configGet([maxmemoryPolicyKey]);
            const maxmemoryPolicy = config[maxmemoryPolicyKey] as string;

            try {
                const transaction = new ClusterTransaction();
                transaction.configSet({
                    [maxmemoryPolicyKey]: "allkeys-lfu",
                });
                transaction.set(key, "foo");
                transaction.objectFreq(key);

                const response = await client.exec(transaction);
                expect(response).not.toBeNull();

                if (response != null) {
                    expect(response.length).toEqual(3);
                    expect(response[0]).toEqual("OK");
                    expect(response[1]).toEqual("OK");
                    expect(response[2]).toBeGreaterThanOrEqual(0);
                }
            } finally {
                expect(
                    await client.configSet({
                        [maxmemoryPolicyKey]: maxmemoryPolicy,
                    }),
                ).toEqual("OK");
            }

            client.close();
        },
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        "object idletime transaction test_%p",
        async (protocol) => {
            const client = await GlideClusterClient.createClient(
                getClientConfigurationOption(cluster.getAddresses(), protocol),
            );

            const key = uuidv4();
            const maxmemoryPolicyKey = "maxmemory-policy";
            const config = await client.configGet([maxmemoryPolicyKey]);
            const maxmemoryPolicy = config[maxmemoryPolicyKey] as string;

            try {
                const transaction = new ClusterTransaction();
                transaction.configSet({
                    // OBJECT IDLETIME requires a non-LFU maxmemory-policy
                    [maxmemoryPolicyKey]: "allkeys-random",
                });
                transaction.set(key, "foo");
                transaction.objectIdletime(key);

                const response = await client.exec(transaction);
                expect(response).not.toBeNull();

                if (response != null) {
                    expect(response.length).toEqual(3);
                    // transaction.configSet({[maxmemoryPolicyKey]: "allkeys-random"});
                    expect(response[0]).toEqual("OK");
                    // transaction.set(key, "foo");
                    expect(response[1]).toEqual("OK");
                    // transaction.objectIdletime(key);
                    expect(response[2]).toBeGreaterThanOrEqual(0);
                }
            } finally {
                expect(
                    await client.configSet({
                        [maxmemoryPolicyKey]: maxmemoryPolicy,
                    }),
                ).toEqual("OK");
            }

            client.close();
        },
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        "object refcount transaction test_%p",
        async (protocol) => {
            const client = await GlideClusterClient.createClient(
                getClientConfigurationOption(cluster.getAddresses(), protocol),
            );

            const key = uuidv4();
            const transaction = new ClusterTransaction();
            transaction.set(key, "foo");
            transaction.objectRefcount(key);

            const response = await client.exec(transaction);
            expect(response).not.toBeNull();

            if (response != null) {
                expect(response.length).toEqual(2);
                expect(response[0]).toEqual("OK"); // transaction.set(key, "foo");
                expect(response[1]).toBeGreaterThanOrEqual(1); // transaction.objectRefcount(key);
            }

            client.close();
        },
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `lolwut test_%p`,
        async (protocol) => {
            client = await GlideClusterClient.createClient(
                getClientConfigurationOption(cluster.getAddresses(), protocol),
            );

            // test with multi-node route
            const result1 = await client.lolwut({ route: "allNodes" });
            expect(intoString(result1)).toEqual(
                expect.stringContaining("Redis ver. "),
            );

            const result2 = await client.lolwut({
                version: 2,
                parameters: [10, 20],
                route: "allNodes",
            });
            expect(intoString(result2)).toEqual(
                expect.stringContaining("Redis ver. "),
            );

            // test with single-node route
            const result3 = await client.lolwut({ route: "randomNode" });
            expect(intoString(result3)).toEqual(
                expect.stringContaining("Redis ver. "),
            );

            const result4 = await client.lolwut({
                version: 2,
                parameters: [10, 20],
                route: "randomNode",
            });
            expect(intoString(result4)).toEqual(
                expect.stringContaining("Redis ver. "),
            );

            // transaction tests
            const transaction = new ClusterTransaction();
            transaction.lolwut();
            transaction.lolwut({ version: 5 });
            transaction.lolwut({ parameters: [1, 2] });
            transaction.lolwut({ version: 6, parameters: [42] });
            const results = await client.exec(transaction);

            if (results) {
                for (const element of results) {
                    expect(intoString(element)).toEqual(
                        expect.stringContaining("Redis ver. "),
                    );
                }
            } else {
                throw new Error("Invalid LOLWUT transaction test results.");
            }

            client.close();
        },
        TIMEOUT,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        "copy test_%p",
        async (protocol) => {
            const client = await GlideClusterClient.createClient(
                getClientConfigurationOption(cluster.getAddresses(), protocol),
            );

            if (cluster.checkIfServerVersionLessThan("6.2.0")) return;

            const source = `{key}-${uuidv4()}`;
            const destination = `{key}-${uuidv4()}`;
            const value1 = uuidv4();
            const value2 = uuidv4();

            // neither key exists
            expect(
                await client.copy(source, destination, { replace: true }),
            ).toEqual(false);
            expect(await client.copy(Buffer.from(source), destination)).toEqual(
                false,
            );

            // source exists, destination does not
            expect(await client.set(source, value1)).toEqual("OK");
            expect(
                await client.copy(source, Buffer.from(destination), {
                    replace: false,
                }),
            ).toEqual(true);
            expect(await client.get(destination)).toEqual(value1);

            // new value for source key
            expect(await client.set(source, value2)).toEqual("OK");

            // both exists, no REPLACE
            expect(
                await client.copy(
                    Buffer.from(source),
                    Buffer.from(destination),
                ),
            ).toEqual(false);
            expect(
                await client.copy(source, destination, { replace: false }),
            ).toEqual(false);
            expect(await client.get(destination)).toEqual(value1);

            // both exists, with REPLACE
            expect(
                await client.copy(source, Buffer.from(destination), {
                    replace: true,
                }),
            ).toEqual(true);
            expect(await client.get(destination)).toEqual(value2);

            //transaction tests
            const transaction = new ClusterTransaction();
            transaction.set(source, value1);
            transaction.copy(source, destination, { replace: true });
            transaction.get(destination);
            const results = await client.exec(transaction);

            expect(results).toEqual(["OK", true, value1]);

            client.close();
        },
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        "flushdb flushall dbsize test_%p",
        async (protocol) => {
            const client = await GlideClusterClient.createClient(
                getClientConfigurationOption(cluster.getAddresses(), protocol),
            );

            expect(await client.dbsize()).toBeGreaterThanOrEqual(0);
            expect(await client.set(uuidv4(), uuidv4())).toEqual("OK");
            expect(await client.dbsize()).toBeGreaterThan(0);

            expect(await client.flushall()).toEqual("OK");
            expect(await client.dbsize()).toEqual(0);

            expect(await client.set(uuidv4(), uuidv4())).toEqual("OK");
            expect(await client.dbsize()).toEqual(1);
            expect(await client.flushdb({ mode: FlushMode.ASYNC })).toEqual(
                "OK",
            );
            expect(await client.dbsize()).toEqual(0);

            expect(await client.set(uuidv4(), uuidv4())).toEqual("OK");
            expect(await client.dbsize()).toEqual(1);
            expect(await client.flushdb({ mode: FlushMode.SYNC })).toEqual(
                "OK",
            );
            expect(await client.dbsize()).toEqual(0);

            client.close();
        },
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        "sort sortstore sort_store sortro sort_ro sortreadonly test_%p",
        async (protocol) => {
            const client = await GlideClusterClient.createClient(
                getClientConfigurationOption(cluster.getAddresses(), protocol),
            );
            const key1 = "{sort}" + uuidv4();
            const key2 = "{sort}" + uuidv4();
            const key3 = "{sort}" + uuidv4();
            const key4 = "{sort}" + uuidv4();
            const key5 = "{sort}" + uuidv4();

            expect(await client.sort(key3)).toEqual([]);
            expect(await client.lpush(key1, ["2", "1", "4", "3"])).toEqual(4);
            expect(await client.sort(Buffer.from(key1))).toEqual([
                "1",
                "2",
                "3",
                "4",
            ]);
            // test binary decoder
            expect(await client.sort(key1, { decoder: Decoder.Bytes })).toEqual(
                [
                    Buffer.from("1"),
                    Buffer.from("2"),
                    Buffer.from("3"),
                    Buffer.from("4"),
                ],
            );

            // sort RO
            if (!cluster.checkIfServerVersionLessThan("7.0.0")) {
                expect(await client.sortReadOnly(key3)).toEqual([]);
                expect(await client.sortReadOnly(Buffer.from(key3))).toEqual(
                    [],
                );
                // test binary decoder
                expect(
                    await client.sortReadOnly(key1, { decoder: Decoder.Bytes }),
                ).toEqual([
                    Buffer.from("1"),
                    Buffer.from("2"),
                    Buffer.from("3"),
                    Buffer.from("4"),
                ]);
            }

            // sort with store
            expect(await client.sortStore(key1, key2)).toEqual(4);
            expect(
                await client.sortStore(Buffer.from(key1), Buffer.from(key2)),
            ).toEqual(4);
            expect(await client.lrange(key2, 0, -1)).toEqual([
                "1",
                "2",
                "3",
                "4",
            ]);

            // SORT with strings require ALPHA
            expect(
                await client.rpush(key3, ["2", "1", "a", "x", "c", "4", "3"]),
            ).toEqual(7);
            await expect(client.sort(key3)).rejects.toThrow(RequestError);
            expect(await client.sort(key3, { isAlpha: true })).toEqual([
                "1",
                "2",
                "3",
                "4",
                "a",
                "c",
                "x",
            ]);

            // check transaction and options
            const transaction = new ClusterTransaction()
                .lpush(key4, ["3", "1", "2"])
                .sort(key4, {
                    orderBy: SortOrder.DESC,
                    limit: { count: 2, offset: 0 },
                })
                .sortStore(key4, key5, {
                    orderBy: SortOrder.ASC,
                    limit: { count: 100, offset: 1 },
                })
                .lrange(key5, 0, -1);

            if (!cluster.checkIfServerVersionLessThan("7.0.0")) {
                transaction.sortReadOnly(key4, {
                    orderBy: SortOrder.DESC,
                    limit: { count: 2, offset: 0 },
                });
            }

            const result = await client.exec(transaction);
            const expectedResult = [3, ["3", "2"], 2, ["2", "3"]];

            if (!cluster.checkIfServerVersionLessThan("7.0.0")) {
                expectedResult.push(["3", "2"]);
            }

            expect(result).toEqual(expectedResult);

            client.close();
        },
    );

    describe.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        "Protocol is RESP2 = %s",
        (protocol) => {
            describe.each([true, false])(
                "Single node route = %s",
                (singleNodeRoute) => {
                    it(
                        "function load function list function stats",
                        async () => {
                            if (cluster.checkIfServerVersionLessThan("7.0.0"))
                                return;

                            const client =
                                await GlideClusterClient.createClient(
                                    getClientConfigurationOption(
                                        cluster.getAddresses(),
                                        protocol,
                                    ),
                                );

                            try {
                                const libName =
                                    "mylib1C" + uuidv4().replaceAll("-", "");
                                const funcName =
                                    "myfunc1c" + uuidv4().replaceAll("-", "");
                                const code = generateLuaLibCode(
                                    libName,
                                    new Map([[funcName, "return args[1]"]]),
                                    true,
                                );
                                const route: Routes = singleNodeRoute
                                    ? { type: "primarySlotKey", key: "1" }
                                    : "allPrimaries";

                                let functionList = await client.functionList({
                                    libNamePattern: libName,
                                    route: route,
                                });
                                checkClusterResponse(
                                    functionList as object,
                                    singleNodeRoute,
                                    (value) => expect(value).toEqual([]),
                                );

                                let functionStats = await client.functionStats({
                                    route: route,
                                });
                                checkClusterResponse(
                                    functionStats as object,
                                    singleNodeRoute,
                                    (value) =>
                                        checkFunctionStatsResponse(
                                            value as FunctionStatsSingleResponse,
                                            [],
                                            0,
                                            0,
                                        ),
                                );

                                // load the library
                                expect(await client.functionLoad(code)).toEqual(
                                    libName,
                                );

                                functionList = await client.functionList({
                                    libNamePattern: libName,
                                    route: route,
                                });
                                let expectedDescription = new Map<
                                    string,
                                    string | null
                                >([[funcName, null]]);
                                let expectedFlags = new Map<string, string[]>([
                                    [funcName, ["no-writes"]],
                                ]);

                                checkClusterResponse(
                                    functionList,
                                    singleNodeRoute,
                                    (value) =>
                                        checkFunctionListResponse(
                                            value as FunctionListResponse,
                                            libName,
                                            expectedDescription,
                                            expectedFlags,
                                        ),
                                );
                                functionStats = await client.functionStats({
                                    route: route,
                                });
                                checkClusterResponse(
                                    functionStats as object,
                                    singleNodeRoute,
                                    (value) =>
                                        checkFunctionStatsResponse(
                                            value as FunctionStatsSingleResponse,
                                            [],
                                            1,
                                            1,
                                        ),
                                );

                                // call functions from that library to confirm that it works
                                let fcall = await client.fcallWithRoute(
                                    funcName,
                                    ["one", "two"],
                                    { route: route },
                                );
                                checkClusterResponse(
                                    fcall as object,
                                    singleNodeRoute,
                                    (value) => expect(value).toEqual("one"),
                                );
                                fcall = await client.fcallReadonlyWithRoute(
                                    funcName,
                                    ["one", "two"],
                                    { route: route },
                                );
                                checkClusterResponse(
                                    fcall as object,
                                    singleNodeRoute,
                                    (value) => expect(value).toEqual("one"),
                                );

                                // re-load library without replace
                                await expect(
                                    client.functionLoad(code),
                                ).rejects.toThrow(
                                    `Library '${libName}' already exists`,
                                );

                                // re-load library with replace
                                expect(
                                    await client.functionLoad(code, {
                                        replace: true,
                                    }),
                                ).toEqual(libName);

                                // overwrite lib with new code
                                const func2Name =
                                    "myfunc2c" + uuidv4().replaceAll("-", "");
                                const newCode = generateLuaLibCode(
                                    libName,
                                    new Map([
                                        [funcName, "return args[1]"],
                                        [func2Name, "return #args"],
                                    ]),
                                    true,
                                );
                                expect(
                                    await client.functionLoad(newCode, {
                                        replace: true,
                                    }),
                                ).toEqual(libName);

                                functionList = await client.functionList({
                                    libNamePattern: libName,
                                    withCode: true,
                                    route: route,
                                });
                                expectedDescription = new Map<
                                    string,
                                    string | null
                                >([
                                    [funcName, null],
                                    [func2Name, null],
                                ]);
                                expectedFlags = new Map<string, string[]>([
                                    [funcName, ["no-writes"]],
                                    [func2Name, ["no-writes"]],
                                ]);

                                checkClusterResponse(
                                    functionList,
                                    singleNodeRoute,
                                    (value) =>
                                        checkFunctionListResponse(
                                            value as FunctionListResponse,
                                            libName,
                                            expectedDescription,
                                            expectedFlags,
                                            newCode,
                                        ),
                                );
                                functionStats = await client.functionStats({
                                    route: route,
                                });
                                checkClusterResponse(
                                    functionStats as object,
                                    singleNodeRoute,
                                    (value) =>
                                        checkFunctionStatsResponse(
                                            value as FunctionStatsSingleResponse,
                                            [],
                                            1,
                                            2,
                                        ),
                                );

                                fcall = await client.fcallWithRoute(
                                    func2Name,
                                    ["one", "two"],
                                    { route: route },
                                );
                                checkClusterResponse(
                                    fcall as object,
                                    singleNodeRoute,
                                    (value) => expect(value).toEqual(2),
                                );

                                fcall = await client.fcallReadonlyWithRoute(
                                    func2Name,
                                    ["one", "two"],
                                    { route: route },
                                );
                                checkClusterResponse(
                                    fcall as object,
                                    singleNodeRoute,
                                    (value) => expect(value).toEqual(2),
                                );
                            } finally {
                                expect(await client.functionFlush()).toEqual(
                                    "OK",
                                );
                                client.close();
                            }
                        },
                        TIMEOUT,
                    );
                    it(
                        "function flush",
                        async () => {
                            if (cluster.checkIfServerVersionLessThan("7.0.0"))
                                return;

                            const client =
                                await GlideClusterClient.createClient(
                                    getClientConfigurationOption(
                                        cluster.getAddresses(),
                                        protocol,
                                    ),
                                );

                            try {
                                const libName =
                                    "mylib1C" + uuidv4().replaceAll("-", "");
                                const funcName =
                                    "myfunc1c" + uuidv4().replaceAll("-", "");
                                const code = generateLuaLibCode(
                                    libName,
                                    new Map([[funcName, "return args[1]"]]),
                                    true,
                                );
                                const route: Routes = singleNodeRoute
                                    ? { type: "primarySlotKey", key: "1" }
                                    : "allPrimaries";

                                const functionList1 = await client.functionList(
                                    { route: route },
                                );
                                checkClusterResponse(
                                    functionList1 as object,
                                    singleNodeRoute,
                                    (value) => expect(value).toEqual([]),
                                );

                                // load the library
                                expect(
                                    await client.functionLoad(code, {
                                        route: route,
                                    }),
                                ).toEqual(libName);

                                // flush functions
                                expect(
                                    await client.functionFlush({
                                        mode: FlushMode.SYNC,
                                        route: route,
                                    }),
                                ).toEqual("OK");
                                expect(
                                    await client.functionFlush({
                                        mode: FlushMode.ASYNC,
                                        route: route,
                                    }),
                                ).toEqual("OK");

                                const functionList2 =
                                    await client.functionList();
                                checkClusterResponse(
                                    functionList2 as object,
                                    singleNodeRoute,
                                    (value) => expect(value).toEqual([]),
                                );

                                // Attempt to re-load library without overwriting to ensure FLUSH was effective
                                expect(
                                    await client.functionLoad(code, {
                                        route: route,
                                    }),
                                ).toEqual(libName);
                            } finally {
                                expect(await client.functionFlush()).toEqual(
                                    "OK",
                                );
                                client.close();
                            }
                        },
                        TIMEOUT,
                    );
                    it(
                        "function delete",
                        async () => {
                            if (cluster.checkIfServerVersionLessThan("7.0.0"))
                                return;

                            const client =
                                await GlideClusterClient.createClient(
                                    getClientConfigurationOption(
                                        cluster.getAddresses(),
                                        protocol,
                                    ),
                                );

                            try {
                                const libName =
                                    "mylib1C" + uuidv4().replaceAll("-", "");
                                const funcName =
                                    "myfunc1c" + uuidv4().replaceAll("-", "");
                                const code = generateLuaLibCode(
                                    libName,
                                    new Map([[funcName, "return args[1]"]]),
                                    true,
                                );
                                const route: Routes = singleNodeRoute
                                    ? { type: "primarySlotKey", key: "1" }
                                    : "allPrimaries";
                                let functionList = await client.functionList({
                                    route: route,
                                });
                                checkClusterResponse(
                                    functionList as object,
                                    singleNodeRoute,
                                    (value) => expect(value).toEqual([]),
                                );
                                // load the library
                                expect(
                                    await client.functionLoad(code, {
                                        route: route,
                                    }),
                                ).toEqual(libName);

                                // Delete the function
                                expect(
                                    await client.functionDelete(libName, {
                                        route,
                                    }),
                                ).toEqual("OK");

                                functionList = await client.functionList({
                                    libNamePattern: libName,
                                    withCode: true,
                                    route: route,
                                });
                                checkClusterResponse(
                                    functionList as object,
                                    singleNodeRoute,
                                    (value) => expect(value).toEqual([]),
                                );

                                // Delete a non-existing library
                                await expect(
                                    client.functionDelete(libName, { route }),
                                ).rejects.toThrow(`Library not found`);
                            } finally {
                                expect(await client.functionFlush()).toEqual(
                                    "OK",
                                );
                                client.close();
                            }
                        },
                        TIMEOUT,
                    );
                    it(
                        "function kill with route",
                        async () => {
                            if (cluster.checkIfServerVersionLessThan("7.0.0"))
                                return;

                            const config = getClientConfigurationOption(
                                cluster.getAddresses(),
                                protocol,
                                { requestTimeout: 10000 },
                            );
                            const client =
                                await GlideClusterClient.createClient(config);
                            const testClient =
                                await GlideClusterClient.createClient(config);

                            try {
                                const libName =
                                    "function_kill_no_write_with_route_" +
                                    singleNodeRoute;
                                const funcName =
                                    "deadlock_with_route_" + singleNodeRoute;
                                const code =
                                    createLuaLibWithLongRunningFunction(
                                        libName,
                                        funcName,
                                        6,
                                        true,
                                    );
                                const route: Routes = singleNodeRoute
                                    ? { type: "primarySlotKey", key: "1" }
                                    : "allPrimaries";
                                expect(await client.functionFlush()).toEqual(
                                    "OK",
                                );

                                // nothing to kill
                                await expect(
                                    client.functionKill({ route }),
                                ).rejects.toThrow(/notbusy/i);

                                // load the lib
                                expect(
                                    await client.functionLoad(code, {
                                        replace: true,
                                        route: route,
                                    }),
                                ).toEqual(libName);

                                try {
                                    // call the function without await
                                    const promise = testClient
                                        .fcallWithRoute(funcName, [], {
                                            route: route,
                                        })
                                        .catch((e) =>
                                            expect(
                                                (e as Error).message,
                                            ).toContain("Script killed"),
                                        );

                                    let killed = false;
                                    let timeout = 4000;
                                    await new Promise((resolve) =>
                                        setTimeout(resolve, 1000),
                                    );

                                    while (timeout >= 0) {
                                        try {
                                            expect(
                                                await client.functionKill({
                                                    route,
                                                }),
                                            ).toEqual("OK");
                                            killed = true;
                                            break;
                                        } catch {
                                            // do nothing
                                        }

                                        await new Promise((resolve) =>
                                            setTimeout(resolve, 500),
                                        );
                                        timeout -= 500;
                                    }

                                    expect(killed).toBeTruthy();
                                    await promise;
                                } finally {
                                    await waitForNotBusy(client);
                                }
                            } finally {
                                expect(await client.functionFlush()).toEqual(
                                    "OK",
                                );
                                client.close();
                                testClient.close();
                            }
                        },
                        TIMEOUT,
                    );

                    it("function dump function restore", async () => {
                        if (cluster.checkIfServerVersionLessThan("7.0.0"))
                            return;

                        const config = getClientConfigurationOption(
                            cluster.getAddresses(),
                            protocol,
                        );
                        const client =
                            await GlideClusterClient.createClient(config);
                        const route: Routes = singleNodeRoute
                            ? { type: "primarySlotKey", key: "1" }
                            : "allPrimaries";
                        expect(
                            await client.functionFlush({
                                mode: FlushMode.SYNC,
                                route: route,
                            }),
                        ).toEqual("OK");

                        try {
                            // dumping an empty lib
                            let response = await client.functionDump({ route });

                            if (singleNodeRoute) {
                                expect(response.byteLength).toBeGreaterThan(0);
                            } else {
                                Object.values(response).forEach((d: Buffer) =>
                                    expect(d.byteLength).toBeGreaterThan(0),
                                );
                            }

                            const name1 = "Foster";
                            const name2 = "Dogster";
                            // function $name1 returns first argument
                            // function $name2 returns argument array len
                            let code = generateLuaLibCode(
                                name1,
                                new Map([
                                    [name1, "return args[1]"],
                                    [name2, "return #args"],
                                ]),
                                false,
                            );
                            expect(
                                await client.functionLoad(code, {
                                    route: route,
                                }),
                            ).toEqual(name1);

                            const flist = await client.functionList({
                                withCode: true,
                                route: route,
                            });
                            response = await client.functionDump({ route });
                            const dump = (
                                singleNodeRoute
                                    ? response
                                    : Object.values(response)[0]
                            ) as Buffer;

                            // restore without cleaning the lib and/or overwrite option causes an error
                            await expect(
                                client.functionRestore(dump, { route: route }),
                            ).rejects.toThrow(
                                `Library ${name1} already exists`,
                            );

                            // APPEND policy also fails for the same reason (name collision)
                            await expect(
                                client.functionRestore(dump, {
                                    policy: FunctionRestorePolicy.APPEND,
                                    route: route,
                                }),
                            ).rejects.toThrow(
                                `Library ${name1} already exists`,
                            );

                            // REPLACE policy succeeds
                            expect(
                                await client.functionRestore(dump, {
                                    policy: FunctionRestorePolicy.REPLACE,
                                    route: route,
                                }),
                            ).toEqual("OK");
                            // but nothing changed - all code overwritten
                            expect(
                                await client.functionList({
                                    withCode: true,
                                    route: route,
                                }),
                            ).toEqual(flist);

                            // create lib with another name, but with the same function names
                            expect(
                                await client.functionFlush({
                                    mode: FlushMode.SYNC,
                                    route: route,
                                }),
                            ).toEqual("OK");
                            code = generateLuaLibCode(
                                name2,
                                new Map([
                                    [name1, "return args[1]"],
                                    [name2, "return #args"],
                                ]),
                                false,
                            );
                            expect(
                                await client.functionLoad(code, {
                                    route: route,
                                }),
                            ).toEqual(name2);

                            // REPLACE policy now fails due to a name collision
                            await expect(
                                client.functionRestore(dump, { route: route }),
                            ).rejects.toThrow(
                                new RegExp(
                                    `Function ${name1}|${name2} already exists`,
                                ),
                            );

                            // FLUSH policy succeeds, but deletes the second lib
                            expect(
                                await client.functionRestore(dump, {
                                    policy: FunctionRestorePolicy.FLUSH,
                                    route: route,
                                }),
                            ).toEqual("OK");
                            expect(
                                await client.functionList({
                                    withCode: true,
                                    route: route,
                                }),
                            ).toEqual(flist);

                            // call restored functions
                            let res = await client.fcallWithRoute(
                                name1,
                                ["meow", "woem"],
                                { route: route },
                            );

                            if (singleNodeRoute) {
                                expect(res).toEqual("meow");
                            } else {
                                Object.values(
                                    res as Record<string, GlideReturnType>,
                                ).forEach((r) => expect(r).toEqual("meow"));
                            }

                            res = await client.fcallWithRoute(
                                name2,
                                ["meow", "woem"],
                                { route: route },
                            );

                            if (singleNodeRoute) {
                                expect(res).toEqual(2);
                            } else {
                                Object.values(
                                    res as Record<string, GlideReturnType>,
                                ).forEach((r) => expect(r).toEqual(2));
                            }
                        } finally {
                            expect(await client.functionFlush()).toEqual("OK");
                            client.close();
                        }
                    });

                    it(
                        "invoke script with route invokeScriptWithRoute %p",
                        async () => {
                            const client =
                                await GlideClusterClient.createClient(
                                    getClientConfigurationOption(
                                        cluster.getAddresses(),
                                        protocol,
                                    ),
                                );
                            const route: Routes = singleNodeRoute
                                ? { type: "primarySlotKey", key: "1" }
                                : "allPrimaries";

                            try {
                                const arg = uuidv4();
                                const script = new Script(
                                    Buffer.from("return {ARGV[1]}"),
                                );
                                let res = await client.invokeScriptWithRoute(
                                    script,
                                    { args: [Buffer.from(arg)], route },
                                );

                                if (singleNodeRoute) {
                                    expect(res).toEqual([arg]);
                                } else {
                                    Object.values(
                                        res as Record<string, GlideReturnType>,
                                    ).forEach((value) =>
                                        expect(value).toEqual([arg]),
                                    );
                                }

                                res = await client.invokeScriptWithRoute(
                                    script,
                                    {
                                        args: [arg],
                                        route,
                                        decoder: Decoder.Bytes,
                                    },
                                );

                                if (singleNodeRoute) {
                                    expect(res).toEqual([Buffer.from(arg)]);
                                } else {
                                    Object.values(
                                        res as Record<string, GlideReturnType>,
                                    ).forEach((value) =>
                                        expect(value).toEqual([
                                            Buffer.from(arg),
                                        ]),
                                    );
                                }
                            } finally {
                                client.close();
                            }
                        },
                        TIMEOUT,
                    );
                },
            );
            it(
                "function kill key based write function",
                async () => {
                    if (cluster.checkIfServerVersionLessThan("7.0.0")) return;

                    const config = getClientConfigurationOption(
                        cluster.getAddresses(),
                        protocol,
                        { requestTimeout: 10000 },
                    );
                    const client =
                        await GlideClusterClient.createClient(config);
                    const testClient =
                        await GlideClusterClient.createClient(config);

                    try {
                        const libName =
                            "function_kill_key_based_write_function";
                        const funcName =
                            "deadlock_write_function_with_key_based_route";
                        const key = libName;
                        const code = createLuaLibWithLongRunningFunction(
                            libName,
                            funcName,
                            6,
                            false,
                        );

                        const route: Routes = {
                            type: "primarySlotKey",
                            key: key,
                        };
                        expect(await client.functionFlush()).toEqual("OK");

                        // nothing to kill
                        await expect(
                            client.functionKill({ route }),
                        ).rejects.toThrow(/notbusy/i);

                        // load the lib
                        expect(
                            await client.functionLoad(code, {
                                replace: true,
                                route: route,
                            }),
                        ).toEqual(libName);

                        let promise = null;

                        try {
                            // call the function without await
                            promise = testClient.fcall(funcName, [key], []);

                            let foundUnkillable = false;
                            let timeout = 4000;
                            await new Promise((resolve) =>
                                setTimeout(resolve, 1000),
                            );

                            while (timeout >= 0) {
                                try {
                                    // valkey kills a function with 5 sec delay
                                    // but this will always throw an error in the test
                                    await client.functionKill({ route });
                                } catch (err) {
                                    // looking for an error with "unkillable" in the message
                                    // at that point we can break the loop
                                    if (
                                        (err as Error).message
                                            .toLowerCase()
                                            .includes("unkillable")
                                    ) {
                                        foundUnkillable = true;
                                        break;
                                    }
                                }

                                await new Promise((resolve) =>
                                    setTimeout(resolve, 500),
                                );
                                timeout -= 500;
                            }

                            expect(foundUnkillable).toBeTruthy();
                        } finally {
                            // If function wasn't killed, and it didn't time out - it blocks the server and cause rest
                            // test to fail. Wait for the function to complete (we cannot kill it)
                            expect(await promise).toContain("Timed out");
                        }
                    } finally {
                        expect(await client.functionFlush()).toEqual("OK");
                        client.close();
                        testClient.close();
                    }
                },
                TIMEOUT,
            );
            it("function dump function restore in transaction", async () => {
                if (cluster.checkIfServerVersionLessThan("7.0.0")) return;

                const config = getClientConfigurationOption(
                    cluster.getAddresses(),
                    protocol,
                );
                const client = await GlideClusterClient.createClient(config);
                const route: SlotKeyTypes = {
                    key: uuidv4(),
                    type: "primarySlotKey",
                };
                expect(await client.functionFlush()).toEqual("OK");

                try {
                    const name1 = "Foster";
                    const name2 = "Dogster";
                    // function returns first argument
                    const code = generateLuaLibCode(
                        name1,
                        new Map([[name2, "return args[1]"]]),
                        false,
                    );
                    expect(
                        await client.functionLoad(code, {
                            replace: true,
                            route: route,
                        }),
                    ).toEqual(name1);

                    // Verify functionDump
                    let transaction = new ClusterTransaction().functionDump();
                    const result = await client.exec(transaction, {
                        decoder: Decoder.Bytes,
                        route: route,
                    });
                    const data = result?.[0] as Buffer;

                    // Verify functionRestore
                    transaction = new ClusterTransaction()
                        .functionRestore(data, FunctionRestorePolicy.REPLACE)
                        .fcall(name2, [], ["meow"]);
                    expect(
                        await client.exec(transaction, { route: route }),
                    ).toEqual(["OK", "meow"]);
                } finally {
                    expect(await client.functionFlush()).toEqual("OK");
                    client.close();
                }
            });
        },
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        `randomKey test_%p`,
        async (protocol) => {
            client = await GlideClusterClient.createClient(
                getClientConfigurationOption(cluster.getAddresses(), protocol),
            );

            const key = uuidv4();

            // setup: delete all keys
            expect(await client.flushall({ mode: FlushMode.SYNC })).toEqual(
                "OK",
            );

            // no keys exist so randomKey returns null
            expect(await client.randomKey()).toBeNull();

            expect(await client.set(key, "foo")).toEqual("OK");
            // `key` should be the only existing key, so randomKey should return `key`
            expect(await client.randomKey({ decoder: Decoder.Bytes })).toEqual(
                Buffer.from(key),
            );
            expect(await client.randomKey({ route: "allPrimaries" })).toEqual(
                key,
            );

            client.close();
        },
        TIMEOUT,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        "watch test_%p",
        async (protocol) => {
            const client = await GlideClusterClient.createClient(
                getClientConfigurationOption(cluster.getAddresses(), protocol),
            );

            const key1 = "{key}-1" + uuidv4();
            const key2 = "{key}-2" + uuidv4();
            const key3 = "{key}-3" + uuidv4();
            const key4 = "{key}-4" + uuidv4();
            const setFoobarTransaction = new ClusterTransaction();
            const setHelloTransaction = new ClusterTransaction();

            // Returns null when a watched key is modified before it is executed in a transaction command.
            // Transaction commands are not performed.
            expect(await client.watch([key1, key2, key3])).toEqual("OK");
            expect(await client.set(key2, "hello")).toEqual("OK");
            setFoobarTransaction
                .set(key1, "foobar")
                .set(key2, "foobar")
                .set(key3, "foobar");
            let results = await client.exec(setFoobarTransaction);
            expect(results).toEqual(null);
            // sanity check
            expect(await client.get(key1)).toEqual(null);
            expect(await client.get(key2)).toEqual("hello");
            expect(await client.get(key3)).toEqual(null);

            // Transaction executes command successfully with a read command on the watch key before
            // transaction is executed.
            expect(await client.watch([key1, key2, Buffer.from(key3)])).toEqual(
                "OK",
            );
            expect(await client.get(key2)).toEqual("hello");
            results = await client.exec(setFoobarTransaction);
            expect(results).toEqual(["OK", "OK", "OK"]);
            // sanity check
            expect(await client.get(key1)).toEqual("foobar");
            expect(await client.get(key2)).toEqual("foobar");
            expect(await client.get(key3)).toEqual("foobar");

            // Transaction executes command successfully with unmodified watched keys
            expect(await client.watch([key1, key2, key3])).toEqual("OK");
            results = await client.exec(setFoobarTransaction);
            expect(results).toEqual(["OK", "OK", "OK"]);
            // sanity check
            expect(await client.get(key1)).toEqual("foobar");
            expect(await client.get(key2)).toEqual("foobar");
            expect(await client.get(key3)).toEqual("foobar");

            // Transaction executes command successfully with a modified watched key but is not in the
            // transaction.
            expect(await client.watch([key4])).toEqual("OK");
            setHelloTransaction
                .set(key1, "hello")
                .set(key2, "hello")
                .set(key3, "hello");
            results = await client.exec(setHelloTransaction);
            expect(results).toEqual(["OK", "OK", "OK"]);
            // sanity check
            expect(await client.get(key1)).toEqual("hello");
            expect(await client.get(key2)).toEqual("hello");
            expect(await client.get(key3)).toEqual("hello");

            // WATCH can not have an empty String array parameter
            await expect(client.watch([])).rejects.toThrow(RequestError);

            client.close();
        },
        TIMEOUT,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        "unwatch test_%p",
        async (protocol) => {
            const client = await GlideClusterClient.createClient(
                getClientConfigurationOption(cluster.getAddresses(), protocol),
            );

            const key1 = "{key}-1" + uuidv4();
            const key2 = "{key}-2" + uuidv4();
            const setFoobarTransaction = new ClusterTransaction();

            // UNWATCH returns OK when there no watched keys
            expect(await client.unwatch()).toEqual("OK");

            // Transaction executes successfully after modifying a watched key then calling UNWATCH
            expect(await client.watch([key1, key2])).toEqual("OK");
            expect(await client.set(key2, "hello")).toEqual("OK");
            expect(await client.unwatch()).toEqual("OK");
            expect(await client.unwatch({ route: "allPrimaries" })).toEqual(
                "OK",
            );
            setFoobarTransaction.set(key1, "foobar").set(key2, "foobar");
            const results = await client.exec(setFoobarTransaction);
            expect(results).toEqual(["OK", "OK"]);
            // sanity check
            expect(await client.get(key1)).toEqual("foobar");
            expect(await client.get(key2)).toEqual("foobar");

            client.close();
        },
        TIMEOUT,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        "script kill unkillable test_%p",
        async (protocol) => {
            const config = getClientConfigurationOption(
                cluster.getAddresses(),
                protocol,
                { requestTimeout: 10000 },
            );
            const client1 = await GlideClusterClient.createClient(config);
            const client2 = await GlideClusterClient.createClient(config);

            // Verify that script kill raises an error when no script is running
            await expect(client1.scriptKill()).rejects.toThrow(
                "No scripts in execution right now",
            );

            // Create a long-running script
            const longScript = new Script(createLongRunningLuaScript(5, true));
            let promise = null;

            try {
                // call the script without await
                promise = client2.invokeScript(longScript, {
                    keys: ["{key}-" + uuidv4()],
                });

                let foundUnkillable = false;
                let timeout = 4000;
                await new Promise((resolve) => setTimeout(resolve, 1000));

                while (timeout >= 0) {
                    try {
                        // keep trying to kill until we get an "OK"
                        await client1.scriptKill();
                    } catch (err) {
                        // a RequestError may occur if the script is not yet running
                        // sleep and try again
                        if (
                            (err as Error).message
                                .toLowerCase()
                                .includes("unkillable")
                        ) {
                            foundUnkillable = true;
                            break;
                        }
                    }

                    await new Promise((resolve) => setTimeout(resolve, 500));
                    timeout -= 500;
                }

                expect(foundUnkillable).toBeTruthy();
            } finally {
                // If script wasn't killed, and it didn't time out - it blocks the server and cause the
                // test to fail. Wait for the script to complete (we cannot kill it)
                expect(await promise).toContain("Timed out");
                client1.close();
                client2.close();
            }
        },
        TIMEOUT,
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        "should handle connection timeout when client is blocked by long-running command (protocol: %p)",
        async (protocol) => {
            // Create a client configuration with a generous request timeout
            const config = getClientConfigurationOption(
                cluster.getAddresses(),
                protocol,
                { requestTimeout: 20000 }, // Long timeout to allow debugging operations (sleep for 7 seconds)
            );

            // Initialize the primary client
            const client = await GlideClusterClient.createClient(config);

            try {
                // Run a long-running DEBUG SLEEP command using the first client (client)
                const debugCommandPromise = client.customCommand(
                    ["DEBUG", "sleep", "7"],
                    { route: "allNodes" }, // Sleep for 7 seconds
                );

                // Function that tries to create a client with a short connection timeout (100ms)
                const failToCreateClient = async () => {
                    await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for 1 second before retry
                    await expect(
                        GlideClusterClient.createClient({
                            advancedConfiguration: { connectionTimeout: 100 }, // 100ms connection timeout
                            ...config, // Include the rest of the config
                        }),
                    ).rejects.toThrowError(/timed out/i); // Ensure it throws a timeout error
                };

                // Function that verifies that a larger connection timeout allows connection
                const connectWithLargeTimeout = async () => {
                    await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for 1 second before retry
                    const longerTimeoutClient =
                        await GlideClusterClient.createClient({
                            advancedConfiguration: { connectionTimeout: 10000 }, // 10s connection timeout
                            ...config, // Include the rest of the config
                        });
                    expect(await client.set("x", "y")).toEqual("OK");
                    longerTimeoutClient.close(); // Close the client after successful connection
                };

                // Run both the long-running DEBUG SLEEP command and the client creation attempt in parallel
                await Promise.all([
                    debugCommandPromise, // Run the long-running command
                    failToCreateClient(), // Attempt to create the client with a short timeout
                ]);

                // Run all tasks: fail short timeout, succeed with large timeout, and run the debug command
                await Promise.all([
                    debugCommandPromise, // Run the long-running command
                    connectWithLargeTimeout(), // Attempt to create the client with a short timeout
                ]);
            } finally {
                // Clean up the test client and ensure everything is flushed and closed
                client.close();
            }
        },
        TIMEOUT,
    );

    it.each([
        [ProtocolVersion.RESP2, 5],
        [ProtocolVersion.RESP2, 100],
        [ProtocolVersion.RESP2, 1500],
        [ProtocolVersion.RESP3, 5],
        [ProtocolVersion.RESP3, 100],
        [ProtocolVersion.RESP3, 1500],
    ])(
        "test inflight requests limit of %p with protocol %p",
        async (protocol, inflightRequestsLimit) => {
            const config = getClientConfigurationOption(
                cluster.getAddresses(),
                protocol,
                { inflightRequestsLimit },
            );
            const client = await GlideClusterClient.createClient(config);

            try {
                const key1 = `{nonexistinglist}:1-${uuidv4()}`;
                const tasks: Promise<[GlideString, GlideString] | null>[] = [];

                // Start inflightRequestsLimit blocking tasks
                for (let i = 0; i < inflightRequestsLimit; i++) {
                    tasks.push(client.blpop([key1], 0));
                }

                // This task should immediately fail due to reaching the limit
                await expect(client.blpop([key1], 0)).rejects.toThrow(
                    RequestError,
                );

                // Verify that all previous tasks are still pending
                const timeoutPromise = new Promise((resolve) =>
                    setTimeout(resolve, 100),
                );
                const allTasksStatus = await Promise.race([
                    Promise.any(
                        tasks.map((task) => task.then(() => "resolved")),
                    ),
                    timeoutPromise.then(() => "pending"),
                ]);
                expect(allTasksStatus).toBe("pending");
            } finally {
                await client.close();
            }
        },
    );

    it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
        "should return valid statistics using protocol %p",
        async (protocol) => {
            let glideClientForTesting;

            try {
                // Create a GlideClusterClient instance for testing
                glideClientForTesting = await GlideClusterClient.createClient(
                    getClientConfigurationOption(
                        cluster.getAddresses(),
                        protocol,
                        {
                            requestTimeout: 2000,
                        },
                    ),
                );

                // Fetch statistics using get_statistics method
                const stats = glideClientForTesting.getStatistics();

                // Assertions to check if stats object has correct structure
                expect(typeof stats).toBe("object");
                expect(stats).toHaveProperty("total_connections");
                expect(stats).toHaveProperty("total_clients");
                expect(Object.keys(stats)).toHaveLength(2);
            } finally {
                // Ensure the client is properly closed
                glideClientForTesting?.close();
            }
        },
    );

    describe("AZAffinity Read Strategy Tests", () => {
        async function getNumberOfReplicas(
            azClient: GlideClusterClient,
        ): Promise<number> {
            const replicationInfo = (await azClient.info({
                sections: [InfoOptions.Replication],
            })) as Record<string, string>;
            let totalReplicas = 0;
            Object.values(replicationInfo).forEach((nodeInfo) => {
                const lines = nodeInfo.split(/\r?\n/);
                const connectedReplicasLine = lines.find(
                    (line) =>
                        line.startsWith("connected_slaves:") ||
                        line.startsWith("connected_replicas:"),
                );

                if (connectedReplicasLine) {
                    const parts = connectedReplicasLine.split(":");
                    const numReplicas = parseInt(parts[1], 10);

                    if (!isNaN(numReplicas)) {
                        // Sum up replicas from each primary node
                        totalReplicas += numReplicas;
                    }
                }
            });

            if (totalReplicas > 0) {
                return totalReplicas;
            }

            throw new Error(
                "Could not find replica information in any node's response",
            );
        }

        it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
            "should route GET commands to all replicas with the same AZ using protocol %p",
            async (protocol) => {
                // Skip test if version is below 8.0.0
                if (cluster.checkIfServerVersionLessThan("8.0.0")) return;

                const az = "us-east-1a";
                const GET_CALLS_PER_REPLICA = 3;

                let client_for_config_set;
                let client_for_testing_az;

                try {
                    // Stage 1: Configure nodes
                    client_for_config_set =
                        await GlideClusterClient.createClient(
                            getClientConfigurationOption(
                                azCluster.getAddresses(),
                                protocol,
                                { requestTimeout: 3000 },
                            ),
                        );

                    await client_for_config_set.configResetStat();
                    await client_for_config_set.configSet(
                        { "availability-zone": az },
                        { route: "allNodes" },
                    );

                    // Retrieve the number of replicas dynamically
                    const n_replicas = await getNumberOfReplicas(
                        client_for_config_set,
                    );

                    if (n_replicas === 0) {
                        throw new Error(
                            "No replicas found in the cluster. Test requires at least one replica.",
                        );
                    }

                    const GET_CALLS = GET_CALLS_PER_REPLICA * n_replicas;
                    const get_cmdstat = `calls=${GET_CALLS_PER_REPLICA}`;

                    // Stage 2: Create AZ affinity client and verify configuration
                    client_for_testing_az =
                        await GlideClusterClient.createClient(
                            getClientConfigurationOption(
                                azCluster.getAddresses(),
                                protocol,
                                {
                                    requestTimeout: 3000,
                                    readFrom: "AZAffinity",
                                    clientAz: az,
                                },
                            ),
                        );

                    const azs = (await client_for_testing_az.configGet(
                        ["availability-zone"],
                        { route: "allNodes" },
                    )) as Record<string, Record<string, string>>;

                    Object.values(azs).forEach((nodeResponse) =>
                        expect(nodeResponse["availability-zone"]).toEqual(
                            "us-east-1a",
                        ),
                    );

                    // Stage 3: Set test data and perform GET operations
                    await client_for_testing_az.set("foo", "testvalue");

                    for (let i = 0; i < GET_CALLS; i++) {
                        await client_for_testing_az.get("foo");
                    }

                    // Stage 4: Verify GET commands were routed correctly
                    const info_result = (await client_for_testing_az.info(
                        { sections: [InfoOptions.All], route: "allNodes" }, // Get both replication and commandstats info
                    )) as Record<string, string>;

                    const matching_entries_count = Object.values(
                        info_result,
                    ).filter((infoStr) => {
                        // Check if this is a replica node AND it has the expected number of GET calls
                        const isReplicaNode =
                            infoStr.includes("role:slave") ||
                            infoStr.includes("role:replica");

                        return isReplicaNode && infoStr.includes(get_cmdstat);
                    }).length;

                    expect(matching_entries_count).toBe(n_replicas); // Should expect 12 as the cluster was created with 3 primary and 4 replicas, totalling 12 replica nodes
                } finally {
                    // Cleanup
                    await client_for_config_set?.configSet(
                        { "availability-zone": "" },
                        { route: "allNodes" },
                    );
                    client_for_config_set?.close();
                    client_for_testing_az?.close();
                }
            },
        );

        it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
            "should route commands to single replica with AZ using protocol %p",
            async (protocol) => {
                // Skip test if version is below 8.0.0
                if (cluster.checkIfServerVersionLessThan("8.0.0")) return;

                const az = "us-east-1a";
                const GET_CALLS = 3;
                const get_cmdstat = `calls=${GET_CALLS}`;
                let client_for_config_set;
                let client_for_testing_az;

                try {
                    // Stage 1: Configure nodes
                    client_for_config_set =
                        await GlideClusterClient.createClient(
                            getClientConfigurationOption(
                                azCluster.getAddresses(),
                                protocol,
                                { requestTimeout: 3000 },
                            ),
                        );

                    await client_for_config_set.configSet(
                        { "availability-zone": "" },
                        { route: "allNodes" },
                    );

                    await client_for_config_set.configResetStat();

                    await client_for_config_set.configSet(
                        { "availability-zone": az },
                        { route: { type: "replicaSlotId", id: 12182 } },
                    );

                    // Stage 2: Create AZ affinity client and verify configuration
                    client_for_testing_az =
                        await GlideClusterClient.createClient(
                            getClientConfigurationOption(
                                azCluster.getAddresses(),
                                protocol,
                                {
                                    requestTimeout: 3000,
                                    readFrom: "AZAffinity",
                                    clientAz: az,
                                },
                            ),
                        );
                    await client_for_testing_az.set("foo", "testvalue");

                    for (let i = 0; i < GET_CALLS; i++) {
                        await client_for_testing_az.get("foo");
                    }

                    // Stage 4: Verify GET commands were routed correctly
                    const info_result = (await client_for_testing_az.info({
                        sections: [InfoOptions.All],
                        route: "allNodes",
                    })) as Record<string, string>;

                    // Process the info_result to check that only one replica has the GET calls
                    const matching_entries_count = Object.values(
                        info_result,
                    ).filter((infoStr) => {
                        return (
                            infoStr.includes(get_cmdstat) &&
                            infoStr.includes(`availability_zone:${az}`)
                        );
                    }).length;

                    expect(matching_entries_count).toBe(1);

                    // Check that only one node has the availability zone set to az
                    const changed_az_count = Object.values(info_result).filter(
                        (infoStr) => {
                            return infoStr.includes(`availability_zone:${az}`);
                        },
                    ).length;

                    expect(changed_az_count).toBe(1);
                } finally {
                    await client_for_config_set?.configSet(
                        { "availability-zone": "" },
                        { route: "allNodes" },
                    );
                    client_for_config_set?.close();
                    client_for_testing_az?.close();
                }
            },
        );

        it.each([ProtocolVersion.RESP2, ProtocolVersion.RESP3])(
            "should route commands to a replica when AZ does not exist using protocol %p",
            async (protocol) => {
                // Skip test if version is below 8.0.0
                if (cluster.checkIfServerVersionLessThan("8.0.0")) return;

                const GET_CALLS = 4;
                const replica_calls = 1;
                const get_cmdstat = `cmdstat_get:calls=${replica_calls}`;
                let client_for_testing_az;

                try {
                    // Create a client configured for AZAffinity with a non-existing AZ
                    client_for_testing_az =
                        await GlideClusterClient.createClient(
                            getClientConfigurationOption(
                                azCluster.getAddresses(),
                                protocol,
                                {
                                    readFrom: "AZAffinity",
                                    clientAz: "non-existing-az",
                                    requestTimeout: 3000,
                                },
                            ),
                        );

                    // Reset command stats on all nodes
                    await client_for_testing_az.configResetStat({
                        route: "allNodes",
                    });

                    // Issue GET commands
                    for (let i = 0; i < GET_CALLS; i++) {
                        await client_for_testing_az.get("foo");
                    }

                    // Fetch command stats from all nodes
                    const info_result = (await client_for_testing_az.info({
                        sections: [InfoOptions.Commandstats],
                        route: "allNodes",
                    })) as Record<string, string>;

                    // Inline matching logic
                    const matchingEntriesCount = Object.values(
                        info_result,
                    ).filter((nodeResponses) => {
                        return nodeResponses.includes(get_cmdstat);
                    }).length;

                    // Validate that only one replica handled the GET calls
                    expect(matchingEntriesCount).toBe(4);
                } finally {
                    // Cleanup: Close the client after test execution
                    client_for_testing_az?.close();
                }
            },
        );
    });
});
