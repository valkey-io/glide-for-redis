# Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

from __future__ import annotations

from typing import Dict, List, Mapping, Optional, Union, cast

from glide.async_commands.command_args import ObjectType
from glide.async_commands.core import (
    CoreCommands,
    FlushMode,
    FunctionRestorePolicy,
    InfoSection,
)
from glide.async_commands.transaction import Transaction
from glide.constants import (
    TOK,
    TEncodable,
    TFunctionListResponse,
    TFunctionStatsFullResponse,
    TResult,
)
from glide.protobuf.command_request_pb2 import RequestType

from ..glide import Script


class StandaloneCommands(CoreCommands):
    async def custom_command(self, command_args: List[TEncodable]) -> TResult:
        """
        Executes a single command, without checking inputs.
        See the [Valkey GLIDE Wiki](https://github.com/valkey-io/valkey-glide/wiki/General-Concepts#custom-command)
        for details on the restrictions and limitations of the custom command API.

            @example - Return a list of all pub/sub clients:

                connection.customCommand(["CLIENT", "LIST","TYPE", "PUBSUB"])
        Args:
            command_args (List[TEncodable]): List of the command's arguments, where each argument is either a string or bytes.
            Every part of the command, including the command name and subcommands, should be added as a separate value in args.

        Returns:
            TResult: The returning value depends on the executed command.
        """
        return await self._execute_command(RequestType.CustomCommand, command_args)

    async def info(
        self,
        sections: Optional[List[InfoSection]] = None,
    ) -> bytes:
        """
        Get information and statistics about the server.
        See https://valkey.io/commands/info/ for details.

        Args:
            sections (Optional[List[InfoSection]]): A list of InfoSection values specifying which sections of
            information to retrieve. When no parameter is provided, the default option is assumed.


        Returns:
            bytes: Returns bytes containing the information for the sections requested.
        """
        args: List[TEncodable] = (
            [section.value for section in sections] if sections else []
        )
        return cast(bytes, await self._execute_command(RequestType.Info, args))

    async def exec(
        self,
        transaction: Transaction,
    ) -> Optional[List[TResult]]:
        """
        Execute a transaction by processing the queued commands.
        See https://valkey.io/docs/topics/transactions/ for details on Transactions.

        Args:
            transaction (Transaction): A `Transaction` object containing a list of commands to be executed.

        Returns:
            Optional[List[TResult]]: A list of results corresponding to the execution of each command
                in the transaction. If a command returns a value, it will be included in the list. If a command
                doesn't return a value, the list entry will be `None`.
                If the transaction failed due to a WATCH command, `exec` will return `None`.
        """
        commands = transaction.commands[:]
        return await self._execute_transaction(commands)

    async def select(self, index: int) -> TOK:
        """
        Change the currently selected database.
        See https://valkey.io/commands/select/ for details.

        Args:
            index (int): The index of the database to select.

        Returns:
            A simple OK response.
        """
        return cast(TOK, await self._execute_command(RequestType.Select, [str(index)]))

    async def config_resetstat(self) -> TOK:
        """
        Resets the statistics reported by the server using the INFO and LATENCY HISTOGRAM commands.
        See https://valkey.io/commands/config-resetstat/ for details.

        Returns:
            OK: Returns "OK" to confirm that the statistics were successfully reset.
        """
        return cast(TOK, await self._execute_command(RequestType.ConfigResetStat, []))

    async def config_rewrite(self) -> TOK:
        """
        Rewrite the configuration file with the current configuration.
        See https://valkey.io/commands/config-rewrite/ for details.

        Returns:
            OK: OK is returned when the configuration was rewritten properly. Otherwise, an error is raised.
        """
        return cast(TOK, await self._execute_command(RequestType.ConfigRewrite, []))

    async def client_id(
        self,
    ) -> int:
        """
        Returns the current connection id.
        See https://valkey.io/commands/client-id/ for more information.

        Returns:
            int: the id of the client.
        """
        return cast(int, await self._execute_command(RequestType.ClientId, []))

    async def ping(self, message: Optional[TEncodable] = None) -> bytes:
        """
        Ping the server.
        See https://valkey.io/commands/ping/ for more details.

        Args:
           message (Optional[TEncodable]): An optional message to include in the PING command. If not provided,
            the server will respond with b"PONG". If provided, the server will respond with a copy of the message.

        Returns:
           bytes: b"PONG" if `message` is not provided, otherwise return a copy of `message`.

        Examples:
            >>> await client.ping()
                b"PONG"
            >>> await client.ping("Hello")
                b"Hello"
        """
        argument = [] if message is None else [message]
        return cast(bytes, await self._execute_command(RequestType.Ping, argument))

    async def config_get(self, parameters: List[TEncodable]) -> Dict[bytes, bytes]:
        """
        Get the values of configuration parameters.
        Starting from server version 7, command supports multiple parameters.
        See https://valkey.io/commands/config-get/ for details.

        Args:
            parameters (List[TEncodable]): A list of configuration parameter names to retrieve values for.

        Returns:
            Dict[bytes, bytes]: A dictionary of values corresponding to the configuration parameters.

        Examples:
            >>> await client.config_get(["timeout"] , RandomNode())
                {b'timeout': b'1000'}
            >>> await client.config_get([b"timeout" , "maxmemory"])
                {b'timeout': b'1000', b'maxmemory': b'1GB'}
        """
        return cast(
            Dict[bytes, bytes],
            await self._execute_command(RequestType.ConfigGet, parameters),
        )

    async def config_set(self, parameters_map: Mapping[TEncodable, TEncodable]) -> TOK:
        """
        Set configuration parameters to the specified values.
        Starting from server version 7, command supports multiple parameters.
        See https://valkey.io/commands/config-set/ for details.

        Args:
            parameters_map (Mapping[TEncodable, TEncodable]): A map consisting of configuration
            parameters and their respective values to set.

        Returns:
            OK: Returns OK if all configurations have been successfully set. Otherwise, raises an error.

        Examples:
            >>> config_set({"timeout": "1000", "maxmemory": "1GB"})
                OK
        """
        parameters: List[TEncodable] = []
        for pair in parameters_map.items():
            parameters.extend(pair)
        return cast(TOK, await self._execute_command(RequestType.ConfigSet, parameters))

    async def client_getname(self) -> Optional[bytes]:
        """
        Get the name of the primary's connection.
        See https://valkey.io/commands/client-getname/ for more details.

        Returns:
            Optional[bytes]: Returns the name of the client connection as a byte string if a name is set,
            or None if no name is assigned.

        Examples:
            >>> await client.client_getname()
                b'Connection Name'
        """
        return cast(
            Optional[bytes], await self._execute_command(RequestType.ClientGetName, [])
        )

    async def dbsize(self) -> int:
        """
        Returns the number of keys in the currently selected database.
        See https://valkey.io/commands/dbsize for more details.

        Returns:
            int: The number of keys in the currently selected database.

        Examples:
            >>> await client.dbsize()
                10  # Indicates there are 10 keys in the current database.
        """
        return cast(int, await self._execute_command(RequestType.DBSize, []))

    async def echo(self, message: TEncodable) -> bytes:
        """
        Echoes the provided `message` back.

        See https://valkey.io/commands/echo for more details.

        Args:
            message (TEncodable): The message to be echoed back.

        Returns:
            bytes: The provided `message`.

        Examples:
            >>> await client.echo("Valkey GLIDE")
                b'Valkey GLIDE'
        """
        return cast(bytes, await self._execute_command(RequestType.Echo, [message]))

    async def function_load(
        self, library_code: TEncodable, replace: bool = False
    ) -> bytes:
        """
        Loads a library to Valkey.

        See https://valkey.io/commands/function-load/ for more details.

        Args:
            library_code (TEncodable): The source code that implements the library.
            replace (bool): Whether the given library should overwrite a library with the same name if
                it already exists.

        Returns:
            bytes: The library name that was loaded.

        Examples:
            >>> code = "#!lua name=mylib \n redis.register_function('myfunc', function(keys, args) return args[1] end)"
            >>> await client.function_load(code, True)
                b"mylib"

        Since: Valkey 7.0.0.
        """
        return cast(
            bytes,
            await self._execute_command(
                RequestType.FunctionLoad,
                ["REPLACE", library_code] if replace else [library_code],
            ),
        )

    async def function_list(
        self, library_name_pattern: Optional[TEncodable] = None, with_code: bool = False
    ) -> TFunctionListResponse:
        """
        Returns information about the functions and libraries.

        See https://valkey.io/commands/function-list/ for more details.

        Args:
            library_name_pattern (Optional[TEncodable]):  A wildcard pattern for matching library names.
            with_code (bool): Specifies whether to request the library code from the server or not.

        Returns:
            TFunctionListResponse: Info about all or
                selected libraries and their functions.

        Examples:
            >>> response = await client.function_list("myLib?_backup", True)
                [{
                    b"library_name": b"myLib5_backup",
                    b"engine": b"LUA",
                    b"functions": [{
                        b"name": b"myfunc",
                        b"description": None,
                        b"flags": {b"no-writes"},
                    }],
                    b"library_code": b"#!lua name=mylib \n sever.register_function('myfunc', function(keys, args) return args[1] end)"
                }]

        Since: Valkey 7.0.0.
        """
        args = []
        if library_name_pattern is not None:
            args.extend(["LIBRARYNAME", library_name_pattern])
        if with_code:
            args.append("WITHCODE")
        return cast(
            TFunctionListResponse,
            await self._execute_command(
                RequestType.FunctionList,
                args,
            ),
        )

    async def function_flush(self, mode: Optional[FlushMode] = None) -> TOK:
        """
        Deletes all function libraries.

        See https://valkey.io/commands/function-flush/ for more details.

        Args:
            mode (Optional[FlushMode]): The flushing mode, could be either `SYNC` or `ASYNC`.

        Returns:
            TOK: A simple `OK`.

        Examples:
            >>> await client.function_flush(FlushMode.SYNC)
                "OK"

        Since: Valkey 7.0.0.
        """
        return cast(
            TOK,
            await self._execute_command(
                RequestType.FunctionFlush,
                [mode.value] if mode else [],
            ),
        )

    async def function_delete(self, library_name: TEncodable) -> TOK:
        """
        Deletes a library and all its functions.

        See https://valkey.io/commands/function-delete/ for more details.

        Args:
            library_code (TEncodable): The library name to delete

        Returns:
            TOK: A simple `OK`.

        Examples:
            >>> await client.function_delete("my_lib")
                "OK"

        Since: Valkey 7.0.0.
        """
        return cast(
            TOK,
            await self._execute_command(
                RequestType.FunctionDelete,
                [library_name],
            ),
        )

    async def function_kill(self) -> TOK:
        """
        Kills a function that is currently executing.
        This command only terminates read-only functions.

        FUNCTION KILL runs on all nodes of the server, including primary and replicas.

        See https://valkey.io/commands/function-kill/ for more details.

        Returns:
            TOK: A simple `OK`.

        Examples:
            >>> await client.function_kill()
                "OK"

        Since: Valkey 7.0.0.
        """
        return cast(
            TOK,
            await self._execute_command(RequestType.FunctionKill, []),
        )

    async def function_stats(self) -> TFunctionStatsFullResponse:
        """
        Returns information about the function that's currently running and information about the
        available execution engines.

        FUNCTION STATS runs on all nodes of the server, including primary and replicas.
        The response includes a mapping from node address to the command response for that node.

        See https://valkey.io/commands/function-stats/ for more details

        Returns:
            TFunctionStatsFullResponse: A Map where the key is the node address and the value is a Map of two keys:
                - `running_script` with information about the running script.
                - `engines` with information about available engines and their stats.
                See example for more details.

        Examples:
            >>> await client.function_stats()
                {b"addr": {                         # Response from the master node
                    b'running_script': {
                        b'name': b'foo',
                        b'command': [b'FCALL', b'foo', b'0', b'hello'],
                        b'duration_ms': 7758
                    },
                    b'engines': {
                        b'LUA': {
                            b'libraries_count': 1,
                            b'functions_count': 1,
                        }
                    }
                },
                b"addr2": {                         # Response from a replica
                    b'running_script': None,
                    b"engines": {
                        b'LUA': {
                            b'libraries_count': 1,
                            b'functions_count': 1,
                        }
                    }
                }}

        Since: Valkey version 7.0.0.
        """
        return cast(
            TFunctionStatsFullResponse,
            await self._execute_command(RequestType.FunctionStats, []),
        )

    async def function_dump(self) -> bytes:
        """
        Returns the serialized payload of all loaded libraries.

        See https://valkey.io/docs/latest/commands/function-dump/ for more details.

        Returns:
            bytes: The serialized payload of all loaded libraries.

        Examples:
            >>> payload = await client.function_dump()
                # The serialized payload of all loaded libraries. This response can
                # be used to restore loaded functions on any Valkey instance.
            >>> await client.function_restore(payload)
                "OK" # The serialized dump response was used to restore the libraries.

        Since: Valkey 7.0.0.
        """
        return cast(bytes, await self._execute_command(RequestType.FunctionDump, []))

    async def function_restore(
        self, payload: TEncodable, policy: Optional[FunctionRestorePolicy] = None
    ) -> TOK:
        """
        Restores libraries from the serialized payload returned by the `function_dump` command.

        See https://valkey.io/docs/latest/commands/function-restore/ for more details.

        Args:
            payload (TEncodable): The serialized data from the `function_dump` command.
            policy (Optional[FunctionRestorePolicy]): A policy for handling existing libraries.

        Returns:
            TOK: OK.

        Examples:
            >>> payload = await client.function_dump()
                # The serialized payload of all loaded libraries. This response can
                # be used to restore loaded functions on any Valkey instance.
            >>> await client.function_restore(payload)
                "OK" # The serialized dump response was used to restore the libraries.
            >>> await client.function_restore(payload, FunctionRestorePolicy.FLUSH)
                "OK" # The serialized dump response was used to restore the libraries with the specified policy.

        Since: Valkey 7.0.0.
        """
        args: List[TEncodable] = [payload]
        if policy is not None:
            args.append(policy.value)

        return cast(TOK, await self._execute_command(RequestType.FunctionRestore, args))

    async def time(self) -> List[bytes]:
        """
        Returns the server time.

        See https://valkey.io/commands/time/ for more details.

        Returns:
            List[bytes]:  The current server time as a two items `array`:
            A Unix timestamp and the amount of microseconds already elapsed in the current second.
            The returned `array` is in a [Unix timestamp, Microseconds already elapsed] format.

        Examples:
            >>> await client.time()
                [b'1710925775', b'913580']
        """
        return cast(
            List[bytes],
            await self._execute_command(RequestType.Time, []),
        )

    async def lastsave(self) -> int:
        """
        Returns the Unix time of the last DB save timestamp or startup timestamp if no save was made since then.

        See https://valkey.io/commands/lastsave for more details.

        Returns:
            int: The Unix time of the last successful DB save.

        Examples:
            >>> await client.lastsave()
                1710925775  # Unix time of the last DB save
        """
        return cast(
            int,
            await self._execute_command(RequestType.LastSave, []),
        )

    async def move(self, key: TEncodable, db_index: int) -> bool:
        """
        Move `key` from the currently selected database to the database specified by `db_index`.

        See https://valkey.io/commands/move/ for more details.

        Args:
            key (TEncodable): The key to move.
            db_index (int): The index of the database to move `key` to.

        Returns:
            bool: True if `key` was moved, or False if the `key` already exists in the destination database
                or does not exist in the source database.

        Example:
            >>> await client.move("some_key", 1)
                True
        """
        return cast(
            bool,
            await self._execute_command(RequestType.Move, [key, str(db_index)]),
        )

    async def publish(self, message: TEncodable, channel: TEncodable) -> int:
        """
        Publish a message on pubsub channel.
        See https://valkey.io/commands/publish for more details.

        Args:
            message (TEncodable): Message to publish
            channel (TEncodable): Channel to publish the message on.

        Returns:
            int: Number of subscriptions in primary node that received the message.
            Note that this value does not include subscriptions that configured on replicas.

        Examples:
            >>> await client.publish("Hi all!", "global-channel")
                1 # This message was posted to 1 subscription which is configured on primary node
        """
        return cast(
            int, await self._execute_command(RequestType.Publish, [channel, message])
        )

    async def flushall(self, flush_mode: Optional[FlushMode] = None) -> TOK:
        """
        Deletes all the keys of all the existing databases. This command never fails.

        See https://valkey.io/commands/flushall for more details.

        Args:
            flush_mode (Optional[FlushMode]): The flushing mode, could be either `SYNC` or `ASYNC`.

        Returns:
            TOK: A simple OK response.

        Examples:
            >>> await client.flushall(FlushMode.ASYNC)
                OK  # This command never fails.
        """
        args: List[TEncodable] = []
        if flush_mode is not None:
            args.append(flush_mode.value)

        return cast(
            TOK,
            await self._execute_command(RequestType.FlushAll, args),
        )

    async def flushdb(self, flush_mode: Optional[FlushMode] = None) -> TOK:
        """
        Deletes all the keys of the currently selected database. This command never fails.

        See https://valkey.io/commands/flushdb for more details.

        Args:
            flush_mode (Optional[FlushMode]): The flushing mode, could be either `SYNC` or `ASYNC`.

        Returns:
            TOK: A simple OK response.

        Examples:
            >>> await client.flushdb()
                OK  # The keys of the currently selected database were deleted.
            >>> await client.flushdb(FlushMode.ASYNC)
                OK  # The keys of the currently selected database were deleted asynchronously.
        """
        args: List[TEncodable] = []
        if flush_mode is not None:
            args.append(flush_mode.value)

        return cast(
            TOK,
            await self._execute_command(RequestType.FlushDB, args),
        )

    async def copy(
        self,
        source: TEncodable,
        destination: TEncodable,
        destinationDB: Optional[int] = None,
        replace: Optional[bool] = None,
    ) -> bool:
        """
        Copies the value stored at the `source` to the `destination` key. If `destinationDB`
        is specified, the value will be copied to the database specified by `destinationDB`,
        otherwise the current database will be used. When `replace` is True, removes the
        `destination` key first if it already exists, otherwise performs no action.

        See https://valkey.io/commands/copy for more details.

        Args:
            source (TEncodable): The key to the source value.
            destination (TEncodable): The key where the value should be copied to.
            destinationDB (Optional[int]): The alternative logical database index for the destination key.
            replace (Optional[bool]): If the destination key should be removed before copying the value to it.

        Returns:
            bool: True if the source was copied. Otherwise, return False.

        Examples:
            >>> await client.set("source", "sheep")
            >>> await client.copy(b"source", b"destination", 1, False)
                True # Source was copied
            >>> await client.select(1)
            >>> await client.get("destination")
                b"sheep"

        Since: Valkey version 6.2.0.
        """
        args: List[TEncodable] = [source, destination]
        if destinationDB is not None:
            args.extend(["DB", str(destinationDB)])
        if replace is True:
            args.append("REPLACE")
        return cast(
            bool,
            await self._execute_command(RequestType.Copy, args),
        )

    async def lolwut(
        self,
        version: Optional[int] = None,
        parameters: Optional[List[int]] = None,
    ) -> bytes:
        """
        Displays a piece of generative computer art and the Valkey version.

        See https://valkey.io/commands/lolwut for more details.

        Args:
            version (Optional[int]): Version of computer art to generate.
            parameters (Optional[List[int]]): Additional set of arguments in order to change the output:
                For version `5`, those are length of the line, number of squares per row, and number of squares per column.
                For version `6`, those are number of columns and number of lines.

        Returns:
            bytes: A piece of generative computer art along with the current Valkey version.

        Examples:
            >>> await client.lolwut(6, [40, 20]);
                b"Redis ver. 7.2.3" # Indicates the current Valkey version
            >>> await client.lolwut(5, [30, 5, 5]);
                b"Redis ver. 7.2.3" # Indicates the current Valkey version
        """
        args: List[TEncodable] = []
        if version is not None:
            args.extend(["VERSION", str(version)])
        if parameters:
            for var in parameters:
                args.extend(str(var))
        return cast(
            bytes,
            await self._execute_command(RequestType.Lolwut, args),
        )

    async def random_key(self) -> Optional[bytes]:
        """
        Returns a random existing key name from the currently selected database.

        See https://valkey.io/commands/randomkey for more details.

        Returns:
            Optional[bytes]: A random existing key name from the currently selected database.

        Examples:
            >>> await client.random_key()
                b"random_key_name"  # "random_key_name" is a random existing key name from the currently selected database.
        """
        return cast(
            Optional[bytes],
            await self._execute_command(RequestType.RandomKey, []),
        )

    async def wait(
        self,
        numreplicas: int,
        timeout: int,
    ) -> int:
        """
        Blocks the current client until all the previous write commands are successfully transferred
        and acknowledged by at least `numreplicas` of replicas. If `timeout` is
        reached, the command returns even if the specified number of replicas were not yet reached.

        See https://valkey.io/commands/wait for more details.

        Args:
            numreplicas (int): The number of replicas to reach.
            timeout (int): The timeout value specified in milliseconds. A value of 0 will block indefinitely.

        Returns:
            int: The number of replicas reached by all the writes performed in the context of the current connection.

        Examples:
            >>> await client.set("key", "value");
            >>> await client.wait(1, 1000);
            // return 1 when a replica is reached or 0 if 1000ms is reached.
        """
        args: List[TEncodable] = [str(numreplicas), str(timeout)]
        return cast(
            int,
            await self._execute_command(RequestType.Wait, args),
        )

    async def unwatch(self) -> TOK:
        """
        Flushes all the previously watched keys for a transaction. Executing a transaction will
        automatically flush all previously watched keys.

        See https://valkey.io/commands/unwatch for more details.

        Returns:
            TOK: A simple "OK" response.

        Examples:
            >>> await client.watch("sampleKey")
                'OK'
            >>> await client.unwatch()
                'OK'
        """
        return cast(
            TOK,
            await self._execute_command(RequestType.UnWatch, []),
        )

    async def scan(
        self,
        cursor: TEncodable,
        match: Optional[TEncodable] = None,
        count: Optional[int] = None,
        type: Optional[ObjectType] = None,
    ) -> List[Union[bytes, List[bytes]]]:
        """
        Incrementally iterate over a collection of keys.
        SCAN is a cursor based iterator. This means that at every call of the command,
        the server returns an updated cursor that the user needs to use as the cursor argument in the next call.
        An iteration starts when the cursor is set to "0", and terminates when the cursor returned by the server is "0".

        A full iteration always retrieves all the elements that were present
        in the collection from the start to the end of a full iteration.
        Elements that were not constantly present in the collection during a full iteration, may be returned or not.

        See https://valkey.io/commands/scan for more details.

        Args:
            cursor (TResult): The cursor used for iteration. For the first iteration, the cursor should be set to "0".
              Using a non-zero cursor in the first iteration,
              or an invalid cursor at any iteration, will lead to undefined results.
              Using the same cursor in multiple iterations will, in case nothing changed between the iterations,
                return the same elements multiple times.
                If the the db has changed, it may result an undefined behavior.
            match (Optional[TResult]): A pattern to match keys against.
            count (Optional[int]): The number of keys to return per iteration.
                The number of keys returned per iteration is not guaranteed to be the same as the count argument.
                the argument is used as a hint for the server to know how many "steps" it can use to retrieve the keys.
                The default value is 10.
            type (ObjectType): The type of object to scan for.

        Returns:
            List[Union[bytes, List[bytes]]]: A List containing the next cursor value and a list of keys,
                formatted as [cursor, [key1, key2, ...]]

        Examples:
        >>> result = await client.scan(b'0')
            print(result) #[b'17', [b'key1', b'key2', b'key3', b'key4', b'key5', b'set1', b'set2', b'set3']]
            first_cursor_result = result[0]
            result = await client.scan(first_cursor_result)
            print(result) #[b'349', [b'key4', b'key5', b'set1', b'hash1', b'zset1', b'list1', b'list2',
                                    b'list3', b'zset2', b'zset3', b'zset4', b'zset5', b'zset6']]
            result = await client.scan(result[0])
            print(result) #[b'0', [b'key6', b'key7']]

        >>> result = await client.scan(first_cursor_result, match=b'key*', count=2)
            print(result) #[b'6', [b'key4', b'key5']]

        >>> result = await client.scan("0", type=ObjectType.Set)
            print(result) #[b'362', [b'set1', b'set2', b'set3']]
        """
        args = [cursor]
        if match:
            args.extend(["MATCH", match])
        if count:
            args.extend(["COUNT", str(count)])
        if type:
            args.extend(["TYPE", type.value])
        return cast(
            List[Union[bytes, List[bytes]]],
            await self._execute_command(RequestType.Scan, args),
        )

    async def script_exists(self, sha1s: List[TEncodable]) -> List[bool]:
        """
        Check existence of scripts in the script cache by their SHA1 digest.

        See https://valkey.io/commands/script-exists for more details.

        Args:
            sha1s (List[TEncodable]): List of SHA1 digests of the scripts to check.

        Returns:
            List[bool]: A list of boolean values indicating the existence of each script.

        Examples:
            >>> await client.script_exists(["sha1_digest1", "sha1_digest2"])
                [True, False]
        """
        return cast(
            List[bool], await self._execute_command(RequestType.ScriptExists, sha1s)
        )

    async def script_flush(self, mode: Optional[FlushMode] = None) -> TOK:
        """
        Flush the Lua scripts cache.

        See https://valkey.io/commands/script-flush for more details.

        Args:
            mode (Optional[FlushMode]): The flushing mode, could be either `SYNC` or `ASYNC`.

        Returns:
            TOK: A simple `OK` response.

        Examples:
            >>> await client.script_flush()
                "OK"

            >>> await client.script_flush(FlushMode.ASYNC)
                "OK"
        """

        return cast(
            TOK,
            await self._execute_command(
                RequestType.ScriptFlush, [mode.value] if mode else []
            ),
        )

    async def script_kill(self) -> TOK:
        """
        Kill the currently executing Lua script, assuming no write operation was yet performed by the script.

        See https://valkey.io/commands/script-kill for more details.

        Returns:
            TOK: A simple `OK` response.

        Examples:
            >>> await client.script_kill()
                "OK"
        """
        return cast(TOK, await self._execute_command(RequestType.ScriptKill, []))

    async def invoke_script(
        self,
        script: Script,
        keys: Optional[List[TEncodable]] = None,
        args: Optional[List[TEncodable]] = None,
    ) -> TResult:
        """
        Invokes a Lua script with its keys and arguments.
        This method simplifies the process of invoking scripts on a the server by using an object that represents a Lua script.
        The script loading, argument preparation, and execution will all be handled internally.
        If the script has not already been loaded, it will be loaded automatically using the `SCRIPT LOAD` command.
        After that, it will be invoked using the `EVALSHA` command.

        See https://valkey.io/commands/script-load/ and https://valkey.io/commands/evalsha/ for more details.

        Args:
            script (Script): The Lua script to execute.
            keys (Optional[List[TEncodable]]): The keys that are used in the script.
            args (Optional[List[TEncodable]]): The arguments for the script.

        Returns:
            TResult: a value that depends on the script that was executed.

        Examples:
            >>> lua_script = Script("return { KEYS[1], ARGV[1] }")
            >>> await client.invoke_script(lua_script, keys=["foo"], args=["bar"] );
                [b"foo", b"bar"]
        """
        return await self._execute_script(script.get_hash(), keys, args)
