use crate::cluster_async::ConnectionFuture;
use crate::cluster_routing::{Route, ShardAddrs, SlotAddr};
use crate::cluster_slotmap::{ReadFromReplicaStrategy, SlotMap, SlotMapValue};
use crate::cluster_topology::TopologyHash;
use dashmap::DashMap;
use futures::FutureExt;
use rand::seq::IteratorRandom;
use std::collections::{HashMap, HashSet};
use std::net::IpAddr;
use std::sync::atomic::Ordering;
use std::sync::Arc;
use telemetrylib::Telemetry;

use tracing::debug;

use tokio::sync::Notify;
use tokio::task::JoinHandle;

/// Count the number of connections in a connections_map object
macro_rules! count_connections {
    ($conn_map:expr) => {{
        let mut count = 0usize;
        for a in $conn_map {
            count = count.saturating_add(if a.management_connection.is_some() {
                2
            } else {
                1
            });
        }
        count
    }};
}

/// A struct that encapsulates a network connection along with its associated IP address and AZ.
#[derive(Clone, Eq, PartialEq, Debug)]
pub struct ConnectionDetails<Connection> {
    /// The actual connection
    pub conn: Connection,
    /// The IP associated with the connection
    pub ip: Option<IpAddr>,
    /// The availability zone associated with the connection
    pub az: Option<String>,
}

impl<Connection> ConnectionDetails<Connection>
where
    Connection: Clone + Send + 'static,
{
    /// Consumes the current instance and returns a new `ConnectionDetails`
    /// where the connection is wrapped in a future.
    #[doc(hidden)]
    pub fn into_future(self) -> ConnectionDetails<ConnectionFuture<Connection>> {
        ConnectionDetails {
            conn: async { self.conn }.boxed().shared(),
            ip: self.ip,
            az: self.az,
        }
    }
}

impl<Connection> From<(Connection, Option<IpAddr>, Option<String>)>
    for ConnectionDetails<Connection>
{
    fn from(val: (Connection, Option<IpAddr>, Option<String>)) -> Self {
        ConnectionDetails {
            conn: val.0,
            ip: val.1,
            az: val.2,
        }
    }
}

impl<Connection> From<ConnectionDetails<Connection>>
    for (Connection, Option<IpAddr>, Option<String>)
{
    fn from(val: ConnectionDetails<Connection>) -> Self {
        (val.conn, val.ip, val.az)
    }
}

#[derive(Clone, Eq, PartialEq, Debug)]
pub struct ClusterNode<Connection> {
    pub user_connection: ConnectionDetails<Connection>,
    pub management_connection: Option<ConnectionDetails<Connection>>,
}

impl<Connection> ClusterNode<Connection>
where
    Connection: Clone,
{
    pub fn new(
        user_connection: ConnectionDetails<Connection>,
        management_connection: Option<ConnectionDetails<Connection>>,
    ) -> Self {
        Self {
            user_connection,
            management_connection,
        }
    }

    /// Return the number of underlying connections managed by this instance of ClusterNode
    pub fn connections_count(&self) -> usize {
        if self.management_connection.is_some() {
            2
        } else {
            1
        }
    }

    pub(crate) fn get_connection(&self, conn_type: &ConnectionType) -> Connection {
        match conn_type {
            ConnectionType::User => self.user_connection.conn.clone(),
            ConnectionType::PreferManagement => self.management_connection.as_ref().map_or_else(
                || self.user_connection.conn.clone(),
                |management_conn| management_conn.conn.clone(),
            ),
        }
    }
}

#[derive(Clone, Eq, PartialEq, Debug)]

pub(crate) enum ConnectionType {
    User,
    PreferManagement,
}

pub(crate) struct ConnectionsMap<Connection>(pub(crate) DashMap<String, ClusterNode<Connection>>);

impl<Connection> std::fmt::Display for ConnectionsMap<Connection> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        for item in self.0.iter() {
            let (address, node) = (item.key(), item.value());
            match node.user_connection.ip {
                Some(ip) => writeln!(f, "{address} - {ip}")?,
                None => writeln!(f, "{address}")?,
            };
        }
        Ok(())
    }
}

#[derive(Clone, Debug)]
pub(crate) struct RefreshTaskNotifier {
    notify: Arc<Notify>,
}

impl RefreshTaskNotifier {
    fn new() -> Self {
        RefreshTaskNotifier {
            notify: Arc::new(Notify::new()),
        }
    }

    pub fn get_notifier(&self) -> Arc<Notify> {
        self.notify.clone()
    }

    pub fn notify(&self) {
        self.notify.notify_waiters();
    }
}

// Enum representing the task status during a connection refresh.
//
// - **Reconnecting**:
//   Indicates that a refresh task is in progress. This status includes a dedicated
//   notifier (`RefreshTaskNotifier`) so that other tasks can wait for the connection
//   to be refreshed before proceeding.
//
// - **ReconnectingTooLong**:
//   Represents a situation where a refresh task has taken too long to complete.
//   The status transitions from `Reconnecting` to `ReconnectingTooLong` under specific
//   conditions (e.g., after one attempt of reconnecting inside the task or after a timeout).
//
// The transition from `Reconnecting` to `ReconnectingTooLong` is managed exclusively
// within the `update_refreshed_connection` function in `poll_flush`. This ensures that
// all requests maintain a consistent view of the connections.
//
// When transitioning from `Reconnecting` to `ReconnectingTooLong`, the associated
// notifier is triggered to unblock all awaiting tasks.
#[derive(Clone, Debug)]
pub(crate) enum RefreshTaskStatus {
    // The task is actively reconnecting. Includes a notifier for tasks to wait on.
    Reconnecting(RefreshTaskNotifier),
    // The task has exceeded the allowed reconnection time.
    #[allow(dead_code)]
    ReconnectingTooLong,
}

impl Drop for RefreshTaskStatus {
    fn drop(&mut self) {
        if let RefreshTaskStatus::Reconnecting(notifier) = self {
            debug!("RefreshTaskStatus: Dropped while in Reconnecting status. Notifying tasks.");
            notifier.notify();
        }
    }
}

impl RefreshTaskStatus {
    /// Creates a new `RefreshTaskStatus` in the `Reconnecting` status with a fresh `RefreshTaskNotifier`.
    pub fn new() -> Self {
        debug!("RefreshTaskStatus: Initialized in Reconnecting status with a new notifier.");
        RefreshTaskStatus::Reconnecting(RefreshTaskNotifier::new())
    }

    // Transitions the current status from `Reconnecting` to `ReconnectingTooLong` in place.
    //
    // If the current status is `Reconnecting`, this method notifies all waiting tasks
    // using the embedded `RefreshTaskNotifier` and updates the status to `ReconnectingTooLong`.
    //
    // If the status is already `ReconnectingTooLong`, this method does nothing.
    #[allow(dead_code)]
    pub fn flip_status_to_too_long(&mut self) {
        if let RefreshTaskStatus::Reconnecting(notifier) = self {
            debug!(
                "RefreshTaskStatus: Notifying tasks before transitioning to ReconnectingTooLong."
            );
            notifier.notify();
            *self = RefreshTaskStatus::ReconnectingTooLong;
        } else {
            debug!("RefreshTaskStatus: Already in ReconnectingTooLong status.");
        }
    }

    pub fn notify_waiting_requests(&mut self) {
        if let RefreshTaskStatus::Reconnecting(notifier) = self {
            debug!("RefreshTaskStatus::notify_waiting_requests notify");
            notifier.notify();
        } else {
            debug!("RefreshTaskStatus::notify_waiting_requests - ReconnectingTooLong status.");
        }
    }
}

// Struct combining the task handle and its status
#[derive(Debug)]
pub(crate) struct RefreshTaskState {
    pub handle: JoinHandle<()>,
    pub status: RefreshTaskStatus,
}

impl RefreshTaskState {
    // Creates a new `RefreshTaskState` with a `Reconnecting` state and a new notifier.
    pub fn new(handle: JoinHandle<()>) -> Self {
        debug!("RefreshTaskState: Creating a new instance with a Reconnecting state.");
        RefreshTaskState {
            handle,
            status: RefreshTaskStatus::new(),
        }
    }
}

impl Drop for RefreshTaskState {
    fn drop(&mut self) {
        if let RefreshTaskStatus::Reconnecting(ref notifier) = self.status {
            debug!("RefreshTaskState: Dropped while in Reconnecting status. Notifying tasks.");
            notifier.notify();
        } else {
            debug!("RefreshTaskState: Dropped while in ReconnectingTooLong status.");
        }

        // Abort the task handle if it's not yet finished
        if !self.handle.is_finished() {
            debug!("RefreshTaskState: Aborting unfinished task.");
            self.handle.abort();
        } else {
            debug!("RefreshTaskState: Task already finished, no abort necessary.");
        }
    }
}

// This struct is used to track the status of each address refresh
pub(crate) struct RefreshConnectionStates<Connection> {
    // Holds all the failed addresses that started a refresh task.
    pub(crate) refresh_addresses_started: HashSet<String>,
    // Follow the refresh ops on the connections
    pub(crate) refresh_address_in_progress: HashMap<String, RefreshTaskState>,
    // Holds all the refreshed addresses that are ready to be inserted into the connection_map
    pub(crate) refresh_addresses_done: HashMap<String, Option<ClusterNode<Connection>>>,
}

impl<Connection> RefreshConnectionStates<Connection> {
    // Clears all ongoing refresh connection tasks and resets associated state tracking.
    //
    // - This method removes all entries in the `refresh_address_in_progress` map.
    // - The `Drop` trait is responsible for notifying the associated notifiers and aborting any unfinished refresh tasks.
    // - Additionally, this method clears `refresh_addresses_started` and `refresh_addresses_done`
    //   to ensure no stale data remains in the refresh state tracking.
    pub(crate) fn clear_refresh_state(&mut self) {
        debug!(
            "clear_refresh_state: removing all in-progress refresh connection tasks for addresses: {:?}",
            self.refresh_address_in_progress.keys().collect::<Vec<_>>()
        );

        // Clear the entire map; Drop handles the cleanup
        self.refresh_address_in_progress.clear();

        // Clear other state tracking
        self.refresh_addresses_started.clear();
        self.refresh_addresses_done.clear();
    }

    // Collects the notifiers for the given addresses and returns them as a vector.
    //
    // This function retrieves the notifiers for the provided addresses from the `refresh_address_in_progress`
    // map and returns them, so they can be awaited outside of the lock.
    //
    // # Arguments
    // * `addresses` - A list of addresses for which notifiers are required.
    //
    // # Returns
    // A vector of `futures::future::Notified` that can be awaited.
    pub(crate) fn collect_refresh_notifiers(
        &self,
        addresses: &HashSet<String>,
    ) -> Vec<Arc<Notify>> {
        addresses
            .iter()
            .filter_map(|address| {
                self.refresh_address_in_progress
                    .get(address)
                    .and_then(|refresh_state| match &refresh_state.status {
                        RefreshTaskStatus::Reconnecting(notifier) => {
                            Some(notifier.get_notifier().clone())
                        }
                        _ => None,
                    })
            })
            .collect()
    }
}

impl<Connection> Default for RefreshConnectionStates<Connection> {
    fn default() -> Self {
        Self {
            refresh_addresses_started: HashSet::new(),
            refresh_address_in_progress: HashMap::new(),
            refresh_addresses_done: HashMap::new(),
        }
    }
}

pub(crate) struct ConnectionsContainer<Connection> {
    connection_map: DashMap<String, ClusterNode<Connection>>,
    pub(crate) slot_map: SlotMap,
    read_from_replica_strategy: ReadFromReplicaStrategy,
    topology_hash: TopologyHash,
    pub(crate) refresh_conn_state: RefreshConnectionStates<Connection>,
}

impl<Connection> Drop for ConnectionsContainer<Connection> {
    fn drop(&mut self) {
        let count = count_connections!(&self.connection_map);
        Telemetry::decr_total_connections(count);
    }
}

impl<Connection> Default for ConnectionsContainer<Connection> {
    fn default() -> Self {
        Self {
            connection_map: Default::default(),
            slot_map: Default::default(),
            read_from_replica_strategy: ReadFromReplicaStrategy::AlwaysFromPrimary,
            topology_hash: 0,
            refresh_conn_state: Default::default(),
        }
    }
}

pub(crate) type ConnectionAndAddress<Connection> = (String, Connection);

impl<Connection> ConnectionsContainer<Connection>
where
    Connection: Clone,
{
    pub(crate) fn new(
        slot_map: SlotMap,
        connection_map: ConnectionsMap<Connection>,
        read_from_replica_strategy: ReadFromReplicaStrategy,
        topology_hash: TopologyHash,
    ) -> Self {
        let connection_map = connection_map.0;

        // Update the telemetry with the number of connections
        let count = count_connections!(&connection_map);
        Telemetry::incr_total_connections(count);

        Self {
            connection_map,
            slot_map,
            read_from_replica_strategy,
            topology_hash,
            refresh_conn_state: Default::default(),
        }
    }

    /// Returns an iterator over the nodes in the `slot_map`, yielding pairs of the node address and its associated shard addresses.
    pub(crate) fn slot_map_nodes(
        &self,
    ) -> impl Iterator<Item = (Arc<String>, Arc<ShardAddrs>)> + '_ {
        self.slot_map
            .nodes_map()
            .iter()
            .map(|item| (item.key().clone(), item.value().clone()))
    }

    // Extends the current connection map with the provided one
    pub(crate) fn extend_connection_map(
        &mut self,
        other_connection_map: ConnectionsMap<Connection>,
    ) {
        let conn_count_before = count_connections!(&self.connection_map);
        self.connection_map.extend(other_connection_map.0);
        let conn_count_after = count_connections!(&self.connection_map);
        // Update the number of connections by the difference
        Telemetry::incr_total_connections(conn_count_after.saturating_sub(conn_count_before));
    }

    /// Returns the availability zone associated with the connection in address
    pub(crate) fn az_for_address(&self, address: &str) -> Option<String> {
        self.connection_map
            .get(address)
            .map(|item| item.value().user_connection.az.clone())?
    }

    /// Returns true if the address represents a known primary node.
    pub(crate) fn is_primary(&self, address: &String) -> bool {
        self.connection_for_address(address).is_some() && self.slot_map.is_primary(address)
    }

    fn round_robin_read_from_replica(
        &self,
        slot_map_value: &SlotMapValue,
    ) -> Option<ConnectionAndAddress<Connection>> {
        let addrs = &slot_map_value.addrs;
        let initial_index = slot_map_value.last_used_replica.load(Ordering::Relaxed);
        let mut check_count = 0;
        loop {
            check_count += 1;

            // Looped through all replicas, no connected replica was found.
            if check_count > addrs.replicas().len() {
                return self.connection_for_address(addrs.primary().as_str());
            }
            let index = (initial_index + check_count) % addrs.replicas().len();
            if let Some(connection) = self.connection_for_address(addrs.replicas()[index].as_str())
            {
                let _ = slot_map_value.last_used_replica.compare_exchange_weak(
                    initial_index,
                    index,
                    Ordering::Relaxed,
                    Ordering::Relaxed,
                );
                return Some(connection);
            }
        }
    }

    /// Returns the node's connection in the same availability zone as `client_az` in round robin strategy if exits,
    /// if not, will fall back to any available replica or primary.
    pub(crate) fn round_robin_read_from_replica_with_az_awareness(
        &self,
        slot_map_value: &SlotMapValue,
        client_az: String,
    ) -> Option<ConnectionAndAddress<Connection>> {
        let addrs = &slot_map_value.addrs;
        let initial_index = slot_map_value.last_used_replica.load(Ordering::Relaxed);
        let mut retries = 0usize;

        loop {
            retries = retries.saturating_add(1);
            // Looped through all replicas; no connected replica found in the same availability zone.
            if retries > addrs.replicas().len() {
                // Attempt a fallback to any available replica or primary if needed.
                return self.round_robin_read_from_replica(slot_map_value);
            }

            // Calculate index based on initial index and check count.
            let index = (initial_index + retries) % addrs.replicas().len();
            let replica = &addrs.replicas()[index];

            // Check if this replica’s availability zone matches the user’s availability zone.
            if let Some((address, connection_details)) =
                self.connection_details_for_address(replica.as_str())
            {
                if self.az_for_address(&address) == Some(client_az.clone()) {
                    // Attempt to update `latest_used_replica` with the index of this replica.
                    let _ = slot_map_value.last_used_replica.compare_exchange_weak(
                        initial_index,
                        index,
                        Ordering::Relaxed,
                        Ordering::Relaxed,
                    );
                    return Some((address, connection_details.conn));
                }
            }
        }
    }

    fn lookup_route(&self, route: &Route) -> Option<ConnectionAndAddress<Connection>> {
        let slot_map_value = self.slot_map.slot_value_for_route(route)?;
        let addrs = &slot_map_value.addrs;
        if addrs.replicas().is_empty() {
            return self.connection_for_address(addrs.primary().as_str());
        }

        match route.slot_addr() {
            // Master strategy will be in use when the command is not read_only
            SlotAddr::Master => self.connection_for_address(addrs.primary().as_str()),
            // ReplicaOptional strategy will be in use when the command is read_only
            SlotAddr::ReplicaOptional => match &self.read_from_replica_strategy {
                ReadFromReplicaStrategy::AlwaysFromPrimary => {
                    self.connection_for_address(addrs.primary().as_str())
                }
                ReadFromReplicaStrategy::RoundRobin => {
                    self.round_robin_read_from_replica(slot_map_value)
                }
                ReadFromReplicaStrategy::AZAffinity(az) => self
                    .round_robin_read_from_replica_with_az_awareness(
                        slot_map_value,
                        az.to_string(),
                    ),
            },
            // when the user strategy per command is replica_preffered
            SlotAddr::ReplicaRequired => match &self.read_from_replica_strategy {
                ReadFromReplicaStrategy::AZAffinity(az) => self
                    .round_robin_read_from_replica_with_az_awareness(
                        slot_map_value,
                        az.to_string(),
                    ),
                _ => self.round_robin_read_from_replica(slot_map_value),
            },
        }
    }

    pub(crate) fn connection_for_route(
        &self,
        route: &Route,
    ) -> Option<ConnectionAndAddress<Connection>> {
        self.lookup_route(route).or_else(|| {
            if route.slot_addr() != SlotAddr::Master {
                self.lookup_route(&Route::new(route.slot(), SlotAddr::Master))
            } else {
                None
            }
        })
    }

    // Fetches the master address for a given route.
    // Returns `None` if no master address can be resolved.
    pub(crate) fn address_for_route(&self, route: &Route) -> Option<String> {
        let slot_map_value = self.slot_map.slot_value_for_route(route)?;
        Some(slot_map_value.addrs.primary().clone().to_string())
    }

    // Retrieves the notifier for a reconnect task associated with a given route.
    // Returns `Some(Arc<Notify>)` if a reconnect task is in the `Reconnecting` state.
    // Returns `None` if:
    // - There is no refresh task for the route's address.
    // - The reconnect task is in `ReconnectingTooLong` state, with a debug log for clarity.
    pub(crate) fn notifier_for_route(&self, route: &Route) -> Option<Arc<Notify>> {
        let address = self.address_for_route(route)?;

        if let Some(task_state) = self
            .refresh_conn_state
            .refresh_address_in_progress
            .get(&address)
        {
            match &task_state.status {
                RefreshTaskStatus::Reconnecting(notifier) => {
                    debug!(
                        "notifier_for_route: Found reconnect notifier for address: {}",
                        address
                    );
                    Some(notifier.get_notifier())
                }
                RefreshTaskStatus::ReconnectingTooLong => {
                    debug!(
                        "notifier_for_route: Address {} is in ReconnectingTooLong state. No notifier will be returned.",
                        address
                    );
                    None
                }
            }
        } else {
            debug!(
                "notifier_for_route: No refresh task exists for address: {}. No notifier will be returned.",
                address
            );
            None
        }
    }

    pub(crate) fn all_node_connections(
        &self,
    ) -> impl Iterator<Item = ConnectionAndAddress<Connection>> + '_ {
        self.connection_map.iter().map(move |item| {
            let (node, address) = (item.key(), item.value());
            (node.clone(), address.user_connection.conn.clone())
        })
    }

    pub(crate) fn all_primary_connections(
        &self,
    ) -> impl Iterator<Item = ConnectionAndAddress<Connection>> + '_ {
        self.slot_map
            .addresses_for_all_primaries()
            .into_iter()
            .flat_map(|addr| self.connection_for_address(&addr))
    }

    pub(crate) fn node_for_address(&self, address: &str) -> Option<ClusterNode<Connection>> {
        self.connection_map
            .get(address)
            .map(|item| item.value().clone())
    }

    pub(crate) fn connection_for_address(
        &self,
        address: &str,
    ) -> Option<ConnectionAndAddress<Connection>> {
        self.connection_map.get(address).map(|item| {
            let (address, conn) = (item.key(), item.value());
            (address.clone(), conn.user_connection.conn.clone())
        })
    }

    pub(crate) fn connection_details_for_address(
        &self,
        address: &str,
    ) -> Option<ConnectionAndAddress<ConnectionDetails<Connection>>> {
        self.connection_map.get(address).map(|item| {
            let (address, conn) = (item.key(), item.value());
            (address.clone(), conn.user_connection.clone())
        })
    }

    pub(crate) fn random_connections(
        &self,
        amount: usize,
        conn_type: ConnectionType,
    ) -> Option<Vec<ConnectionAndAddress<Connection>>> {
        (!self.connection_map.is_empty()).then_some({
            self.connection_map
                .iter()
                .choose_multiple(&mut rand::thread_rng(), amount)
                .into_iter()
                .map(move |item| {
                    let (address, node) = (item.key(), item.value());
                    let conn = node.get_connection(&conn_type);
                    (address.clone(), conn)
                })
                .collect::<Vec<_>>()
        })
    }

    pub(crate) fn replace_or_add_connection_for_address(
        &self,
        address: impl Into<String>,
        node: ClusterNode<Connection>,
    ) -> String {
        let address = address.into();

        // Increase the total number of connections by the number of connections managed by `node`
        Telemetry::incr_total_connections(node.connections_count());

        if let Some(old_conn) = self.connection_map.insert(address.clone(), node) {
            // We are replacing a node. Reduce the counter by the number of connections managed by
            // the old connection
            Telemetry::decr_total_connections(old_conn.connections_count());
        };
        address
    }

    pub(crate) fn remove_node(&self, address: &String) -> Option<ClusterNode<Connection>> {
        if let Some((_key, old_conn)) = self.connection_map.remove(address) {
            Telemetry::decr_total_connections(old_conn.connections_count());
            Some(old_conn)
        } else {
            None
        }
    }

    pub(crate) fn len(&self) -> usize {
        self.connection_map.len()
    }

    pub(crate) fn connection_map(&self) -> &DashMap<String, ClusterNode<Connection>> {
        &self.connection_map
    }

    pub(crate) fn get_current_topology_hash(&self) -> TopologyHash {
        self.topology_hash
    }

    /// Returns true if the connections container contains no connections.
    pub(crate) fn is_empty(&self) -> bool {
        self.connection_map.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use std::collections::HashSet;

    use crate::cluster_routing::Slot;

    use super::*;
    impl<Connection> ClusterNode<Connection>
    where
        Connection: Clone,
    {
        pub(crate) fn new_only_with_user_conn(user_connection: Connection) -> Self {
            let ip = None;
            let az = None;
            Self {
                user_connection: (user_connection, ip, az).into(),
                management_connection: None,
            }
        }
    }
    fn remove_nodes(container: &ConnectionsContainer<usize>, addresses: &[&str]) {
        for address in addresses {
            container.remove_node(&(*address).into());
        }
    }

    fn remove_all_connections(container: &ConnectionsContainer<usize>) {
        remove_nodes(
            container,
            &[
                "primary1",
                "primary2",
                "primary3",
                "replica2-1",
                "replica3-1",
                "replica3-2",
            ],
        );
    }

    fn one_of(
        connection: Option<ConnectionAndAddress<usize>>,
        expected_connections: &[usize],
    ) -> bool {
        let found = connection.unwrap().1;
        expected_connections.contains(&found)
    }
    fn create_cluster_node(
        connection: usize,
        use_management_connections: bool,
        node_az: Option<String>,
    ) -> ClusterNode<usize> {
        let ip = None;
        ClusterNode::new(
            (connection, ip, node_az.clone()).into(),
            if use_management_connections {
                Some((connection * 10, ip, node_az).into())
            } else {
                None
            },
        )
    }

    fn create_container_with_az_strategy(
        use_management_connections: bool,
    ) -> ConnectionsContainer<usize> {
        let slot_map = SlotMap::new(
            vec![
                Slot::new(1, 1000, "primary1".to_owned(), Vec::new()),
                Slot::new(
                    1002,
                    2000,
                    "primary2".to_owned(),
                    vec!["replica2-1".to_owned()],
                ),
                Slot::new(
                    2001,
                    3000,
                    "primary3".to_owned(),
                    vec![
                        "replica3-1".to_owned(),
                        "replica3-2".to_owned(),
                        "replica3-3".to_owned(),
                    ],
                ),
            ],
            ReadFromReplicaStrategy::AlwaysFromPrimary, // this argument shouldn't matter, since we overload the RFR strategy.
        );
        let connection_map = DashMap::new();
        connection_map.insert(
            "primary1".into(),
            create_cluster_node(1, use_management_connections, None),
        );
        connection_map.insert(
            "primary2".into(),
            create_cluster_node(2, use_management_connections, None),
        );
        connection_map.insert(
            "primary3".into(),
            create_cluster_node(3, use_management_connections, None),
        );
        connection_map.insert(
            "replica2-1".into(),
            create_cluster_node(21, use_management_connections, None),
        );
        connection_map.insert(
            "replica3-1".into(),
            create_cluster_node(31, use_management_connections, Some("use-1a".to_string())),
        );
        connection_map.insert(
            "replica3-2".into(),
            create_cluster_node(32, use_management_connections, Some("use-1b".to_string())),
        );
        connection_map.insert(
            "replica3-3".into(),
            create_cluster_node(33, use_management_connections, Some("use-1a".to_string())),
        );
        connection_map.insert(
            "replica3-3".into(),
            create_cluster_node(33, use_management_connections, Some("use-1a".to_string())),
        );

        ConnectionsContainer {
            slot_map,
            connection_map,
            read_from_replica_strategy: ReadFromReplicaStrategy::AZAffinity("use-1a".to_string()),
            topology_hash: 0,
            refresh_conn_state: Default::default(),
        }
    }

    fn create_container_with_strategy(
        strategy: ReadFromReplicaStrategy,
        use_management_connections: bool,
    ) -> ConnectionsContainer<usize> {
        let slot_map = SlotMap::new(
            vec![
                Slot::new(1, 1000, "primary1".to_owned(), Vec::new()),
                Slot::new(
                    1002,
                    2000,
                    "primary2".to_owned(),
                    vec!["replica2-1".to_owned()],
                ),
                Slot::new(
                    2001,
                    3000,
                    "primary3".to_owned(),
                    vec!["replica3-1".to_owned(), "replica3-2".to_owned()],
                ),
            ],
            ReadFromReplicaStrategy::AlwaysFromPrimary, // this argument shouldn't matter, since we overload the RFR strategy.
        );
        let connection_map = DashMap::new();
        connection_map.insert(
            "primary1".into(),
            create_cluster_node(1, use_management_connections, None),
        );
        connection_map.insert(
            "primary2".into(),
            create_cluster_node(2, use_management_connections, None),
        );
        connection_map.insert(
            "primary3".into(),
            create_cluster_node(3, use_management_connections, None),
        );
        connection_map.insert(
            "replica2-1".into(),
            create_cluster_node(21, use_management_connections, None),
        );
        connection_map.insert(
            "replica3-1".into(),
            create_cluster_node(31, use_management_connections, None),
        );
        connection_map.insert(
            "replica3-2".into(),
            create_cluster_node(32, use_management_connections, None),
        );

        ConnectionsContainer {
            slot_map,
            connection_map,
            read_from_replica_strategy: strategy,
            topology_hash: 0,
            refresh_conn_state: Default::default(),
        }
    }

    fn create_container() -> ConnectionsContainer<usize> {
        create_container_with_strategy(ReadFromReplicaStrategy::RoundRobin, false)
    }

    #[test]
    fn get_connection_for_primary_route() {
        let container = create_container();

        assert!(container
            .connection_for_route(&Route::new(0, SlotAddr::Master))
            .is_none());

        assert_eq!(
            1,
            container
                .connection_for_route(&Route::new(500, SlotAddr::Master))
                .unwrap()
                .1
        );

        assert_eq!(
            1,
            container
                .connection_for_route(&Route::new(1000, SlotAddr::Master))
                .unwrap()
                .1
        );

        assert!(container
            .connection_for_route(&Route::new(1001, SlotAddr::Master))
            .is_none());

        assert_eq!(
            2,
            container
                .connection_for_route(&Route::new(1002, SlotAddr::Master))
                .unwrap()
                .1
        );

        assert_eq!(
            2,
            container
                .connection_for_route(&Route::new(1500, SlotAddr::Master))
                .unwrap()
                .1
        );

        assert_eq!(
            3,
            container
                .connection_for_route(&Route::new(2001, SlotAddr::Master))
                .unwrap()
                .1
        );
    }

    #[test]
    fn get_connection_for_replica_route() {
        let container = create_container();

        assert!(container
            .connection_for_route(&Route::new(1001, SlotAddr::ReplicaOptional))
            .is_none());

        assert_eq!(
            21,
            container
                .connection_for_route(&Route::new(1002, SlotAddr::ReplicaOptional))
                .unwrap()
                .1
        );

        assert_eq!(
            21,
            container
                .connection_for_route(&Route::new(1500, SlotAddr::ReplicaOptional))
                .unwrap()
                .1
        );

        assert!(one_of(
            container.connection_for_route(&Route::new(2001, SlotAddr::ReplicaOptional)),
            &[31, 32],
        ));
    }

    #[test]
    fn get_primary_connection_for_replica_route_if_no_replicas_were_added() {
        let container = create_container();

        assert!(container
            .connection_for_route(&Route::new(0, SlotAddr::ReplicaOptional))
            .is_none());

        assert_eq!(
            1,
            container
                .connection_for_route(&Route::new(500, SlotAddr::ReplicaOptional))
                .unwrap()
                .1
        );

        assert_eq!(
            1,
            container
                .connection_for_route(&Route::new(1000, SlotAddr::ReplicaOptional))
                .unwrap()
                .1
        );
    }

    #[test]
    fn get_replica_connection_for_replica_route_if_some_but_not_all_replicas_were_removed() {
        let container = create_container();
        container.remove_node(&"replica3-2".into());

        assert_eq!(
            31,
            container
                .connection_for_route(&Route::new(2001, SlotAddr::ReplicaRequired))
                .unwrap()
                .1
        );
    }

    #[test]
    fn get_replica_connection_for_replica_route_if_replica_is_required_even_if_strategy_is_always_from_primary(
    ) {
        let container =
            create_container_with_strategy(ReadFromReplicaStrategy::AlwaysFromPrimary, false);

        assert!(one_of(
            container.connection_for_route(&Route::new(2001, SlotAddr::ReplicaRequired)),
            &[31, 32],
        ));
    }

    #[test]
    fn get_primary_connection_for_replica_route_if_all_replicas_were_removed() {
        let container = create_container();
        remove_nodes(&container, &["replica2-1", "replica3-1", "replica3-2"]);

        assert_eq!(
            2,
            container
                .connection_for_route(&Route::new(1002, SlotAddr::ReplicaOptional))
                .unwrap()
                .1
        );

        assert_eq!(
            2,
            container
                .connection_for_route(&Route::new(1500, SlotAddr::ReplicaOptional))
                .unwrap()
                .1
        );

        assert_eq!(
            3,
            container
                .connection_for_route(&Route::new(2001, SlotAddr::ReplicaOptional))
                .unwrap()
                .1
        );
    }

    #[test]
    fn get_connection_for_az_affinity_route() {
        let container = create_container_with_az_strategy(false);

        // slot number is not exits
        assert!(container
            .connection_for_route(&Route::new(1001, SlotAddr::ReplicaOptional))
            .is_none());
        // Get the replica that holds the slot 1002
        assert_eq!(
            21,
            container
                .connection_for_route(&Route::new(1002, SlotAddr::ReplicaOptional))
                .unwrap()
                .1
        );

        // Get the Primary that holds the slot 1500
        assert_eq!(
            2,
            container
                .connection_for_route(&Route::new(1500, SlotAddr::Master))
                .unwrap()
                .1
        );

        // receive one of the replicas that holds the slot 2001 and is in the availability zone of the client ("use-1a")
        assert!(one_of(
            container.connection_for_route(&Route::new(2001, SlotAddr::ReplicaRequired)),
            &[31, 33],
        ));

        // remove the replica in the same client's az and get the other replica in the same az
        remove_nodes(&container, &["replica3-3"]);
        assert_eq!(
            31,
            container
                .connection_for_route(&Route::new(2001, SlotAddr::ReplicaOptional))
                .unwrap()
                .1
        );

        // remove the replica in the same clients az and get the other replica
        remove_nodes(&container, &["replica3-1"]);
        assert_eq!(
            32,
            container
                .connection_for_route(&Route::new(2001, SlotAddr::ReplicaOptional))
                .unwrap()
                .1
        );

        // remove the last replica and get the primary
        remove_nodes(&container, &["replica3-2"]);
        assert_eq!(
            3,
            container
                .connection_for_route(&Route::new(2001, SlotAddr::ReplicaOptional))
                .unwrap()
                .1
        );
    }

    #[test]
    fn get_connection_for_az_affinity_route_round_robin() {
        let container = create_container_with_az_strategy(false);

        let mut addresses = vec![
            container
                .connection_for_route(&Route::new(2001, SlotAddr::ReplicaOptional))
                .unwrap()
                .1,
            container
                .connection_for_route(&Route::new(2001, SlotAddr::ReplicaOptional))
                .unwrap()
                .1,
            container
                .connection_for_route(&Route::new(2001, SlotAddr::ReplicaOptional))
                .unwrap()
                .1,
            container
                .connection_for_route(&Route::new(2001, SlotAddr::ReplicaOptional))
                .unwrap()
                .1,
        ];
        addresses.sort();
        assert_eq!(addresses, vec![31, 31, 33, 33]);
    }

    #[test]
    fn get_connection_by_address() {
        let container = create_container();

        assert!(container.connection_for_address("foobar").is_none());

        assert_eq!(1, container.connection_for_address("primary1").unwrap().1);
        assert_eq!(2, container.connection_for_address("primary2").unwrap().1);
        assert_eq!(3, container.connection_for_address("primary3").unwrap().1);
        assert_eq!(
            21,
            container.connection_for_address("replica2-1").unwrap().1
        );
        assert_eq!(
            31,
            container.connection_for_address("replica3-1").unwrap().1
        );
        assert_eq!(
            32,
            container.connection_for_address("replica3-2").unwrap().1
        );
    }

    #[test]
    fn get_connection_by_address_returns_none_if_connection_was_removed() {
        let container = create_container();
        container.remove_node(&"primary1".into());

        assert!(container.connection_for_address("primary1").is_none());
    }

    #[test]
    fn get_connection_by_address_returns_added_connection() {
        let container = create_container();
        let address = container.replace_or_add_connection_for_address(
            "foobar",
            ClusterNode::new_only_with_user_conn(4),
        );

        assert_eq!(
            (address, 4),
            container.connection_for_address("foobar").unwrap()
        );
    }

    #[test]
    fn get_random_connections_without_repetitions() {
        let container = create_container();

        let random_connections: HashSet<_> = container
            .random_connections(3, ConnectionType::User)
            .expect("No connections found")
            .into_iter()
            .map(|pair| pair.1)
            .collect();

        assert_eq!(random_connections.len(), 3);
        assert!(random_connections
            .iter()
            .all(|connection| [1, 2, 3, 21, 31, 32].contains(connection)));
    }

    #[test]
    fn get_random_connections_returns_none_if_all_connections_were_removed() {
        let container = create_container();
        remove_all_connections(&container);

        assert!(container
            .random_connections(1, ConnectionType::User)
            .is_none());
    }

    #[test]
    fn get_random_connections_returns_added_connection() {
        let container = create_container();
        remove_all_connections(&container);
        let address = container.replace_or_add_connection_for_address(
            "foobar",
            ClusterNode::new_only_with_user_conn(4),
        );
        let random_connections: Vec<_> = container
            .random_connections(1, ConnectionType::User)
            .expect("No connections found")
            .into_iter()
            .collect();

        assert_eq!(vec![(address, 4)], random_connections);
    }

    #[test]
    fn get_random_connections_is_bound_by_the_number_of_connections_in_the_map() {
        let container = create_container();
        let mut random_connections: Vec<_> = container
            .random_connections(1000, ConnectionType::User)
            .expect("No connections found")
            .into_iter()
            .map(|pair| pair.1)
            .collect();
        random_connections.sort();

        assert_eq!(random_connections, vec![1, 2, 3, 21, 31, 32]);
    }

    #[test]
    fn get_random_management_connections() {
        let container = create_container_with_strategy(ReadFromReplicaStrategy::RoundRobin, true);
        let mut random_connections: Vec<_> = container
            .random_connections(1000, ConnectionType::PreferManagement)
            .expect("No connections found")
            .into_iter()
            .map(|pair| pair.1)
            .collect();
        random_connections.sort();

        assert_eq!(random_connections, vec![10, 20, 30, 210, 310, 320]);
    }

    #[test]
    fn get_all_user_connections() {
        let container = create_container();
        let mut connections: Vec<_> = container
            .all_node_connections()
            .map(|conn| conn.1)
            .collect();
        connections.sort();

        assert_eq!(vec![1, 2, 3, 21, 31, 32], connections);
    }

    #[test]
    fn get_all_user_connections_returns_added_connection() {
        let container = create_container();
        container.replace_or_add_connection_for_address(
            "foobar",
            ClusterNode::new_only_with_user_conn(4),
        );

        let mut connections: Vec<_> = container
            .all_node_connections()
            .map(|conn| conn.1)
            .collect();
        connections.sort();

        assert_eq!(vec![1, 2, 3, 4, 21, 31, 32], connections);
    }

    #[test]
    fn get_all_user_connections_does_not_return_removed_connection() {
        let container = create_container();
        container.remove_node(&"primary1".into());

        let mut connections: Vec<_> = container
            .all_node_connections()
            .map(|conn| conn.1)
            .collect();
        connections.sort();

        assert_eq!(vec![2, 3, 21, 31, 32], connections);
    }

    #[test]
    fn get_all_primaries() {
        let container = create_container();

        let mut connections: Vec<_> = container
            .all_primary_connections()
            .map(|conn| conn.1)
            .collect();
        connections.sort();

        assert_eq!(vec![1, 2, 3], connections);
    }

    #[test]
    fn get_all_primaries_does_not_return_removed_connection() {
        let container = create_container();
        container.remove_node(&"primary1".into());

        let mut connections: Vec<_> = container
            .all_primary_connections()
            .map(|conn| conn.1)
            .collect();
        connections.sort();

        assert_eq!(vec![2, 3], connections);
    }

    #[test]
    fn len_is_adjusted_on_removals_and_additions() {
        let container = create_container();

        assert_eq!(container.len(), 6);

        container.remove_node(&"primary1".into());
        assert_eq!(container.len(), 5);

        container.replace_or_add_connection_for_address(
            "foobar",
            ClusterNode::new_only_with_user_conn(4),
        );
        assert_eq!(container.len(), 6);
    }

    #[test]
    fn len_is_not_adjusted_on_removals_of_nonexisting_connections_or_additions_of_existing_connections(
    ) {
        let container = create_container();

        assert_eq!(container.len(), 6);

        container.remove_node(&"foobar".into());
        assert_eq!(container.len(), 6);

        container.replace_or_add_connection_for_address(
            "primary1",
            ClusterNode::new_only_with_user_conn(4),
        );
        assert_eq!(container.len(), 6);
    }

    #[test]
    fn remove_node_returns_connection_if_it_exists() {
        let container = create_container();

        let connection = container.remove_node(&"primary1".into());
        assert_eq!(connection, Some(ClusterNode::new_only_with_user_conn(1)));

        let non_connection = container.remove_node(&"foobar".into());
        assert_eq!(non_connection, None);
    }

    #[test]
    fn test_is_empty() {
        let container = create_container();

        assert!(!container.is_empty());
        container.remove_node(&"primary1".into());
        assert!(!container.is_empty());
        container.remove_node(&"primary2".into());
        container.remove_node(&"primary3".into());
        assert!(!container.is_empty());

        container.remove_node(&"replica2-1".into());
        container.remove_node(&"replica3-1".into());
        assert!(!container.is_empty());

        container.remove_node(&"replica3-2".into());
        assert!(container.is_empty());
    }

    #[test]
    fn is_primary_returns_true_for_known_primary() {
        let container = create_container();

        assert!(container.is_primary(&"primary1".into()));
    }

    #[test]
    fn is_primary_returns_false_for_known_replica() {
        let container = create_container();

        assert!(!container.is_primary(&"replica2-1".into()));
    }

    #[test]
    fn is_primary_returns_false_for_removed_node() {
        let container = create_container();
        let address = "primary1".into();
        container.remove_node(&address);

        assert!(!container.is_primary(&address));
    }

    #[test]
    fn test_extend_connection_map() {
        let mut container = create_container();
        let mut current_addresses: Vec<_> = container
            .all_node_connections()
            .map(|conn| conn.0)
            .collect();

        let new_node = "new_primary1".to_string();
        // Check that `new_node` not exists in the current
        assert!(container.connection_for_address(&new_node).is_none());
        // Create new connection map
        let new_connection_map = DashMap::new();
        new_connection_map.insert(new_node.clone(), create_cluster_node(1, false, None));

        // Extend the current connection map
        container.extend_connection_map(ConnectionsMap(new_connection_map));

        // Check that the new addresses vector contains both the new node and all previous nodes
        let mut new_addresses: Vec<_> = container
            .all_node_connections()
            .map(|conn| conn.0)
            .collect();
        current_addresses.push(new_node);
        current_addresses.sort();
        new_addresses.sort();
        assert_eq!(current_addresses, new_addresses);
    }
}
