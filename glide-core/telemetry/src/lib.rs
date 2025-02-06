use lazy_static::lazy_static;
use serde::Serialize;
use std::sync::RwLock as StdRwLock;
mod open_telemetry;
mod open_telemetry_exporter_file;

pub use open_telemetry::*;
pub use open_telemetry_exporter_file::SpanExporterFile;

#[derive(Default, Serialize)]
#[allow(dead_code)]
pub struct Telemetry {
    /// Total number of connections opened to Valkey
    total_connections: usize,
    /// Total number of GLIDE clients
    total_clients: usize,
}

lazy_static! {
    static ref TELEMETRY: StdRwLock<Telemetry> = StdRwLock::<Telemetry>::default();
}

const MUTEX_WRITE_ERR: &str = "Failed to obtain write lock for mutex. Poisoned mutex";
const MUTEX_READ_ERR: &str = "Failed to obtain read lock for mutex. Poisoned mutex";

impl Telemetry {
    /// Increment the total number of connections by `incr_by`
    /// Return the number of total connections after the increment
    pub fn incr_total_connections(incr_by: usize) -> usize {
        let mut t = TELEMETRY.write().expect(MUTEX_WRITE_ERR);
        t.total_connections = t.total_connections.saturating_add(incr_by);
        t.total_connections
    }

    /// Decrease the total number of connections by `decr_by`
    /// Return the number of total connections after the decrease
    pub fn decr_total_connections(decr_by: usize) -> usize {
        let mut t = TELEMETRY.write().expect(MUTEX_WRITE_ERR);
        t.total_connections = t.total_connections.saturating_sub(decr_by);
        t.total_connections
    }

    /// Increment the total number of clients by `incr_by`
    /// Return the number of total clients after the increment
    pub fn incr_total_clients(incr_by: usize) -> usize {
        let mut t = TELEMETRY.write().expect(MUTEX_WRITE_ERR);
        t.total_clients = t.total_clients.saturating_add(incr_by);
        t.total_clients
    }

    /// Decrease the total number of clients by `decr_by`
    /// Return the number of total clients after the decrease
    pub fn decr_total_clients(decr_by: usize) -> usize {
        let mut t = TELEMETRY.write().expect(MUTEX_WRITE_ERR);
        t.total_clients = t.total_clients.saturating_sub(decr_by);
        t.total_clients
    }

    /// Return the number of active connections
    pub fn total_connections() -> usize {
        TELEMETRY.read().expect(MUTEX_READ_ERR).total_connections
    }

    /// Return the number of active clients
    pub fn total_clients() -> usize {
        TELEMETRY.read().expect(MUTEX_READ_ERR).total_clients
    }

    /// Reset the telemetry collected thus far
    pub fn reset() {
        *TELEMETRY.write().expect(MUTEX_WRITE_ERR) = Telemetry::default();
    }
}
