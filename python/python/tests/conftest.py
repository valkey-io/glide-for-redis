# Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

import random
from typing import AsyncGenerator, List, Optional, Union

import pytest
from glide.config import (
    AdvancedGlideClientConfiguration,
    AdvancedGlideClusterClientConfiguration,
    BackoffStrategy,
    GlideClientConfiguration,
    GlideClusterClientConfiguration,
    NodeAddress,
    ProtocolVersion,
    ReadFrom,
    ServerCredentials,
)
from glide.exceptions import ClosingError
from glide.glide_client import GlideClient, GlideClusterClient, TGlideClient
from glide.logger import Level as logLevel
from glide.logger import Logger
from glide.routes import AllNodes
from tests.utils.cluster import ValkeyCluster
from tests.utils.utils import check_if_server_version_lt

DEFAULT_HOST = "localhost"
DEFAULT_PORT = 6379
DEFAULT_TEST_LOG_LEVEL = logLevel.OFF

Logger.set_logger_config(DEFAULT_TEST_LOG_LEVEL)


def pytest_addoption(parser):
    parser.addoption(
        "--host",
        default=DEFAULT_HOST,
        action="store",
        help="Server host endpoint, defaults to `%(default)s`",
    )

    parser.addoption(
        "--port",
        default=DEFAULT_PORT,
        action="store",
        help="Server port, defaults to `%(default)s`",
    )

    parser.addoption(
        "--tls",
        default=False,
        action="store_true",
        help="TLS enabled, defaults to `%(default)s`",
    )

    parser.addoption(
        "--no-tls",
        dest="tls",
        action="store_false",
        help="TLS disabled, defaults to `%(default)s`",
    )

    parser.addoption(
        "--load-module",
        action="append",
        help="""Load additional Valkey modules (provide full path for the module's shared library).
            Use multiple times for multiple modules.
            Example:
            pytest --load-module=/path/to/module1.so --load-module=/path/to/module2.so""",
        default=[],
    )

    parser.addoption(
        "--cluster-endpoints",
        action="store",
        help="""Comma-separated list of cluster endpoints for standalone cluster in the format host1:port1,host2:port2,...
            Note: The cluster will be flashed between tests.
            Example:
                pytest --asyncio-mode=auto --cluster-endpoints=127.0.0.1:6379
                pytest --asyncio-mode=auto --cluster-endpoints=127.0.0.1:6379,127.0.0.1:6380
            """,
        default=None,
    )

    parser.addoption(
        "--standalone-endpoints",
        action="store",
        help="""Comma-separated list of cluster endpoints for cluster mode cluster in the format host1:port1,host2:port2,...
            Note: The cluster will be flashed between tests.
            Example:
                pytest --asyncio-mode=auto --standalone-endpoints=127.0.0.1:6379
                pytest --asyncio-mode=auto --standalone-endpoints=127.0.0.1:6379,127.0.0.1:6380
            """,
        default=None,
    )


def parse_endpoints(endpoints_str: str) -> List[List[str]]:
    """
    Parse the endpoints string into a list of lists containing host and port.
    """
    try:
        endpoints = [endpoint.split(":") for endpoint in endpoints_str.split(",")]
        for endpoint in endpoints:
            if len(endpoint) != 2:
                raise ValueError(
                    "Each endpoint should be in the format 'host:port'.\nEndpoints should be separated by commas."
                )
            host, port = endpoint
            if not host or not port.isdigit():
                raise ValueError(
                    "Both host and port should be specified and port should be a valid integer."
                )
        return endpoints
    except ValueError as e:
        raise ValueError("Invalid endpoints format: " + str(e))


def create_clusters(tls, load_module, cluster_endpoints, standalone_endpoints):
    """
    Create Valkey clusters based on the provided options.
    """
    if cluster_endpoints or standalone_endpoints:
        # Endpoints were passed by the caller, not creating clusters internally
        if cluster_endpoints:
            cluster_endpoints = parse_endpoints(cluster_endpoints)
            pytest.valkey_cluster = ValkeyCluster(tls=tls, addresses=cluster_endpoints)
        if standalone_endpoints:
            standalone_endpoints = parse_endpoints(standalone_endpoints)
            pytest.standalone_cluster = ValkeyCluster(
                tls=tls, addresses=standalone_endpoints
            )
    else:
        # No endpoints were provided, create new clusters
        pytest.valkey_cluster = ValkeyCluster(
            tls=tls,
            cluster_mode=True,
            load_module=load_module,
            addresses=cluster_endpoints,
            replica_count=2,
        )
        pytest.standalone_cluster = ValkeyCluster(
            tls=tls,
            cluster_mode=False,
            shard_count=1,
            replica_count=1,
            load_module=load_module,
            addresses=standalone_endpoints,
        )


@pytest.fixture(autouse=True, scope="session")
def call_before_all_pytests(request):
    """
    Called after the Session object has been created and
    before performing collection and entering the run test loop.
    """
    tls = request.config.getoption("--tls")
    load_module = request.config.getoption("--load-module")
    cluster_endpoints = request.config.getoption("--cluster-endpoints")
    standalone_endpoints = request.config.getoption("--standalone-endpoints")

    create_clusters(tls, load_module, cluster_endpoints, standalone_endpoints)


def pytest_sessionfinish(session, exitstatus):
    """
    Called after whole test run finished, right before
    returning the exit status to the system.
    """
    try:
        del pytest.valkey_cluster
    except AttributeError:
        # valkey_cluster was not set, skip deletion
        pass

    try:
        del pytest.standalone_cluster
    except AttributeError:
        # standalone_cluster was not set, skip deletion
        pass


def pytest_collection_modifyitems(config, items):
    """
    Modify collected test items.

    This function checks if cluster or standalone endpoints are provided. If so, it checks if the test requires
    cluster mode and skips it accordingly.
    """
    for item in items:
        if config.getoption("--cluster-endpoints") or config.getoption(
            "--standalone-endpoints"
        ):
            if "cluster_mode" in item.fixturenames:
                cluster_mode_value = item.callspec.params.get("cluster_mode", None)
                if cluster_mode_value is True and not config.getoption(
                    "--cluster-endpoints"
                ):
                    item.add_marker(
                        pytest.mark.skip(
                            reason="Test skipped because cluster_mode=True and cluster endpoints weren't provided"
                        )
                    )
                elif cluster_mode_value is False and not config.getoption(
                    "--standalone-endpoints"
                ):
                    item.add_marker(
                        pytest.mark.skip(
                            reason="Test skipped because cluster_mode=False and standalone endpoints weren't provided"
                        )
                    )


@pytest.fixture(scope="function")
async def glide_client(
    request,
    cluster_mode: bool,
    protocol: ProtocolVersion,
) -> AsyncGenerator[TGlideClient, None]:
    "Get async socket client for tests"
    client = await create_client(request, cluster_mode, protocol=protocol)
    yield client
    await test_teardown(request, cluster_mode, protocol)
    await client.close()


@pytest.fixture(scope="function")
async def glide_client(
    request,
    cluster_mode: bool,
    protocol: ProtocolVersion,
    request_timeout: int,
) -> AsyncGenerator[TGlideClient, None]:
    "Get async socket client for tests"
    client = await create_client(
        request, cluster_mode, protocol=protocol, request_timeout=request_timeout
    )
    yield client
    await test_teardown(request, cluster_mode, protocol)
    await client.close()


@pytest.fixture(scope="function")
async def management_client(
    request,
    cluster_mode: bool,
    protocol: ProtocolVersion,
) -> AsyncGenerator[TGlideClient, None]:
    "Get async socket client for tests, used to manage the state when tests are on the client ability to connect"
    client = await create_client(request, cluster_mode, protocol=protocol)
    yield client
    await test_teardown(request, cluster_mode, protocol)
    await client.close()


@pytest.fixture(scope="function")
async def management_client(
    request,
    cluster_mode: bool,
    protocol: ProtocolVersion,
    request_timeout: int,
) -> AsyncGenerator[TGlideClient, None]:
    "Get async socket client for tests, used to manage the state when tests are on the client ability to connect"
    client = await create_client(
        request, cluster_mode, protocol=protocol, request_timeout=request_timeout
    )
    yield client
    await test_teardown(request, cluster_mode, protocol)
    await client.close()


async def create_client(
    request,
    cluster_mode: bool,
    credentials: Optional[ServerCredentials] = None,
    database_id: int = 0,
    addresses: Optional[List[NodeAddress]] = None,
    client_name: Optional[str] = None,
    protocol: ProtocolVersion = ProtocolVersion.RESP3,
    request_timeout: Optional[int] = 1000,
    connection_timeout: Optional[int] = 1000,
    cluster_mode_pubsub: Optional[
        GlideClusterClientConfiguration.PubSubSubscriptions
    ] = None,
    standalone_mode_pubsub: Optional[
        GlideClientConfiguration.PubSubSubscriptions
    ] = None,
    inflight_requests_limit: Optional[int] = None,
    read_from: ReadFrom = ReadFrom.PRIMARY,
    client_az: Optional[str] = None,
    reconnect_strategy: Optional[BackoffStrategy] = None,
    valkey_cluster: Optional[ValkeyCluster] = None,
) -> Union[GlideClient, GlideClusterClient]:
    # Create async socket client
    use_tls = request.config.getoption("--tls")
    if cluster_mode:
        valkey_cluster = valkey_cluster or pytest.valkey_cluster
        assert type(valkey_cluster) is ValkeyCluster
        assert database_id == 0
        k = min(3, len(valkey_cluster.nodes_addr))
        seed_nodes = random.sample(valkey_cluster.nodes_addr, k=k)
        cluster_config = GlideClusterClientConfiguration(
            addresses=seed_nodes if addresses is None else addresses,
            use_tls=use_tls,
            credentials=credentials,
            client_name=client_name,
            protocol=protocol,
            request_timeout=request_timeout,
            pubsub_subscriptions=cluster_mode_pubsub,
            inflight_requests_limit=inflight_requests_limit,
            read_from=read_from,
            client_az=client_az,
            advanced_config=AdvancedGlideClusterClientConfiguration(connection_timeout),
        )
        return await GlideClusterClient.create(cluster_config)
    else:
        assert type(pytest.standalone_cluster) is ValkeyCluster
        config = GlideClientConfiguration(
            addresses=(
                pytest.standalone_cluster.nodes_addr if addresses is None else addresses
            ),
            use_tls=use_tls,
            credentials=credentials,
            database_id=database_id,
            client_name=client_name,
            protocol=protocol,
            request_timeout=request_timeout,
            pubsub_subscriptions=standalone_mode_pubsub,
            inflight_requests_limit=inflight_requests_limit,
            read_from=read_from,
            client_az=client_az,
            advanced_config=AdvancedGlideClientConfiguration(connection_timeout),
            reconnect_strategy=reconnect_strategy,
        )
        return await GlideClient.create(config)


NEW_PASSWORD = "new_secure_password"
WRONG_PASSWORD = "wrong_password"


async def auth_client(client: TGlideClient, password):
    """
    Authenticates the given TGlideClient server connected.
    """
    if isinstance(client, GlideClient):
        await client.custom_command(["AUTH", password])
    elif isinstance(client, GlideClusterClient):
        await client.custom_command(["AUTH", password], route=AllNodes())


async def config_set_new_password(client: TGlideClient, password):
    """
    Sets a new password for the given TGlideClient server connected.
    This function updates the server to require a new password.
    """
    if isinstance(client, GlideClient):
        await client.config_set({"requirepass": password})
    elif isinstance(client, GlideClusterClient):
        await client.config_set({"requirepass": password}, route=AllNodes())


async def kill_connections(client: TGlideClient):
    """
    Kills all connections to the given TGlideClient server connected.
    """
    if isinstance(client, GlideClient):
        await client.custom_command(["CLIENT", "KILL", "TYPE", "normal"])
    elif isinstance(client, GlideClusterClient):
        await client.custom_command(
            ["CLIENT", "KILL", "TYPE", "normal"], route=AllNodes()
        )


async def test_teardown(request, cluster_mode: bool, protocol: ProtocolVersion):
    """
    Perform teardown tasks such as flushing all data from the cluster.

    If authentication is required, attempt to connect with the known password,
    reset it back to empty, and proceed with teardown.
    """
    credentials = None
    try:
        # Try connecting without credentials
        client = await create_client(
            request, cluster_mode, protocol=protocol, request_timeout=2000
        )
        await client.custom_command(["FLUSHALL"])
        await client.close()
    except ClosingError as e:
        # Check if the error is due to authentication
        if "NOAUTH" in str(e):
            # Use the known password to authenticate
            credentials = ServerCredentials(password=NEW_PASSWORD)
            client = await create_client(
                request,
                cluster_mode,
                protocol=protocol,
                request_timeout=2000,
                credentials=credentials,
            )
            try:
                await auth_client(client, NEW_PASSWORD)
                # Reset the server password back to empty
                await config_set_new_password(client, "")
                await client.update_connection_password(None)
                # Perform the teardown
                await client.custom_command(["FLUSHALL"])
            finally:
                await client.close()
        else:
            raise e


@pytest.fixture(autouse=True)
async def skip_if_version_below(request):
    """
    Skip test(s) if server version is below than given parameter. Can skip a complete test suite.

    Example:

      @pytest.mark.skip_if_version_below('7.0.0')
      async def test_meow_meow(...):
          ...
    """
    if request.node.get_closest_marker("skip_if_version_below"):
        min_version = request.node.get_closest_marker("skip_if_version_below").args[0]
        client = await create_client(request, False)
        if await check_if_server_version_lt(client, min_version):
            pytest.skip(
                reason=f"This feature added in version {min_version}",
                allow_module_level=True,
            )
