pub mod channel;
mod event;
mod message;
pub mod peers;
mod sender;
mod ticket;

use std::sync::{Arc, Mutex};

use anyhow::Result;
pub use event::Event;
pub use iroh::NodeId;
use iroh::{endpoint::RemoteInfo, protocol::Router, SecretKey};
use iroh_gossip::net::{Gossip, GOSSIP_ALPN};
use message::{Message, SignedMessage};
use n0_future::{
    boxed::BoxStream,
    task::{self, AbortOnDropHandle},
    time::Duration,
    StreamExt,
};
pub use sender::ChatSender;
pub use ticket::ChatTicket;
use tokio::sync::Notify;
use tracing::{debug, info, warn};

pub const PRESENCE_INTERVAL: Duration = Duration::from_secs(5);

pub struct ChatNode {
    secret_key: SecretKey,
    router: Router,
    gossip: Gossip,
}

impl ChatNode {
    /// Spawns a gossip node.
    pub async fn spawn(secret_key: Option<SecretKey>) -> Result<Self> {
        let secret_key = secret_key.unwrap_or_else(|| SecretKey::generate(rand::rngs::OsRng));
        let endpoint = iroh::Endpoint::builder()
            .secret_key(secret_key.clone())
            .discovery_n0()
            .alpns(vec![GOSSIP_ALPN.to_vec()])
            .bind()
            .await?;

        let node_id = endpoint.node_id();
        info!("endpoint bound");
        info!("node id: {node_id:#?}");

        let gossip = Gossip::builder().spawn(endpoint.clone()).await?;
        info!("gossip spawned");
        let router = Router::builder(endpoint)
            .accept(GOSSIP_ALPN, gossip.clone())
            .spawn();
        info!("router spawned");
        Ok(Self {
            gossip,
            router,
            secret_key,
        })
    }

    /// Returns the node id of this node.
    pub fn node_id(&self) -> NodeId {
        self.router.endpoint().node_id()
    }

    #[allow(unused)]
    /// Returns information about all the remote nodes this [`Endpoint`] knows about.
    pub fn remote_info(&self) -> Vec<RemoteInfo> {
        self.router
            .endpoint()
            .remote_info_iter()
            .collect::<Vec<_>>()
    }

    /// Joins a chat channel from a ticket.
    ///
    /// Returns a [`ChatSender`] to send messages or change our nickname
    /// and a stream of [`Event`] items for incoming messages and other event.s
    pub fn join(
        &self,
        ticket: &ChatTicket,
        nickname: String,
    ) -> Result<(ChatSender, BoxStream<Result<Event>>)> {
        let topic_id = ticket.topic_id;
        let bootstrap = ticket.bootstrap.iter().cloned().collect();
        info!(?bootstrap, "joining {topic_id}");
        let gossip_topic = self.gossip.subscribe(topic_id, bootstrap)?;
        let (sender, receiver) = gossip_topic.split();

        let nickname = Arc::new(Mutex::new(nickname));
        let trigger_presence = Arc::new(Notify::new());

        // We spawn a task that occasionally sens a Presence message with our nickname.
        // This allows to track which peers are online currently.
        let presence_task = AbortOnDropHandle::new(task::spawn({
            let secret_key = self.secret_key.clone();
            let sender = sender.clone();
            let trigger_presence = trigger_presence.clone();
            let nickname = nickname.clone();

            async move {
                loop {
                    let nickname = nickname.lock().expect("poisened").clone();
                    let message = Message::Presence { nickname };
                    debug!("send presence {message:?}");
                    let signed_message = SignedMessage::sign_and_encode(&secret_key, message)
                        .expect("failed to encode message");
                    if let Err(err) = sender.broadcast(signed_message.into()).await {
                        tracing::warn!("presence task failed to broadcast: {err}");
                        break;
                    }
                    n0_future::future::race(
                        n0_future::time::sleep(PRESENCE_INTERVAL),
                        trigger_presence.notified(),
                    )
                    .await;
                }
            }
        }));

        // We create a stream of events, coming from the gossip topic event receiver.
        // We'll want to map the events to our own event type, which includes parsing
        // the messages and verifying the signatures, and trigger presence
        // once the swarm is joined initially.
        let receiver = n0_future::stream::try_unfold(receiver, {
            let trigger_presence = trigger_presence.clone();
            move |mut receiver| {
                let trigger_presence = trigger_presence.clone();
                async move {
                    loop {
                        // Store if we were joined before the next event comes in.
                        let was_joined = receiver.is_joined();

                        // Fetch the next event.
                        let Some(event) = receiver.try_next().await? else {
                            return Ok(None);
                        };
                        // Convert into our event type. this fails if we receive a message
                        // that cannot be decoced into our event type. If that is the case,
                        // we just keep and log the error.
                        let event: Event = match event.try_into() {
                            Ok(event) => event,
                            Err(err) => {
                                warn!("received invalid message: {err}");
                                continue;
                            }
                        };
                        // If we just joined, trigger sending our presence message.
                        if !was_joined && receiver.is_joined() {
                            trigger_presence.notify_waiters()
                        };

                        break Ok(Some((event, receiver)));
                    }
                }
            }
        });

        let sender = ChatSender::new(
            nickname,
            self.secret_key.clone(),
            sender,
            trigger_presence,
            presence_task,
        );
        Ok((sender, Box::pin(receiver)))
    }

    pub async fn shutdown(&self) {
        if let Err(err) = self.router.shutdown().await {
            warn!("failed to shutdown router cleanly: {err}");
        }
        self.router.endpoint().close().await;
    }
}
