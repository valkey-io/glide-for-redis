use std::sync::Arc;
use std::{
    collections::{BTreeMap, HashSet},
    fmt::Display,
    sync::atomic::AtomicUsize,
};

use dashmap::DashMap;

use crate::cluster_routing::{Route, ShardAddrs, Slot, SlotAddr};
use crate::ErrorKind;
use crate::RedisError;
use crate::RedisResult;
pub(crate) type NodesMap = DashMap<Arc<String>, Arc<ShardAddrs>>;

#[derive(Debug)]
pub(crate) struct SlotMapValue {
    pub(crate) start: u16,
    pub(crate) addrs: Arc<ShardAddrs>,
    pub(crate) last_used_replica: Arc<AtomicUsize>,
}

#[derive(Debug, Default, Clone, PartialEq)]
/// Represents the client's read from strategy.
pub enum ReadFromReplicaStrategy {
    #[default]
    /// Always get from primary, in order to get the freshest data.
    AlwaysFromPrimary,
    /// Spread the read requests between all replicas in a round robin manner.
    /// If no replica is available, route the requests to the primary.
    RoundRobin,
    /// Spread the read requests between replicas in the same client's Aviliablity zone in a round robin manner,
    /// falling back to other replicas or the primary if needed.
    AZAffinity(String),
    /// Spread the read requests among nodes within the client's Availability Zone (AZ) in a round robin manner,
    /// prioritizing local replicas, then the local primary, and falling back to any replica or the primary if needed.
    AZAffinityReplicasAndPrimary(String),
}

#[derive(Debug, Default)]
pub(crate) struct SlotMap {
    pub(crate) slots: BTreeMap<u16, SlotMapValue>,
    nodes_map: NodesMap,
    read_from_replica: ReadFromReplicaStrategy,
}

fn get_address_from_slot(
    slot: &SlotMapValue,
    read_from_replica: ReadFromReplicaStrategy,
    slot_addr: SlotAddr,
) -> Arc<String> {
    let addrs = &slot.addrs;
    if slot_addr == SlotAddr::Master || addrs.replicas().is_empty() {
        return addrs.primary();
    }
    match read_from_replica {
        ReadFromReplicaStrategy::AlwaysFromPrimary => addrs.primary(),
        ReadFromReplicaStrategy::RoundRobin => {
            let index = slot
                .last_used_replica
                .fetch_add(1, std::sync::atomic::Ordering::Relaxed)
                % addrs.replicas().len();
            addrs.replicas()[index].clone()
        }
        ReadFromReplicaStrategy::AZAffinity(_az) => todo!(), // Drop sync client
        ReadFromReplicaStrategy::AZAffinityReplicasAndPrimary(_az) => todo!(), // Drop sync client
    }
}

impl SlotMap {
    pub(crate) fn new_with_read_strategy(read_from_replica: ReadFromReplicaStrategy) -> Self {
        SlotMap {
            slots: BTreeMap::new(),
            nodes_map: DashMap::new(),
            read_from_replica,
        }
    }

    pub(crate) fn new(slots: Vec<Slot>, read_from_replica: ReadFromReplicaStrategy) -> Self {
        let mut slot_map = SlotMap::new_with_read_strategy(read_from_replica);
        let mut shard_id = 0;
        for slot in slots {
            let primary = Arc::new(slot.master);
            // Get the shard addresses if the primary is already in nodes_map;
            // otherwise, create a new ShardAddrs and add it
            let shard_addrs_arc = slot_map
                .nodes_map
                .entry(primary.clone())
                .or_insert_with(|| {
                    shard_id += 1;
                    let replicas: Vec<Arc<String>> =
                        slot.replicas.into_iter().map(Arc::new).collect();
                    Arc::new(ShardAddrs::new(primary, replicas))
                })
                .clone();

            // Add all replicas to nodes_map with a reference to the same ShardAddrs if not already present
            shard_addrs_arc.replicas().iter().for_each(|replica| {
                slot_map
                    .nodes_map
                    .entry(replica.clone())
                    .or_insert(shard_addrs_arc.clone());
            });

            // Insert the slot value into the slots map
            slot_map.slots.insert(
                slot.end,
                SlotMapValue {
                    addrs: shard_addrs_arc.clone(),
                    start: slot.start,
                    last_used_replica: Arc::new(AtomicUsize::new(0)),
                },
            );
        }
        slot_map
    }

    pub(crate) fn nodes_map(&self) -> &NodesMap {
        &self.nodes_map
    }

    pub fn is_primary(&self, address: &String) -> bool {
        self.nodes_map
            .get(address)
            .map_or(false, |shard_addrs| *shard_addrs.primary() == *address)
    }

    pub fn slot_value_for_route(&self, route: &Route) -> Option<&SlotMapValue> {
        let slot = route.slot();
        self.slots
            .range(slot..)
            .next()
            .and_then(|(end, slot_value)| {
                if slot <= *end && slot_value.start <= slot {
                    Some(slot_value)
                } else {
                    None
                }
            })
    }

    pub fn slot_addr_for_route(&self, route: &Route) -> Option<Arc<String>> {
        self.slot_value_for_route(route).map(|slot_value| {
            get_address_from_slot(
                slot_value,
                self.read_from_replica.clone(),
                route.slot_addr(),
            )
        })
    }

    /// Retrieves the shard addresses (`ShardAddrs`) for the specified `slot` by looking it up in the `slots` tree,
    /// returning a reference to the stored shard addresses if found.
    pub(crate) fn shard_addrs_for_slot(&self, slot: u16) -> Option<Arc<ShardAddrs>> {
        self.slots
            .range(slot..)
            .next()
            .map(|(_, slot_value)| slot_value.addrs.clone())
    }

    pub fn addresses_for_all_primaries(&self) -> HashSet<Arc<String>> {
        self.nodes_map
            .iter()
            .map(|map_item| {
                let shard_addrs = map_item.value();
                shard_addrs.primary().clone()
            })
            .collect()
    }

    pub fn all_node_addresses(&self) -> HashSet<Arc<String>> {
        self.nodes_map
            .iter()
            .map(|map_item| {
                let node_addr = map_item.key();
                node_addr.clone()
            })
            .collect()
    }

    pub fn addresses_for_multi_slot<'a, 'b>(
        &'a self,
        routes: &'b [(Route, Vec<usize>)],
    ) -> impl Iterator<Item = Option<Arc<String>>> + 'a
    where
        'b: 'a,
    {
        routes
            .iter()
            .map(|(route, _)| self.slot_addr_for_route(route))
    }

    // Returns the slots that are assigned to the given address.
    pub(crate) fn get_slots_of_node(&self, node_address: Arc<String>) -> Vec<u16> {
        self.slots
            .iter()
            .filter_map(|(end, slot_value)| {
                let addrs = &slot_value.addrs;
                if addrs.primary() == node_address || addrs.replicas().contains(&node_address) {
                    Some(slot_value.start..(*end + 1))
                } else {
                    None
                }
            })
            .flatten()
            .collect()
    }

    pub(crate) fn node_address_for_slot(
        &self,
        slot: u16,
        slot_addr: SlotAddr,
    ) -> Option<Arc<String>> {
        self.slots.range(slot..).next().and_then(|(_, slot_value)| {
            if slot_value.start <= slot {
                Some(get_address_from_slot(
                    slot_value,
                    self.read_from_replica.clone(),
                    slot_addr,
                ))
            } else {
                None
            }
        })
    }

    /// Inserts a single slot into the `slots` map, associating it with a new `SlotMapValue`
    /// that contains the shard addresses (`shard_addrs`) and represents a range of just the given slot.
    ///
    /// # Returns
    /// * `Option<SlotMapValue>` - Returns the previous `SlotMapValue` if a slot already existed for the given key,
    ///   or `None` if the slot was newly inserted.
    fn insert_single_slot(
        &mut self,
        slot: u16,
        shard_addrs: Arc<ShardAddrs>,
    ) -> Option<SlotMapValue> {
        self.slots.insert(
            slot,
            SlotMapValue {
                start: slot,
                addrs: shard_addrs,
                last_used_replica: Arc::new(AtomicUsize::new(0)),
            },
        )
    }

    /// Creats a new shard addresses that contain only the primary node, adds it to the nodes map
    /// and updates the slots tree for the given `slot` to point to the new primary.
    pub(crate) fn add_new_primary(&mut self, slot: u16, node_addr: Arc<String>) -> RedisResult<()> {
        let shard_addrs = Arc::new(ShardAddrs::new_with_primary(node_addr.clone()));
        self.nodes_map.insert(node_addr, shard_addrs.clone());
        self.update_slot_range(slot, shard_addrs)
    }

    fn shard_addrs_equal(shard1: &Arc<ShardAddrs>, shard2: &Arc<ShardAddrs>) -> bool {
        Arc::ptr_eq(shard1, shard2)
    }

    /// Updates the end of an existing slot range in the `slots` tree. This function removes the slot entry
    /// associated with the current end (`curr_end`) and reinserts it with a new end value (`new_end`).
    ///
    /// The operation effectively shifts the range's end boundary from `curr_end` to `new_end`, while keeping the
    /// rest of the slot's data (e.g., shard addresses) unchanged.
    ///
    /// # Parameters:
    /// - `curr_end`: The current end of the slot range that will be removed.
    /// - `new_end`: The new end of the slot range where the slot data will be reinserted.
    fn update_end_range(&mut self, curr_end: u16, new_end: u16) -> RedisResult<()> {
        if let Some(curr_slot_val) = self.slots.remove(&curr_end) {
            self.slots.insert(new_end, curr_slot_val);
            return Ok(());
        }
        Err(RedisError::from((
            ErrorKind::ClientError,
            "Couldn't find slot range with end: {curr_end:?} in the slot map",
        )))
    }

    /// Attempts to merge the current `slot` with the next slot range in the `slots` map, if they are consecutive
    /// and share the same shard addresses. If the next slot's starting position is exactly `slot + 1`
    /// and the shard addresses match, the next slot's starting point is moved to `slot`, effectively merging
    /// the slot to the existing range.
    ///
    /// # Parameters:
    /// - `slot`: The slot to attempt to merge with the next slot.
    /// - `new_addrs`: The shard addresses to compare with the next slot's shard addresses.
    ///
    /// # Returns:
    /// - `bool`: Returns `true` if the merge was successful, otherwise `false`.
    fn try_merge_to_next_range(&mut self, slot: u16, new_addrs: Arc<ShardAddrs>) -> bool {
        if let Some((_next_end, next_slot_value)) = self.slots.range_mut((slot + 1)..).next() {
            if next_slot_value.start == slot + 1
                && Self::shard_addrs_equal(&next_slot_value.addrs, &new_addrs)
            {
                next_slot_value.start = slot;
                return true;
            }
        }
        false
    }

    /// Attempts to merge the current slot with the previous slot range in the `slots` map, if they are consecutive
    /// and share the same shard addresses. If the previous slot ends at `slot - 1` and the shard addresses match,
    /// the end of the previous slot is extended to `slot`, effectively merging the slot to the existing range.
    ///
    /// # Parameters:
    /// - `slot`: The slot to attempt to merge with the previous slot.
    /// - `new_addrs`: The shard addresses to compare with the previous slot's shard addresses.
    ///
    /// # Returns:
    /// - `RedisResult<bool>`: Returns `Ok(true)` if the merge was successful, otherwise `Ok(false)`.
    fn try_merge_to_prev_range(
        &mut self,
        slot: u16,
        new_addrs: Arc<ShardAddrs>,
    ) -> RedisResult<bool> {
        if let Some((prev_end, prev_slot_value)) = self.slots.range_mut(..slot).next_back() {
            if *prev_end == slot - 1 && Self::shard_addrs_equal(&prev_slot_value.addrs, &new_addrs)
            {
                let prev_end = *prev_end;
                self.update_end_range(prev_end, slot)?;
                return Ok(true);
            }
        }
        Ok(false)
    }

    /// Updates the slot range in the `slots` to point to new shard addresses.
    ///
    /// This function handles the following scenarios when updating the slot mapping:
    ///
    /// **Scenario 1 - Same Shard Owner**:
    ///    - If the slot is already associated with the same shard addresses, no changes are needed.
    ///
    /// **Scenario 2 - Single Slot Range**:
    ///    - If the slot is the only slot in the current range (i.e., `start == end == slot`),
    ///      the function simply replaces the shard addresses for this slot with the new shard addresses.
    ///
    /// **Scenario 3 - Slot Matches the End of a Range**:
    ///    - If the slot is the last slot in the current range (`slot == end`), the function
    ///      adjusts the range by decrementing the end of the current range by 1 (making the
    ///      new end equal to `end - 1`). The current slot is then removed and a new entry is
    ///      inserted for the slot with the new shard addresses.
    ///
    /// **Scenario 4 - Slot Matches the Start of a Range**:
    ///    - If the slot is the first slot in the current range (`slot == start`), the function
    ///      increments the start of the current range by 1 (making the new start equal to
    ///      `start + 1`). A new entry is then inserted for the slot with the new shard addresses.
    ///
    /// **Scenario 5 - Slot is Within a Range**:
    ///    - If the slot falls between the start and end of a current range (`start < slot < end`),
    ///      the function splits the current range into two. The range before the slot (`start` to
    ///      `slot - 1`) remains with the old shard addresses, a new entry for the slot is added
    ///      with the new shard addresses, and the range after the slot (`slot + 1` to `end`) is
    ///      reinserted with the old shard addresses.
    ///
    /// **Scenario 6 - Slot is Not Covered**:
    ///    - If the slot is not part of any existing range, a new entry is simply inserted into
    ///      the `slots` tree with the new shard addresses.
    ///
    /// # Parameters:
    /// - `slot`: The specific slot that needs to be updated.
    /// - `new_addrs`: The new shard addresses to associate with the slot.
    ///
    /// # Returns:
    /// - `RedisResult<()>`: Indicates the success or failure of the operation.
    pub(crate) fn update_slot_range(
        &mut self,
        slot: u16,
        new_addrs: Arc<ShardAddrs>,
    ) -> RedisResult<()> {
        let curr_tree_node =
            self.slots
                .range_mut(slot..)
                .next()
                .and_then(|(&end, slot_map_value)| {
                    if slot >= slot_map_value.start && slot <= end {
                        Some((end, slot_map_value))
                    } else {
                        None
                    }
                });

        if let Some((curr_end, curr_slot_val)) = curr_tree_node {
            // Scenario 1: Same shard owner
            if Self::shard_addrs_equal(&curr_slot_val.addrs, &new_addrs) {
                return Ok(());
            }
            // Scenario 2: The slot is the only slot in the current range
            else if curr_slot_val.start == curr_end && curr_slot_val.start == slot {
                // Replace the shard addresses of the current slot value
                curr_slot_val.addrs = new_addrs;
            // Scenario 3: Slot matches the end of the current range
            } else if slot == curr_end {
                // Merge with the next range if shard addresses match
                if self.try_merge_to_next_range(slot, new_addrs.clone()) {
                    // Adjust current range end
                    self.update_end_range(curr_end, curr_end - 1)?;
                } else {
                    // Insert as a standalone slot
                    let curr_slot_val = self.insert_single_slot(curr_end, new_addrs);
                    if let Some(curr_slot_val) = curr_slot_val {
                        // Adjust current range end
                        self.slots.insert(curr_end - 1, curr_slot_val);
                    }
                }

            // Scenario 4: Slot matches the start of the current range
            } else if slot == curr_slot_val.start {
                // Adjust current range start
                curr_slot_val.start += 1;
                // Attempt to merge with the previous range
                if !self.try_merge_to_prev_range(slot, new_addrs.clone())? {
                    // Insert as a standalone slot
                    self.insert_single_slot(slot, new_addrs);
                }

            // Scenario 5: Slot is within the current range
            } else if slot > curr_slot_val.start && slot < curr_end {
                // We will split the current range into three parts:
                // A: [start, slot - 1], which will remain owned by the current shard,
                // B: [slot, slot], which will be owned by the new shard addresses,
                // C: [slot + 1, end], which will remain owned by the current shard.

                let start: u16 = curr_slot_val.start;
                let addrs = curr_slot_val.addrs.clone();
                let last_used_replica = curr_slot_val.last_used_replica.clone();

                // Modify the current slot range to become part C: [slot + 1, end], still owned by the current shard.
                curr_slot_val.start = slot + 1;

                // Create and insert a new SlotMapValue representing part A: [start, slot - 1],
                // still owned by the current shard, into the slot map.
                self.slots.insert(
                    slot - 1,
                    SlotMapValue {
                        start,
                        addrs,
                        last_used_replica,
                    },
                );

                // Insert the new shard addresses into the slot map as part B: [slot, slot],
                // which will be owned by the new shard addresses.
                self.insert_single_slot(slot, new_addrs);
            }
        // Scenario 6: Slot isn't covered by any existing range
        } else {
            // Try merging with the previous or next range; if no merge is possible, insert as a standalone slot
            if !self.try_merge_to_prev_range(slot, new_addrs.clone())?
                && !self.try_merge_to_next_range(slot, new_addrs.clone())
            {
                self.insert_single_slot(slot, new_addrs);
            }
        }
        Ok(())
    }
}

impl Display for SlotMap {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        writeln!(f, "Strategy: {:?}. Slot mapping:", self.read_from_replica)?;
        for (end, slot_map_value) in self.slots.iter() {
            let addrs = &slot_map_value.addrs;
            writeln!(
                f,
                "({}-{}): primary: {}, replicas: {:?}",
                slot_map_value.start,
                end,
                addrs.primary(),
                addrs.replicas()
            )?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests_cluster_slotmap {
    use super::*;

    fn process_expected(expected: Vec<&str>) -> HashSet<Arc<String>> {
        <HashSet<&str> as IntoIterator>::into_iter(HashSet::from_iter(expected))
            .map(|s| Arc::new(s.to_string()))
            .collect()
    }

    fn process_expected_with_option(expected: Vec<Option<&str>>) -> Vec<Arc<String>> {
        expected
            .into_iter()
            .filter_map(|opt| opt.map(|s| Arc::new(s.to_string())))
            .collect()
    }

    #[test]
    fn test_slot_map_retrieve_routes() {
        let slot_map = SlotMap::new(
            vec![
                Slot::new(
                    1,
                    1000,
                    "node1:6379".to_owned(),
                    vec!["replica1:6379".to_owned()],
                ),
                Slot::new(
                    1002,
                    2000,
                    "node2:6379".to_owned(),
                    vec!["replica2:6379".to_owned()],
                ),
            ],
            ReadFromReplicaStrategy::AlwaysFromPrimary,
        );

        assert!(slot_map
            .slot_addr_for_route(&Route::new(0, SlotAddr::Master))
            .is_none());
        assert_eq!(
            "node1:6379",
            *slot_map
                .slot_addr_for_route(&Route::new(1, SlotAddr::Master))
                .unwrap()
        );
        assert_eq!(
            "node1:6379",
            *slot_map
                .slot_addr_for_route(&Route::new(500, SlotAddr::Master))
                .unwrap()
        );
        assert_eq!(
            "node1:6379",
            *slot_map
                .slot_addr_for_route(&Route::new(1000, SlotAddr::Master))
                .unwrap()
        );
        assert!(slot_map
            .slot_addr_for_route(&Route::new(1001, SlotAddr::Master))
            .is_none());

        assert_eq!(
            "node2:6379",
            *slot_map
                .slot_addr_for_route(&Route::new(1002, SlotAddr::Master))
                .unwrap()
        );
        assert_eq!(
            "node2:6379",
            *slot_map
                .slot_addr_for_route(&Route::new(1500, SlotAddr::Master))
                .unwrap()
        );
        assert_eq!(
            "node2:6379",
            *slot_map
                .slot_addr_for_route(&Route::new(2000, SlotAddr::Master))
                .unwrap()
        );
        assert!(slot_map
            .slot_addr_for_route(&Route::new(2001, SlotAddr::Master))
            .is_none());
    }

    fn get_slot_map(read_from_replica: ReadFromReplicaStrategy) -> SlotMap {
        SlotMap::new(
            vec![
                Slot::new(
                    1,
                    1000,
                    "node1:6379".to_owned(),
                    vec!["replica1:6379".to_owned()],
                ),
                Slot::new(
                    1002,
                    2000,
                    "node2:6379".to_owned(),
                    vec!["replica2:6379".to_owned(), "replica3:6379".to_owned()],
                ),
                Slot::new(
                    2001,
                    3000,
                    "node3:6379".to_owned(),
                    vec![
                        "replica4:6379".to_owned(),
                        "replica5:6379".to_owned(),
                        "replica6:6379".to_owned(),
                    ],
                ),
                Slot::new(
                    3001,
                    4000,
                    "node2:6379".to_owned(),
                    vec!["replica2:6379".to_owned(), "replica3:6379".to_owned()],
                ),
            ],
            read_from_replica,
        )
    }

    #[test]
    fn test_slot_map_get_all_primaries() {
        let slot_map = get_slot_map(ReadFromReplicaStrategy::AlwaysFromPrimary);
        let addresses = slot_map.addresses_for_all_primaries();
        assert_eq!(
            addresses,
            process_expected(vec!["node1:6379", "node2:6379", "node3:6379"])
        );
    }

    #[test]
    fn test_slot_map_get_all_nodes() {
        let slot_map = get_slot_map(ReadFromReplicaStrategy::AlwaysFromPrimary);
        let addresses = slot_map.all_node_addresses();
        assert_eq!(
            addresses,
            process_expected(vec![
                "node1:6379",
                "node2:6379",
                "node3:6379",
                "replica1:6379",
                "replica2:6379",
                "replica3:6379",
                "replica4:6379",
                "replica5:6379",
                "replica6:6379"
            ])
        );
    }

    #[test]
    fn test_slot_map_get_multi_node() {
        let slot_map = get_slot_map(ReadFromReplicaStrategy::RoundRobin);
        let routes = vec![
            (Route::new(1, SlotAddr::Master), vec![]),
            (Route::new(2001, SlotAddr::ReplicaOptional), vec![]),
        ];
        let addresses = slot_map
            .addresses_for_multi_slot(&routes)
            .collect::<Vec<_>>();
        assert!(addresses.contains(&Some(Arc::new("node1:6379".to_string()))));
        assert!(
            addresses.contains(&Some(Arc::new("replica4:6379".to_string())))
                || addresses.contains(&Some(Arc::new("replica5:6379".to_string())))
                || addresses.contains(&Some(Arc::new("replica6:6379".to_string())))
        );
    }

    /// This test is needed in order to verify that if the MultiSlot route finds the same node for more than a single route,
    /// that node's address will appear multiple times, in the same order.
    #[test]
    fn test_slot_map_get_repeating_addresses_when_the_same_node_is_found_in_multi_slot() {
        let slot_map = get_slot_map(ReadFromReplicaStrategy::RoundRobin);
        let routes = vec![
            (Route::new(1, SlotAddr::ReplicaOptional), vec![]),
            (Route::new(2001, SlotAddr::Master), vec![]),
            (Route::new(2, SlotAddr::ReplicaOptional), vec![]),
            (Route::new(2002, SlotAddr::Master), vec![]),
            (Route::new(3, SlotAddr::ReplicaOptional), vec![]),
            (Route::new(2003, SlotAddr::Master), vec![]),
        ];
        let addresses: Vec<Arc<String>> = slot_map
            .addresses_for_multi_slot(&routes)
            .flatten()
            .collect();

        assert_eq!(
            addresses,
            process_expected_with_option(vec![
                Some("replica1:6379"),
                Some("node3:6379"),
                Some("replica1:6379"),
                Some("node3:6379"),
                Some("replica1:6379"),
                Some("node3:6379")
            ])
        );
    }

    #[test]
    fn test_slot_map_get_none_when_slot_is_missing_from_multi_slot() {
        let slot_map = get_slot_map(ReadFromReplicaStrategy::RoundRobin);
        let routes = vec![
            (Route::new(1, SlotAddr::ReplicaOptional), vec![]),
            (Route::new(5000, SlotAddr::Master), vec![]),
            (Route::new(6000, SlotAddr::ReplicaOptional), vec![]),
            (Route::new(2002, SlotAddr::Master), vec![]),
        ];
        let addresses: Vec<Arc<String>> = slot_map
            .addresses_for_multi_slot(&routes)
            .flatten()
            .collect();

        assert_eq!(
            addresses,
            process_expected_with_option(vec![
                Some("replica1:6379"),
                None,
                None,
                Some("node3:6379")
            ])
        );
    }

    #[test]
    fn test_slot_map_rotate_read_replicas() {
        let slot_map = get_slot_map(ReadFromReplicaStrategy::RoundRobin);
        let route = Route::new(2001, SlotAddr::ReplicaOptional);
        let mut addresses = vec![
            slot_map.slot_addr_for_route(&route).unwrap(),
            slot_map.slot_addr_for_route(&route).unwrap(),
            slot_map.slot_addr_for_route(&route).unwrap(),
        ];
        addresses.sort();
        assert_eq!(
            addresses,
            vec!["replica4:6379", "replica5:6379", "replica6:6379"]
                .into_iter()
                .map(|s| Arc::new(s.to_string()))
                .collect::<Vec<_>>()
        );
    }

    #[test]
    fn test_get_slots_of_node() {
        let slot_map = get_slot_map(ReadFromReplicaStrategy::AlwaysFromPrimary);
        assert_eq!(
            slot_map.get_slots_of_node(Arc::new("node1:6379".to_string())),
            (1..1001).collect::<Vec<u16>>()
        );
        assert_eq!(
            slot_map.get_slots_of_node(Arc::new("node2:6379".to_string())),
            vec![1002..2001, 3001..4001]
                .into_iter()
                .flatten()
                .collect::<Vec<u16>>()
        );
        assert_eq!(
            slot_map.get_slots_of_node(Arc::new("replica3:6379".to_string())),
            vec![1002..2001, 3001..4001]
                .into_iter()
                .flatten()
                .collect::<Vec<u16>>()
        );
        assert_eq!(
            slot_map.get_slots_of_node(Arc::new("replica4:6379".to_string())),
            (2001..3001).collect::<Vec<u16>>()
        );
        assert_eq!(
            slot_map.get_slots_of_node(Arc::new("replica5:6379".to_string())),
            (2001..3001).collect::<Vec<u16>>()
        );
        assert_eq!(
            slot_map.get_slots_of_node(Arc::new("replica6:6379".to_string())),
            (2001..3001).collect::<Vec<u16>>()
        );
    }

    fn create_slot(start: u16, end: u16, master: &str, replicas: Vec<&str>) -> Slot {
        Slot::new(
            start,
            end,
            master.to_owned(),
            replicas.into_iter().map(|r| r.to_owned()).collect(),
        )
    }

    fn assert_equal_slot_maps(this: SlotMap, expected: Vec<Slot>) {
        for ((end, slot_value), expected_slot) in this.slots.iter().zip(expected.iter()) {
            assert_eq!(*end, expected_slot.end);
            assert_eq!(slot_value.start, expected_slot.start);
            let shard_addrs = &slot_value.addrs;
            assert_eq!(*shard_addrs.primary(), expected_slot.master);
            let _ = shard_addrs
                .replicas()
                .iter()
                .zip(expected_slot.replicas.iter())
                .map(|(curr, expected)| {
                    assert_eq!(**curr, *expected);
                });
        }
    }

    fn assert_slot_map_and_shard_addrs(
        slot_map: SlotMap,
        slot: u16,
        new_shard_addrs: Arc<ShardAddrs>,
        expected_slots: Vec<Slot>,
    ) {
        assert!(SlotMap::shard_addrs_equal(
            &slot_map.shard_addrs_for_slot(slot).unwrap(),
            &new_shard_addrs
        ));
        assert_equal_slot_maps(slot_map, expected_slots);
    }

    #[test]
    fn test_update_slot_range_single_slot_range() {
        let test_slot = 8000;
        let before_slots = vec![
            create_slot(0, 7999, "node1:6379", vec!["replica1:6379"]),
            create_slot(8000, 8000, "node1:6379", vec!["replica1:6379"]),
            create_slot(8001, 16383, "node3:6379", vec!["replica3:6379"]),
        ];

        let mut slot_map = SlotMap::new(before_slots, ReadFromReplicaStrategy::AlwaysFromPrimary);
        let new_shard_addrs = slot_map
            .shard_addrs_for_slot(8001)
            .expect("Couldn't find shard address for slot");

        let res = slot_map.update_slot_range(test_slot, new_shard_addrs.clone());
        assert!(res.is_ok(), "{res:?}");

        let after_slots = vec![
            create_slot(0, test_slot - 1, "node1:6379", vec!["replica1:6379"]),
            create_slot(test_slot, test_slot, "node3:6379", vec!["replica3:6379"]),
            create_slot(test_slot + 1, 16383, "node3:6379", vec!["replica3:6379"]),
        ];

        assert_slot_map_and_shard_addrs(slot_map, test_slot, new_shard_addrs, after_slots);
    }

    #[test]
    fn test_update_slot_range_slot_matches_end_range_merge_ranges() {
        let test_slot = 7999;
        let before_slots = vec![
            create_slot(0, 7999, "node1:6379", vec!["replica1:6379"]),
            create_slot(8000, 16383, "node2:6379", vec!["replica2:6379"]),
        ];

        let mut slot_map = SlotMap::new(before_slots, ReadFromReplicaStrategy::AlwaysFromPrimary);
        let new_shard_addrs = slot_map
            .shard_addrs_for_slot(8000)
            .expect("Couldn't find shard address for slot");

        let res = slot_map.update_slot_range(test_slot, new_shard_addrs.clone());
        assert!(res.is_ok(), "{res:?}");

        let after_slots = vec![
            create_slot(0, test_slot - 1, "node1:6379", vec!["replica1:6379"]),
            create_slot(test_slot, 16383, "node2:6379", vec!["replica2:6379"]),
        ];

        assert_slot_map_and_shard_addrs(slot_map, test_slot, new_shard_addrs, after_slots);
    }

    #[test]
    fn test_update_slot_range_slot_matches_end_range_cant_merge_ranges() {
        let test_slot = 7999;
        let before_slots = vec![
            create_slot(0, 7999, "node1:6379", vec!["replica1:6379"]),
            create_slot(8000, 16383, "node2:6379", vec!["replica2:6379"]),
        ];

        let mut slot_map = SlotMap::new(before_slots, ReadFromReplicaStrategy::AlwaysFromPrimary);
        let new_shard_addrs = Arc::new(ShardAddrs::new(
            Arc::new("node3:6379".to_owned()),
            vec![Arc::new("replica3:6379".to_owned())],
        ));

        let res = slot_map.update_slot_range(test_slot, new_shard_addrs.clone());
        assert!(res.is_ok(), "{res:?}");

        let after_slots = vec![
            create_slot(0, test_slot - 1, "node1:6379", vec!["replica1:6379"]),
            create_slot(test_slot, test_slot, "node3:6379", vec!["replica3:6379"]),
            create_slot(test_slot + 1, 16383, "node2:6379", vec!["replica2:6379"]),
        ];

        assert_slot_map_and_shard_addrs(slot_map, test_slot, new_shard_addrs, after_slots);
    }

    #[test]
    fn test_update_slot_range_slot_matches_start_range_merge_ranges() {
        let test_slot = 8000;
        let before_slots = vec![
            create_slot(0, 7999, "node1:6379", vec!["replica1:6379"]),
            create_slot(8000, 16383, "node2:6379", vec!["replica2:6379"]),
        ];

        let mut slot_map = SlotMap::new(before_slots, ReadFromReplicaStrategy::AlwaysFromPrimary);
        let new_shard_addrs = slot_map
            .shard_addrs_for_slot(7999)
            .expect("Couldn't find shard address for slot");

        let res = slot_map.update_slot_range(test_slot, new_shard_addrs.clone());
        assert!(res.is_ok(), "{res:?}");

        let after_slots = vec![
            create_slot(0, test_slot, "node1:6379", vec!["replica1:6379"]),
            create_slot(test_slot + 1, 16383, "node2:6379", vec!["replica2:6379"]),
        ];

        assert_slot_map_and_shard_addrs(slot_map, test_slot, new_shard_addrs, after_slots);
    }

    #[test]
    fn test_update_slot_range_slot_matches_start_range_cant_merge_ranges() {
        let test_slot = 8000;
        let before_slots = vec![
            create_slot(0, 7999, "node1:6379", vec!["replica1:6379"]),
            create_slot(8000, 16383, "node2:6379", vec!["replica2:6379"]),
        ];

        let mut slot_map = SlotMap::new(before_slots, ReadFromReplicaStrategy::AlwaysFromPrimary);
        let new_shard_addrs = Arc::new(ShardAddrs::new(
            Arc::new("node3:6379".to_owned()),
            vec![Arc::new("replica3:6379".to_owned())],
        ));

        let res = slot_map.update_slot_range(test_slot, new_shard_addrs.clone());
        assert!(res.is_ok(), "{res:?}");

        let after_slots = vec![
            create_slot(0, test_slot - 1, "node1:6379", vec!["replica1:6379"]),
            create_slot(test_slot, test_slot, "node3:6379", vec!["replica3:6379"]),
            create_slot(test_slot + 1, 16383, "node2:6379", vec!["replica2:6379"]),
        ];

        assert_slot_map_and_shard_addrs(slot_map, test_slot, new_shard_addrs, after_slots);
    }

    #[test]
    fn test_update_slot_range_slot_is_within_a_range() {
        let test_slot = 4000;
        let before_slots = vec![
            create_slot(0, 7999, "node1:6379", vec!["replica1:6379"]),
            create_slot(8000, 16383, "node2:6379", vec!["replica2:6379"]),
        ];

        let mut slot_map = SlotMap::new(before_slots, ReadFromReplicaStrategy::AlwaysFromPrimary);
        let new_shard_addrs = slot_map
            .shard_addrs_for_slot(8000)
            .expect("Couldn't find shard address for slot");

        let res = slot_map.update_slot_range(test_slot, new_shard_addrs.clone());
        assert!(res.is_ok(), "{res:?}");

        let after_slots = vec![
            create_slot(0, test_slot - 1, "node1:6379", vec!["replica1:6379"]),
            create_slot(test_slot, test_slot, "node2:6379", vec!["replica2:6379"]),
            create_slot(test_slot + 1, 7999, "node1:6379", vec!["replica1:6379"]),
            create_slot(8000, 16383, "node2:6379", vec!["replica2:6379"]),
        ];
        assert_slot_map_and_shard_addrs(slot_map, test_slot, new_shard_addrs, after_slots);
    }

    #[test]
    fn test_update_slot_range_slot_is_not_covered_cant_merge_ranges() {
        let test_slot = 7998;
        let before_slots = vec![
            create_slot(0, 7000, "node1:6379", vec!["replica1:6379"]),
            create_slot(8000, 16383, "node2:6379", vec!["replica2:6379"]),
        ];

        let mut slot_map = SlotMap::new(before_slots, ReadFromReplicaStrategy::AlwaysFromPrimary);
        let new_shard_addrs = slot_map
            .shard_addrs_for_slot(8000)
            .expect("Couldn't find shard address for slot");

        let res = slot_map.update_slot_range(test_slot, new_shard_addrs.clone());
        assert!(res.is_ok(), "{res:?}");

        let after_slots = vec![
            create_slot(0, 7000, "node1:6379", vec!["replica1:6379"]),
            create_slot(test_slot, test_slot, "node2:6379", vec!["replica2:6379"]),
            create_slot(8000, 16383, "node2:6379", vec!["replica2:6379"]),
        ];
        assert_slot_map_and_shard_addrs(slot_map, test_slot, new_shard_addrs, after_slots);
    }

    #[test]
    fn test_update_slot_range_slot_is_not_covered_merge_with_next() {
        let test_slot = 7999;
        let before_slots = vec![
            create_slot(0, 7000, "node1:6379", vec!["replica1:6379"]),
            create_slot(8000, 16383, "node2:6379", vec!["replica2:6379"]),
        ];

        let mut slot_map = SlotMap::new(before_slots, ReadFromReplicaStrategy::AlwaysFromPrimary);
        let new_shard_addrs = slot_map
            .shard_addrs_for_slot(8000)
            .expect("Couldn't find shard address for slot");

        let res = slot_map.update_slot_range(test_slot, new_shard_addrs.clone());
        assert!(res.is_ok(), "{res:?}");

        let after_slots = vec![
            create_slot(0, 7000, "node1:6379", vec!["replica1:6379"]),
            create_slot(test_slot, 16383, "node2:6379", vec!["replica2:6379"]),
        ];
        assert_slot_map_and_shard_addrs(slot_map, test_slot, new_shard_addrs, after_slots);
    }

    #[test]
    fn test_update_slot_range_slot_is_not_covered_merge_with_prev() {
        let test_slot = 7001;
        let before_slots = vec![
            create_slot(0, 7000, "node1:6379", vec!["replica1:6379"]),
            create_slot(8000, 16383, "node2:6379", vec!["replica2:6379"]),
        ];

        let mut slot_map = SlotMap::new(before_slots, ReadFromReplicaStrategy::AlwaysFromPrimary);
        let new_shard_addrs = slot_map
            .shard_addrs_for_slot(7000)
            .expect("Couldn't find shard address for slot");

        let res = slot_map.update_slot_range(test_slot, new_shard_addrs.clone());
        assert!(res.is_ok(), "{res:?}");

        let after_slots = vec![
            create_slot(0, test_slot, "node1:6379", vec!["replica1:6379"]),
            create_slot(8000, 16383, "node2:6379", vec!["replica2:6379"]),
        ];
        assert_slot_map_and_shard_addrs(slot_map, test_slot, new_shard_addrs, after_slots);
    }

    #[test]
    fn test_update_slot_range_same_shard_owner_no_change_needed() {
        let test_slot = 7000;
        let before_slots = vec![
            create_slot(0, 7999, "node1:6379", vec!["replica1:6379"]),
            create_slot(8000, 16383, "node2:6379", vec!["replica2:6379"]),
        ];

        let mut slot_map = SlotMap::new(
            before_slots.clone(),
            ReadFromReplicaStrategy::AlwaysFromPrimary,
        );
        let new_shard_addrs = slot_map
            .shard_addrs_for_slot(7000)
            .expect("Couldn't find shard address for slot");

        let res = slot_map.update_slot_range(test_slot, new_shard_addrs.clone());
        assert!(res.is_ok(), "{res:?}");

        let after_slots = before_slots;
        assert_slot_map_and_shard_addrs(slot_map, test_slot, new_shard_addrs, after_slots);
    }

    #[test]
    fn test_update_slot_range_max_slot_matches_end_range() {
        let max_slot = 16383;
        let before_slots = vec![
            create_slot(0, 7999, "node1:6379", vec!["replica1:6379"]),
            create_slot(8000, 16383, "node2:6379", vec!["replica2:6379"]),
        ];

        let mut slot_map = SlotMap::new(
            before_slots.clone(),
            ReadFromReplicaStrategy::AlwaysFromPrimary,
        );
        let new_shard_addrs = slot_map
            .shard_addrs_for_slot(7000)
            .expect("Couldn't find shard address for slot");

        let res = slot_map.update_slot_range(max_slot, new_shard_addrs.clone());
        assert!(res.is_ok(), "{res:?}");

        let after_slots = vec![
            create_slot(0, 7999, "node1:6379", vec!["replica1:6379"]),
            create_slot(8000, max_slot - 1, "node2:6379", vec!["replica2:6379"]),
            create_slot(max_slot, max_slot, "node1:6379", vec!["replica1:6379"]),
        ];
        assert_slot_map_and_shard_addrs(slot_map, max_slot, new_shard_addrs, after_slots);
    }

    #[test]
    fn test_update_slot_range_max_slot_single_slot_range() {
        let max_slot = 16383;
        let before_slots = vec![
            create_slot(0, 16382, "node1:6379", vec!["replica1:6379"]),
            create_slot(16383, 16383, "node2:6379", vec!["replica2:6379"]),
        ];

        let mut slot_map = SlotMap::new(
            before_slots.clone(),
            ReadFromReplicaStrategy::AlwaysFromPrimary,
        );
        let new_shard_addrs = slot_map
            .shard_addrs_for_slot(0)
            .expect("Couldn't find shard address for slot");

        let res = slot_map.update_slot_range(max_slot, new_shard_addrs.clone());
        assert!(res.is_ok(), "{res:?}");

        let after_slots = vec![
            create_slot(0, max_slot - 1, "node1:6379", vec!["replica1:6379"]),
            create_slot(max_slot, max_slot, "node1:6379", vec!["replica1:6379"]),
        ];
        assert_slot_map_and_shard_addrs(slot_map, max_slot, new_shard_addrs, after_slots);
    }

    #[test]
    fn test_update_slot_range_min_slot_matches_start_range() {
        let min_slot = 0;
        let before_slots = vec![
            create_slot(0, 7999, "node1:6379", vec!["replica1:6379"]),
            create_slot(8000, 16383, "node2:6379", vec!["replica2:6379"]),
        ];

        let mut slot_map = SlotMap::new(
            before_slots.clone(),
            ReadFromReplicaStrategy::AlwaysFromPrimary,
        );
        let new_shard_addrs = slot_map
            .shard_addrs_for_slot(8000)
            .expect("Couldn't find shard address for slot");

        let res = slot_map.update_slot_range(min_slot, new_shard_addrs.clone());
        assert!(res.is_ok(), "{res:?}");

        let after_slots = vec![
            create_slot(min_slot, min_slot, "node2:6379", vec!["replica2:6379"]),
            create_slot(min_slot + 1, 7999, "node1:6379", vec!["replica1:6379"]),
            create_slot(8000, 16383, "node2:6379", vec!["replica2:6379"]),
        ];
        assert_slot_map_and_shard_addrs(slot_map, min_slot, new_shard_addrs, after_slots);
    }

    #[test]
    fn test_update_slot_range_min_slot_single_slot_range() {
        let min_slot = 0;
        let before_slots = vec![
            create_slot(0, 0, "node1:6379", vec!["replica1:6379"]),
            create_slot(1, 16383, "node2:6379", vec!["replica2:6379"]),
        ];

        let mut slot_map = SlotMap::new(
            before_slots.clone(),
            ReadFromReplicaStrategy::AlwaysFromPrimary,
        );
        let new_shard_addrs = slot_map
            .shard_addrs_for_slot(1)
            .expect("Couldn't find shard address for slot");

        let res = slot_map.update_slot_range(min_slot, new_shard_addrs.clone());
        assert!(res.is_ok(), "{res:?}");

        let after_slots = vec![
            create_slot(min_slot, min_slot, "node2:6379", vec!["replica2:6379"]),
            create_slot(min_slot + 1, 16383, "node2:6379", vec!["replica2:6379"]),
        ];
        assert_slot_map_and_shard_addrs(slot_map, min_slot, new_shard_addrs, after_slots);
    }
}
