# Copyright GLIDE-for-Redis Project Contributors - SPDX Identifier: Apache-2.0

from __future__ import annotations

import asyncio
import math
import time
from datetime import datetime, timedelta, timezone
from typing import Dict, Union, cast

import pytest
from glide import ClosingError, RequestError, Script
from glide.async_commands.core import (
    ConditionalChange,
    ExpireOptions,
    ExpirySet,
    ExpiryType,
    GeospatialData,
    GeoUnit,
    InfBound,
    InfoSection,
    InsertPosition,
    StreamAddOptions,
    TrimByMaxLen,
    TrimByMinId,
    UpdateOptions,
)
from glide.async_commands.sorted_set import (
    InfBound,
    LexBoundary,
    Limit,
    RangeByIndex,
    RangeByLex,
    RangeByScore,
    ScoreBoundary,
)
from glide.config import ProtocolVersion, RedisCredentials
from glide.constants import OK, TResult
from glide.redis_client import RedisClient, RedisClusterClient, TRedisClient
from glide.routes import (
    AllNodes,
    AllPrimaries,
    ByAddressRoute,
    RandomNode,
    Route,
    SlotIdRoute,
    SlotKeyRoute,
    SlotType,
)
from tests.conftest import create_client
from tests.utils.utils import (
    check_if_server_version_lt,
    compare_maps,
    get_first_result,
    get_random_string,
    is_single_response,
    parse_info_response,
)


@pytest.mark.asyncio
class TestRedisClients:
    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_register_client_name_and_version(self, redis_client: TRedisClient):
        min_version = "7.2.0"
        if await check_if_server_version_lt(redis_client, min_version):
            # TODO: change it to pytest fixture after we'll implement a sync client
            return pytest.mark.skip(reason=f"Redis version required >= {min_version}")
        info = await redis_client.custom_command(["CLIENT", "INFO"])
        assert type(info) is str
        assert "lib-name=GlidePy" in info
        assert "lib-ver=unknown" in info

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_send_and_receive_large_values(self, redis_client: TRedisClient):
        length = 2**16
        key = get_random_string(length)
        value = get_random_string(length)
        assert len(key) == length
        assert len(value) == length
        await redis_client.set(key, value)
        assert await redis_client.get(key) == value

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_send_and_receive_non_ascii_unicode(self, redis_client: TRedisClient):
        key = "foo"
        value = "שלום hello 汉字"
        assert value == "שלום hello 汉字"
        await redis_client.set(key, value)
        assert await redis_client.get(key) == value

    @pytest.mark.parametrize("value_size", [100, 2**16])
    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_client_handle_concurrent_workload_without_dropping_or_changing_values(
        self, redis_client: TRedisClient, value_size
    ):
        num_of_concurrent_tasks = 100
        running_tasks = set()

        async def exec_command(i):
            range_end = 1 if value_size > 100 else 100
            for _ in range(range_end):
                value = get_random_string(value_size)
                assert await redis_client.set(str(i), value) == OK
                assert await redis_client.get(str(i)) == value

        for i in range(num_of_concurrent_tasks):
            task = asyncio.create_task(exec_command(i))
            running_tasks.add(task)
            task.add_done_callback(running_tasks.discard)
        await asyncio.gather(*(list(running_tasks)))

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_can_connect_with_auth_requirepass(
        self, redis_client: TRedisClient, request
    ):
        is_cluster = isinstance(redis_client, RedisClusterClient)
        password = "TEST_AUTH"
        credentials = RedisCredentials(password)
        try:
            await redis_client.custom_command(
                ["CONFIG", "SET", "requirepass", password]
            )

            with pytest.raises(ClosingError, match="NOAUTH"):
                # Creation of a new client without password should fail
                await create_client(
                    request,
                    is_cluster,
                    addresses=redis_client.config.addresses,
                )

            auth_client = await create_client(
                request,
                is_cluster,
                credentials,
                addresses=redis_client.config.addresses,
            )
            key = get_random_string(10)
            assert await auth_client.set(key, key) == OK
            assert await auth_client.get(key) == key
        finally:
            # Reset the password
            auth_client = await create_client(
                request,
                is_cluster,
                credentials,
                addresses=redis_client.config.addresses,
            )
            await auth_client.custom_command(["CONFIG", "SET", "requirepass", ""])

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_can_connect_with_auth_acl(
        self, redis_client: Union[RedisClient, RedisClusterClient], request
    ):
        is_cluster = isinstance(redis_client, RedisClusterClient)
        username = "testuser"
        password = "TEST_AUTH"
        try:
            assert (
                await redis_client.custom_command(
                    [
                        "ACL",
                        "SETUSER",
                        username,
                        "on",
                        "allkeys",
                        "+get",
                        "+cluster",
                        "+ping",
                        "+info",
                        "+client",
                        f">{password}",
                    ]
                )
                == OK
            )
            key = get_random_string(10)
            assert await redis_client.set(key, key) == OK
            credentials = RedisCredentials(password, username)

            testuser_client = await create_client(
                request,
                is_cluster,
                credentials,
                addresses=redis_client.config.addresses,
            )
            assert await testuser_client.get(key) == key
            with pytest.raises(RequestError) as e:
                # This client isn't authorized to perform SET
                await testuser_client.set("foo", "bar")
            assert "NOPERM" in str(e)
        finally:
            # Delete this user
            await redis_client.custom_command(["ACL", "DELUSER", username])

    @pytest.mark.parametrize("cluster_mode", [False])
    async def test_select_standalone_database_id(self, request, cluster_mode):
        redis_client = await create_client(
            request, cluster_mode=cluster_mode, database_id=4
        )
        client_info = await redis_client.custom_command(["CLIENT", "INFO"])
        assert "db=4" in client_info

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_client_name(self, request, cluster_mode, protocol):
        redis_client = await create_client(
            request,
            cluster_mode=cluster_mode,
            client_name="TEST_CLIENT_NAME",
            protocol=protocol,
        )
        client_info = await redis_client.custom_command(["CLIENT", "INFO"])
        assert "name=TEST_CLIENT_NAME" in client_info

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_closed_client_raises_error(self, redis_client: TRedisClient):
        await redis_client.close()
        with pytest.raises(ClosingError) as e:
            await redis_client.set("foo", "bar")
        assert "the client is closed" in str(e)


@pytest.mark.asyncio
class TestCommands:
    @pytest.mark.smoke_test
    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_socket_set_get(self, redis_client: TRedisClient):
        key = get_random_string(10)
        value = datetime.now(timezone.utc).strftime("%m/%d/%Y, %H:%M:%S")
        assert await redis_client.set(key, value) == OK
        assert await redis_client.get(key) == value

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP3])
    async def test_use_resp3_protocol(self, redis_client: TRedisClient):
        result = cast(Dict[str, str], await redis_client.custom_command(["HELLO"]))

        assert int(result["proto"]) == 3

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2])
    async def test_allow_opt_in_to_resp2_protocol(self, redis_client: TRedisClient):
        result = cast(Dict[str, str], await redis_client.custom_command(["HELLO"]))

        assert int(result["proto"]) == 2

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_conditional_set(self, redis_client: TRedisClient):
        key = get_random_string(10)
        value = get_random_string(10)
        res = await redis_client.set(
            key, value, conditional_set=ConditionalChange.ONLY_IF_EXISTS
        )
        assert res is None
        res = await redis_client.set(
            key, value, conditional_set=ConditionalChange.ONLY_IF_DOES_NOT_EXIST
        )
        assert res == OK
        assert await redis_client.get(key) == value
        res = await redis_client.set(
            key, "foobar", conditional_set=ConditionalChange.ONLY_IF_DOES_NOT_EXIST
        )
        assert res is None
        assert await redis_client.get(key) == value

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_set_return_old_value(self, redis_client: TRedisClient):
        min_version = "6.2.0"
        if await check_if_server_version_lt(redis_client, min_version):
            # TODO: change it to pytest fixture after we'll implement a sync client
            return pytest.mark.skip(reason=f"Redis version required >= {min_version}")
        key = get_random_string(10)
        value = get_random_string(10)
        res = await redis_client.set(key, value)
        assert res == OK
        assert await redis_client.get(key) == value
        new_value = get_random_string(10)
        res = await redis_client.set(key, new_value, return_old_value=True)
        assert res == value
        assert await redis_client.get(key) == new_value

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_custom_command_single_arg(self, redis_client: TRedisClient):
        # Test single arg command
        res = await redis_client.custom_command(["PING"])
        assert res == "PONG"

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_custom_command_multi_arg(self, redis_client: TRedisClient):
        # Test multi args command
        client_list = await redis_client.custom_command(
            ["CLIENT", "LIST", "TYPE", "NORMAL"]
        )
        assert isinstance(client_list, (str, list))
        res: str = get_first_result(client_list)
        assert res is not None
        assert "id" in res
        assert "cmd=client" in res

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_custom_command_lower_and_upper_case(
        self, redis_client: TRedisClient
    ):
        # Test multi args command
        client_list = await redis_client.custom_command(
            ["CLIENT", "LIST", "TYPE", "NORMAL"]
        )
        assert isinstance(client_list, (str, list))
        res: str = get_first_result(client_list)
        assert res is not None
        assert "id" in res
        assert "cmd=client" in res

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_request_error_raises_exception(self, redis_client: TRedisClient):
        key = get_random_string(10)
        value = get_random_string(10)
        await redis_client.set(key, value)
        with pytest.raises(RequestError) as e:
            await redis_client.custom_command(["HSET", key, "1", "bar"])
        assert "WRONGTYPE" in str(e)

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_info_server_replication(self, redis_client: TRedisClient):
        info = get_first_result(await redis_client.info([InfoSection.SERVER]))
        assert "# Server" in info
        cluster_mode = parse_info_response(info)["redis_mode"]
        expected_cluster_mode = isinstance(redis_client, RedisClusterClient)
        assert cluster_mode == "cluster" if expected_cluster_mode else "standalone"
        info = get_first_result(await redis_client.info([InfoSection.REPLICATION]))
        assert "# Replication" in info
        assert "# Errorstats" not in info

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_info_default(self, redis_client: TRedisClient):
        cluster_mode = isinstance(redis_client, RedisClusterClient)
        info_result = await redis_client.info()
        if cluster_mode:
            cluster_nodes = await redis_client.custom_command(["CLUSTER", "NODES"])
            assert isinstance(cluster_nodes, (str, list))
            cluster_nodes = get_first_result(cluster_nodes)
            expected_num_of_results = cluster_nodes.count("master")
            assert len(info_result) == expected_num_of_results
        info_result = get_first_result(info_result)
        assert "# Memory" in info_result

    @pytest.mark.parametrize("cluster_mode", [False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_select(self, redis_client: RedisClient):
        assert await redis_client.select(0) == OK
        key = get_random_string(10)
        value = get_random_string(10)
        assert await redis_client.set(key, value) == OK
        assert await redis_client.get(key) == value
        assert await redis_client.select(1) == OK
        assert await redis_client.get(key) is None
        assert await redis_client.select(0) == OK
        assert await redis_client.get(key) == value

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_delete(self, redis_client: TRedisClient):
        keys = [get_random_string(10), get_random_string(10), get_random_string(10)]
        value = get_random_string(10)
        [await redis_client.set(key, value) for key in keys]
        assert await redis_client.get(keys[0]) == value
        assert await redis_client.get(keys[1]) == value
        assert await redis_client.get(keys[2]) == value
        delete_keys = keys + [get_random_string(10)]
        assert await redis_client.delete(delete_keys) == 3
        assert await redis_client.delete(keys) == 0

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_config_reset_stat(self, redis_client: TRedisClient):
        # we execute set and info so the commandstats will show `cmdstat_set::calls` greater than 1
        # after the configResetStat call we initiate an info command and the the commandstats won't contain `cmdstat_set`.
        await redis_client.set("foo", "bar")
        info_stats = str(await redis_client.info([InfoSection.COMMAND_STATS]))

        assert "cmdstat_set" in info_stats

        assert await redis_client.config_resetstat() == OK
        info_stats = str(await redis_client.info([InfoSection.COMMAND_STATS]))

        # 1 stands for the second info command
        assert "cmdstat_set" not in info_stats

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_config_rewrite(self, redis_client: TRedisClient):
        info_server = parse_info_response(
            get_first_result(await redis_client.info([InfoSection.SERVER]))
        )
        if len(info_server["config_file"]) > 0:
            assert await redis_client.config_rewrite() == OK
        else:
            # We expect Redis to return an error since the test cluster doesn't use redis.conf file
            with pytest.raises(RequestError) as e:
                await redis_client.config_rewrite()
            assert "The server is running without a config file" in str(e)

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_client_id(self, redis_client: TRedisClient):
        client_id = await redis_client.client_id()
        assert type(client_id) is int
        assert client_id > 0

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_incr_commands_existing_key(self, redis_client: TRedisClient):
        key = get_random_string(10)
        assert await redis_client.set(key, "10") == OK
        assert await redis_client.incr(key) == 11
        assert await redis_client.get(key) == "11"
        assert await redis_client.incrby(key, 4) == 15
        assert await redis_client.get(key) == "15"
        assert await redis_client.incrbyfloat(key, 5.5) == 20.5
        assert await redis_client.get(key) == "20.5"

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_incr_commands_non_existing_key(self, redis_client: TRedisClient):
        key = get_random_string(10)
        key2 = get_random_string(10)
        key3 = get_random_string(10)

        assert await redis_client.get(key) is None
        assert await redis_client.incr(key) == 1
        assert await redis_client.get(key) == "1"

        assert await redis_client.get(key2) is None
        assert await redis_client.incrby(key2, 3) == 3
        assert await redis_client.get(key2) == "3"

        assert await redis_client.get(key3) is None
        assert await redis_client.incrbyfloat(key3, 0.5) == 0.5
        assert await redis_client.get(key3) == "0.5"

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_incr_commands_with_str_value(self, redis_client: TRedisClient):
        key = get_random_string(10)
        assert await redis_client.set(key, "foo") == OK
        with pytest.raises(RequestError) as e:
            await redis_client.incr(key)

        assert "value is not an integer" in str(e)

        with pytest.raises(RequestError) as e:
            await redis_client.incrby(key, 3)

        assert "value is not an integer" in str(e)

        with pytest.raises(RequestError) as e:
            await redis_client.incrbyfloat(key, 3.5)
        assert "value is not a valid float" in str(e)

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_client_getname(self, redis_client: TRedisClient):
        assert await redis_client.client_getname() is None
        assert (
            await redis_client.custom_command(["CLIENT", "SETNAME", "GlideConnection"])
            == OK
        )
        assert await redis_client.client_getname() == "GlideConnection"

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_mset_mget(self, redis_client: TRedisClient):
        keys = [get_random_string(10), get_random_string(10), get_random_string(10)]
        non_existing_key = get_random_string(10)
        key_value_pairs = {key: value for key, value in zip(keys, keys)}

        assert await redis_client.mset(key_value_pairs) == OK

        # Add the non-existing key
        keys.append(non_existing_key)
        mget_res = await redis_client.mget(keys)
        keys[-1] = None
        assert mget_res == keys

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_ping(self, redis_client: TRedisClient):
        assert await redis_client.ping() == "PONG"
        assert await redis_client.ping("HELLO") == "HELLO"

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_config_get_set(self, redis_client: TRedisClient):
        previous_timeout = await redis_client.config_get(["timeout"])
        assert await redis_client.config_set({"timeout": "1000"}) == OK
        assert await redis_client.config_get(["timeout"]) == {"timeout": "1000"}
        # revert changes to previous timeout
        assert isinstance(previous_timeout, dict)
        assert isinstance(previous_timeout["timeout"], str)
        assert (
            await redis_client.config_set({"timeout": previous_timeout["timeout"]})
            == OK
        )

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_decr_decrby_existing_key(self, redis_client: TRedisClient):
        key = get_random_string(10)
        assert await redis_client.set(key, "10") == OK
        assert await redis_client.decr(key) == 9
        assert await redis_client.get(key) == "9"
        assert await redis_client.decrby(key, 4) == 5
        assert await redis_client.get(key) == "5"

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_decr_decrby_non_existing_key(self, redis_client: TRedisClient):
        key = get_random_string(10)
        key2 = get_random_string(10)

        assert await redis_client.get(key) is None
        assert await redis_client.decr(key) == -1
        assert await redis_client.get(key) == "-1"

        assert await redis_client.get(key2) is None
        assert await redis_client.decrby(key2, 3) == -3
        assert await redis_client.get(key2) == "-3"

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_decr_with_str_value(self, redis_client: TRedisClient):
        key = get_random_string(10)
        assert await redis_client.set(key, "foo") == OK
        with pytest.raises(RequestError) as e:
            await redis_client.decr(key)

        assert "value is not an integer" in str(e)

        with pytest.raises(RequestError) as e:
            await redis_client.decrby(key, 3)

        assert "value is not an integer" in str(e)

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_hset_hget_hgetall(self, redis_client: TRedisClient):
        key = get_random_string(10)
        field = get_random_string(5)
        field2 = get_random_string(5)
        field_value_map = {field: "value", field2: "value2"}

        assert await redis_client.hset(key, field_value_map) == 2
        assert await redis_client.hget(key, field) == "value"
        assert await redis_client.hget(key, field2) == "value2"
        assert await redis_client.hget(key, "non_existing_field") is None

        hgetall_map = await redis_client.hgetall(key)
        expected_map = {field: "value", field2: "value2"}
        assert compare_maps(hgetall_map, expected_map) is True
        assert await redis_client.hgetall("non_existing_field") == {}

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_hdel(self, redis_client: TRedisClient):
        key = get_random_string(10)
        field = get_random_string(5)
        field2 = get_random_string(5)
        field3 = get_random_string(5)
        field_value_map = {field: "value", field2: "value2", field3: "value3"}

        assert await redis_client.hset(key, field_value_map) == 3
        assert await redis_client.hdel(key, [field, field2]) == 2
        assert await redis_client.hdel(key, ["nonExistingField"]) == 0
        assert await redis_client.hdel("nonExistingKey", [field3]) == 0

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_hsetnx(self, redis_client: TRedisClient):
        key = get_random_string(10)
        field = get_random_string(5)

        assert await redis_client.hsetnx(key, field, "value") == True
        assert await redis_client.hsetnx(key, field, "new value") == False
        assert await redis_client.hget(key, field) == "value"
        key = get_random_string(5)
        assert await redis_client.set(key, "value") == OK
        with pytest.raises(RequestError):
            await redis_client.hsetnx(key, field, "value")

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_hmget(self, redis_client: TRedisClient):
        key = get_random_string(10)
        field = get_random_string(5)
        field2 = get_random_string(5)
        field_value_map = {field: "value", field2: "value2"}

        assert await redis_client.hset(key, field_value_map) == 2
        assert await redis_client.hmget(key, [field, "nonExistingField", field2]) == [
            "value",
            None,
            "value2",
        ]
        assert await redis_client.hmget("nonExistingKey", [field, field2]) == [
            None,
            None,
        ]

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_hset_without_data(self, redis_client: TRedisClient):
        with pytest.raises(RequestError) as e:
            await redis_client.hset("key", {})

        assert "wrong number of arguments" in str(e)

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_hincrby_hincrbyfloat(self, redis_client: TRedisClient):
        key = get_random_string(10)
        field = get_random_string(5)
        field_value_map = {field: "10"}

        assert await redis_client.hset(key, field_value_map) == 1
        assert await redis_client.hincrby(key, field, 1) == 11
        assert await redis_client.hincrby(key, field, 4) == 15
        assert await redis_client.hincrbyfloat(key, field, 1.5) == 16.5

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_hincrby_non_existing_key_field(self, redis_client: TRedisClient):
        key = get_random_string(10)
        key2 = get_random_string(10)
        field = get_random_string(5)
        field_value_map = {field: "10"}

        assert await redis_client.hincrby("nonExistingKey", field, 1) == 1
        assert await redis_client.hset(key, field_value_map) == 1
        assert await redis_client.hincrby(key, "nonExistingField", 2) == 2
        assert await redis_client.hset(key2, field_value_map) == 1
        assert await redis_client.hincrbyfloat(key2, "nonExistingField", -0.5) == -0.5

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_hincrby_invalid_value(self, redis_client: TRedisClient):
        key = get_random_string(10)
        field = get_random_string(5)
        field_value_map = {field: "value"}

        assert await redis_client.hset(key, field_value_map) == 1

        with pytest.raises(RequestError) as e:
            await redis_client.hincrby(key, field, 2)
        assert "hash value is not an integer" in str(e)

        with pytest.raises(RequestError) as e:
            await redis_client.hincrbyfloat(key, field, 1.5)
        assert "hash value is not a float" in str(e)

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_hexist(self, redis_client: TRedisClient):
        key = get_random_string(10)
        field = get_random_string(5)
        field2 = get_random_string(5)
        field_value_map = {field: "value", field2: "value2"}

        assert await redis_client.hset(key, field_value_map) == 2
        assert await redis_client.hexists(key, field)
        assert not await redis_client.hexists(key, "nonExistingField")
        assert not await redis_client.hexists("nonExistingKey", field2)

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_hlen(self, redis_client: TRedisClient):
        key = get_random_string(10)
        key2 = get_random_string(5)
        field = get_random_string(5)
        field2 = get_random_string(5)
        field_value_map = {field: "value", field2: "value2"}

        assert await redis_client.hset(key, field_value_map) == 2
        assert await redis_client.hlen(key) == 2
        assert await redis_client.hdel(key, [field]) == 1
        assert await redis_client.hlen(key) == 1
        assert await redis_client.hlen("non_existing_hash") == 0

        assert await redis_client.set(key2, "value") == OK
        with pytest.raises(RequestError):
            await redis_client.hlen(key2)

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_hvals(self, redis_client: TRedisClient):
        key = get_random_string(10)
        key2 = get_random_string(5)
        field = get_random_string(5)
        field2 = get_random_string(5)
        field_value_map = {field: "value", field2: "value2"}

        assert await redis_client.hset(key, field_value_map) == 2
        assert await redis_client.hvals(key) == ["value", "value2"]
        assert await redis_client.hdel(key, [field]) == 1
        assert await redis_client.hvals(key) == ["value2"]
        assert await redis_client.hvals("non_existing_key") == []

        assert await redis_client.set(key2, "value") == OK
        with pytest.raises(RequestError):
            await redis_client.hvals(key2)

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_hkeys(self, redis_client: TRedisClient):
        key = get_random_string(10)
        key2 = get_random_string(5)
        field = get_random_string(5)
        field2 = get_random_string(5)
        field_value_map = {field: "value", field2: "value2"}

        assert await redis_client.hset(key, field_value_map) == 2
        assert await redis_client.hkeys(key) == [field, field2]
        assert await redis_client.hdel(key, [field]) == 1
        assert await redis_client.hkeys(key) == [field2]
        assert await redis_client.hkeys("non_existing_key") == []

        assert await redis_client.set(key2, "value") == OK
        with pytest.raises(RequestError):
            await redis_client.hkeys(key2)

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_hrandfield(self, redis_client: TRedisClient):
        key = get_random_string(10)
        key2 = get_random_string(5)
        field = get_random_string(5)
        field2 = get_random_string(5)
        field_value_map = {field: "value", field2: "value2"}

        assert await redis_client.hset(key, field_value_map) == 2
        assert await redis_client.hrandfield(key) in [field, field2]
        assert await redis_client.hrandfield("non_existing_key") is None

        assert await redis_client.set(key2, "value") == OK
        with pytest.raises(RequestError):
            await redis_client.hrandfield(key2)

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_hrandfield_count(self, redis_client: TRedisClient):
        key = get_random_string(10)
        key2 = get_random_string(5)
        field = get_random_string(5)
        field2 = get_random_string(5)
        field_value_map = {field: "value", field2: "value2"}

        assert await redis_client.hset(key, field_value_map) == 2
        # Unique values are expected as count is positive
        rand_fields = await redis_client.hrandfield_count(key, 4)
        assert len(rand_fields) == 2
        assert set(rand_fields) == {field, field2}

        # Duplicate values are expected as count is negative
        rand_fields = await redis_client.hrandfield_count(key, -4)
        assert len(rand_fields) == 4
        for rand_field in rand_fields:
            assert rand_field in [field, field2]

        assert await redis_client.hrandfield_count(key, 0) == []
        assert await redis_client.hrandfield_count("non_existing_key", 4) == []

        assert await redis_client.set(key2, "value") == OK
        with pytest.raises(RequestError):
            await redis_client.hrandfield_count(key2, 5)

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_hrandfield_withvalues(self, redis_client: TRedisClient):
        key = get_random_string(10)
        key2 = get_random_string(5)
        field = get_random_string(5)
        field2 = get_random_string(5)
        field_value_map = {field: "value", field2: "value2"}

        assert await redis_client.hset(key, field_value_map) == 2
        # Unique values are expected as count is positive
        rand_fields_with_values = await redis_client.hrandfield_withvalues(key, 4)
        assert len(rand_fields_with_values) == 2
        for field_with_value in rand_fields_with_values:
            assert field_with_value in [[field, "value"], [field2, "value2"]]

        # Duplicate values are expected as count is negative
        rand_fields_with_values = await redis_client.hrandfield_withvalues(key, -4)
        assert len(rand_fields_with_values) == 4
        for field_with_value in rand_fields_with_values:
            assert field_with_value in [[field, "value"], [field2, "value2"]]

        assert await redis_client.hrandfield_withvalues(key, 0) == []
        assert await redis_client.hrandfield_withvalues("non_existing_key", 4) == []

        assert await redis_client.set(key2, "value") == OK
        with pytest.raises(RequestError):
            await redis_client.hrandfield_withvalues(key2, 5)

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_lpush_lpop_lrange(self, redis_client: TRedisClient):
        key = get_random_string(10)
        value_list = ["value4", "value3", "value2", "value1"]

        assert await redis_client.lpush(key, value_list) == 4
        assert await redis_client.lpop(key) == value_list[-1]
        assert await redis_client.lrange(key, 0, -1) == value_list[-2::-1]
        assert await redis_client.lpop_count(key, 2) == value_list[-2:0:-1]
        assert await redis_client.lrange("non_existing_key", 0, -1) == []
        assert await redis_client.lpop("non_existing_key") is None

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_lpush_lpop_lrange_wrong_type_raise_error(
        self, redis_client: TRedisClient
    ):
        key = get_random_string(10)
        assert await redis_client.set(key, "foo") == OK

        with pytest.raises(RequestError) as e:
            await redis_client.lpush(key, ["bar"])
        assert "Operation against a key holding the wrong kind of value" in str(e)

        with pytest.raises(RequestError) as e:
            await redis_client.lpop(key)
        assert "Operation against a key holding the wrong kind of value" in str(e)

        with pytest.raises(RequestError) as e:
            await redis_client.lrange(key, 0, -1)
        assert "Operation against a key holding the wrong kind of value" in str(e)

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_lpushx(self, redis_client: TRedisClient):
        key1 = get_random_string(10)
        key2 = get_random_string(10)

        # new key
        assert await redis_client.lpushx(key1, ["1"]) == 0
        assert await redis_client.lrange(key1, 0, -1) == []
        # existing key
        assert await redis_client.lpush(key1, ["0"]) == 1
        assert await redis_client.lpushx(key1, ["1", "2", "3"]) == 4
        assert await redis_client.lrange(key1, 0, -1) == ["3", "2", "1", "0"]
        # key exists, but not a list
        assert await redis_client.set(key2, "bar") == OK
        with pytest.raises(RequestError) as e:
            await redis_client.lpushx(key2, ["_"])
        # incorrect arguments
        with pytest.raises(RequestError):
            await redis_client.lpushx(key1, [])

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_blpop(self, redis_client: TRedisClient):
        key1 = f"{{test}}-1-f{get_random_string(10)}"
        key2 = f"{{test}}-2-f{get_random_string(10)}"
        value1 = "value1"
        value2 = "value2"
        value_list = [value1, value2]

        assert await redis_client.lpush(key1, value_list) == 2
        # ensure that command doesn't time out even if timeout > request timeout (250ms by default)
        assert await redis_client.blpop([key1, key2], 0.5) == [key1, value2]

        assert await redis_client.blpop(["non_existent_key"], 0.5) is None

        # key exists, but not a list
        assert await redis_client.set("foo", "bar")
        with pytest.raises(RequestError):
            await redis_client.blpop(["foo"], 0.001)

        # same-slot requirement
        if isinstance(redis_client, RedisClusterClient):
            with pytest.raises(RequestError) as e:
                await redis_client.blpop(["abc", "zxy", "lkn"], 0.5)
            assert "CrossSlot" in str(e)

        async def endless_blpop_call():
            await redis_client.blpop(["non_existent_key"], 0)

        # blpop is called against a non-existing key with no timeout, but we wrap the call in an asyncio timeout to
        # avoid having the test block forever
        with pytest.raises(asyncio.TimeoutError):
            await asyncio.wait_for(endless_blpop_call(), timeout=3)

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_lindex(self, redis_client: TRedisClient):
        key = get_random_string(10)
        value_list = [get_random_string(5), get_random_string(5)]
        assert await redis_client.lpush(key, value_list) == 2
        assert await redis_client.lindex(key, 0) == value_list[1]
        assert await redis_client.lindex(key, 1) == value_list[0]
        assert await redis_client.lindex(key, 3) is None
        assert await redis_client.lindex("non_existing_key", 0) is None

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_rpush_rpop(self, redis_client: TRedisClient):
        key = get_random_string(10)
        value_list = ["value4", "value3", "value2", "value1"]

        assert await redis_client.rpush(key, value_list) == 4
        assert await redis_client.rpop(key) == value_list[-1]

        assert await redis_client.rpop_count(key, 2) == value_list[-2:0:-1]
        assert await redis_client.rpop("non_existing_key") is None

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_rpush_rpop_wrong_type_raise_error(self, redis_client: TRedisClient):
        key = get_random_string(10)
        assert await redis_client.set(key, "foo") == OK

        with pytest.raises(RequestError) as e:
            await redis_client.rpush(key, ["bar"])
        assert "Operation against a key holding the wrong kind of value" in str(e)

        with pytest.raises(RequestError) as e:
            await redis_client.rpop(key)
        assert "Operation against a key holding the wrong kind of value" in str(e)

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_rpushx(self, redis_client: TRedisClient):
        key1 = get_random_string(10)
        key2 = get_random_string(10)

        # new key
        assert await redis_client.rpushx(key1, ["1"]) == 0
        assert await redis_client.lrange(key1, 0, -1) == []
        # existing key
        assert await redis_client.rpush(key1, ["0"]) == 1
        assert await redis_client.rpushx(key1, ["1", "2", "3"]) == 4
        assert await redis_client.lrange(key1, 0, -1) == ["0", "1", "2", "3"]
        # key existing, but it is not a list
        assert await redis_client.set(key2, "bar") == OK
        with pytest.raises(RequestError) as e:
            await redis_client.rpushx(key2, ["_"])
        # incorrect arguments
        with pytest.raises(RequestError):
            await redis_client.rpushx(key2, [])

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_brpop(self, redis_client: TRedisClient):
        key1 = f"{{test}}-1-f{get_random_string(10)}"
        key2 = f"{{test}}-2-f{get_random_string(10)}"
        value1 = "value1"
        value2 = "value2"
        value_list = [value1, value2]

        assert await redis_client.lpush(key1, value_list) == 2
        # ensure that command doesn't time out even if timeout > request timeout (250ms by default)
        assert await redis_client.brpop([key1, key2], 0.5) == [key1, value1]

        assert await redis_client.brpop(["non_existent_key"], 0.5) is None

        # key exists, but not a list
        assert await redis_client.set("foo", "bar")
        with pytest.raises(RequestError):
            await redis_client.brpop(["foo"], 0.001)

        # same-slot requirement
        if isinstance(redis_client, RedisClusterClient):
            with pytest.raises(RequestError) as e:
                await redis_client.brpop(["abc", "zxy", "lkn"], 0.5)
            assert "CrossSlot" in str(e)

        async def endless_brpop_call():
            await redis_client.brpop(["non_existent_key"], 0)

        # brpop is called against a non-existing key with no timeout, but we wrap the call in an asyncio timeout to
        # avoid having the test block forever
        with pytest.raises(asyncio.TimeoutError):
            await asyncio.wait_for(endless_brpop_call(), timeout=3)

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_linsert(self, redis_client: TRedisClient):
        key1 = get_random_string(10)
        key2 = get_random_string(10)

        assert await redis_client.lpush(key1, ["4", "3", "2", "1"]) == 4
        assert await redis_client.linsert(key1, InsertPosition.BEFORE, "2", "1.5") == 5
        assert await redis_client.linsert(key1, InsertPosition.AFTER, "3", "3.5") == 6
        assert await redis_client.lrange(key1, 0, -1) == [
            "1",
            "1.5",
            "2",
            "3",
            "3.5",
            "4",
        ]

        assert (
            await redis_client.linsert(
                "non_existing_key", InsertPosition.BEFORE, "pivot", "elem"
            )
            == 0
        )
        assert await redis_client.linsert(key1, InsertPosition.AFTER, "5", "6") == -1

        # key exists, but it is not a list
        assert await redis_client.set(key2, "value") == OK
        with pytest.raises(RequestError):
            await redis_client.linsert(key2, InsertPosition.AFTER, "p", "e")

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_sadd_srem_smembers_scard(self, redis_client: TRedisClient):
        key = get_random_string(10)
        value_list = ["member1", "member2", "member3", "member4"]

        assert await redis_client.sadd(key, value_list) == 4
        assert await redis_client.srem(key, ["member4", "nonExistingMember"]) == 1

        assert set(await redis_client.smembers(key)) == set(value_list[:3])

        assert await redis_client.srem(key, ["member1"]) == 1
        assert await redis_client.scard(key) == 2

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_sadd_srem_smembers_scard_non_existing_key(
        self, redis_client: TRedisClient
    ):
        non_existing_key = get_random_string(10)
        assert await redis_client.srem(non_existing_key, ["member"]) == 0
        assert await redis_client.scard(non_existing_key) == 0
        assert await redis_client.smembers(non_existing_key) == set()

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_sadd_srem_smembers_scard_wrong_type_raise_error(
        self, redis_client: TRedisClient
    ):
        key = get_random_string(10)
        assert await redis_client.set(key, "foo") == OK

        with pytest.raises(RequestError) as e:
            await redis_client.sadd(key, ["bar"])
        assert "Operation against a key holding the wrong kind of value" in str(e)

        with pytest.raises(RequestError) as e:
            await redis_client.srem(key, ["bar"])
        assert "Operation against a key holding the wrong kind of value" in str(e)

        with pytest.raises(RequestError) as e:
            await redis_client.scard(key)
        assert "Operation against a key holding the wrong kind of value" in str(e)

        with pytest.raises(RequestError) as e:
            await redis_client.smembers(key)
        assert "Operation against a key holding the wrong kind of value" in str(e)

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_sismember(self, redis_client: TRedisClient):
        key = get_random_string(10)
        member = get_random_string(5)
        assert await redis_client.sadd(key, [member]) == 1
        assert await redis_client.sismember(key, member)
        assert not await redis_client.sismember(key, get_random_string(5))
        assert not await redis_client.sismember("non_existing_key", member)

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_spop(self, redis_client: TRedisClient):
        key = get_random_string(10)
        member = get_random_string(5)
        assert await redis_client.sadd(key, [member]) == 1
        assert await redis_client.spop(key) == member

        member2 = get_random_string(5)
        member3 = get_random_string(5)
        assert await redis_client.sadd(key, [member, member2, member3]) == 3
        assert await redis_client.spop_count(key, 4) == {member, member2, member3}

        assert await redis_client.scard(key) == 0

        assert await redis_client.spop("non_existing_key") == None
        assert await redis_client.spop_count("non_existing_key", 3) == set()

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_ltrim(self, redis_client: TRedisClient):
        key = get_random_string(10)
        value_list = ["value4", "value3", "value2", "value1"]

        assert await redis_client.lpush(key, value_list) == 4
        assert await redis_client.ltrim(key, 0, 1) == OK
        assert await redis_client.lrange(key, 0, -1) == ["value1", "value2"]

        assert await redis_client.ltrim(key, 4, 2) == OK
        assert await redis_client.lrange(key, 0, -1) == []

        assert await redis_client.ltrim("non_existing_key", 0, 1) == OK

        assert await redis_client.set(key, "foo") == OK
        with pytest.raises(RequestError) as e:
            await redis_client.ltrim(key, 0, 1)
        assert "Operation against a key holding the wrong kind of value" in str(e)

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_lrem(self, redis_client: TRedisClient):
        key = get_random_string(10)
        value_list = ["value1", "value2", "value1", "value1", "value2"]

        assert await redis_client.lpush(key, value_list) == 5

        assert await redis_client.lrem(key, 2, "value1") == 2
        assert await redis_client.lrange(key, 0, -1) == ["value2", "value2", "value1"]

        assert await redis_client.lrem(key, -1, "value2") == 1
        assert await redis_client.lrange(key, 0, -1) == ["value2", "value1"]

        assert await redis_client.lrem(key, 0, "value2") == 1
        assert await redis_client.lrange(key, 0, -1) == ["value1"]

        assert await redis_client.lrem("non_existing_key", 2, "value") == 0

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_llen(self, redis_client: TRedisClient):
        key1 = get_random_string(10)
        key2 = get_random_string(10)
        value_list = ["value4", "value3", "value2", "value1"]

        assert await redis_client.lpush(key1, value_list) == 4
        assert await redis_client.llen(key1) == 4

        assert await redis_client.llen("non_existing_key") == 0

        assert await redis_client.set(key2, "foo") == OK
        with pytest.raises(RequestError) as e:
            await redis_client.llen(key2)
        assert "Operation against a key holding the wrong kind of value" in str(e)

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_strlen(self, redis_client: TRedisClient):
        key1 = get_random_string(10)
        key2 = get_random_string(10)
        value_list = ["value4", "value3", "value2", "value1"]

        assert await redis_client.set(key1, "foo") == OK
        assert await redis_client.strlen(key1) == 3
        assert await redis_client.strlen("non_existing_key") == 0

        assert await redis_client.lpush(key2, value_list) == 4
        with pytest.raises(RequestError):
            assert await redis_client.strlen(key2)

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_rename(self, redis_client: TRedisClient):
        key1 = "{" + get_random_string(10) + "}"
        assert await redis_client.set(key1, "foo") == OK
        assert await redis_client.rename(key1, key1 + "_rename") == OK
        assert await redis_client.exists([key1 + "_rename"]) == 1

        with pytest.raises(RequestError):
            assert await redis_client.rename(
                "{same_slot}" + "non_existing_key", "{same_slot}" + "_rename"
            )

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_exists(self, redis_client: TRedisClient):
        keys = [get_random_string(10), get_random_string(10)]

        assert await redis_client.set(keys[0], "value") == OK
        assert await redis_client.exists(keys) == 1

        assert await redis_client.set(keys[1], "value") == OK
        assert await redis_client.exists(keys) == 2
        keys.append("non_existing_key")
        assert await redis_client.exists(keys) == 2

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_unlink(self, redis_client: TRedisClient):
        key1 = get_random_string(10)
        key2 = get_random_string(10)
        key3 = get_random_string(10)

        assert await redis_client.set(key1, "value") == OK
        assert await redis_client.set(key2, "value") == OK
        assert await redis_client.set(key3, "value") == OK
        assert await redis_client.unlink([key1, key2, "non_existing_key", key3]) == 3

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_expire_pexpire_ttl_with_positive_timeout(
        self, redis_client: TRedisClient
    ):
        key = get_random_string(10)
        assert await redis_client.set(key, "foo") == OK

        assert await redis_client.expire(key, 10) == 1
        assert await redis_client.ttl(key) in range(11)

        # set command clears the timeout.
        assert await redis_client.set(key, "bar") == OK
        if await check_if_server_version_lt(redis_client, "7.0.0"):
            assert await redis_client.pexpire(key, 10000)
        else:
            assert await redis_client.pexpire(key, 10000, ExpireOptions.HasNoExpiry)
        assert await redis_client.ttl(key) in range(11)

        if await check_if_server_version_lt(redis_client, "7.0.0"):
            assert await redis_client.expire(key, 15)
        else:
            assert await redis_client.expire(key, 15, ExpireOptions.HasExistingExpiry)
        assert await redis_client.ttl(key) in range(16)

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_expireat_pexpireat_ttl_with_positive_timeout(
        self, redis_client: TRedisClient
    ):
        key = get_random_string(10)
        assert await redis_client.set(key, "foo") == OK
        current_time = int(time.time())

        assert await redis_client.expireat(key, current_time + 10) == 1
        assert await redis_client.ttl(key) in range(11)
        if await check_if_server_version_lt(redis_client, "7.0.0"):
            assert await redis_client.expireat(key, current_time + 50) == 1
        else:
            assert (
                await redis_client.expireat(
                    key, current_time + 50, ExpireOptions.NewExpiryGreaterThanCurrent
                )
                == 1
            )
        assert await redis_client.ttl(key) in range(51)

        # set command clears the timeout.
        assert await redis_client.set(key, "bar") == OK
        current_time_ms = int(time.time() * 1000)
        if not await check_if_server_version_lt(redis_client, "7.0.0"):
            assert not await redis_client.pexpireat(
                key, current_time_ms + 50000, ExpireOptions.HasExistingExpiry
            )

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_expire_pexpire_expireat_pexpireat_past_or_negative_timeout(
        self, redis_client: TRedisClient
    ):
        key = get_random_string(10)
        assert await redis_client.set(key, "foo") == OK
        assert await redis_client.ttl(key) == -1

        assert await redis_client.expire(key, -10) == 1
        assert await redis_client.ttl(key) == -2

        assert await redis_client.set(key, "foo") == OK
        assert await redis_client.pexpire(key, -10000)
        assert await redis_client.ttl(key) == -2

        assert await redis_client.set(key, "foo") == OK
        assert await redis_client.expireat(key, int(time.time()) - 50) == 1
        assert await redis_client.ttl(key) == -2

        assert await redis_client.set(key, "foo") == OK
        assert await redis_client.pexpireat(key, int(time.time() * 1000) - 50000)
        assert await redis_client.ttl(key) == -2

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_expire_pexpire_expireAt_pexpireAt_ttl_non_existing_key(
        self, redis_client: TRedisClient
    ):
        key = get_random_string(10)

        assert await redis_client.expire(key, 10) == 0
        assert not await redis_client.pexpire(key, 10000)
        assert await redis_client.expireat(key, int(time.time()) + 50) == 0
        assert not await redis_client.pexpireat(key, int(time.time() * 1000) + 50000)
        assert await redis_client.ttl(key) == -2

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_pttl(self, redis_client: TRedisClient):
        key = get_random_string(10)
        assert await redis_client.pttl(key) == -2
        current_time = int(time.time())

        assert await redis_client.set(key, "value") == OK
        assert await redis_client.pttl(key) == -1

        assert await redis_client.expire(key, 10)
        assert 0 < await redis_client.pttl(key) <= 10000

        assert await redis_client.expireat(key, current_time + 20)
        assert 0 < await redis_client.pttl(key) <= 20000

        assert await redis_client.pexpireat(key, current_time * 1000 + 30000)
        assert 0 < await redis_client.pttl(key) <= 30000

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_persist(self, redis_client: TRedisClient):
        key = get_random_string(10)
        assert await redis_client.set(key, "value") == OK
        assert not await redis_client.persist(key)

        assert await redis_client.expire(key, 10)
        assert await redis_client.persist(key)

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_geoadd(self, redis_client: TRedisClient):
        key, key2 = get_random_string(10), get_random_string(10)
        members_coordinates = {
            "Palermo": GeospatialData(13.361389, 38.115556),
            "Catania": GeospatialData(15.087269, 37.502669),
        }
        assert await redis_client.geoadd(key, members_coordinates) == 2
        members_coordinates["Catania"].latitude = 39
        assert (
            await redis_client.geoadd(
                key,
                members_coordinates,
                existing_options=ConditionalChange.ONLY_IF_DOES_NOT_EXIST,
            )
            == 0
        )
        assert (
            await redis_client.geoadd(
                key,
                members_coordinates,
                existing_options=ConditionalChange.ONLY_IF_EXISTS,
            )
            == 0
        )
        members_coordinates["Catania"].latitude = 40
        members_coordinates.update({"Tel-Aviv": GeospatialData(32.0853, 34.7818)})
        assert (
            await redis_client.geoadd(
                key,
                members_coordinates,
                changed=True,
            )
            == 2
        )

        assert await redis_client.set(key2, "value") == OK
        with pytest.raises(RequestError):
            await redis_client.geoadd(key2, members_coordinates)

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_geoadd_invalid_args(self, redis_client: TRedisClient):
        key = get_random_string(10)

        with pytest.raises(RequestError):
            await redis_client.geoadd(key, {})

        with pytest.raises(RequestError):
            await redis_client.geoadd(key, {"Place": GeospatialData(-181, 0)})

        with pytest.raises(RequestError):
            await redis_client.geoadd(key, {"Place": GeospatialData(181, 0)})

        with pytest.raises(RequestError):
            await redis_client.geoadd(key, {"Place": GeospatialData(0, 86)})

        with pytest.raises(RequestError):
            await redis_client.geoadd(key, {"Place": GeospatialData(0, -86)})

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_geohash(self, redis_client: TRedisClient):
        key = get_random_string(10)
        members_coordinates = {
            "Palermo": GeospatialData(13.361389, 38.115556),
            "Catania": GeospatialData(15.087269, 37.502669),
        }
        assert await redis_client.geoadd(key, members_coordinates) == 2
        assert await redis_client.geohash(key, ["Palermo", "Catania", "Place"]) == [
            "sqc8b49rny0",
            "sqdtr74hyu0",
            None,
        ]

        assert (
            await redis_client.geohash(
                "non_existing_key", ["Palermo", "Catania", "Place"]
            )
            == [None] * 3
        )

        # Neccessary to check since we are enforcing the user to pass a list of members while redis don't
        # But when running the command with key only (and no members) the returned value will always be an empty list
        # So in case of any changes, this test will fail and inform us that we should allow not passing any members.
        assert await redis_client.geohash(key, []) == []

        assert await redis_client.set(key, "value") == OK
        with pytest.raises(RequestError):
            await redis_client.geohash(key, ["Palermo", "Catania"])

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_geodist(self, redis_client: TRedisClient):
        key, key2 = get_random_string(10), get_random_string(10)
        members_coordinates = {
            "Palermo": GeospatialData(13.361389, 38.115556),
            "Catania": GeospatialData(15.087269, 37.502669),
        }
        assert await redis_client.geoadd(key, members_coordinates) == 2

        assert await redis_client.geodist(key, "Palermo", "Catania") == 166274.1516
        assert (
            await redis_client.geodist(key, "Palermo", "Catania", GeoUnit.KILOMETERS)
            == 166.2742
        )
        assert await redis_client.geodist(key, "Palermo", "Palermo", GeoUnit.MILES) == 0
        assert (
            await redis_client.geodist(
                key, "Palermo", "non-existing-member", GeoUnit.FEET
            )
            == None
        )

        assert await redis_client.set(key2, "value") == OK
        with pytest.raises(RequestError):
            await redis_client.geodist(key2, "Palmero", "Catania")

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_geopos(self, redis_client: TRedisClient):
        key = get_random_string(10)
        members_coordinates = {
            "Palermo": GeospatialData(13.361389, 38.115556),
            "Catania": GeospatialData(15.087269, 37.502669),
        }
        assert await redis_client.geoadd(key, members_coordinates) == 2

        # The comparison allows for a small tolerance level due to potential precision errors in floating-point calculations
        # No worries, Python can handle it, therefore, this shouldn't fail
        positions = await redis_client.geopos(key, ["Palermo", "Catania", "Place"])
        expected_positions = [
            [13.36138933897018433, 38.11555639549629859],
            [15.08726745843887329, 37.50266842333162032],
        ]
        assert len(positions) == 3 and positions[2] is None

        assert all(
            all(
                math.isclose(actual_coord, expected_coord)
                for actual_coord, expected_coord in zip(actual_pos, expected_pos)
            )
            for actual_pos, expected_pos in zip(positions, expected_positions)
            if actual_pos is not None
        )

        assert (
            await redis_client.geopos(
                "non_existing_key", ["Palermo", "Catania", "Place"]
            )
            == [None] * 3
        )

        # Neccessary to check since we are enforcing the user to pass a list of members while redis don't
        # But when running the command with key only (and no members) the returned value will always be an empty list
        # So in case of any changes, this test will fail and inform us that we should allow not passing any members.
        assert await redis_client.geohash(key, []) == []

        assert await redis_client.set(key, "value") == OK
        with pytest.raises(RequestError):
            await redis_client.geopos(key, ["Palermo", "Catania"])

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_zadd_zaddincr(self, redis_client: TRedisClient):
        key = get_random_string(10)
        members_scores = {"one": 1, "two": 2, "three": 3}
        assert await redis_client.zadd(key, members_scores=members_scores) == 3
        assert await redis_client.zadd_incr(key, member="one", increment=2) == 3.0

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_zadd_nx_xx(self, redis_client: TRedisClient):
        key = get_random_string(10)
        members_scores = {"one": 1, "two": 2, "three": 3}
        assert (
            await redis_client.zadd(
                key,
                members_scores=members_scores,
                existing_options=ConditionalChange.ONLY_IF_EXISTS,
            )
            == 0
        )
        assert (
            await redis_client.zadd(
                key,
                members_scores=members_scores,
                existing_options=ConditionalChange.ONLY_IF_DOES_NOT_EXIST,
            )
            == 3
        )

        assert (
            await redis_client.zadd_incr(
                key,
                member="one",
                increment=5.0,
                existing_options=ConditionalChange.ONLY_IF_DOES_NOT_EXIST,
            )
            is None
        )

        assert (
            await redis_client.zadd_incr(
                key,
                member="one",
                increment=5.0,
                existing_options=ConditionalChange.ONLY_IF_EXISTS,
            )
            == 6.0
        )

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_zadd_gt_lt(self, redis_client: TRedisClient):
        key = get_random_string(10)
        members_scores = {"one": -3, "two": 2, "three": 3}
        assert await redis_client.zadd(key, members_scores=members_scores) == 3
        members_scores["one"] = 10
        assert (
            await redis_client.zadd(
                key,
                members_scores=members_scores,
                update_condition=UpdateOptions.GREATER_THAN,
                changed=True,
            )
            == 1
        )

        assert (
            await redis_client.zadd(
                key,
                members_scores=members_scores,
                update_condition=UpdateOptions.LESS_THAN,
                changed=True,
            )
            == 0
        )

        assert (
            await redis_client.zadd_incr(
                key,
                member="one",
                increment=-3.0,
                update_condition=UpdateOptions.LESS_THAN,
            )
            == 7.0
        )

        assert (
            await redis_client.zadd_incr(
                key,
                member="one",
                increment=-3.0,
                update_condition=UpdateOptions.GREATER_THAN,
            )
            is None
        )

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_zrem(self, redis_client: TRedisClient):
        key = get_random_string(10)
        members_scores = {"one": 1, "two": 2, "three": 3}
        assert await redis_client.zadd(key, members_scores=members_scores) == 3

        assert await redis_client.zrem(key, ["one"]) == 1
        assert await redis_client.zrem(key, ["one", "two", "three"]) == 2

        assert await redis_client.zrem("non_existing_set", ["member"]) == 0

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_zremrangebyscore(self, redis_client: TRedisClient):
        key = get_random_string(10)
        members_scores = {"one": 1, "two": 2, "three": 3}
        assert await redis_client.zadd(key, members_scores) == 3

        assert (
            await redis_client.zremrangebyscore(
                key, ScoreBoundary(1, False), ScoreBoundary(2)
            )
            == 1
        )
        assert (
            await redis_client.zremrangebyscore(key, ScoreBoundary(1), InfBound.NEG_INF)
            == 0
        )
        assert (
            await redis_client.zremrangebyscore(
                "non_existing_set", InfBound.NEG_INF, InfBound.POS_INF
            )
            == 0
        )

        assert await redis_client.set(key, "value") == OK
        with pytest.raises(RequestError):
            await redis_client.zremrangebyscore(key, InfBound.NEG_INF, InfBound.POS_INF)

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_zremrangebylex(self, redis_client: TRedisClient):
        key1 = get_random_string(10)
        key2 = get_random_string(10)
        range = RangeByIndex(0, -1)
        members_scores = {"a": 1, "b": 2, "c": 3, "d": 4}
        assert await redis_client.zadd(key1, members_scores) == 4

        assert (
            await redis_client.zremrangebylex(
                key1, LexBoundary("a", False), LexBoundary("c")
            )
            == 2
        )
        assert await redis_client.zrange_withscores(key1, range) == {"a": 1.0, "d": 4.0}

        assert (
            await redis_client.zremrangebylex(key1, LexBoundary("d"), InfBound.POS_INF)
            == 1
        )
        assert await redis_client.zrange_withscores(key1, range) == {"a": 1.0}

        # min_lex > max_lex
        assert (
            await redis_client.zremrangebylex(key1, LexBoundary("a"), InfBound.NEG_INF)
            == 0
        )
        assert await redis_client.zrange_withscores(key1, range) == {"a": 1.0}

        assert (
            await redis_client.zremrangebylex(
                "non_existing_key", InfBound.NEG_INF, InfBound.POS_INF
            )
            == 0
        )

        # key exists, but it is not a sorted set
        assert await redis_client.set(key2, "value") == OK
        with pytest.raises(RequestError):
            await redis_client.zremrangebylex(
                key2, LexBoundary("a", False), LexBoundary("c")
            )

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_zlexcount(self, redis_client: TRedisClient):
        key1 = get_random_string(10)
        key2 = get_random_string(10)
        members_scores = {"a": 1.0, "b": 2.0, "c": 3.0}

        assert await redis_client.zadd(key1, members_scores) == 3
        assert (
            await redis_client.zlexcount(key1, InfBound.NEG_INF, InfBound.POS_INF) == 3
        )
        assert (
            await redis_client.zlexcount(
                key1,
                LexBoundary("a", is_inclusive=False),
                LexBoundary("c", is_inclusive=True),
            )
            == 2
        )
        assert (
            await redis_client.zlexcount(
                key1, InfBound.NEG_INF, LexBoundary("c", is_inclusive=True)
            )
            == 3
        )
        # Incorrect range; start > end
        assert (
            await redis_client.zlexcount(
                key1, InfBound.POS_INF, LexBoundary("c", is_inclusive=True)
            )
            == 0
        )
        assert (
            await redis_client.zlexcount(
                "non_existing_key", InfBound.NEG_INF, InfBound.POS_INF
            )
            == 0
        )

        # key exists, but it is not a sorted set
        assert await redis_client.set(key2, "value") == OK
        with pytest.raises(RequestError):
            await redis_client.zlexcount(key2, InfBound.NEG_INF, InfBound.POS_INF)

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_zcard(self, redis_client: TRedisClient):
        key = get_random_string(10)
        members_scores = {"one": 1, "two": 2, "three": 3}
        assert await redis_client.zadd(key, members_scores=members_scores) == 3
        assert await redis_client.zcard(key) == 3

        assert await redis_client.zrem(key, ["one"]) == 1
        assert await redis_client.zcard(key) == 2
        assert await redis_client.zcard("non_existing_key") == 0

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_zcount(self, redis_client: TRedisClient):
        key = get_random_string(10)
        members_scores = {"one": 1, "two": 2, "three": 3}
        assert await redis_client.zadd(key, members_scores=members_scores) == 3

        assert await redis_client.zcount(key, InfBound.NEG_INF, InfBound.POS_INF) == 3
        assert (
            await redis_client.zcount(
                key,
                ScoreBoundary(1, is_inclusive=False),
                ScoreBoundary(3, is_inclusive=False),
            )
            == 1
        )
        assert (
            await redis_client.zcount(
                key,
                ScoreBoundary(1, is_inclusive=False),
                ScoreBoundary(3, is_inclusive=True),
            )
            == 2
        )
        assert (
            await redis_client.zcount(
                key, InfBound.NEG_INF, ScoreBoundary(3, is_inclusive=True)
            )
            == 3
        )
        assert (
            await redis_client.zcount(
                key, InfBound.POS_INF, ScoreBoundary(3, is_inclusive=True)
            )
            == 0
        )
        assert (
            await redis_client.zcount(
                "non_existing_key", InfBound.NEG_INF, InfBound.POS_INF
            )
            == 0
        )

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_zscore(self, redis_client: TRedisClient):
        key = get_random_string(10)
        members_scores = {"one": 1, "two": 2, "three": 3}
        assert await redis_client.zadd(key, members_scores=members_scores) == 3
        assert await redis_client.zscore(key, "one") == 1.0

        assert await redis_client.zscore(key, "non_existing_member") is None
        assert (
            await redis_client.zscore("non_existing_key", "non_existing_member") is None
        )

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_zmscore(self, redis_client: TRedisClient):
        key1 = get_random_string(10)
        key2 = get_random_string(10)
        members_scores = {"one": 1, "two": 2, "three": 3}

        assert await redis_client.zadd(key1, members_scores=members_scores) == 3
        assert await redis_client.zmscore(key1, ["one", "two", "three"]) == [
            1.0,
            2.0,
            3.0,
        ]
        assert await redis_client.zmscore(
            key1, ["one", "non_existing_member", "non_existing_member", "three"]
        ) == [1.0, None, None, 3.0]
        assert await redis_client.zmscore("non_existing_key", ["one"]) == [None]

        assert await redis_client.set(key2, "value") == OK
        with pytest.raises(RequestError):
            await redis_client.zmscore(key2, ["one"])

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_zpopmin(self, redis_client: TRedisClient):
        key = get_random_string(10)
        members_scores = {"a": 1.0, "b": 2.0, "c": 3.0}
        assert await redis_client.zadd(key, members_scores=members_scores) == 3
        assert await redis_client.zpopmin(key) == {"a": 1.0}

        zpopmin_map = await redis_client.zpopmin(key, 3)
        expected_map = {"b": 2.0, "c": 3.0}
        assert compare_maps(zpopmin_map, expected_map) is True

        assert await redis_client.zpopmin(key) == {}
        assert await redis_client.set(key, "value") == OK
        with pytest.raises(RequestError):
            await redis_client.zpopmin(key)

        assert await redis_client.zpopmin("non_exisitng_key") == {}

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_zpopmax(self, redis_client: TRedisClient):
        key = get_random_string(10)
        members_scores = {"a": 1.0, "b": 2.0, "c": 3.0}
        assert await redis_client.zadd(key, members_scores) == 3
        assert await redis_client.zpopmax(key) == {"c": 3.0}

        zpopmax_map = await redis_client.zpopmax(key, 3)
        expected_map = {"b": 2.0, "a": 1.0}
        assert compare_maps(zpopmax_map, expected_map) is True

        assert await redis_client.zpopmax(key) == {}
        assert await redis_client.set(key, "value") == OK
        with pytest.raises(RequestError):
            await redis_client.zpopmax(key)

        assert await redis_client.zpopmax("non_exisitng_key") == {}

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_zrange_by_index(self, redis_client: TRedisClient):
        key = get_random_string(10)
        members_scores = {"one": 1, "two": 2, "three": 3}
        assert await redis_client.zadd(key, members_scores=members_scores) == 3

        assert await redis_client.zrange(key, RangeByIndex(start=0, stop=1)) == [
            "one",
            "two",
        ]

        zrange_map = await redis_client.zrange_withscores(
            key, RangeByIndex(start=0, stop=-1)
        )
        expected_map = {"one": 1.0, "two": 2.0, "three": 3.0}
        assert compare_maps(zrange_map, expected_map) is True

        assert await redis_client.zrange(
            key, RangeByIndex(start=0, stop=1), reverse=True
        ) == [
            "three",
            "two",
        ]

        assert await redis_client.zrange(key, RangeByIndex(start=3, stop=1)) == []
        assert (
            await redis_client.zrange_withscores(key, RangeByIndex(start=3, stop=1))
            == {}
        )

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_zrange_byscore(self, redis_client: TRedisClient):
        key = get_random_string(10)
        members_scores = {"one": 1, "two": 2, "three": 3}
        assert await redis_client.zadd(key, members_scores=members_scores) == 3

        assert await redis_client.zrange(
            key,
            RangeByScore(
                start=InfBound.NEG_INF, stop=ScoreBoundary(3, is_inclusive=False)
            ),
        ) == ["one", "two"]

        zrange_map = await redis_client.zrange_withscores(
            key,
            RangeByScore(start=InfBound.NEG_INF, stop=InfBound.POS_INF),
        )
        expected_map = {"one": 1.0, "two": 2.0, "three": 3.0}
        assert compare_maps(zrange_map, expected_map) is True

        assert await redis_client.zrange(
            key,
            RangeByScore(
                start=ScoreBoundary(3, is_inclusive=False), stop=InfBound.NEG_INF
            ),
            reverse=True,
        ) == ["two", "one"]

        assert (
            await redis_client.zrange(
                key,
                RangeByScore(
                    start=InfBound.NEG_INF,
                    stop=InfBound.POS_INF,
                    limit=Limit(offset=1, count=2),
                ),
            )
        ) == ["two", "three"]

        assert (
            await redis_client.zrange(
                key,
                RangeByScore(
                    start=InfBound.NEG_INF, stop=ScoreBoundary(3, is_inclusive=False)
                ),
                reverse=True,
            )
            == []
        )  # stop is greater than start with reverse set to True

        assert (
            await redis_client.zrange(
                key,
                RangeByScore(
                    start=InfBound.POS_INF, stop=ScoreBoundary(3, is_inclusive=False)
                ),
            )
            == []
        )  # start is greater than stop

        assert (
            await redis_client.zrange_withscores(
                key,
                RangeByScore(
                    start=InfBound.POS_INF, stop=ScoreBoundary(3, is_inclusive=False)
                ),
            )
            == {}
        )  # start is greater than stop

        assert (
            await redis_client.zrange_withscores(
                key,
                RangeByScore(
                    start=InfBound.NEG_INF, stop=ScoreBoundary(3, is_inclusive=False)
                ),
                reverse=True,
            )
            == {}
        )  # stop is greater than start with reverse set to True

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_zrange_bylex(self, redis_client: TRedisClient):
        key = get_random_string(10)
        members_scores = {"a": 1, "b": 2, "c": 3}
        assert await redis_client.zadd(key, members_scores=members_scores) == 3

        assert await redis_client.zrange(
            key,
            RangeByLex(
                start=InfBound.NEG_INF, stop=LexBoundary("c", is_inclusive=False)
            ),
        ) == ["a", "b"]

        assert (
            await redis_client.zrange(
                key,
                RangeByLex(
                    start=InfBound.NEG_INF,
                    stop=InfBound.POS_INF,
                    limit=Limit(offset=1, count=2),
                ),
            )
        ) == ["b", "c"]

        assert await redis_client.zrange(
            key,
            RangeByLex(
                start=LexBoundary("c", is_inclusive=False), stop=InfBound.NEG_INF
            ),
            reverse=True,
        ) == ["b", "a"]

        assert (
            await redis_client.zrange(
                key,
                RangeByLex(
                    start=InfBound.NEG_INF, stop=LexBoundary("c", is_inclusive=False)
                ),
                reverse=True,
            )
            == []
        )  # stop is greater than start with reverse set to True

        assert (
            await redis_client.zrange(
                key,
                RangeByLex(
                    start=InfBound.POS_INF, stop=LexBoundary("c", is_inclusive=False)
                ),
            )
            == []
        )  # start is greater than stop

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_zrange_different_types_of_keys(self, redis_client: TRedisClient):
        key = get_random_string(10)

        assert (
            await redis_client.zrange("non_existing_key", RangeByIndex(start=0, stop=1))
            == []
        )

        assert (
            await redis_client.zrange_withscores(
                "non_existing_key", RangeByIndex(start=0, stop=-1)
            )
        ) == {}

        assert await redis_client.set(key, "value") == OK
        with pytest.raises(RequestError):
            await redis_client.zrange(key, RangeByIndex(start=0, stop=1))

        with pytest.raises(RequestError):
            await redis_client.zrange_withscores(key, RangeByIndex(start=0, stop=1))

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_zrangestore_by_index(self, redis_client: TRedisClient):
        destination = f"{{testKey}}:{get_random_string(10)}"
        source = f"{{testKey}}:{get_random_string(10)}"
        string_key = f"{{testKey}}:{get_random_string(10)}"
        non_existing_key = f"{{testKey}}:{get_random_string(10)}"

        member_scores = {"one": 1.0, "two": 2.0, "three": 3.0}
        assert await redis_client.zadd(source, member_scores) == 3

        # full range
        assert (
            await redis_client.zrangestore(destination, source, RangeByIndex(0, -1))
            == 3
        )
        assert await redis_client.zrange_withscores(
            destination, RangeByIndex(0, -1)
        ) == {"one": 1.0, "two": 2.0, "three": 3.0}

        # range from rank 0 to 1, from highest to lowest score
        assert (
            await redis_client.zrangestore(
                destination, source, RangeByIndex(0, 1), True
            )
            == 2
        )
        assert await redis_client.zrange_withscores(
            destination, RangeByIndex(0, -1)
        ) == {"three": 3.0, "two": 2.0}

        # incorrect range, as start > stop
        assert (
            await redis_client.zrangestore(destination, source, RangeByIndex(3, 1)) == 0
        )
        assert (
            await redis_client.zrange_withscores(destination, RangeByIndex(0, -1)) == {}
        )

        # non-existing source
        assert (
            await redis_client.zrangestore(
                destination, non_existing_key, RangeByIndex(0, -1)
            )
            == 0
        )
        assert (
            await redis_client.zrange_withscores(destination, RangeByIndex(0, -1)) == {}
        )

        # key exists, but it is not a set
        assert await redis_client.set(string_key, "value") == OK
        with pytest.raises(RequestError):
            await redis_client.zrangestore(destination, string_key, RangeByIndex(0, -1))

        # same-slot requirement
        if isinstance(redis_client, RedisClusterClient):
            with pytest.raises(RequestError) as e:
                await redis_client.zrangestore("abc", "def", RangeByIndex(0, -1))
            assert "CrossSlot" in str(e)

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_zrangestore_by_score(self, redis_client: TRedisClient):
        destination = f"{{testKey}}:{get_random_string(10)}"
        source = f"{{testKey}}:{get_random_string(10)}"
        string_key = f"{{testKey}}:{get_random_string(10)}"
        non_existing_key = f"{{testKey}}:{get_random_string(10)}"

        member_scores = {"one": 1.0, "two": 2.0, "three": 3.0}
        assert await redis_client.zadd(source, member_scores) == 3

        # range from negative infinity to 3 (exclusive)
        assert (
            await redis_client.zrangestore(
                destination,
                source,
                RangeByScore(InfBound.NEG_INF, ScoreBoundary(3, False)),
            )
            == 2
        )
        assert await redis_client.zrange_withscores(
            destination, RangeByIndex(0, -1)
        ) == {"one": 1.0, "two": 2.0}

        # range from 1 (inclusive) to positive infinity
        assert (
            await redis_client.zrangestore(
                destination, source, RangeByScore(ScoreBoundary(1), InfBound.POS_INF)
            )
            == 3
        )
        assert await redis_client.zrange_withscores(
            destination, RangeByIndex(0, -1)
        ) == {"one": 1.0, "two": 2.0, "three": 3.0}

        # range from negative to positive infinity, limited to ranks 1 to 2
        assert (
            await redis_client.zrangestore(
                destination,
                source,
                RangeByScore(InfBound.NEG_INF, InfBound.POS_INF, Limit(1, 2)),
            )
            == 2
        )
        assert await redis_client.zrange_withscores(
            destination, RangeByIndex(0, -1)
        ) == {"two": 2.0, "three": 3.0}

        # range from positive to negative infinity reversed, limited to ranks 1 to 2
        assert (
            await redis_client.zrangestore(
                destination,
                source,
                RangeByScore(InfBound.POS_INF, InfBound.NEG_INF, Limit(1, 2)),
                True,
            )
            == 2
        )
        assert await redis_client.zrange_withscores(
            destination, RangeByIndex(0, -1)
        ) == {"two": 2.0, "one": 1.0}

        # incorrect range as start > stop
        assert (
            await redis_client.zrangestore(
                destination,
                source,
                RangeByScore(ScoreBoundary(3, False), InfBound.NEG_INF),
            )
            == 0
        )
        assert (
            await redis_client.zrange_withscores(destination, RangeByIndex(0, -1)) == {}
        )

        # non-existing source
        assert (
            await redis_client.zrangestore(
                destination,
                non_existing_key,
                RangeByScore(InfBound.NEG_INF, ScoreBoundary(3, False)),
            )
            == 0
        )
        assert (
            await redis_client.zrange_withscores(destination, RangeByIndex(0, -1)) == {}
        )

        # key exists, but it is not a set
        assert await redis_client.set(string_key, "value") == OK
        with pytest.raises(RequestError):
            await redis_client.zrangestore(
                destination,
                string_key,
                RangeByScore(ScoreBoundary(0), ScoreBoundary(3)),
            )

        # same-slot requirement
        if isinstance(redis_client, RedisClusterClient):
            with pytest.raises(RequestError) as e:
                await redis_client.zrangestore(
                    "abc", "def", RangeByScore(ScoreBoundary(0), ScoreBoundary(3))
                )
            assert "CrossSlot" in str(e)

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_zrangestore_by_lex(self, redis_client: TRedisClient):
        destination = f"{{testKey}}:{get_random_string(10)}"
        source = f"{{testKey}}:{get_random_string(10)}"
        string_key = f"{{testKey}}:4-{get_random_string(10)}"
        non_existing_key = f"{{testKey}}:5-{get_random_string(10)}"

        member_scores = {"a": 1.0, "b": 2.0, "c": 3.0}
        assert await redis_client.zadd(source, member_scores) == 3

        # range from negative infinity to "c" (exclusive)
        assert (
            await redis_client.zrangestore(
                destination,
                source,
                RangeByLex(InfBound.NEG_INF, LexBoundary("c", False)),
            )
            == 2
        )
        assert await redis_client.zrange_withscores(
            destination, RangeByIndex(0, -1)
        ) == {"a": 1.0, "b": 2.0}

        # range from "a" (inclusive) to positive infinity
        assert (
            await redis_client.zrangestore(
                destination, source, RangeByLex(LexBoundary("a"), InfBound.POS_INF)
            )
            == 3
        )
        assert await redis_client.zrange_withscores(
            destination, RangeByIndex(0, -1)
        ) == {"a": 1.0, "b": 2.0, "c": 3.0}

        # range from negative to positive infinity, limited to ranks 1 to 2
        assert (
            await redis_client.zrangestore(
                destination,
                source,
                RangeByLex(InfBound.NEG_INF, InfBound.POS_INF, Limit(1, 2)),
            )
            == 2
        )
        assert await redis_client.zrange_withscores(
            destination, RangeByIndex(0, -1)
        ) == {"b": 2.0, "c": 3.0}

        # range from positive to negative infinity reversed, limited to ranks 1 to 2
        assert (
            await redis_client.zrangestore(
                destination,
                source,
                RangeByLex(InfBound.POS_INF, InfBound.NEG_INF, Limit(1, 2)),
                True,
            )
            == 2
        )
        assert await redis_client.zrange_withscores(
            destination, RangeByIndex(0, -1)
        ) == {"b": 2.0, "a": 1.0}

        # incorrect range as start > stop
        assert (
            await redis_client.zrangestore(
                destination,
                source,
                RangeByLex(LexBoundary("c", False), InfBound.NEG_INF),
            )
            == 0
        )
        assert (
            await redis_client.zrange_withscores(destination, RangeByIndex(0, -1)) == {}
        )

        # non-existing source
        assert (
            await redis_client.zrangestore(
                destination,
                non_existing_key,
                RangeByLex(InfBound.NEG_INF, InfBound.POS_INF),
            )
            == 0
        )
        assert (
            await redis_client.zrange_withscores(destination, RangeByIndex(0, -1)) == {}
        )

        # key exists, but it is not a set
        assert await redis_client.set(string_key, "value") == OK
        with pytest.raises(RequestError):
            await redis_client.zrangestore(
                destination, string_key, RangeByLex(InfBound.NEG_INF, InfBound.POS_INF)
            )

        # same-slot requirement
        if isinstance(redis_client, RedisClusterClient):
            with pytest.raises(RequestError) as e:
                await redis_client.zrangestore(
                    "abc", "def", RangeByLex(InfBound.NEG_INF, InfBound.POS_INF)
                )
            assert "CrossSlot" in str(e)

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_zrank(self, redis_client: TRedisClient):
        key = get_random_string(10)
        members_scores = {"one": 1.5, "two": 2, "three": 3}
        assert await redis_client.zadd(key, members_scores) == 3
        assert await redis_client.zrank(key, "one") == 0
        if not await check_if_server_version_lt(redis_client, "7.2.0"):
            assert await redis_client.zrank_withscore(key, "one") == [0, 1.5]
            assert await redis_client.zrank_withscore(key, "non_existing_field") is None
            assert (
                await redis_client.zrank_withscore("non_existing_key", "field") is None
            )

        assert await redis_client.zrank(key, "non_existing_field") is None
        assert await redis_client.zrank("non_existing_key", "field") is None

        assert await redis_client.set(key, "value") == OK
        with pytest.raises(RequestError):
            await redis_client.zrank(key, "one")

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_zdiff(self, redis_client: TRedisClient):
        key1 = f"{{testKey}}:1-{get_random_string(10)}"
        key2 = f"{{testKey}}:2-{get_random_string(10)}"
        key3 = f"{{testKey}}:3-{get_random_string(10)}"
        string_key = f"{{testKey}}:4-{get_random_string(10)}"
        non_existing_key = f"{{testKey}}:5-{get_random_string(10)}"

        member_scores1 = {"one": 1.0, "two": 2.0, "three": 3.0}
        member_scores2 = {"two": 2.0}
        member_scores3 = {"one": 1.0, "two": 2.0, "three": 3.0, "four": 4.0}

        assert await redis_client.zadd(key1, member_scores1) == 3
        assert await redis_client.zadd(key2, member_scores2) == 1
        assert await redis_client.zadd(key3, member_scores3) == 4

        assert await redis_client.zdiff([key1, key2]) == ["one", "three"]
        assert await redis_client.zdiff([key1, key3]) == []
        assert await redis_client.zdiff([non_existing_key, key3]) == []

        zdiff_map = await redis_client.zdiff_withscores([key1, key2])
        expected_map = {
            "one": 1.0,
            "three": 3.0,
        }
        assert compare_maps(zdiff_map, expected_map) is True
        assert (
            compare_maps(await redis_client.zdiff_withscores([key1, key3]), {}) is True
        )
        assert (
            compare_maps(
                await redis_client.zdiff_withscores([non_existing_key, key3]), {}
            )
            is True
        )

        # invalid argument - key list must not be empty
        with pytest.raises(RequestError):
            await redis_client.zdiff([])

        # invalid argument - key list must not be empty
        with pytest.raises(RequestError):
            await redis_client.zdiff_withscores([])

        # key exists, but it is not a sorted set
        assert await redis_client.set(string_key, "foo") == OK
        with pytest.raises(RequestError):
            await redis_client.zdiff([string_key, key2])

        assert await redis_client.set(string_key, "foo") == OK
        with pytest.raises(RequestError):
            await redis_client.zdiff_withscores([string_key, key2])

        # same-slot requirement
        if isinstance(redis_client, RedisClusterClient):
            with pytest.raises(RequestError) as e:
                await redis_client.zdiff(["abc", "zxy", "lkn"])
            assert "CrossSlot" in str(e)

            with pytest.raises(RequestError) as e:
                await redis_client.zdiff_withscores(["abc", "zxy", "lkn"])
            assert "CrossSlot" in str(e)

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_zdiffstore(self, redis_client: TRedisClient):
        key1 = f"{{testKey}}:1-{get_random_string(10)}"
        key2 = f"{{testKey}}:2-{get_random_string(10)}"
        key3 = f"{{testKey}}:3-{get_random_string(10)}"
        key4 = f"{{testKey}}:4-{get_random_string(10)}"
        string_key = f"{{testKey}}:4-{get_random_string(10)}"
        non_existing_key = f"{{testKey}}:5-{get_random_string(10)}"

        member_scores1 = {"one": 1.0, "two": 2.0, "three": 3.0}
        member_scores2 = {"two": 2.0}
        member_scores3 = {"one": 1.0, "two": 2.0, "three": 3.0, "four": 4.0}

        assert await redis_client.zadd(key1, member_scores1) == 3
        assert await redis_client.zadd(key2, member_scores2) == 1
        assert await redis_client.zadd(key3, member_scores3) == 4

        assert await redis_client.zdiffstore(key4, [key1, key2]) == 2
        assert await redis_client.zrange_withscores(key4, RangeByIndex(0, -1)) == {
            "one": 1.0,
            "three": 3.0,
        }

        assert await redis_client.zdiffstore(key4, [key3, key2, key1]) == 1
        assert await redis_client.zrange_withscores(key4, RangeByIndex(0, -1)) == {
            "four": 4.0
        }

        assert await redis_client.zdiffstore(key4, [key1, key3]) == 0
        assert await redis_client.zrange_withscores(key4, RangeByIndex(0, -1)) == {}

        assert await redis_client.zdiffstore(key4, [non_existing_key, key1]) == 0
        assert await redis_client.zrange_withscores(key4, RangeByIndex(0, -1)) == {}

        # key exists, but it is not a sorted set
        assert await redis_client.set(string_key, "value") == OK
        with pytest.raises(RequestError):
            await redis_client.zdiffstore(key4, [string_key, key1])

        # same-slot requirement
        if isinstance(redis_client, RedisClusterClient):
            with pytest.raises(RequestError) as e:
                await redis_client.zdiffstore("abc", ["zxy", "lkn"])
            assert "CrossSlot" in str(e)

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_type(self, redis_client: TRedisClient):
        key = get_random_string(10)
        assert await redis_client.set(key, "value") == OK
        assert (await redis_client.type(key)).lower() == "string"
        assert await redis_client.delete([key]) == 1

        assert await redis_client.lpush(key, ["value"]) == 1
        assert (await redis_client.type(key)).lower() == "list"
        assert await redis_client.delete([key]) == 1

        assert await redis_client.sadd(key, ["value"]) == 1
        assert (await redis_client.type(key)).lower() == "set"
        assert await redis_client.delete([key]) == 1

        assert await redis_client.zadd(key, {"member": 1.0}) == 1
        assert (await redis_client.type(key)).lower() == "zset"
        assert await redis_client.delete([key]) == 1

        assert await redis_client.hset(key, {"field": "value"}) == 1
        assert (await redis_client.type(key)).lower() == "hash"
        assert await redis_client.delete([key]) == 1

        await redis_client.xadd(key, [("field", "value")])
        assert await redis_client.type(key) == "stream"
        assert await redis_client.delete([key]) == 1

        assert (await redis_client.type(key)).lower() == "none"

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_echo(self, redis_client: TRedisClient):
        message = get_random_string(5)
        assert await redis_client.echo(message) == message
        if isinstance(redis_client, RedisClusterClient):
            echo_dict = await redis_client.echo(message, AllNodes())
            assert isinstance(echo_dict, dict)
            for value in echo_dict.values():
                assert value == message

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_dbsize(self, redis_client: TRedisClient):
        assert await redis_client.custom_command(["FLUSHALL"]) == OK

        assert await redis_client.dbsize() == 0
        key_value_pairs = [(get_random_string(10), "foo") for _ in range(10)]

        for key, value in key_value_pairs:
            assert await redis_client.set(key, value) == OK
        assert await redis_client.dbsize() == 10

        if isinstance(redis_client, RedisClusterClient):
            assert await redis_client.custom_command(["FLUSHALL"]) == OK
            key = get_random_string(5)
            assert await redis_client.set(key, value) == OK
            assert await redis_client.dbsize(SlotKeyRoute(SlotType.PRIMARY, key)) == 1
        else:
            assert await redis_client.select(1) == OK
            assert await redis_client.dbsize() == 0

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_time(self, redis_client: TRedisClient):
        current_time = int(time.time()) - 1
        result = await redis_client.time()
        assert len(result) == 2
        assert isinstance(result, list)
        assert isinstance(result[0], str)
        assert isinstance(result[1], str)
        assert int(result[0]) > current_time
        assert 0 < int(result[1]) < 1000000

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_append(self, redis_client: TRedisClient):
        key, value = get_random_string(10), get_random_string(5)
        assert await redis_client.append(key, value) == 5

        assert await redis_client.append(key, value) == 10
        assert await redis_client.get(key) == value * 2

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_xadd_xtrim(self, redis_client: TRedisClient):
        key = get_random_string(10)
        field, field2 = get_random_string(10), get_random_string(10)

        assert (
            await redis_client.xadd(
                key,
                [(field, "foo"), (field2, "bar")],
                StreamAddOptions(make_stream=False),
            )
            is None
        )

        assert (
            await redis_client.xadd(
                key, [(field, "foo1"), (field2, "bar1")], StreamAddOptions(id="0-1")
            )
            == "0-1"
        )

        assert (
            await redis_client.xadd(key, [(field, "foo2"), (field2, "bar2")])
        ) is not None
        assert await redis_client.custom_command(["XLEN", key]) == 2

        # This will trim the first entry.
        id = await redis_client.xadd(
            key,
            [(field, "foo3"), (field2, "bar3")],
            StreamAddOptions(trim=TrimByMaxLen(exact=True, threshold=2)),
        )

        assert id is not None
        assert await redis_client.custom_command(["XLEN", key]) == 2

        # This will trim the 2nd entry.
        assert (
            await redis_client.xadd(
                key,
                [(field, "foo4"), (field2, "bar4")],
                StreamAddOptions(trim=TrimByMinId(exact=True, threshold=str(id))),
            )
            is not None
        )
        assert await redis_client.custom_command(["XLEN", key]) == 2

        assert await redis_client.xtrim(key, TrimByMaxLen(threshold=1, exact=True)) == 1
        assert await redis_client.custom_command(["XLEN", key]) == 1

    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_pfadd(self, redis_client: TRedisClient):
        key = get_random_string(10)
        assert await redis_client.pfadd(key, []) == 1
        assert await redis_client.pfadd(key, ["one", "two"]) == 1
        assert await redis_client.pfadd(key, ["two"]) == 0
        assert await redis_client.pfadd(key, []) == 0

        assert await redis_client.set("foo", "value") == OK
        with pytest.raises(RequestError):
            await redis_client.pfadd("foo", [])


class TestMultiKeyCommandCrossSlot:
    @pytest.mark.parametrize("cluster_mode", [True])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_multi_key_command_returns_cross_slot_error(
        self, redis_client: RedisClusterClient
    ):
        for promise in [
            redis_client.blpop(["abc", "zxy", "lkn"], 0.1),
            redis_client.brpop(["abc", "zxy", "lkn"], 0.1),
            redis_client.rename("abc", "zxy"),
            redis_client.zdiffstore("abc", ["zxy", "lkn"]),
            redis_client.zrangestore("abc", "zxy", RangeByIndex(0, -1)),
        ]:
            with pytest.raises(RequestError) as e:
                await promise
            assert "crossslot" in str(e).lower()

        # TODO bz*, zdiff, sdiff and others - all rest multi-key commands except ones tested below
        pass

    @pytest.mark.parametrize("cluster_mode", [True])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_multi_key_command_routed_to_multiple_nodes(
        self, redis_client: RedisClusterClient
    ):
        await redis_client.exists(["abc", "zxy", "lkn"])
        await redis_client.unlink(["abc", "zxy", "lkn"])
        await redis_client.delete(["abc", "zxy", "lkn"])
        await redis_client.mget(["abc", "zxy", "lkn"])
        await redis_client.mset({"abc": "1", "zxy": "2", "lkn": "3"})
        # TODO touch


class TestCommandsUnitTests:
    def test_expiry_cmd_args(self):
        exp_sec = ExpirySet(ExpiryType.SEC, 5)
        assert exp_sec.get_cmd_args() == ["EX", "5"]

        exp_sec_timedelta = ExpirySet(ExpiryType.SEC, timedelta(seconds=5))
        assert exp_sec_timedelta.get_cmd_args() == ["EX", "5"]

        exp_millsec = ExpirySet(ExpiryType.MILLSEC, 5)
        assert exp_millsec.get_cmd_args() == ["PX", "5"]

        exp_millsec_timedelta = ExpirySet(ExpiryType.MILLSEC, timedelta(seconds=5))
        assert exp_millsec_timedelta.get_cmd_args() == ["PX", "5000"]

        exp_millsec_timedelta = ExpirySet(ExpiryType.MILLSEC, timedelta(seconds=5))
        assert exp_millsec_timedelta.get_cmd_args() == ["PX", "5000"]

        exp_unix_sec = ExpirySet(ExpiryType.UNIX_SEC, 1682575739)
        assert exp_unix_sec.get_cmd_args() == ["EXAT", "1682575739"]

        exp_unix_sec_datetime = ExpirySet(
            ExpiryType.UNIX_SEC,
            datetime(2023, 4, 27, 23, 55, 59, 342380, timezone.utc),
        )
        assert exp_unix_sec_datetime.get_cmd_args() == ["EXAT", "1682639759"]

        exp_unix_millisec = ExpirySet(ExpiryType.UNIX_MILLSEC, 1682586559964)
        assert exp_unix_millisec.get_cmd_args() == ["PXAT", "1682586559964"]

        exp_unix_millisec_datetime = ExpirySet(
            ExpiryType.UNIX_MILLSEC,
            datetime(2023, 4, 27, 23, 55, 59, 342380, timezone.utc),
        )
        assert exp_unix_millisec_datetime.get_cmd_args() == ["PXAT", "1682639759342"]

    def test_expiry_raises_on_value_error(self):
        with pytest.raises(ValueError):
            ExpirySet(ExpiryType.SEC, 5.5)

    def test_is_single_response(self):
        assert is_single_response("This is a string value", "")
        assert is_single_response(["value", "value"], [""])
        assert not is_single_response(
            [["value", ["value"]], ["value", ["valued"]]], [""]
        )
        assert is_single_response(None, None)


@pytest.mark.asyncio
class TestClusterRoutes:
    async def cluster_route_custom_command_multi_nodes(
        self,
        redis_client: RedisClusterClient,
        route: Route,
    ):
        cluster_nodes = await redis_client.custom_command(["CLUSTER", "NODES"])
        assert isinstance(cluster_nodes, (str, list))
        cluster_nodes = get_first_result(cluster_nodes)
        num_of_nodes = len(cluster_nodes.splitlines())
        expected_num_of_results = (
            num_of_nodes
            if isinstance(route, AllNodes)
            else num_of_nodes - cluster_nodes.count("slave")
        )
        expected_primary_count = cluster_nodes.count("master")
        expected_replica_count = (
            cluster_nodes.count("slave") if isinstance(route, AllNodes) else 0
        )

        all_results = await redis_client.custom_command(["INFO", "REPLICATION"], route)
        assert isinstance(all_results, dict)
        assert len(all_results) == expected_num_of_results
        primary_count = 0
        replica_count = 0
        for _, info_res in all_results.items():
            assert "role:master" in info_res or "role:slave" in info_res
            if "role:master" in info_res:
                primary_count += 1
            else:
                replica_count += 1
        assert primary_count == expected_primary_count
        assert replica_count == expected_replica_count

    @pytest.mark.parametrize("cluster_mode", [True])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_cluster_route_custom_command_all_nodes(
        self, redis_client: RedisClusterClient
    ):
        await self.cluster_route_custom_command_multi_nodes(redis_client, AllNodes())

    @pytest.mark.parametrize("cluster_mode", [True])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_cluster_route_custom_command_all_primaries(
        self, redis_client: RedisClusterClient
    ):
        await self.cluster_route_custom_command_multi_nodes(
            redis_client, AllPrimaries()
        )

    @pytest.mark.parametrize("cluster_mode", [True])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_cluster_route_custom_command_random_node(
        self, redis_client: RedisClusterClient
    ):
        info_res = await redis_client.custom_command(
            ["INFO", "REPLICATION"], RandomNode()
        )
        assert type(info_res) is str
        assert "role:master" in info_res or "role:slave" in info_res

    async def cluster_route_custom_command_slot_route(
        self, redis_client: RedisClusterClient, is_slot_key: bool
    ):
        route_class = SlotKeyRoute if is_slot_key else SlotIdRoute
        route_second_arg = "foo" if is_slot_key else 4000
        primary_res = await redis_client.custom_command(
            ["CLUSTER", "NODES"], route_class(SlotType.PRIMARY, route_second_arg)
        )
        assert type(primary_res) is str
        assert "myself,master" in primary_res
        expected_primary_node_id = ""
        for node_line in primary_res.splitlines():
            if "myself" in node_line:
                expected_primary_node_id = node_line.split(" ")[0]

        replica_res = await redis_client.custom_command(
            ["CLUSTER", "NODES"], route_class(SlotType.REPLICA, route_second_arg)
        )
        assert isinstance(replica_res, str)
        assert "myself,slave" in replica_res
        for node_line in replica_res:
            if "myself" in node_line:
                primary_node_id = node_line.split(" ")[3]
                assert primary_node_id == expected_primary_node_id

    @pytest.mark.parametrize("cluster_mode", [True])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_cluster_route_custom_command_slot_key_route(
        self, redis_client: RedisClusterClient
    ):
        await self.cluster_route_custom_command_slot_route(redis_client, True)

    @pytest.mark.parametrize("cluster_mode", [True])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_cluster_route_custom_command_slot_id_route(
        self, redis_client: RedisClusterClient
    ):
        await self.cluster_route_custom_command_slot_route(redis_client, False)

    @pytest.mark.parametrize("cluster_mode", [True])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_info_random_route(self, redis_client: RedisClusterClient):
        info = await redis_client.info([InfoSection.SERVER], RandomNode())
        assert isinstance(info, str)
        assert "# Server" in info

    @pytest.mark.parametrize("cluster_mode", [True])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_cluster_route_by_address_reaches_correct_node(
        self, redis_client: RedisClusterClient
    ):
        # returns the line that contains the word "myself", up to that point. This is done because the values after it might change with time.
        def clean_result(value: TResult):
            assert type(value) is str
            for line in value.splitlines():
                if "myself" in line:
                    return line.split("myself")[0]
            raise Exception(
                f"Couldn't find 'myself' in the cluster nodes output: {value}"
            )

        cluster_nodes = clean_result(
            await redis_client.custom_command(["cluster", "nodes"], RandomNode())
        )
        assert isinstance(cluster_nodes, str)
        host = cluster_nodes.split(" ")[1].split("@")[0]

        second_result = clean_result(
            await redis_client.custom_command(
                ["cluster", "nodes"], ByAddressRoute(host)
            )
        )

        assert cluster_nodes == second_result

        host, port = host.split(":")
        port_as_int = int(port)

        third_result = clean_result(
            await redis_client.custom_command(
                ["cluster", "nodes"], ByAddressRoute(host, port_as_int)
            )
        )

        assert cluster_nodes == third_result

    @pytest.mark.parametrize("cluster_mode", [True])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_cluster_fail_routing_by_address_if_no_port_is_provided(
        self, redis_client: RedisClusterClient
    ):
        with pytest.raises(RequestError):
            await redis_client.info(route=ByAddressRoute("foo"))


@pytest.mark.asyncio
class TestScripts:
    @pytest.mark.smoke_test
    @pytest.mark.parametrize("cluster_mode", [True, False])
    @pytest.mark.parametrize("protocol", [ProtocolVersion.RESP2, ProtocolVersion.RESP3])
    async def test_script(self, redis_client: TRedisClient):
        key1 = get_random_string(10)
        key2 = get_random_string(10)
        script = Script("return 'Hello'")
        assert await redis_client.invoke_script(script) == "Hello"

        script = Script("return redis.call('SET', KEYS[1], ARGV[1])")
        assert (
            await redis_client.invoke_script(script, keys=[key1], args=["value1"])
            == "OK"
        )
        # Reuse the same script with different parameters.
        assert (
            await redis_client.invoke_script(script, keys=[key2], args=["value2"])
            == "OK"
        )
        script = Script("return redis.call('GET', KEYS[1])")
        assert await redis_client.invoke_script(script, keys=[key1]) == "value1"
        assert await redis_client.invoke_script(script, keys=[key2]) == "value2"
