// Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

use super::get_redis_connection_info;
use super::reconnecting_connection::{ReconnectReason, ReconnectingConnection};
use super::{to_duration, DEFAULT_CONNECTION_TIMEOUT};
use super::{ConnectionRequest, NodeAddress, TlsMode};
use crate::client::types::ReadFrom as ClientReadFrom;
use crate::retry_strategies::RetryStrategy;
use futures::{future, stream, StreamExt};
use logger_core::log_debug;
use logger_core::log_warn;
use rand::Rng;
use redis::aio::ConnectionLike;
use redis::cluster_routing::{self, is_readonly_cmd, ResponsePolicy, Routable, RoutingInfo};
use redis::{PushInfo, RedisError, RedisResult, Value};
use std::sync::atomic::AtomicUsize;
use std::sync::atomic::Ordering;
use std::sync::Arc;
use std::time::Duration;
use telemetrylib::Telemetry;
use tokio::sync::mpsc;
use tokio::task;

#[derive(Debug)]
enum ReadFrom {
    Primary,
    PreferReplica {
        latest_read_replica_index: Arc<AtomicUsize>,
    },
    AZAffinity {
        client_az: String,
        last_read_replica_index: Arc<AtomicUsize>,
    },
    AZAffinityReplicasAndPrimary {
        client_az: String,
        last_read_replica_index: Arc<AtomicUsize>,
    },
}

#[derive(Debug)]
struct DropWrapper {
    /// Connection to the primary node in the client.
    primary_index: usize,
    nodes: Vec<ReconnectingConnection>,
    read_from: ReadFrom,
}

impl Drop for DropWrapper {
    fn drop(&mut self) {
        for node in self.nodes.iter() {
            node.mark_as_dropped();
        }
    }
}

#[derive(Clone, Debug)]
pub struct StandaloneClient {
    inner: Arc<DropWrapper>,
}

impl Drop for StandaloneClient {
    fn drop(&mut self) {
        // Client was dropped, reduce the number of clients
        Telemetry::decr_total_clients(1);
    }
}

pub enum StandaloneClientConnectionError {
    NoAddressesProvided,
    FailedConnection(Vec<(Option<String>, RedisError)>),
    PrimaryConflictFound(String),
}

impl std::fmt::Debug for StandaloneClientConnectionError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            StandaloneClientConnectionError::NoAddressesProvided => {
                write!(f, "No addresses provided")
            }
            StandaloneClientConnectionError::FailedConnection(errs) => {
                match errs.len() {
                    0 => {
                        writeln!(f, "Failed without explicit error")?;
                    }
                    1 => {
                        let (ref address, ref error) = errs[0];
                        match address {
                            Some(address) => {
                                writeln!(f, "Received error for address `{address}`: {error}")?
                            }
                            None => writeln!(f, "Received error: {error}")?,
                        }
                    }
                    _ => {
                        writeln!(f, "Received errors:")?;
                        for (address, error) in errs {
                            match address {
                                Some(address) => writeln!(f, "{address}: {error}")?,
                                None => writeln!(f, "{error}")?,
                            }
                        }
                    }
                };
                Ok(())
            }
            StandaloneClientConnectionError::PrimaryConflictFound(found_primaries) => {
                writeln!(
                    f,
                    "Primary conflict. More than one primary found in a Standalone setup: {found_primaries}"
                )
            }
        }
    }
}

impl StandaloneClient {
    pub async fn create_client(
        connection_request: ConnectionRequest,
        push_sender: Option<mpsc::UnboundedSender<PushInfo>>,
    ) -> Result<Self, StandaloneClientConnectionError> {
        if connection_request.addresses.is_empty() {
            return Err(StandaloneClientConnectionError::NoAddressesProvided);
        }
        let mut redis_connection_info = get_redis_connection_info(&connection_request);
        let pubsub_connection_info = redis_connection_info.clone();
        redis_connection_info.pubsub_subscriptions = None;
        let retry_strategy = RetryStrategy::new(connection_request.connection_retry_strategy);

        let tls_mode = connection_request.tls_mode;
        let node_count = connection_request.addresses.len();
        // randomize pubsub nodes, maybe a batter option is to always use the primary
        let pubsub_node_index = rand::thread_rng().gen_range(0..node_count);
        let pubsub_addr = &connection_request.addresses[pubsub_node_index];
        let discover_az = matches!(
            connection_request.read_from,
            Some(ClientReadFrom::AZAffinity(_))
                | Some(ClientReadFrom::AZAffinityReplicasAndPrimary(_))
        );

        let connection_timeout = to_duration(
            connection_request.connection_timeout,
            DEFAULT_CONNECTION_TIMEOUT,
        );

        let mut stream = stream::iter(connection_request.addresses.iter())
            .map(|address| async {
                get_connection_and_replication_info(
                    address,
                    &retry_strategy,
                    if address.to_string() != pubsub_addr.to_string() {
                        &redis_connection_info
                    } else {
                        &pubsub_connection_info
                    },
                    tls_mode.unwrap_or(TlsMode::NoTls),
                    &push_sender,
                    discover_az,
                    connection_timeout,
                )
                .await
                .map_err(|err| (format!("{}:{}", address.host, address.port), err))
            })
            .buffer_unordered(node_count);

        let mut nodes = Vec::with_capacity(node_count);
        let mut addresses_and_errors = Vec::with_capacity(node_count);
        let mut primary_index = None;
        while let Some(result) = stream.next().await {
            match result {
                Ok((connection, replication_status)) => {
                    nodes.push(connection);
                    if redis::from_owned_redis_value::<String>(replication_status)
                        .is_ok_and(|val| val.contains("role:master"))
                    {
                        if let Some(primary_index) = primary_index {
                            // More than one primary found
                            return Err(StandaloneClientConnectionError::PrimaryConflictFound(
                                format!(
                                    "Primary nodes: {:?}, {:?}",
                                    nodes.pop(),
                                    nodes.get(primary_index)
                                ),
                            ));
                        }
                        primary_index = Some(nodes.len().saturating_sub(1));
                    }
                }
                Err((address, (connection, err))) => {
                    nodes.push(connection);
                    addresses_and_errors.push((Some(address), err));
                }
            }
        }

        let Some(primary_index) = primary_index else {
            if addresses_and_errors.is_empty() {
                addresses_and_errors.insert(
                    0,
                    (
                        None,
                        RedisError::from((redis::ErrorKind::ClientError, "No primary node found")),
                    ),
                )
            };
            return Err(StandaloneClientConnectionError::FailedConnection(
                addresses_and_errors,
            ));
        };
        if !addresses_and_errors.is_empty() {
            log_warn(
                "client creation",
                format!(
                    "Failed to connect to {addresses_and_errors:?}, will attempt to reconnect."
                ),
            );
        }
        let read_from = get_read_from(connection_request.read_from);

        #[cfg(feature = "standalone_heartbeat")]
        for node in nodes.iter() {
            Self::start_heartbeat(node.clone());
        }

        for node in nodes.iter() {
            Self::start_periodic_connection_check(node.clone());
        }

        // Successfully created new client. Update the telemetry
        Telemetry::incr_total_clients(1);

        Ok(Self {
            inner: Arc::new(DropWrapper {
                primary_index,
                nodes,
                read_from,
            }),
        })
    }

    fn get_primary_connection(&self) -> &ReconnectingConnection {
        self.inner.nodes.get(self.inner.primary_index).unwrap()
    }

    fn round_robin_read_from_replica(
        &self,
        latest_read_replica_index: &Arc<AtomicUsize>,
    ) -> &ReconnectingConnection {
        let initial_index = latest_read_replica_index.load(Ordering::Relaxed);
        let mut check_count = 0;
        loop {
            check_count += 1;

            // Looped through all replicas, no connected replica was found.
            if check_count > self.inner.nodes.len() {
                return self.get_primary_connection();
            }
            let index = (initial_index + check_count) % self.inner.nodes.len();
            if index == self.inner.primary_index {
                continue;
            }
            let Some(connection) = self.inner.nodes.get(index) else {
                continue;
            };
            if connection.is_connected() {
                let _ = latest_read_replica_index.compare_exchange_weak(
                    initial_index,
                    index,
                    Ordering::Relaxed,
                    Ordering::Relaxed,
                );
                return connection;
            }
        }
    }

    async fn round_robin_read_from_replica_az_awareness(
        &self,
        latest_read_replica_index: &Arc<AtomicUsize>,
        client_az: String,
    ) -> &ReconnectingConnection {
        let initial_index = latest_read_replica_index.load(Ordering::Relaxed);
        let mut retries = 0usize;

        loop {
            retries = retries.saturating_add(1);
            // Looped through all replicas; no connected replica found in the same AZ.
            if retries > self.inner.nodes.len() {
                // Attempt a fallback to any available replica in other AZs or primary.
                return self.round_robin_read_from_replica(latest_read_replica_index);
            }

            // Calculate index based on initial index and check count.
            let index = (initial_index + retries) % self.inner.nodes.len();
            let replica = &self.inner.nodes[index];

            // Attempt to get a connection and retrieve the replica's AZ.
            if let Ok(connection) = replica.get_connection().await {
                if let Some(replica_az) = connection.get_az().as_deref() {
                    if replica_az == client_az {
                        // Update `latest_used_replica` with the index of this replica.
                        let _ = latest_read_replica_index.compare_exchange_weak(
                            initial_index,
                            index,
                            Ordering::Relaxed,
                            Ordering::Relaxed,
                        );
                        return replica;
                    }
                }
            }
        }
    }

    async fn round_robin_read_from_replica_az_awareness_replicas_and_primary(
        &self,
        latest_read_replica_index: &Arc<AtomicUsize>,
        client_az: String,
    ) -> &ReconnectingConnection {
        let initial_index = latest_read_replica_index.load(Ordering::Relaxed);
        let mut retries = 0usize;

        // Step 1: Try to find a replica in the same AZ
        loop {
            retries = retries.saturating_add(1);
            // Looped through all replicas; no connected replica found in the same AZ.
            if retries >= self.inner.nodes.len() {
                break;
            }

            // Calculate index based on initial index and check count.
            let index = (initial_index + retries) % self.inner.nodes.len();
            let replica = &self.inner.nodes[index];

            // Attempt to get a connection and retrieve the replica's AZ.
            if let Ok(connection) = replica.get_connection().await {
                if let Some(replica_az) = connection.get_az().as_deref() {
                    if replica_az == client_az {
                        // Update `latest_used_replica` with the index of this replica.
                        let _ = latest_read_replica_index.compare_exchange_weak(
                            initial_index,
                            index,
                            Ordering::Relaxed,
                            Ordering::Relaxed,
                        );
                        return replica;
                    }
                }
            }
        }

        // Step 2: Check if primary is in the same AZ
        let primary = self.get_primary_connection();
        if let Ok(connection) = primary.get_connection().await {
            if let Some(primary_az) = connection.get_az().as_deref() {
                if primary_az == client_az {
                    return primary;
                }
            }
        }

        // Step 3: Fall back to any available replica using round-robin
        self.round_robin_read_from_replica(latest_read_replica_index)
    }

    async fn get_connection(&self, readonly: bool) -> &ReconnectingConnection {
        if self.inner.nodes.len() == 1 || !readonly {
            return self.get_primary_connection();
        }

        match &self.inner.read_from {
            ReadFrom::Primary => self.get_primary_connection(),
            ReadFrom::PreferReplica {
                latest_read_replica_index,
            } => self.round_robin_read_from_replica(latest_read_replica_index),
            ReadFrom::AZAffinity {
                client_az,
                last_read_replica_index,
            } => {
                self.round_robin_read_from_replica_az_awareness(
                    last_read_replica_index,
                    client_az.to_string(),
                )
                .await
            }
            ReadFrom::AZAffinityReplicasAndPrimary {
                client_az,
                last_read_replica_index,
            } => {
                self.round_robin_read_from_replica_az_awareness_replicas_and_primary(
                    last_read_replica_index,
                    client_az.to_string(),
                )
                .await
            }
        }
    }

    async fn send_request(
        cmd: &redis::Cmd,
        reconnecting_connection: &ReconnectingConnection,
    ) -> RedisResult<Value> {
        let mut connection = reconnecting_connection.get_connection().await?;
        let result = connection.send_packed_command(cmd).await;
        match result {
            Err(err) if err.is_unrecoverable_error() => {
                log_warn("send request", format!("received disconnect error `{err}`"));
                reconnecting_connection.reconnect(ReconnectReason::ConnectionDropped);
                Err(err)
            }
            _ => result,
        }
    }

    async fn send_request_to_all_nodes(
        &mut self,
        cmd: &redis::Cmd,
        response_policy: Option<ResponsePolicy>,
    ) -> RedisResult<Value> {
        let requests = self
            .inner
            .nodes
            .iter()
            .map(|node| Self::send_request(cmd, node));

        // TODO - once Value::Error will be merged, these will need to be updated to handle this new value.
        match response_policy {
            Some(ResponsePolicy::AllSucceeded) => {
                future::try_join_all(requests)
                    .await
                    .map(|mut results| results.pop().unwrap()) // unwrap is safe, since at least one function succeeded
            }
            Some(ResponsePolicy::OneSucceeded) => future::select_ok(requests.map(Box::pin))
                .await
                .map(|(result, _)| result),
            Some(ResponsePolicy::FirstSucceededNonEmptyOrAllEmpty) => {
                future::select_ok(requests.map(|request| {
                    Box::pin(async move {
                        let result = request.await?;
                        match result {
                            Value::Nil => {
                                Err((redis::ErrorKind::ResponseError, "no value found").into())
                            }
                            _ => Ok(result),
                        }
                    })
                }))
                .await
                .map(|(result, _)| result)
            }
            Some(ResponsePolicy::Aggregate(op)) => future::try_join_all(requests)
                .await
                .and_then(|results| cluster_routing::aggregate(results, op)),
            Some(ResponsePolicy::AggregateLogical(op)) => future::try_join_all(requests)
                .await
                .and_then(|results| cluster_routing::logical_aggregate(results, op)),
            Some(ResponsePolicy::CombineArrays) => future::try_join_all(requests)
                .await
                .and_then(cluster_routing::combine_array_results),
            Some(ResponsePolicy::CombineMaps) => future::try_join_all(requests)
                .await
                .and_then(cluster_routing::combine_map_results),
            Some(ResponsePolicy::Special) => {
                // Await all futures and collect results
                let results = future::try_join_all(requests).await?;
                // Create key-value pairs where the key is the node address and the value is the corresponding result
                let node_result_pairs = self
                    .inner
                    .nodes
                    .iter()
                    .zip(results)
                    .map(|(node, result)| (Value::BulkString(node.node_address().into()), result))
                    .collect();

                Ok(Value::Map(node_result_pairs))
            }

            None => {
                // This is our assumption - if there's no coherent way to aggregate the responses, we just collect them in an array, and pass it to the user.
                // TODO - once Value::Error is merged, we can use join_all and report separate errors and also pass successes.
                future::try_join_all(requests).await.map(Value::Array)
            }
        }
    }

    async fn send_request_to_single_node(
        &mut self,
        cmd: &redis::Cmd,
        readonly: bool,
    ) -> RedisResult<Value> {
        let reconnecting_connection = self.get_connection(readonly).await;
        Self::send_request(cmd, reconnecting_connection).await
    }

    pub async fn send_command(&mut self, cmd: &redis::Cmd) -> RedisResult<Value> {
        let Some(cmd_bytes) = Routable::command(cmd) else {
            return self.send_request_to_single_node(cmd, false).await;
        };

        if RoutingInfo::is_all_nodes(cmd_bytes.as_slice()) {
            let response_policy = ResponsePolicy::for_command(cmd_bytes.as_slice());
            return self.send_request_to_all_nodes(cmd, response_policy).await;
        }
        self.send_request_to_single_node(cmd, is_readonly_cmd(cmd_bytes.as_slice()))
            .await
    }

    pub async fn send_pipeline(
        &mut self,
        pipeline: &redis::Pipeline,
        offset: usize,
        count: usize,
    ) -> RedisResult<Vec<Value>> {
        let reconnecting_connection = self.get_primary_connection();
        let mut connection = reconnecting_connection.get_connection().await?;
        let result = connection
            .send_packed_commands(pipeline, offset, count)
            .await;
        match result {
            Err(err) if err.is_unrecoverable_error() => {
                log_warn(
                    "pipeline request",
                    format!("received disconnect error `{err}`"),
                );
                reconnecting_connection.reconnect(ReconnectReason::ConnectionDropped);
                Err(err)
            }
            _ => result,
        }
    }

    #[cfg(feature = "standalone_heartbeat")]
    fn start_heartbeat(reconnecting_connection: ReconnectingConnection) {
        task::spawn(async move {
            loop {
                tokio::time::sleep(super::HEARTBEAT_SLEEP_DURATION).await;
                if reconnecting_connection.is_dropped() {
                    log_debug(
                        "StandaloneClient",
                        "heartbeat stopped after connection was dropped",
                    );
                    // Client was dropped, heartbeat can stop.
                    return;
                }

                let Some(mut connection) = reconnecting_connection.try_get_connection().await
                else {
                    log_debug(
                        "StandaloneClient",
                        "heartbeat stopped while connection is reconnecting",
                    );
                    // Client is reconnecting..
                    continue;
                };
                log_debug("StandaloneClient", "performing heartbeat");
                if connection
                    .send_packed_command(&redis::cmd("PING"))
                    .await
                    .is_err_and(|err| err.is_connection_dropped() || err.is_connection_refusal())
                {
                    log_debug("StandaloneClient", "heartbeat triggered reconnect");
                    reconnecting_connection.reconnect(ReconnectReason::ConnectionDropped);
                }
            }
        });
    }

    // Monitors passive connection status and reconnects if necessary.
    // This function is cheaper alternative to start_heartbeat(),
    // as it avoids sending PING commands to the server, checking only the connection state.
    fn start_periodic_connection_check(reconnecting_connection: ReconnectingConnection) {
        task::spawn(async move {
            loop {
                reconnecting_connection
                    .wait_for_disconnect_with_timeout(&super::CONNECTION_CHECKS_INTERVAL)
                    .await;
                // check connection is valid
                if reconnecting_connection.is_dropped() {
                    log_debug(
                        "StandaloneClient",
                        "connection checker stopped after connection was dropped",
                    );

                    // Client was dropped, checker can stop.
                    return;
                }

                let Some(connection) = reconnecting_connection.try_get_connection().await else {
                    log_debug(
                        "StandaloneClient",
                        "connection checker is skipping a connections since its reconnecting",
                    );
                    // Client is reconnecting..
                    continue;
                };

                if connection.is_closed() {
                    log_debug(
                        "StandaloneClient",
                        "connection checker has triggered reconnect",
                    );
                    reconnecting_connection.reconnect(ReconnectReason::ConnectionDropped);
                }
            }
        });
    }

    /// Update the password used to authenticate with the servers.
    /// If the password is `None`, the password will be removed.
    pub async fn update_connection_password(
        &mut self,
        password: Option<String>,
    ) -> RedisResult<Value> {
        self.get_connection(false)
            .await
            .get_connection()
            .await?
            .update_connection_password(password.clone())
            .await
    }
}

async fn get_connection_and_replication_info(
    address: &NodeAddress,
    retry_strategy: &RetryStrategy,
    connection_info: &redis::RedisConnectionInfo,
    tls_mode: TlsMode,
    push_sender: &Option<mpsc::UnboundedSender<PushInfo>>,
    discover_az: bool,
    connection_timeout: Duration,
) -> Result<(ReconnectingConnection, Value), (ReconnectingConnection, RedisError)> {
    let result = ReconnectingConnection::new(
        address,
        retry_strategy.clone(),
        connection_info.clone(),
        tls_mode,
        push_sender.clone(),
        discover_az,
        connection_timeout,
    )
    .await;
    let reconnecting_connection = match result {
        Ok(reconnecting_connection) => reconnecting_connection,
        Err(tuple) => return Err(tuple),
    };

    let mut multiplexed_connection = match reconnecting_connection.get_connection().await {
        Ok(multiplexed_connection) => multiplexed_connection,
        Err(err) => {
            // NOTE: this block is never reached
            reconnecting_connection.reconnect(ReconnectReason::ConnectionDropped);
            return Err((reconnecting_connection, err));
        }
    };

    match multiplexed_connection
        .send_packed_command(redis::cmd("INFO").arg("REPLICATION"))
        .await
    {
        Ok(replication_status) => {
            // Connection established + we got the INFO output
            Ok((reconnecting_connection, replication_status))
        }
        Err(err) => Err((reconnecting_connection, err)),
    }
}

fn get_read_from(read_from: Option<super::ReadFrom>) -> ReadFrom {
    match read_from {
        Some(super::ReadFrom::Primary) => ReadFrom::Primary,
        Some(super::ReadFrom::PreferReplica) => ReadFrom::PreferReplica {
            latest_read_replica_index: Default::default(),
        },
        Some(super::ReadFrom::AZAffinity(az)) => ReadFrom::AZAffinity {
            client_az: az,
            last_read_replica_index: Default::default(),
        },
        Some(super::ReadFrom::AZAffinityReplicasAndPrimary(az)) => {
            ReadFrom::AZAffinityReplicasAndPrimary {
                client_az: az,
                last_read_replica_index: Default::default(),
            }
        }
        None => ReadFrom::Primary,
    }
}
