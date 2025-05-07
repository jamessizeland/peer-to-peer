use crate::{
    chat::{channel::TicketOpts, peers::PeerInfo, ChatNode, ChatTicket, NodeId},
    state::AppContext,
    utils::get_store,
    // utils::get_store,
};
use anyhow::anyhow;
use iroh::SecretKey;
use tauri::Emitter;

#[tauri::command]
/// Initialize the Application Context from disk.
pub async fn init_context(
    state: tauri::State<'_, AppContext>,
    app: tauri::AppHandle,
) -> tauri::Result<()> {
    let mut node_guard = state.node.lock().await;
    if node_guard.is_some() {
        tracing::info!("Iroh node already initialized. Skipping re-initialization.");
        // Optionally, you might still want to ensure nickname and active_channel are consistent
        // or decide if this scenario (calling init when already init) is an error.
        // For now, we just skip to prevent clearing the active channel.
        return Ok(());
    }
    let store = get_store(&app)?;
    let nickname = store
        .get("nickname")
        .map(|val| serde_json::from_value::<String>(val).unwrap_or_default());
    *state.nickname.lock().await = nickname;
    *state.latest_ticket.lock().await = None;

    let key = match store.get("key") {
        Some(val) => match serde_json::from_value::<SecretKey>(val) {
            Ok(key) => key,
            Err(_) => {
                let key = SecretKey::generate(rand::rngs::OsRng);
                store.set("key", serde_json::to_value(&key)?);
                key
            }
        },
        None => {
            let key = SecretKey::generate(rand::rngs::OsRng);
            store.set("key", serde_json::to_value(&key)?);
            key
        }
    };
    // Spawn the Iroh node
    let node = ChatNode::spawn(Some(key))
        .await
        .map_err(|e| anyhow!("Failed to spawn node: {}", e))?;

    *node_guard = Some(node); // Store the newly spawned node
    drop(node_guard); // Unlock node_guard as we don't need it for the rest of the state mutations.

    state.drop_channel().await?; // Reset active channel on init

    tracing::info!("Iroh node initialized.");
    app.emit("backend-init", true)?; // Tell UI that we've finished initializing.
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

    let store = get_store(&app)?;
    // Create a new random ticket to initialize the channel.
    // generate_channel will ensure this node is part of the bootstrap.
    let initial_ticket = ChatTicket::new_random();

    // Use generate_channel from [chat::channel]
    let mut domain_channel = node
        .generate_channel(initial_ticket, nickname.clone())
        .map_err(|e| anyhow!("Failed to generate channel: {}", e))?;

    // Take the receiver from the Channel object to give to spawn_event_listener
    let receiver = domain_channel
        .take_receiver()
        .ok_or_else(|| anyhow!("Receiver already taken from channel object"))?;

    // Store the active channel info
    state.start_channel(domain_channel, app, receiver).await?;

    store.set("nickname", serde_json::to_value(&nickname)?);

    // Get the topic_id from the established channel for logging
    let topic_id_str = state.get_topic_id().await?;

    *state.nickname.lock().await = Some(nickname);

    tracing::info!("Created and joined room: {}", topic_id_str);

    // Generate ticket string from the Channel instance to be shared
    let ticket_token = state.generate_ticket(TicketOpts::all()).await?;

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
    let store = get_store(&app)?;

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

    // Store the active channel info
    state.start_channel(domain_channel, app, receiver).await?;

    // Get the topic_id from the established channel for logging
    let topic_id_str = state.get_topic_id().await?;

    tracing::info!(
        "Active channel SET in join_room for topic: {}",
        topic_id_str
    );
    store.set("nickname", serde_json::to_value(&nickname)?);
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
    let sender = state.get_sender().await?;
    sender.send(message).await?;
    Ok(())
}

#[tauri::command]
/// Set a new nickname for this node.
pub async fn set_nickname(
    nickname: String,
    state: tauri::State<'_, AppContext>,
    app: tauri::AppHandle,
) -> tauri::Result<()> {
    tracing::info!("Nickname set to: {}", &nickname);
    state.nickname.lock().await.replace(nickname.clone());
    let store = get_store(&app)?;
    store.set("nickname", serde_json::to_value(&nickname)?);
    state.set_nickname(nickname).await?;
    Ok(())
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
    if let Some(id) = state.drop_channel().await? {
        tracing::info!("Left room: {}", id);
    };
    Ok(())
}

#[tauri::command]
/// Disconnect from the session
pub async fn disconnect(
    state: tauri::State<'_, AppContext>,
    app: tauri::AppHandle,
) -> tauri::Result<()> {
    // First, leave any active room
    leave_room(state.clone(), app).await?;

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
pub async fn get_peers(state: tauri::State<'_, AppContext>) -> tauri::Result<Vec<PeerInfo>> {
    Ok(state.get_peers().await)
}

#[tauri::command]
/// Returns the node id of this node
pub async fn get_node_id(state: tauri::State<'_, AppContext>) -> tauri::Result<NodeId> {
    let node = state.node.lock().await;
    node.as_ref()
        .map(|chat_node| chat_node.node_id())
        .ok_or(anyhow!("Node not initialized").into())
}
