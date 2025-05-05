use anyhow::Context as _;
use std::sync::Arc;
use tauri::Wry;
use tauri_plugin_store::{Store, StoreExt as _};

/// Get a handle for the persistent background store of this application
pub fn get_store(app: &tauri::AppHandle) -> anyhow::Result<Arc<Store<Wry>>> {
    const STORE: &str = "store.json";
    app.store(STORE)
        .context("failed to open store when saving game state.")
}
