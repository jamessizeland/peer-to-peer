use anyhow::Result;
use iroh::SecretKey;
use iroh_gossip::net::GossipSender;
use n0_future::task::AbortOnDropHandle;
use std::sync::{Arc, Mutex};
use tokio::sync::Notify;

use super::message::{Message, SignedMessage};

#[derive(Debug, Clone)]
pub struct ChatSender {
    nickname: Arc<Mutex<String>>,
    secret_key: SecretKey,
    sender: GossipSender,
    trigger_presence: Arc<Notify>,
    _presence_task: Arc<AbortOnDropHandle<()>>,
}

impl ChatSender {
    pub fn new(
        nickname: Arc<Mutex<String>>,
        secret_key: SecretKey,
        sender: GossipSender,
        trigger_presence: Arc<Notify>,
        presence_task: AbortOnDropHandle<()>,
    ) -> Self {
        Self {
            nickname,
            secret_key,
            sender,
            trigger_presence,
            _presence_task: Arc::new(presence_task),
        }
    }
    pub async fn send(&self, text: String) -> Result<()> {
        let nickname = self.nickname.lock().expect("poisened").clone();
        let message = Message::Message { text, nickname };
        let signed_message = SignedMessage::sign_and_encode(&self.secret_key, message)?;
        self.sender.broadcast(signed_message.into()).await?;
        Ok(())
    }

    pub fn set_nickname(&self, name: String) {
        *self.nickname.lock().expect("poisened") = name;
        self.trigger_presence.notify_waiters();
    }
}
