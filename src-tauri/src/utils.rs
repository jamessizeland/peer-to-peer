use std::time::SystemTime;

/// Generate a Unix timestamp in Micros.
pub fn get_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap()
        .as_micros() as u64
}
