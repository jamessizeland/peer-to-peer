use anyhow::Context as _;
use iroh::SecretKey;
use std::{collections::HashMap, sync::Arc};
use tauri::Wry;
use tauri_plugin_store::{Store, StoreExt as _};

use crate::{chat::ChatTicket, utils::get_timestamp};

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
    fn get_visited_rooms_inner(&self) -> HashMap<String, (u64, ChatTicket)> {
        self.0
            .get("visited")
            .map(|val| serde_json::from_value(val).unwrap_or_default())
            .unwrap_or_default()
    }
    /// Return the list of visited rooms in order of most recently visited
    pub fn get_visited_rooms(&self) -> Vec<ChatTicket> {
        let rooms = self.get_visited_rooms_inner();
        let mut list: Vec<_> = rooms.values().cloned().collect();
        list.sort_by_key(|room| room.0);
        dbg!(list.into_iter().map(|room| room.1).collect())
    }
    /// Add or update a room in the list of visited rooms
    pub fn update_visited_room(&self, ticket: ChatTicket) -> anyhow::Result<()> {
        let visited = get_timestamp();
        let mut rooms = self.get_visited_rooms_inner();
        rooms
            .entry(ticket.topic_id.to_string())
            .and_modify(|(v, t)| {
                *v = visited;
                *t = ticket.clone();
            })
            .or_insert((visited, ticket));
        self.0.set("visited", serde_json::to_value(rooms)?);
        Ok(())
    }
    /// Delete a room from the list of visited rooms
    pub fn delete_visited_room(&self, topic_id: &str) -> anyhow::Result<()> {
        let mut rooms = self.get_visited_rooms_inner();
        if rooms.remove_entry(topic_id).is_none() {
            tracing::info!("{} not found when deleting rooms", topic_id);
        };
        self.0.set("visited", serde_json::to_value(rooms)?);
        Ok(())
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
