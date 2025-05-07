use std::time::Duration;

use iroh::NodeId;
use serde::{Deserialize, Serialize};

/// Information for the frontend to display about known peers
/// in the Gossip Swarm.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PeerInfo {
    pub id: NodeId,
    pub nickname: String,
    pub last_seen: Duration,
    pub role: PeerRole,
    pub status: PeerStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PeerRole {
    Myself,
    RemoteNode,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PeerStatus {
    Online,
    Away,
    Offline,
}
