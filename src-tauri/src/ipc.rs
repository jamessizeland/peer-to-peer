use anyhow::{anyhow, Result};
use iroh::endpoint::RemoteInfo;
use n0_future::{
    boxed::BoxStream,
    task::{self, AbortOnDropHandle},
    StreamExt,
};
use tauri::Emitter as _;

use crate::{
    chat::{ChatNode, ChatTicket, Event, NodeId},
    state::{ActiveChannel, AppContext},
    utils::get_store,
};

/// Spawns a background task to listen for chat events and emit them to the frontend.
fn spawn_event_listener(
    app: tauri::AppHandle,
    mut receiver: BoxStream<Result<Event>>,
) -> AbortOnDropHandle<()> {
    AbortOnDropHandle::new(task::spawn(async move {
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
                    let _ = app.emit("chat-error", format!("Receive error: {}", e));
                    break; // Stop listening on error
                }
                None => {
                    tracing::info!("Chat event stream ended.");
                    let _ = app.emit("chat-event", Event::Lagged); // Or a custom "Disconnected" event
                    break; // Stop listening when the stream ends
                }
            }
        }
    }))
}

#[tauri::command]
/// Initialize the Application Context from disk.
pub async fn init_context(
    state: tauri::State<'_, AppContext>,
    app: tauri::AppHandle,
) -> tauri::Result<()> {
    let store = get_store(&app)?;
    // get context information from store
    // TODO: Load secret key from store if it exists?

    // Spawn the Iroh node
    let node = ChatNode::spawn(None) // Use None for a random key, or load from store
        .await
        .map_err(|e| anyhow!("Failed to spawn node: {}", e))?;

    // Store the node in the AppContext
    *state.node.lock().await = Some(node);
    *state.nickname.lock().await = None; // Reset nickname on init
    *state.active_channel.lock().await = None; // Clear any previous channel state

    tracing::info!("Iroh node initialized.");
    Ok(())
}

#[tauri::command]
/// Create a new room and return the information required to send
/// an out-of-band Join Code to others to connect.
pub async fn create_room(
    nickname: String,
    state: tauri::State<'_, AppContext>,
    app: tauri::AppHandle,
) -> tauri::Result<String> {
    let node_guard = state.node.lock().await;
    let Some(node) = node_guard.as_ref() else {
        return Err(anyhow!("Node not initialized").into());
    };

    // Leave any existing room first
    leave_room(state.clone(), app.clone()).await?;

    // Create a new random ticket
    let mut ticket = ChatTicket::new_random();
    // Add ourselves to the bootstrap list for the ticket
    ticket.bootstrap.insert(node.node_id());

    // Join the topic using the node's join method
    let (sender, receiver) = node
        .join(&ticket, nickname.clone())
        .map_err(|e| anyhow!("Failed to join topic: {}", e))?;

    // Spawn the event listener task
    let receiver_handle = spawn_event_listener(app.clone(), receiver);

    // Store the active channel info
    *state.active_channel.lock().await = Some(ActiveChannel {
        sender,
        receiver_handle,
        topic_id: ticket.topic_id,
    });
    *state.nickname.lock().await = Some(nickname);

    tracing::info!("Created and joined room: {}", ticket.topic_id);

    // Return the serialized ticket so it can be shared
    Ok(ticket.serialize())
}

#[tauri::command]
/// Join an existing room
pub async fn join_room(
    ticket: String,
    nickname: String,
    state: tauri::State<'_, AppContext>,
    app: tauri::AppHandle,
) -> tauri::Result<()> {
    let node_guard = state.node.lock().await;
    let Some(node) = node_guard.as_ref() else {
        return Err(anyhow!("Node not initialized").into());
    };

    // Leave any existing room first
    leave_room(state.clone(), app.clone()).await?;

    let ticket = ChatTicket::deserialize(&ticket)?;

    // Join the topic
    let (sender, receiver) = node
        .join(&ticket, nickname.clone())
        .map_err(|e| anyhow!("Failed to join topic: {}", e))?;

    // Spawn the event listener task
    let receiver_handle = spawn_event_listener(app.clone(), receiver);

    // Store the active channel info
    *state.active_channel.lock().await = Some(ActiveChannel {
        sender,
        receiver_handle,
        topic_id: ticket.topic_id,
    });
    *state.nickname.lock().await = Some(nickname);

    tracing::info!("Joined room: {}", ticket.topic_id);
    Ok(())
}

#[tauri::command]
/// Send a message to the room
pub async fn send_message(
    message: String,
    state: tauri::State<'_, AppContext>,
    app: tauri::AppHandle,
) -> tauri::Result<()> {
    let active_channel_guard = state.active_channel.lock().await;
    if let Some(channel) = active_channel_guard.as_ref() {
        channel
            .sender
            .send(message)
            .await
            .map_err(|e| anyhow!("Failed to send message: {}", e))?;
        Ok(())
    } else {
        Err(anyhow!("Not currently in a room").into())
    }
}

#[tauri::command]
/// Set a new nickname for this node.
pub async fn set_nickname(
    nickname: String,
    state: tauri::State<'_, AppContext>,
) -> tauri::Result<()> {
    let mut active_channel_guard = state.active_channel.lock().await;
    if let Some(channel) = active_channel_guard.as_mut() {
        channel.sender.set_nickname(nickname.clone());
        *state.nickname.lock().await = Some(nickname);
        Ok(())
    } else {
        Err(anyhow!("Not currently in a room").into())
    }
}

#[tauri::command]
/// Leave the currently joined room
pub async fn leave_room(
    state: tauri::State<'_, AppContext>,
    app: tauri::AppHandle,
) -> tauri::Result<()> {
    let mut active_channel_guard = state.active_channel.lock().await;
    if let Some(channel) = active_channel_guard.take() {
        // Dropping the ActiveChannel struct automatically drops the AbortOnDropHandle
        // for the receiver task, stopping it.
        // It also drops the ChatSender, which holds an Arc to the presence task handle, stopping that too.
        // TODO: Verify if iroh-gossip requires explicit unsubscribe or if dropping sender/receiver is enough.
        // For now, assume dropping is sufficient cleanup for the gossip topic participation.
        tracing::info!("Left room: {}", channel.topic_id);
        *state.nickname.lock().await = None; // Clear nickname when leaving
    } else {
        tracing::debug!("Leave room called, but not in a room.");
    }
    Ok(())
}

#[tauri::command]
/// Disconnect from the session
pub async fn disconnect(
    state: tauri::State<'_, AppContext>,
    app: tauri::AppHandle,
) -> tauri::Result<()> {
    // First, leave any active room
    leave_room(state.clone(), app.clone()).await?;

    // Then, shut down the node
    let mut node_guard = state.node.lock().await;
    if let Some(node) = node_guard.take() {
        // node.shutdown() is async, but we're in a sync mutex guard.
        // We need to drop the guard before awaiting.
        drop(node_guard);
        node.shutdown().await;
        tracing::info!("Iroh node shut down.");
    } else {
        tracing::debug!("Disconnect called, but node was not running.");
    }

    Ok(())
}

#[tauri::command]
/// Returns information about all the remote endpoints this endpoint knows about
pub async fn get_peers(state: tauri::State<'_, AppContext>) -> tauri::Result<Vec<RemoteInfo>> {
    let node = state.node.lock().await;
    match node.as_ref() {
        Some(chat_node) => Ok(chat_node.remote_info()),
        None => Err(anyhow!("Node not initialized").into()), // Or return Ok(vec![]) if preferred
    }
}

#[tauri::command]
/// Returns the node id of this node
pub async fn get_node_id(state: tauri::State<'_, AppContext>) -> tauri::Result<NodeId> {
    let node = state.node.lock().await;
    node.as_ref()
        .map(|chat_node| chat_node.node_id())
        .ok_or(anyhow!("Node not initialized").into())
}
