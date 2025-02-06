// Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

use glide_core::Telemetry;
use redis::GlideConnectionOptions;

#[cfg(not(target_env = "msvc"))]
use tikv_jemallocator::Jemalloc;

#[cfg(not(target_env = "msvc"))]
#[global_allocator]
static GLOBAL: Jemalloc = Jemalloc;
pub const FINISHED_SCAN_CURSOR: &str = "finished";
use byteorder::{LittleEndian, WriteBytesExt};
use bytes::Bytes;
use glide_core::start_socket_listener;
use glide_core::MAX_REQUEST_ARGS_LENGTH;
#[cfg(feature = "testing_utilities")]
use napi::bindgen_prelude::BigInt;
use napi::bindgen_prelude::Either;
use napi::bindgen_prelude::Uint8Array;
use napi::{Env, Error, JsObject, JsUnknown, Result, Status};
use napi_derive::napi;
use num_traits::sign::Signed;
use redis::{aio::MultiplexedConnection, AsyncCommands, Value};
#[cfg(feature = "testing_utilities")]
use std::collections::HashMap;
use std::ptr::from_mut;
use std::str;
use tokio::runtime::{Builder, Runtime};
#[napi]
pub enum Level {
    Debug = 3,
    Error = 0,
    Info = 2,
    Trace = 4,
    Warn = 1,
    Off = 5,
}

#[napi]
pub const MAX_REQUEST_ARGS_LEN: u32 = MAX_REQUEST_ARGS_LENGTH as u32;

#[napi]
pub const DEFAULT_REQUEST_TIMEOUT_IN_MILLISECONDS: u32 =
    glide_core::client::DEFAULT_RESPONSE_TIMEOUT.as_millis() as u32;

#[napi]
pub const DEFAULT_CONNECTION_TIMEOUT_IN_MILLISECONDS: u32 =
    glide_core::client::DEFAULT_CONNECTION_TIMEOUT.as_millis() as u32;

#[napi]
pub const DEFAULT_INFLIGHT_REQUESTS_LIMIT: u32 = glide_core::client::DEFAULT_MAX_INFLIGHT_REQUESTS;

#[napi]
struct AsyncClient {
    #[allow(dead_code)]
    connection: MultiplexedConnection,
    runtime: Runtime,
}

fn to_js_error(err: impl std::error::Error) -> Error {
    napi::Error::new(Status::Unknown, err.to_string())
}

fn to_js_result<T, E: std::error::Error>(result: std::result::Result<T, E>) -> Result<T> {
    result.map_err(to_js_error)
}

#[napi]
impl AsyncClient {
    #[napi(js_name = "CreateConnection")]
    #[allow(dead_code)]
    pub fn create_connection(connection_address: String) -> Result<AsyncClient> {
        let runtime = Builder::new_multi_thread()
            .enable_all()
            .worker_threads(1)
            .thread_name("GLIDE node thread")
            .build()?;
        let _runtime_handle = runtime.enter();
        let client = to_js_result(redis::Client::open(connection_address))?;
        let connection =
            to_js_result(runtime.block_on(
                client.get_multiplexed_async_connection(GlideConnectionOptions::default()),
            ))?;
        Ok(AsyncClient {
            connection,
            runtime,
        })
    }

    #[napi(ts_return_type = "Promise<string | Buffer | null>")]
    #[allow(dead_code)]
    pub fn get(&self, env: Env, key: String) -> Result<JsObject> {
        let (deferred, promise) = env.create_deferred()?;

        let mut connection = self.connection.clone();
        self.runtime.spawn(async move {
            let result: Result<Option<String>> = to_js_result(connection.get(key).await);
            match result {
                Ok(value) => deferred.resolve(|_| Ok(value)),
                Err(e) => deferred.reject(e),
            }
        });

        Ok(promise)
    }

    #[napi(ts_return_type = "Promise<string | Buffer | \"OK\" | null>")]
    #[allow(dead_code)]
    pub fn set(&self, env: Env, key: String, value: String) -> Result<JsObject> {
        let (deferred, promise) = env.create_deferred()?;

        let mut connection = self.connection.clone();
        self.runtime.spawn(async move {
            let result: Result<()> = to_js_result(connection.set(key, value).await);
            match result {
                Ok(_) => deferred.resolve(|_| Ok("OK")),
                Err(e) => deferred.reject(e),
            }
        });

        Ok(promise)
    }
}

#[napi(js_name = "StartSocketConnection", ts_return_type = "Promise<string>")]
pub fn start_socket_listener_external(env: Env) -> Result<JsObject> {
    let (deferred, promise) = env.create_deferred()?;

    start_socket_listener(move |result| {
        match result {
            Ok(path) => deferred.resolve(|_| Ok(path)),
            Err(error_message) => deferred.reject(napi::Error::new(Status::Unknown, error_message)),
        };
    });

    Ok(promise)
}

impl From<logger_core::Level> for Level {
    fn from(level: logger_core::Level) -> Self {
        match level {
            logger_core::Level::Error => Level::Error,
            logger_core::Level::Warn => Level::Warn,
            logger_core::Level::Info => Level::Info,
            logger_core::Level::Debug => Level::Debug,
            logger_core::Level::Trace => Level::Trace,
            logger_core::Level::Off => Level::Off,
        }
    }
}

impl From<Level> for logger_core::Level {
    fn from(level: Level) -> logger_core::Level {
        match level {
            Level::Error => logger_core::Level::Error,
            Level::Warn => logger_core::Level::Warn,
            Level::Info => logger_core::Level::Info,
            Level::Debug => logger_core::Level::Debug,
            Level::Trace => logger_core::Level::Trace,
            Level::Off => logger_core::Level::Off,
        }
    }
}

#[napi]
pub fn log(log_level: Level, log_identifier: String, message: String) {
    logger_core::log(log_level.into(), log_identifier, message);
}

#[napi(js_name = "InitInternalLogger")]
pub fn init(level: Option<Level>, file_name: Option<&str>) -> Level {
    let logger_level = logger_core::init(level.map(|level| level.into()), file_name);
    logger_level.into()
}

fn resp_value_to_js(val: Value, js_env: Env, string_decoder: bool) -> Result<JsUnknown> {
    match val {
        Value::Nil => js_env.get_null().map(|val| val.into_unknown()),
        Value::SimpleString(str) => {
            if string_decoder {
                Ok(js_env
                    .create_string_from_std(str)
                    .map(|val| val.into_unknown())?)
            } else {
                Ok(js_env
                    .create_buffer_with_data(str.as_bytes().to_vec())?
                    .into_unknown())
            }
        }
        Value::Okay => js_env.create_string("OK").map(|val| val.into_unknown()),
        Value::Int(num) => js_env.create_int64(num).map(|val| val.into_unknown()),
        Value::BulkString(data) => {
            if string_decoder {
                let str = to_js_result(std::str::from_utf8(data.as_ref()))?;
                Ok(js_env.create_string(str).map(|val| val.into_unknown())?)
            } else {
                Ok(js_env.create_buffer_with_data(data)?.into_unknown())
            }
        }
        Value::Array(array) => {
            let mut js_array_view = js_env.create_array_with_length(array.len())?;
            for (index, item) in array.into_iter().enumerate() {
                js_array_view.set_element(
                    index as u32,
                    resp_value_to_js(item, js_env, string_decoder)?,
                )?;
            }
            Ok(js_array_view.into_unknown())
        }
        Value::Map(map) => {
            // Convert map to array of key-value pairs instead of a `Record` (object),
            // because `Record` does not support `GlideString` as a key.
            // The result is in format `GlideRecord<T>`.
            let mut js_array = js_env.create_array_with_length(map.len())?;
            for (idx, (key, value)) in (0_u32..).zip(map.into_iter()) {
                let mut obj = js_env.create_object()?;
                obj.set_named_property("key", resp_value_to_js(key, js_env, string_decoder)?)?;
                obj.set_named_property("value", resp_value_to_js(value, js_env, string_decoder)?)?;
                js_array.set_element(idx, obj)?;
            }
            Ok(js_array.into_unknown())
        }
        Value::Double(float) => js_env.create_double(float).map(|val| val.into_unknown()),
        Value::Boolean(bool) => js_env.get_boolean(bool).map(|val| val.into_unknown()),
        // format is ignored, as per the RESP3 recommendations -
        // "Normal client libraries may ignore completely the difference between this"
        // "type and the String type, and return a string in both cases.""
        // https://github.com/redis/redis-specifications/blob/master/protocol/RESP3.md
        Value::VerbatimString { format: _, text } => {
            if string_decoder {
                Ok(js_env
                    .create_string_from_std(text)
                    .map(|val| val.into_unknown())?)
            } else {
                // VerbatimString is binary safe -> convert it into such
                Ok(js_env
                    .create_buffer_with_data(text.as_bytes().to_vec())?
                    .into_unknown())
            }
        }
        Value::BigNumber(num) => {
            let sign = num.is_negative();
            let words = num.iter_u64_digits().collect();
            js_env
                .create_bigint_from_words(sign, words)
                .and_then(|val| val.into_unknown())
        }
        Value::Set(array) => {
            // TODO - return a set object instead of an array object
            let mut js_array_view = js_env.create_array_with_length(array.len())?;
            for (index, item) in array.into_iter().enumerate() {
                js_array_view.set_element(
                    index as u32,
                    resp_value_to_js(item, js_env, string_decoder)?,
                )?;
            }
            Ok(js_array_view.into_unknown())
        }
        Value::Attribute { data, attributes } => {
            let mut obj = js_env.create_object()?;
            let value = resp_value_to_js(*data, js_env, string_decoder)?;
            obj.set_named_property("value", value)?;

            let value = resp_value_to_js(Value::Map(attributes), js_env, string_decoder)?;
            obj.set_named_property("attributes", value)?;

            Ok(obj.into_unknown())
        }
        Value::Push { kind, data } => {
            let mut obj = js_env.create_object()?;
            obj.set_named_property("kind", format!("{kind:?}"))?;
            let js_array_view = data
                .into_iter()
                .map(|item| resp_value_to_js(item, js_env, string_decoder))
                .collect::<Result<Vec<_>, _>>()?;
            obj.set_named_property("values", js_array_view)?;
            Ok(obj.into_unknown())
        }
    }
}

#[napi(
    ts_return_type = "null | string | Uint8Array | number | {} | Boolean | BigInt | Set<any> | any[] | Buffer"
)]
pub fn value_from_split_pointer(
    js_env: Env,
    high_bits: u32,
    low_bits: u32,
    string_decoder: bool,
) -> Result<JsUnknown> {
    let mut bytes = [0_u8; 8];
    (&mut bytes[..4])
        .write_u32::<LittleEndian>(low_bits)
        .unwrap();
    (&mut bytes[4..])
        .write_u32::<LittleEndian>(high_bits)
        .unwrap();
    let pointer = u64::from_le_bytes(bytes);
    let value = unsafe { Box::from_raw(pointer as *mut Value) };
    resp_value_to_js(*value, js_env, string_decoder)
}

// Pointers are split because JS cannot represent a full usize using its `number` object.
// The pointer is split into 2 `number`s, and then combined back in `value_from_split_pointer`.
fn split_pointer<T>(pointer: *mut T) -> [u32; 2] {
    let pointer = pointer as usize;
    let bytes = usize::to_le_bytes(pointer);
    let [lower, higher] = unsafe { std::mem::transmute::<[u8; 8], [u32; 2]>(bytes) };
    [lower, higher]
}

#[napi(ts_return_type = "[number, number]")]
/// @internal @test
/// This function is for tests that require a value allocated on the heap.
/// Should NOT be used in production.
#[cfg(feature = "testing_utilities")]
pub fn create_leaked_string(message: String) -> [u32; 2] {
    let value = Value::SimpleString(message);
    let pointer = from_mut(Box::leak(Box::new(value)));
    split_pointer(pointer)
}

#[napi(ts_return_type = "[number, number]")]
/// @internal @test
/// This function is for tests that require a value allocated on the heap.
/// Should NOT be used in production.
pub fn create_leaked_string_vec(message: Vec<Uint8Array>) -> [u32; 2] {
    // Convert the string vec -> Bytes vector
    let bytes_vec: Vec<Bytes> = message.iter().map(|v| Bytes::from(v.to_vec())).collect();
    let pointer = from_mut(Box::leak(Box::new(bytes_vec)));
    split_pointer(pointer)
}

#[napi(ts_return_type = "[number, number]")]
/// @internal @test
/// This function is for tests that require a value allocated on the heap.
/// Should NOT be used in production.
#[cfg(feature = "testing_utilities")]
pub fn create_leaked_map(map: HashMap<String, String>) -> [u32; 2] {
    let pointer = from_mut(Box::leak(Box::new(Value::Map(
        map.into_iter()
            .map(|(key, value)| (Value::SimpleString(key), Value::SimpleString(value)))
            .collect(),
    ))));
    split_pointer(pointer)
}

#[napi(ts_return_type = "[number, number]")]
/// @internal @test
/// This function is for tests that require a value allocated on the heap.
/// Should NOT be used in production.
#[cfg(feature = "testing_utilities")]
pub fn create_leaked_array(array: Vec<String>) -> [u32; 2] {
    let pointer = from_mut(Box::leak(Box::new(Value::Array(
        array.into_iter().map(Value::SimpleString).collect(),
    ))));
    split_pointer(pointer)
}

#[napi(ts_return_type = "[number, number]")]
/// @internal @test
/// This function is for tests that require a value allocated on the heap.
/// Should NOT be used in production.
#[cfg(feature = "testing_utilities")]
pub fn create_leaked_attribute(message: String, attribute: HashMap<String, String>) -> [u32; 2] {
    let pointer = from_mut(Box::leak(Box::new(Value::Attribute {
        data: Box::new(Value::SimpleString(message)),
        attributes: attribute
            .into_iter()
            .map(|(key, value)| (Value::SimpleString(key), Value::SimpleString(value)))
            .collect(),
    })));
    split_pointer(pointer)
}

#[napi(ts_return_type = "[number, number]")]
/// @internal @test
/// This function is for tests that require a value allocated on the heap.
/// Should NOT be used in production.
#[cfg(feature = "testing_utilities")]
pub fn create_leaked_bigint(big_int: BigInt) -> [u32; 2] {
    let pointer = from_mut(Box::leak(Box::new(Value::BigNumber(
        num_bigint::BigInt::new(
            if big_int.sign_bit {
                num_bigint::Sign::Minus
            } else {
                num_bigint::Sign::Plus
            },
            big_int
                .words
                .into_iter()
                .flat_map(|word| {
                    let bytes = u64::to_le_bytes(word);
                    unsafe { std::mem::transmute::<[u8; 8], [u32; 2]>(bytes) }
                })
                .collect(),
        ),
    ))));
    split_pointer(pointer)
}

#[napi(ts_return_type = "[number, number]")]
/// @internal @test
/// This function is for tests that require a value allocated on the heap.
/// Should NOT be used in production.
#[cfg(feature = "testing_utilities")]
pub fn create_leaked_double(float: f64) -> [u32; 2] {
    let pointer = from_mut(Box::leak(Box::new(Value::Double(float))));
    split_pointer(pointer)
}

#[napi]
/// A wrapper for a script object. As long as this object is alive, the script's code is saved in memory, and can be resent to the server.
struct Script {
    hash: String,
}

#[napi]
impl Script {
    /// Construct with the script's code.
    #[napi(constructor)]
    #[allow(dead_code)]
    pub fn new(code: Either<String, Uint8Array>) -> Self {
        let hash = match code {
            Either::A(code_str) => glide_core::scripts_container::add_script(code_str.as_bytes()),
            Either::B(code_bytes) => glide_core::scripts_container::add_script(&code_bytes),
        };
        Self { hash }
    }

    /// Returns the hash of the script.
    #[napi]
    #[allow(dead_code)]
    pub fn get_hash(&self) -> String {
        self.hash.clone()
    }
}

impl Drop for Script {
    fn drop(&mut self) {
        glide_core::scripts_container::remove_script(&self.hash);
    }
}

/// This struct is used to keep track of the cursor of a cluster scan.
/// We want to avoid passing the cursor between layers of the application,
/// So we keep the state in the container and only pass the id of the cursor.
/// The cursor is stored in the container and can be retrieved using the id.
/// The cursor is removed from the container when the object is deleted (dropped).
/// To create a cursor:
/// ```typescript
/// // For a new cursor
/// let cursor = new ClusterScanCursor();
/// // Using an existing id
/// let cursor = new ClusterScanCursor("cursor_id");
/// ```
/// To get the cursor id:
/// ```typescript
/// let cursorId = cursor.getCursor();
/// ```
/// To check if the scan is finished:
/// ```typescript
/// let isFinished = cursor.isFinished(); // true if the scan is finished
/// ```
#[napi]
#[derive(Default)]
pub struct ClusterScanCursor {
    cursor: String,
}

#[napi]
impl ClusterScanCursor {
    #[napi(constructor)]
    #[allow(dead_code)]
    pub fn new(new_cursor: Option<String>) -> Self {
        match new_cursor {
            Some(cursor) => ClusterScanCursor { cursor },
            None => ClusterScanCursor::default(),
        }
    }

    /// Returns the cursor id.
    #[napi]
    #[allow(dead_code)]
    pub fn get_cursor(&self) -> String {
        self.cursor.clone()
    }

    #[napi]
    #[allow(dead_code)]
    /// Returns true if the scan is finished.
    pub fn is_finished(&self) -> bool {
        self.cursor.eq(FINISHED_SCAN_CURSOR)
    }
}

impl Drop for ClusterScanCursor {
    fn drop(&mut self) {
        glide_core::cluster_scan_container::remove_scan_state_cursor(self.cursor.clone());
    }
}

#[napi]
pub fn get_statistics(env: Env) -> Result<JsObject> {
    let total_connections = Telemetry::total_connections().to_string();
    let total_clients = Telemetry::total_clients().to_string();
    let mut stats: JsObject = env.create_object()?;
    stats.set_named_property("total_connections", total_connections)?;
    stats.set_named_property("total_clients", total_clients)?;

    Ok(stats)
}
