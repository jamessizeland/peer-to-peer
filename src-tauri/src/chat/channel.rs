use std::{
    collections::BTreeSet,
    pin::Pin,
    sync::{Arc, Mutex},
};

use super::{event::Event, sender::ChatSender, ChatNode, ChatTicket};
pub use iroh::NodeId;
pub use iroh_gossip::proto::TopicId;
use n0_future::{boxed::BoxStream, time::Duration, StreamExt as _};
use serde::{Deserialize, Serialize};

type ChatReceiver = BoxStream<anyhow::Result<Event>>; // TODO check if this type is correct, example uses wasm_streams::readable::sys::ReadableStream;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PeerInfo {
    pub node_id: NodeId,
    pub nickname: String,
    pub last_active: Duration,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TicketOpts {
    pub include_myself: bool,
    pub include_bootstrap: bool,
    pub include_neighbors: bool,
}

pub struct Channel {
    topic_id: TopicId,
    me: NodeId,
    bootstrap: BTreeSet<NodeId>,
    neighbors: Arc<Mutex<BTreeSet<NodeId>>>,
    sender: ChatSender,
    receiver: Option<ChatReceiver>,
}

impl Channel {
    pub fn sender(&self) -> ChatSender {
        self.sender.clone()
    }

    pub fn take_receiver(&mut self) -> Option<ChatReceiver> {
        self.receiver.take()
    }

    pub fn ticket(&self, opts: TicketOpts) -> anyhow::Result<String> {
        let mut ticket = ChatTicket::new(self.topic_id);
        if opts.include_myself {
            ticket.bootstrap.insert(self.me);
        }
        if opts.include_bootstrap {
            ticket.bootstrap.extend(self.bootstrap.iter().copied());
        }
        if opts.include_neighbors {
            let neighbors = self.neighbors.lock().unwrap();
            ticket.bootstrap.extend(neighbors.iter().copied())
        }
        tracing::info!("opts {:?} ticket {:?}", opts, ticket);
        Ok(ticket.serialize())
    }

    pub fn id(&self) -> String {
        self.topic_id.to_string()
    }

    pub fn neighbors(&self) -> Vec<String> {
        self.neighbors
            .lock()
            .unwrap()
            .iter()
            .map(|x| x.to_string())
            .collect()
    }
}

impl ChatNode {
    pub fn generate_channel(
        &self,
        ticket: ChatTicket,
        nickname: String,
    ) -> anyhow::Result<Channel> {
        let (sender, receiver) = self.join(&ticket, nickname)?;
        let neighbors = Arc::new(Mutex::new(BTreeSet::new()));
        let neighbors2 = neighbors.clone();
        let receiver = receiver.map(move |event| {
            if let Ok(event) = &event {
                match event {
                    Event::Joined { neighbors } => {
                        neighbors2.lock().unwrap().extend(neighbors.iter().cloned());
                    }
                    Event::NeighborUp { node_id } => {
                        neighbors2.lock().unwrap().insert(*node_id);
                    }
                    Event::NeighborDown { node_id } => {
                        neighbors2.lock().unwrap().remove(node_id);
                    }
                    _ => {}
                }
            }
            event
        });
        let receiver = Pin::new(Box::new(receiver));

        // Add ourselves to the ticket.
        let mut ticket = ticket;
        ticket.bootstrap.insert(self.node_id());
        // ticket.bootstrap = [self.0.node_id()].into_iter().collect();

        let topic = Channel {
            topic_id: ticket.topic_id,
            bootstrap: ticket.bootstrap,
            neighbors,
            me: self.node_id(),
            sender,
            receiver: Some(receiver),
        };
        Ok(topic)
    }
}
