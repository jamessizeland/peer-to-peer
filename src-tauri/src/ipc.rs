use crate::{
    chat::{channel::TicketOpts, ChatTicket, NodeId},
    state::AppContext,
    utils::AppStore,
};
use anyhow::anyhow;

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

    let store = AppStore::acquire(&app)?;
    // Create a new random ticket to initialize the channel.
    // generate_channel will ensure this node is part of the bootstrap.
    let initial_ticket = ChatTicket::new_random();

    // Use generate_channel from [chat::channel]
    let mut channel = node
        .generate_channel(initial_ticket, nickname.clone())
        .map_err(|e| anyhow!("Failed to generate channel: {}", e))?;

    // Take the receiver from the Channel object to give to spawn_event_listener
    let rx = channel
        .take_receiver()
        .ok_or_else(|| anyhow!("Receiver already taken from channel object"))?;

    store.set_nickname(&nickname)?;

    // Store the active channel info
    state.start_channel(channel, &app, rx, &nickname).await?;

    // Get the topic_id from the established channel for logging
    let topic_id_str = state.get_topic_id().await?;

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

    tracing::info!("deserializing ticket token: {}", ticket);
    let chat_ticket = ChatTicket::deserialize(&ticket)?;
    *state.latest_ticket.lock().await = Some(ticket.clone());

    // Use generate_channel from chat::channel
    let mut channel = node
        .generate_channel(chat_ticket.clone(), nickname.clone())
        .map_err(|e| anyhow!("Failed to generate channel: {}", e))?;

    // Take the receiver from the Channel object
    let rx = channel
        .take_receiver()
        .ok_or_else(|| anyhow!("Receiver already taken from channel object"))?;

    // Store the active channel info
    state.start_channel(channel, &app, rx, &nickname).await?;

    // Get the topic_id from the established channel for logging
    let topic_id_str = state.get_topic_id().await?;

    tracing::info!(
        "Active channel SET in join_room for topic: {}",
        topic_id_str
    );
    AppStore::acquire(&app)?.set_nickname(&nickname)?;
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
pub async fn set_nickname(nickname: String, app: tauri::AppHandle) -> tauri::Result<()> {
    tracing::info!("Nickname set to: {}", &nickname);
    AppStore::acquire(&app)?.set_nickname(&nickname)?;
    Ok(())
}

#[tauri::command]
/// Get the stored nickname for this node.
pub async fn get_nickname(app: tauri::AppHandle) -> tauri::Result<Option<String>> {
    Ok(AppStore::acquire(&app)?.get_nickname())
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
/// Returns the node id of this node
pub async fn get_node_id(state: tauri::State<'_, AppContext>) -> tauri::Result<NodeId> {
    let node = state.node.lock().await;
    node.as_ref()
        .map(|chat_node| chat_node.node_id())
        .ok_or(anyhow!("Node not initialized").into())
}
