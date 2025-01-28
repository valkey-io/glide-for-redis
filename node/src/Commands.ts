/**
 * Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0
 */

import Long from "long";
import { createLeakedStringVec, MAX_REQUEST_ARGS_LEN } from "../npm/glide/glide-rs";

import {
    BaseClient, // eslint-disable-line @typescript-eslint/no-unused-vars
    convertRecordToGlideRecord,
    GlideRecord,
    GlideString,
    HashDataType,
    ObjectType,
    SortedSetDataType,
} from "./BaseClient";
/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
import { GlideClient } from "./GlideClient";
/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
import { GlideClusterClient } from "./GlideClusterClient";
import { command_request } from "./ProtobufMessage";

import RequestType = command_request.RequestType;

function isLargeCommand(args: GlideString[]) {
    let lenSum = 0;

    for (const arg of args) {
        lenSum += arg.length;

        if (lenSum >= MAX_REQUEST_ARGS_LEN) {
            return true;
        }
    }

    return false;
}

/**
 * Convert a string array into Uint8Array[]
 */
function toBuffersArray(args: GlideString[]) {
    const argsBytes: Uint8Array[] = [];

    for (const arg of args) {
        if (typeof arg == "string") {
            argsBytes.push(Buffer.from(arg));
        } else {
            argsBytes.push(arg);
        }
    }

    return argsBytes;
}

/**
 * @internal
 */
export function parseInfoResponse(response: string): Record<string, string> {
    const lines = response.split("\n");
    const parsedResponse: Record<string, string> = {};

    for (const line of lines) {
        // Ignore lines that start with '#'
        if (!line.startsWith("#")) {
            const [key, value] = line.trim().split(":");
            parsedResponse[key] = value;
        }
    }

    return parsedResponse;
}

function createCommand(
    requestType: command_request.RequestType,
    args: GlideString[],
): command_request.Command {
    const singleCommand = command_request.Command.create({
        requestType,
    });

    const argsBytes = toBuffersArray(args);

    if (isLargeCommand(args)) {
        // pass as a pointer
        const pointerArr = createLeakedStringVec(argsBytes);
        const pointer = new Long(pointerArr[0], pointerArr[1]);
        singleCommand.argsVecPointer = pointer;
    } else {
        singleCommand.argsArray = command_request.Command.ArgsArray.create({
            args: argsBytes,
        });
    }

    return singleCommand;
}

/**
 * @internal
 */
export function createGet(key: GlideString): command_request.Command {
    return createCommand(RequestType.Get, [key]);
}

/**
 * @internal
 */
export function createGetDel(key: GlideString): command_request.Command {
    return createCommand(RequestType.GetDel, [key]);
}

/**
 * @internal
 */
export function createGetRange(
    key: GlideString,
    start: number,
    end: number,
): command_request.Command {
    return createCommand(RequestType.GetRange, [
        key,
        start.toString(),
        end.toString(),
    ]);
}

export type SetOptions = (
    | {
          /**
           * `onlyIfDoesNotExist` - Only set the key if it does not already exist.
           * `NX` in the Valkey API.
           *
           * `onlyIfExists` - Only set the key if it already exists.
           * `EX` in the Valkey API.
           */
          conditionalSet?: "onlyIfExists" | "onlyIfDoesNotExist";
      }
    | {
          /**
           * `onlyIfEqual` - Only set the key if the comparison value equals the current value of key.
           * `IFEQ` in the Valkey API.
           */
          conditionalSet: "onlyIfEqual";
          /**
           * The value to compare the existing value with.
           */
          comparisonValue: GlideString;
      }
) & {
    /**
     * Return the old string stored at key, or nil if key did not exist. An error
     * is returned and SET aborted if the value stored at key is not a string.
     * Equivalent to `GET` in the Valkey API.
     */
    returnOldValue?: boolean;
    /**
     * If not set, no expiry time will be set for the value.
     */
    expiry?: /**
     * Retain the time to live associated with the key. Equivalent to
     * `KEEPTTL` in the Valkey API.
     */
    | "keepExisting"
        | {
              type: TimeUnit;
              count: number;
          };
};

/**
 * @internal
 */
export function createSet(
    key: GlideString,
    value: GlideString,
    options?: SetOptions,
): command_request.Command {
    const args = [key, value];

    if (options) {
        if (options.conditionalSet === "onlyIfExists") {
            args.push("XX");
        } else if (options.conditionalSet === "onlyIfDoesNotExist") {
            args.push("NX");
        } else if (options.conditionalSet === "onlyIfEqual") {
            args.push("IFEQ", options.comparisonValue);
        }

        if (options.returnOldValue) {
            args.push("GET");
        }

        if (options.expiry) {
            if (
                options.expiry !== "keepExisting" &&
                !Number.isInteger(options.expiry.count)
            ) {
                throw new Error(
                    `Received expiry '${JSON.stringify(
                        options.expiry,
                    )}'. Count must be an integer`,
                );
            }

            if (options.expiry === "keepExisting") {
                args.push("KEEPTTL");
            } else {
                args.push(options.expiry.type, options.expiry.count.toString());
            }
        }
    }

    return createCommand(RequestType.Set, args);
}

/**
 * INFO option: a specific section of information:
 * When no parameter is provided, the default option is assumed.
 */
export enum InfoOptions {
    /**
     * SERVER: General information about the server
     */
    Server = "server",
    /**
     * CLIENTS: Client connections section
     */
    Clients = "clients",
    /**
     * MEMORY: Memory consumption related information
     */
    Memory = "memory",
    /**
     * PERSISTENCE: RDB and AOF related information
     */
    Persistence = "persistence",
    /**
     * STATS: General statistics
     */
    Stats = "stats",
    /**
     * REPLICATION: Master/replica replication information
     */
    Replication = "replication",
    /**
     * CPU: CPU consumption statistics
     */
    Cpu = "cpu",
    /**
     * COMMANDSTATS: Valkey command statistics
     */
    Commandstats = "commandstats",
    /**
     * LATENCYSTATS: Valkey command latency percentile distribution statistics
     */
    Latencystats = "latencystats",
    /**
     * SENTINEL: Valkey Sentinel section (only applicable to Sentinel instances)
     */
    Sentinel = "sentinel",
    /**
     * CLUSTER: Valkey Cluster section
     */
    Cluster = "cluster",
    /**
     * MODULES: Modules section
     */
    Modules = "modules",
    /**
     * KEYSPACE: Database related statistics
     */
    Keyspace = "keyspace",
    /**
     * ERRORSTATS: Valkey error statistics
     */
    Errorstats = "errorstats",
    /**
     * ALL: Return all sections (excluding module generated ones)
     */
    All = "all",
    /**
     * DEFAULT: Return only the default set of sections
     */
    Default = "default",
    /**
     * EVERYTHING: Includes all and modules
     */
    Everything = "everything",
}

/**
 * @internal
 */
export function createPing(str?: GlideString): command_request.Command {
    const args: GlideString[] = str == undefined ? [] : [str];
    return createCommand(RequestType.Ping, args);
}

/**
 * @internal
 */
export function createInfo(options?: InfoOptions[]): command_request.Command {
    const args: string[] = options == undefined ? [] : options;
    return createCommand(RequestType.Info, args);
}

/**
 * @internal
 */
export function createDel(keys: GlideString[]): command_request.Command {
    return createCommand(RequestType.Del, keys);
}

/**
 * @internal
 */
export function createSelect(index: number): command_request.Command {
    return createCommand(RequestType.Select, [index.toString()]);
}

/**
 * @internal
 */
export function createClientGetName(): command_request.Command {
    return createCommand(RequestType.ClientGetName, []);
}

/**
 * @internal
 */
export function createConfigRewrite(): command_request.Command {
    return createCommand(RequestType.ConfigRewrite, []);
}

/**
 * @internal
 */
export function createConfigResetStat(): command_request.Command {
    return createCommand(RequestType.ConfigResetStat, []);
}

/**
 * @internal
 */
export function createMGet(keys: GlideString[]): command_request.Command {
    return createCommand(RequestType.MGet, keys);
}

/**
 * @internal
 */
export function createMSet(
    keysAndValues: GlideRecord<GlideString>,
): command_request.Command {
    return createCommand(
        RequestType.MSet,
        keysAndValues.flatMap((e) => [e.key, e.value]),
    );
}

/**
 * @internal
 */
export function createMSetNX(
    keysAndValues: GlideRecord<GlideString>,
): command_request.Command {
    return createCommand(
        RequestType.MSetNX,
        keysAndValues.flatMap((e) => [e.key, e.value]),
    );
}

/**
 * @internal
 */
export function createIncr(key: GlideString): command_request.Command {
    return createCommand(RequestType.Incr, [key]);
}

/**
 * @internal
 */
export function createIncrBy(
    key: GlideString,
    amount: number,
): command_request.Command {
    return createCommand(RequestType.IncrBy, [key, amount.toString()]);
}

/**
 * @internal
 */
export function createIncrByFloat(
    key: GlideString,
    amount: number,
): command_request.Command {
    return createCommand(RequestType.IncrByFloat, [key, amount.toString()]);
}

/**
 * @internal
 */
export function createClientId(): command_request.Command {
    return createCommand(RequestType.ClientId, []);
}

/**
 * @internal
 */
export function createConfigGet(parameters: string[]): command_request.Command {
    return createCommand(RequestType.ConfigGet, parameters);
}

/**
 * @internal
 */
export function createConfigSet(
    parameters: Record<string, GlideString>,
): command_request.Command {
    return createCommand(
        RequestType.ConfigSet,
        Object.entries(parameters).flat(),
    );
}

/**
 * @internal
 */
export function createHGet(
    key: GlideString,
    field: GlideString,
): command_request.Command {
    return createCommand(RequestType.HGet, [key, field]);
}

/**
 * This function converts an input from {@link HashDataType} or `Record` types to `HashDataType`.
 *
 * @param fieldsAndValues - field names and their values.
 * @returns HashDataType array containing field names and their values.
 */
export function convertFieldsAndValuesToHashDataType(
    fieldsAndValues: HashDataType | Record<string, GlideString>,
): HashDataType {
    if (!Array.isArray(fieldsAndValues)) {
        return Object.entries(fieldsAndValues).map(([field, value]) => {
            return { field, value };
        });
    }

    return fieldsAndValues;
}

/**
 * @internal
 */
export function createHSet(
    key: GlideString,
    fieldValueList: HashDataType,
): command_request.Command {
    return createCommand(
        RequestType.HSet,
        [key].concat(
            fieldValueList
                .map((fieldValueObject) => [
                    fieldValueObject.field,
                    fieldValueObject.value,
                ])
                .flat(),
        ),
    );
}

/**
 * @internal
 */
export function createHKeys(key: GlideString): command_request.Command {
    return createCommand(RequestType.HKeys, [key]);
}

/**
 * @internal
 */
export function createHSetNX(
    key: GlideString,
    field: GlideString,
    value: GlideString,
): command_request.Command {
    return createCommand(RequestType.HSetNX, [key, field, value]);
}

/**
 * @internal
 */
export function createDecr(key: GlideString): command_request.Command {
    return createCommand(RequestType.Decr, [key]);
}

/**
 * @internal
 */
export function createDecrBy(
    key: GlideString,
    amount: number,
): command_request.Command {
    return createCommand(RequestType.DecrBy, [key, amount.toString()]);
}

/**
 * Enumeration defining the bitwise operation to use in the {@link BaseClient.bitop|bitop} command. Specifies the
 * bitwise operation to perform between the passed in keys.
 */
export enum BitwiseOperation {
    AND = "AND",
    OR = "OR",
    XOR = "XOR",
    NOT = "NOT",
}

/**
 * @internal
 */
export function createBitOp(
    operation: BitwiseOperation,
    destination: GlideString,
    keys: GlideString[],
): command_request.Command {
    return createCommand(RequestType.BitOp, [operation, destination, ...keys]);
}

/**
 * @internal
 */
export function createGetBit(
    key: GlideString,
    offset: number,
): command_request.Command {
    return createCommand(RequestType.GetBit, [key, offset.toString()]);
}

/**
 * @internal
 */
export function createSetBit(
    key: GlideString,
    offset: number,
    value: number,
): command_request.Command {
    return createCommand(RequestType.SetBit, [
        key,
        offset.toString(),
        value.toString(),
    ]);
}

/**
 * Represents a signed or unsigned argument encoding for the {@link BaseClient.bitfield|bitfield} or
 * {@link BaseClient.bitfieldReadOnly|bitfieldReadOnly} commands.
 */
export interface BitEncoding {
    /**
     * Returns the encoding as a string argument to be used in the {@link BaseClient.bitfield|bitfield} or
     * {@link BaseClient.bitfieldReadOnly|bitfieldReadOnly} commands.
     *
     * @returns The encoding as a string argument.
     */
    toArg(): string;
}

/**
 * Represents a signed argument encoding.
 */
export class SignedEncoding implements BitEncoding {
    private static readonly SIGNED_ENCODING_PREFIX = "i";
    private readonly encoding: string;

    /**
     * Creates an instance of SignedEncoding.
     *
     * @param encodingLength - The bit size of the encoding. Must be less than 65 bits long.
     */
    constructor(encodingLength: number) {
        this.encoding = `${SignedEncoding.SIGNED_ENCODING_PREFIX}${encodingLength.toString()}`;
    }

    public toArg(): string {
        return this.encoding;
    }
}

/**
 * Represents an unsigned argument encoding.
 */
export class UnsignedEncoding implements BitEncoding {
    private static readonly UNSIGNED_ENCODING_PREFIX = "u";
    private readonly encoding: string;

    /**
     * Creates an instance of UnsignedEncoding.
     *
     * @param encodingLength - The bit size of the encoding. Must be less than 64 bits long.
     */
    constructor(encodingLength: number) {
        this.encoding = `${UnsignedEncoding.UNSIGNED_ENCODING_PREFIX}${encodingLength.toString()}`;
    }

    public toArg(): string {
        return this.encoding;
    }
}

/**
 * Represents an offset for an array of bits for the {@link BaseClient.bitfield|bitfield} or
 * {@link BaseClient.bitfieldReadOnly|bitfieldReadOnly} commands.
 */
export interface BitFieldOffset {
    /**
     * Returns the offset as a string argument to be used in the {@link BaseClient.bitfield|bitfield} or
     * {@link BaseClient.bitfieldReadOnly|bitfieldReadOnly} commands.
     *
     * @returns The offset as a string argument.
     */
    toArg(): string;
}

/**
 * Represents an offset in an array of bits for the {@link BaseClient.bitfield|bitfield} or
 * {@link BaseClient.bitfieldReadOnly|bitfieldReadOnly} commands.
 *
 * For example, if we have the binary `01101001` with offset of 1 for an unsigned encoding of size 4, then the value
 * is 13 from `0(1101)001`.
 */
export class BitOffset implements BitFieldOffset {
    private readonly offset: string;

    /**
     * Creates an instance of BitOffset.
     *
     * @param offset - The bit index offset in the array of bits. Must be greater than or equal to 0.
     */
    constructor(offset: number) {
        this.offset = offset.toString();
    }

    public toArg(): string {
        return this.offset;
    }
}

/**
 * Represents an offset in an array of bits for the {@link BaseClient.bitfield|bitfield} or
 * {@link BaseClient.bitfieldReadOnly|bitfieldReadOnly} commands. The bit offset index is calculated as the numerical
 * value of the offset multiplied by the encoding value.
 *
 * For example, if we have the binary 01101001 with offset multiplier of 1 for an unsigned encoding of size 4, then the
 * value is 9 from `0110(1001)`.
 */
export class BitOffsetMultiplier implements BitFieldOffset {
    private static readonly OFFSET_MULTIPLIER_PREFIX = "#";
    private readonly offset: string;

    /**
     * Creates an instance of BitOffsetMultiplier.
     *
     * @param offset - The offset in the array of bits, which will be multiplied by the encoding value to get the final
     *      bit index offset.
     */
    constructor(offset: number) {
        this.offset = `${BitOffsetMultiplier.OFFSET_MULTIPLIER_PREFIX}${offset.toString()}`;
    }

    public toArg(): string {
        return this.offset;
    }
}

/**
 * Represents subcommands for the {@link BaseClient.bitfield|bitfield} or
 * {@link BaseClient.bitfieldReadOnly|bitfieldReadOnly} commands.
 */
export interface BitFieldSubCommands {
    /**
     * Returns the subcommand as a list of string arguments to be used in the {@link BaseClient.bitfield|bitfield} or
     * {@link BaseClient.bitfieldReadOnly|bitfieldReadOnly} commands.
     *
     * @returns The subcommand as a list of string arguments.
     */
    toArgs(): string[];
}

/**
 * Represents the "GET" subcommand for getting a value in the binary representation of the string stored in `key`.
 */
export class BitFieldGet implements BitFieldSubCommands {
    private static readonly GET_COMMAND_STRING = "GET";
    private readonly encoding: BitEncoding;
    private readonly offset: BitFieldOffset;

    /**
     * Creates an instance of BitFieldGet.
     *
     * @param encoding - The bit encoding for the subcommand.
     * @param offset - The offset in the array of bits from which to get the value.
     */
    constructor(encoding: BitEncoding, offset: BitFieldOffset) {
        this.encoding = encoding;
        this.offset = offset;
    }

    toArgs(): string[] {
        return [
            BitFieldGet.GET_COMMAND_STRING,
            this.encoding.toArg(),
            this.offset.toArg(),
        ];
    }
}

/**
 * Represents the "SET" subcommand for setting bits in the binary representation of the string stored in `key`.
 */
export class BitFieldSet implements BitFieldSubCommands {
    private static readonly SET_COMMAND_STRING = "SET";
    private readonly encoding: BitEncoding;
    private readonly offset: BitFieldOffset;
    private readonly value: number;

    /**
     * Creates an instance of BitFieldSet
     *
     * @param encoding - The bit encoding for the subcommand.
     * @param offset - The offset in the array of bits where the value will be set.
     * @param value - The value to set the bits in the binary value to.
     */
    constructor(encoding: BitEncoding, offset: BitFieldOffset, value: number) {
        this.encoding = encoding;
        this.offset = offset;
        this.value = value;
    }

    toArgs(): string[] {
        return [
            BitFieldSet.SET_COMMAND_STRING,
            this.encoding.toArg(),
            this.offset.toArg(),
            this.value.toString(),
        ];
    }
}

/**
 * Represents the "INCRBY" subcommand for increasing or decreasing bits in the binary representation of the string
 * stored in `key`.
 */
export class BitFieldIncrBy implements BitFieldSubCommands {
    private static readonly INCRBY_COMMAND_STRING = "INCRBY";
    private readonly encoding: BitEncoding;
    private readonly offset: BitFieldOffset;
    private readonly increment: number;

    /**
     * Creates an instance of BitFieldIncrBy
     *
     * @param encoding - The bit encoding for the subcommand.
     * @param offset - The offset in the array of bits where the value will be incremented.
     * @param increment - The value to increment the bits in the binary value by.
     */
    constructor(
        encoding: BitEncoding,
        offset: BitFieldOffset,
        increment: number,
    ) {
        this.encoding = encoding;
        this.offset = offset;
        this.increment = increment;
    }

    toArgs(): string[] {
        return [
            BitFieldIncrBy.INCRBY_COMMAND_STRING,
            this.encoding.toArg(),
            this.offset.toArg(),
            this.increment.toString(),
        ];
    }
}

/**
 * Enumeration specifying bit overflow controls for the {@link BaseClient.bitfield|bitfield} command.
 */
export enum BitOverflowControl {
    /**
     * Performs modulo when overflows occur with unsigned encoding. When overflows occur with signed encoding, the value
     * restarts at the most negative value. When underflows occur with signed encoding, the value restarts at the most
     * positive value.
     */
    WRAP = "WRAP",
    /**
     * Underflows remain set to the minimum value, and overflows remain set to the maximum value.
     */
    SAT = "SAT",
    /**
     * Returns `None` when overflows occur.
     */
    FAIL = "FAIL",
}

/**
 * Represents the "OVERFLOW" subcommand that determines the result of the "SET" or "INCRBY"
 * {@link BaseClient.bitfield|bitfield} subcommands when an underflow or overflow occurs.
 */
export class BitFieldOverflow implements BitFieldSubCommands {
    private static readonly OVERFLOW_COMMAND_STRING = "OVERFLOW";
    private readonly overflowControl: BitOverflowControl;

    /**
     * Creates an instance of BitFieldOverflow.
     *
     * @param overflowControl - The desired overflow behavior.
     */
    constructor(overflowControl: BitOverflowControl) {
        this.overflowControl = overflowControl;
    }

    toArgs(): string[] {
        return [BitFieldOverflow.OVERFLOW_COMMAND_STRING, this.overflowControl];
    }
}

/**
 * @internal
 */
export function createBitField(
    key: GlideString,
    subcommands: BitFieldSubCommands[],
    readOnly = false,
): command_request.Command {
    const requestType = readOnly
        ? RequestType.BitFieldReadOnly
        : RequestType.BitField;
    let args: GlideString[] = [key];

    for (const subcommand of subcommands) {
        args = args.concat(subcommand.toArgs());
    }

    return createCommand(requestType, args);
}

/**
 * @internal
 */
export function createHDel(
    key: GlideString,
    fields: GlideString[],
): command_request.Command {
    return createCommand(RequestType.HDel, [key].concat(fields));
}

/**
 * @internal
 */
export function createHMGet(
    key: GlideString,
    fields: GlideString[],
): command_request.Command {
    return createCommand(RequestType.HMGet, [key].concat(fields));
}

/**
 * @internal
 */
export function createHExists(
    key: GlideString,
    field: GlideString,
): command_request.Command {
    return createCommand(RequestType.HExists, [key, field]);
}

/**
 * @internal
 */
export function createHGetAll(key: GlideString): command_request.Command {
    return createCommand(RequestType.HGetAll, [key]);
}

/**
 * @internal
 */
export function createLPush(
    key: GlideString,
    elements: GlideString[],
): command_request.Command {
    return createCommand(RequestType.LPush, [key].concat(elements));
}

/**
 * @internal
 */
export function createLPushX(
    key: GlideString,
    elements: GlideString[],
): command_request.Command {
    return createCommand(RequestType.LPushX, [key].concat(elements));
}

/**
 * @internal
 */
export function createLPop(
    key: GlideString,
    count?: number,
): command_request.Command {
    const args: GlideString[] =
        count == undefined ? [key] : [key, count.toString()];
    return createCommand(RequestType.LPop, args);
}

/**
 * @internal
 */
export function createLRange(
    key: GlideString,
    start: number,
    end: number,
): command_request.Command {
    return createCommand(RequestType.LRange, [
        key,
        start.toString(),
        end.toString(),
    ]);
}

/**
 * @internal
 */
export function createLLen(key: GlideString): command_request.Command {
    return createCommand(RequestType.LLen, [key]);
}

/**
 * Enumeration representing element popping or adding direction for the List Based Commands.
 */
export enum ListDirection {
    /**
     * Represents the option that elements should be popped from or added to the left side of a list.
     */
    LEFT = "LEFT",
    /**
     * Represents the option that elements should be popped from or added to the right side of a list.
     */
    RIGHT = "RIGHT",
}

/**
 * @internal
 */
export function createLMove(
    source: GlideString,
    destination: GlideString,
    whereFrom: ListDirection,
    whereTo: ListDirection,
): command_request.Command {
    return createCommand(RequestType.LMove, [
        source,
        destination,
        whereFrom,
        whereTo,
    ]);
}

/**
 * @internal
 */
export function createBLMove(
    source: GlideString,
    destination: GlideString,
    whereFrom: ListDirection,
    whereTo: ListDirection,
    timeout: number,
): command_request.Command {
    return createCommand(RequestType.BLMove, [
        source,
        destination,
        whereFrom,
        whereTo,
        timeout.toString(),
    ]);
}

/**
 * @internal
 */
export function createLSet(
    key: GlideString,
    index: number,
    element: GlideString,
): command_request.Command {
    return createCommand(RequestType.LSet, [key, index.toString(), element]);
}

/**
 * @internal
 */
export function createLTrim(
    key: GlideString,
    start: number,
    end: number,
): command_request.Command {
    return createCommand(RequestType.LTrim, [
        key,
        start.toString(),
        end.toString(),
    ]);
}

/**
 * @internal
 */
export function createLRem(
    key: GlideString,
    count: number,
    element: GlideString,
): command_request.Command {
    return createCommand(RequestType.LRem, [key, count.toString(), element]);
}

/**
 * @internal
 */
export function createRPush(
    key: GlideString,
    elements: GlideString[],
): command_request.Command {
    return createCommand(RequestType.RPush, [key].concat(elements));
}

/**
 * @internal
 */
export function createRPushX(
    key: GlideString,
    elements: GlideString[],
): command_request.Command {
    return createCommand(RequestType.RPushX, [key].concat(elements));
}

/**
 * @internal
 */
export function createRPop(
    key: GlideString,
    count?: number,
): command_request.Command {
    const args: GlideString[] =
        count == undefined ? [key] : [key, count.toString()];
    return createCommand(RequestType.RPop, args);
}

/**
 * @internal
 */
export function createSAdd(
    key: GlideString,
    members: GlideString[],
): command_request.Command {
    return createCommand(RequestType.SAdd, [key].concat(members));
}

/**
 * @internal
 */
export function createSRem(
    key: GlideString,
    members: GlideString[],
): command_request.Command {
    return createCommand(RequestType.SRem, [key].concat(members));
}

/**
 * @internal
 */
export function createSScan(
    key: GlideString,
    cursor: GlideString,
    options?: BaseScanOptions,
): command_request.Command {
    let args: GlideString[] = [key, cursor];

    if (options) {
        args = args.concat(convertBaseScanOptionsToArgsArray(options));
    }

    return createCommand(RequestType.SScan, args);
}

/**
 * @internal
 */
export function createSMembers(key: GlideString): command_request.Command {
    return createCommand(RequestType.SMembers, [key]);
}

/**
 *
 * @internal
 */
export function createSMove(
    source: GlideString,
    destination: GlideString,
    member: GlideString,
): command_request.Command {
    return createCommand(RequestType.SMove, [source, destination, member]);
}

/**
 * @internal
 */
export function createSCard(key: GlideString): command_request.Command {
    return createCommand(RequestType.SCard, [key]);
}

/**
 * @internal
 */
export function createSInter(keys: GlideString[]): command_request.Command {
    return createCommand(RequestType.SInter, keys);
}

/**
 * @internal
 */
export function createSInterCard(
    keys: GlideString[],
    limit?: number,
): command_request.Command {
    let args: GlideString[] = keys;
    args.unshift(keys.length.toString());

    if (limit != undefined) {
        args = args.concat(["LIMIT", limit.toString()]);
    }

    return createCommand(RequestType.SInterCard, args);
}

/**
 * @internal
 */
export function createSInterStore(
    destination: GlideString,
    keys: GlideString[],
): command_request.Command {
    return createCommand(RequestType.SInterStore, [destination].concat(keys));
}

/**
 * @internal
 */
export function createSDiff(keys: GlideString[]): command_request.Command {
    return createCommand(RequestType.SDiff, keys);
}

/**
 * @internal
 */
export function createSDiffStore(
    destination: GlideString,
    keys: GlideString[],
): command_request.Command {
    return createCommand(RequestType.SDiffStore, [destination].concat(keys));
}

/**
 * @internal
 */
export function createSUnion(keys: GlideString[]): command_request.Command {
    return createCommand(RequestType.SUnion, keys);
}

/**
 * @internal
 */
export function createSUnionStore(
    destination: GlideString,
    keys: GlideString[],
): command_request.Command {
    return createCommand(RequestType.SUnionStore, [destination].concat(keys));
}

/**
 * @internal
 */
export function createSIsMember(
    key: GlideString,
    member: GlideString,
): command_request.Command {
    return createCommand(RequestType.SIsMember, [key, member]);
}

/**
 * @internal
 */
export function createSMIsMember(
    key: GlideString,
    members: GlideString[],
): command_request.Command {
    return createCommand(RequestType.SMIsMember, [key].concat(members));
}

/**
 * @internal
 */
export function createSPop(
    key: GlideString,
    count?: number,
): command_request.Command {
    const args: GlideString[] =
        count == undefined ? [key] : [key, count.toString()];
    return createCommand(RequestType.SPop, args);
}

/**
 * @internal
 */
export function createSRandMember(
    key: GlideString,
    count?: number,
): command_request.Command {
    const args: GlideString[] =
        count == undefined ? [key] : [key, count.toString()];
    return createCommand(RequestType.SRandMember, args);
}

/**
 * @internal
 */
export function createCustomCommand(args: GlideString[]) {
    return createCommand(RequestType.CustomCommand, args);
}

/**
 * @internal
 */
export function createHIncrBy(
    key: GlideString,
    field: GlideString,
    amount: number,
): command_request.Command {
    return createCommand(RequestType.HIncrBy, [key, field, amount.toString()]);
}

/**
 * @internal
 */
export function createHIncrByFloat(
    key: GlideString,
    field: GlideString,
    amount: number,
): command_request.Command {
    return createCommand(RequestType.HIncrByFloat, [
        key,
        field,
        amount.toString(),
    ]);
}

/**
 * @internal
 */
export function createHLen(key: GlideString): command_request.Command {
    return createCommand(RequestType.HLen, [key]);
}

/**
 * @internal
 */
export function createHVals(key: GlideString): command_request.Command {
    return createCommand(RequestType.HVals, [key]);
}

/**
 * @internal
 */
export function createExists(keys: GlideString[]): command_request.Command {
    return createCommand(RequestType.Exists, keys);
}

/**
 * @internal
 */
export function createUnlink(keys: GlideString[]): command_request.Command {
    return createCommand(RequestType.Unlink, keys);
}

export enum ExpireOptions {
    /**
     * `HasNoExpiry` - Sets expiry only when the key has no expiry.
     */
    HasNoExpiry = "NX",
    /**
     * `HasExistingExpiry` - Sets expiry only when the key has an existing expiry.
     */
    HasExistingExpiry = "XX",
    /**
     * `NewExpiryGreaterThanCurrent` - Sets expiry only when the new expiry is
     * greater than current one.
     */
    NewExpiryGreaterThanCurrent = "GT",
    /**
     * `NewExpiryLessThanCurrent` - Sets expiry only when the new expiry is less
     * than current one.
     */
    NewExpiryLessThanCurrent = "LT",
}

/**
 * @internal
 */
export function createExpire(
    key: GlideString,
    seconds: number,
    option?: ExpireOptions,
): command_request.Command {
    const args =
        option == undefined
            ? [key, seconds.toString()]
            : [key, seconds.toString(), option];
    return createCommand(RequestType.Expire, args);
}

/**
 * @internal
 */
export function createExpireAt(
    key: GlideString,
    unixSeconds: number,
    option?: ExpireOptions,
): command_request.Command {
    const args =
        option == undefined
            ? [key, unixSeconds.toString()]
            : [key, unixSeconds.toString(), option];
    return createCommand(RequestType.ExpireAt, args);
}

/**
 * @internal
 */
export function createExpireTime(key: GlideString): command_request.Command {
    return createCommand(RequestType.ExpireTime, [key]);
}

/**
 * @internal
 */
export function createPExpire(
    key: GlideString,
    milliseconds: number,
    option?: ExpireOptions,
): command_request.Command {
    const args =
        option == undefined
            ? [key, milliseconds.toString()]
            : [key, milliseconds.toString(), option];
    return createCommand(RequestType.PExpire, args);
}

/**
 * @internal
 */
export function createPExpireAt(
    key: GlideString,
    unixMilliseconds: number,
    option?: ExpireOptions,
): command_request.Command {
    const args =
        option == undefined
            ? [key, unixMilliseconds.toString()]
            : [key, unixMilliseconds.toString(), option];
    return createCommand(RequestType.PExpireAt, args);
}

/**
 * @internal
 */
export function createPExpireTime(key: GlideString): command_request.Command {
    return createCommand(RequestType.PExpireTime, [key]);
}

/**
 * @internal
 */
export function createTTL(key: GlideString): command_request.Command {
    return createCommand(RequestType.TTL, [key]);
}

/**
 * Options for updating elements of a sorted set key.
 */
export enum UpdateByScore {
    /** Only update existing elements if the new score is less than the current score. */
    LESS_THAN = "LT",
    /** Only update existing elements if the new score is greater than the current score. */
    GREATER_THAN = "GT",
}

export interface ZAddOptions {
    /**
     * Options for handling existing members.
     */
    conditionalChange?: ConditionalChange;
    /**
     * Options for updating scores.
     */
    updateOptions?: UpdateByScore;
    /**
     * Modify the return value from the number of new elements added, to the total number of elements changed.
     */
    changed?: boolean;
}

/**
 * @internal
 * Convert input from `Record` to `SortedSetDataType` to ensure the only one type.
 */
export function convertElementsAndScores(
    membersAndScores: SortedSetDataType | Record<string, number>,
): SortedSetDataType {
    if (!Array.isArray(membersAndScores)) {
        // convert Record<string, number> to SortedSetDataType
        return Object.entries(membersAndScores).map((element) => {
            return { element: element[0], score: element[1] };
        });
    }

    return membersAndScores;
}

/**
 * @internal
 */
export function createZAdd(
    key: GlideString,
    membersAndScores: SortedSetDataType,
    options?: ZAddOptions,
    incr = false,
): command_request.Command {
    const args = [key];

    if (options) {
        if (options.conditionalChange) {
            if (
                options.conditionalChange ===
                    ConditionalChange.ONLY_IF_DOES_NOT_EXIST &&
                options.updateOptions
            ) {
                throw new Error(
                    `The GT, LT, and NX options are mutually exclusive. Cannot choose both ${options.updateOptions} and NX.`,
                );
            }

            args.push(options.conditionalChange);
        }

        if (options.updateOptions) {
            args.push(options.updateOptions);
        }

        if (options.changed) {
            args.push("CH");
        }
    }

    if (incr) {
        args.push("INCR");
    }

    membersAndScores.forEach((p) => args.push(p.score.toString(), p.element));
    return createCommand(RequestType.ZAdd, args);
}

/**
 * `KeyWeight` - pair of variables represents a weighted key for the `ZINTERSTORE` and `ZUNIONSTORE` sorted sets commands.
 */
export type KeyWeight = [GlideString, number];
/**
 * `AggregationType` - representing aggregation types for `ZINTERSTORE` and `ZUNIONSTORE` sorted set commands.
 */
export type AggregationType = "SUM" | "MIN" | "MAX";

/**
 * @internal
 */
export function createZInterstore(
    destination: GlideString,
    keys: GlideString[] | KeyWeight[],
    aggregationType?: AggregationType,
): command_request.Command {
    const args = createZCmdArgs(keys, {
        aggregationType,
        withScores: false,
        destination,
    });
    return createCommand(RequestType.ZInterStore, args);
}

/**
 * @internal
 */
export function createZInter(
    keys: GlideString[] | KeyWeight[],
    aggregationType?: AggregationType,
    withScores?: boolean,
): command_request.Command {
    const args = createZCmdArgs(keys, { aggregationType, withScores });
    return createCommand(RequestType.ZInter, args);
}

/**
 * @internal
 */
export function createZUnion(
    keys: GlideString[] | KeyWeight[],
    aggregationType?: AggregationType,
    withScores?: boolean,
): command_request.Command {
    const args = createZCmdArgs(keys, { aggregationType, withScores });
    return createCommand(RequestType.ZUnion, args);
}

/**
 * @internal
 * Helper function for Zcommands (ZInter, ZinterStore, ZUnion..) that arranges arguments in the server's required order.
 */
function createZCmdArgs(
    keys: GlideString[] | KeyWeight[],
    options: {
        aggregationType?: AggregationType;
        withScores?: boolean;
        destination?: GlideString;
    },
): GlideString[] {
    const args = [];

    const destination = options.destination;

    if (destination) {
        args.push(destination);
    }

    args.push(keys.length.toString());

    if (!Array.isArray(keys[0])) {
        // KeyWeight is an array
        args.push(...(keys as GlideString[]));
    } else {
        const weightsKeys = keys.map(([key]) => key);
        args.push(...(weightsKeys as GlideString[]));
        const weights = keys.map(([, weight]) => weight.toString());
        args.push("WEIGHTS", ...weights);
    }

    const aggregationType = options.aggregationType;

    if (aggregationType) {
        args.push("AGGREGATE", aggregationType);
    }

    if (options.withScores) {
        args.push("WITHSCORES");
    }

    return args;
}

/**
 * @internal
 */
export function createZRem(
    key: GlideString,
    members: GlideString[],
): command_request.Command {
    return createCommand(RequestType.ZRem, [key].concat(members));
}

/**
 * @internal
 */
export function createZCard(key: GlideString): command_request.Command {
    return createCommand(RequestType.ZCard, [key]);
}

/**
 * @internal
 */
export function createZInterCard(
    keys: GlideString[],
    limit?: number,
): command_request.Command {
    const args = keys;
    args.unshift(keys.length.toString());

    if (limit != undefined) {
        args.push("LIMIT", limit.toString());
    }

    return createCommand(RequestType.ZInterCard, args);
}

/**
 * @internal
 */
export function createZDiff(keys: GlideString[]): command_request.Command {
    const args = keys;
    args.unshift(keys.length.toString());
    return createCommand(RequestType.ZDiff, args);
}

/**
 * @internal
 */
export function createZDiffWithScores(
    keys: GlideString[],
): command_request.Command {
    const args = keys;
    args.unshift(keys.length.toString());
    args.push("WITHSCORES");
    return createCommand(RequestType.ZDiff, args);
}

/**
 * @internal
 */
export function createZDiffStore(
    destination: GlideString,
    keys: GlideString[],
): command_request.Command {
    const args = [destination, keys.length.toString(), ...keys];
    return createCommand(RequestType.ZDiffStore, args);
}

/**
 * @internal
 */
export function createZScore(
    key: GlideString,
    member: GlideString,
): command_request.Command {
    return createCommand(RequestType.ZScore, [key, member]);
}

/**
 * @internal
 */
export function createZUnionStore(
    destination: GlideString,
    keys: GlideString[] | KeyWeight[],
    aggregationType?: AggregationType,
): command_request.Command {
    const args = createZCmdArgs(keys, { destination, aggregationType });
    return createCommand(RequestType.ZUnionStore, args);
}

/**
 * @internal
 */
export function createZMScore(
    key: GlideString,
    members: GlideString[],
): command_request.Command {
    return createCommand(RequestType.ZMScore, [key, ...members]);
}

/**
 * @internal
 */
export function createScan(
    cursor: GlideString,
    options?: ScanOptions,
): command_request.Command {
    let args: GlideString[] = [cursor];

    if (options) {
        args = args.concat(convertBaseScanOptionsToArgsArray(options));
    }

    if (options?.type) {
        args.push("TYPE", options.type);
    }

    return createCommand(RequestType.Scan, args);
}

export enum InfBoundary {
    /**
     * Positive infinity bound.
     */
    PositiveInfinity = "+",
    /**
     * Negative infinity bound.
     */
    NegativeInfinity = "-",
}

/**
 * Defines the boundaries of a range.
 */
export type Boundary<T> =
    /**
     *  Represents an lower/upper boundary.
     */
    | InfBoundary
    /**
     *  Represents a specific boundary.
     */
    | {
          /**
           * The comparison value.
           */
          value: T;
          /**
           * Whether the value is inclusive. Defaults to `true`.
           */
          isInclusive?: boolean;
      };

/**
 * Represents a range by index (rank) in a sorted set.
 * The `start` and `end` arguments represent zero-based indexes.
 */
export interface RangeByIndex {
    /**
     * The start index of the range.
     */
    start: number;
    /**
     * The end index of the range.
     */
    end: number;
}

/**
 * Represents a range by score or a range by lex in a sorted set.
 * The `start` and `end` arguments represent score boundaries.
 */
interface SortedSetRange<T> {
    /**
     * The start boundary.
     */
    start: Boundary<T>;
    /**
     * The end boundary.
     */
    end: Boundary<T>;
    /**
     * The limit argument for a range query.
     * Represents a limit argument for a range query in a sorted set to
     * be used in [ZRANGE](https://valkey.io/commands/zrange) command.
     *
     * The optional LIMIT argument can be used to obtain a sub-range from the
     * matching elements (similar to SELECT LIMIT offset, count in SQL).
     */
    limit?: {
        /**
         * The offset from the start of the range.
         */
        offset: number;
        /**
         * The number of elements to include in the range.
         * A negative count returns all elements from the offset.
         */
        count: number;
    };
}

export type RangeByScore = SortedSetRange<number> & { type: "byScore" };
export type RangeByLex = SortedSetRange<GlideString> & { type: "byLex" };

/** Returns a string representation of a score boundary as a command argument. */
function getScoreBoundaryArg(score: Boundary<number>): string {
    if (typeof score === "string") {
        // InfBoundary
        return score + "inf";
    }

    if (score.isInclusive == false) {
        return "(" + score.value.toString();
    }

    return score.value.toString();
}

/** Returns a string representation of a lex boundary as a command argument. */
function getLexBoundaryArg(score: Boundary<GlideString>): GlideString {
    if (typeof score === "string") {
        // InfBoundary
        return score;
    }

    if (score.isInclusive == false) {
        return typeof score.value === "string"
            ? "(" + score.value
            : Buffer.concat([Buffer.from("("), score.value]);
    }

    return typeof score.value === "string"
        ? "[" + score.value
        : Buffer.concat([Buffer.from("["), score.value]);
}

/** Returns a string representation of a stream boundary as a command argument. */
function getStreamBoundaryArg(boundary: Boundary<string>): string {
    if (typeof boundary === "string") {
        // InfBoundary
        return boundary;
    }

    if (boundary.isInclusive == false) {
        return "(" + boundary.value.toString();
    }

    return boundary.value.toString();
}

function createZRangeArgs(
    key: GlideString,
    rangeQuery: RangeByScore | RangeByLex | RangeByIndex,
    reverse: boolean,
    withScores: boolean,
): GlideString[] {
    const args: GlideString[] = [key];

    if (typeof rangeQuery.start != "number") {
        rangeQuery = rangeQuery as RangeByScore | RangeByLex;

        if (rangeQuery.type == "byLex") {
            args.push(
                getLexBoundaryArg(rangeQuery.start),
                getLexBoundaryArg(rangeQuery.end),
                "BYLEX",
            );
        } else {
            args.push(
                getScoreBoundaryArg(rangeQuery.start),
                getScoreBoundaryArg(rangeQuery.end),
                "BYSCORE",
            );
        }
    } else {
        args.push(rangeQuery.start.toString());
        args.push(rangeQuery.end.toString());
    }

    if (reverse) {
        args.push("REV");
    }

    if ("limit" in rangeQuery && rangeQuery.limit !== undefined) {
        args.push(
            "LIMIT",
            String(rangeQuery.limit.offset),
            String(rangeQuery.limit.count),
        );
    }

    if (withScores) {
        args.push("WITHSCORES");
    }

    return args;
}

/**
 * @internal
 */
export function createZCount(
    key: GlideString,
    minScore: Boundary<number>,
    maxScore: Boundary<number>,
): command_request.Command {
    const args = [
        key,
        getScoreBoundaryArg(minScore),
        getScoreBoundaryArg(maxScore),
    ];
    return createCommand(RequestType.ZCount, args);
}

/**
 * @internal
 */
export function createZRange(
    key: GlideString,
    rangeQuery: RangeByIndex | RangeByScore | RangeByLex,
    reverse = false,
): command_request.Command {
    const args = createZRangeArgs(key, rangeQuery, reverse, false);
    return createCommand(RequestType.ZRange, args);
}

/**
 * @internal
 */
export function createZRangeWithScores(
    key: GlideString,
    rangeQuery: RangeByIndex | RangeByScore | RangeByLex,
    reverse = false,
): command_request.Command {
    const args = createZRangeArgs(key, rangeQuery, reverse, true);
    return createCommand(RequestType.ZRange, args);
}

/**
 * @internal
 */
export function createZRangeStore(
    destination: GlideString,
    source: GlideString,
    rangeQuery: RangeByIndex | RangeByScore | RangeByLex,
    reverse = false,
): command_request.Command {
    const args = [
        destination,
        ...createZRangeArgs(source, rangeQuery, reverse, false),
    ];
    return createCommand(RequestType.ZRangeStore, args);
}

/**
 * @internal
 */
export function createType(key: GlideString): command_request.Command {
    return createCommand(RequestType.Type, [key]);
}

/**
 * @internal
 */
export function createStrlen(key: GlideString): command_request.Command {
    return createCommand(RequestType.Strlen, [key]);
}

/**
 * @internal
 */
export function createLIndex(
    key: GlideString,
    index: number,
): command_request.Command {
    return createCommand(RequestType.LIndex, [key, index.toString()]);
}

/**
 * Defines where to insert new elements into a list.
 */
export enum InsertPosition {
    /**
     * Insert new element before the pivot.
     */
    Before = "before",
    /**
     * Insert new element after the pivot.
     */
    After = "after",
}

/**
 * @internal
 */
export function createLInsert(
    key: GlideString,
    position: InsertPosition,
    pivot: GlideString,
    element: GlideString,
): command_request.Command {
    return createCommand(RequestType.LInsert, [key, position, pivot, element]);
}

/**
 * @internal
 */
export function createZPopMin(
    key: GlideString,
    count?: number,
): command_request.Command {
    const args = count == undefined ? [key] : [key, count.toString()];
    return createCommand(RequestType.ZPopMin, args);
}

/**
 * @internal
 */
export function createZPopMax(
    key: GlideString,
    count?: number,
): command_request.Command {
    const args = count == undefined ? [key] : [key, count.toString()];
    return createCommand(RequestType.ZPopMax, args);
}

/**
 * @internal
 */
export function createEcho(message: GlideString): command_request.Command {
    return createCommand(RequestType.Echo, [message]);
}

/**
 * @internal
 */
export function createPTTL(key: GlideString): command_request.Command {
    return createCommand(RequestType.PTTL, [key]);
}

/**
 * @internal
 */
export function createZRemRangeByRank(
    key: GlideString,
    start: number,
    end: number,
): command_request.Command {
    return createCommand(RequestType.ZRemRangeByRank, [
        key,
        start.toString(),
        end.toString(),
    ]);
}

/**
 * @internal
 */
export function createZRemRangeByLex(
    key: GlideString,
    minLex: Boundary<GlideString>,
    maxLex: Boundary<GlideString>,
): command_request.Command {
    const args = [key, getLexBoundaryArg(minLex), getLexBoundaryArg(maxLex)];
    return createCommand(RequestType.ZRemRangeByLex, args);
}

/**
 * @internal
 */
export function createZRemRangeByScore(
    key: GlideString,
    minScore: Boundary<number>,
    maxScore: Boundary<number>,
): command_request.Command {
    const args = [
        key,
        getScoreBoundaryArg(minScore),
        getScoreBoundaryArg(maxScore),
    ];
    return createCommand(RequestType.ZRemRangeByScore, args);
}

/** @internal */
export function createPersist(key: GlideString): command_request.Command {
    return createCommand(RequestType.Persist, [key]);
}

/**
 * @internal
 */
export function createZLexCount(
    key: GlideString,
    minLex: Boundary<GlideString>,
    maxLex: Boundary<GlideString>,
): command_request.Command {
    const args = [key, getLexBoundaryArg(minLex), getLexBoundaryArg(maxLex)];
    return createCommand(RequestType.ZLexCount, args);
}

/** @internal */
export function createZRank(
    key: GlideString,
    member: GlideString,
    withScores?: boolean,
): command_request.Command {
    const args = [key, member];

    if (withScores) {
        args.push("WITHSCORE");
    }

    return createCommand(RequestType.ZRank, args);
}

export type StreamTrimOptions = (
    | {
          /**
           * Trim the stream according to entry ID.
           * Equivalent to `MINID` in the Valkey API.
           */
          method: "minid";
          threshold: GlideString;
      }
    | {
          /**
           * Trim the stream according to length.
           * Equivalent to `MAXLEN` in the Valkey API.
           */
          method: "maxlen";
          threshold: number;
      }
) & {
    /**
     * If `true`, the stream will be trimmed exactly. Equivalent to `=` in the
     * Valkey API. Otherwise the stream will be trimmed in a near-exact manner,
     * which is more efficient, equivalent to `~` in the Valkey API.
     */
    exact: boolean;
    /**
     * If set, sets the maximal amount of entries that will be deleted.
     */
    limit?: number;
};

export interface StreamAddOptions {
    /**
     * If set, the new entry will be added with this ID.
     */
    id?: string;
    /**
     * If set to `false`, a new stream won't be created if no stream matches the
     * given key. Equivalent to `NOMKSTREAM` in the Valkey API.
     */
    makeStream?: boolean;
    /**
     * If set, the add operation will also trim the older entries in the stream.
     */
    trim?: StreamTrimOptions;
}

function addTrimOptions(options: StreamTrimOptions, args: GlideString[]) {
    if (options.method === "maxlen") {
        args.push("MAXLEN");
    } else if (options.method === "minid") {
        args.push("MINID");
    }

    if (options.exact) {
        args.push("=");
    } else {
        args.push("~");
    }

    if (options.method === "maxlen") {
        args.push(options.threshold.toString());
    } else if (options.method === "minid") {
        args.push(options.threshold);
    }

    if (options.limit) {
        args.push("LIMIT");
        args.push(options.limit.toString());
    }
}

/**
 * @internal
 */
export function createXAdd(
    key: GlideString,
    values: [GlideString, GlideString][],
    options?: StreamAddOptions,
): command_request.Command {
    const args = [key];

    if (options?.makeStream === false) {
        args.push("NOMKSTREAM");
    }

    if (options?.trim) {
        addTrimOptions(options.trim, args);
    }

    if (options?.id) {
        args.push(options.id);
    } else {
        args.push("*");
    }

    values.forEach(([field, value]) => {
        args.push(field);
        args.push(value);
    });

    return createCommand(RequestType.XAdd, args);
}

/**
 * @internal
 */
export function createXDel(
    key: GlideString,
    ids: string[],
): command_request.Command {
    return createCommand(RequestType.XDel, [key, ...ids]);
}

/**
 * @internal
 */
export function createXTrim(
    key: GlideString,
    options: StreamTrimOptions,
): command_request.Command {
    const args = [key];
    addTrimOptions(options, args);
    return createCommand(RequestType.XTrim, args);
}

/**
 * @internal
 */
export function createXRange(
    key: GlideString,
    start: Boundary<string>,
    end: Boundary<string>,
    count?: number,
): command_request.Command {
    const args = [key, getStreamBoundaryArg(start), getStreamBoundaryArg(end)];

    if (count !== undefined) {
        args.push("COUNT");
        args.push(count.toString());
    }

    return createCommand(RequestType.XRange, args);
}

/**
 * @internal
 */
export function createXRevRange(
    key: GlideString,
    start: Boundary<string>,
    end: Boundary<string>,
    count?: number,
): command_request.Command {
    const args = [key, getStreamBoundaryArg(start), getStreamBoundaryArg(end)];

    if (count !== undefined) {
        args.push("COUNT");
        args.push(count.toString());
    }

    return createCommand(RequestType.XRevRange, args);
}

/**
 * @internal
 */
export function createXGroupCreateConsumer(
    key: GlideString,
    groupName: GlideString,
    consumerName: GlideString,
): command_request.Command {
    return createCommand(RequestType.XGroupCreateConsumer, [
        key,
        groupName,
        consumerName,
    ]);
}

/**
 * @internal
 */
export function createXGroupDelConsumer(
    key: GlideString,
    groupName: GlideString,
    consumerName: GlideString,
): command_request.Command {
    return createCommand(RequestType.XGroupDelConsumer, [
        key,
        groupName,
        consumerName,
    ]);
}

/**
 * @internal
 */
export function createTime(): command_request.Command {
    return createCommand(RequestType.Time, []);
}

/**
 * @internal
 */
export function createPublish(
    message: GlideString,
    channel: GlideString,
    sharded = false,
): command_request.Command {
    const request = sharded ? RequestType.SPublish : RequestType.Publish;
    return createCommand(request, [channel, message]);
}

/**
 * @internal
 */
export function createBRPop(
    keys: GlideString[],
    timeout: number,
): command_request.Command {
    const args = [...keys, timeout.toString()];
    return createCommand(RequestType.BRPop, args);
}

/**
 * @internal
 */
export function createBLPop(
    keys: GlideString[],
    timeout: number,
): command_request.Command {
    const args = [...keys, timeout.toString()];
    return createCommand(RequestType.BLPop, args);
}

/**
 * @internal
 */
export function createFCall(
    func: GlideString,
    keys: GlideString[],
    args: GlideString[],
): command_request.Command {
    const params: GlideString[] = [
        func,
        keys.length.toString(),
        ...keys,
        ...args,
    ];
    return createCommand(RequestType.FCall, params);
}

/**
 * @internal
 */
export function createFCallReadOnly(
    func: GlideString,
    keys: GlideString[],
    args: GlideString[],
): command_request.Command {
    const params: GlideString[] = [
        func,
        keys.length.toString(),
        ...keys,
        ...args,
    ];
    return createCommand(RequestType.FCallReadOnly, params);
}

/**
 * @internal
 */
export function createFunctionDelete(
    libraryCode: GlideString,
): command_request.Command {
    return createCommand(RequestType.FunctionDelete, [libraryCode]);
}

/**
 * @internal
 */
export function createFunctionFlush(mode?: FlushMode): command_request.Command {
    if (mode) {
        return createCommand(RequestType.FunctionFlush, [mode.toString()]);
    } else {
        return createCommand(RequestType.FunctionFlush, []);
    }
}

/**
 * @internal
 */
export function createFunctionLoad(
    libraryCode: GlideString,
    replace?: boolean,
): command_request.Command {
    const args = replace ? ["REPLACE", libraryCode] : [libraryCode];
    return createCommand(RequestType.FunctionLoad, args);
}

/** Optional arguments for `FUNCTION LIST` command. */
export interface FunctionListOptions {
    /** A wildcard pattern for matching library names. */
    libNamePattern?: GlideString;
    /** Specifies whether to request the library code from the server or not. */
    withCode?: boolean;
}

/** Type of the response of `FUNCTION LIST` command. */
export type FunctionListResponse = Record<
    string,
    GlideString | Record<string, GlideString | null | GlideString[]>[]
>[];

/**
 * @internal
 */
export function createFunctionList(
    options?: FunctionListOptions,
): command_request.Command {
    const args: GlideString[] = [];

    if (options) {
        if (options.libNamePattern) {
            args.push("LIBRARYNAME", options.libNamePattern);
        }

        if (options.withCode) {
            args.push("WITHCODE");
        }
    }

    return createCommand(RequestType.FunctionList, args);
}

/** Response for `FUNCTION STATS` command on a single node.
 *  The response is a map with 2 keys:
 *  1. Information about the current running function/script (or null if none).
 *  2. Details about the execution engines.
 */
export type FunctionStatsSingleResponse = Record<
    string,
    | null
    | Record<string, GlideString | GlideString[] | number> // Running function/script information
    | Record<string, Record<string, number>> // Execution engines information
>;

/** Full response for `FUNCTION STATS` command across multiple nodes.
 *  It maps node addresses to the per-node response.
 */
export type FunctionStatsFullResponse = Record<
    string, // Node address
    FunctionStatsSingleResponse
>;

/** @internal */
export function createFunctionStats(): command_request.Command {
    return createCommand(RequestType.FunctionStats, []);
}

/** @internal */
export function createFunctionKill(): command_request.Command {
    return createCommand(RequestType.FunctionKill, []);
}

/** @internal */
export function createFunctionDump(): command_request.Command {
    return createCommand(RequestType.FunctionDump, []);
}

/**
 * Option for `FUNCTION RESTORE` command: {@link GlideClient.functionRestore} and
 * {@link GlideClusterClient.functionRestore}.
 *
 * @see {@link https://valkey.io/commands/function-restore/"|valkey.io} for more details.
 */
export enum FunctionRestorePolicy {
    /**
     * Appends the restored libraries to the existing libraries and aborts on collision. This is the
     * default policy.
     */
    APPEND = "APPEND",
    /** Deletes all existing libraries before restoring the payload. */
    FLUSH = "FLUSH",
    /**
     * Appends the restored libraries to the existing libraries, replacing any existing ones in case
     * of name collisions. Note that this policy doesn't prevent function name collisions, only
     * libraries.
     */
    REPLACE = "REPLACE",
}

/** @internal */
export function createFunctionRestore(
    data: Buffer,
    policy?: FunctionRestorePolicy,
): command_request.Command {
    return createCommand(
        RequestType.FunctionRestore,
        policy ? [data, policy] : [data],
    );
}

/**
 * Represents offsets specifying a string interval to analyze in the {@link BaseClient.bitcount | bitcount} and {@link BaseClient.bitpos | bitpos} commands.
 * The offsets are zero-based indexes, with `0` being the first index of the string, `1` being the next index and so on.
 * The offsets can also be negative numbers indicating offsets starting at the end of the string, with `-1` being
 * the last index of the string, `-2` being the penultimate, and so on.
 *
 * If you are using Valkey 7.0.0 or above, the optional `indexType` can also be provided to specify whether the
 * `start` and `end` offsets specify `BIT` or `BYTE` offsets. If `indexType` is not provided, `BYTE` offsets
 * are assumed. If `BIT` is specified, `start=0` and `end=2` means to look at the first three bits. If `BYTE` is
 * specified, `start=0` and `end=2` means to look at the first three bytes.
 *
 * @see {@link https://valkey.io/commands/bitcount/ | bitcount} and {@link https://valkey.io/commands/bitpos/ | bitpos} for more details.
 */
export interface BitOffsetOptions {
    /** The starting offset index. */
    start: number;
    /**
     * The ending offset index. Optional since Valkey version 8.0 and above for the BITCOUNT command.
     * If not provided, it will default to the end of the string.
     * Could be defined only if `start` is defined.
     */
    end?: number;
    /**
     * The index offset type. This option can only be specified if you are using server version 7.0.0 or above.
     * Could be either {@link BitmapIndexType.BYTE} or {@link BitmapIndexType.BIT}.
     * If no index type is provided, the indexes will be assumed to be byte indexes.
     */
    indexType?: BitmapIndexType;
}

/**
 * @internal
 */
function convertBitOptionsToArgs(options?: BitOffsetOptions): GlideString[] {
    const args: GlideString[] = [];
    if (!options) return args;

    args.push(options.start.toString());

    if (options.end !== undefined) {
        args.push(options.end.toString());

        if (options.indexType) args.push(options.indexType);
    }

    return args;
}

/**
 * @internal
 */
export function createBitCount(
    key: GlideString,
    options?: BitOffsetOptions,
): command_request.Command {
    let args: GlideString[] = [key];

    if (options) {
        const optionResults: GlideString[] = convertBitOptionsToArgs(options);
        args = args.concat(optionResults);
    }

    return createCommand(RequestType.BitCount, args);
}

/**
 * Enumeration specifying if index arguments are BYTE indexes or BIT indexes.
 * Can be specified in {@link BitOffsetOptions}, which is an optional argument to the {@link BaseClient.bitcount|bitcount} command.
 * Can also be specified as an optional argument to the {@link BaseClient.bitposInverval|bitposInterval} command.
 *
 * since - Valkey version 7.0.0.
 */
export enum BitmapIndexType {
    /** Specifies that provided indexes are byte indexes. */
    BYTE = "BYTE",

    /** Specifies that provided indexes are bit indexes. */
    BIT = "BIT",
}

/**
 * @internal
 */
export function createBitPos(
    key: GlideString,
    bit: number,
    options?: BitOffsetOptions,
): command_request.Command {
    const args: GlideString[] = [
        key,
        bit.toString(),
        ...convertBitOptionsToArgs(options),
    ];

    return createCommand(RequestType.BitPos, args);
}

/**
 * Defines flushing mode for {@link GlideClient.flushall}, {@link GlideClusterClient.flushall},
 *      {@link GlideClient.functionFlush}, {@link GlideClusterClient.functionFlush},
 *      {@link GlideClient.flushdb} and {@link GlideClusterClient.flushdb} commands.
 *
 * See https://valkey.io/commands/flushall/ and https://valkey.io/commands/flushdb/ for details.
 */
export enum FlushMode {
    /**
     * Flushes synchronously.
     *
     * since Valkey version 6.2.0.
     */
    SYNC = "SYNC",
    /** Flushes asynchronously. */
    ASYNC = "ASYNC",
}

/**
 * @internal
 * This function converts an input from Record or GlideRecord types to GlideRecord.
 *
 * @param record - input record in either Record or GlideRecord types.
 * @returns same data in GlideRecord type.
 */
export function convertKeysAndEntries(
    record: Record<string, string> | GlideRecord<string>,
): GlideRecord<string> {
    if (!Array.isArray(record)) {
        return convertRecordToGlideRecord(record);
    }

    return record;
}

/** Optional arguments for {@link BaseClient.xread|xread} command. */
export interface StreamReadOptions {
    /**
     * If set, the read request will block for the set amount of milliseconds or
     * until the server has the required number of entries. A value of `0` will block indefinitely.
     * Equivalent to `BLOCK` in the Valkey API.
     */
    block?: number;
    /**
     * The maximal number of elements requested.
     * Equivalent to `COUNT` in the Valkey API.
     */
    count?: number;
}

/** Optional arguments for {@link BaseClient.xreadgroup|xreadgroup} command. */
export type StreamReadGroupOptions = StreamReadOptions & {
    /**
     * If set, messages are not added to the Pending Entries List (PEL). This is equivalent to
     * acknowledging the message when it is read.
     */
    noAck?: boolean;
};

/** @internal */
function addReadOptions(options?: StreamReadOptions): GlideString[] {
    const args = [];

    if (options?.count !== undefined) {
        args.push("COUNT");
        args.push(options.count.toString());
    }

    if (options?.block !== undefined) {
        args.push("BLOCK");
        args.push(options.block.toString());
    }

    return args;
}

/** @internal */
function addStreamsArgs(keys_and_ids: GlideRecord<string>): GlideString[] {
    return [
        "STREAMS",
        ...keys_and_ids.map((e) => e.key),
        ...keys_and_ids.map((e) => e.value),
    ];
}

/**
 * @internal
 */
export function createXRead(
    keys_and_ids: GlideRecord<string>,
    options?: StreamReadOptions,
): command_request.Command {
    const args = addReadOptions(options);
    args.push(...addStreamsArgs(keys_and_ids));
    return createCommand(RequestType.XRead, args);
}

/** @internal */
export function createXReadGroup(
    group: GlideString,
    consumer: GlideString,
    keys_and_ids: GlideRecord<string>,
    options?: StreamReadGroupOptions,
): command_request.Command {
    const args: GlideString[] = ["GROUP", group, consumer];

    if (options) {
        args.push(...addReadOptions(options));
        if (options.noAck) args.push("NOACK");
    }

    args.push(...addStreamsArgs(keys_and_ids));

    return createCommand(RequestType.XReadGroup, args);
}

/**
 * @internal
 */
export function createXInfoStream(
    key: GlideString,
    options: boolean | number,
): command_request.Command {
    const args: GlideString[] = [key];

    if (options != false) {
        args.push("FULL");

        if (typeof options === "number") {
            args.push("COUNT");
            args.push(options.toString());
        }
    }

    return createCommand(RequestType.XInfoStream, args);
}

/** @internal */
export function createXInfoGroups(key: GlideString): command_request.Command {
    return createCommand(RequestType.XInfoGroups, [key]);
}

/**
 * @internal
 */
export function createXLen(key: GlideString): command_request.Command {
    return createCommand(RequestType.XLen, [key]);
}

/** Optional arguments for {@link BaseClient.xpendingWithOptions|xpending}. */
export interface StreamPendingOptions {
    /** Filter pending entries by their idle time - in milliseconds. Available since Valkey 6.2.0. */
    minIdleTime?: number;
    /** Starting stream ID bound for range. Exclusive range is available since Valkey 6.2.0. */
    start: Boundary<string>;
    /** Ending stream ID bound for range. Exclusive range is available since Valkey 6.2.0. */
    end: Boundary<string>;
    /** Limit the number of messages returned. */
    count: number;
    /** Filter pending entries by consumer. */
    consumer?: GlideString;
}

/** @internal */
export function createXPending(
    key: GlideString,
    group: GlideString,
    options?: StreamPendingOptions,
): command_request.Command {
    const args = [key, group];

    if (options) {
        if (options.minIdleTime !== undefined)
            args.push("IDLE", options.minIdleTime.toString());
        args.push(
            getStreamBoundaryArg(options.start),
            getStreamBoundaryArg(options.end),
            options.count.toString(),
        );
        if (options.consumer) args.push(options.consumer);
    }

    return createCommand(RequestType.XPending, args);
}

/** @internal */
export function createXInfoConsumers(
    key: GlideString,
    group: GlideString,
): command_request.Command {
    return createCommand(RequestType.XInfoConsumers, [key, group]);
}

/** Optional parameters for {@link BaseClient.xclaim|xclaim} command. */
export interface StreamClaimOptions {
    /**
     * Set the idle time (last time it was delivered) of the message in milliseconds. If `idle`
     * is not specified, an `idle` of `0` is assumed, that is, the time count is reset
     * because the message now has a new owner trying to process it.
     */
    idle?: number; // in milliseconds

    /**
     * This is the same as {@link idle} but instead of a relative amount of milliseconds, it sets the
     * idle time to a specific Unix time (in milliseconds). This is useful in order to rewrite the AOF
     * file generating `XCLAIM` commands.
     */
    idleUnixTime?: number; // in unix-time milliseconds

    /**
     * Set the retry counter to the specified value. This counter is incremented every time a message
     * is delivered again. Normally {@link BaseClient.xclaim|xclaim} does not alter this counter,
     * which is just served to clients when the {@link BaseClient.xpending|xpending} command is called:
     * this way clients can detect anomalies, like messages that are never processed for some reason
     * after a big number of delivery attempts.
     */
    retryCount?: number;

    /**
     * Creates the pending message entry in the PEL even if certain specified IDs are not already in
     * the PEL assigned to a different client. However, the message must exist in the stream,
     * otherwise the IDs of non-existing messages are ignored.
     */
    isForce?: boolean;
}

/** @internal */
export function createXClaim(
    key: GlideString,
    group: GlideString,
    consumer: GlideString,
    minIdleTime: number,
    ids: string[],
    options?: StreamClaimOptions,
    justId?: boolean,
): command_request.Command {
    const args = [key, group, consumer, minIdleTime.toString(), ...ids];

    if (options) {
        if (options.idle !== undefined)
            args.push("IDLE", options.idle.toString());
        if (options.idleUnixTime !== undefined)
            args.push("TIME", options.idleUnixTime.toString());
        if (options.retryCount !== undefined)
            args.push("RETRYCOUNT", options.retryCount.toString());
        if (options.isForce) args.push("FORCE");
    }

    if (justId) args.push("JUSTID");
    return createCommand(RequestType.XClaim, args);
}

/** @internal */
export function createXAutoClaim(
    key: GlideString,
    group: GlideString,
    consumer: GlideString,
    minIdleTime: number,
    start: GlideString,
    count?: number,
    justId?: boolean,
): command_request.Command {
    const args = [
        key,
        group,
        consumer,
        minIdleTime.toString(),
        start.toString(),
    ];
    if (count !== undefined) args.push("COUNT", count.toString());
    if (justId) args.push("JUSTID");
    return createCommand(RequestType.XAutoClaim, args);
}

/**
 * Optional arguments for {@link BaseClient.xgroupCreate|xgroupCreate}.
 *
 * See https://valkey.io/commands/xgroup-create/ for more details.
 */
export interface StreamGroupOptions {
    /**
     * If `true`and the stream doesn't exist, creates a new stream with a length of `0`.
     */
    mkStream?: boolean;
    /**
     * An arbitrary ID (that isn't the first ID, last ID, or the zero `"0-0"`. Use it to
     * find out how many entries are between the arbitrary ID (excluding it) and the stream's last
     * entry.
     *
     * since Valkey version 7.0.0.
     */
    entriesRead?: string;
}

/**
 * @internal
 */
export function createXGroupCreate(
    key: GlideString,
    groupName: GlideString,
    id: string,
    options?: StreamGroupOptions,
): command_request.Command {
    const args: GlideString[] = [key, groupName, id];

    if (options) {
        if (options.mkStream) {
            args.push("MKSTREAM");
        }

        if (options.entriesRead) {
            args.push("ENTRIESREAD");
            args.push(options.entriesRead);
        }
    }

    return createCommand(RequestType.XGroupCreate, args);
}

/**
 * @internal
 */
export function createXGroupDestroy(
    key: GlideString,
    groupName: GlideString,
): command_request.Command {
    return createCommand(RequestType.XGroupDestroy, [key, groupName]);
}

/**
 * @internal
 */
export function createRename(
    key: GlideString,
    newKey: GlideString,
): command_request.Command {
    return createCommand(RequestType.Rename, [key, newKey]);
}

/**
 * @internal
 */
export function createRenameNX(
    key: GlideString,
    newKey: GlideString,
): command_request.Command {
    return createCommand(RequestType.RenameNX, [key, newKey]);
}

/**
 * @internal
 */
export function createPfAdd(
    key: GlideString,
    elements: GlideString[],
): command_request.Command {
    const args = [key, ...elements];
    return createCommand(RequestType.PfAdd, args);
}

/**
 * @internal
 */
export function createPfCount(keys: GlideString[]): command_request.Command {
    return createCommand(RequestType.PfCount, keys);
}

/**
 * @internal
 */
export function createPfMerge(
    destination: GlideString,
    sourceKey: GlideString[],
): command_request.Command {
    return createCommand(RequestType.PfMerge, [destination, ...sourceKey]);
}

/**
 * @internal
 */
export function createObjectEncoding(
    key: GlideString,
): command_request.Command {
    return createCommand(RequestType.ObjectEncoding, [key]);
}

/**
 * @internal
 */
export function createObjectFreq(key: GlideString): command_request.Command {
    return createCommand(RequestType.ObjectFreq, [key]);
}

/**
 * @internal
 */
export function createObjectIdletime(
    key: GlideString,
): command_request.Command {
    return createCommand(RequestType.ObjectIdleTime, [key]);
}

/**
 * @internal
 */
export function createObjectRefcount(
    key: GlideString,
): command_request.Command {
    return createCommand(RequestType.ObjectRefCount, [key]);
}

/** Additional parameters for `LOLWUT` command. */
export interface LolwutOptions {
    /**
     * An optional argument that can be used to specify the version of computer art to generate.
     */
    version?: number;
    /**
     * An optional argument that can be used to specify the output:
     * - For version `5`, those are length of the line, number of squares per row, and number of squares per column.
     * - For version `6`, those are number of columns and number of lines.
     */
    parameters?: number[];
}

/**
 * @internal
 */
export function createLolwut(options?: LolwutOptions): command_request.Command {
    const args: string[] = [];

    if (options) {
        if (options.version !== undefined) {
            args.push("VERSION", options.version.toString());
        }

        if (options.parameters !== undefined) {
            args.push(...options.parameters.map((param) => param.toString()));
        }
    }

    return createCommand(RequestType.Lolwut, args);
}

/**
 * @internal
 */
export function createFlushAll(mode?: FlushMode): command_request.Command {
    if (mode) {
        return createCommand(RequestType.FlushAll, [mode.toString()]);
    } else {
        return createCommand(RequestType.FlushAll, []);
    }
}

/**
 * @internal
 */
export function createFlushDB(mode?: FlushMode): command_request.Command {
    if (mode) {
        return createCommand(RequestType.FlushDB, [mode.toString()]);
    } else {
        return createCommand(RequestType.FlushDB, []);
    }
}

/**
 * @internal
 */
export function createCopy(
    source: GlideString,
    destination: GlideString,
    options?: { destinationDB?: number; replace?: boolean },
): command_request.Command {
    let args = [source, destination];

    if (options) {
        if (options.destinationDB !== undefined) {
            args = args.concat("DB", options.destinationDB.toString());
        }

        if (options.replace) {
            args.push("REPLACE");
        }
    }

    return createCommand(RequestType.Copy, args);
}

/**
 * @internal
 */
export function createMove(
    key: GlideString,
    dbIndex: number,
): command_request.Command {
    return createCommand(RequestType.Move, [key, dbIndex.toString()]);
}

/**
 * @internal
 */
export function createDump(key: GlideString): command_request.Command {
    return createCommand(RequestType.Dump, [key]);
}

/**
 * Optional arguments for `RESTORE` command.
 *
 * @See {@link https://valkey.io/commands/restore/|valkey.io} for details.
 * @remarks `IDLETIME` and `FREQ` modifiers cannot be set at the same time.
 */
export interface RestoreOptions {
    /**
     * Set to `true` to replace the key if it exists.
     */
    replace?: boolean;
    /**
     * Set to `true` to specify that `ttl` argument of {@link BaseClient.restore} represents
     * an absolute Unix timestamp (in milliseconds).
     */
    absttl?: boolean;
    /**
     * Set the `IDLETIME` option with object idletime to the given key.
     */
    idletime?: number;
    /**
     * Set the `FREQ` option with object frequency to the given key.
     */
    frequency?: number;
}

/**
 * @internal
 */
export function createRestore(
    key: GlideString,
    ttl: number,
    value: GlideString,
    options?: RestoreOptions,
): command_request.Command {
    const args: GlideString[] = [key, ttl.toString(), value];

    if (options) {
        if (options.idletime !== undefined && options.frequency !== undefined) {
            throw new Error(
                `syntax error: both IDLETIME and FREQ cannot be set at the same time.`,
            );
        }

        if (options.replace) {
            args.push("REPLACE");
        }

        if (options.absttl) {
            args.push("ABSTTL");
        }

        if (options.idletime !== undefined) {
            args.push("IDLETIME", options.idletime.toString());
        }

        if (options.frequency !== undefined) {
            args.push("FREQ", options.frequency.toString());
        }
    }

    return createCommand(RequestType.Restore, args);
}

/**
 * Optional arguments to LPOS command.
 *
 * See https://valkey.io/commands/lpos/ for more details.
 */
export interface LPosOptions {
    /** The rank of the match to return. */
    rank?: number;
    /** The specific number of matching indices from a list. */
    count?: number;
    /** The maximum number of comparisons to make between the element and the items in the list. */
    maxLength?: number;
}

/**
 * @internal
 */
export function createLPos(
    key: GlideString,
    element: GlideString,
    options?: LPosOptions,
): command_request.Command {
    const args: GlideString[] = [key, element];

    if (options) {
        if (options.rank !== undefined) {
            args.push("RANK");
            args.push(options.rank.toString());
        }

        if (options.count !== undefined) {
            args.push("COUNT");
            args.push(options.count.toString());
        }

        if (options.maxLength !== undefined) {
            args.push("MAXLEN");
            args.push(options.maxLength.toString());
        }
    }

    return createCommand(RequestType.LPos, args);
}

/**
 * @internal
 */
export function createDBSize(): command_request.Command {
    return createCommand(RequestType.DBSize, []);
}

/**
 * An optional condition to the {@link BaseClient.geoadd | geoadd},
 * {@link BaseClient.zadd | zadd} and {@link BaseClient.set | set} commands.
 */
export enum ConditionalChange {
    /**
     * Only update elements that already exist. Don't add new elements. Equivalent to `XX` in the Valkey API.
     */
    ONLY_IF_EXISTS = "XX",

    /**
     * Only add new elements. Don't update already existing elements. Equivalent to `NX` in the Valkey API.
     */
    ONLY_IF_DOES_NOT_EXIST = "NX",
}

/**
 * Represents a geographic position defined by longitude and latitude.
 * The exact limits, as specified by `EPSG:900913 / EPSG:3785 / OSGEO:41001` are the
 * following:
 *
 *   Valid longitudes are from `-180` to `180` degrees.
 *   Valid latitudes are from `-85.05112878` to `85.05112878` degrees.
 */
export interface GeospatialData {
    /** The longitude coordinate. */
    longitude: number;
    /** The latitude coordinate. */
    latitude: number;
}

/**
 * Optional arguments for the GeoAdd command.
 *
 * See https://valkey.io/commands/geoadd/ for more details.
 */
export interface GeoAddOptions {
    /** Options for handling existing members. See {@link ConditionalChange}. */
    updateMode?: ConditionalChange;
    /** If `true`, returns the count of changed elements instead of new elements added. */
    changed?: boolean;
}

/**
 * @internal
 */
export function createGeoAdd(
    key: GlideString,
    membersToGeospatialData: Map<GlideString, GeospatialData>,
    options?: GeoAddOptions,
): command_request.Command {
    let args: GlideString[] = [key];

    if (options) {
        if (options.updateMode) {
            args.push(options.updateMode);
        }

        if (options.changed) {
            args.push("CH");
        }
    }

    membersToGeospatialData.forEach((coord, member) => {
        args = args.concat(
            coord.longitude.toString(),
            coord.latitude.toString(),
            member,
        );
    });
    return createCommand(RequestType.GeoAdd, args);
}

/** Enumeration representing distance units options. */
export enum GeoUnit {
    /** Represents distance in meters. */
    METERS = "m",
    /** Represents distance in kilometers. */
    KILOMETERS = "km",
    /** Represents distance in miles. */
    MILES = "mi",
    /** Represents distance in feet. */
    FEET = "ft",
}

/**
 * @internal
 */
export function createGeoPos(
    key: GlideString,
    members: GlideString[],
): command_request.Command {
    return createCommand(RequestType.GeoPos, [key].concat(members));
}

/**
 * @internal
 */
export function createGeoDist(
    key: GlideString,
    member1: GlideString,
    member2: GlideString,
    geoUnit?: GeoUnit,
): command_request.Command {
    const args = [key, member1, member2];

    if (geoUnit) {
        args.push(geoUnit);
    }

    return createCommand(RequestType.GeoDist, args);
}

/**
 * @internal
 */
export function createGeoHash(
    key: GlideString,
    members: GlideString[],
): command_request.Command {
    const args = [key].concat(members);
    return createCommand(RequestType.GeoHash, args);
}

/**
 * Optional parameters for {@link BaseClient.geosearch|geosearch} command which defines what should be included in the
 * search results and how results should be ordered and limited.
 */
export type GeoSearchResultOptions = GeoSearchCommonResultOptions & {
    /** Include the coordinate of the returned items. */
    withCoord?: boolean;
    /**
     * Include the distance of the returned items from the specified center point.
     * The distance is returned in the same unit as specified for the `searchBy` argument.
     */
    withDist?: boolean;
    /** Include the geohash of the returned items. */
    withHash?: boolean;
};

/**
 * Optional parameters for {@link BaseClient.geosearchstore|geosearchstore} command which defines what should be included in the
 * search results and how results should be ordered and limited.
 */
export type GeoSearchStoreResultOptions = GeoSearchCommonResultOptions & {
    /**
     * Determines what is stored as the sorted set score. Defaults to `false`.
     * - If set to `false`, the geohash of the location will be stored as the sorted set score.
     * - If set to `true`, the distance from the center of the shape (circle or box) will be stored as the sorted set score. The distance is represented as a floating-point number in the same unit specified for that shape.
     */
    storeDist?: boolean;
};

interface GeoSearchCommonResultOptions {
    /** Indicates the order the result should be sorted in. */
    sortOrder?: SortOrder;
    /** Indicates the number of matches the result should be limited to. */
    count?: number;
    /** Whether to allow returning as enough matches are found. This requires `count` parameter to be set. */
    isAny?: boolean;
}

/** Defines the sort order for nested results. */
export enum SortOrder {
    /** Sort by ascending order. */
    ASC = "ASC",
    /** Sort by descending order. */
    DESC = "DESC",
}

export type GeoSearchShape = GeoCircleShape | GeoBoxShape;

/** Circle search shape defined by the radius value and measurement unit. */
export interface GeoCircleShape {
    /** The radius to search by. */
    radius: number;
    /** The measurement unit of the radius. */
    unit: GeoUnit;
}

/** Rectangle search shape defined by the width and height and measurement unit. */
export interface GeoBoxShape {
    /** The width of the rectangle to search by. */
    width: number;
    /** The height of the rectangle to search by. */
    height: number;
    /** The measurement unit of the width and height. */
    unit: GeoUnit;
}

export type SearchOrigin = CoordOrigin | MemberOrigin;

/** The search origin represented by a {@link GeospatialData} position. */
export interface CoordOrigin {
    /** The pivot location to search from. */
    position: GeospatialData;
}

/** The search origin represented by an existing member. */
export interface MemberOrigin {
    /** Member (location) name stored in the sorted set to use as a search pivot. */
    member: GlideString;
}

/** @internal */
export function createGeoSearch(
    key: GlideString,
    searchFrom: SearchOrigin,
    searchBy: GeoSearchShape,
    resultOptions?: GeoSearchResultOptions,
): command_request.Command {
    const args = [key].concat(
        convertGeoSearchOptionsToArgs(searchFrom, searchBy, resultOptions),
    );
    return createCommand(RequestType.GeoSearch, args);
}

/** @internal */
export function createGeoSearchStore(
    destination: GlideString,
    source: GlideString,
    searchFrom: SearchOrigin,
    searchBy: GeoSearchShape,
    resultOptions?: GeoSearchStoreResultOptions,
): command_request.Command {
    const args = [destination, source].concat(
        convertGeoSearchOptionsToArgs(searchFrom, searchBy, resultOptions),
    );
    return createCommand(RequestType.GeoSearchStore, args);
}

function convertGeoSearchOptionsToArgs(
    searchFrom: SearchOrigin,
    searchBy: GeoSearchShape,
    resultOptions?: GeoSearchCommonResultOptions,
): GlideString[] {
    let args: GlideString[] = [];

    if ("position" in searchFrom) {
        args = args.concat(
            "FROMLONLAT",
            searchFrom.position.longitude.toString(),
            searchFrom.position.latitude.toString(),
        );
    } else {
        args = args.concat("FROMMEMBER", searchFrom.member);
    }

    if ("radius" in searchBy) {
        args = args.concat(
            "BYRADIUS",
            searchBy.radius.toString(),
            searchBy.unit,
        );
    } else {
        args = args.concat(
            "BYBOX",
            searchBy.width.toString(),
            searchBy.height.toString(),
            searchBy.unit,
        );
    }

    if (resultOptions) {
        if (
            "withCoord" in resultOptions &&
            (resultOptions as GeoSearchResultOptions).withCoord
        )
            args.push("WITHCOORD");
        if (
            "withDist" in resultOptions &&
            (resultOptions as GeoSearchResultOptions).withDist
        )
            args.push("WITHDIST");
        if (
            "withHash" in resultOptions &&
            (resultOptions as GeoSearchResultOptions).withHash
        )
            args.push("WITHHASH");
        if (
            "storeDist" in resultOptions &&
            (resultOptions as GeoSearchStoreResultOptions).storeDist
        )
            args.push("STOREDIST");

        if (resultOptions.count) {
            args.push("COUNT", resultOptions.count?.toString());

            if (resultOptions.isAny) args.push("ANY");
        }

        if (resultOptions.sortOrder) args.push(resultOptions.sortOrder);
    }

    return args;
}

/**
 * @internal
 */
export function createZRevRank(
    key: GlideString,
    member: GlideString,
): command_request.Command {
    return createCommand(RequestType.ZRevRank, [key, member]);
}

/**
 * @internal
 */
export function createZRevRankWithScore(
    key: GlideString,
    member: GlideString,
): command_request.Command {
    return createCommand(RequestType.ZRevRank, [key, member, "WITHSCORE"]);
}

/**
 * Mandatory option for zmpop.
 * Defines which elements to pop from the sorted set.
 */
export enum ScoreFilter {
    /** Pop elements with the highest scores. */
    MAX = "MAX",
    /** Pop elements with the lowest scores. */
    MIN = "MIN",
}

/**
 * @internal
 */
export function createZMPop(
    keys: GlideString[],
    modifier: ScoreFilter,
    count?: number,
): command_request.Command {
    const args = keys;
    args.unshift(keys.length.toString());
    args.push(modifier);

    if (count !== undefined) {
        args.push("COUNT");
        args.push(count.toString());
    }

    return createCommand(RequestType.ZMPop, args);
}

/**
 * @internal
 */
export function createBZMPop(
    keys: GlideString[],
    modifier: ScoreFilter,
    timeout: number,
    count?: number,
): command_request.Command {
    const args = [
        timeout.toString(),
        keys.length.toString(),
        ...keys,
        modifier,
    ];

    if (count !== undefined) {
        args.push("COUNT");
        args.push(count.toString());
    }

    return createCommand(RequestType.BZMPop, args);
}

/**
 * @internal
 */
export function createZIncrBy(
    key: GlideString,
    increment: number,
    member: GlideString,
): command_request.Command {
    return createCommand(RequestType.ZIncrBy, [
        key,
        increment.toString(),
        member,
    ]);
}

/**
 * Optional arguments to {@link BaseClient.sort|sort}, {@link BaseClient.sortStore|sortStore} and {@link BaseClient.sortReadOnly|sortReadOnly} commands.
 *
 * See https://valkey.io/commands/sort/ for more details.
 *
 * @remarks When in cluster mode, {@link SortOptions.byPattern|byPattern} and {@link SortOptions.getPatterns|getPattern} must map to the same hash
 *     slot as the key, and this is supported only since Valkey version 8.0.
 */
export interface SortOptions {
    /**
     * A pattern to sort by external keys instead of by the elements stored at the key themselves. The
     * pattern should contain an asterisk (*) as a placeholder for the element values, where the value
     * from the key replaces the asterisk to create the key name. For example, if `key`
     * contains IDs of objects, `byPattern` can be used to sort these IDs based on an
     * attribute of the objects, like their weights or timestamps.
     * Supported in cluster mode since Valkey version 8.0 and above.
     */
    byPattern?: GlideString;

    /**
     * Limiting the range of the query by setting offset and result count. See {@link Limit} class for
     * more information.
     */
    limit?: Limit;

    /**
     * A pattern used to retrieve external keys' values, instead of the elements at `key`.
     * The pattern should contain an asterisk (`*`) as a placeholder for the element values, where the
     * value from `key` replaces the asterisk to create the `key` name. This
     * allows the sorted elements to be transformed based on the related keys values. For example, if
     * `key` contains IDs of users, `getPatterns` can be used to retrieve
     * specific attributes of these users, such as their names or email addresses. E.g., if
     * `getPatterns` is `name_*`, the command will return the values of the keys
     * `name_<element>` for each sorted element. Multiple `getPatterns`
     * arguments can be provided to retrieve multiple attributes. The special value `#` can
     * be used to include the actual element from `key` being sorted. If not provided, only
     * the sorted elements themselves are returned.
     * Supported in cluster mode since Valkey version 8.0 and above.
     */
    getPatterns?: GlideString[];

    /** Options for sorting order of elements. */
    orderBy?: SortOrder;

    /**
     * When `true`, sorts elements lexicographically. When `false` (default),
     * sorts elements numerically. Use this when the list, set, or sorted set contains string values
     * that cannot be converted into double precision floating point numbers.
     */
    isAlpha?: boolean;
}

/**
 * The `LIMIT` argument is commonly used to specify a subset of results from the
 * matching elements, similar to the `LIMIT` clause in SQL (e.g., `SELECT LIMIT offset, count`).
 */
export interface Limit {
    /** The starting position of the range, zero based. */
    offset: number;
    /** The maximum number of elements to include in the range. A negative count returns all elements from the offset. */
    count: number;
}

/** @internal */
export function createSort(
    key: GlideString,
    options?: SortOptions,
    destination?: GlideString,
): command_request.Command {
    return createSortImpl(RequestType.Sort, key, options, destination);
}

/** @internal */
export function createSortReadOnly(
    key: GlideString,
    options?: SortOptions,
): command_request.Command {
    return createSortImpl(RequestType.SortReadOnly, key, options);
}

/** @internal */
function createSortImpl(
    cmd: RequestType,
    key: GlideString,
    options?: SortOptions,
    destination?: GlideString,
): command_request.Command {
    const args = [key];

    if (options) {
        if (options.limit) {
            args.push(
                "LIMIT",
                options.limit.offset.toString(),
                options.limit.count.toString(),
            );
        }

        if (options.orderBy) {
            args.push(options.orderBy);
        }

        if (options.isAlpha) {
            args.push("ALPHA");
        }

        if (options.byPattern) {
            args.push("BY", options.byPattern);
        }

        if (options.getPatterns) {
            options.getPatterns.forEach((p) => args.push("GET", p));
        }
    }

    if (destination) args.push("STORE", destination);

    return createCommand(cmd, args);
}

/**
 * @internal
 */
export function createHStrlen(
    key: GlideString,
    field: GlideString,
): command_request.Command {
    return createCommand(RequestType.HStrlen, [key, field]);
}

/** @internal */
export function createHRandField(
    key: GlideString,
    count?: number,
    withValues?: boolean,
): command_request.Command {
    const args = [key];
    if (count !== undefined) args.push(count.toString());
    if (withValues) args.push("WITHVALUES");
    return createCommand(RequestType.HRandField, args);
}

/**
 * @internal
 */
export function createHScan(
    key: GlideString,
    cursor: string,
    options?: HScanOptions,
): command_request.Command {
    let args: GlideString[] = [key, cursor];

    if (options) {
        args = args.concat(convertBaseScanOptionsToArgsArray(options));

        if (options.noValues) {
            args.push("NOVALUES");
        }
    }

    return createCommand(RequestType.HScan, args);
}

/**
 * @internal
 */
export function createZRandMember(
    key: GlideString,
    count?: number,
    withscores?: boolean,
): command_request.Command {
    const args = [key];

    if (count !== undefined) {
        args.push(count.toString());
    }

    if (withscores) {
        args.push("WITHSCORES");
    }

    return createCommand(RequestType.ZRandMember, args);
}

/** @internal */
export function createLastSave(): command_request.Command {
    return createCommand(RequestType.LastSave, []);
}

/** @internal */
export function createLCS(
    key1: GlideString,
    key2: GlideString,
    options?: {
        len?: boolean;
        idx?: { withMatchLen?: boolean; minMatchLen?: number };
    },
): command_request.Command {
    const args = [key1, key2];

    if (options) {
        if (options.len) args.push("LEN");
        else if (options.idx) {
            args.push("IDX");
            if (options.idx.withMatchLen) args.push("WITHMATCHLEN");
            if (options.idx.minMatchLen !== undefined)
                args.push("MINMATCHLEN", options.idx.minMatchLen.toString());
        }
    }

    return createCommand(RequestType.LCS, args);
}

/**
 * @internal
 */
export function createTouch(keys: GlideString[]): command_request.Command {
    return createCommand(RequestType.Touch, keys);
}

/** @internal */
export function createRandomKey(): command_request.Command {
    return createCommand(RequestType.RandomKey, []);
}

/** @internal */
export function createWatch(keys: GlideString[]): command_request.Command {
    return createCommand(RequestType.Watch, keys);
}

/** @internal */
export function createUnWatch(): command_request.Command {
    return createCommand(RequestType.UnWatch, []);
}

/** @internal */
export function createWait(
    numreplicas: number,
    timeout: number,
): command_request.Command {
    return createCommand(RequestType.Wait, [
        numreplicas.toString(),
        timeout.toString(),
    ]);
}

/**
 * This base class represents the common set of optional arguments for the SCAN family of commands.
 * Concrete implementations of this class are tied to specific SCAN commands (`SCAN`, `SSCAN`).
 */
export interface BaseScanOptions {
    /**
     * The match filter is applied to the result of the command and will only include
     * strings that match the pattern specified. If the sorted set is large enough for scan commands to return
     * only a subset of the sorted set then there could be a case where the result is empty although there are
     * items that match the pattern specified. This is due to the default `COUNT` being `10` which indicates
     * that it will only fetch and match `10` items from the list.
     */
    match?: GlideString;
    /**
     * `COUNT` is a just a hint for the command for how many elements to fetch from the
     * sorted set. `COUNT` could be ignored until the sorted set is large enough for the `SCAN` commands to
     * represent the results as compact single-allocation packed encoding.
     */
    readonly count?: number;
}

/**
 * Options for the SCAN command.
 * `match`: The match filter is applied to the result of the command and will only include keys that match the pattern specified.
 * `count`: `COUNT` is a just a hint for the command for how many elements to fetch from the server, the default is 10.
 * `type`: The type of the object to scan.
 *  Types are the data types of Valkey: `string`, `list`, `set`, `zset`, `hash`, `stream`.
 */
export interface ScanOptions extends BaseScanOptions {
    type?: ObjectType;
}

/**
 * Options for the SCAN command.
 * `match`: The match filter is applied to the result of the command and will only include keys that match the pattern specified.
 * `count`: `COUNT` is a just a hint for the command for how many elements to fetch from the server, the default is 10.
 * `type`: The type of the object to scan.
 * Types are the data types of Valkey: `string`, `list`, `set`, `zset`, `hash`, `stream`.
 * `allowNonCoveredSlots`: If true, the scan will keep scanning even if slots are not covered by the cluster.
 * By default, the scan will stop if slots are not covered by the cluster.
 */
export interface ClusterScanOptions extends ScanOptions {
    allowNonCoveredSlots?: boolean;
}

/**
 * Options specific to the ZSCAN command, extending from the base scan options.
 */
export type ZScanOptions = BaseScanOptions & {
    /**
     * If true, the scores are not included in the results.
     * Supported from Valkey 8.0.0 and above.
     */
    readonly noScores?: boolean;
};

/**
 * Options specific to the HSCAN command, extending from the base scan options.
 */
export type HScanOptions = BaseScanOptions & {
    /**
     * If true, the values of the fields are not included in the results.
     * Supported from Valkey 8.0.0 and above.
     */
    readonly noValues?: boolean;
};

/**
 * @internal
 */
function convertBaseScanOptionsToArgsArray(
    options: BaseScanOptions,
): GlideString[] {
    const args: GlideString[] = [];

    if (options.match) {
        args.push("MATCH", options.match);
    }

    if (options.count !== undefined) {
        args.push("COUNT", options.count.toString());
    }

    return args;
}

/**
 * @internal
 */
export function createZScan(
    key: GlideString,
    cursor: string,
    options?: ZScanOptions,
): command_request.Command {
    let args = [key, cursor];

    if (options) {
        args = args.concat(convertBaseScanOptionsToArgsArray(options));

        if (options.noScores) {
            args.push("NOSCORES");
        }
    }

    return createCommand(RequestType.ZScan, args);
}

/** @internal */
export function createSetRange(
    key: GlideString,
    offset: number,
    value: GlideString,
): command_request.Command {
    return createCommand(RequestType.SetRange, [key, offset.toString(), value]);
}

/** @internal */
export function createAppend(
    key: GlideString,
    value: GlideString,
): command_request.Command {
    return createCommand(RequestType.Append, [key, value]);
}

/**
 * @internal
 */
export function createLMPop(
    keys: GlideString[],
    direction: ListDirection,
    count?: number,
): command_request.Command {
    const args: GlideString[] = [keys.length.toString(), ...keys, direction];

    if (count !== undefined) {
        args.push("COUNT");
        args.push(count.toString());
    }

    return createCommand(RequestType.LMPop, args);
}

/**
 * @internal
 */
export function createBLMPop(
    keys: GlideString[],
    direction: ListDirection,
    timeout: number,
    count?: number,
): command_request.Command {
    const args: GlideString[] = [
        timeout.toString(),
        keys.length.toString(),
        ...keys,
        direction,
    ];

    if (count !== undefined) {
        args.push("COUNT");
        args.push(count.toString());
    }

    return createCommand(RequestType.BLMPop, args);
}

/**
 * @internal
 */
export function createPubSubChannels(
    pattern?: GlideString,
): command_request.Command {
    return createCommand(RequestType.PubSubChannels, pattern ? [pattern] : []);
}

/**
 * @internal
 */
export function createPubSubNumPat(): command_request.Command {
    return createCommand(RequestType.PubSubNumPat, []);
}

/**
 * @internal
 */
export function createPubSubNumSub(
    channels?: GlideString[],
): command_request.Command {
    return createCommand(RequestType.PubSubNumSub, channels ? channels : []);
}

/**
 * @internal
 */
export function createPubsubShardChannels(
    pattern?: GlideString,
): command_request.Command {
    return createCommand(
        RequestType.PubSubShardChannels,
        pattern ? [pattern] : [],
    );
}

/**
 * @internal
 */
export function createPubSubShardNumSub(
    channels?: GlideString[],
): command_request.Command {
    return createCommand(
        RequestType.PubSubShardNumSub,
        channels ? channels : [],
    );
}

/**
 * @internal
 */
export function createBZPopMax(
    keys: GlideString[],
    timeout: number,
): command_request.Command {
    return createCommand(RequestType.BZPopMax, [...keys, timeout.toString()]);
}

/**
 * @internal
 */
export function createBZPopMin(
    keys: GlideString[],
    timeout: number,
): command_request.Command {
    return createCommand(RequestType.BZPopMin, [...keys, timeout.toString()]);
}

/**
 * @internal
 */
export function createScriptShow(sha1: GlideString): command_request.Command {
    return createCommand(RequestType.ScriptShow, [sha1]);
}

/**
 * Time unit representation which is used in optional arguments for {@link BaseClient.getex|getex} and {@link BaseClient.set|set} command.
 */
export enum TimeUnit {
    /**
     * Set the specified expire time, in seconds. Equivalent to
     * `EX` in the VALKEY API.
     */
    Seconds = "EX",
    /**
     * Set the specified expire time, in milliseconds. Equivalent
     * to `PX` in the VALKEY API.
     */
    Milliseconds = "PX",
    /**
     * Set the specified Unix time at which the key will expire,
     * in seconds. Equivalent to `EXAT` in the VALKEY API.
     */
    UnixSeconds = "EXAT",
    /**
     * Set the specified Unix time at which the key will expire,
     * in milliseconds. Equivalent to `PXAT` in the VALKEY API.
     */
    UnixMilliseconds = "PXAT",
}

/**
 * @internal
 */
export function createGetEx(
    key: GlideString,
    options?: "persist" | { type: TimeUnit; duration: number },
): command_request.Command {
    const args = [key];

    if (options) {
        if (options !== "persist" && !Number.isInteger(options.duration)) {
            throw new Error(
                `Received expiry '${JSON.stringify(
                    options.duration,
                )}'. Count must be an integer`,
            );
        }

        if (options === "persist") {
            args.push("PERSIST");
        } else {
            args.push(options.type, options.duration.toString());
        }
    }

    return createCommand(RequestType.GetEx, args);
}

/**
 * @internal
 */
export function createXAck(
    key: GlideString,
    group: GlideString,
    ids: string[],
): command_request.Command {
    return createCommand(RequestType.XAck, [key, group, ...ids]);
}

/**
 * @internal
 */
export function createXGroupSetid(
    key: GlideString,
    groupName: GlideString,
    id: string,
    entriesRead?: number,
): command_request.Command {
    const args = [key, groupName, id];

    if (entriesRead !== undefined) {
        args.push("ENTRIESREAD");
        args.push(entriesRead.toString());
    }

    return createCommand(RequestType.XGroupSetId, args);
}

/**
 * @internal
 */
export function createScriptExists(
    sha1s: GlideString[],
): command_request.Command {
    return createCommand(RequestType.ScriptExists, sha1s);
}

/**
 * @internal
 */
export function createScriptFlush(mode?: FlushMode): command_request.Command {
    if (mode) {
        return createCommand(RequestType.ScriptFlush, [mode.toString()]);
    } else {
        return createCommand(RequestType.ScriptFlush, []);
    }
}

/** @internal */
export function createScriptKill(): command_request.Command {
    return createCommand(RequestType.ScriptKill, []);
}
