use anyhow::Context as _;
use iroh::SecretKey;
use std::{sync::Arc, time::SystemTime};
use tauri::Wry;
use tauri_plugin_store::{Store, StoreExt as _};

pub struct AppStore(Arc<Store<Wry>>);

impl AppStore {
    /// Get a handle for the persistent background store of this application
    pub fn acquire(app: &tauri::AppHandle) -> anyhow::Result<Self> {
        const STORE: &str = "store.json";
        let store = app
            .store(STORE)
            .context("failed to open store when saving game state.")?;
        Ok(Self(store))
    }
    pub fn get_nickname(&self) -> Option<String> {
        self.0
            .get("nickname")
            .and_then(|val| serde_json::from_value(val).ok())
    }
    pub fn set_nickname(&self, nickname: &str) -> anyhow::Result<()> {
        self.0.set("nickname", serde_json::to_value(nickname)?);
        Ok(())
    }
    /// Return the list of recently visited rooms
    #[allow(unused)]
    pub fn get_recent_rooms(&self) -> Vec<String> {
        self.0
            .get("visited")
            .map(|val| serde_json::from_value(val).unwrap_or_default())
            .unwrap_or_default()
    }
    pub fn get_secret_key(&self) -> anyhow::Result<SecretKey> {
        match self.0.get("key") {
            Some(val) => match serde_json::from_value::<SecretKey>(val) {
                Ok(key) => Ok(key),
                Err(_) => {
                    let key = SecretKey::generate(rand::rngs::OsRng);
                    self.0.set("key", serde_json::to_value(&key)?);
                    Ok(key)
                }
            },
            None => {
                let key = SecretKey::generate(rand::rngs::OsRng);
                self.0.set("key", serde_json::to_value(&key)?);
                Ok(key)
            }
        }
    }
}

/// Generate a Unix timestamp in Micros.
pub fn get_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap()
        .as_micros() as u64
}
