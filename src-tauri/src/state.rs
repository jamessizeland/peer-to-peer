use crate::chat::{
    self,
    channel::{Channel, TicketOpts},
    peers::PeerInfo,
    ChatNode, ChatSender, Event,
};
use anyhow::anyhow;
use iroh::NodeId;
use n0_future::{task::AbortOnDropHandle, StreamExt as _};
use std::{collections::HashMap, sync::Arc};
use tauri::{AppHandle, Emitter as _};
use tokio::sync::Mutex as TokioMutex;

/// Holds information about the currently active chat channel.
pub struct ActiveChannel {
    inner: chat::channel::Channel,
    receiver_handle: AbortOnDropHandle<()>,
}

impl ActiveChannel {
    pub fn new(inner: chat::channel::Channel, receiver_handle: AbortOnDropHandle<()>) -> Self {
        Self {
            inner,
            receiver_handle,
        }
    }
}

/// Holds the application's runtime context, including the iroh client,
/// game document handle, current game state, and background task handles.
pub struct AppContext {
    // The iroh client instance used for all interactions. Option<> because it's initialized async.
    pub node: Arc<TokioMutex<Option<ChatNode>>>,
    pub nickname: Arc<TokioMutex<Option<String>>>, // Nickname needs to be shared
    active_channel: Arc<TokioMutex<Option<ActiveChannel>>>,
    pub latest_ticket: Arc<TokioMutex<Option<String>>>,
    peers: Arc<TokioMutex<HashMap<NodeId, PeerInfo>>>,
}

impl AppContext {
    /// Creates a new, empty AppContext.
    pub fn new() -> Self {
        Self {
            node: Arc::new(TokioMutex::new(None)),
            nickname: Arc::new(TokioMutex::new(None)),
            active_channel: Arc::new(TokioMutex::new(None)),
            latest_ticket: Arc::new(TokioMutex::new(None)),
            peers: Arc::new(TokioMutex::new(HashMap::new())),
        }
    }
    /// Return a list of the known members of this Gossip Swarm.
    pub async fn get_peers(&self) -> Vec<PeerInfo> {
        let peers = self.peers.lock().await;
        peers.values().cloned().collect()
    }
    /// Get the active channel's topic ID.
    pub async fn get_topic_id(&self) -> anyhow::Result<String> {
        match self.active_channel.lock().await.as_ref() {
            Some(channel) => Ok(channel.inner.id()),
            None => Err(anyhow!("Could not get Topic ID. No active channel.")),
        }
    }
    /// Generate a new ticket token string.
    pub async fn generate_ticket(&self, options: TicketOpts) -> anyhow::Result<String> {
        match self.active_channel.lock().await.as_ref() {
            Some(channel) => channel.inner.ticket(options),
            None => Err(anyhow!("Could not generate ticket. No active channel.")),
        }
    }
    /// Send a message on the active channel. Returns active topic ID.
    pub async fn get_sender(&self) -> anyhow::Result<ChatSender> {
        match self.active_channel.lock().await.as_ref() {
            Some(channel) => Ok(channel.inner.sender()),
            None => Err(anyhow!("Could not get sender. No active channel.")),
        }
    }
    /// Set the nickname of the active node.
    pub async fn set_nickname(&self, nickname: String) -> anyhow::Result<()> {
        match self.active_channel.lock().await.as_ref() {
            Some(channel) => {
                channel.inner.sender().set_nickname(nickname);
                Ok(())
            }
            None => Err(anyhow!("Could not set nickname. No active channel.")),
        }
    }
    /// Close our connection to this room.  Returns deactivated topic ID.
    pub async fn drop_channel(&self) -> anyhow::Result<Option<String>> {
        match self.active_channel.lock().await.take() {
            Some(channel) => {
                channel.receiver_handle.abort();
                Ok(Some(channel.inner.id()))
            }
            None => Ok(None),
        }
    }
    pub async fn start_channel(
        &self,
        domain_channel: Channel,
        app_handle: AppHandle,
        receiver: n0_future::stream::Boxed<anyhow::Result<Event>>,
    ) -> anyhow::Result<String> {
        // Spawn the event listener task
        let receiver_handle = self.spawn_event_listener(app_handle, receiver);
        // Store the active channel info
        *self.active_channel.lock().await =
            Some(ActiveChannel::new(domain_channel, receiver_handle));
        // Get the topic_id from the established channel for logging
        let topic_id_str = self.get_topic_id().await?;
        tracing::info!(
            "Active channel SET in join_room for topic: {}",
            topic_id_str
        );
        Ok(topic_id_str)
    }
    /// Spawns a background task to listen for chat events and emit them to the frontend.
    fn spawn_event_listener(
        &self,
        app: tauri::AppHandle,
        mut receiver: n0_future::stream::Boxed<anyhow::Result<Event>>,
    ) -> AbortOnDropHandle<()> {
        AbortOnDropHandle::new(n0_future::task::spawn(async move {
            loop {
                match receiver.next().await {
                    Some(Ok(event)) => {
                        if let Err(e) = app.emit("chat-event", &event) {
                            tracing::error!("Failed to emit event to frontend: {}", e);
                        }
                    }
                    Some(Err(e)) => {
                        tracing::error!("Error receiving chat event: {}", e);
                        // Optionally emit an error event to the frontend
                        let _ = app.emit(
                            "chat-error",
                            Event::Errorred {
                                message: e.to_string(),
                            },
                        );
                        break; // Stop listening on error
                    }
                    None => {
                        tracing::info!("Chat event stream ended.");
                        let _ = app.emit("chat-event", Event::Disconnected);
                        break; // Stop listening when the stream ends
                    }
                }
            }
        }))
    }
}
