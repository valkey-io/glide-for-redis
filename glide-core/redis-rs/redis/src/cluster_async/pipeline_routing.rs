use crate::aio::ConnectionLike;
use crate::cluster_async::ClusterConnInner;
use crate::cluster_async::Connect;
use crate::cluster_routing::{
    command_for_multi_slot_indices, MultipleNodeRoutingInfo, ResponsePolicy, SingleNodeRoutingInfo,
};
use crate::{cluster_routing, RedisResult, Value};
use crate::{cluster_routing::Route, Cmd, ErrorKind, RedisError};
use std::collections::HashMap;
use std::sync::Arc;

use crate::cluster_async::MUTEX_READ_ERR;
use crate::Pipeline;
use rand::prelude::IteratorRandom;

use super::{Core, InternalSingleNodeRouting, OperationTarget, Response};

/// Represents a pipeline command execution context for a specific node
#[derive(Default)]
pub struct NodePipelineContext<C> {
    /// The pipeline of commands to be executed
    pub pipeline: Pipeline,
    /// The connection to the node
    pub connection: C,
    /// Vector of (command_index, inner_index) pairs tracking command order
    /// command_index: Position in the original pipeline
    /// inner_index: Optional sub-index for multi-node operations (e.g. MSET)
    pub command_indices: Vec<(usize, Option<usize>)>,
}

/// Maps node addresses to their pipeline execution contexts
pub type NodePipelineMap<C> = HashMap<String, NodePipelineContext<C>>;

impl<C> NodePipelineContext<C> {
    fn new(connection: C) -> Self {
        Self {
            pipeline: Pipeline::new(),
            connection,
            command_indices: Vec::new(),
        }
    }

    // Adds a command to the pipeline and records its index
    fn add_command(&mut self, cmd: Cmd, index: usize, inner_index: Option<usize>) {
        self.pipeline.add_command(cmd);
        self.command_indices.push((index, inner_index));
    }
}

// `NodeResponse` represents a response from a node along with its source node address.
// `PipelineResponses` represents the responses for each pipeline command.
// The outer `Vec` represents the pipeline commands, and each inner `Vec` contains (response, address) pairs.
// Since some commands can be executed across multiple nodes (e.g., multi-node commands), a single command
// might produce multiple responses, each from a different node. By storing the responses with their
// respective node addresses, we ensure that we have all the information needed to aggregate the results later.
type NodeResponse = (Value, String);
pub type PipelineResponses = Vec<Vec<NodeResponse>>;

/// Adds a command to the pipeline map for a specific node address.
pub fn add_command_to_node_pipeline_map<C>(
    pipeline_map: &mut NodePipelineMap<C>,
    address: String,
    connection: C,
    cmd: Cmd,
    index: usize,
    inner_index: Option<usize>,
) {
    pipeline_map
        .entry(address)
        .or_insert_with(|| NodePipelineContext::new(connection))
        .add_command(cmd, index, inner_index);
}

/// Adds a command to a random existing node pipeline in the pipeline map
pub fn add_command_to_random_existing_node<C>(
    pipeline_map: &mut NodePipelineMap<C>,
    cmd: Cmd,
    index: usize,
) -> RedisResult<()> {
    let mut rng = rand::thread_rng();
    if let Some(node_context) = pipeline_map.values_mut().choose(&mut rng) {
        node_context.add_command(cmd, index, None);
        Ok(())
    } else {
        Err(RedisError::from((ErrorKind::IoError, "No nodes available")))
    }
}

/// Handles multi-slot commands within a pipeline.
///
/// This function processes commands with routing information indicating multiple slots
/// (e.g., `MSET` or `MGET`), splits them into sub-commands based on their target slots,
/// and assigns these sub-commands to the appropriate pipelines for the corresponding nodes.
///
/// ### Parameters:
/// - `pipelines_by_connection`: A mutable map of node pipelines where the commands will be added.
/// - `core`: The core structure that provides access to connection management.
/// - `cmd`: The original multi-slot command that needs to be split.
/// - `index`: The index of the original command within the pipeline.
/// - `slots`: A vector containing routing information. Each entry includes:
///   - `Route`: The specific route for the slot.
///   - `Vec<usize>`: Indices of the keys within the command that map to this slot.
pub async fn handle_pipeline_multi_slot_routing<C>(
    pipelines_by_connection: &mut NodePipelineMap<C>,
    core: Core<C>,
    cmd: &Cmd,
    index: usize,
    slots: Vec<(Route, Vec<usize>)>,
) where
    C: Clone,
{
    // inner_index is used to keep track of the index of the sub-command inside cmd
    for (inner_index, (route, indices)) in slots.iter().enumerate() {
        let conn = {
            let lock = core.conn_lock.read().expect(MUTEX_READ_ERR);
            lock.connection_for_route(route)
        };
        if let Some((address, conn)) = conn {
            // create the sub-command for the slot
            let new_cmd = command_for_multi_slot_indices(cmd, indices.iter());
            add_command_to_node_pipeline_map(
                pipelines_by_connection,
                address,
                conn.await,
                new_cmd,
                index,
                Some(inner_index),
            );
        }
    }
}

/// Handles pipeline commands that require single-node routing.
///
/// This function processes commands with `SingleNode` routing information and determines
/// the appropriate handling based on the routing type.
///
/// ### Parameters:
/// - `pipeline_map`: A mutable reference to the `NodePipelineMap`, representing the pipelines grouped by nodes.
/// - `cmd`: The command to process and add to the appropriate node pipeline.
/// - `routing`: The single-node routing information, which determines how the command is routed.
/// - `core`: The core object responsible for managing connections and routing logic.
/// - `index`: The position of the command in the overall pipeline.
pub async fn handle_pipeline_single_node_routing<C>(
    pipeline_map: &mut NodePipelineMap<C>,
    cmd: Cmd,
    routing: InternalSingleNodeRouting<C>,
    core: Core<C>,
    index: usize,
) -> Result<(), (OperationTarget, RedisError)>
where
    C: Clone + ConnectionLike + Connect + Send + Sync + 'static,
{
    if matches!(routing, InternalSingleNodeRouting::Random) && !pipeline_map.is_empty() {
        // The routing info is to a random node, and we already have sub-pipelines within our pipelines map, so just add it to a random sub-pipeline
        add_command_to_random_existing_node(pipeline_map, cmd, index)
            .map_err(|err| (OperationTarget::NotFound, err))?;
        Ok(())
    } else {
        let (address, conn) =
            ClusterConnInner::get_connection(routing, core, Some(Arc::new(cmd.clone())))
                .await
                .map_err(|err| (OperationTarget::NotFound, err))?;
        add_command_to_node_pipeline_map(pipeline_map, address, conn, cmd, index, None);
        Ok(())
    }
}

/// Maps the commands in a pipeline to the appropriate nodes based on their routing information.
///
/// This function processes each command in the given pipeline, determines its routing information,
/// and organizes it into a map of node pipelines. It handles both single-node and multi-node routing
/// strategies and ensures that the commands are distributed accordingly.
///
/// It also collects response policies for multi-node routing and returns them along with the pipeline map.
/// This is to ensure we can aggregate responses from properly from the different nodes.
///
/// # Arguments
///
/// * `pipeline` - A reference to the pipeline containing the commands to route.
/// * `core` - The core object that provides access to connection locks and other resources.
///
/// # Returns
///
/// A `RedisResult` containing a tuple:
///
/// - A `NodePipelineMap<C>` where commands are grouped by their corresponding nodes (as pipelines).
/// - A `Vec<(usize, MultipleNodeRoutingInfo, Option<ResponsePolicy>)>` containing the routing information
///   and response policies for multi-node commands, along with the index of the command in the pipeline, for aggregating the responses later.
pub async fn map_pipeline_to_nodes<C>(
    pipeline: &crate::Pipeline,
    core: Core<C>,
) -> RedisResult<(
    NodePipelineMap<C>,
    Vec<(usize, MultipleNodeRoutingInfo, Option<ResponsePolicy>)>,
)>
where
    C: Clone + ConnectionLike + Connect + Send + Sync + 'static,
{
    let mut pipelines_by_connection = NodePipelineMap::new();
    let mut response_policies = Vec::new();

    for (index, cmd) in pipeline.cmd_iter().enumerate() {
        match cluster_routing::RoutingInfo::for_routable(cmd).unwrap_or(
            cluster_routing::RoutingInfo::SingleNode(SingleNodeRoutingInfo::Random),
        ) {
            cluster_routing::RoutingInfo::SingleNode(route) => {
                handle_pipeline_single_node_routing(
                    &mut pipelines_by_connection,
                    cmd.clone(),
                    route.into(),
                    core.clone(),
                    index,
                )
                .await
                .map_err(|(_target, err)| err)?;
            }

            cluster_routing::RoutingInfo::MultiNode((multi_node_routing, response_policy)) => {
                //save the routing info and response policy, so we will be able to aggregate the results later
                response_policies.push((index, multi_node_routing.clone(), response_policy));
                match multi_node_routing {
                    MultipleNodeRoutingInfo::AllNodes | MultipleNodeRoutingInfo::AllMasters => {
                        let connections: Vec<_> = {
                            let lock = core.conn_lock.read().expect(MUTEX_READ_ERR);
                            if matches!(multi_node_routing, MultipleNodeRoutingInfo::AllNodes) {
                                lock.all_node_connections().collect()
                            } else {
                                lock.all_primary_connections().collect()
                            }
                        };
                        for (inner_index, (address, conn)) in connections.into_iter().enumerate() {
                            add_command_to_node_pipeline_map(
                                &mut pipelines_by_connection,
                                address,
                                conn.await,
                                cmd.clone(),
                                index,
                                Some(inner_index),
                            );
                        }
                    }
                    MultipleNodeRoutingInfo::MultiSlot((slots, _)) => {
                        handle_pipeline_multi_slot_routing(
                            &mut pipelines_by_connection,
                            core.clone(),
                            cmd,
                            index,
                            slots,
                        )
                        .await;
                    }
                }
            }
        }
    }
    Ok((pipelines_by_connection, response_policies))
}

/// Executes a pipeline of commands on a specified node.
///
/// This function sends a batch of commands (pipeline) to the specified node for execution.
///
/// ### Parameters:
/// - `address`: The address of the target node where the pipeline commands should be executed.
/// - `node_context`: The `NodePipelineContext` containing the pipeline commands and the associated connection.
///
/// ### Returns:
/// - `Ok((Vec<(usize, Option<usize>)>, Vec<Value>, String))`:
///   - A vector of command indices (`usize`) and their respective inner indices (`Option<usize>`) in the pipeline.
///   - A vector of `Value` objects representing the responses from the executed pipeline.
///   - The address of the node where the pipeline was executed.
/// - `Err((OperationTarget, RedisError))`:
///   - An error tuple containing the target operation and the corresponding error details if execution fails.
pub async fn execute_pipeline_on_node<C>(
    address: String,
    node_context: NodePipelineContext<C>,
) -> Result<(Vec<(usize, Option<usize>)>, Vec<Value>, String), (OperationTarget, RedisError)>
where
    C: Clone + ConnectionLike + Connect + Send + Sync + 'static,
{
    let count = node_context.pipeline.len();
    let result =
        ClusterConnInner::try_pipeline_request(Arc::new(node_context.pipeline), 0, count, async {
            Ok((address.clone(), node_context.connection))
        })
        .await?;

    match result {
        Response::Multiple(values) => Ok((node_context.command_indices, values, address)),
        _ => Err((
            OperationTarget::FanOut,
            RedisError::from((ErrorKind::ResponseError, "Unsupported response type")),
        )),
    }
}

/// Adds the result of a pipeline command to the `values_and_addresses` collection.
///
/// This function updates the `values_and_addresses` vector at the given `index` and optionally at the
/// `inner_index` if provided. If `inner_index` is `Some`, it ensures that the vector at that index is large enough
/// to hold the value and address at the specified position, resizing it if necessary. If `inner_index` is `None`,
/// the value and address are simply appended to the vector.
///
/// # Parameters
/// - `values_and_addresses`: A mutable reference to a vector of vectors that stores the results of pipeline commands.
/// - `index`: The index in `values_and_addresses` where the result should be stored.
/// - `inner_index`: An optional index within the vector at `index`, used to store the result at a specific position.
/// - `value`: The result value to store.
/// - `address`: The address associated with the result.
pub fn add_pipeline_result(
    values_and_addresses: &mut [Vec<(Value, String)>],
    index: usize,
    inner_index: Option<usize>,
    value: Value,
    address: String,
) {
    match inner_index {
        Some(inner_index) => {
            // Ensure the vector at the given index is large enough to hold the value and address at the specified position
            if values_and_addresses[index].len() <= inner_index {
                values_and_addresses[index].resize(inner_index + 1, (Value::Nil, "".to_string()));
            }
            values_and_addresses[index][inner_index] = (value, address);
        }
        None => values_and_addresses[index].push((value, address)),
    }
}

/// Collects and processes the results of pipeline tasks from a `tokio::task::JoinSet`.
///
/// This function iteratively retrieves completed tasks from the provided `join_set` and processes
/// their results. Successful results are added to the `values_and_addresses` vector using the
/// indices and values provided. If an error occurs in any task, it is recorded and returned as
/// the first encountered error.
///
/// # Parameters
/// - `join_set`: A mutable reference to a `tokio::task::JoinSet` containing tasks that return:
///   - `Ok((Vec<(usize, Option<usize>)>, Vec<Value>, String))`: On success, a tuple of:
///     - A list of indices and optional inner indices corresponding to pipeline commands.
///     - A list of `Value` results from the executed pipeline.
///     - The `String` address where the task was executed.
///   - `Err((OperationTarget, RedisError))`: On failure, an error detailing the operation target and the Redis error.
/// - `values_and_addresses`: A mutable slice of vectors, where each vector corresponds to a pipeline
///   command's results. This is updated with the values and addresses from successful tasks.
///
/// # Returns
/// - `Ok(Some((OperationTarget, RedisError)))`: If one or more tasks encountered an error, returns the first error.
/// - `Ok(None)`: If all tasks completed successfully.
/// - `Err((OperationTarget::FanOut, RedisError))`: If a task failed unexpectedly (e.g., due to a panic).
///
///
/// # Behavior
/// - Processes successful results by calling `add_pipeline_result` to update the
///   `values_and_addresses` vector with the indices, values, and addresses.
/// - Records the first error encountered and continues processing the remaining tasks.
/// - Returns `Ok(None)` if all tasks complete successfully.
#[allow(clippy::type_complexity)]
pub async fn collect_pipeline_tasks(
    join_set: &mut tokio::task::JoinSet<
        Result<(Vec<(usize, Option<usize>)>, Vec<Value>, String), (OperationTarget, RedisError)>,
    >,
    values_and_addresses: &mut [Vec<(Value, String)>],
) -> Result<Option<(OperationTarget, RedisError)>, (OperationTarget, RedisError)> {
    let mut first_error = None;

    while let Some(future_result) = join_set.join_next().await {
        match future_result {
            Ok(Ok((indices, values, address))) => {
                for ((index, inner_index), value) in indices.into_iter().zip(values) {
                    add_pipeline_result(
                        values_and_addresses,
                        index,
                        inner_index,
                        value,
                        address.clone(),
                    );
                }
            }
            Ok(Err(e)) => first_error = first_error.or(Some(e)),
            Err(e) => {
                return Err((
                    OperationTarget::FanOut,
                    std::io::Error::new(std::io::ErrorKind::Other, e.to_string()).into(),
                ))
            }
        }
    }
    Ok(first_error)
}

/// This function returns the route for a given pipeline.
/// The function goes over the commands in the pipeline, checks that all key-based commands are routed to the same slot,
/// and returns the route for that specific node.
/// If the pipeline contains no key-based commands, the function returns None.
/// For non-atomic pipelines, the function will return None, regardless of the commands in it.
pub fn route_for_pipeline(pipeline: &crate::Pipeline) -> RedisResult<Option<Route>> {
    fn route_for_command(cmd: &Cmd) -> Option<Route> {
        match cluster_routing::RoutingInfo::for_routable(cmd) {
            Some(cluster_routing::RoutingInfo::SingleNode(SingleNodeRoutingInfo::Random)) => None,
            Some(cluster_routing::RoutingInfo::SingleNode(
                SingleNodeRoutingInfo::SpecificNode(route),
            )) => Some(route),
            Some(cluster_routing::RoutingInfo::SingleNode(
                SingleNodeRoutingInfo::RandomPrimary,
            )) => Some(Route::new_random_primary()),
            Some(cluster_routing::RoutingInfo::MultiNode(_)) => None,
            Some(cluster_routing::RoutingInfo::SingleNode(SingleNodeRoutingInfo::ByAddress {
                ..
            })) => None,
            None => None,
        }
    }

    if pipeline.is_atomic() {
        // Find first specific slot and send to it. There's no need to check If later commands
        // should be routed to a different slot, since the server will return an error indicating this.
        pipeline
            .cmd_iter()
            .map(route_for_command)
            .try_fold(None, |chosen_route, next_cmd_route| {
                match (chosen_route, next_cmd_route) {
                    (None, _) => Ok(next_cmd_route),
                    (_, None) => Ok(chosen_route),
                    (Some(chosen_route), Some(next_cmd_route)) => {
                        if chosen_route.slot() != next_cmd_route.slot() {
                            Err((
                                ErrorKind::CrossSlot,
                                "Received crossed slots in transaction",
                            )
                                .into())
                        } else {
                            Ok(Some(chosen_route))
                        }
                    }
                }
            })
    } else {
        // Pipeline is not atomic, so we can have commands with different slots.
        Ok(None)
    }
}
