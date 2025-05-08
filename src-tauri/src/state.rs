use crate::chat::{
    self,
    channel::{Channel, TicketOpts},
    peers::{PeerInfo, PeerMap},
    ChatNode, ChatSender, Event,
};
use anyhow::anyhow;
use iroh::NodeId;
use n0_future::{task::AbortOnDropHandle, StreamExt as _};
use std::{collections::HashSet, sync::Arc};
use tauri::{AppHandle, Emitter as _};
use tokio::{
    select,
    sync::Mutex as TokioMutex,
    time::{interval, Duration},
};

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
    peers: Arc<TokioMutex<PeerMap>>,
}

impl AppContext {
    /// Creates a new, empty AppContext.
    pub fn new() -> Self {
        Self {
            node: Arc::new(TokioMutex::new(None)),
            nickname: Arc::new(TokioMutex::new(None)),
            active_channel: Arc::new(TokioMutex::new(None)),
            latest_ticket: Arc::new(TokioMutex::new(None)),
            peers: Arc::new(TokioMutex::new(Default::default())),
        }
    }
    /// Return a list of the known members of this Gossip Swarm.
    pub async fn get_peers(&self) -> Vec<PeerInfo> {
        let peers = self.peers.lock().await;
        peers.to_vec()
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
        let mut tick_interval = interval(Duration::from_secs(2));
        let peers = self.peers.clone();
        let active_channel = self.active_channel.clone();
        let latest_ticket = self.latest_ticket.clone();

        // keep track of newly 'joined' peers to look out for their first
        // presense message.
        let mut new_starters: HashSet<NodeId> = HashSet::new();

        AbortOnDropHandle::new(n0_future::task::spawn(async move {
            loop {
                select! {
                    biased; // Optional: prioritize receiver events if both are ready
                    event_result = receiver.next() => { // `receiver` is moved into the task
                        if handle_event(event_result, &peers, &active_channel, &latest_ticket, &app, &mut new_starters).await {
                            break; // Stop listening when the stream ends
                        };
                    },
                    _ = tick_interval.tick() => {
                        // This branch runs every second
                        peers.lock().await.update(None, &mut new_starters, &app);
                    },
                }
            }
        }))
    }
}

/// Handle the event stream, if we want to break the loop we return True.
async fn handle_event(
    event_result: Option<anyhow::Result<Event>>,
    peers_clone: &Arc<TokioMutex<PeerMap>>,
    active_channel_clone: &Arc<TokioMutex<Option<ActiveChannel>>>,
    latest_ticket_clone: &Arc<TokioMutex<Option<String>>>,
    app: &AppHandle,
    new_starters: &mut HashSet<NodeId>,
) -> bool {
    match event_result {
        Some(Ok(event)) => {
            // for any event, check if we've updated the peers list (and emit peer-events)
            peers_clone
                .lock()
                .await
                .update(Some(&event), new_starters, &app);
            // emit a chat-event for each event
            if let Err(e) = app.emit("chat-event", &event) {
                tracing::error!("Failed to emit event to frontend: {}", e);
            }
            // If a peer joins or a new neighbor comes up, update the latest_ticket
            update_ticket(&event, app, latest_ticket_clone, active_channel_clone).await;
        }
        Some(Err(e)) => {
            tracing::error!("Error receiving chat event: {}", e);
            let _ = app.emit(
                "chat-error",
                Event::Errorred {
                    message: e.to_string(),
                },
            );
        }
        None => {
            tracing::info!("Chat event stream ended.");
            let _ = app.emit("chat-event", Event::Disconnected);
            return true; // Stop listening when the stream ends
        }
    };
    false // Continue listening
}

/// If a peer joins or a new neighbor comes up, update the latest_ticket
/// with new peer nodes to assist reconnections.
async fn update_ticket(
    event: &Event,
    app: &AppHandle,
    latest_ticket_clone: &Arc<TokioMutex<Option<String>>>,
    active_channel_clone: &Arc<TokioMutex<Option<ActiveChannel>>>,
) {
    match &event {
        Event::Joined { .. } | Event::NeighborUp { .. } => {
            tracing::debug!("Peer event detected, attempting to update latest ticket.");
            if let Some(active_channel_guard) = active_channel_clone.lock().await.as_ref() {
                match active_channel_guard.inner.ticket(TicketOpts::all()) {
                    Ok(new_ticket_str) => {
                        *latest_ticket_clone.lock().await = Some(new_ticket_str.clone());
                        tracing::info!(
                            "Updated latest_ticket due to new peer joining/neighbor up."
                        );
                        if let Err(e) = app.emit("ticket-updated", new_ticket_str) {
                            tracing::warn!("Failed to emit ticket-updated event: {}", e);
                        }
                    }
                    Err(e) => {
                        tracing::error!("Failed to regenerate ticket after peer event: {}", e);
                    }
                }
            }
        }
        _ => {} // Other events do not trigger ticket update
    }
}
