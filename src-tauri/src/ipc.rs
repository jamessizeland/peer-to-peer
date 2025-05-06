use anyhow::{anyhow, Result};
use iroh::endpoint::RemoteInfo;
use n0_future::{
    boxed::BoxStream,
    task::{self, AbortOnDropHandle},
    StreamExt,
};
use tauri::Emitter as _;

use crate::{
    chat::{channel::TicketOpts, ChatNode, ChatTicket, Event, NodeId},
    state::{ActiveChannel, AppContext},
    // utils::get_store,
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
    _app: tauri::AppHandle,
) -> tauri::Result<()> {
    let mut node_guard = state.node.lock().await;
    if node_guard.is_some() {
        tracing::info!("Iroh node already initialized. Skipping re-initialization.");
        // Optionally, you might still want to ensure nickname and active_channel are consistent
        // or decide if this scenario (calling init when already init) is an error.
        // For now, we just skip to prevent clearing the active channel.
        return Ok(());
    }

    // TODO: Load secret key from store if it exists, instead of None for ChatNode::spawn

    // Spawn the Iroh node
    let node = ChatNode::spawn(None) // Use None for a random key, or load from store
        .await
        .map_err(|e| anyhow!("Failed to spawn node: {}", e))?;

    // Store the newly spawned node
    *node_guard = Some(node);
    // Unlock node_guard as we don't need it for the rest of the state mutations.
    drop(node_guard);
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

    // Create a new random ticket to initialize the channel.
    // generate_channel will ensure this node is part of the bootstrap.
    let initial_ticket = ChatTicket::new_random();

    // Use generate_channel from chat::channel
    let mut domain_channel = node
        .generate_channel(initial_ticket.clone(), nickname.clone())
        .map_err(|e| anyhow!("Failed to generate channel: {}", e))?;

    // Take the receiver from the Channel object to give to spawn_event_listener
    let receiver = domain_channel
        .take_receiver()
        .ok_or_else(|| anyhow!("Receiver already taken from channel object"))?;

    // Spawn the event listener task
    let receiver_handle = spawn_event_listener(app.clone(), receiver);

    // Store the active channel info
    *state.active_channel.lock().await = Some(ActiveChannel {
        inner: domain_channel, // Store the whole Channel object
        receiver_handle,
    });

    // Get the topic_id from the established channel for logging
    let topic_id_str = state
        .active_channel
        .lock()
        .await
        .as_ref()
        .unwrap()
        .inner
        .id();
    tracing::info!(
        "Active channel SET in create_room for topic: {}",
        topic_id_str
    );
    *state.nickname.lock().await = Some(nickname);

    tracing::info!("Created and joined room: {}", topic_id_str);

    // Generate ticket string from the Channel instance to be shared
    let ticket_opts = TicketOpts {
        include_myself: true,
        include_bootstrap: true,
        include_neighbors: true,
    };
    let ticket_token = state
        .active_channel
        .lock()
        .await
        .as_ref()
        .unwrap()
        .inner
        .ticket(ticket_opts)?;
    *state.latest_ticket.lock().await = Some(ticket_token.clone());
    Ok(ticket_token)
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

    tracing::info!("deserializing ticket token: {}", ticket);
    let chat_ticket = ChatTicket::deserialize(&ticket)?;
    *state.latest_ticket.lock().await = Some(ticket.clone());

    // Use generate_channel from chat::channel
    let mut domain_channel = node
        .generate_channel(chat_ticket.clone(), nickname.clone())
        .map_err(|e| anyhow!("Failed to generate channel: {}", e))?;

    // Take the receiver from the Channel object
    let receiver = domain_channel
        .take_receiver()
        .ok_or_else(|| anyhow!("Receiver already taken from channel object"))?;

    // Spawn the event listener task
    let receiver_handle = spawn_event_listener(app.clone(), receiver);

    // Store the active channel info
    *state.active_channel.lock().await = Some(ActiveChannel {
        inner: domain_channel, // Store the whole Channel object
        receiver_handle,
    });

    // Get the topic_id from the established channel for logging
    let topic_id_str = state
        .active_channel
        .lock()
        .await
        .as_ref()
        .unwrap()
        .inner
        .id();
    tracing::info!(
        "Active channel SET in join_room for topic: {}",
        topic_id_str
    );
    *state.nickname.lock().await = Some(nickname);
    tracing::info!("Joined room: {}", topic_id_str);
    Ok(())
}

#[tauri::command]
/// Send a message to the room
pub async fn send_message(
    message: String,
    state: tauri::State<'_, AppContext>,
    _app: tauri::AppHandle, // Marked as unused, can be removed if not needed by Tauri
) -> tauri::Result<()> {
    let active_channel_guard = state.active_channel.lock().await;
    let is_some = active_channel_guard.is_some();
    tracing::info!(
        "send_message: active_channel is Some? {}. Topic ID if Some: {:?}",
        is_some,
        active_channel_guard.as_ref().map(|c| c.inner.id())
    );
    if let Some(active_state) = active_channel_guard.as_ref() {
        active_state
            .inner // This is &chat::channel::Channel
            .sender() // This clones the ChatSender from the channel
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
    if let Some(active_state) = active_channel_guard.as_mut() {
        // Assuming ChatSender::set_nickname works on a cloned sender
        // (e.g., it sends a command over an internal channel).
        // If ChatSender::set_nickname needs &mut self on the *original* sender,
        // chat::channel::Channel would need a method like sender_mut() or a direct set_nickname method.
        active_state.inner.sender().set_nickname(nickname.clone());
        *state.nickname.lock().await = Some(nickname);
        Ok(())
    } else {
        Err(anyhow!("Not currently in a room").into())
    }
}

#[tauri::command]
/// Get the stored nickname for this node.
pub async fn get_nickname(state: tauri::State<'_, AppContext>) -> tauri::Result<Option<String>> {
    let nickname_guard = state.nickname.lock().await;
    Ok(nickname_guard.clone())
}

#[tauri::command]
/// Get the stored room ticket string
pub async fn get_latest_ticket(
    state: tauri::State<'_, AppContext>,
) -> tauri::Result<Option<String>> {
    let ticket_guard = state.latest_ticket.lock().await;
    Ok(ticket_guard.clone())
}

#[tauri::command]
/// Leave the currently joined room
pub async fn leave_room(
    state: tauri::State<'_, AppContext>,
    _app: tauri::AppHandle,
) -> tauri::Result<()> {
    tracing::info!(
        "leave_room called. Current topic before leaving: {:?}",
        state
            .active_channel
            .lock()
            .await
            .as_ref()
            .map(|c| c.inner.id())
    );
    let mut active_channel_guard = state.active_channel.lock().await;
    if let Some(active_state) = active_channel_guard.take() {
        active_state.receiver_handle.abort(); // Aborts the spawned listener task
        tracing::info!("Left room: {}", active_state.inner.id()); // Log the ID from the inner channel
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
        drop(node_guard); // <- is this needed?
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
