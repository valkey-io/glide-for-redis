use rand::Rng;

use crate::cluster_topology::get_slot;
use crate::cmd::{Arg, Cmd};
use crate::types::Value;
use crate::{ErrorKind, RedisError, RedisResult};
use core::cmp::Ordering;
use std::borrow::Cow;
use std::cmp::min;
use std::collections::HashMap;
use std::iter::Once;
use std::sync::Arc;
use std::sync::{RwLock, RwLockWriteGuard};

#[derive(Clone)]
pub(crate) enum Redirect {
    Moved(String),
    Ask(String),
}

/// Logical bitwise aggregating operators.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum LogicalAggregateOp {
    /// Aggregate by bitwise &&
    And,
    // Or, omitted due to dead code warnings. ATM this value isn't constructed anywhere
}

/// Numerical aggregating operators.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum AggregateOp {
    /// Choose minimal value
    Min,
    /// Sum all values
    Sum,
    // Max, omitted due to dead code warnings. ATM this value isn't constructed anywhere
}

/// Policy defining how to combine multiple responses into one.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ResponsePolicy {
    /// Wait for one request to succeed and return its results. Return error if all requests fail.
    OneSucceeded,
    /// Returns the first succeeded non-empty result; if all results are empty, returns `Nil`; otherwise, returns the last received error.
    FirstSucceededNonEmptyOrAllEmpty,
    /// Waits for all requests to succeed, and the returns one of the successes. Returns the error on the first received error.
    AllSucceeded,
    /// Aggregate success results according to a logical bitwise operator. Return error on any failed request or on a response that doesn't conform to 0 or 1.
    AggregateLogical(LogicalAggregateOp),
    /// Aggregate success results according to a numeric operator. Return error on any failed request or on a response that isn't an integer.
    Aggregate(AggregateOp),
    /// Aggregate array responses into a single array. Return error on any failed request or on a response that isn't an array.
    CombineArrays,
    /// Handling is not defined by the Redis standard. Will receive a special case
    Special,
    /// Combines multiple map responses into a single map.
    CombineMaps,
}

/// Defines whether a request should be routed to a single node, or multiple ones.
#[derive(Debug, Clone, PartialEq)]
pub enum RoutingInfo {
    /// Route to single node
    SingleNode(SingleNodeRoutingInfo),
    /// Route to multiple nodes
    MultiNode((MultipleNodeRoutingInfo, Option<ResponsePolicy>)),
}

/// Defines which single node should receive a request.
#[derive(Debug, Clone, PartialEq)]
pub enum SingleNodeRoutingInfo {
    /// Route to any node at random
    Random,
    /// Route to any *primary* node
    RandomPrimary,
    /// Route to the node that matches the [Route]
    SpecificNode(Route),
    /// Route to the node with the given address.
    ByAddress {
        /// DNS hostname of the node
        host: String,
        /// port of the node
        port: u16,
    },
}

impl From<Option<Route>> for SingleNodeRoutingInfo {
    fn from(value: Option<Route>) -> Self {
        value
            .map(SingleNodeRoutingInfo::SpecificNode)
            .unwrap_or(SingleNodeRoutingInfo::Random)
    }
}

/// Defines which collection of nodes should receive a request
#[derive(Debug, Clone, PartialEq)]
pub enum MultipleNodeRoutingInfo {
    /// Route to all nodes in the clusters
    AllNodes,
    /// Route to all primaries in the cluster
    AllMasters,
    /// Routes the request to multiple slots.
    /// This variant contains instructions for splitting a multi-slot command (e.g., MGET, MSET) into sub-commands.
    /// Each tuple consists of a `Route` representing the target node for the subcommand,
    /// and a vector of argument indices from the original command that should be copied to each subcommand.
    /// The `MultiSlotArgPattern` specifies the pattern of the command’s arguments, indicating how they are organized
    /// (e.g., only keys, key-value pairs, etc).
    MultiSlot((Vec<(Route, Vec<usize>)>, MultiSlotArgPattern)),
}

/// Takes a routable and an iterator of indices, which is assued to be created from`MultipleNodeRoutingInfo::MultiSlot`,
/// and returns a command with the arguments matching the indices.
pub fn command_for_multi_slot_indices<'a, 'b>(
    original_cmd: &'a impl Routable,
    indices: impl Iterator<Item = &'b usize> + 'a,
) -> Cmd
where
    'b: 'a,
{
    let mut new_cmd = Cmd::new();
    let command_length = 1; // TODO - the +1 should change if we have multi-slot commands with 2 command words.
    new_cmd.arg(original_cmd.arg_idx(0));
    for index in indices {
        new_cmd.arg(original_cmd.arg_idx(index + command_length));
    }
    new_cmd
}

/// Aggreagte numeric responses.
pub fn aggregate(values: Vec<Value>, op: AggregateOp) -> RedisResult<Value> {
    let initial_value = match op {
        AggregateOp::Min => i64::MAX,
        AggregateOp::Sum => 0,
    };
    let result = values.into_iter().try_fold(initial_value, |acc, curr| {
        let int = match curr {
            Value::Int(int) => int,
            _ => {
                return RedisResult::Err(
                    (
                        ErrorKind::TypeError,
                        "expected array of integers as response",
                    )
                        .into(),
                );
            }
        };
        let acc = match op {
            AggregateOp::Min => min(acc, int),
            AggregateOp::Sum => acc + int,
        };
        Ok(acc)
    })?;
    Ok(Value::Int(result))
}

/// Aggreagte numeric responses by a boolean operator.
pub fn logical_aggregate(values: Vec<Value>, op: LogicalAggregateOp) -> RedisResult<Value> {
    let initial_value = match op {
        LogicalAggregateOp::And => true,
    };
    let results = values.into_iter().try_fold(Vec::new(), |acc, curr| {
        let values = match curr {
            Value::Array(values) => values,
            _ => {
                return RedisResult::Err(
                    (
                        ErrorKind::TypeError,
                        "expected array of integers as response",
                    )
                        .into(),
                );
            }
        };
        let mut acc = if acc.is_empty() {
            vec![initial_value; values.len()]
        } else {
            acc
        };
        for (index, value) in values.into_iter().enumerate() {
            let int = match value {
                Value::Int(int) => int,
                _ => {
                    return Err((
                        ErrorKind::TypeError,
                        "expected array of integers as response",
                    )
                        .into());
                }
            };
            acc[index] = match op {
                LogicalAggregateOp::And => acc[index] && (int > 0),
            };
        }
        Ok(acc)
    })?;
    Ok(Value::Array(
        results
            .into_iter()
            .map(|result| Value::Int(result as i64))
            .collect(),
    ))
}
/// Aggregate array responses into a single map.
pub fn combine_map_results(values: Vec<Value>) -> RedisResult<Value> {
    let mut map: HashMap<Vec<u8>, i64> = HashMap::new();

    for value in values {
        match value {
            Value::Array(elements) => {
                let mut iter = elements.into_iter();

                while let Some(key) = iter.next() {
                    if let Value::BulkString(key_bytes) = key {
                        if let Some(Value::Int(value)) = iter.next() {
                            *map.entry(key_bytes).or_insert(0) += value;
                        } else {
                            return Err((ErrorKind::TypeError, "expected integer value").into());
                        }
                    } else {
                        return Err((ErrorKind::TypeError, "expected string key").into());
                    }
                }
            }
            _ => {
                return Err((ErrorKind::TypeError, "expected array of values as response").into());
            }
        }
    }

    let result_vec: Vec<(Value, Value)> = map
        .into_iter()
        .map(|(k, v)| (Value::BulkString(k), Value::Int(v)))
        .collect();

    Ok(Value::Map(result_vec))
}

/// Aggregate array responses into a single array.
pub fn combine_array_results(values: Vec<Value>) -> RedisResult<Value> {
    let mut results = Vec::new();

    for value in values {
        match value {
            Value::Array(values) => results.extend(values),
            _ => {
                return Err((ErrorKind::TypeError, "expected array of values as response").into());
            }
        }
    }

    Ok(Value::Array(results))
}

// An iterator that yields `Cow<[usize]>` representing grouped result indices according to a specified argument pattern.
// This type is used to combine multi-slot array responses.
type MultiSlotResIdxIter<'a> = std::iter::Map<
    std::slice::Iter<'a, (Route, Vec<usize>)>,
    fn(&'a (Route, Vec<usize>)) -> Cow<'a, [usize]>,
>;

/// Generates an iterator that yields a vector of result indices for each slot within the final merged results array for a multi-slot command response.
/// The indices are calculated based on the `args_pattern` and the positions of the arguments for each slot-specific request in the original multi-slot request,
/// ensuring that the results are ordered according to the structure of the initial multi-slot command.
///
/// # Arguments
/// * `route_arg_indices` - A reference to a vector where each element is a tuple containing a route and
///   the corresponding argument indices for that route.
/// * `args_pattern` - Specifies the argument pattern (e.g., `KeysOnly`, `KeyValuePairs`, ..), which defines how the indices are grouped for each slot.
///
/// # Returns
/// An iterator yielding `Cow<[usize]>` with the grouped result indices based on the specified argument pattern.
///
/// /// For example, given the command `MSET foo bar foo2 bar2 {foo}foo3 bar3` with the `KeyValuePairs` pattern:
/// - `route_arg_indices` would include:
///   - Slot of "foo" with argument indices `[0, 1, 4, 5]` (where `{foo}foo3` hashes to the same slot as "foo" due to curly braces).
///   - Slot of "foo2" with argument indices `[2, 3]`.
/// - Using the `KeyValuePairs` pattern, each key-value pair contributes a single response, yielding three responses total.
/// - Therefore, the iterator generated by this function would yield grouped result indices as follows:
///   - Slot "foo" is mapped to `[0, 2]` in the final result order.
///   - Slot "foo2" is mapped to `[1]`.
fn calculate_multi_slot_result_indices<'a>(
    route_arg_indices: &'a [(Route, Vec<usize>)],
    args_pattern: &MultiSlotArgPattern,
) -> RedisResult<MultiSlotResIdxIter<'a>> {
    let check_indices_input = |step_count: usize| {
        for (_, indices) in route_arg_indices {
            if indices.len() % step_count != 0 {
                return Err(RedisError::from((
                    ErrorKind::ClientError,
                    "Invalid indices input detected",
                    format!(
                        "Expected argument pattern with tuples of size {step_count}, but found indices: {indices:?}"
                    ),
                )));
            }
        }
        Ok(())
    };

    match args_pattern {
        MultiSlotArgPattern::KeysOnly => Ok(route_arg_indices
            .iter()
            .map(|(_, indices)| Cow::Borrowed(indices))),
        MultiSlotArgPattern::KeysAndLastArg => {
            // The last index corresponds to the path, skip it
            Ok(route_arg_indices
                .iter()
                .map(|(_, indices)| Cow::Borrowed(&indices[..indices.len() - 1])))
        }
        MultiSlotArgPattern::KeyWithTwoArgTriples => {
            // For each triplet (key, path, value) we receive a single response.
            // For example, for argument indices: [(_, [0,1,2]), (_, [3,4,5,9,10,11]), (_, [6,7,8])]
            // The resulting grouped indices would be: [0], [1, 3], [2]
            check_indices_input(3)?;
            Ok(route_arg_indices.iter().map(|(_, indices)| {
                Cow::Owned(
                    indices
                        .iter()
                        .step_by(3)
                        .map(|idx| idx / 3)
                        .collect::<Vec<usize>>(),
                )
            }))
        }
        MultiSlotArgPattern::KeyValuePairs =>
        // For each pair (key, value) we receive a single response.
        // For example, for argument indices: [(_, [0,1]), (_, [2,3,6,7]), (_, [4,5])]
        // The resulting grouped indices would be: [0], [1, 3], [2]
        {
            check_indices_input(2)?;
            Ok(route_arg_indices.iter().map(|(_, indices)| {
                Cow::Owned(
                    indices
                        .iter()
                        .step_by(2)
                        .map(|idx| idx / 2)
                        .collect::<Vec<usize>>(),
                )
            }))
        }
    }
}

/// Merges the results of a multi-slot command from the `values` field, where each entry is expected to be an array of results.
/// The combined results are ordered according to the sequence in which they appeared in the original command.
///
/// # Arguments
///
/// * `values` - A vector of `Value`s, where each `Value` is expected to be an array representing results
///   from separate slots in a multi-slot command. Each `Value::Array` within `values` corresponds to
///   the results associated with a specific slot, as indicated by `route_arg_indices`.
///
/// * `route_arg_indices` - A reference to a vector of tuples, where each tuple represents a route and a vector of
///   argument indices associated with that route. The route indicates the slot, while the indices vector
///   specifies the positions of arguments relevant to this slot. This is used to construct `sorting_order`,
///   which guides the placement of results in the final array.
///
/// * `args_pattern` - Specifies the argument pattern (e.g., `KeysOnly`, `KeyValuePairs`, ...).
///   The pattern defines how the argument indices are grouped for each slot and determines
///   the ordering of results from `values` as they are placed in the final combined array.
///
/// # Returns
///
/// Returns a `RedisResult<Value>` containing the final ordered array (`Value::Array`) of combined results.
pub(crate) fn combine_and_sort_array_results(
    values: Vec<Value>,
    route_arg_indices: &[(Route, Vec<usize>)],
    args_pattern: &MultiSlotArgPattern,
) -> RedisResult<Value> {
    let result_indices = calculate_multi_slot_result_indices(route_arg_indices, args_pattern)?;
    let mut results = Vec::new();
    results.resize(
        values.iter().fold(0, |acc, value| match value {
            Value::Array(values) => values.len() + acc,
            _ => 0,
        }),
        Value::Nil,
    );
    if values.len() != result_indices.len() {
        return Err(RedisError::from((
            ErrorKind::ClientError,
            "Mismatch in the number of multi-slot results compared to the expected result count.",
            format!(
                "Expected: {:?}, Found: {:?}",
                values.len(),
                result_indices.len()
            ),
        )));
    }

    for (key_indices, value) in result_indices.into_iter().zip(values) {
        match value {
            Value::Array(values) => {
                assert_eq!(values.len(), key_indices.len());
                for (index, value) in key_indices.iter().zip(values) {
                    results[*index] = value;
                }
            }
            _ => {
                return Err((ErrorKind::TypeError, "expected array of values as response").into());
            }
        }
    }

    Ok(Value::Array(results))
}

fn get_route(is_readonly: bool, key: &[u8]) -> Route {
    let slot = get_slot(key);
    if is_readonly {
        Route::new(slot, SlotAddr::ReplicaOptional)
    } else {
        Route::new(slot, SlotAddr::Master)
    }
}

/// Represents the pattern of argument structures in multi-slot commands,
/// defining how the arguments are organized in the command.
#[derive(Debug, Clone, PartialEq)]
pub enum MultiSlotArgPattern {
    /// Pattern where only keys are provided in the command.
    /// For example: `MGET key1 key2`
    KeysOnly,

    /// Pattern where each key is followed by a corresponding value.
    /// For example: `MSET key1 value1 key2 value2`
    KeyValuePairs,

    /// Pattern where a list of keys is followed by a shared parameter.
    /// For example: `JSON.MGET key1 key2 key3 path`
    KeysAndLastArg,

    /// Pattern where each key is followed by two associated arguments, forming key-argument-argument triples.
    /// For example: `JSON.MSET key1 path1 value1 key2 path2 value2`
    KeyWithTwoArgTriples,
}

/// Takes the given `routable` and creates a multi-slot routing info.
/// This is used for commands like MSET & MGET, where if the command's keys
/// are hashed to multiple slots, the command should be split into sub-commands,
/// each targetting a single slot. The results of these sub-commands are then
/// usually reassembled using `combine_and_sort_array_results`. In order to do this,
/// `MultipleNodeRoutingInfo::MultiSlot` contains the routes for each sub-command, and
/// the indices in the final combined result for each result from the sub-command.
///
/// If all keys are routed to the same slot, there's no need to split the command,
/// so a single node routing info will be returned.
///
/// # Arguments
/// * `routable` - The command or structure containing key-related data that can be routed.
/// * `cmd` - A byte slice representing the command name or opcode (e.g., `b"MGET"`).
/// * `first_key_index` - The starting index in the command where the first key is located.
/// * `args_pattern` - Specifies how keys and values are patterned in the command (e.g., `OnlyKeys`, `KeyValuePairs`).
///
/// # Returns
/// `Some(RoutingInfo)` if routing info is created, indicating the command targets multiple slots or a single slot;
/// `None` if no routing info could be derived.
fn multi_shard<R>(
    routable: &R,
    cmd: &[u8],
    first_key_index: usize,
    args_pattern: MultiSlotArgPattern,
) -> Option<RoutingInfo>
where
    R: Routable + ?Sized,
{
    let is_readonly = is_readonly_cmd(cmd);
    let mut routes = HashMap::new();
    let mut curr_arg_idx = 0;
    let incr_add_next_arg = |arg_indices: &mut Vec<usize>, mut curr_arg_idx: usize| {
        curr_arg_idx += 1;
        // Ensure there's a value following the key
        routable.arg_idx(curr_arg_idx)?;
        arg_indices.push(curr_arg_idx);
        Some(curr_arg_idx)
    };
    while let Some(arg) = routable.arg_idx(first_key_index + curr_arg_idx) {
        let route = get_route(is_readonly, arg);
        let arg_indices = routes.entry(route).or_insert(Vec::new());

        arg_indices.push(curr_arg_idx);

        match args_pattern {
            MultiSlotArgPattern::KeysOnly => {} // no additional handling needed for keys-only commands
            MultiSlotArgPattern::KeyValuePairs => {
                // Increment to the value paired with the current key and add its index
                curr_arg_idx = incr_add_next_arg(arg_indices, curr_arg_idx)?;
            }
            MultiSlotArgPattern::KeysAndLastArg => {
                // Check if the command has more keys or if the next argument is a path
                if routable
                    .arg_idx(first_key_index + curr_arg_idx + 2)
                    .is_none()
                {
                    // Last key reached; add the path argument index for each route and break
                    let path_idx = curr_arg_idx + 1;
                    for (_, arg_indices) in routes.iter_mut() {
                        arg_indices.push(path_idx);
                    }
                    break;
                }
            }
            MultiSlotArgPattern::KeyWithTwoArgTriples => {
                // Increment to the first argument associated with the current key and add its index
                curr_arg_idx = incr_add_next_arg(arg_indices, curr_arg_idx)?;
                // Increment to the second argument associated with the current key and add its index
                curr_arg_idx = incr_add_next_arg(arg_indices, curr_arg_idx)?;
            }
        }
        curr_arg_idx += 1;
    }

    let mut routes: Vec<(Route, Vec<usize>)> = routes.into_iter().collect();
    if routes.is_empty() {
        return None;
    }

    Some(if routes.len() == 1 {
        RoutingInfo::SingleNode(SingleNodeRoutingInfo::SpecificNode(routes.pop().unwrap().0))
    } else {
        RoutingInfo::MultiNode((
            MultipleNodeRoutingInfo::MultiSlot((routes, args_pattern)),
            ResponsePolicy::for_command(cmd),
        ))
    })
}

impl ResponsePolicy {
    /// Parse the command for the matching response policy.
    pub fn for_command(cmd: &[u8]) -> Option<ResponsePolicy> {
        match cmd {
            b"SCRIPT EXISTS" => Some(ResponsePolicy::AggregateLogical(LogicalAggregateOp::And)),

            b"DBSIZE" | b"DEL" | b"EXISTS" | b"SLOWLOG LEN" | b"TOUCH" | b"UNLINK"
            | b"LATENCY RESET" | b"PUBSUB NUMPAT" => {
                Some(ResponsePolicy::Aggregate(AggregateOp::Sum))
            }

            b"WAIT" => Some(ResponsePolicy::Aggregate(AggregateOp::Min)),

            b"ACL SETUSER" | b"ACL DELUSER" | b"ACL SAVE" | b"CLIENT SETNAME"
            | b"CLIENT SETINFO" | b"CONFIG SET" | b"CONFIG RESETSTAT" | b"CONFIG REWRITE"
            | b"FLUSHALL" | b"FLUSHDB" | b"FUNCTION DELETE" | b"FUNCTION FLUSH"
            | b"FUNCTION LOAD" | b"FUNCTION RESTORE" | b"MEMORY PURGE" | b"MSET" | b"JSON.MSET"
            | b"PING" | b"SCRIPT FLUSH" | b"SCRIPT LOAD" | b"SLOWLOG RESET" | b"UNWATCH"
            | b"WATCH" => Some(ResponsePolicy::AllSucceeded),

            b"KEYS"
            | b"FT._ALIASLIST"
            | b"FT._LIST"
            | b"MGET"
            | b"JSON.MGET"
            | b"SLOWLOG GET"
            | b"PUBSUB CHANNELS"
            | b"PUBSUB SHARDCHANNELS" => Some(ResponsePolicy::CombineArrays),

            b"PUBSUB NUMSUB" | b"PUBSUB SHARDNUMSUB" => Some(ResponsePolicy::CombineMaps),

            b"FUNCTION KILL" | b"SCRIPT KILL" => Some(ResponsePolicy::OneSucceeded),

            // This isn't based on response_tips, but on the discussion here - https://github.com/redis/redis/issues/12410
            b"RANDOMKEY" => Some(ResponsePolicy::FirstSucceededNonEmptyOrAllEmpty),

            b"LATENCY GRAPH" | b"LATENCY HISTOGRAM" | b"LATENCY HISTORY" | b"LATENCY DOCTOR"
            | b"LATENCY LATEST" => Some(ResponsePolicy::Special),

            b"FUNCTION STATS" => Some(ResponsePolicy::Special),

            b"MEMORY MALLOC-STATS" | b"MEMORY DOCTOR" | b"MEMORY STATS" => {
                Some(ResponsePolicy::Special)
            }

            b"INFO" => Some(ResponsePolicy::Special),

            _ => None,
        }
    }
}

enum RouteBy {
    AllNodes,
    AllPrimaries,
    FirstKey,
    MultiShard(MultiSlotArgPattern),
    Random,
    SecondArg,
    SecondArgAfterKeyCount,
    SecondArgSlot,
    StreamsIndex,
    ThirdArgAfterKeyCount,
    Undefined,
}

fn base_routing(cmd: &[u8]) -> RouteBy {
    match cmd {
        b"ACL SETUSER"
        | b"ACL DELUSER"
        | b"ACL SAVE"
        | b"CLIENT SETNAME"
        | b"CLIENT SETINFO"
        | b"SLOWLOG GET"
        | b"SLOWLOG LEN"
        | b"SLOWLOG RESET"
        | b"CONFIG SET"
        | b"CONFIG RESETSTAT"
        | b"CONFIG REWRITE"
        | b"SCRIPT FLUSH"
        | b"SCRIPT LOAD"
        | b"LATENCY RESET"
        | b"LATENCY GRAPH"
        | b"LATENCY HISTOGRAM"
        | b"LATENCY HISTORY"
        | b"LATENCY DOCTOR"
        | b"LATENCY LATEST"
        | b"PUBSUB NUMPAT"
        | b"PUBSUB CHANNELS"
        | b"PUBSUB NUMSUB"
        | b"PUBSUB SHARDCHANNELS"
        | b"PUBSUB SHARDNUMSUB"
        | b"SCRIPT KILL"
        | b"FUNCTION KILL"
        | b"FUNCTION STATS" => RouteBy::AllNodes,

        b"DBSIZE"
        | b"DEBUG"
        | b"FLUSHALL"
        | b"FLUSHDB"
        | b"FT._ALIASLIST"
        | b"FT._LIST"
        | b"FUNCTION DELETE"
        | b"FUNCTION FLUSH"
        | b"FUNCTION LOAD"
        | b"FUNCTION RESTORE"
        | b"INFO"
        | b"KEYS"
        | b"MEMORY DOCTOR"
        | b"MEMORY MALLOC-STATS"
        | b"MEMORY PURGE"
        | b"MEMORY STATS"
        | b"PING"
        | b"SCRIPT EXISTS"
        | b"UNWATCH"
        | b"WAIT"
        | b"RANDOMKEY"
        | b"WAITAOF" => RouteBy::AllPrimaries,

        b"MGET" | b"DEL" | b"EXISTS" | b"UNLINK" | b"TOUCH" | b"WATCH" => {
            RouteBy::MultiShard(MultiSlotArgPattern::KeysOnly)
        }

        b"MSET" => RouteBy::MultiShard(MultiSlotArgPattern::KeyValuePairs),
        b"JSON.MGET" => RouteBy::MultiShard(MultiSlotArgPattern::KeysAndLastArg),
        b"JSON.MSET" => RouteBy::MultiShard(MultiSlotArgPattern::KeyWithTwoArgTriples),
        // TODO - special handling - b"SCAN"
        b"SCAN" | b"SHUTDOWN" | b"SLAVEOF" | b"REPLICAOF" => RouteBy::Undefined,

        b"BLMPOP" | b"BZMPOP" | b"EVAL" | b"EVALSHA" | b"EVALSHA_RO" | b"EVAL_RO" | b"FCALL"
        | b"FCALL_RO" => RouteBy::ThirdArgAfterKeyCount,

        b"BITOP"
        | b"MEMORY USAGE"
        | b"PFDEBUG"
        | b"XGROUP CREATE"
        | b"XGROUP CREATECONSUMER"
        | b"XGROUP DELCONSUMER"
        | b"XGROUP DESTROY"
        | b"XGROUP SETID"
        | b"XINFO CONSUMERS"
        | b"XINFO GROUPS"
        | b"XINFO STREAM"
        | b"OBJECT ENCODING"
        | b"OBJECT FREQ"
        | b"OBJECT IDLETIME"
        | b"OBJECT REFCOUNT"
        | b"JSON.DEBUG" => RouteBy::SecondArg,

        b"LMPOP" | b"SINTERCARD" | b"ZDIFF" | b"ZINTER" | b"ZINTERCARD" | b"ZMPOP" | b"ZUNION" => {
            RouteBy::SecondArgAfterKeyCount
        }

        b"XREAD" | b"XREADGROUP" => RouteBy::StreamsIndex,

        // keyless commands with more arguments, whose arguments might be wrongly taken to be keys.
        // TODO - double check these, in order to find better ways to route some of them.
        b"ACL DRYRUN"
        | b"ACL GENPASS"
        | b"ACL GETUSER"
        | b"ACL HELP"
        | b"ACL LIST"
        | b"ACL LOG"
        | b"ACL USERS"
        | b"ACL WHOAMI"
        | b"AUTH"
        | b"BGSAVE"
        | b"CLIENT GETNAME"
        | b"CLIENT GETREDIR"
        | b"CLIENT ID"
        | b"CLIENT INFO"
        | b"CLIENT KILL"
        | b"CLIENT PAUSE"
        | b"CLIENT REPLY"
        | b"CLIENT TRACKINGINFO"
        | b"CLIENT UNBLOCK"
        | b"CLIENT UNPAUSE"
        | b"CLUSTER COUNT-FAILURE-REPORTS"
        | b"CLUSTER INFO"
        | b"CLUSTER KEYSLOT"
        | b"CLUSTER MEET"
        | b"CLUSTER MYSHARDID"
        | b"CLUSTER NODES"
        | b"CLUSTER REPLICAS"
        | b"CLUSTER RESET"
        | b"CLUSTER SET-CONFIG-EPOCH"
        | b"CLUSTER SHARDS"
        | b"CLUSTER SLOTS"
        | b"COMMAND COUNT"
        | b"COMMAND GETKEYS"
        | b"COMMAND LIST"
        | b"COMMAND"
        | b"CONFIG GET"
        | b"ECHO"
        | b"FUNCTION LIST"
        | b"LASTSAVE"
        | b"LOLWUT"
        | b"MODULE LIST"
        | b"MODULE LOAD"
        | b"MODULE LOADEX"
        | b"MODULE UNLOAD"
        | b"READONLY"
        | b"READWRITE"
        | b"SAVE"
        | b"SCRIPT SHOW"
        | b"TFCALL"
        | b"TFCALLASYNC"
        | b"TFUNCTION DELETE"
        | b"TFUNCTION LIST"
        | b"TFUNCTION LOAD"
        | b"TIME" => RouteBy::Random,

        b"CLUSTER ADDSLOTS"
        | b"CLUSTER COUNTKEYSINSLOT"
        | b"CLUSTER DELSLOTS"
        | b"CLUSTER DELSLOTSRANGE"
        | b"CLUSTER GETKEYSINSLOT"
        | b"CLUSTER SETSLOT" => RouteBy::SecondArgSlot,

        _ => RouteBy::FirstKey,
    }
}

impl RoutingInfo {
    /// Returns true if the `cmd` should be routed to all nodes.
    pub fn is_all_nodes(cmd: &[u8]) -> bool {
        matches!(base_routing(cmd), RouteBy::AllNodes)
    }

    /// Returns true if the `cmd` is a key-based command that triggers MOVED errors.
    /// A key-based command is one that will be accepted only by the slot owner,
    /// while other nodes will respond with a MOVED error redirecting to the relevant primary owner.
    pub fn is_key_routing_command(cmd: &[u8]) -> bool {
        match base_routing(cmd) {
            RouteBy::FirstKey
            | RouteBy::SecondArg
            | RouteBy::SecondArgAfterKeyCount
            | RouteBy::ThirdArgAfterKeyCount
            | RouteBy::SecondArgSlot
            | RouteBy::StreamsIndex
            | RouteBy::MultiShard(_) => {
                if matches!(cmd, b"SPUBLISH") {
                    // SPUBLISH does not return MOVED errors within the slot's shard. This means that even if READONLY wasn't sent to a replica,
                    // executing SPUBLISH FOO BAR on that replica will succeed. This behavior differs from true key-based commands,
                    // such as SET FOO BAR, where a non-readonly replica would return a MOVED error if READONLY is off.
                    // Consequently, SPUBLISH does not meet the requirement of being a command that triggers MOVED errors.
                    // TODO: remove this when PRIMARY_PREFERRED route for SPUBLISH is added
                    false
                } else {
                    true
                }
            }
            RouteBy::AllNodes | RouteBy::AllPrimaries | RouteBy::Random | RouteBy::Undefined => {
                false
            }
        }
    }

    /// Returns the routing info for `r`.
    pub fn for_routable<R>(r: &R) -> Option<RoutingInfo>
    where
        R: Routable + ?Sized,
    {
        let cmd = &r.command()?[..];
        match base_routing(cmd) {
            RouteBy::AllNodes => Some(RoutingInfo::MultiNode((
                MultipleNodeRoutingInfo::AllNodes,
                ResponsePolicy::for_command(cmd),
            ))),

            RouteBy::AllPrimaries => Some(RoutingInfo::MultiNode((
                MultipleNodeRoutingInfo::AllMasters,
                ResponsePolicy::for_command(cmd),
            ))),

            RouteBy::MultiShard(arg_pattern) => multi_shard(r, cmd, 1, arg_pattern),

            RouteBy::Random => Some(RoutingInfo::SingleNode(SingleNodeRoutingInfo::Random)),

            RouteBy::ThirdArgAfterKeyCount => {
                let key_count = r
                    .arg_idx(2)
                    .and_then(|x| std::str::from_utf8(x).ok())
                    .and_then(|x| x.parse::<u64>().ok())?;
                if key_count == 0 {
                    Some(RoutingInfo::SingleNode(SingleNodeRoutingInfo::Random))
                } else {
                    r.arg_idx(3).map(|key| RoutingInfo::for_key(cmd, key))
                }
            }

            RouteBy::SecondArg => r.arg_idx(2).map(|key| RoutingInfo::for_key(cmd, key)),

            RouteBy::SecondArgAfterKeyCount => {
                let key_count = r
                    .arg_idx(1)
                    .and_then(|x| std::str::from_utf8(x).ok())
                    .and_then(|x| x.parse::<u64>().ok())?;
                if key_count == 0 {
                    Some(RoutingInfo::SingleNode(SingleNodeRoutingInfo::Random))
                } else {
                    r.arg_idx(2).map(|key| RoutingInfo::for_key(cmd, key))
                }
            }

            RouteBy::StreamsIndex => {
                let streams_position = r.position(b"STREAMS")?;
                r.arg_idx(streams_position + 1)
                    .map(|key| RoutingInfo::for_key(cmd, key))
            }

            RouteBy::SecondArgSlot => r
                .arg_idx(2)
                .and_then(|arg| std::str::from_utf8(arg).ok())
                .and_then(|slot| slot.parse::<u16>().ok())
                .map(|slot| {
                    RoutingInfo::SingleNode(SingleNodeRoutingInfo::SpecificNode(Route::new(
                        slot,
                        SlotAddr::Master,
                    )))
                }),

            RouteBy::FirstKey => match r.arg_idx(1) {
                Some(key) => Some(RoutingInfo::for_key(cmd, key)),
                None => Some(RoutingInfo::SingleNode(SingleNodeRoutingInfo::Random)),
            },

            RouteBy::Undefined => None,
        }
    }

    fn for_key(cmd: &[u8], key: &[u8]) -> RoutingInfo {
        RoutingInfo::SingleNode(SingleNodeRoutingInfo::SpecificNode(get_route(
            is_readonly_cmd(cmd),
            key,
        )))
    }
}

/// Returns true if the given `routable` represents a readonly command.
pub fn is_readonly(routable: &impl Routable) -> bool {
    match routable.command() {
        Some(cmd) => is_readonly_cmd(cmd.as_slice()),
        None => false,
    }
}

/// Returns `true` if the given `cmd` is a readonly command.
pub fn is_readonly_cmd(cmd: &[u8]) -> bool {
    matches!(
        cmd,
        b"ACL CAT"
            | b"ACL DELUSER"
            | b"ACL DRYRUN"
            | b"ACL GENPASS"
            | b"ACL GETUSER"
            | b"ACL HELP"
            | b"ACL LIST"
            | b"ACL LOAD"
            | b"ACL LOG"
            | b"ACL SAVE"
            | b"ACL SETUSER"
            | b"ACL USERS"
            | b"ACL WHOAMI"
            | b"AUTH"
            | b"BGREWRITEAOF"
            | b"BGSAVE"
            | b"BITCOUNT"
            | b"BITFIELD_RO"
            | b"BITPOS"
            | b"CLIENT ID"
            | b"CLIENT CACHING"
            | b"CLIENT CAPA"
            | b"CLIENT GETNAME"
            | b"CLIENT GETREDIR"
            | b"CLIENT HELP"
            | b"CLIENT INFO"
            | b"CLIENT KILL"
            | b"CLIENT LIST"
            | b"CLIENT NO-EVICT"
            | b"CLIENT NO-TOUCH"
            | b"CLIENT PAUSE"
            | b"CLIENT REPLY"
            | b"CLIENT SETINFO"
            | b"CLIENT SETNAME"
            | b"CLIENT TRACKING"
            | b"CLIENT TRACKINGINFO"
            | b"CLIENT UNBLOCK"
            | b"CLIENT UNPAUSE"
            | b"CLUSTER COUNT-FAILURE-REPORTS"
            | b"CLUSTER COUNTKEYSINSLOT"
            | b"CLUSTER FAILOVER"
            | b"CLUSTER GETKEYSINSLOT"
            | b"CLUSTER HELP"
            | b"CLUSTER INFO"
            | b"CLUSTER KEYSLOT"
            | b"CLUSTER LINKS"
            | b"CLUSTER MYID"
            | b"CLUSTER MYSHARDID"
            | b"CLUSTER NODES"
            | b"CLUSTER REPLICATE"
            | b"CLUSTER SAVECONFIG"
            | b"CLUSTER SHARDS"
            | b"CLUSTER SLOTS"
            | b"COMMAND COUNT"
            | b"COMMAND DOCS"
            | b"COMMAND GETKEYS"
            | b"COMMAND GETKEYSANDFLAGS"
            | b"COMMAND HELP"
            | b"COMMAND INFO"
            | b"COMMAND LIST"
            | b"CONFIG GET"
            | b"CONFIG HELP"
            | b"CONFIG RESETSTAT"
            | b"CONFIG REWRITE"
            | b"CONFIG SET"
            | b"DBSIZE"
            | b"DUMP"
            | b"ECHO"
            | b"EVAL_RO"
            | b"EVALSHA_RO"
            | b"EXISTS"
            | b"EXPIRETIME"
            | b"FCALL_RO"
            | b"FT.AGGREGATE"
            | b"FT.EXPLAIN"
            | b"FT.EXPLAINCLI"
            | b"FT.INFO"
            | b"FT.PROFILE"
            | b"FT.SEARCH"
            | b"FT._ALIASLIST"
            | b"FT._LIST"
            | b"FUNCTION DUMP"
            | b"FUNCTION HELP"
            | b"FUNCTION KILL"
            | b"FUNCTION LIST"
            | b"FUNCTION STATS"
            | b"GEODIST"
            | b"GEOHASH"
            | b"GEOPOS"
            | b"GEORADIUSBYMEMBER_RO"
            | b"GEORADIUS_RO"
            | b"GEOSEARCH"
            | b"GET"
            | b"GETBIT"
            | b"GETRANGE"
            | b"HELLO"
            | b"HEXISTS"
            | b"HGET"
            | b"HGETALL"
            | b"HKEYS"
            | b"HLEN"
            | b"HMGET"
            | b"HRANDFIELD"
            | b"HSCAN"
            | b"HSTRLEN"
            | b"HVALS"
            | b"JSON.ARRINDEX"
            | b"JSON.ARRLEN"
            | b"JSON.DEBUG"
            | b"JSON.GET"
            | b"JSON.OBJLEN"
            | b"JSON.OBJKEYS"
            | b"JSON.MGET"
            | b"JSON.RESP"
            | b"JSON.STRLEN"
            | b"JSON.TYPE"
            | b"INFO"
            | b"KEYS"
            | b"LASTSAVE"
            | b"LATENCY DOCTOR"
            | b"LATENCY GRAPH"
            | b"LATENCY HELP"
            | b"LATENCY HISTOGRAM"
            | b"LATENCY HISTORY"
            | b"LATENCY LATEST"
            | b"LATENCY RESET"
            | b"LCS"
            | b"LINDEX"
            | b"LLEN"
            | b"LOLWUT"
            | b"LPOS"
            | b"LRANGE"
            | b"MEMORY DOCTOR"
            | b"MEMORY HELP"
            | b"MEMORY MALLOC-STATS"
            | b"MEMORY PURGE"
            | b"MEMORY STATS"
            | b"MEMORY USAGE"
            | b"MGET"
            | b"MODULE HELP"
            | b"MODULE LIST"
            | b"MODULE LOAD"
            | b"MODULE LOADEX"
            | b"MODULE UNLOAD"
            | b"OBJECT ENCODING"
            | b"OBJECT FREQ"
            | b"OBJECT HELP"
            | b"OBJECT IDLETIME"
            | b"OBJECT REFCOUNT"
            | b"PEXPIRETIME"
            | b"PFCOUNT"
            | b"PING"
            | b"PTTL"
            | b"PUBLISH"
            | b"PUBSUB CHANNELS"
            | b"PUBSUB HELP"
            | b"PUBSUB NUMPAT"
            | b"PUBSUB NUMSUB"
            | b"PUBSUB SHARDCHANNELS"
            | b"PUBSUB SHARDNUMSUB"
            | b"RANDOMKEY"
            | b"REPLICAOF"
            | b"RESET"
            | b"ROLE"
            | b"SAVE"
            | b"SCAN"
            | b"SCARD"
            | b"SCRIPT DEBUG"
            | b"SCRIPT EXISTS"
            | b"SCRIPT FLUSH"
            | b"SCRIPT KILL"
            | b"SCRIPT LOAD"
            | b"SCRIPT SHOW"
            | b"SDIFF"
            | b"SELECT"
            | b"SHUTDOWN"
            | b"SINTER"
            | b"SINTERCARD"
            | b"SISMEMBER"
            | b"SMEMBERS"
            | b"SMISMEMBER"
            | b"SLOWLOG GET"
            | b"SLOWLOG HELP"
            | b"SLOWLOG LEN"
            | b"SLOWLOG RESET"
            | b"SORT_RO"
            | b"SPUBLISH"
            | b"SRANDMEMBER"
            | b"SSCAN"
            | b"SSUBSCRIBE"
            | b"STRLEN"
            | b"SUBSCRIBE"
            | b"SUBSTR"
            | b"SUNION"
            | b"SUNSUBSCRIBE"
            | b"TIME"
            | b"TOUCH"
            | b"TTL"
            | b"TYPE"
            | b"UNSUBSCRIBE"
            | b"XINFO CONSUMERS"
            | b"XINFO GROUPS"
            | b"XINFO HELP"
            | b"XINFO STREAM"
            | b"XLEN"
            | b"XPENDING"
            | b"XRANGE"
            | b"XREAD"
            | b"XREVRANGE"
            | b"ZCARD"
            | b"ZCOUNT"
            | b"ZDIFF"
            | b"ZINTER"
            | b"ZINTERCARD"
            | b"ZLEXCOUNT"
            | b"ZMSCORE"
            | b"ZRANDMEMBER"
            | b"ZRANGE"
            | b"ZRANGEBYLEX"
            | b"ZRANGEBYSCORE"
            | b"ZRANK"
            | b"ZREVRANGE"
            | b"ZREVRANGEBYLEX"
            | b"ZREVRANGEBYSCORE"
            | b"ZREVRANK"
            | b"ZSCAN"
            | b"ZSCORE"
            | b"ZUNION"
    )
}

/// Objects that implement this trait define a request that can be routed by a cluster client to different nodes in the cluster.
pub trait Routable {
    /// Convenience function to return ascii uppercase version of the
    /// the first argument (i.e., the command).
    fn command(&self) -> Option<Vec<u8>> {
        let primary_command = self.arg_idx(0).map(|x| x.to_ascii_uppercase())?;
        let mut primary_command = match primary_command.as_slice() {
            b"XGROUP" | b"OBJECT" | b"SLOWLOG" | b"FUNCTION" | b"MODULE" | b"COMMAND"
            | b"PUBSUB" | b"CONFIG" | b"MEMORY" | b"XINFO" | b"CLIENT" | b"ACL" | b"SCRIPT"
            | b"CLUSTER" | b"LATENCY" => primary_command,
            _ => {
                return Some(primary_command);
            }
        };

        Some(match self.arg_idx(1) {
            Some(secondary_command) => {
                let previous_len = primary_command.len();
                primary_command.reserve(secondary_command.len() + 1);
                primary_command.extend(b" ");
                primary_command.extend(secondary_command);
                let current_len = primary_command.len();
                primary_command[previous_len + 1..current_len].make_ascii_uppercase();
                primary_command
            }
            None => primary_command,
        })
    }

    /// Returns a reference to the data for the argument at `idx`.
    fn arg_idx(&self, idx: usize) -> Option<&[u8]>;

    /// Returns index of argument that matches `candidate`, if it exists
    fn position(&self, candidate: &[u8]) -> Option<usize>;
}

impl Routable for Cmd {
    fn arg_idx(&self, idx: usize) -> Option<&[u8]> {
        self.arg_idx(idx)
    }

    fn position(&self, candidate: &[u8]) -> Option<usize> {
        self.args_iter().position(|a| match a {
            Arg::Simple(d) => d.eq_ignore_ascii_case(candidate),
            _ => false,
        })
    }
}

impl Routable for Value {
    fn arg_idx(&self, idx: usize) -> Option<&[u8]> {
        match self {
            Value::Array(args) => match args.get(idx) {
                Some(Value::BulkString(ref data)) => Some(&data[..]),
                _ => None,
            },
            _ => None,
        }
    }

    fn position(&self, candidate: &[u8]) -> Option<usize> {
        match self {
            Value::Array(args) => args.iter().position(|a| match a {
                Value::BulkString(d) => d.eq_ignore_ascii_case(candidate),
                _ => false,
            }),
            _ => None,
        }
    }
}

#[derive(Debug, Hash, Clone)]
pub(crate) struct Slot {
    pub(crate) start: u16,
    pub(crate) end: u16,
    pub(crate) master: String,
    pub(crate) replicas: Vec<String>,
}

impl Slot {
    pub fn new(s: u16, e: u16, m: String, r: Vec<String>) -> Self {
        Self {
            start: s,
            end: e,
            master: m,
            replicas: r,
        }
    }

    #[allow(dead_code)] // used in tests
    pub(crate) fn master(&self) -> &str {
        self.master.as_str()
    }

    #[allow(dead_code)] // used in tests
    pub fn replicas(&self) -> Vec<String> {
        self.replicas.clone()
    }
}

/// What type of node should a request be routed to, assuming read from replica is enabled.
#[derive(Eq, PartialEq, Clone, Copy, Debug, Hash)]
pub enum SlotAddr {
    /// The request must be routed to primary node
    Master,
    /// The request may be routed to a replica node.
    /// For example, a GET command can be routed either to replica or primary.
    ReplicaOptional,
    /// The request must be routed to replica node, if one exists.
    /// For example, by user requested routing.
    ReplicaRequired,
}

/// Represents the result of checking a shard for the status of a node.
///
/// This enum indicates whether a given node is already the primary, has been promoted to a primary from a replica,
/// or is not found in the shard at all.
///
/// Variants:
/// - `AlreadyPrimary`: The specified node is already the primary for the shard, so no changes are needed.
/// - `Promoted`: The specified node was found as a replica and successfully promoted to primary.
/// - `NodeNotFound`: The specified node is neither the current primary nor a replica within the shard.
#[derive(PartialEq, Debug)]
pub(crate) enum ShardUpdateResult {
    AlreadyPrimary,
    Promoted,
    NodeNotFound,
}

const READ_LK_ERR_SHARDADDRS: &str = "Failed to acquire read lock for ShardAddrs";
const WRITE_LK_ERR_SHARDADDRS: &str = "Failed to acquire write lock for ShardAddrs";
/// This is just a simplified version of [`Slot`],
/// which stores only the master and [optional] replica
/// to avoid the need to choose a replica each time
/// a command is executed
#[derive(Debug)]
pub(crate) struct ShardAddrs {
    primary: RwLock<Arc<String>>,
    replicas: RwLock<Vec<Arc<String>>>,
}

impl PartialEq for ShardAddrs {
    fn eq(&self, other: &Self) -> bool {
        let self_primary = self.primary.read().expect(READ_LK_ERR_SHARDADDRS);
        let other_primary = other.primary.read().expect(READ_LK_ERR_SHARDADDRS);

        let self_replicas = self.replicas.read().expect(READ_LK_ERR_SHARDADDRS);
        let other_replicas = other.replicas.read().expect(READ_LK_ERR_SHARDADDRS);

        *self_primary == *other_primary && *self_replicas == *other_replicas
    }
}

impl Eq for ShardAddrs {}

impl PartialOrd for ShardAddrs {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for ShardAddrs {
    fn cmp(&self, other: &Self) -> Ordering {
        let self_primary = self.primary.read().expect(READ_LK_ERR_SHARDADDRS);
        let other_primary = other.primary.read().expect(READ_LK_ERR_SHARDADDRS);

        let primary_cmp = self_primary.cmp(&other_primary);
        if primary_cmp == Ordering::Equal {
            let self_replicas = self.replicas.read().expect(READ_LK_ERR_SHARDADDRS);
            let other_replicas = other.replicas.read().expect(READ_LK_ERR_SHARDADDRS);
            return self_replicas.cmp(&other_replicas);
        }

        primary_cmp
    }
}

impl ShardAddrs {
    pub(crate) fn new(primary: Arc<String>, replicas: Vec<Arc<String>>) -> Self {
        let primary = RwLock::new(primary);
        let replicas = RwLock::new(replicas);
        Self { primary, replicas }
    }

    pub(crate) fn new_with_primary(primary: Arc<String>) -> Self {
        Self::new(primary, Vec::default())
    }

    pub(crate) fn primary(&self) -> Arc<String> {
        self.primary.read().expect(READ_LK_ERR_SHARDADDRS).clone()
    }

    pub(crate) fn replicas(&self) -> std::sync::RwLockReadGuard<Vec<Arc<String>>> {
        self.replicas.read().expect(READ_LK_ERR_SHARDADDRS)
    }

    /// Attempts to update the shard roles based on the provided `new_primary`.
    ///
    /// This function evaluates whether the specified `new_primary` node is already
    /// the primary, a replica that can be promoted to primary, or a node not present
    /// in the shard. It handles three scenarios:
    ///
    /// 1. **Already Primary**: If the `new_primary` is already the current primary,
    ///    the function returns `ShardUpdateResult::AlreadyPrimary` and no changes are made.
    ///
    /// 2. **Promoted**: If the `new_primary` is found in the list of replicas, it is promoted
    ///    to primary by swapping it with the current primary, and the function returns
    ///    `ShardUpdateResult::Promoted`.
    ///
    /// 3. **Node Not Found**: If the `new_primary` is neither the current primary nor a replica,
    ///    the function returns `ShardUpdateResult::NodeNotFound` to indicate that the node is
    ///    not part of the current shard.
    ///
    /// # Arguments:
    /// * `new_primary` - Representing the node to be promoted or checked.
    ///
    /// # Returns:
    /// * `ShardUpdateResult` - The result of the role update operation.
    pub(crate) fn attempt_shard_role_update(&self, new_primary: Arc<String>) -> ShardUpdateResult {
        let mut primary_lock = self.primary.write().expect(WRITE_LK_ERR_SHARDADDRS);
        let mut replicas_lock = self.replicas.write().expect(WRITE_LK_ERR_SHARDADDRS);

        // If the new primary is already the current primary, return early.
        if *primary_lock == new_primary {
            return ShardUpdateResult::AlreadyPrimary;
        }

        // If the new primary is found among replicas, swap it with the current primary.
        if let Some(replica_idx) = Self::replica_index(&replicas_lock, new_primary.clone()) {
            std::mem::swap(&mut *primary_lock, &mut replicas_lock[replica_idx]);
            return ShardUpdateResult::Promoted;
        }

        // If the new primary isn't part of the shard.
        ShardUpdateResult::NodeNotFound
    }

    fn replica_index(
        replicas: &RwLockWriteGuard<'_, Vec<Arc<String>>>,
        target_replica: Arc<String>,
    ) -> Option<usize> {
        replicas
            .iter()
            .position(|curr_replica| **curr_replica == *target_replica)
    }

    /// Removes the specified `replica_to_remove` from the shard's replica list if it exists.
    /// This method searches for the replica's index and removes it from the list. If the replica
    /// is not found, it returns an error.
    ///
    /// # Arguments
    /// * `replica_to_remove` - The address of the replica to be removed.
    ///
    /// # Returns
    /// * `RedisResult<()>` - `Ok(())` if the replica was successfully removed, or an error if the
    ///   replica was not found.
    pub(crate) fn remove_replica(&self, replica_to_remove: Arc<String>) -> RedisResult<()> {
        let mut replicas_lock = self.replicas.write().expect(WRITE_LK_ERR_SHARDADDRS);
        if let Some(index) = Self::replica_index(&replicas_lock, replica_to_remove.clone()) {
            replicas_lock.remove(index);
            Ok(())
        } else {
            Err(RedisError::from((
                ErrorKind::ClientError,
                "Couldn't remove replica",
                format!("Replica {replica_to_remove:?} not found"),
            )))
        }
    }
}

impl IntoIterator for &ShardAddrs {
    type Item = Arc<String>;
    type IntoIter = std::iter::Chain<Once<Arc<String>>, std::vec::IntoIter<Arc<String>>>;

    fn into_iter(self) -> Self::IntoIter {
        let primary = self.primary.read().expect(READ_LK_ERR_SHARDADDRS).clone();
        let replicas = self.replicas.read().expect(READ_LK_ERR_SHARDADDRS).clone();

        std::iter::once(primary).chain(replicas)
    }
}

/// Defines the slot and the [`SlotAddr`] to which
/// a command should be sent
#[derive(Eq, PartialEq, Clone, Copy, Debug, Hash)]
pub struct Route(u16, SlotAddr);

impl Route {
    /// Returns a new Route.
    pub fn new(slot: u16, slot_addr: SlotAddr) -> Self {
        Self(slot, slot_addr)
    }

    /// Returns the slot number of the route.
    pub fn slot(&self) -> u16 {
        self.0
    }

    /// Returns the slot address of the route.
    pub fn slot_addr(&self) -> SlotAddr {
        self.1
    }

    /// Returns a new Route for a random primary node
    pub fn new_random_primary() -> Self {
        Self::new(random_slot(), SlotAddr::Master)
    }
}

/// Choose a random slot from `0..SLOT_SIZE` (excluding)
fn random_slot() -> u16 {
    let mut rng = rand::thread_rng();
    rng.gen_range(0..crate::cluster_topology::SLOT_SIZE)
}

#[cfg(test)]
mod tests_routing {
    use super::{
        command_for_multi_slot_indices, AggregateOp, MultiSlotArgPattern, MultipleNodeRoutingInfo,
        ResponsePolicy, Route, RoutingInfo, ShardAddrs, SingleNodeRoutingInfo, SlotAddr,
    };
    use crate::cluster_routing::ShardUpdateResult;
    use crate::{cluster_topology::slot, cmd, parser::parse_redis_value, Value};
    use core::panic;
    use std::sync::{Arc, RwLock};

    #[test]
    fn test_routing_info_mixed_capatalization() {
        let mut upper = cmd("XREAD");
        upper.arg("STREAMS").arg("foo").arg(0);

        let mut lower = cmd("xread");
        lower.arg("streams").arg("foo").arg(0);

        assert_eq!(
            RoutingInfo::for_routable(&upper).unwrap(),
            RoutingInfo::for_routable(&lower).unwrap()
        );

        let mut mixed = cmd("xReAd");
        mixed.arg("StReAmS").arg("foo").arg(0);

        assert_eq!(
            RoutingInfo::for_routable(&lower).unwrap(),
            RoutingInfo::for_routable(&mixed).unwrap()
        );
    }

    #[test]
    fn test_routing_info() {
        let mut test_cmds = vec![];

        // RoutingInfo::AllMasters
        let mut test_cmd = cmd("FLUSHALL");
        test_cmd.arg("");
        test_cmds.push(test_cmd);

        // RoutingInfo::AllNodes
        test_cmd = cmd("ECHO");
        test_cmd.arg("");
        test_cmds.push(test_cmd);

        // Routing key is 2nd arg ("42")
        test_cmd = cmd("SET");
        test_cmd.arg("42");
        test_cmds.push(test_cmd);

        // Routing key is 3rd arg ("FOOBAR")
        test_cmd = cmd("XINFO");
        test_cmd.arg("GROUPS").arg("FOOBAR");
        test_cmds.push(test_cmd);

        // Routing key is 3rd or 4th arg (3rd = "0" == RoutingInfo::SingleNode(SingleNodeRoutingInfo::Random))
        test_cmd = cmd("EVAL");
        test_cmd.arg("FOO").arg("0").arg("BAR");
        test_cmds.push(test_cmd);

        // Routing key is 3rd or 4th arg (3rd != "0" == RoutingInfo::Slot)
        test_cmd = cmd("EVAL");
        test_cmd.arg("FOO").arg("4").arg("BAR");
        test_cmds.push(test_cmd);

        // Routing key position is variable, 3rd arg
        test_cmd = cmd("XREAD");
        test_cmd.arg("STREAMS").arg("4");
        test_cmds.push(test_cmd);

        // Routing key position is variable, 4th arg
        test_cmd = cmd("XREAD");
        test_cmd.arg("FOO").arg("STREAMS").arg("4");
        test_cmds.push(test_cmd);

        for cmd in test_cmds {
            let value = parse_redis_value(&cmd.get_packed_command()).unwrap();
            assert_eq!(
                RoutingInfo::for_routable(&value).unwrap(),
                RoutingInfo::for_routable(&cmd).unwrap(),
            );
        }

        // Assert expected RoutingInfo explicitly:

        for cmd in [cmd("FLUSHALL"), cmd("FLUSHDB"), cmd("PING")] {
            assert_eq!(
                RoutingInfo::for_routable(&cmd),
                Some(RoutingInfo::MultiNode((
                    MultipleNodeRoutingInfo::AllMasters,
                    Some(ResponsePolicy::AllSucceeded)
                )))
            );
        }

        assert_eq!(
            RoutingInfo::for_routable(&cmd("DBSIZE")),
            Some(RoutingInfo::MultiNode((
                MultipleNodeRoutingInfo::AllMasters,
                Some(ResponsePolicy::Aggregate(AggregateOp::Sum))
            )))
        );

        assert_eq!(
            RoutingInfo::for_routable(&cmd("SCRIPT KILL")),
            Some(RoutingInfo::MultiNode((
                MultipleNodeRoutingInfo::AllNodes,
                Some(ResponsePolicy::OneSucceeded)
            )))
        );

        assert_eq!(
            RoutingInfo::for_routable(&cmd("INFO")),
            Some(RoutingInfo::MultiNode((
                MultipleNodeRoutingInfo::AllMasters,
                Some(ResponsePolicy::Special)
            )))
        );

        assert_eq!(
            RoutingInfo::for_routable(&cmd("KEYS")),
            Some(RoutingInfo::MultiNode((
                MultipleNodeRoutingInfo::AllMasters,
                Some(ResponsePolicy::CombineArrays)
            )))
        );

        for cmd in vec![
            cmd("SCAN"),
            cmd("SHUTDOWN"),
            cmd("SLAVEOF"),
            cmd("REPLICAOF"),
        ] {
            assert_eq!(
                RoutingInfo::for_routable(&cmd),
                None,
                "{}",
                std::str::from_utf8(cmd.arg_idx(0).unwrap()).unwrap()
            );
        }

        for cmd in [
            cmd("EVAL").arg(r#"redis.call("PING");"#).arg(0),
            cmd("EVALSHA").arg(r#"redis.call("PING");"#).arg(0),
        ] {
            assert_eq!(
                RoutingInfo::for_routable(cmd),
                Some(RoutingInfo::SingleNode(SingleNodeRoutingInfo::Random))
            );
        }

        // While FCALL with N keys is expected to be routed to a specific node
        assert_eq!(
            RoutingInfo::for_routable(cmd("FCALL").arg("foo").arg(1).arg("mykey")),
            Some(RoutingInfo::SingleNode(
                SingleNodeRoutingInfo::SpecificNode(Route::new(slot(b"mykey"), SlotAddr::Master))
            ))
        );

        for (cmd, expected) in [
            (
                cmd("EVAL")
                    .arg(r#"redis.call("GET, KEYS[1]");"#)
                    .arg(1)
                    .arg("foo"),
                Some(RoutingInfo::SingleNode(
                    SingleNodeRoutingInfo::SpecificNode(Route::new(slot(b"foo"), SlotAddr::Master)),
                )),
            ),
            (
                cmd("XGROUP")
                    .arg("CREATE")
                    .arg("mystream")
                    .arg("workers")
                    .arg("$")
                    .arg("MKSTREAM"),
                Some(RoutingInfo::SingleNode(
                    SingleNodeRoutingInfo::SpecificNode(Route::new(
                        slot(b"mystream"),
                        SlotAddr::Master,
                    )),
                )),
            ),
            (
                cmd("XINFO").arg("GROUPS").arg("foo"),
                Some(RoutingInfo::SingleNode(
                    SingleNodeRoutingInfo::SpecificNode(Route::new(
                        slot(b"foo"),
                        SlotAddr::ReplicaOptional,
                    )),
                )),
            ),
            (
                cmd("XREADGROUP")
                    .arg("GROUP")
                    .arg("wkrs")
                    .arg("consmrs")
                    .arg("STREAMS")
                    .arg("mystream"),
                Some(RoutingInfo::SingleNode(
                    SingleNodeRoutingInfo::SpecificNode(Route::new(
                        slot(b"mystream"),
                        SlotAddr::Master,
                    )),
                )),
            ),
            (
                cmd("XREAD")
                    .arg("COUNT")
                    .arg("2")
                    .arg("STREAMS")
                    .arg("mystream")
                    .arg("writers")
                    .arg("0-0")
                    .arg("0-0"),
                Some(RoutingInfo::SingleNode(
                    SingleNodeRoutingInfo::SpecificNode(Route::new(
                        slot(b"mystream"),
                        SlotAddr::ReplicaOptional,
                    )),
                )),
            ),
        ] {
            assert_eq!(
                RoutingInfo::for_routable(cmd),
                expected,
                "{}",
                std::str::from_utf8(cmd.arg_idx(0).unwrap()).unwrap()
            );
        }
    }

    #[test]
    fn test_slot_for_packed_cmd() {
        assert!(matches!(RoutingInfo::for_routable(&parse_redis_value(&[
                42, 50, 13, 10, 36, 54, 13, 10, 69, 88, 73, 83, 84, 83, 13, 10, 36, 49, 54, 13, 10,
                244, 93, 23, 40, 126, 127, 253, 33, 89, 47, 185, 204, 171, 249, 96, 139, 13, 10
            ]).unwrap()), Some(RoutingInfo::SingleNode(SingleNodeRoutingInfo::SpecificNode(Route(slot, SlotAddr::ReplicaOptional)))) if slot == 964));

        assert!(matches!(RoutingInfo::for_routable(&parse_redis_value(&[
                42, 54, 13, 10, 36, 51, 13, 10, 83, 69, 84, 13, 10, 36, 49, 54, 13, 10, 36, 241,
                197, 111, 180, 254, 5, 175, 143, 146, 171, 39, 172, 23, 164, 145, 13, 10, 36, 52,
                13, 10, 116, 114, 117, 101, 13, 10, 36, 50, 13, 10, 78, 88, 13, 10, 36, 50, 13, 10,
                80, 88, 13, 10, 36, 55, 13, 10, 49, 56, 48, 48, 48, 48, 48, 13, 10
            ]).unwrap()), Some(RoutingInfo::SingleNode(SingleNodeRoutingInfo::SpecificNode(Route(slot, SlotAddr::Master)))) if slot == 8352));

        assert!(matches!(RoutingInfo::for_routable(&parse_redis_value(&[
                42, 54, 13, 10, 36, 51, 13, 10, 83, 69, 84, 13, 10, 36, 49, 54, 13, 10, 169, 233,
                247, 59, 50, 247, 100, 232, 123, 140, 2, 101, 125, 221, 66, 170, 13, 10, 36, 52,
                13, 10, 116, 114, 117, 101, 13, 10, 36, 50, 13, 10, 78, 88, 13, 10, 36, 50, 13, 10,
                80, 88, 13, 10, 36, 55, 13, 10, 49, 56, 48, 48, 48, 48, 48, 13, 10
            ]).unwrap()), Some(RoutingInfo::SingleNode(SingleNodeRoutingInfo::SpecificNode(Route(slot, SlotAddr::Master)))) if slot == 5210));
    }

    #[test]
    fn test_multi_shard_keys_only() {
        let mut cmd = cmd("DEL");
        cmd.arg("foo").arg("bar").arg("baz").arg("{bar}vaz");
        let routing = RoutingInfo::for_routable(&cmd);
        let mut expected = std::collections::HashMap::new();
        expected.insert(Route(4813, SlotAddr::Master), vec![2]);
        expected.insert(Route(5061, SlotAddr::Master), vec![1, 3]);
        expected.insert(Route(12182, SlotAddr::Master), vec![0]);

        assert!(
            matches!(routing.clone(), Some(RoutingInfo::MultiNode((MultipleNodeRoutingInfo::MultiSlot((vec, args_pattern)), Some(ResponsePolicy::Aggregate(AggregateOp::Sum))))) if {
                let routes = vec.clone().into_iter().collect();
                expected == routes && args_pattern == MultiSlotArgPattern::KeysOnly
            }),
            "expected={expected:?}\nrouting={routing:?}"
        );

        let mut cmd = crate::cmd("MGET");
        cmd.arg("foo").arg("bar").arg("baz").arg("{bar}vaz");
        let routing = RoutingInfo::for_routable(&cmd);
        let mut expected = std::collections::HashMap::new();
        expected.insert(Route(4813, SlotAddr::ReplicaOptional), vec![2]);
        expected.insert(Route(5061, SlotAddr::ReplicaOptional), vec![1, 3]);
        expected.insert(Route(12182, SlotAddr::ReplicaOptional), vec![0]);

        assert!(
            matches!(routing.clone(), Some(RoutingInfo::MultiNode((MultipleNodeRoutingInfo::MultiSlot((vec, args_pattern)), Some(ResponsePolicy::CombineArrays)))) if {
                let routes = vec.clone().into_iter().collect();
                expected == routes && args_pattern == MultiSlotArgPattern::KeysOnly
            }),
            "expected={expected:?}\nrouting={routing:?}"
        );
    }

    #[test]
    fn test_multi_shard_key_value_pairs() {
        let mut cmd = cmd("MSET");
        cmd.arg("foo") // key slot 12182
            .arg("bar") // value
            .arg("foo2") // key slot 1044
            .arg("bar2")    // value
            .arg("{foo}foo3") // key slot 12182
            .arg("bar3"); // value
        let routing = RoutingInfo::for_routable(&cmd);
        let mut expected = std::collections::HashMap::new();
        expected.insert(Route(1044, SlotAddr::Master), vec![2, 3]);
        expected.insert(Route(12182, SlotAddr::Master), vec![0, 1, 4, 5]);

        assert!(
            matches!(routing.clone(), Some(RoutingInfo::MultiNode((MultipleNodeRoutingInfo::MultiSlot((vec, args_pattern)), Some(ResponsePolicy::AllSucceeded)))) if {
                let routes = vec.clone().into_iter().collect();
                expected == routes && args_pattern == MultiSlotArgPattern::KeyValuePairs
            }),
            "expected={expected:?}\nrouting={routing:?}"
        );
    }

    #[test]
    fn test_multi_shard_keys_and_path() {
        let mut cmd = cmd("JSON.MGET");
        cmd.arg("foo") // key slot 12182
            .arg("bar") // key slot 5061
            .arg("baz") // key slot 4813
            .arg("{bar}vaz") // key slot 5061
            .arg("$.f.a"); // path
        let routing = RoutingInfo::for_routable(&cmd);
        let mut expected = std::collections::HashMap::new();
        expected.insert(Route(4813, SlotAddr::ReplicaOptional), vec![2, 4]);
        expected.insert(Route(5061, SlotAddr::ReplicaOptional), vec![1, 3, 4]);
        expected.insert(Route(12182, SlotAddr::ReplicaOptional), vec![0, 4]);

        assert!(
            matches!(routing.clone(), Some(RoutingInfo::MultiNode((MultipleNodeRoutingInfo::MultiSlot((vec, args_pattern)), Some(ResponsePolicy::CombineArrays)))) if {
                let routes = vec.clone().into_iter().collect();
                expected == routes && args_pattern == MultiSlotArgPattern::KeysAndLastArg
            }),
            "expected={expected:?}\nrouting={routing:?}"
        );
    }

    #[test]
    fn test_multi_shard_key_with_two_arg_triples() {
        let mut cmd = cmd("JSON.MSET");
        cmd
            .arg("foo") // key slot 12182
            .arg("$.a") // path
            .arg("bar") // value
            .arg("foo2") // key slot 1044
            .arg("$.f.a") // path
            .arg("bar2") // value
            .arg("{foo}foo3") // key slot 12182
            .arg("$.f.a") // path
            .arg("bar3"); // value
        let routing = RoutingInfo::for_routable(&cmd);
        let mut expected = std::collections::HashMap::new();
        expected.insert(Route(1044, SlotAddr::Master), vec![3, 4, 5]);
        expected.insert(Route(12182, SlotAddr::Master), vec![0, 1, 2, 6, 7, 8]);

        assert!(
            matches!(routing.clone(), Some(RoutingInfo::MultiNode((MultipleNodeRoutingInfo::MultiSlot((vec, args_pattern)), Some(ResponsePolicy::AllSucceeded)))) if {
                let routes = vec.clone().into_iter().collect();
                expected == routes && args_pattern == MultiSlotArgPattern::KeyWithTwoArgTriples
            }),
            "expected={expected:?}\nrouting={routing:?}"
        );
    }

    #[test]
    fn test_command_creation_for_multi_shard() {
        let mut original_cmd = cmd("DEL");
        original_cmd
            .arg("foo")
            .arg("bar")
            .arg("baz")
            .arg("{bar}vaz");
        let routing = RoutingInfo::for_routable(&original_cmd);
        let expected = [vec![0], vec![1, 3], vec![2]];

        let mut indices: Vec<_> = match routing {
            Some(RoutingInfo::MultiNode((
                MultipleNodeRoutingInfo::MultiSlot((vec, MultiSlotArgPattern::KeysOnly)),
                _,
            ))) => vec.into_iter().map(|(_, indices)| indices).collect(),
            _ => panic!("unexpected routing: {routing:?}"),
        };
        indices.sort_by(|prev, next| prev.iter().next().unwrap().cmp(next.iter().next().unwrap())); // sorting because the `for_routable` doesn't return values in a consistent order between runs.

        for (index, indices) in indices.into_iter().enumerate() {
            let cmd = command_for_multi_slot_indices(&original_cmd, indices.iter());
            let expected_indices = &expected[index];
            assert_eq!(original_cmd.arg_idx(0), cmd.arg_idx(0));
            for (index, target_index) in expected_indices.iter().enumerate() {
                let target_index = target_index + 1;
                assert_eq!(original_cmd.arg_idx(target_index), cmd.arg_idx(index + 1));
            }
        }
    }

    #[test]
    fn test_combine_multi_shard_to_single_node_when_all_keys_are_in_same_slot() {
        let mut cmd = cmd("DEL");
        cmd.arg("foo").arg("{foo}bar").arg("{foo}baz");
        let routing = RoutingInfo::for_routable(&cmd);

        assert!(
            matches!(
                routing,
                Some(RoutingInfo::SingleNode(
                    SingleNodeRoutingInfo::SpecificNode(Route(12182, SlotAddr::Master))
                ))
            ),
            "{routing:?}"
        );
    }

    #[test]
    fn test_combining_results_into_single_array_only_keys() {
        // For example `MGET foo bar baz {baz}baz2 {bar}bar2 {foo}foo2`
        let res1 = Value::Array(vec![Value::Nil, Value::Okay]);
        let res2 = Value::Array(vec![
            Value::BulkString("1".as_bytes().to_vec()),
            Value::BulkString("4".as_bytes().to_vec()),
        ]);
        let res3 = Value::Array(vec![Value::SimpleString("2".to_string()), Value::Int(3)]);
        let results = super::combine_and_sort_array_results(
            vec![res1, res2, res3],
            &[
                (Route(4813, SlotAddr::Master), vec![2, 3]),
                (Route(5061, SlotAddr::Master), vec![1, 4]),
                (Route(12182, SlotAddr::Master), vec![0, 5]),
            ],
            &MultiSlotArgPattern::KeysOnly,
        );

        assert_eq!(
            results.unwrap(),
            Value::Array(vec![
                Value::SimpleString("2".to_string()),
                Value::BulkString("1".as_bytes().to_vec()),
                Value::Nil,
                Value::Okay,
                Value::BulkString("4".as_bytes().to_vec()),
                Value::Int(3),
            ])
        );
    }

    #[test]
    fn test_combining_results_into_single_array_key_value_paires() {
        // For example `MSET foo bar foo2 bar2 {foo}foo3 bar3`
        let res1 = Value::Array(vec![Value::Okay]);
        let res2 = Value::Array(vec![Value::BulkString("1".as_bytes().to_vec()), Value::Nil]);
        let results = super::combine_and_sort_array_results(
            vec![res1, res2],
            &[
                (Route(1044, SlotAddr::Master), vec![2, 3]),
                (Route(12182, SlotAddr::Master), vec![0, 1, 4, 5]),
            ],
            &MultiSlotArgPattern::KeyValuePairs,
        );

        assert_eq!(
            results.unwrap(),
            Value::Array(vec![
                Value::BulkString("1".as_bytes().to_vec()),
                Value::Okay,
                Value::Nil
            ])
        );
    }

    #[test]
    fn test_combining_results_into_single_array_keys_and_path() {
        // For example `JSON.MGET foo bar {foo}foo2 $.a`
        let res1 = Value::Array(vec![Value::Okay]);
        let res2 = Value::Array(vec![Value::BulkString("1".as_bytes().to_vec()), Value::Nil]);
        let results = super::combine_and_sort_array_results(
            vec![res1, res2],
            &[
                (Route(5061, SlotAddr::Master), vec![2, 3]),
                (Route(12182, SlotAddr::Master), vec![0, 1, 3]),
            ],
            &MultiSlotArgPattern::KeysAndLastArg,
        );

        assert_eq!(
            results.unwrap(),
            Value::Array(vec![
                Value::BulkString("1".as_bytes().to_vec()),
                Value::Nil,
                Value::Okay,
            ])
        );
    }

    #[test]
    fn test_combining_results_into_single_array_key_with_two_arg_triples() {
        // For example `JSON.MSET foo $.a bar foo2 $.f.a bar2 {foo}foo3 $.f bar3`
        let res1 = Value::Array(vec![Value::Okay]);
        let res2 = Value::Array(vec![Value::BulkString("1".as_bytes().to_vec()), Value::Nil]);
        let results = super::combine_and_sort_array_results(
            vec![res1, res2],
            &[
                (Route(5061, SlotAddr::Master), vec![3, 4, 5]),
                (Route(12182, SlotAddr::Master), vec![0, 1, 2, 6, 7, 8]),
            ],
            &MultiSlotArgPattern::KeyWithTwoArgTriples,
        );

        assert_eq!(
            results.unwrap(),
            Value::Array(vec![
                Value::BulkString("1".as_bytes().to_vec()),
                Value::Okay,
                Value::Nil
            ])
        );
    }

    #[test]
    fn test_combine_map_results() {
        let input = vec![];
        let result = super::combine_map_results(input).unwrap();
        assert_eq!(result, Value::Map(vec![]));

        let input = vec![
            Value::Array(vec![
                Value::BulkString(b"key1".to_vec()),
                Value::Int(5),
                Value::BulkString(b"key2".to_vec()),
                Value::Int(10),
            ]),
            Value::Array(vec![
                Value::BulkString(b"key1".to_vec()),
                Value::Int(3),
                Value::BulkString(b"key3".to_vec()),
                Value::Int(15),
            ]),
        ];
        let result = super::combine_map_results(input).unwrap();
        let mut expected = vec![
            (Value::BulkString(b"key1".to_vec()), Value::Int(8)),
            (Value::BulkString(b"key2".to_vec()), Value::Int(10)),
            (Value::BulkString(b"key3".to_vec()), Value::Int(15)),
        ];
        expected.sort_unstable_by(|a, b| match (&a.0, &b.0) {
            (Value::BulkString(a_bytes), Value::BulkString(b_bytes)) => a_bytes.cmp(b_bytes),
            _ => std::cmp::Ordering::Equal,
        });
        let mut result_vec = match result {
            Value::Map(v) => v,
            _ => panic!("Expected Map"),
        };
        result_vec.sort_unstable_by(|a, b| match (&a.0, &b.0) {
            (Value::BulkString(a_bytes), Value::BulkString(b_bytes)) => a_bytes.cmp(b_bytes),
            _ => std::cmp::Ordering::Equal,
        });
        assert_eq!(result_vec, expected);

        let input = vec![Value::Int(5)];
        let result = super::combine_map_results(input);
        assert!(result.is_err());
    }

    fn create_shard_addrs(primary: &str, replicas: Vec<&str>) -> ShardAddrs {
        ShardAddrs {
            primary: RwLock::new(Arc::new(primary.to_string())),
            replicas: RwLock::new(
                replicas
                    .into_iter()
                    .map(|r| Arc::new(r.to_string()))
                    .collect(),
            ),
        }
    }

    #[test]
    fn test_attempt_shard_role_update_already_primary() {
        let shard_addrs = create_shard_addrs("node1:6379", vec!["node2:6379", "node3:6379"]);
        let result = shard_addrs.attempt_shard_role_update(Arc::new("node1:6379".to_string()));
        assert_eq!(result, ShardUpdateResult::AlreadyPrimary);
    }

    #[test]
    fn test_attempt_shard_role_update_promoted() {
        let shard_addrs = create_shard_addrs("node1:6379", vec!["node2:6379", "node3:6379"]);
        let result = shard_addrs.attempt_shard_role_update(Arc::new("node2:6379".to_string()));
        assert_eq!(result, ShardUpdateResult::Promoted);

        let primary = shard_addrs.primary.read().unwrap().clone();
        assert_eq!(primary.as_str(), "node2:6379");

        let replicas = shard_addrs.replicas.read().unwrap();
        assert_eq!(replicas.len(), 2);
        assert!(replicas.iter().any(|r| r.as_str() == "node1:6379"));
    }

    #[test]
    fn test_attempt_shard_role_update_node_not_found() {
        let shard_addrs = create_shard_addrs("node1:6379", vec!["node2:6379", "node3:6379"]);
        let result = shard_addrs.attempt_shard_role_update(Arc::new("node4:6379".to_string()));
        assert_eq!(result, ShardUpdateResult::NodeNotFound);
    }
}
