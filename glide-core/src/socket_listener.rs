// Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

use super::rotating_buffer::RotatingBuffer;
use crate::client::Client;
use crate::cluster_scan_container::get_cluster_scan_cursor;
use crate::command_request::{
    command, command_request, ClusterScan, Command, CommandRequest, Pipeline, Routes, SlotTypes,
    Transaction,
};
use crate::connection_request::ConnectionRequest;
use crate::errors::{error_message, error_type, RequestErrorType};
use crate::response;
use crate::response::Response;
use bytes::Bytes;
use directories::BaseDirs;
use logger_core::{log_debug, log_error, log_info, log_trace, log_warn};
use once_cell::sync::Lazy;
use protobuf::{Chars, Message};
use redis::cluster_routing::{
    MultipleNodeRoutingInfo, Route, RoutingInfo, SingleNodeRoutingInfo, SlotAddr,
};
use redis::cluster_routing::{ResponsePolicy, Routable};
use redis::{ClusterScanArgs, Cmd, PushInfo, RedisError, ScanStateRC, Value};
use std::cell::Cell;
use std::collections::HashSet;
use std::rc::Rc;
use std::sync::RwLock;
use std::{env, str};
use std::{io, thread};
use thiserror::Error;
use tokio::net::{UnixListener, UnixStream};
use tokio::runtime::Builder;
use tokio::sync::mpsc;
use tokio::sync::mpsc::{channel, Sender};
use tokio::sync::Mutex;
use tokio::task;
use tokio_util::task::LocalPoolHandle;
use ClosingReason::*;
use PipeListeningResult::*;

/// The socket file name
const SOCKET_FILE_NAME: &str = "glide-socket";

/// The maximum length of a request's arguments to be passed as a vector of
/// strings instead of a pointer
pub const MAX_REQUEST_ARGS_LENGTH: usize = 2_i32.pow(12) as usize; // TODO: find the right number

pub const STRING: &str = "string";
pub const LIST: &str = "list";
pub const SET: &str = "set";
pub const ZSET: &str = "zset";
pub const HASH: &str = "hash";
pub const STREAM: &str = "stream";

/// struct containing all objects needed to read from a unix stream.
struct UnixStreamListener {
    read_socket: Rc<UnixStream>,
    rotating_buffer: RotatingBuffer,
}

/// struct containing all objects needed to write to a socket.
struct Writer {
    socket: Rc<UnixStream>,
    lock: Mutex<()>,
    accumulated_outputs: Cell<Vec<u8>>,
    closing_sender: Sender<ClosingReason>,
}

enum PipeListeningResult<TRequest: Message> {
    Closed(ClosingReason),
    ReceivedValues(Vec<TRequest>),
}

impl<T: Message> From<ClosingReason> for PipeListeningResult<T> {
    fn from(result: ClosingReason) -> Self {
        Closed(result)
    }
}

impl UnixStreamListener {
    fn new(read_socket: Rc<UnixStream>) -> Self {
        // if the logger has been initialized by the user (external or internal) on info level this log will be shown
        log_debug("connection", "new socket listener initiated");
        let rotating_buffer = RotatingBuffer::new(65_536);
        Self {
            read_socket,
            rotating_buffer,
        }
    }

    pub(crate) async fn next_values<TRequest: Message>(&mut self) -> PipeListeningResult<TRequest> {
        loop {
            if let Err(err) = self.read_socket.readable().await {
                return ClosingReason::UnhandledError(err.into()).into();
            }

            let read_result = self
                .read_socket
                .try_read_buf(self.rotating_buffer.current_buffer());
            match read_result {
                Ok(0) => {
                    return ReadSocketClosed.into();
                }
                Ok(_) => {
                    match self.rotating_buffer.get_requests() {
                        Ok(requests) => {
                            if !requests.is_empty() {
                                return ReceivedValues(requests);
                            }
                            // continue to read from socket
                            continue;
                        }
                        Err(err) => return UnhandledError(err.into()).into(),
                    };
                }
                Err(ref e)
                    if e.kind() == io::ErrorKind::WouldBlock
                        || e.kind() == io::ErrorKind::Interrupted =>
                {
                    continue;
                }
                Err(err) => return UnhandledError(err.into()).into(),
            }
        }
    }
}

async fn write_to_output(writer: &Rc<Writer>) {
    let Ok(_guard) = writer.lock.try_lock() else {
        return;
    };

    let mut output = writer.accumulated_outputs.take();
    loop {
        if output.is_empty() {
            return;
        }
        let mut total_written_bytes = 0;
        while total_written_bytes < output.len() {
            if let Err(err) = writer.socket.writable().await {
                let _res = writer.closing_sender.send(err.into()).await; // we ignore the error, because it means that the reader was dropped, which is ok.
                return;
            }
            match writer.socket.try_write(&output[total_written_bytes..]) {
                Ok(written_bytes) => {
                    total_written_bytes += written_bytes;
                }
                Err(err)
                    if err.kind() == io::ErrorKind::WouldBlock
                        || err.kind() == io::ErrorKind::Interrupted =>
                {
                    continue;
                }
                Err(err) => {
                    let _res = writer.closing_sender.send(err.into()).await; // we ignore the error, because it means that the reader was dropped, which is ok.
                }
            }
        }
        output.clear();
        output = writer.accumulated_outputs.replace(output);
    }
}

async fn write_closing_error(
    err: ClosingError,
    callback_index: u32,
    writer: &Rc<Writer>,
    identifier: &str,
) -> Result<(), io::Error> {
    let err = err.err_message;
    log_error(identifier, err.as_str());
    let mut response = Response::new();
    response.callback_idx = callback_index;
    response.value = Some(response::response::Value::ClosingError(err.into()));
    write_to_writer(response, writer).await
}

/// Create response and write it to the writer
async fn write_result(
    resp_result: ClientUsageResult<Value>,
    callback_index: u32,
    writer: &Rc<Writer>,
) -> Result<(), io::Error> {
    let mut response = Response::new();
    response.callback_idx = callback_index;
    response.is_push = false;
    response.value = match resp_result {
        Ok(Value::Okay) => Some(response::response::Value::ConstantResponse(
            response::ConstantResponse::OK.into(),
        )),
        Ok(value) => {
            if value != Value::Nil {
                // Since null values don't require any additional data, they can be sent without any extra effort.
                // Move the value to the heap and leak it. The wrapper should use `Box::from_raw` to recreate the box, use the value, and drop the allocation.
                let pointer = Box::leak(Box::new(value));
                let raw_pointer = pointer as *mut redis::Value;
                Some(response::response::Value::RespPointer(raw_pointer as u64))
            } else {
                None
            }
        }
        Err(ClientUsageError::Internal(error_message)) => {
            log_error("internal error", &error_message);
            Some(response::response::Value::ClosingError(
                error_message.into(),
            ))
        }
        Err(ClientUsageError::User(error_message)) => {
            log_error("user error", &error_message);
            let request_error = response::RequestError {
                type_: response::RequestErrorType::Unspecified.into(),
                message: error_message.into(),
                ..Default::default()
            };
            Some(response::response::Value::RequestError(request_error))
        }
        Err(ClientUsageError::Redis(err)) => {
            let error_message = error_message(&err);
            log_warn("received error", error_message.as_str());
            log_debug("received error", format!("for callback {}", callback_index));
            let request_error = response::RequestError {
                type_: match error_type(&err) {
                    RequestErrorType::Unspecified => response::RequestErrorType::Unspecified,
                    RequestErrorType::ExecAbort => response::RequestErrorType::ExecAbort,
                    RequestErrorType::Timeout => response::RequestErrorType::Timeout,
                    RequestErrorType::Disconnect => response::RequestErrorType::Disconnect,
                }
                .into(),
                message: error_message.into(),
                ..Default::default()
            };
            Some(response::response::Value::RequestError(request_error))
        }
    };
    write_to_writer(response, writer).await
}

async fn write_to_writer(response: Response, writer: &Rc<Writer>) -> Result<(), io::Error> {
    let mut vec = writer.accumulated_outputs.take();
    let encode_result = response.write_length_delimited_to_vec(&mut vec);

    // Write the response' length to the buffer
    match encode_result {
        Ok(_) => {
            writer.accumulated_outputs.set(vec);
            write_to_output(writer).await;
            Ok(())
        }
        Err(err) => {
            let err_message = format!("failed to encode response: {err}");
            log_error("response error", err_message.clone());
            Err(std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                err_message,
            ))
        }
    }
}

fn get_command(request: &Command) -> Option<Cmd> {
    let request_type: crate::request_type::RequestType = request.request_type.into();
    request_type.get_command()
}

fn get_redis_command(command: &Command) -> Result<Cmd, ClientUsageError> {
    let Some(mut cmd) = get_command(command) else {
        return Err(ClientUsageError::Internal(format!(
            "Received invalid request type: {:?}",
            command.request_type
        )));
    };

    match &command.args {
        Some(command::Args::ArgsArray(args_vec)) => {
            for arg in args_vec.args.iter() {
                cmd.arg(arg.as_ref());
            }
        }
        Some(command::Args::ArgsVecPointer(pointer)) => {
            let res = *unsafe { Box::from_raw(*pointer as *mut Vec<Bytes>) };
            for arg in res {
                cmd.arg(arg.as_ref());
            }
        }
        None => {
            return Err(ClientUsageError::Internal(
                "Failed to get request arguments, no arguments are set".to_string(),
            ));
        }
    };

    if cmd.args_iter().next().is_none() {
        return Err(ClientUsageError::User(
            "Received command without a command name or arguments".into(),
        ));
    }

    Ok(cmd)
}

async fn send_command(
    cmd: Cmd,
    mut client: Client,
    routing: Option<RoutingInfo>,
) -> ClientUsageResult<Value> {
    client
        .send_command(&cmd, routing)
        .await
        .map_err(|err| err.into())
}

// Parse the cluster scan command parameters from protobuf and send the command to redis-rs.
async fn cluster_scan(cluster_scan: ClusterScan, mut client: Client) -> ClientUsageResult<Value> {
    // Since we don't send the cluster scan as a usual command, but through a special function in redis-rs library,
    // we need to handle the command separately.
    // Specifically, we need to handle the cursor, which is not the cursor returned from the server,
    // but the ID of the ScanStateRC, stored in the cluster scan container.
    // We need to get the ref from the table or create a new one if the cursor is empty.
    let cursor: String = cluster_scan.cursor.into();
    let cluster_scan_cursor = if cursor.is_empty() {
        ScanStateRC::new()
    } else {
        get_cluster_scan_cursor(cursor)?
    };
    let mut cluster_scan_args_builder =
        ClusterScanArgs::builder().allow_non_covered_slots(cluster_scan.allow_non_covered_slots);
    if let Some(match_pattern) = cluster_scan.match_pattern {
        cluster_scan_args_builder =
            cluster_scan_args_builder.with_match_pattern::<Bytes>(match_pattern);
    }
    if let Some(count) = cluster_scan.count {
        cluster_scan_args_builder = cluster_scan_args_builder.with_count(count as u32);
    }
    if let Some(object_type) = cluster_scan.object_type {
        cluster_scan_args_builder =
            cluster_scan_args_builder.with_object_type(object_type.to_string().into());
    }
    let cluster_scan_args = cluster_scan_args_builder.build();

    client
        .cluster_scan(&cluster_scan_cursor, cluster_scan_args)
        .await
        .map_err(|err| err.into())
}

async fn invoke_script(
    hash: Chars,
    keys: Option<Vec<Bytes>>,
    args: Option<Vec<Bytes>>,
    mut client: Client,
    routing: Option<RoutingInfo>,
) -> ClientUsageResult<Value> {
    // convert Vec<bytes> to vec<[u8]>
    let keys: Vec<&[u8]> = keys
        .as_ref()
        .map(|keys| keys.iter().map(|e| e.as_ref()).collect())
        .unwrap_or_default();
    let args: Vec<&[u8]> = args
        .as_ref()
        .map(|keys| keys.iter().map(|e| e.as_ref()).collect())
        .unwrap_or_default();

    client
        .invoke_script(&hash, &keys, &args, routing)
        .await
        .map_err(|err| err.into())
}

async fn send_transaction(
    request: Transaction,
    client: &mut Client,
    routing: Option<RoutingInfo>,
) -> ClientUsageResult<Value> {
    let mut pipeline = redis::Pipeline::with_capacity(request.commands.capacity());
    pipeline.atomic();
    for command in request.commands {
        pipeline.add_command(get_redis_command(&command)?);
    }

    client
        .send_transaction(&pipeline, routing)
        .await
        .map_err(|err| err.into())
}

async fn send_pipeline(request: Pipeline, client: &mut Client) -> ClientUsageResult<Value> {
    let mut pipeline = redis::Pipeline::with_capacity(request.commands.capacity());
    for command in request.commands {
        pipeline.add_command(get_redis_command(&command)?);
    }

    client
        .send_pipeline(&pipeline)
        .await
        .map_err(|err| err.into())
}

fn get_slot_addr(slot_type: &protobuf::EnumOrUnknown<SlotTypes>) -> ClientUsageResult<SlotAddr> {
    slot_type
        .enum_value()
        .map(|slot_type| match slot_type {
            SlotTypes::Primary => SlotAddr::Master,
            SlotTypes::Replica => SlotAddr::ReplicaRequired,
        })
        .map_err(|id| ClientUsageError::Internal(format!("Received unexpected slot id type {id}")))
}

fn get_route(
    route: Option<Box<Routes>>,
    cmd: Option<&Cmd>,
) -> ClientUsageResult<Option<RoutingInfo>> {
    use crate::command_request::routes::Value;
    let Some(route) = route.and_then(|route| route.value) else {
        return Ok(None);
    };
    let get_response_policy = |cmd: Option<&Cmd>| {
        cmd.and_then(|cmd| {
            cmd.command()
                .and_then(|cmd| ResponsePolicy::for_command(&cmd))
        })
    };
    match route {
        Value::SimpleRoutes(simple_route) => {
            let simple_route = simple_route.enum_value().map_err(|id| {
                ClientUsageError::Internal(format!("Received unexpected simple route type {id}"))
            })?;
            match simple_route {
                crate::command_request::SimpleRoutes::AllNodes => Ok(Some(RoutingInfo::MultiNode(
                    (MultipleNodeRoutingInfo::AllNodes, get_response_policy(cmd)),
                ))),
                crate::command_request::SimpleRoutes::AllPrimaries => {
                    Ok(Some(RoutingInfo::MultiNode((
                        MultipleNodeRoutingInfo::AllMasters,
                        get_response_policy(cmd),
                    ))))
                }
                crate::command_request::SimpleRoutes::Random => {
                    Ok(Some(RoutingInfo::SingleNode(SingleNodeRoutingInfo::Random)))
                }
            }
        }
        Value::SlotKeyRoute(slot_key_route) => Ok(Some(RoutingInfo::SingleNode(
            SingleNodeRoutingInfo::SpecificNode(Route::new(
                redis::cluster_topology::get_slot(slot_key_route.slot_key.as_bytes()),
                get_slot_addr(&slot_key_route.slot_type)?,
            )),
        ))),
        Value::SlotIdRoute(slot_id_route) => Ok(Some(RoutingInfo::SingleNode(
            SingleNodeRoutingInfo::SpecificNode(Route::new(
                slot_id_route.slot_id as u16,
                get_slot_addr(&slot_id_route.slot_type)?,
            )),
        ))),
        Value::ByAddressRoute(by_address_route) => match u16::try_from(by_address_route.port) {
            Ok(port) => Ok(Some(RoutingInfo::SingleNode(
                SingleNodeRoutingInfo::ByAddress {
                    host: by_address_route.host.to_string(),
                    port,
                },
            ))),
            Err(err) => {
                log_warn("get route", format!("Failed to parse port: {err:?}"));
                Ok(None)
            }
        },
    }
}

fn handle_request(request: CommandRequest, mut client: Client, writer: Rc<Writer>) {
    task::spawn_local(async move {
        let mut updated_inflight_counter = true;
        let client_clone = client.clone();

        let result = match client.reserve_inflight_request() {
            false => {
                updated_inflight_counter = false;
                Err(ClientUsageError::User(
                    "Reached maximum inflight requests".to_string(),
                ))
            }
            true => match request.command {
                Some(action) => match action {
                    command_request::Command::ClusterScan(cluster_scan_command) => {
                        cluster_scan(cluster_scan_command, client).await
                    }
                    command_request::Command::SingleCommand(command) => {
                        match get_redis_command(&command) {
                            Ok(cmd) => match get_route(request.route.0, Some(&cmd)) {
                                Ok(routes) => send_command(cmd, client, routes).await,
                                Err(e) => Err(e),
                            },
                            Err(e) => Err(e),
                        }
                    }
                    command_request::Command::Transaction(transaction) => {
                        match get_route(request.route.0, None) {
                            Ok(routes) => send_transaction(transaction, &mut client, routes).await,
                            Err(e) => Err(e),
                        }
                    }
                    command_request::Command::Pipeline(pipeline) => {
                        send_pipeline(pipeline, &mut client).await
                    }
                    command_request::Command::ScriptInvocation(script) => {
                        match get_route(request.route.0, None) {
                            Ok(routes) => {
                                invoke_script(
                                    script.hash,
                                    Some(script.keys),
                                    Some(script.args),
                                    client,
                                    routes,
                                )
                                .await
                            }
                            Err(e) => Err(e),
                        }
                    }
                    command_request::Command::ScriptInvocationPointers(script) => {
                        let keys = script
                            .keys_pointer
                            .map(|pointer| *unsafe { Box::from_raw(pointer as *mut Vec<Bytes>) });
                        let args = script
                            .args_pointer
                            .map(|pointer| *unsafe { Box::from_raw(pointer as *mut Vec<Bytes>) });
                        match get_route(request.route.0, None) {
                            Ok(routes) => {
                                invoke_script(script.hash, keys, args, client, routes).await
                            }
                            Err(e) => Err(e),
                        }
                    }
                    command_request::Command::UpdateConnectionPassword(
                        update_connection_password_command,
                    ) => client
                        .update_connection_password(
                            update_connection_password_command
                                .password
                                .map(|chars| chars.to_string()),
                            update_connection_password_command.immediate_auth,
                        )
                        .await
                        .map_err(|err| err.into()),
                },
                None => {
                    log_debug(
                        "received error",
                        format!(
                            "Received empty request for callback {}",
                            request.callback_idx
                        ),
                    );
                    Err(ClientUsageError::Internal(
                        "Received empty request".to_string(),
                    ))
                }
            },
        };

        if updated_inflight_counter {
            client_clone.release_inflight_request();
        }

        let _res = write_result(result, request.callback_idx, &writer).await;
    });
}

async fn handle_requests(
    received_requests: Vec<CommandRequest>,
    client: &Client,
    writer: &Rc<Writer>,
) {
    for request in received_requests {
        handle_request(request, client.clone(), writer.clone());
    }
    // Yield to ensure that the subtasks aren't starved.
    task::yield_now().await;
}

pub fn close_socket(socket_path: &String) {
    log_info("close_socket", format!("closing socket at {socket_path}"));
    let _ = std::fs::remove_file(socket_path);
}

async fn create_client(
    writer: &Rc<Writer>,
    request: ConnectionRequest,
    push_tx: Option<mpsc::UnboundedSender<PushInfo>>,
) -> Result<Client, ClientCreationError> {
    let client = match Client::new(request.into(), push_tx).await {
        Ok(client) => client,
        Err(err) => return Err(ClientCreationError::ConnectionError(err)),
    };
    write_result(Ok(Value::Okay), 0, writer).await?;
    Ok(client)
}

async fn wait_for_connection_configuration_and_create_client(
    client_listener: &mut UnixStreamListener,
    writer: &Rc<Writer>,
    push_tx: Option<mpsc::UnboundedSender<PushInfo>>,
) -> Result<Client, ClientCreationError> {
    // Wait for the server's address
    match client_listener.next_values::<ConnectionRequest>().await {
        Closed(reason) => Err(ClientCreationError::SocketListenerClosed(reason)),
        ReceivedValues(mut received_requests) => {
            if let Some(request) = received_requests.pop() {
                create_client(writer, request, push_tx).await
            } else {
                Err(ClientCreationError::UnhandledError(
                    "No received requests".to_string(),
                ))
            }
        }
    }
}

async fn read_values_loop(
    mut client_listener: UnixStreamListener,
    client: &Client,
    writer: Rc<Writer>,
) -> ClosingReason {
    loop {
        match client_listener.next_values().await {
            Closed(reason) => {
                return reason;
            }
            ReceivedValues(received_requests) => {
                handle_requests(received_requests, client, &writer).await;
            }
        }
    }
}

async fn push_manager_loop(mut push_rx: mpsc::UnboundedReceiver<PushInfo>, writer: Rc<Writer>) {
    loop {
        let result = push_rx.recv().await;
        match result {
            None => {
                log_error("push manager loop", "got None from push manager");
                return;
            }
            Some(push_msg) => {
                log_debug("push manager loop", format!("got PushInfo: {:?}", push_msg));
                let mut response = Response::new();
                response.callback_idx = 0; // callback_idx is not used with push notifications
                response.is_push = true;
                response.value = {
                    let push_val = Value::Push {
                        kind: (push_msg.kind),
                        data: (push_msg.data),
                    };
                    let pointer = Box::leak(Box::new(push_val));
                    let raw_pointer = pointer as *mut redis::Value;
                    Some(response::response::Value::RespPointer(raw_pointer as u64))
                };

                _ = write_to_writer(response, &writer).await;
            }
        }
    }
}

async fn listen_on_client_stream(socket: UnixStream) {
    let socket = Rc::new(socket);
    // Spawn a new task to listen on this client's stream
    let write_lock = Mutex::new(());
    let mut client_listener = UnixStreamListener::new(socket.clone());
    let accumulated_outputs = Cell::new(Vec::new());
    let (sender, mut receiver) = channel(1);
    let (push_tx, push_rx) = tokio::sync::mpsc::unbounded_channel();
    let writer = Rc::new(Writer {
        socket,
        lock: write_lock,
        accumulated_outputs,
        closing_sender: sender,
    });
    let client_creation = wait_for_connection_configuration_and_create_client(
        &mut client_listener,
        &writer,
        Some(push_tx),
    );
    let client = match client_creation.await {
        Ok(conn) => conn,
        Err(ClientCreationError::SocketListenerClosed(ClosingReason::ReadSocketClosed)) => {
            // This isn't an error - it can happen when a new wrapper-client creates a connection in order to check whether something already listens on the socket.
            log_debug(
                "client creation",
                "read socket closed before client was created.",
            );
            return;
        }
        Err(ClientCreationError::SocketListenerClosed(reason)) => {
            let err_message = format!("Socket listener closed due to {reason:?}");
            let _res = write_closing_error(
                ClosingError { err_message },
                u32::MAX,
                &writer,
                "client creation",
            )
            .await;
            return;
        }
        Err(e @ ClientCreationError::UnhandledError(_))
        | Err(e @ ClientCreationError::IO(_))
        | Err(e @ ClientCreationError::ConnectionError(_)) => {
            let err_message = e.to_string();
            log_error("client creation", &err_message);
            let _res = write_closing_error(
                ClosingError { err_message },
                u32::MAX,
                &writer,
                "client creation",
            )
            .await;
            return;
        }
    };
    log_info("connection", "new connection started");
    tokio::select! {
            reader_closing = read_values_loop(client_listener, &client, writer.clone()) => {
                if let ClosingReason::UnhandledError(err) = reader_closing {
                    let _res = write_closing_error(ClosingError{err_message: err.to_string()}, u32::MAX, &writer, "client closing").await;
                };
                log_trace("client closing", "reader closed");
            },
            writer_closing = receiver.recv() => {
                if let Some(ClosingReason::UnhandledError(err)) = writer_closing {
                    log_error("client closing", format!("Writer closed with error: {err}"));
                } else {
                    log_trace("client closing", "writer closed");
                }
            },
            _ = push_manager_loop(push_rx, writer.clone()) => {
                log_trace("client closing", "push manager closed");
            }
    }
    log_trace("client closing", "closing connection");
}

#[derive(Debug)]
/// Enum describing the reason that a socket listener stopped listening on a socket.
pub enum ClosingReason {
    /// The socket was closed. This is the expected way that the listener should be closed.
    ReadSocketClosed,
    /// The listener encounter an error it couldn't handle.
    UnhandledError(RedisError),
}

impl From<io::Error> for ClosingReason {
    fn from(error: io::Error) -> Self {
        UnhandledError(error.into())
    }
}

/// Enum describing errors received during client creation.
#[derive(Debug, Error)]
enum ClientCreationError {
    #[error("IO error: {0}")]
    IO(#[from] std::io::Error),
    /// An error was returned during the client creation process.
    #[error("Unhandled error: {0}")]
    UnhandledError(String),
    /// Socket listener was closed before receiving the server address.
    #[error("Closing error: {0:?}")]
    SocketListenerClosed(ClosingReason),
    #[error("Connection error: {0:?}")]
    ConnectionError(crate::client::ConnectionError),
}

/// Enum describing errors received during client usage.
#[derive(Debug, Error)]
enum ClientUsageError {
    #[error("Redis error: {0}")]
    Redis(#[from] RedisError),
    /// An error that stems from wrong behavior of the client.
    #[error("Internal error: {0}")]
    Internal(String),
    /// An error that stems from wrong behavior of the user.
    #[error("User error: {0}")]
    User(String),
}

type ClientUsageResult<T> = Result<T, ClientUsageError>;

/// Defines errors caused the connection to close.
#[derive(Debug, Clone)]
struct ClosingError {
    /// A string describing the closing reason
    err_message: String,
}

/// Get the socket full path.
/// The socket file name will contain the process ID and will try to be saved into the user's runtime directory
/// (e.g. /run/user/1000) in Unix systems. If the runtime dir isn't found, the socket file will be saved to the temp dir.
/// For Windows, the socket file will be saved to %AppData%\Local.
pub fn get_socket_path_from_name(socket_name: String) -> String {
    let base_dirs = BaseDirs::new().expect("Failed to create BaseDirs");
    let tmp_dir;
    let folder = if cfg!(windows) {
        base_dirs.data_local_dir()
    } else {
        base_dirs.runtime_dir().unwrap_or({
            tmp_dir = env::temp_dir();
            tmp_dir.as_path()
        })
    };
    folder
        .join(socket_name)
        .into_os_string()
        .into_string()
        .expect("Couldn't create socket path")
}

/// Get the socket path as a string
pub fn get_socket_path() -> String {
    let socket_name = format!("{}-{}", SOCKET_FILE_NAME, std::process::id());
    get_socket_path_from_name(socket_name)
}

/// This function is exposed only for the sake of testing with a nonstandard `socket_path`.
/// Avoid using this function, unless you explicitly want to test the behavior of the listener
/// without using the sockets used by other tests.
pub fn start_socket_listener_internal<InitCallback>(
    init_callback: InitCallback,
    socket_path: Option<String>,
) where
    InitCallback: FnOnce(Result<String, String>) + Send + Clone + 'static,
{
    static INITIALIZED_SOCKETS: Lazy<RwLock<HashSet<String>>> =
        Lazy::new(|| RwLock::new(HashSet::new()));

    let socket_path = socket_path.unwrap_or_else(get_socket_path);

    {
        // Optimize for already initialized
        let initialized_sockets = INITIALIZED_SOCKETS
            .read()
            .expect("Failed to acquire sockets db read guard");
        if initialized_sockets.contains(&socket_path) {
            init_callback(Ok(socket_path.clone()));
            return;
        }
    }

    // Retry with write lock, will be dropped upon the function completion
    let mut sockets_write_guard = INITIALIZED_SOCKETS
        .write()
        .expect("Failed to acquire sockets db write guard");
    if sockets_write_guard.contains(&socket_path) {
        init_callback(Ok(socket_path.clone()));
        return;
    }

    let (tx, rx) = std::sync::mpsc::channel();
    let socket_path_cloned = socket_path.clone();
    let init_callback_cloned = init_callback.clone();
    let tx_cloned = tx.clone();
    thread::Builder::new()
        .name("socket_listener_thread".to_string())
        .spawn(move || {
            let init_result = {
                let runtime = match Builder::new_current_thread().enable_all().build() {
                    Err(err) => {
                        log_error(
                            "listen_on_socket",
                            format!("Error failed to create a new tokio thread: {err}"),
                        );
                        return Err(err);
                    }
                    Ok(runtime) => runtime,
                };

                runtime.block_on(async move {
                    let listener_socket = match UnixListener::bind(socket_path_cloned.clone()) {
                        Err(err) => {
                            log_error(
                                "listen_on_socket",
                                format!("Error failed to bind listening socket: {err}"),
                            );
                            return Err(err);
                        }
                        Ok(listener_socket) => listener_socket,
                    };

                    // Signal initialization is successful.
                    // IMPORTANT:
                    // tx.send() must be called before init_callback_cloned() to ensure runtimes, such as Python, can properly complete the main function
                    let _ = tx.send(true);
                    init_callback_cloned(Ok(socket_path_cloned.clone()));

                    let local_set_pool = LocalPoolHandle::new(num_cpus::get());
                    loop {
                        match listener_socket.accept().await {
                            Ok((stream, _addr)) => {
                                local_set_pool
                                    .spawn_pinned(move || listen_on_client_stream(stream));
                            }
                            Err(err) => {
                                log_error(
                                    "listen_on_socket",
                                    format!("Error accepting connection: {err}"),
                                );
                                break;
                            }
                        }
                    }

                    // ensure socket file removal
                    drop(listener_socket);
                    let _ = std::fs::remove_file(socket_path_cloned.clone());

                    // no more listening on socket - update the sockets db
                    let mut sockets_write_guard = INITIALIZED_SOCKETS
                        .write()
                        .expect("Failed to acquire sockets db write guard");
                    sockets_write_guard.remove(&socket_path_cloned);
                    Ok(())
                })
            };

            if let Err(err) = init_result {
                init_callback(Err(err.to_string()));
                let _ = tx_cloned.send(false);
            }
            Ok(())
        })
        .expect("Thread spawn failed. Cannot report error because callback was moved.");

    // wait for thread initialization signaling, callback invocation is done in the thread
    let _ = rx.recv().map(|res| {
        if res {
            sockets_write_guard.insert(socket_path);
        }
    });
}

/// Creates a new thread with a main loop task listening on the socket for new connections.
/// Every new connection will be assigned with a client-listener task to handle their requests.
///
/// # Arguments
/// * `init_callback` - called when the socket listener fails to initialize, with the reason for the failure.
pub fn start_socket_listener<InitCallback>(init_callback: InitCallback)
where
    InitCallback: FnOnce(Result<String, String>) + Send + Clone + 'static,
{
    start_socket_listener_internal(init_callback, None);
}
