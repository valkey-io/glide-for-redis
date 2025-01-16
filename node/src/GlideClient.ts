/**
 * Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0
 */

import * as net from "net";
import {
    AdvancedBaseClientConfiguration,
    BaseClient,
    BaseClientConfiguration,
    convertGlideRecordToRecord,
    Decoder,
    DecoderOption,
    GlideRecord,
    GlideReturnType,
    GlideString,
    PubSubMsg,
} from "./BaseClient";
import {
    createClientGetName,
    createClientId,
    createConfigGet,
    createConfigResetStat,
    createConfigRewrite,
    createConfigSet,
    createCopy,
    createCustomCommand,
    createDBSize,
    createEcho,
    createFlushAll,
    createFlushDB,
    createFunctionDelete,
    createFunctionDump,
    createFunctionFlush,
    createFunctionKill,
    createFunctionList,
    createFunctionLoad,
    createFunctionRestore,
    createFunctionStats,
    createInfo,
    createLastSave,
    createLolwut,
    createMove,
    createPing,
    createPublish,
    createRandomKey,
    createScan,
    createScriptExists,
    createScriptFlush,
    createScriptKill,
    createSelect,
    createTime,
    createUnWatch,
    FlushMode,
    FunctionListOptions,
    FunctionListResponse,
    FunctionRestorePolicy,
    FunctionStatsFullResponse,
    InfoOptions,
    LolwutOptions,
    ScanOptions,
} from "./Commands";
import { connection_request } from "./ProtobufMessage";
import { Transaction } from "./Transaction";

/* eslint-disable-next-line @typescript-eslint/no-namespace */
export namespace GlideClientConfiguration {
    /**
     * Enum representing pubsub subscription modes.
     * @see {@link  https://valkey.io/docs/topics/pubsub/|Valkey PubSub Documentation} for more details.
     */
    export enum PubSubChannelModes {
        /**
         * Use exact channel names.
         */
        Exact = 0,

        /**
         * Use channel name patterns.
         */
        Pattern = 1,
    }

    export interface PubSubSubscriptions {
        /**
         * Channels and patterns by modes.
         */
        channelsAndPatterns: Partial<Record<PubSubChannelModes, Set<string>>>;

        /**
         * Optional callback to accept the incoming messages.
         */
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        callback?: (msg: PubSubMsg, context: any) => void;

        /**
         * Arbitrary context to pass to the callback.
         */
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        context?: any;
    }
}

/**
 * Configuration options for creating a {@link GlideClient | GlideClient}.
 *
 * Extends `BaseClientConfiguration` with properties specific to `GlideClient`, such as database selection,
 * reconnection strategies, and Pub/Sub subscription settings.
 *
 * @remarks
 * This configuration allows you to tailor the client's behavior when connecting to a standalone Valkey Glide server.
 *
 * - **Database Selection**: Use `databaseId` to specify which logical database to connect to.
 * - **Reconnection Strategy**: Customize how the client should attempt reconnections using `connectionBackoff`.
 *   - `numberOfRetries`: The maximum number of retry attempts with increasing delays.
 *     - After this limit is reached, the retry interval becomes constant.
 *   - `factor`: A multiplier applied to the base delay between retries (e.g., `500` means a 500ms base delay).
 *   - `exponentBase`: The exponential growth factor for delays (e.g., `2` means the delay doubles with each retry).
 * - **Pub/Sub Subscriptions**: Predefine Pub/Sub channels and patterns to subscribe to upon connection establishment.
 *
 * @example
 * ```typescript
 * const config: GlideClientConfiguration = {
 *   databaseId: 1,
 *   connectionBackoff: {
 *     numberOfRetries: 10, // Maximum retries before delay becomes constant
 *     factor: 500,        // Base delay in milliseconds
 *     exponentBase: 2,    // Delay doubles with each retry (2^N)
 *   },
 *   pubsubSubscriptions: {
 *     channelsAndPatterns: {
 *       [GlideClientConfiguration.PubSubChannelModes.Pattern]: new Set(['news.*']),
 *     },
 *     callback: (msg) => {
 *       console.log(`Received message on ${msg.channel}:`, msg.payload);
 *     },
 *   },
 * };
 * ```
 */
export type GlideClientConfiguration = BaseClientConfiguration & {
    /**
     * index of the logical database to connect to.
     */
    databaseId?: number;
    /**
     * Strategy used to determine how and when to reconnect, in case of connection failures.
     * The time between attempts grows exponentially, to the formula rand(0 .. factor * (exponentBase ^ N)), where N is the number of failed attempts.
     * The client will attempt to reconnect indefinitely. Once the maximum value is reached, that will remain the time between retry attempts until a
     * reconnect attempt is succesful.
     * If not set, a default backoff strategy will be used.
     */
    connectionBackoff?: {
        /**
         * Number of retry attempts that the client should perform when disconnected from the server, where the time between retries increases.
         * Once the retries have reached the maximum value, the time between retries will remain constant until a reconnect attempt is succesful.
         * Value must be an integer.
         */
        numberOfRetries: number;
        /**
         * The multiplier that will be applied to the waiting time between each retry.
         * Value must be an integer.
         */
        factor: number;
        /**
         * The exponent base configured for the strategy.
         * Value must be an integer.
         */
        exponentBase: number;
    };
    /**
     * PubSub subscriptions to be used for the client.
     * Will be applied via SUBSCRIBE/PSUBSCRIBE commands during connection establishment.
     */
    pubsubSubscriptions?: GlideClientConfiguration.PubSubSubscriptions;
    /**
     * Advanced configuration settings for the client.
     */
    advancedConfiguration?: AdvancedGlideClientConfiguration;
};

/**
 * Represents advanced configuration settings for creating a {@link GlideClient | GlideClient} used in {@link GlideClientConfiguration | GlideClientConfiguration}.
 *
 *
 * @example
 * ```typescript
 * const config: AdvancedGlideClientConfiguration = {
 *   connectionTimeout: 500, // Set the connection timeout to 500ms
 * };
 * ```
 */
export type AdvancedGlideClientConfiguration =
    AdvancedBaseClientConfiguration & {};

/**
 * Client used for connection to standalone servers.
 *
 * @see For full documentation refer to {@link https://github.com/valkey-io/valkey-glide/wiki/NodeJS-wrapper#standalone|Valkey Glide Wiki}.
 */
export class GlideClient extends BaseClient {
    /**
     * @internal
     */
    protected createClientRequest(
        options: GlideClientConfiguration,
    ): connection_request.IConnectionRequest {
        const configuration = super.createClientRequest(options);
        configuration.databaseId = options.databaseId;
        configuration.connectionRetryStrategy = options.connectionBackoff;
        this.configurePubsub(options, configuration);

        if (options.advancedConfiguration) {
            this.configureAdvancedConfigurationBase(
                options.advancedConfiguration,
                configuration,
            );
        }

        return configuration;
    }
    /**
     * Creates a new `GlideClient` instance and establishes a connection to a standalone Valkey Glide server.
     *
     * @param options - The configuration options for the client, including server addresses, authentication credentials, TLS settings, database selection, reconnection strategy, and Pub/Sub subscriptions.
     * @returns A promise that resolves to a connected `GlideClient` instance.
     *
     * @remarks
     * Use this static method to create and connect a `GlideClient` to a standalone Valkey Glide server. The client will automatically handle connection establishment, including any authentication and TLS configurations.
     *
     * @example
     * ```typescript
     * // Connecting to a Standalone Server
     * import { GlideClient, GlideClientConfiguration } from '@valkey/valkey-glide';
     *
     * const client = await GlideClient.createClient({
     *   addresses: [
     *     { host: 'primary.example.com', port: 6379 },
     *     { host: 'replica1.example.com', port: 6379 },
     *   ],
     *   databaseId: 1,
     *   credentials: {
     *     username: 'user1',
     *     password: 'passwordA',
     *   },
     *   useTLS: true,
     *   connectionBackoff: {
     *     numberOfRetries: 5,
     *     factor: 1000,
     *     exponentBase: 2,
     *   },
     *   pubsubSubscriptions: {
     *     channelsAndPatterns: {
     *       [GlideClientConfiguration.PubSubChannelModes.Exact]: new Set(['updates']),
     *     },
     *     callback: (msg) => {
     *       console.log(`Received message: ${msg.payload}`);
     *     },
     *   },
     * });
     * ```
     *
     * @remarks
     * - **Authentication**: If `credentials` are provided, the client will attempt to authenticate using the specified username and password.
     * - **TLS**: If `useTLS` is set to `true`, the client will establish a secure connection using TLS.
     * - **Reconnection Strategy**: The `connectionBackoff` settings define how the client will attempt to reconnect in case of disconnections.
     * - **Pub/Sub Subscriptions**: Any channels or patterns specified in `pubsubSubscriptions` will be subscribed to upon connection.
     */
    public static async createClient(
        options: GlideClientConfiguration,
    ): Promise<GlideClient> {
        return super.createClientInternal<GlideClient>(
            options,
            (socket: net.Socket, options?: GlideClientConfiguration) =>
                new GlideClient(socket, options),
        );
    }
    /**
     * @internal
     */
    static async __createClient(
        options: BaseClientConfiguration,
        connectedSocket: net.Socket,
    ): Promise<GlideClient> {
        return this.__createClientInternal(
            options,
            connectedSocket,
            (socket, options) => new GlideClient(socket, options),
        );
    }

    /**
     * Execute a transaction by processing the queued commands.
     *
     * @see {@link https://github.com/valkey-io/valkey-glide/wiki/NodeJS-wrapper#transaction|Valkey Glide Wiki} for details on Valkey Transactions.
     *
     * @param transaction - A {@link Transaction} object containing a list of commands to be executed.
     * @param options - (Optional) See {@link DecoderOption}.
     * @returns A list of results corresponding to the execution of each command in the transaction.
     *     If a command returns a value, it will be included in the list. If a command doesn't return a value,
     *     the list entry will be `null`.
     *     If the transaction failed due to a `WATCH` command, `exec` will return `null`.
     */
    public async exec(
        transaction: Transaction,
        options?: DecoderOption,
    ): Promise<GlideReturnType[] | null> {
        return this.createWritePromise<GlideReturnType[] | null>(
            transaction.commands,
            options,
        ).then((result) =>
            this.processResultWithSetCommands(
                result,
                transaction.setCommandsIndexes,
            ),
        );
    }

    /** Executes a single command, without checking inputs. Every part of the command, including subcommands,
     *  should be added as a separate value in args.
     *
     * Note: An error will occur if the string decoder is used with commands that return only bytes as a response.
     *
     * @see {@link https://github.com/valkey-io/valkey-glide/wiki/General-Concepts#custom-command|Valkey Glide Wiki} for details on the restrictions and limitations of the custom command API.
     *
     * @param args - A list including the command name and arguments for the custom command.
     * @param options - (Optional) See {@link DecoderOption}.
     * @returns The executed custom command return value.
     *
     * @example
     * ```typescript
     * // Example usage of customCommand method to retrieve pub/sub clients
     * const result = await client.customCommand(["CLIENT", "LIST", "TYPE", "PUBSUB"]);
     * console.log(result); // Output: Returns a list of all pub/sub clients
     * ```
     */
    public async customCommand(
        args: GlideString[],
        options?: DecoderOption,
    ): Promise<GlideReturnType> {
        return this.createWritePromise(createCustomCommand(args), options);
    }

    /**
     * Pings the server.
     *
     * @see {@link https://valkey.io/commands/ping/|valkey.io} for details.
     *
     * @param options - (Optional) Additional parameters:
     * - (Optional) `message` : a message to include in the `PING` command.
     *   + If not provided, the server will respond with `"PONG"`.
     *   + If provided, the server will respond with a copy of the message.
     * - (Optional) `decoder`: see {@link DecoderOption}.
     * @returns `"PONG"` if `message` is not provided, otherwise return a copy of `message`.
     *
     * @example
     * ```typescript
     * // Example usage of ping method without any message
     * const result = await client.ping();
     * console.log(result); // Output: 'PONG'
     * ```
     *
     * @example
     * ```typescript
     * // Example usage of ping method with a message
     * const result = await client.ping("Hello");
     * console.log(result); // Output: 'Hello'
     * ```
     */
    public async ping(
        options?: {
            message?: GlideString;
        } & DecoderOption,
    ): Promise<GlideString> {
        return this.createWritePromise(createPing(options?.message), options);
    }

    /**
     * Gets information and statistics about the server.
     *
     * @see {@link https://valkey.io/commands/info/|valkey.io} for details.
     *
     * @param sections - (Optional) A list of {@link InfoOptions} values specifying which sections of information to retrieve.
     *     When no parameter is provided, {@link InfoOptions.Default|Default} is assumed.
     * @returns A string containing the information for the sections requested.
     */
    public async info(sections?: InfoOptions[]): Promise<string> {
        return this.createWritePromise(createInfo(sections), {
            decoder: Decoder.String,
        });
    }

    /**
     * Changes the currently selected database.
     *
     * @see {@link https://valkey.io/commands/select/|valkey.io} for details.
     *
     * @param index - The index of the database to select.
     * @returns A simple `"OK"` response.
     *
     * @example
     * ```typescript
     * // Example usage of select method
     * const result = await client.select(2);
     * console.log(result); // Output: 'OK'
     * ```
     */
    public async select(index: number): Promise<"OK"> {
        return this.createWritePromise(createSelect(index), {
            decoder: Decoder.String,
        });
    }

    /**
     * Gets the name of the primary's connection.
     *
     * @see {@link https://valkey.io/commands/client-getname/|valkey.io} for more details.
     *
     * @param options - (Optional) See {@link DecoderOption}.
     * @returns The name of the client connection as a string if a name is set, or `null` if no name is assigned.
     *
     * @example
     * ```typescript
     * // Example usage of client_getname method
     * const result = await client.client_getname();
     * console.log(result); // Output: 'Client Name'
     * ```
     */
    public async clientGetName(
        options?: DecoderOption,
    ): Promise<GlideString | null> {
        return this.createWritePromise(createClientGetName(), options);
    }

    /**
     * Rewrites the configuration file with the current configuration.
     *
     * @see {@link https://valkey.io/commands/config-rewrite/|valkey.io} for details.
     *
     * @returns "OK" when the configuration was rewritten properly. Otherwise, an error is thrown.
     *
     * @example
     * ```typescript
     * // Example usage of configRewrite command
     * const result = await client.configRewrite();
     * console.log(result); // Output: 'OK'
     * ```
     */
    public async configRewrite(): Promise<"OK"> {
        return this.createWritePromise(createConfigRewrite(), {
            decoder: Decoder.String,
        });
    }

    /**
     * Resets the statistics reported by the server using the `INFO` and `LATENCY HISTOGRAM` commands.
     *
     * @see {@link https://valkey.io/commands/config-resetstat/|valkey.io} for details.
     *
     * @returns always "OK".
     *
     * @example
     * ```typescript
     * // Example usage of configResetStat command
     * const result = await client.configResetStat();
     * console.log(result); // Output: 'OK'
     * ```
     */
    public async configResetStat(): Promise<"OK"> {
        return this.createWritePromise(createConfigResetStat(), {
            decoder: Decoder.String,
        });
    }

    /**
     * Returns the current connection ID.
     *
     * @see {@link https://valkey.io/commands/client-id/|valkey.io} for details.
     *
     * @returns The ID of the connection.
     *
     * @example
     * ```typescript
     * const result = await client.clientId();
     * console.log("Connection id: " + result);
     * ```
     */
    public async clientId(): Promise<number> {
        return this.createWritePromise(createClientId());
    }

    /**
     * Reads the configuration parameters of the running server.
     * Starting from server version 7, command supports multiple parameters.
     *
     * @see {@link https://valkey.io/commands/config-get/|valkey.io} for details.
     *
     * @param parameters - A list of configuration parameter names to retrieve values for.
     * @param options - (Optional) See {@link DecoderOption}.
     *
     * @returns A map of values corresponding to the configuration parameters.
     *
     * @example
     * ```typescript
     * // Example usage of configGet method with multiple configuration parameters
     * const result = await client.configGet(["timeout", "maxmemory"]);
     * console.log(result); // Output: {'timeout': '1000', 'maxmemory': '1GB'}
     * ```
     */
    public async configGet(
        parameters: string[],
        options?: DecoderOption,
    ): Promise<Record<string, GlideString>> {
        return this.createWritePromise<GlideRecord<GlideString>>(
            createConfigGet(parameters),
            options,
        ).then(convertGlideRecordToRecord);
    }

    /**
     * Sets configuration parameters to the specified values.
     * Starting from server version 7, command supports multiple parameters.
     *
     * @see {@link  https://valkey.io/commands/config-set/|valkey.io} for details.
     * @param parameters - A map consisting of configuration parameters and their respective values to set.
     * @returns `"OK"` when the configuration was set properly. Otherwise an error is thrown.
     *
     * @example
     * ```typescript
     * // Example usage of configSet method to set multiple configuration parameters
     * const result = await client.configSet({ timeout: "1000", maxmemory, "1GB" });
     * console.log(result); // Output: 'OK'
     * ```
     */
    public async configSet(
        parameters: Record<string, GlideString>,
    ): Promise<"OK"> {
        return this.createWritePromise(createConfigSet(parameters), {
            decoder: Decoder.String,
        });
    }

    /**
     * Echoes the provided `message` back.
     *
     * @see {@link https://valkey.io/commands/echo|valkey.io} for more details.
     *
     * @param message - The message to be echoed back.
     * @param options - (Optional) See {@link DecoderOption}.
     * @returns The provided `message`.
     *
     * @example
     * ```typescript
     * // Example usage of the echo command
     * const echoedMessage = await client.echo("valkey-glide");
     * console.log(echoedMessage); // Output: 'valkey-glide'
     * ```
     */
    public async echo(
        message: GlideString,
        options?: DecoderOption,
    ): Promise<GlideString> {
        return this.createWritePromise(createEcho(message), options);
    }

    /**
     * Returns the server time.
     *
     * @see {@link https://valkey.io/commands/time/|valkey.io} for details.
     *
     * @returns The current server time as an `array` with two items:
     * - A Unix timestamp,
     * - The amount of microseconds already elapsed in the current second.
     *
     * @example
     * ```typescript
     * console.log(await client.time()); // Output: ['1710925775', '913580']
     * ```
     */
    public async time(): Promise<[string, string]> {
        return this.createWritePromise(createTime(), {
            decoder: Decoder.String,
        });
    }

    /**
     * Copies the value stored at the `source` to the `destination` key. If `destinationDB` is specified,
     * the value will be copied to the database specified, otherwise the current database will be used.
     * When `replace` is true, removes the `destination` key first if it already exists, otherwise performs
     * no action.
     *
     * @see {@link https://valkey.io/commands/copy/|valkey.io} for more details.
     * @remarks Since Valkey version 6.2.0.
     *
     * @param source - The key to the source value.
     * @param destination - The key where the value should be copied to.
     * @param options - (Optional) Additional parameters:
     * - (Optional) `destinationDB`: the alternative logical database index for the destination key.
     *     If not provided, the current database will be used.
     * - (Optional) `replace`: if `true`, the `destination` key should be removed before copying the
     *     value to it. If not provided, no action will be performed if the key already exists.
     * @returns `true` if `source` was copied, `false` if the `source` was not copied.
     *
     * @example
     * ```typescript
     * const result = await client.copy("set1", "set2");
     * console.log(result); // Output: true - "set1" was copied to "set2".
     * ```
     * ```typescript
     * const result = await client.copy("set1", "set2", { replace: true });
     * console.log(result); // Output: true - "set1" was copied to "set2".
     * ```
     * ```typescript
     * const result = await client.copy("set1", "set2", { destinationDB: 1, replace: false });
     * console.log(result); // Output: true - "set1" was copied to "set2".
     * ```
     */
    public async copy(
        source: GlideString,
        destination: GlideString,
        options?: { destinationDB?: number; replace?: boolean },
    ): Promise<boolean> {
        return this.createWritePromise(
            createCopy(source, destination, options),
        );
    }

    /**
     * Move `key` from the currently selected database to the database specified by `dbIndex`.
     *
     * @see {@link https://valkey.io/commands/move/|valkey.io} for more details.
     *
     * @param key - The key to move.
     * @param dbIndex - The index of the database to move `key` to.
     * @returns `true` if `key` was moved, or `false` if the `key` already exists in the destination
     *     database or does not exist in the source database.
     *
     * @example
     * ```typescript
     * const result = await client.move("key", 1);
     * console.log(result); // Output: true
     * ```
     */
    public async move(key: GlideString, dbIndex: number): Promise<boolean> {
        return this.createWritePromise(createMove(key, dbIndex));
    }

    /**
     * Displays a piece of generative computer art and the server version.
     *
     * @see {@link https://valkey.io/commands/lolwut/|valkey.io} for more details.
     *
     * @param options - (Optional) The LOLWUT options - see {@link LolwutOptions}.
     * @returns A piece of generative computer art along with the current server version.
     *
     * @example
     * ```typescript
     * const response = await client.lolwut({ version: 6, parameters: [40, 20] });
     * console.log(response); // Output: "Valkey ver. 7.2.3" - Indicates the current server version.
     * ```
     */
    public async lolwut(options?: LolwutOptions): Promise<string> {
        return this.createWritePromise(createLolwut(options), {
            decoder: Decoder.String,
        });
    }

    /**
     * Deletes a library and all its functions.
     *
     * @see {@link https://valkey.io/commands/function-delete/|valkey.io} for details.
     * @remarks Since Valkey version 7.0.0.
     *
     * @param libraryCode - The library name to delete.
     * @returns A simple `"OK"` response.
     *
     * @example
     * ```typescript
     * const result = await client.functionDelete("libName");
     * console.log(result); // Output: 'OK'
     * ```
     */
    public async functionDelete(libraryCode: GlideString): Promise<"OK"> {
        return this.createWritePromise(createFunctionDelete(libraryCode), {
            decoder: Decoder.String,
        });
    }

    /**
     * Loads a library to Valkey.
     *
     * @see {@link https://valkey.io/commands/function-load/|valkey.io} for details.
     * @remarks Since Valkey version 7.0.0.
     *
     * @param libraryCode - The source code that implements the library.
     * @param options - (Optional) Additional parameters:
     * - (Optional) `replace`: Whether the given library should overwrite a library with the same name if it
     *     already exists.
     * - (Optional) `decoder`: see {@link DecoderOption}.
     * @returns The library name that was loaded.
     *
     * @example
     * ```typescript
     * const code = "#!lua name=mylib \n redis.register_function('myfunc', function(keys, args) return args[1] end)";
     * const result = await client.functionLoad(code, true);
     * console.log(result); // Output: 'mylib'
     * ```
     */
    public async functionLoad(
        libraryCode: GlideString,
        options?: { replace?: boolean } & DecoderOption,
    ): Promise<GlideString> {
        return this.createWritePromise(
            createFunctionLoad(libraryCode, options?.replace),
            options,
        );
    }

    /**
     * Deletes all function libraries.
     *
     * @see {@link https://valkey.io/commands/function-flush/|valkey.io} for details.
     * @remarks Since Valkey version 7.0.0.
     *
     * @param mode - (Optional) The flushing mode, could be either {@link FlushMode.SYNC} or {@link FlushMode.ASYNC}.
     * @returns A simple `"OK"` response.
     *
     * @example
     * ```typescript
     * const result = await client.functionFlush(FlushMode.SYNC);
     * console.log(result); // Output: 'OK'
     * ```
     */
    public async functionFlush(mode?: FlushMode): Promise<"OK"> {
        return this.createWritePromise(createFunctionFlush(mode), {
            decoder: Decoder.String,
        });
    }

    /**
     * Returns information about the functions and libraries.
     *
     * @see {@link https://valkey.io/commands/function-list/|valkey.io} for details.
     * @remarks Since Valkey version 7.0.0.
     *
     * @param options - (Optional) See {@link FunctionListOptions} and {@link DecoderOption}.
     * @returns Info about all or selected libraries and their functions in {@link FunctionListResponse} format.
     *
     * @example
     * ```typescript
     * // Request info for specific library including the source code
     * const result1 = await client.functionList({ libNamePattern: "myLib*", withCode: true });
     * // Request info for all libraries
     * const result2 = await client.functionList();
     * console.log(result2); // Output:
     * // [{
     * //     "library_name": "myLib5_backup",
     * //     "engine": "LUA",
     * //     "functions": [{
     * //         "name": "myfunc",
     * //         "description": null,
     * //         "flags": [ "no-writes" ],
     * //     }],
     * //     "library_code": "#!lua name=myLib5_backup \n redis.register_function('myfunc', function(keys, args) return args[1] end)"
     * // }]
     * ```
     */
    public async functionList(
        options?: FunctionListOptions & DecoderOption,
    ): Promise<FunctionListResponse> {
        return this.createWritePromise<GlideRecord<unknown>[]>(
            createFunctionList(options),
            options,
        ).then(
            (res) =>
                res.map(convertGlideRecordToRecord) as FunctionListResponse,
        );
    }

    /**
     * Returns information about the function that's currently running and information about the
     * available execution engines.
     *
     * FUNCTION STATS runs on all nodes of the server, including primary and replicas.
     * The response includes a mapping from node address to the command response for that node.
     *
     * @see {@link https://valkey.io/commands/function-stats/|valkey.io} for details.
     * @remarks Since Valkey version 7.0.0.
     *
     * @param options - (Optional) See {@link DecoderOption}.
     * @returns A Record where the key is the node address and the value is a Record with two keys:
     *          - `"running_script"`: Information about the running script, or `null` if no script is running.
     *          - `"engines"`: Information about available engines and their stats.
     *          - see example for more details.
     * @example
     * ```typescript
     * const response = await client.functionStats();
     * console.log(response); // Example output:
     * // {
     * //     "127.0.0.1:6379": {                // Response from the primary node
     * //         "running_script": {
     * //             "name": "foo",
     * //             "command": ["FCALL", "foo", "0", "hello"],
     * //             "duration_ms": 7758
     * //         },
     * //         "engines": {
     * //             "LUA": {
     * //                 "libraries_count": 1,
     * //                 "functions_count": 1
     * //             }
     * //         }
     * //     },
     * //     "127.0.0.1:6380": {                // Response from a replica node
     * //         "running_script": null,
     * //         "engines": {
     * //             "LUA": {
     * //                 "libraries_count": 1,
     * //                 "functions_count": 1
     * //             }
     * //         }
     * //     }
     * // }
     * ```
     */
    public async functionStats(
        options?: DecoderOption,
    ): Promise<FunctionStatsFullResponse> {
        return this.createWritePromise<GlideRecord<unknown>>(
            createFunctionStats(),
            options,
        ).then(
            (res) =>
                convertGlideRecordToRecord(res) as FunctionStatsFullResponse,
        );
    }

    /**
     * Kills a function that is currently executing.
     * `FUNCTION KILL` terminates read-only functions only.
     * `FUNCTION KILL` runs on all nodes of the server, including primary and replicas.
     *
     * @see {@link https://valkey.io/commands/function-kill/|valkey.io} for details.
     * @remarks Since Valkey version 7.0.0.
     *
     * @returns `"OK"` if function is terminated. Otherwise, throws an error.
     * @example
     * ```typescript
     * await client.functionKill();
     * ```
     */
    public async functionKill(): Promise<"OK"> {
        return this.createWritePromise(createFunctionKill(), {
            decoder: Decoder.String,
        });
    }

    /**
     * Returns the serialized payload of all loaded libraries.
     *
     * @see {@link https://valkey.io/commands/function-dump/|valkey.io} for details.
     * @remarks Since Valkey version 7.0.0.
     *
     * @returns The serialized payload of all loaded libraries.
     *
     * @example
     * ```typescript
     * const data = await client.functionDump();
     * // data can be used to restore loaded functions on any Valkey instance
     * ```
     */
    public async functionDump(): Promise<Buffer> {
        return this.createWritePromise(createFunctionDump(), {
            decoder: Decoder.Bytes,
        });
    }

    /**
     * Restores libraries from the serialized payload returned by {@link functionDump}.
     *
     * @see {@link https://valkey.io/commands/function-restore/|valkey.io} for details.
     * @remarks Since Valkey version 7.0.0.
     *
     * @param payload - The serialized data from {@link functionDump}.
     * @param policy - (Optional) A policy for handling existing libraries, see {@link FunctionRestorePolicy}.
     *     {@link FunctionRestorePolicy.APPEND} is used by default.
     * @returns `"OK"`.
     *
     * @example
     * ```typescript
     * await client.functionRestore(data, FunctionRestorePolicy.FLUSH);
     * ```
     */
    public async functionRestore(
        payload: Buffer,
        policy?: FunctionRestorePolicy,
    ): Promise<"OK"> {
        return this.createWritePromise(createFunctionRestore(payload, policy), {
            decoder: Decoder.String,
        });
    }

    /**
     * Deletes all the keys of all the existing databases. This command never fails.
     *
     * @see {@link https://valkey.io/commands/flushall/|valkey.io} for more details.
     *
     * @param mode - (Optional) The flushing mode, could be either {@link FlushMode.SYNC} or {@link FlushMode.ASYNC}.
     * @returns `"OK"`.
     *
     * @example
     * ```typescript
     * const result = await client.flushall(FlushMode.SYNC);
     * console.log(result); // Output: 'OK'
     * ```
     */
    public async flushall(mode?: FlushMode): Promise<"OK"> {
        return this.createWritePromise(createFlushAll(mode), {
            decoder: Decoder.String,
        });
    }

    /**
     * Deletes all the keys of the currently selected database. This command never fails.
     *
     * @see {@link https://valkey.io/commands/flushdb/|valkey.io} for more details.
     *
     * @param mode - (Optional) The flushing mode, could be either {@link FlushMode.SYNC} or {@link FlushMode.ASYNC}.
     * @returns `"OK"`.
     *
     * @example
     * ```typescript
     * const result = await client.flushdb(FlushMode.SYNC);
     * console.log(result); // Output: 'OK'
     * ```
     */
    public async flushdb(mode?: FlushMode): Promise<"OK"> {
        return this.createWritePromise(createFlushDB(mode), {
            decoder: Decoder.String,
        });
    }

    /**
     * Returns the number of keys in the currently selected database.
     *
     * @see {@link https://valkey.io/commands/dbsize/|valkey.io} for more details.
     *
     * @returns The number of keys in the currently selected database.
     *
     * @example
     * ```typescript
     * const numKeys = await client.dbsize();
     * console.log("Number of keys in the current database: ", numKeys);
     * ```
     */
    public async dbsize(): Promise<number> {
        return this.createWritePromise(createDBSize());
    }

    /** Publish a message on pubsub channel.
     *
     * @see {@link https://valkey.io/commands/publish/|valkey.io} for more details.
     *
     * @param message - Message to publish.
     * @param channel - Channel to publish the message on.
     * @returns -  Number of subscriptions in primary node that received the message.
     * Note that this value does not include subscriptions that configured on replicas.
     *
     * @example
     * ```typescript
     * // Example usage of publish command
     * const result = await client.publish("Hi all!", "global-channel");
     * console.log(result); // Output: 1 - This message was posted to 1 subscription which is configured on primary node
     * ```
     */
    public async publish(
        message: GlideString,
        channel: GlideString,
    ): Promise<number> {
        return this.createWritePromise(createPublish(message, channel));
    }

    /**
     * Returns `UNIX TIME` of the last DB save timestamp or startup timestamp if no save
     * was made since then.
     *
     * @see {@link https://valkey.io/commands/lastsave/|valkey.io} for more details.
     *
     * @returns `UNIX TIME` of the last DB save executed with success.
     *
     * @example
     * ```typescript
     * const timestamp = await client.lastsave();
     * console.log("Last DB save was done at " + timestamp);
     * ```
     */
    public async lastsave(): Promise<number> {
        return this.createWritePromise(createLastSave());
    }

    /**
     * Returns a random existing key name from the currently selected database.
     *
     * @see {@link https://valkey.io/commands/randomkey/|valkey.io} for more details.
     * @param options - (Optional) See {@link DecoderOption}.
     * @returns A random existing key name from the currently selected database.
     *
     * @example
     * ```typescript
     * const result = await client.randomKey();
     * console.log(result); // Output: "key12" - "key12" is a random existing key name from the currently selected database.
     * ```
     */
    public async randomKey(
        options?: DecoderOption,
    ): Promise<GlideString | null> {
        return this.createWritePromise(createRandomKey(), options);
    }

    /**
     * Flushes all the previously watched keys for a transaction. Executing a transaction will
     * automatically flush all previously watched keys.
     *
     * @see {@link https://valkey.io/commands/unwatch/|valkey.io} and {@link https://valkey.io/topics/transactions/#cas|Valkey Glide Wiki} for more details.
     *
     * @returns A simple `"OK"` response.
     *
     * @example
     * ```typescript
     * let response = await client.watch(["sampleKey"]);
     * console.log(response); // Output: "OK"
     * response = await client.unwatch();
     * console.log(response); // Output: "OK"
     * ```
     */
    public async unwatch(): Promise<"OK"> {
        return this.createWritePromise(createUnWatch(), {
            decoder: Decoder.String,
        });
    }

    /**
     * Checks existence of scripts in the script cache by their SHA1 digest.
     *
     * @see {@link https://valkey.io/commands/script-exists/|valkey.io} for more details.
     *
     * @param sha1s - List of SHA1 digests of the scripts to check.
     * @returns A list of boolean values indicating the existence of each script.
     *
     * @example
     * ```typescript
     * console result = await client.scriptExists(["sha1_digest1", "sha1_digest2"]);
     * console.log(result); // Output: [true, false]
     * ```
     */
    public async scriptExists(sha1s: GlideString[]): Promise<boolean[]> {
        return this.createWritePromise(createScriptExists(sha1s));
    }

    /**
     * Flushes the Lua scripts cache.
     *
     * @see {@link https://valkey.io/commands/script-flush/|valkey.io} for more details.
     *
     * @param mode - (Optional) The flushing mode, could be either {@link FlushMode.SYNC} or {@link FlushMode.ASYNC}.
     * @returns A simple `"OK"` response.
     *
     * @example
     * ```typescript
     * console result = await client.scriptFlush(FlushMode.SYNC);
     * console.log(result); // Output: "OK"
     * ```
     */
    public async scriptFlush(mode?: FlushMode): Promise<"OK"> {
        return this.createWritePromise(createScriptFlush(mode), {
            decoder: Decoder.String,
        });
    }

    /**
     * Kills the currently executing Lua script, assuming no write operation was yet performed by the script.
     *
     * @see {@link https://valkey.io/commands/script-kill/|valkey.io} for more details.
     *
     * @returns A simple `"OK"` response.
     *
     * @example
     * ```typescript
     * console result = await client.scriptKill();
     * console.log(result); // Output: "OK"
     * ```
     */
    public async scriptKill(): Promise<"OK"> {
        return this.createWritePromise(createScriptKill(), {
            decoder: Decoder.String,
        });
    }

    /**
     * Incrementally iterate over a collection of keys.
     * `SCAN` is a cursor based iterator. This means that at every call of the method,
     * the server returns an updated cursor that the user needs to use as the cursor argument in the next call.
     * An iteration starts when the cursor is set to "0", and terminates when the cursor returned by the server is "0".
     *
     * A full iteration always retrieves all the elements that were present
     * in the collection from the start to the end of a full iteration.
     * Elements that were not constantly present in the collection during a full iteration, may be returned or not.
     *
     * @see {@link https://valkey.io/commands/scan|valkey.io} for more details.
     *
     * @param cursor - The `cursor` used for iteration. For the first iteration, the cursor should be set to "0".
     * Using a non-zero cursor in the first iteration,
     * or an invalid cursor at any iteration, will lead to undefined results.
     * Using the same cursor in multiple iterations will, in case nothing changed between the iterations,
     * return the same elements multiple times.
     * If the the db has changed, it may result in undefined behavior.
     * @param options - (Optional) The options to use for the scan operation, see {@link ScanOptions} and {@link DecoderOption}.
     * @returns A List containing the next cursor value and a list of keys,
     * formatted as [cursor, [key1, key2, ...]]
     *
     * @example
     * ```typescript
     * // Example usage of scan method
     * let result = await client.scan('0');
     * console.log(result); // Output: ['17', ['key1', 'key2', 'key3', 'key4', 'key5', 'set1', 'set2', 'set3']]
     * let firstCursorResult = result[0];
     * result = await client.scan(firstCursorResult);
     * console.log(result); // Output: ['349', ['key4', 'key5', 'set1', 'hash1', 'zset1', 'list1', 'list2',
     * // 'list3', 'zset2', 'zset3', 'zset4', 'zset5', 'zset6']]
     * result = await client.scan(result[0]);
     * console.log(result); // Output: ['0', ['key6', 'key7']]
     *
     * result = await client.scan(firstCursorResult, {match: 'key*', count: 2});
     * console.log(result); // Output: ['6', ['key4', 'key5']]
     *
     * result = await client.scan("0", {type: ObjectType.Set});
     * console.log(result); // Output: ['362', ['set1', 'set2', 'set3']]
     * ```
     */
    public async scan(
        cursor: GlideString,
        options?: ScanOptions & DecoderOption,
    ): Promise<[GlideString, GlideString[]]> {
        return this.createWritePromise(createScan(cursor, options), options);
    }
}
