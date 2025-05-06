use std::sync::Arc;
use tokio::sync::Mutex as TokioMutex;

use n0_future::task::AbortOnDropHandle;

use crate::chat::{ChatNode, ChatSender};

/// Holds information about the currently active chat channel.
pub struct ActiveChannel {
    pub sender: ChatSender,
    // Handle to the background task processing incoming messages. Dropping this stops the task.
    pub receiver_handle: AbortOnDropHandle<()>,
    pub topic_id: iroh_gossip::proto::TopicId,
}

/// Holds the application's runtime context, including the iroh client,
/// game document handle, current game state, and background task handles.
pub struct AppContext {
    // The iroh client instance used for all interactions. Option<> because it's initialized async.
    pub node: Arc<TokioMutex<Option<ChatNode>>>,
    pub nickname: Arc<TokioMutex<Option<String>>>, // Nickname needs to be shared
    pub active_channel: Arc<TokioMutex<Option<ActiveChannel>>>,
    pub latest_ticket: Arc<TokioMutex<Option<String>>>,
}

impl AppContext {
    /// Creates a new, empty AppContext.
    pub fn new() -> Self {
        Self {
            node: Arc::new(TokioMutex::new(None)),
            nickname: Arc::new(TokioMutex::new(None)),
            active_channel: Arc::new(TokioMutex::new(None)),
            latest_ticket: Arc::new(TokioMutex::new(None)),
        }
    }
}
