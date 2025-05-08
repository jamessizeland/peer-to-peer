use std::collections::{HashMap, HashSet};

use iroh::NodeId;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter as _};

use crate::utils::get_timestamp;

use super::Event;

#[derive(Default)]
pub struct PeerMap(HashMap<NodeId, PeerInfo>);

impl PeerMap {
    pub fn to_vec(&self) -> Vec<PeerInfo> {
        self.0.values().cloned().collect()
    }
    /// Update the activity of the peers list. Returns a list of updated peers if updated.
    pub fn update(
        &mut self,
        event: Option<&Event>,
        new_starters: &mut HashSet<NodeId>,
        app: &AppHandle,
    ) {
        let before = self.to_vec();
        let map = &mut self.0;
        match event {
            Some(Event::Joined { neighbors }) => {
                for &id in neighbors {
                    new_starters.insert(id);
                    map.entry(id)
                        .and_modify(|peer| {
                            peer.status = PeerStatus::Online;
                            peer.last_seen = get_timestamp();
                        })
                        .or_insert(PeerInfo::new(id, None));
                }
            }
            Some(Event::Presence {
                from: id,
                nickname,
                sent_timestamp,
            }) => {
                if new_starters.remove(id) {
                    if let Err(e) = app.emit("peers-new", nickname) {
                        tracing::error!("Failed to emit event to frontend: {}", e);
                    }
                }
                map.entry(*id)
                    .and_modify(|peer| {
                        peer.nickname = nickname.clone();
                        peer.last_seen = *sent_timestamp;
                        peer.status = PeerStatus::Online;
                    })
                    .or_insert(PeerInfo::new(*id, Some(nickname.clone())));
            }
            None => {
                // tick at regular intervals to update the peerStatus
                for peer in map.values_mut() {
                    let millis_since_last_seen =
                        (get_timestamp().saturating_sub(peer.last_seen)) / 1000;
                    match millis_since_last_seen {
                        0..=10_000 => peer.status = PeerStatus::Online,
                        10_001..=30_000 => peer.status = PeerStatus::Away,
                        _ => peer.status = PeerStatus::Offline,
                    }
                }
            }
            _ => return, // ignore other events for now,
        }
        let after = self.to_vec();
        if before != after {
            if let Err(e) = app.emit("peers-event", after) {
                tracing::error!("Failed to emit event to frontend: {}", e);
            }
        }
    }
}

/// Information for the frontend to display about known peers
/// in the Gossip Swarm.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PeerInfo {
    pub id: NodeId,
    pub nickname: String,
    pub last_seen: u64,
    pub role: PeerRole,
    pub status: PeerStatus,
}

impl PeerInfo {
    fn new(id: NodeId, nickname: Option<String>) -> Self {
        Self {
            id,
            nickname: nickname.unwrap_or("identifying...".to_string()),
            last_seen: get_timestamp(),
            role: PeerRole::RemoteNode,
            status: PeerStatus::Online,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum PeerRole {
    Myself,
    RemoteNode,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum PeerStatus {
    Online,
    Away,
    Offline,
}
