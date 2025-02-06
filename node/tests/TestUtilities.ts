/**
 * Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0
 */

import { expect } from "@jest/globals";
import { exec } from "child_process";
import { v4 as uuidv4 } from "uuid";
import { Socket } from "net";
import {
    BaseClient,
    BaseClientConfiguration,
    BitFieldGet,
    BitFieldSet,
    BitOffset,
    BitOffsetMultiplier,
    BitmapIndexType,
    BitwiseOperation,
    ClusterTransaction,
    Decoder,
    FlushMode,
    FunctionListResponse,
    FunctionStatsSingleResponse,
    GeoUnit,
    GeospatialData,
    GlideClient,
    GlideClusterClient,
    GlideMultiJson,
    GlideReturnType,
    GlideString,
    InfBoundary,
    InfoOptions,
    InsertPosition,
    ListDirection,
    ProtocolVersion,
    ReturnTypeMap,
    ScoreFilter,
    SignedEncoding,
    SortOrder,
    TimeUnit,
    Transaction,
    UnsignedEncoding,
    convertRecordToGlideRecord,
} from "..";
import ValkeyCluster from "../../utils/TestUtils";

/* eslint-disable @typescript-eslint/no-explicit-any */
function intoArrayInternal(obj: any, builder: string[]) {
    if (obj == null) {
        builder.push("null");
    } else if (typeof obj === "string") {
        builder.push(obj);
    } else if (typeof obj === "number") {
        builder.push(obj.toPrecision(3));
    } else if (obj instanceof Uint8Array) {
        builder.push(obj.toString());
    } else if (obj instanceof Array) {
        for (const item of obj) {
            intoArrayInternal(item, builder);
        }
    } else if (obj instanceof Set) {
        const arr = Array.from(obj);
        arr.sort();

        for (const item of arr) {
            intoArrayInternal(item, builder);
        }
    } else if (obj instanceof Map) {
        const sortedArr = Array.from(obj.entries()).sort();

        for (const [key, value] of sortedArr) {
            intoArrayInternal(key, builder);
            intoArrayInternal(value, builder);
        }
    } else if (typeof obj[Symbol.iterator] === "function") {
        // iterable, recurse into children
        for (const item of obj) {
            intoArrayInternal(item, builder);
        }
    } else {
        const sortedArr = Array.from(Object.entries(obj)).sort();

        for (const [k, v] of sortedArr) {
            intoArrayInternal(k, builder);
            intoArrayInternal(v, builder);
        }
    }
}

// The function is used to check if the cluster is ready with the count nodes known command using the client supplied.
// The way it works is by parsing the response of the CLUSTER INFO command and checking if the cluster_state is ok and the cluster_known_nodes is equal to the count.
// If so, we know the cluster is ready, and it has the amount of nodes we expect.
export async function waitForClusterReady(
    client: GlideClusterClient,
    count: number,
): Promise<boolean> {
    const timeout = 20000; // 20 seconds timeout in milliseconds
    const startTime = Date.now();

    while (true) {
        if (Date.now() - startTime > timeout) {
            return false;
        }

        const clusterInfo = await client.customCommand(["CLUSTER", "INFO"]);
        // parse the response
        const clusterInfoMap = new Map<string, string>();

        if (clusterInfo) {
            const clusterInfoLines = clusterInfo
                .toString()
                .split("\n")
                .filter((line) => line.length > 0);

            for (const line of clusterInfoLines) {
                const [key, value] = line.split(":");

                clusterInfoMap.set(key.trim(), value.trim());
            }

            if (
                clusterInfoMap.get("cluster_state") == "ok" &&
                Number(clusterInfoMap.get("cluster_known_nodes")) == count
            ) {
                break;
            }
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    return true;
}

/**
 * accept any variable `v` and convert it into String, recursively
 */
export function intoString(v: any): string {
    const builder: string[] = [];
    intoArrayInternal(v, builder);
    return builder.join("");
}

/**
 * accept any variable `v` and convert it into array of string
 */
export function intoArray(v: any): string[] {
    const result: string[] = [];
    intoArrayInternal(v, result);
    return result;
}

/**
 * Convert array of strings into array of `Uint8Array`
 */
export function convertStringArrayToBuffer(value: string[]): Uint8Array[] {
    const bytesarr: Uint8Array[] = [];

    for (const str of value) {
        bytesarr.push(Buffer.from(str));
    }

    return bytesarr;
}

export class Checker {
    left: string;

    constructor(left: any) {
        this.left = intoString(left);
    }

    toEqual(right: any) {
        right = intoString(right);
        return expect(this.left).toEqual(right);
    }
}

export function checkSimple(left: any): Checker {
    return new Checker(left);
}

export interface Client {
    set: (key: string, value: string) => Promise<GlideString | "OK" | null>;
    get: (key: string) => Promise<GlideString | null>;
}

export async function GetAndSetRandomValue(client: Client) {
    const key = uuidv4();
    // Adding random repetition, to prevent the inputs from always having the same alignment.
    const value = uuidv4() + "0".repeat(Math.random() * 7);
    const setResult = await client.set(key, value);
    expect(intoString(setResult)).toEqual("OK");
    const result = await client.get(key);
    expect(intoString(result)).toEqual(value);
}

export function flushallOnPort(port: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        Promise.all([
            checkCliAvailability("redis-cli"),
            checkCliAvailability("valkey-cli"),
        ])

            .then(([valkeyCli, redisCli]) => {
                const serverCli = valkeyCli
                    ? "valkey-cli"
                    : redisCli
                      ? "redis-cli"
                      : null;

                if (!serverCli) {
                    reject(
                        new Error(
                            "No available CLI found for FLUSHALL operation.",
                        ),
                    );
                    return;
                }

                exec(`${serverCli} -p ${port} FLUSHALL`, (error, _, stderr) => {
                    if (error) {
                        console.error(stderr);
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            })
            .catch((error) => {
                console.error("CLI availability check failed:", error);
                reject(error);
            });
    });
}

/**
 * Parses a string of endpoints into an array of host-port pairs.
 * Each endpoint in the string should be in the format 'host:port', separated by commas.
 *
 * @param endpointsStr - The string containing endpoints in the format 'host:port', separated by commas.
 * @returns An array of host-port pairs parsed from the endpoints string.
 * @throws If the endpoints string or its format is invalid.
 * @example
 * ```typescript
 * const endpointsStr = 'localhost:8080,example.com:3000,192.168.1.100:5000';
 * const endpoints = parseEndpoints(endpointsStr);
 * console.log(endpoints);
 * // Output: [['localhost', 8080], ['example.com', 3000], ['192.168.1.100', 5000]]
 * ```
 */
export const parseEndpoints = (endpointsStr: string): [string, number][] => {
    try {
        const endpoints: string[][] = endpointsStr
            .split(",")
            .map((endpoint) => endpoint.split(":"));
        endpoints.forEach((endpoint) => {
            // Check if each endpoint has exactly two elements (host and port)
            if (endpoint.length !== 2) {
                throw new Error(
                    "Each endpoint should be in the format 'host:port'.\nEndpoints should be separated by commas.",
                );
            }

            // Extract host and port
            const [host, portStr] = endpoint;

            // Check if both host and port are specified and if port is a valid integer
            if (!host || !portStr || !/^\d+$/.test(portStr)) {
                throw new Error(
                    "Both host and port should be specified and port should be a valid integer.",
                );
            }
        });

        // Convert port strings to numbers and return the result
        return endpoints.map(([host, portStr]) => [host, Number(portStr)]);
    } catch (error) {
        throw new Error(
            "Invalid endpoints format: " + (error as Error).message,
        );
    }
};

/// This function takes the first result of the response if it got more than one response (like cluster responses).
export function getFirstResult(
    res: string | number | Record<string, string> | Record<string, number>,
): string | number {
    if (typeof res == "string" || typeof res == "number") {
        return res;
    }

    return Object.values(res).at(0);
}

// TODO use matcher instead of predicate
/** Check a multi-node response from a cluster. */
export function checkClusterMultiNodeResponse(
    res: object,
    predicate: (value: GlideReturnType) => void,
) {
    for (const nodeResponse of Object.values(res)) {
        predicate(nodeResponse);
    }
}

/** Check a response from a cluster. Response could be either single-node (value) or multi-node (string-value map). */
export function checkClusterResponse(
    res: object,
    singleNodeRoute: boolean,
    predicate: (value: GlideReturnType) => void,
) {
    if (singleNodeRoute) predicate(res as GlideReturnType);
    else checkClusterMultiNodeResponse(res, predicate);
}

/** Generate a String of LUA library code. */
export function generateLuaLibCode(
    libName: string,
    functions: Map<string, string>,
    readonly: boolean,
): string {
    let code = `#!lua name=${libName}\n`;

    for (const [functionName, functionBody] of functions) {
        code += `redis.register_function{ function_name = '${functionName}', callback = function(keys, args) ${functionBody} end`;
        if (readonly) code += ", flags = { 'no-writes' }";
        code += " }\n";
    }

    return code;
}

/**
 * Create a lua lib with a function which runs an endless loop up to timeout sec.
 * Execution takes at least 5 sec regardless of the timeout configured.
 */
export function createLuaLibWithLongRunningFunction(
    libName: string,
    funcName: string,
    timeout: number,
    readOnly: boolean,
): string {
    const code =
        "#!lua name=$libName\n" +
        "local function $libName_$funcName(keys, args)\n" +
        "  local started = tonumber(redis.pcall('time')[1])\n" +
        // fun fact - redis does no write if 'no-writes' flag is set
        "  redis.pcall('set', keys[1], 42)\n" +
        "  while (true) do\n" +
        "    local now = tonumber(redis.pcall('time')[1])\n" +
        "    if now > started + $timeout then\n" +
        "      return 'Timed out $timeout sec'\n" +
        "    end\n" +
        "  end\n" +
        "  return 'OK'\n" +
        "end\n" +
        "redis.register_function{\n" +
        "function_name='$funcName',\n" +
        "callback=$libName_$funcName,\n" +
        (readOnly ? "flags={ 'no-writes' }\n" : "") +
        "}";
    return code
        .replaceAll("$timeout", timeout.toString())
        .replaceAll("$funcName", funcName)
        .replaceAll("$libName", libName);
}

export async function waitForNotBusy(client: GlideClusterClient | GlideClient) {
    // If function wasn't killed, and it didn't time out - it blocks the server and cause rest test to fail.
    let isBusy = true;

    do {
        try {
            await client.functionKill();
        } catch (err) {
            // should throw `notbusy` error, because the function should be killed before
            if ((err as Error).message.toLowerCase().includes("notbusy")) {
                isBusy = false;
            }
        }
    } while (isBusy);
}

/**
 * Create a lua script which runs an endless loop up to timeout sec.
 * Execution takes at least 5 sec regardless of the timeout
 */
export function createLongRunningLuaScript(
    timeout: number,
    set: boolean,
): string {
    const script =
        (set ? "redis.call('SET', KEYS[1], 'value')\n" : "") +
        " local started = tonumber(redis.pcall('time')[1])\n" +
        " while (true) do\n" +
        "  local now = tonumber(redis.pcall('time')[1])\n" +
        "   if now > started + $timeout then\n" +
        "     return 'Timed out $timeout sec'\n" +
        "   end\n" +
        " end\n";

    return script.replaceAll("$timeout", timeout.toString());
}

export async function testTeardown(
    cluster_mode: boolean,
    option: BaseClientConfiguration,
) {
    const client = cluster_mode
        ? await GlideClusterClient.createClient(option)
        : await GlideClient.createClient(option);

    await client.customCommand(["FLUSHALL"]);
    client.close();
}

export const getClientConfigurationOption = (
    addresses: [string, number][],
    protocol: ProtocolVersion,
    configOverrides?: Partial<BaseClientConfiguration>,
): BaseClientConfiguration => {
    return {
        addresses: addresses.map(([host, port]) => ({
            host,
            port,
        })),
        protocol,
        useTLS: global.TLS ?? false,
        requestTimeout: 1000,
        ...configOverrides,
    };
};

export async function flushAndCloseClient(
    cluster_mode: boolean,
    addresses: [string, number][],
    client?: BaseClient,
) {
    try {
        await testTeardown(
            cluster_mode,
            getClientConfigurationOption(addresses, ProtocolVersion.RESP3, {
                requestTimeout: 2000,
            }),
        );
    } finally {
        // some tests don't initialize a client
        client?.close();
    }
}

/**
 * Compare two maps by converting them to JSON strings and checking for equality, including property order.
 *
 * @param map - The first map to compare.
 * @param map2 - The second map to compare.
 * @returns True if the maps are equal.
 * @remarks This function is used to compare maps, including their property order.
 * Direct comparison with `expect(map).toEqual(map2)` might ignore the order of properties,
 * whereas this function considers property order in the comparison by converting the maps to JSON strings.
 * This ensures a stricter comparison that takes property order into account.
 *
 * @example
 * ```typescript
 * const mapA = { name: 'John', age: 30 };
 * const mapB = { age: 30, name: 'John' };
 *
 * // Direct comparison will pass because it ignores property order
 * expect(mapA).toEqual(mapB); // This will pass
 *
 * // Correct comparison using compareMaps function
 * compareMaps(mapA, mapB); // This will return false due to different property order
 * ```
 */
export function compareMaps(
    map: Record<string, unknown>,
    map2: Record<string, unknown>,
): boolean {
    return JSON.stringify(map) == JSON.stringify(map2);
}

/**
 * Validate whether `FUNCTION LIST` response contains required info.
 *
 * @param response - The response from server.
 * @param libName - Expected library name.
 * @param functionDescriptions - Expected function descriptions. Key - function name, value - description.
 * @param functionFlags - Expected function flags. Key - function name, value - flags set.
 * @param libCode - Expected library to check if given.
 */
export function checkFunctionListResponse(
    response: FunctionListResponse,
    libName: GlideString,
    functionDescriptions: Map<string, GlideString | null>,
    functionFlags: Map<string, GlideString[]>,
    libCode?: GlideString,
) {
    expect(response.length).toBeGreaterThan(0);
    let hasLib = false;

    for (const lib of response) {
        hasLib =
            typeof libName === "string"
                ? libName === lib["library_name"]
                : (libName as Buffer).compare(lib["library_name"] as Buffer) ==
                  0;

        if (hasLib) {
            const functions = lib["functions"];
            expect(functions.length).toEqual(functionDescriptions.size);

            for (const functionData of functions) {
                const functionInfo = functionData as Record<
                    string,
                    GlideString | GlideString[]
                >;
                const name = functionInfo["name"] as GlideString;
                const flags = functionInfo["flags"] as GlideString[];

                expect(functionInfo["description"]).toEqual(
                    functionDescriptions.get(name.toString()),
                );

                expect(flags).toEqual(functionFlags.get(name.toString()));
            }

            if (libCode) {
                expect(lib["library_code"]).toEqual(libCode);
            }

            break;
        }
    }

    expect(hasLib).toBeTruthy();
}

/**
 * Validate whether `FUNCTION STATS` response contains required info.
 *
 * @param response - The response from server.
 * @param runningFunction - Command line of running function expected. Empty, if nothing expected.
 * @param libCount - Expected libraries count.
 * @param functionCount - Expected functions count.
 */
export function checkFunctionStatsResponse(
    response: FunctionStatsSingleResponse,
    runningFunction: GlideString[],
    libCount: number,
    functionCount: number,
) {
    if (response.running_script === null && runningFunction.length > 0) {
        fail("No running function info");
    }

    if (response.running_script !== null && runningFunction.length == 0) {
        fail(
            "Unexpected running function info: " +
                (response.running_script.command as string[]).join(" "),
        );
    }

    if (response.running_script !== null) {
        expect(response.running_script.command).toEqual(runningFunction);
        // command line format is:
        // fcall|fcall_ro <function name> <num keys> <key>* <arg>*
        expect(response.running_script.name).toEqual(runningFunction[1]);
    }

    expect(response.engines).toEqual({
        LUA: { libraries_count: libCount, functions_count: functionCount },
    });
}

/**
 * Check transaction response.
 * @param response - Transaction result received from `exec` call.
 * @param expectedResponseData - Expected result data from {@link transactionTest}.
 */
export function validateTransactionResponse(
    response: GlideReturnType[] | null,
    expectedResponseData: [string, GlideReturnType][],
) {
    const failedChecks: string[] = [];

    for (let i = 0; i < expectedResponseData.length; i++) {
        const [testName, expectedResponse] = expectedResponseData[i];

        try {
            expect(response?.[i]).toEqual(expectedResponse);
        } catch {
            const expected =
                expectedResponse instanceof Map
                    ? JSON.stringify(Array.from(expectedResponse.entries()))
                    : JSON.stringify(expectedResponse);
            const actual =
                response?.[i] instanceof Map
                    ? JSON.stringify(
                          Array.from(
                              (response?.[i] as ReturnTypeMap)?.entries(),
                          ),
                      )
                    : JSON.stringify(response?.[i]);
            failedChecks.push(
                `${testName} failed, expected <${expected}>, actual <${actual}>`,
            );
        }
    }

    if (failedChecks.length > 0) {
        throw new Error(
            "Checks failed in transaction response:\n" +
                failedChecks.join("\n"),
        );
    }
}

/**
 * Populates a transaction with commands to test the decodable commands with various default decoders.
 * @param baseTransaction - A transaction.
 * @param valueEncodedResponse - Represents the encoded response of "value" to compare
 * @returns Array of tuples, where first element is a test name/description, second - expected return value.
 */
export async function encodableTransactionTest(
    baseTransaction: Transaction | ClusterTransaction,
    valueEncodedResponse: GlideReturnType,
): Promise<[string, GlideReturnType][]> {
    const key = "{key}" + uuidv4(); // string
    const value = "value";
    // array of tuples - first element is test name/description, second - expected return value
    const responseData: [string, GlideReturnType][] = [];

    baseTransaction.set(key, value);
    responseData.push(["set(key, value)", "OK"]);
    baseTransaction.get(key);
    responseData.push(["get(key)", valueEncodedResponse]);

    return responseData;
}

/**
 * Populates a transaction with commands to test the decoded response.
 * @param baseTransaction - A transaction.
 * @returns Array of tuples, where first element is a test name/description, second - expected return value.
 */
export async function encodedTransactionTest(
    baseTransaction: Transaction | ClusterTransaction,
): Promise<[string, GlideReturnType][]> {
    const key1 = "{key}" + uuidv4(); // string
    const key2 = "{key}" + uuidv4(); // string
    const key = "dumpKey";
    const dumpResult = Buffer.from([
        0, 5, 118, 97, 108, 117, 101, 11, 0, 232, 41, 124, 75, 60, 53, 114, 231,
    ]);
    const value = "value";
    const valueEncoded = Buffer.from(value);
    // array of tuples - first element is test name/description, second - expected return value
    const responseData: [string, GlideReturnType][] = [];

    baseTransaction.set(key1, value);
    responseData.push(["set(key1, value)", "OK"]);
    baseTransaction.set(key2, value);
    responseData.push(["set(key2, value)", "OK"]);
    baseTransaction.get(key1);
    responseData.push(["get(key1)", valueEncoded]);
    baseTransaction.get(key2);
    responseData.push(["get(key2)", valueEncoded]);

    baseTransaction.set(key, value);
    responseData.push(["set(key, value)", "OK"]);
    baseTransaction.customCommand(["DUMP", key]);
    responseData.push(['customCommand(["DUMP", key])', dumpResult]);
    baseTransaction.del([key]);
    responseData.push(["del(key)", 1]);
    baseTransaction.get(key);
    responseData.push(["get(key)", null]);
    baseTransaction.customCommand(["RESTORE", key, "0", dumpResult]);
    responseData.push([
        'customCommand(["RESTORE", key, "0", dumpResult])',
        "OK",
    ]);
    baseTransaction.get(key);
    responseData.push(["get(key)", valueEncoded]);

    return responseData;
}

/**
 * @internal
 */
function decodeString(str: string, decoder: Decoder): GlideString {
    if (decoder == Decoder.Bytes) {
        return Buffer.from(str);
    }

    return str;
}

/**
 * Populates a transaction with commands to test.
 * @param baseTransaction - A transaction.
 * @returns Array of tuples, where first element is a test name/description, second - expected return value.
 */
export async function transactionTest(
    baseTransaction: Transaction | ClusterTransaction,
    cluster: ValkeyCluster,
    decoder: Decoder,
): Promise<[string, GlideReturnType][]> {
    // initialize key values to work within the same hashslot
    const [
        key1, // string
        key2, // string
        key3, // string
        key4, // hash
        key5, // list
        key6, // list
        key7, // set
        key8, // sorted set
        key9, // stream
        key10, // string
        key11, // hyper log log
        key12, // sorted set
        key13, // sorted set
        key14, // sorted set
        key15, // list
        key16, // list
        key17, // bitmap
        key18, // Geospatial Data/ZSET
        key19, // bitmap
        key20, // list
        key21, // list for sort
        key22, // list for sort
        key23, // zset random
        key24, // list value
        key25, // Geospatial Data/ZSET
        key26, // sorted set
        key27, // sorted set
    ] = Array.from({ length: 27 }, () =>
        decodeString("{key}" + uuidv4(), decoder),
    );

    // initialize non-key values
    const [value, groupName1, groupName2, consumer] = Array.from(
        { length: 4 },
        () => decodeString(uuidv4(), decoder),
    );

    const fieldStr = uuidv4();
    const [
        field,
        field1,
        field2,
        field3,
        field4,
        value1,
        value2,
        value3,
        foo,
        bar,
        baz,
        test,
        one,
        two,
        three,
        underscore,
        non_existing_member,
        member1,
        member2,
        member3,
        member4,
        member5,
        member6,
        member7,
        palermo,
        catania,
    ] = [
        decodeString(fieldStr, decoder),
        decodeString(fieldStr + 1, decoder),
        decodeString(fieldStr + 2, decoder),
        decodeString(fieldStr + 3, decoder),
        decodeString(fieldStr + 4, decoder),
        decodeString("value1", decoder),
        decodeString("value2", decoder),
        decodeString("value3", decoder),
        decodeString("foo", decoder),
        decodeString("bar", decoder),
        decodeString("baz", decoder),
        decodeString("test_message", decoder),
        decodeString("one", decoder),
        decodeString("two", decoder),
        decodeString("three", decoder),
        decodeString("_", decoder),
        decodeString("non_existing_member", decoder),
        decodeString("member1", decoder),
        decodeString("member2", decoder),
        decodeString("member3", decoder),
        decodeString("member4", decoder),
        decodeString("member5", decoder),
        decodeString("member6", decoder),
        decodeString("member7", decoder),
        decodeString("Palermo", decoder),
        decodeString("Catania", decoder),
    ];

    // array of tuples - first element is test name/description, second - expected return value
    const responseData: [string, GlideReturnType][] = [];

    baseTransaction.publish(test, key1);
    responseData.push(['publish("test_message", key1)', 0]);
    baseTransaction.pubsubChannels();
    responseData.push(["pubsubChannels()", []]);
    baseTransaction.pubsubNumPat();
    responseData.push(["pubsubNumPat()", 0]);
    baseTransaction.pubsubNumSub([]);
    responseData.push(["pubsubNumSub()", []]);

    baseTransaction.flushall();
    responseData.push(["flushall()", "OK"]);
    baseTransaction.flushall(FlushMode.SYNC);
    responseData.push(["flushall(FlushMode.SYNC)", "OK"]);
    baseTransaction.flushdb();
    responseData.push(["flushdb()", "OK"]);
    baseTransaction.flushdb(FlushMode.SYNC);
    responseData.push(["flushdb(FlushMode.SYNC)", "OK"]);
    baseTransaction.dbsize();
    responseData.push(["dbsize()", 0]);
    baseTransaction.set(key1, foo);
    responseData.push(['set(key1, "foo")', "OK"]);
    baseTransaction.set(key1, bar, { returnOldValue: true });
    responseData.push(['set(key1, "bar", {returnOldValue: true})', "foo"]);

    if (!cluster.checkIfServerVersionLessThan("6.2.0")) {
        baseTransaction.getex(key1);
        responseData.push(["getex(key1)", "bar"]);
        baseTransaction.getex(key1, { type: TimeUnit.Seconds, duration: 1 });
        responseData.push([
            'getex(key1, {expiry: { type: "seconds", count: 1 }})',
            "bar",
        ]);
    }

    baseTransaction.randomKey();
    responseData.push(["randomKey()", key1.toString()]);
    baseTransaction.getrange(key1, 0, -1);
    responseData.push(["getrange(key1, 0, -1)", "bar"]);
    baseTransaction.getdel(key1);
    responseData.push(["getdel(key1)", "bar"]);
    baseTransaction.set(key1, bar);
    responseData.push(['set(key1, "bar")', "OK"]);
    baseTransaction.objectEncoding(key1);
    responseData.push(["objectEncoding(key1)", "embstr"]);
    baseTransaction.type(key1);
    responseData.push(["type(key1)", "string"]);
    baseTransaction.echo(value);
    responseData.push(["echo(value)", value.toString()]);
    baseTransaction.persist(key1);
    responseData.push(["persist(key1)", false]);

    if (!cluster.checkIfServerVersionLessThan("7.0.0")) {
        baseTransaction.expireTime(key1);
        responseData.push(["expiretime(key1)", -1]);

        baseTransaction.pexpireTime(key1);
        responseData.push(["pexpiretime(key1)", -1]);
    }

    baseTransaction.set(key2, baz, { returnOldValue: true });
    responseData.push(['set(key2, "baz", { returnOldValue: true })', null]);
    baseTransaction.customCommand(["MGET", key1, key2]);
    responseData.push(['customCommand(["MGET", key1, key2])', ["bar", "baz"]]);
    baseTransaction.mset([{ key: key3, value }]);
    responseData.push(["mset({ [key3]: value })", "OK"]);
    baseTransaction.msetnx([{ key: key3, value }]);
    responseData.push(["msetnx({ [key3]: value })", false]);
    baseTransaction.mget([key1, key2]);
    responseData.push(["mget([key1, key2])", ["bar", "baz"]]);
    baseTransaction.strlen(key1);
    responseData.push(["strlen(key1)", 3]);
    baseTransaction.setrange(key1, 0, "GLIDE");
    responseData.push(["setrange(key1, 0, 'GLIDE')", 5]);
    baseTransaction.del([key1]);
    responseData.push(["del([key1])", 1]);
    baseTransaction.append(key1, "bar");
    responseData.push(["append(key1, value)", 3]);
    baseTransaction.del([key1]);
    responseData.push(["del([key1])", 1]);
    baseTransaction.hset(key4, [{ field, value }]);
    responseData.push(["hset(key4, { [field]: value })", 1]);
    baseTransaction.hscan(key4, "0");
    responseData.push([
        'hscan(key4, "0")',
        ["0", [field.toString(), value.toString()]],
    ]);

    if (!cluster.checkIfServerVersionLessThan("8.0.0")) {
        baseTransaction.hscan(key4, "0", { noValues: false });
        responseData.push([
            'hscan(key4, "0", {noValues: false})',
            ["0", [field.toString(), value.toString()]],
        ]);
        baseTransaction.hscan(key4, "0", {
            match: "*",
            count: 20,
            noValues: true,
        });
        responseData.push([
            'hscan(key4, "0", {match: "*", count: 20, noValues:true})',
            ["0", [field.toString()]],
        ]);
    }

    baseTransaction.hscan(key4, "0", { match: "*", count: 20 });
    responseData.push([
        'hscan(key4, "0", {match: "*", count: 20})',
        ["0", [field.toString(), value.toString()]],
    ]);
    baseTransaction.hstrlen(key4, field);
    responseData.push(["hstrlen(key4, field)", value.length]);
    baseTransaction.hlen(key4);
    responseData.push(["hlen(key4)", 1]);
    baseTransaction.hrandfield(key4);
    responseData.push(["hrandfield(key4)", field.toString()]);
    baseTransaction.hrandfieldCount(key4, -2);
    responseData.push([
        "hrandfieldCount(key4, -2)",
        [field.toString(), field.toString()],
    ]);
    baseTransaction.hrandfieldWithValues(key4, 2);
    responseData.push([
        "hrandfieldWithValues(key4, 2)",
        [[field.toString(), value.toString()]],
    ]);
    baseTransaction.hsetnx(key4, field, value);
    responseData.push(["hsetnx(key4, field, value)", false]);
    baseTransaction.hvals(key4);
    responseData.push(["hvals(key4)", [value.toString()]]);
    baseTransaction.hkeys(key4);
    responseData.push(["hkeys(key4)", [field.toString()]]);
    baseTransaction.hget(key4, field);
    responseData.push(["hget(key4, field)", value.toString()]);
    baseTransaction.hgetall(key4);
    responseData.push([
        "hgetall(key4)",
        [{ key: field.toString(), value: value.toString() }],
    ]);
    baseTransaction.hdel(key4, [field]);
    responseData.push(["hdel(key4, [field])", 1]);
    baseTransaction.hmget(key4, [field]);
    responseData.push(["hmget(key4, [field])", [null]]);
    baseTransaction.hexists(key4, field);
    responseData.push(["hexists(key4, field)", false]);
    baseTransaction.hrandfield(key4);
    responseData.push(["hrandfield(key4)", null]);

    baseTransaction.lpush(key5, [field1, field2, field3, field4]);
    responseData.push(["lpush(key5, [1, 2, 3, 4])", 4]);

    if (!cluster.checkIfServerVersionLessThan("7.0.0")) {
        baseTransaction.lpush(key24, [field1.toString(), field2.toString()]);
        responseData.push(["lpush(key22, [1, 2])", 2]);
        baseTransaction.lmpop([key24], ListDirection.LEFT);
        responseData.push([
            "lmpop([key24], ListDirection.LEFT)",
            [{ key: key24.toString(), value: [field2.toString()] }],
        ]);
        baseTransaction.lpush(key24, [field2]);
        responseData.push(["lpush(key24, [2])", 2]);
        baseTransaction.blmpop([key24], ListDirection.LEFT, 0.1, 1);
        responseData.push([
            "blmpop([key24], ListDirection.LEFT, 0.1, 1)",
            [{ key: key24.toString(), value: [field2.toString()] }],
        ]);
    }

    baseTransaction.lpop(key5);
    responseData.push(["lpop(key5)", field4.toString()]);
    baseTransaction.llen(key5);
    responseData.push(["llen(key5)", 3]);
    baseTransaction.lrem(key5, 1, field1);
    responseData.push(['lrem(key5, 1, field + "1")', 1]);
    baseTransaction.ltrim(key5, 0, 1);
    responseData.push(["ltrim(key5, 0, 1)", "OK"]);
    baseTransaction.lset(key5, 0, field3);
    responseData.push(['lset(key5, 0, field + "3")', "OK"]);
    baseTransaction.lrange(key5, 0, -1);
    responseData.push([
        "lrange(key5, 0, -1)",
        [field3.toString(), field2.toString()],
    ]);

    if (!cluster.checkIfServerVersionLessThan("6.2.0")) {
        baseTransaction.lmove(
            key5,
            key20,
            ListDirection.LEFT,
            ListDirection.LEFT,
        );
        responseData.push([
            "lmove(key5, key20, ListDirection.LEFT, ListDirection.LEFT)",
            field3.toString(),
        ]);

        baseTransaction.blmove(
            key20,
            key5,
            ListDirection.LEFT,
            ListDirection.LEFT,
            3,
        );
        responseData.push([
            "blmove(key20, key5, ListDirection.LEFT, ListDirection.LEFT, 3)",
            field3.toString(),
        ]);
    }

    baseTransaction.lpopCount(key5, 2);
    responseData.push([
        "lpopCount(key5, 2)",
        [field3.toString(), field2.toString()],
    ]);

    baseTransaction.linsert(
        key5,
        InsertPosition.Before,
        "nonExistingPivot",
        "element",
    );
    responseData.push(["linsert", 0]);
    baseTransaction.rpush(key6, [field1, field2, field3]);
    responseData.push([
        'rpush(key6, [field + "1", field + "2", field + "3"])',
        3,
    ]);
    baseTransaction.lindex(key6, 0);
    responseData.push(["lindex(key6, 0)", field1.toString()]);
    baseTransaction.rpop(key6);
    responseData.push(["rpop(key6)", field3.toString()]);
    baseTransaction.rpopCount(key6, 2);
    responseData.push([
        "rpopCount(key6, 2)",
        [field2.toString(), field1.toString()],
    ]);
    baseTransaction.rpushx(key15, [underscore]); // key15 is empty
    responseData.push(['rpushx(key15, ["_"])', 0]);
    baseTransaction.lpushx(key15, [underscore]);
    responseData.push(['lpushx(key15, ["_"])', 0]);
    baseTransaction.rpush(key16, [field1, field1, field2, field3, field3]);
    responseData.push(["rpush(key16, [1, 1, 2, 3, 3,])", 5]);
    baseTransaction.lpos(key16, field1, { rank: 2 });
    responseData.push(["lpos(key16, field1, { rank: 2 })", 1]);
    baseTransaction.lpos(key16, field1, { rank: 2, count: 0 });
    responseData.push(["lpos(key16, field1, { rank: 2, count: 0 })", [1]]);
    baseTransaction.sadd(key7, [bar, foo]);
    responseData.push(['sadd(key7, ["bar", "foo"])', 2]);
    baseTransaction.sunionstore(key7, [key7, key7]);
    responseData.push(["sunionstore(key7, [key7, key7])", 2]);
    baseTransaction.sunion([key7, key7]);
    responseData.push(["sunion([key7, key7])", new Set(["bar", "foo"])]);
    baseTransaction.sinter([key7, key7]);
    responseData.push(["sinter([key7, key7])", new Set(["bar", "foo"])]);

    if (!cluster.checkIfServerVersionLessThan("7.0.0")) {
        baseTransaction.sintercard([key7, key7]);
        responseData.push(["sintercard([key7, key7])", 2]);
        baseTransaction.sintercard([key7, key7], { limit: 1 });
        responseData.push(["sintercard([key7, key7], { limit: 1 })", 1]);
    }

    baseTransaction.sinterstore(key7, [key7, key7]);
    responseData.push(["sinterstore(key7, [key7, key7])", 2]);
    baseTransaction.sdiff([key7, key7]);
    responseData.push(["sdiff([key7, key7])", new Set()]);
    baseTransaction.sdiffstore(key7, [key7]);
    responseData.push(["sdiffstore(key7, [key7])", 2]);
    baseTransaction.srem(key7, [foo]);
    responseData.push(['srem(key7, ["foo"])', 1]);
    baseTransaction.sscan(key7, "0");
    responseData.push(['sscan(key7, "0")', ["0", ["bar"]]]);
    baseTransaction.sscan(key7, "0", { match: "*", count: 20 });
    responseData.push([
        'sscan(key7, "0", {match: "*", count: 20})',
        ["0", ["bar"]],
    ]);
    baseTransaction.scard(key7);
    responseData.push(["scard(key7)", 1]);
    baseTransaction.sismember(key7, bar);
    responseData.push(['sismember(key7, "bar")', true]);

    if (!cluster.checkIfServerVersionLessThan("6.2.0")) {
        baseTransaction.smismember(key7, [bar, foo, baz]);
        responseData.push([
            'smismember(key7, ["bar", "foo", "baz"])',
            [true, false, false],
        ]);
    }

    baseTransaction.smembers(key7);
    responseData.push(["smembers(key7)", new Set(["bar"])]);
    baseTransaction.srandmember(key7);
    responseData.push(["srandmember(key7)", "bar"]);
    baseTransaction.srandmemberCount(key7, 2);
    responseData.push(["srandmemberCount(key7, 2)", ["bar"]]);
    baseTransaction.srandmemberCount(key7, -2);
    responseData.push(["srandmemberCount(key7, -2)", ["bar", "bar"]]);
    baseTransaction.spop(key7);
    responseData.push(["spop(key7)", "bar"]);
    baseTransaction.spopCount(key7, 2);
    responseData.push(["spopCount(key7, 2)", new Set()]);
    baseTransaction.smove(key7, key7, non_existing_member);
    responseData.push(['smove(key7, key7, "non_existing_member")', false]);
    baseTransaction.scard(key7);
    responseData.push(["scard(key7)", 0]);
    baseTransaction.zadd(key8, [
        { element: member1, score: 1 },
        { element: member2, score: 2 },
        { element: member3, score: 3.5 },
        { element: member4, score: 4 },
        { element: member5, score: 5 },
    ]);
    responseData.push(["zadd(key8, { ... } ", 5]);
    baseTransaction.zrank(key8, member1);
    responseData.push(['zrank(key8, "member1")', 0]);

    if (!cluster.checkIfServerVersionLessThan("7.2.0")) {
        baseTransaction.zrankWithScore(key8, member1);
        responseData.push(['zrankWithScore(key8, "member1")', [0, 1]]);
    }

    baseTransaction.zrevrank(key8, "member5");
    responseData.push(['zrevrank(key8, "member5")', 0]);

    if (!cluster.checkIfServerVersionLessThan("7.2.0")) {
        baseTransaction.zrevrankWithScore(key8, "member5");
        responseData.push(['zrevrankWithScore(key8, "member5")', [0, 5]]);
    }

    baseTransaction.zaddIncr(key8, member2, 1);
    responseData.push(['zaddIncr(key8, "member2", 1)', 3]);
    baseTransaction.zincrby(key8, 0.3, member1);
    responseData.push(['zincrby(key8, 0.3, "member1")', 1.3]);
    baseTransaction.zrem(key8, [member1]);
    responseData.push(['zrem(key8, ["member1"])', 1]);
    baseTransaction.zcard(key8);
    responseData.push(["zcard(key8)", 4]);

    baseTransaction.zscore(key8, member2);
    responseData.push(['zscore(key8, "member2")', 3.0]);
    baseTransaction.zrange(key8, { start: 0, end: -1 });
    responseData.push([
        "zrange(key8, { start: 0, end: -1 })",
        [
            member2.toString(),
            member3.toString(),
            member4.toString(),
            member5.toString(),
        ],
    ]);
    baseTransaction.zrangeWithScores(key8, { start: 0, end: -1 });
    responseData.push([
        "zrangeWithScores(key8, { start: 0, end: -1 })",
        convertRecordToGlideRecord({
            member2: 3,
            member3: 3.5,
            member4: 4,
            member5: 5,
        }),
    ]);
    baseTransaction.zadd(key12, [
        { element: one, score: 1 },
        { element: two, score: 2 },
    ]);
    responseData.push(["zadd(key12, { one: 1, two: 2 })", 2]);
    baseTransaction.zscan(key12, "0");
    responseData.push(['zscan(key12, "0")', ["0", ["one", "1", "two", "2"]]]);

    if (!cluster.checkIfServerVersionLessThan("8.0.0")) {
        baseTransaction.zscan(key12, "0", { noScores: false });
        responseData.push([
            'zscan(key12, "0", {noScores: false})',
            ["0", [one.toString(), "1", two.toString(), "2"]],
        ]);

        baseTransaction.zscan(key12, "0", {
            match: "*",
            count: 20,
            noScores: true,
        });
        responseData.push([
            'zscan(key12, "0", {match: "*", count: 20, noScores:true})',
            ["0", [one.toString(), two.toString()]],
        ]);
    }

    baseTransaction.zscan(key12, "0", { match: "*", count: 20 });
    responseData.push([
        'zscan(key12, "0", {match: "*", count: 20})',
        ["0", ["one", "1", "two", "2"]],
    ]);
    baseTransaction.zadd(key13, { one: 1, two: 2, three: 3.5 });
    responseData.push(["zadd(key13, { one: 1, two: 2, three: 3.5 })", 3]);

    if (!cluster.checkIfServerVersionLessThan("6.2.0")) {
        baseTransaction.zrangeStore(key8, key8, { start: 0, end: -1 });
        responseData.push([
            "zrangeStore(key8, key8, { start: 0, end: -1 })",
            4,
        ]);
        baseTransaction.zdiff([key13, key12]);
        responseData.push(["zdiff([key13, key12])", ["three"]]);
        baseTransaction.zdiffWithScores([key13, key12]);
        responseData.push([
            "zdiffWithScores([key13, key12])",
            convertRecordToGlideRecord({ three: 3.5 }),
        ]);
        baseTransaction.zdiffstore(key13, [key13, key13]);
        responseData.push(["zdiffstore(key13, [key13, key13])", 0]);
        baseTransaction.zunionstore(key5, [key12, key13]);
        responseData.push(["zunionstore(key5, [key12, key13])", 2]);
        baseTransaction.zmscore(key12, ["two", "one"]);
        responseData.push(['zmscore(key12, ["two", "one"]', [2.0, 1.0]]);
        baseTransaction.zinterstore(key12, [key12, key13]);
        responseData.push(["zinterstore(key12, [key12, key13])", 0]);

        if (!cluster.checkIfServerVersionLessThan("6.2.0")) {
            baseTransaction.zadd(key26, [
                { element: one, score: 1 },
                { element: two, score: 2 },
            ]);
            responseData.push(["zadd(key26, { one: 1, two: 2 })", 2]);
            baseTransaction.zadd(key27, [
                { element: one, score: 1 },
                { element: two, score: 2 },
                { element: three, score: 3.5 },
            ]);
            responseData.push([
                "zadd(key27, { one: 1, two: 2, three: 3.5 })",
                3,
            ]);
            baseTransaction.zinter([key27, key26]);
            responseData.push(["zinter([key27, key26])", ["one", "two"]]);
            baseTransaction.zinterWithScores([key27, key26]);
            responseData.push([
                "zinterWithScores([key27, key26])",
                convertRecordToGlideRecord({ one: 2, two: 4 }),
            ]);
            baseTransaction.zunionWithScores([key27, key26]);
            responseData.push([
                "zunionWithScores([key27, key26])",
                convertRecordToGlideRecord({ one: 2, two: 4, three: 3.5 }).sort(
                    (a, b) => a.value - b.value,
                ),
            ]);
        }
    } else {
        baseTransaction.zinterstore(key12, [key12, key13]);
        responseData.push(["zinterstore(key12, [key12, key13])", 2]);
    }

    baseTransaction.zcount(key8, { value: 2 }, InfBoundary.PositiveInfinity);
    responseData.push([
        "zcount(key8, { value: 2 }, InfBoundary.PositiveInfinity)",
        4,
    ]);
    baseTransaction.zlexcount(
        key8,
        { value: "a" },
        InfBoundary.PositiveInfinity,
    );
    responseData.push([
        'zlexcount(key8, { value: "a" }, InfBoundary.PositiveInfinity)',
        4,
    ]);
    baseTransaction.zpopmin(key8);
    responseData.push([
        "zpopmin(key8)",
        convertRecordToGlideRecord({ member2: 3.0 }),
    ]);
    baseTransaction.zpopmax(key8);
    responseData.push([
        "zpopmax(key8)",
        convertRecordToGlideRecord({ member5: 5 }),
    ]);
    baseTransaction.zadd(key8, [{ element: member6, score: 6 }]);
    responseData.push(["zadd(key8, {member6: 6})", 1]);
    baseTransaction.bzpopmax([key8], 0.5);
    responseData.push([
        "bzpopmax([key8], 0.5)",
        [key8.toString(), "member6", 6],
    ]);
    baseTransaction.zadd(key8, [{ element: member7, score: 1 }]);
    responseData.push(["zadd(key8, {member7: 1})", 1]);
    baseTransaction.bzpopmin([key8], 0.5);
    responseData.push([
        "bzpopmin([key8], 0.5)",
        [key8.toString(), "member7", 1],
    ]);
    baseTransaction.zremRangeByRank(key8, 1, 1);
    responseData.push(["zremRangeByRank(key8, 1, 1)", 1]);
    baseTransaction.zremRangeByScore(
        key8,
        InfBoundary.NegativeInfinity,
        InfBoundary.PositiveInfinity,
    );
    responseData.push(["zremRangeByScore(key8, -Inf, +Inf)", 1]); // key8 is now empty
    baseTransaction.zremRangeByLex(
        key8,
        InfBoundary.NegativeInfinity,
        InfBoundary.PositiveInfinity,
    );
    responseData.push(["zremRangeByLex(key8, -Inf, +Inf)", 0]); // key8 is already empty

    if (!cluster.checkIfServerVersionLessThan("7.0.0")) {
        baseTransaction.zadd(key14, [
            { element: one, score: 1.0 },
            { element: two, score: 2.0 },
        ]);
        responseData.push(["zadd(key14, { one: 1.0, two: 2.0 })", 2]);
        baseTransaction.zintercard([key8, key14]);
        responseData.push(["zintercard([key8, key14])", 0]);
        baseTransaction.zintercard([key8, key14], { limit: 1 });
        responseData.push(["zintercard([key8, key14], { limit: 1 })", 0]);
        baseTransaction.zmpop([key14], ScoreFilter.MAX);
        responseData.push([
            "zmpop([key14], MAX)",
            [key14.toString(), [{ key: "two", value: 2.0 }]],
        ]);
        baseTransaction.zmpop([key14], ScoreFilter.MAX, 1);
        responseData.push([
            "zmpop([key14], MAX, 1)",
            [key14.toString(), [{ key: "one", value: 1.0 }]],
        ]);
        baseTransaction.zadd(key14, [
            { element: one, score: 1.0 },
            { element: two, score: 2.0 },
        ]);
        responseData.push(["zadd(key14, { one: 1.0, two: 2.0 })", 2]);
        baseTransaction.bzmpop([key14], ScoreFilter.MAX, 0.1);
        responseData.push([
            "bzmpop([key14], ScoreFilter.MAX, 0.1)",
            [key14.toString(), [{ key: "two", value: 2.0 }]],
        ]);
        baseTransaction.bzmpop([key14], ScoreFilter.MAX, 0.1, 1);
        responseData.push([
            "bzmpop([key14], ScoreFilter.MAX, 0.1, 1)",
            [key14.toString(), [{ key: "one", value: 1.0 }]],
        ]);
    }

    baseTransaction.xadd(key9, [[field, value1]], { id: "0-1" });
    responseData.push([
        'xadd(key9, [["field", "value1"]], { id: "0-1" })',
        "0-1",
    ]);
    baseTransaction.xadd(key9, [[field, value2]], { id: "0-2" });
    responseData.push([
        'xadd(key9, [["field", "value2"]], { id: "0-2" })',
        "0-2",
    ]);
    baseTransaction.xadd(key9, [[field, value3]], { id: "0-3" });
    responseData.push([
        'xadd(key9, [["field", "value3"]], { id: "0-3" })',
        "0-3",
    ]);
    baseTransaction.xlen(key9);
    responseData.push(["xlen(key9)", 3]);
    baseTransaction.xrange(key9, { value: "0-1" }, { value: "0-1" });
    responseData.push([
        "xrange(key9)",
        convertRecordToGlideRecord({
            "0-1": [[field.toString(), value1.toString()]],
        }),
    ]);
    baseTransaction.xrevrange(key9, { value: "0-1" }, { value: "0-1" });
    responseData.push([
        "xrevrange(key9)",
        convertRecordToGlideRecord({
            "0-1": [[field.toString(), value1.toString()]],
        }),
    ]);
    baseTransaction.xread([{ key: key9, value: "0-1" }]);
    responseData.push([
        'xread({ [key9]: "0-1" })',
        [
            {
                key: key9.toString(),
                value: [
                    {
                        key: "0-2",
                        value: [[field.toString(), value2.toString()]],
                    },
                    {
                        key: "0-3",
                        value: [[field.toString(), value3.toString()]],
                    },
                ],
            },
        ],
    ]);
    baseTransaction.xtrim(key9, {
        method: "minid",
        threshold: "0-2",
        exact: true,
    });
    responseData.push([
        'xtrim(key9, { method: "minid", threshold: "0-2", exact: true }',
        1,
    ]);
    baseTransaction.xinfoGroups(key9);
    responseData.push(["xinfoGroups(key9)", []]);
    baseTransaction.xgroupCreate(key9, groupName1, "0-0");
    responseData.push(['xgroupCreate(key9, groupName1, "0-0")', "OK"]);
    baseTransaction.xgroupCreate(key9, groupName2, "0-0", { mkStream: true });
    responseData.push([
        'xgroupCreate(key9, groupName2, "0-0", { mkStream: true })',
        "OK",
    ]);
    baseTransaction.xinfoConsumers(key9, groupName1);
    responseData.push(["xinfoConsumers(key9, groupName1)", []]);
    baseTransaction.xdel(key9, ["0-3", "0-5"]);
    responseData.push(["xdel(key9, [['0-3', '0-5']])", 1]);

    // key9 has one entry here: {"0-2":[["field","value2"]]}

    baseTransaction.xgroupCreateConsumer(key9, groupName1, consumer);
    responseData.push([
        "xgroupCreateConsumer(key9, groupName1, consumer)",
        true,
    ]);
    baseTransaction.xreadgroup(groupName1, consumer, [
        { key: key9, value: ">" },
    ]);
    responseData.push([
        'xreadgroup(groupName1, consumer, {[key9]: ">"})',
        [
            {
                key: key9.toString(),
                value: [
                    {
                        key: "0-2",
                        value: [[field.toString(), value2.toString()]],
                    },
                ],
            },
        ],
    ]);
    baseTransaction.xpending(key9, groupName1);
    responseData.push([
        "xpending(key9, groupName1)",
        [1, "0-2", "0-2", [[consumer.toString(), "1"]]],
    ]);
    baseTransaction.xpendingWithOptions(key9, groupName1, {
        start: InfBoundary.NegativeInfinity,
        end: InfBoundary.PositiveInfinity,
        count: 10,
    });
    responseData.push([
        "xpendingWithOptions(key9, groupName1, -, +, 10)",
        [["0-2", consumer.toString(), 0, 1]],
    ]);
    baseTransaction.xclaim(key9, groupName1, consumer, 0, ["0-2"]);
    responseData.push([
        'xclaim(key9, groupName1, consumer, 0, ["0-2"])',
        convertRecordToGlideRecord({
            "0-2": [[field.toString(), value2.toString()]],
        }),
    ]);
    baseTransaction.xclaim(key9, groupName1, consumer, 0, ["0-2"], {
        isForce: true,
        retryCount: 0,
        idle: 0,
    });
    responseData.push([
        'xclaim(key9, groupName1, consumer, 0, ["0-2"], { isForce: true, retryCount: 0, idle: 0})',
        convertRecordToGlideRecord({
            "0-2": [[field.toString(), value2.toString()]],
        }),
    ]);
    baseTransaction.xclaimJustId(key9, groupName1, consumer, 0, ["0-2"]);
    responseData.push([
        'xclaimJustId(key9, groupName1, consumer, 0, ["0-2"])',
        ["0-2"],
    ]);
    baseTransaction.xclaimJustId(key9, groupName1, consumer, 0, ["0-2"], {
        isForce: true,
        retryCount: 0,
        idle: 0,
    });
    responseData.push([
        'xclaimJustId(key9, groupName1, consumer, 0, ["0-2"], { isForce: true, retryCount: 0, idle: 0})',
        ["0-2"],
    ]);

    if (!cluster.checkIfServerVersionLessThan("6.2.0")) {
        baseTransaction.xautoclaim(key9, groupName1, consumer, 0, "0-0", {
            count: 1,
        });
        responseData.push([
            'xautoclaim(key9, groupName1, consumer, 0, "0-0", { count: 1 })',
            !cluster.checkIfServerVersionLessThan("7.0.0")
                ? [
                      "0-0",
                      convertRecordToGlideRecord({
                          "0-2": [[field.toString(), value2.toString()]],
                      }),
                      [],
                  ]
                : [
                      "0-0",
                      convertRecordToGlideRecord({
                          "0-2": [[field.toString(), value2.toString()]],
                      }),
                  ],
        ]);
        baseTransaction.xautoclaimJustId(key9, groupName1, consumer, 0, "0-0");
        responseData.push([
            'xautoclaimJustId(key9, groupName1, consumer, 0, "0-0")',
            !cluster.checkIfServerVersionLessThan("7.0.0")
                ? ["0-0", ["0-2"], []]
                : ["0-0", ["0-2"]],
        ]);
    }

    baseTransaction.xack(key9, groupName1, ["0-3"]);
    responseData.push(["xack(key9, groupName1, ['0-3'])", 0]);
    baseTransaction.xgroupSetId(key9, groupName1, "0-2");
    responseData.push(["xgroupSetId(key9, groupName1, '0-2')", "OK"]);
    baseTransaction.xgroupDelConsumer(key9, groupName1, consumer);
    responseData.push(["xgroupDelConsumer(key9, groupName1, consumer)", 1]);
    baseTransaction.xgroupDestroy(key9, groupName1);
    responseData.push(["xgroupDestroy(key9, groupName1)", true]);
    baseTransaction.xgroupDestroy(key9, groupName2);
    responseData.push(["xgroupDestroy(key9, groupName2)", true]);
    baseTransaction.rename(key9, key10);
    responseData.push(["rename(key9, key10)", "OK"]);
    baseTransaction.exists([key10]);
    responseData.push(["exists([key10])", 1]);
    baseTransaction.touch([key10]);
    responseData.push(["touch([key10])", 1]);
    baseTransaction.renamenx(key10, key9);
    responseData.push(["renamenx(key10, key9)", true]);
    baseTransaction.exists([key9, key10]);
    responseData.push(["exists([key9, key10])", 1]);
    baseTransaction.rpush(key6, [field1, field2, field3]);
    responseData.push([
        'rpush(key6, [field + "1", field + "2", field + "3"])',
        3,
    ]);
    baseTransaction.brpop([key6], 0.1);
    responseData.push([
        "brpop([key6], 0.1)",
        [key6.toString(), field3.toString()],
    ]);
    baseTransaction.blpop([key6], 0.1);
    responseData.push([
        "blpop([key6], 0.1)",
        [key6.toString(), field1.toString()],
    ]);

    baseTransaction.setbit(key17, 1, 1);
    responseData.push(["setbit(key17, 1, 1)", 0]);
    baseTransaction.getbit(key17, 1);
    responseData.push(["getbit(key17, 1)", 1]);
    baseTransaction.set(key17, "foobar");
    responseData.push(['set(key17, "foobar")', "OK"]);
    baseTransaction.bitcount(key17);
    responseData.push(["bitcount(key17)", 26]);
    baseTransaction.bitcount(key17, { start: 1, end: 1 });
    responseData.push(["bitcount(key17, { start: 1, end: 1 })", 6]);
    baseTransaction.bitpos(key17, 1);
    responseData.push(["bitpos(key17, 1)", 1]);

    if (!cluster.checkIfServerVersionLessThan("6.0.0")) {
        baseTransaction.bitfieldReadOnly(key17, [
            new BitFieldGet(new SignedEncoding(5), new BitOffset(3)),
        ]);
        responseData.push([
            "bitfieldReadOnly(key17, [new BitFieldGet(...)])",
            [6],
        ]);
    }

    baseTransaction.set(key19, "abcdef");
    responseData.push(['set(key19, "abcdef")', "OK"]);
    baseTransaction.bitop(BitwiseOperation.AND, key19, [key19, key17]);
    responseData.push([
        "bitop(BitwiseOperation.AND, key19, [key19, key17])",
        6,
    ]);
    baseTransaction.get(key19);
    responseData.push(["get(key19)", "`bc`ab"]);

    if (!cluster.checkIfServerVersionLessThan("7.0.0")) {
        baseTransaction.bitcount(key17, {
            start: 5,
            end: 30,
            indexType: BitmapIndexType.BIT,
        });
        responseData.push([
            "bitcount(key17, new BitOffsetOptions(5, 30, BitmapIndexType.BIT))",
            17,
        ]);
        baseTransaction.bitpos(key17, 1, {
            start: 44,
            end: 50,
            indexType: BitmapIndexType.BIT,
        });
        responseData.push([
            "bitpos(key17, 1, {start: 44, end: 50, indexType: BitmapIndexType.BIT})",
            46,
        ]);
    }

    if (!cluster.checkIfServerVersionLessThan("8.0.0")) {
        baseTransaction.set(key17, "foobar");
        responseData.push(['set(key17, "foobar")', "OK"]);
        baseTransaction.bitcount(key17, {
            start: 0,
        });
        responseData.push(["bitcount(key17, {start:0 }", 26]);
    }

    baseTransaction.bitfield(key17, [
        new BitFieldSet(
            new UnsignedEncoding(10),
            new BitOffsetMultiplier(3),
            4,
        ),
    ]);
    responseData.push(["bitfield(key17, [new BitFieldSet(...)])", [609]]);

    baseTransaction.pfadd(key11, [one, two, three]);
    responseData.push(["pfadd(key11, [one, two, three])", 1]);
    baseTransaction.pfmerge(key11, []);
    responseData.push(["pfmerge(key11, [])", "OK"]);
    baseTransaction.pfcount([key11]);
    responseData.push(["pfcount([key11])", 3]);
    baseTransaction.geoadd(
        key18,
        new Map<GlideString, GeospatialData>([
            [palermo, { longitude: 13.361389, latitude: 38.115556 }],
            [catania, { longitude: 15.087269, latitude: 37.502669 }],
        ]),
    );
    responseData.push(["geoadd(key18, { Palermo: ..., Catania: ... })", 2]);
    baseTransaction.geopos(key18, [palermo, catania]);
    responseData.push([
        'geopos(key18, ["palermo", "catania"])',
        [
            [13.36138933897018433, 38.11555639549629859],
            [15.08726745843887329, 37.50266842333162032],
        ],
    ]);
    baseTransaction.geodist(key18, palermo, catania);
    responseData.push(['geodist(key18, "Palermo", "Catania")', 166274.1516]);
    baseTransaction.geodist(key18, palermo, catania, {
        unit: GeoUnit.KILOMETERS,
    });
    responseData.push([
        'geodist(key18, "palermo", "catania", { unit: GeoUnit.KILOMETERS })',
        166.2742,
    ]);
    baseTransaction.geohash(key18, [palermo, catania, non_existing_member]);
    responseData.push([
        'geohash(key18, ["palermo", "catania", "NonExisting"])',
        ["sqc8b49rny0", "sqdtr74hyu0", null],
    ]);
    baseTransaction.zadd(key23, { one: 1.0 });
    responseData.push(["zadd(key23, {one: 1.0}", 1]);
    baseTransaction.zrandmember(key23);
    responseData.push(["zrandmember(key23)", "one"]);
    baseTransaction.zrandmemberWithCount(key23, 1);
    responseData.push(["zrandmemberWithCount(key23, 1)", ["one"]]);
    baseTransaction.zrandmemberWithCountWithScores(key23, 1);
    responseData.push([
        "zrandmemberWithCountWithScores(key23, 1)",
        [["one", 1.0]],
    ]);

    if (!cluster.checkIfServerVersionLessThan("6.2.0")) {
        baseTransaction
            .geosearch(
                key18,
                { member: palermo },
                { radius: 200, unit: GeoUnit.KILOMETERS },
                { sortOrder: SortOrder.ASC },
            )
            .geosearch(
                key18,
                { position: { longitude: 15, latitude: 37 } },
                { width: 400, height: 400, unit: GeoUnit.KILOMETERS },
            )
            .geosearch(
                key18,
                { member: palermo },
                { radius: 200, unit: GeoUnit.KILOMETERS },
                {
                    sortOrder: SortOrder.ASC,
                    count: 2,
                    withCoord: true,
                    withDist: true,
                    withHash: true,
                },
            )
            .geosearch(
                key18,
                { position: { longitude: 15, latitude: 37 } },
                { width: 400, height: 400, unit: GeoUnit.KILOMETERS },
                {
                    sortOrder: SortOrder.ASC,
                    count: 2,
                    withCoord: true,
                    withDist: true,
                    withHash: true,
                },
            );
        responseData.push([
            'geosearch(key18, "Palermo", R200 KM, ASC)',
            [palermo.toString(), catania.toString()],
        ]);
        responseData.push([
            "geosearch(key18, (15, 37), 400x400 KM, ASC)",
            [palermo.toString(), catania.toString()],
        ]);
        responseData.push([
            'geosearch(key18, "palermo", R200 KM, ASC 2 3x true)',
            [
                [
                    palermo.toString(),
                    [
                        0.0,
                        3479099956230698,
                        [13.361389338970184, 38.1155563954963],
                    ],
                ],
                [
                    catania.toString(),
                    [
                        166.2742,
                        3479447370796909,
                        [15.087267458438873, 37.50266842333162],
                    ],
                ],
            ],
        ]);
        responseData.push([
            "geosearch(key18, (15, 37), 400x400 KM, ASC 2 3x true)",
            [
                [
                    catania.toString(),
                    [
                        56.4413,
                        3479447370796909,
                        [15.087267458438873, 37.50266842333162],
                    ],
                ],
                [
                    palermo.toString(),
                    [
                        190.4424,
                        3479099956230698,
                        [13.361389338970184, 38.1155563954963],
                    ],
                ],
            ],
        ]);

        baseTransaction.geosearchstore(
            key25,
            key18,
            { position: { longitude: 15, latitude: 37 } },
            { width: 400, height: 400, unit: GeoUnit.KILOMETERS },
        );
        responseData.push([
            "geosearchstore(key25, key18, (15, 37), 400x400 KM)",
            2,
        ]);
    }

    const libName = "mylib1C" + uuidv4().replaceAll("-", "");
    const funcName = "myfunc1c" + uuidv4().replaceAll("-", "");
    const code = generateLuaLibCode(
        libName,
        new Map([[funcName, "return args[1]"]]),
        true,
    );

    if (!cluster.checkIfServerVersionLessThan("7.0.0")) {
        baseTransaction.functionFlush();
        responseData.push(["functionFlush()", "OK"]);
        baseTransaction.functionLoad(code);
        responseData.push(["functionLoad(code)", libName]);
        baseTransaction.functionLoad(code, true);
        responseData.push(["functionLoad(code, true)", libName]);
        baseTransaction.functionList({ libNamePattern: "another" });
        responseData.push(['functionList("another")', []]);
        baseTransaction.fcall(funcName, [], ["one", "two"]);
        responseData.push(['fcall(funcName, [], ["one", "two"])', "one"]);
        baseTransaction.fcallReadonly(funcName, [], ["one", "two"]);
        responseData.push([
            'fcallReadonly(funcName, [], ["one", "two"]',
            "one",
        ]);
        baseTransaction.functionStats();
        responseData.push([
            "functionStats()",
            convertRecordToGlideRecord({
                running_script: null,
                engines: convertRecordToGlideRecord({
                    LUA: convertRecordToGlideRecord({
                        libraries_count: 1,
                        functions_count: 1,
                    }),
                }),
            }),
        ]);
        baseTransaction.functionDelete(libName);
        responseData.push(["functionDelete(libName)", "OK"]);
        baseTransaction.functionFlush();
        responseData.push(["functionFlush()", "OK"]);
        baseTransaction.functionFlush(FlushMode.ASYNC);
        responseData.push(["functionFlush(FlushMode.ASYNC)", "OK"]);
        baseTransaction.functionFlush(FlushMode.SYNC);
        responseData.push(["functionFlush(FlushMode.SYNC)", "OK"]);
        baseTransaction.functionList({
            libNamePattern: libName,
            withCode: true,
        });
        responseData.push(["functionList({ libName, true})", []]);

        baseTransaction
            .mset([
                { key: key1, value: "abcd" },
                { key: key2, value: "bcde" },
                { key: key3, value: "wxyz" },
            ])
            .lcs(key1, key2)
            .lcs(key1, key3)
            .lcsLen(key1, key2)
            .lcsLen(key1, key3)
            .lcsIdx(key1, key2)
            .lcsIdx(key1, key2, { minMatchLen: 1 })
            .lcsIdx(key1, key2, { withMatchLen: true })
            .lcsIdx(key1, key2, { withMatchLen: true, minMatchLen: 1 })
            .del([key1, key2, key3]);

        responseData.push(
            ['mset({[key1]: "abcd", [key2]: "bcde", [key3]: "wxyz"})', "OK"],
            ["lcs(key1, key2)", "bcd"],
            ["lcs(key1, key3)", ""],
            ["lcsLen(key1, key2)", 3],
            ["lcsLen(key1, key3)", 0],
            [
                "lcsIdx(key1, key2)",
                convertRecordToGlideRecord({
                    matches: [
                        [
                            [1, 3],
                            [0, 2],
                        ],
                    ],
                    len: 3,
                }),
            ],
            [
                "lcsIdx(key1, key2, {minMatchLen: 1})",
                convertRecordToGlideRecord({
                    matches: [
                        [
                            [1, 3],
                            [0, 2],
                        ],
                    ],
                    len: 3,
                }),
            ],
            [
                "lcsIdx(key1, key2, {withMatchLen: true})",
                convertRecordToGlideRecord({
                    matches: [[[1, 3], [0, 2], 3]],
                    len: 3,
                }),
            ],
            [
                "lcsIdx(key1, key2, {withMatchLen: true, minMatchLen: 1})",
                convertRecordToGlideRecord({
                    matches: [[[1, 3], [0, 2], 3]],
                    len: 3,
                }),
            ],
            ["del([key1, key2, key3])", 3],
        );
    }

    baseTransaction
        .lpush(key21, ["3", "1", "2"])
        .sort(key21)
        .sortStore(key21, key22)
        .lrange(key22, 0, -1);
    responseData.push(
        ['lpush(key21, ["3", "1", "2"])', 3],
        ["sort(key21)", ["1", "2", "3"]],
        ["sortStore(key21, key22)", 3],
        ["lrange(key22, 0, -1)", ["1", "2", "3"]],
    );

    if (!cluster.checkIfServerVersionLessThan("7.0.0")) {
        baseTransaction.sortReadOnly(key21);
        responseData.push(["sortReadOnly(key21)", ["1", "2", "3"]]);
    }

    return responseData;
}

/**
 * Populates a transaction with JSON commands to test.
 * @param baseTransaction - A transaction.
 * @returns Array of tuples, where first element is a test name/description, second - expected return value.
 */
export async function transactionMultiJsonForArrCommands(
    baseTransaction: ClusterTransaction,
): Promise<[string, GlideReturnType][]> {
    const responseData: [string, GlideReturnType][] = [];
    const key = "{key}:1" + uuidv4();
    const jsonValue = { a: 1.0, b: 2 };

    // JSON.SET
    GlideMultiJson.set(baseTransaction, key, "$", JSON.stringify(jsonValue));
    responseData.push(['set(key, "{ a: 1.0, b: 2 }")', "OK"]);

    // JSON.CLEAR
    GlideMultiJson.clear(baseTransaction, key, { path: "$" });
    responseData.push(['clear(key, "bar")', 1]);

    GlideMultiJson.set(baseTransaction, key, "$", JSON.stringify(jsonValue));
    responseData.push(['set(key, "$", "{ "a": 1, b: ["one", "two"] }")', "OK"]);

    // JSON.GET
    GlideMultiJson.get(baseTransaction, key, { path: "." });
    responseData.push(['get(key, {path: "."})', JSON.stringify(jsonValue)]);

    const jsonValue2 = { a: 1.0, b: [1, 2] };
    GlideMultiJson.set(baseTransaction, key, "$", JSON.stringify(jsonValue2));
    responseData.push(['set(key, "$", "{ "a": 1, b: ["1", "2"] }")', "OK"]);

    // JSON.ARRAPPEND
    GlideMultiJson.arrappend(baseTransaction, key, "$.b", ["3", "4"]);
    responseData.push(['arrappend(key, "$.b", [\'"3"\', \'"4"\'])', [4]]);

    // JSON.GET to check JSON.ARRAPPEND was successful.
    const jsonValueAfterAppend = { a: 1.0, b: [1, 2, 3, 4] };
    GlideMultiJson.get(baseTransaction, key, { path: "." });
    responseData.push([
        'get(key, {path: "."})',
        JSON.stringify(jsonValueAfterAppend),
    ]);

    // JSON.ARRINDEX
    GlideMultiJson.arrindex(baseTransaction, key, "$.b", "2");
    responseData.push(['arrindex(key, "$.b", "1")', [1]]);

    // JSON.ARRINSERT
    GlideMultiJson.arrinsert(baseTransaction, key, "$.b", 2, ["5"]);
    responseData.push(['arrinsert(key, "$.b", 4, [\'"5"\'])', [5]]);

    // JSON.GET to check JSON.ARRINSERT was successful.
    const jsonValueAfterArrInsert = { a: 1.0, b: [1, 2, 5, 3, 4] };
    GlideMultiJson.get(baseTransaction, key, { path: "." });
    responseData.push([
        'get(key, {path: "."})',
        JSON.stringify(jsonValueAfterArrInsert),
    ]);

    // JSON.ARRLEN
    GlideMultiJson.arrlen(baseTransaction, key, { path: "$.b" });
    responseData.push(['arrlen(key, "$.b")', [5]]);

    // JSON.ARRPOP
    GlideMultiJson.arrpop(baseTransaction, key, {
        path: "$.b",
        index: 2,
    });
    responseData.push(['arrpop(key, {path: "$.b", index: 4})', ["5"]]);

    // JSON.GET to check JSON.ARRPOP was successful.
    const jsonValueAfterArrpop = { a: 1.0, b: [1, 2, 3, 4] };
    GlideMultiJson.get(baseTransaction, key, { path: "." });
    responseData.push([
        'get(key, {path: "."})',
        JSON.stringify(jsonValueAfterArrpop),
    ]);

    // JSON.ARRTRIM
    GlideMultiJson.arrtrim(baseTransaction, key, "$.b", 1, 2);
    responseData.push(['arrtrim(key, "$.b", 2, 3)', [2]]);

    // JSON.GET to check JSON.ARRTRIM was successful.
    const jsonValueAfterArrTrim = { a: 1.0, b: [2, 3] };
    GlideMultiJson.get(baseTransaction, key, { path: "." });
    responseData.push([
        'get(key, {path: "."})',
        JSON.stringify(jsonValueAfterArrTrim),
    ]);
    return responseData;
}

export async function transactionMultiJson(
    baseTransaction: ClusterTransaction,
): Promise<[string, GlideReturnType][]> {
    const responseData: [string, GlideReturnType][] = [];
    const key = "{key}:1" + uuidv4();
    const jsonValue = { a: [1, 2], b: [3, 4], c: "c", d: true };

    // JSON.SET to create a key for testing commands.
    GlideMultiJson.set(baseTransaction, key, "$", JSON.stringify(jsonValue));
    responseData.push(['set(key, "$")', "OK"]);

    // JSON.DEBUG MEMORY
    GlideMultiJson.debugMemory(baseTransaction, key, { path: "$.a" });
    responseData.push(['debugMemory(key, "{ path: "$.a" }")', [48]]);

    // JSON.DEBUG FIELDS
    GlideMultiJson.debugFields(baseTransaction, key, { path: "$.a" });
    responseData.push(['debugFields(key, "{ path: "$.a" }")', [2]]);

    // JSON.OBJLEN
    GlideMultiJson.objlen(baseTransaction, key, { path: "." });
    responseData.push(["objlen(key)", 4]);

    // JSON.OBJKEY
    GlideMultiJson.objkeys(baseTransaction, key, { path: "." });
    responseData.push(['objkeys(key, "$.")', ["a", "b", "c", "d"]]);

    // JSON.NUMINCRBY
    GlideMultiJson.numincrby(baseTransaction, key, "$.a[*]", 10.0);
    responseData.push(['numincrby(key, "$.a[*]", 10.0)', "[11,12]"]);

    // JSON.NUMMULTBY
    GlideMultiJson.nummultby(baseTransaction, key, "$.a[*]", 10.0);
    responseData.push(['nummultby(key, "$.a[*]", 10.0)', "[110,120]"]);

    // // JSON.STRAPPEND
    GlideMultiJson.strappend(baseTransaction, key, '"-test"', { path: "$.c" });
    responseData.push(['strappend(key, \'"-test"\', "$.c")', [6]]);

    // // JSON.STRLEN
    GlideMultiJson.strlen(baseTransaction, key, { path: "$.c" });
    responseData.push(['strlen(key, "$.c")', [6]]);

    // JSON.TYPE
    GlideMultiJson.type(baseTransaction, key, { path: "$.a" });
    responseData.push(['type(key, "$.a")', ["array"]]);

    // JSON.MGET
    const key2 = "{key}:2" + uuidv4();
    const key3 = "{key}:3" + uuidv4();
    const jsonValue2 = { b: [3, 4], c: "c", d: true };
    GlideMultiJson.set(baseTransaction, key2, "$", JSON.stringify(jsonValue2));
    responseData.push(['set(key2, "$")', "OK"]);

    GlideMultiJson.mget(baseTransaction, [key, key2, key3], "$.a");
    responseData.push([
        'json.mget([key, key2, key3], "$.a")',
        ["[[110,120]]", "[]", null],
    ]);

    // JSON.TOGGLE
    GlideMultiJson.toggle(baseTransaction, key, { path: "$.d" });
    responseData.push(['toggle(key2, "$.d")', [false]]);

    // JSON.RESP
    GlideMultiJson.resp(baseTransaction, key, { path: "$" });
    responseData.push([
        'resp(key, "$")',
        [
            [
                "{",
                ["a", ["[", 110, 120]],
                ["b", ["[", 3, 4]],
                ["c", "c-test"],
                ["d", "false"],
            ],
        ],
    ]);

    // JSON.DEL
    GlideMultiJson.del(baseTransaction, key, { path: "$.d" });
    responseData.push(['del(key, { path: "$.d" })', 1]);

    // JSON.FORGET
    GlideMultiJson.forget(baseTransaction, key, { path: "$.c" });
    responseData.push(['forget(key, {path: "$.c" })', 1]);

    return responseData;
}

/**
 * This function gets server version using info command in glide client.
 *
 * @param addresses - Addresses containing host and port for the valkey server.
 * @returns Server version for valkey server
 */
export async function getServerVersion(
    addresses: [string, number][],
    clusterMode = false,
): Promise<string> {
    let info = "";

    if (clusterMode) {
        const glideClusterClient = await GlideClusterClient.createClient(
            getClientConfigurationOption(addresses, ProtocolVersion.RESP2),
        );
        info = getFirstResult(
            await glideClusterClient.info({ sections: [InfoOptions.Server] }),
        ).toString();
        await flushAndCloseClient(clusterMode, addresses, glideClusterClient);
    } else {
        const glideClient = await GlideClient.createClient(
            getClientConfigurationOption(addresses, ProtocolVersion.RESP2),
        );
        info = await glideClient.info([InfoOptions.Server]);
        await flushAndCloseClient(clusterMode, addresses, glideClient);
    }

    let version = "";
    const redisVersionKey = "redis_version:";
    const valkeyVersionKey = "valkey_version:";

    if (info.includes(valkeyVersionKey)) {
        version = info.split(valkeyVersionKey)[1].split("\n")[0];
    } else if (info.includes(redisVersionKey)) {
        version = info.split(redisVersionKey)[1].split("\n")[0];
    }

    return version;
}

/**
 * Check if a command is available on the system
 */
export function checkCliAvailability(command: string): Promise<boolean> {
    return new Promise((resolve) => {
        exec(`${command} --version`, (error) => {
            resolve(!error);
        });
    });
}

/**
 * Starts a Valkey/Redis-compatible server on the specified port
 */
export function startServer(
    port: number,
): Promise<{ process: any; command: string }> {
    return new Promise((resolve, reject) => {
        Promise.all([
            checkCliAvailability("valkey-server"),
            checkCliAvailability("redis-server"),
        ]).then(([valkeyExists, redisExists]) => {
            const serverCmd = valkeyExists
                ? "valkey-server"
                : redisExists
                  ? "redis-server"
                  : null;

            if (!serverCmd) {
                reject(
                    new Error(
                        "Neither valkey-server nor redis-server is available",
                    ),
                );
                return;
            }

            const process = exec(
                `${serverCmd} --port ${port}`,
                (error, stdout, stderr) => {
                    if (error) {
                        console.error(`Server failed to start: ${stderr}`);
                        reject(error);
                    }
                },
            );

            // Give the server a moment to start
            setTimeout(() => {
                const client = new Socket();
                client.connect(port, "localhost", () => {
                    client.end();
                    resolve({ process, command: serverCmd });
                });
                client.on("error", (err) => {
                    process.kill();
                    reject(
                        new Error(
                            `Failed to connect to server: ${err.message}`,
                        ),
                    );
                });
            }, 1000);
        });
    });
}
