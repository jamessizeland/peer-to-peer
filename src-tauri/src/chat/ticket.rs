use std::collections::BTreeSet;

use anyhow::Result;
pub use iroh::NodeId;
use iroh_base::ticket::Ticket;
pub use iroh_gossip::proto::TopicId;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ChatTicket {
    pub topic_id: TopicId,
    pub bootstrap: BTreeSet<NodeId>,
}

impl ChatTicket {
    pub fn new_random() -> Self {
        let topic_id = TopicId::from_bytes(rand::random());
        Self::new(topic_id)
    }

    pub fn new(topic_id: TopicId) -> Self {
        Self {
            topic_id,
            bootstrap: Default::default(),
        }
    }
    pub fn deserialize(input: &str) -> Result<Self> {
        <Self as Ticket>::deserialize(input).map_err(Into::into)
    }
    pub fn serialize(&self) -> String {
        <Self as Ticket>::serialize(self)
    }
}

impl Ticket for ChatTicket {
    const KIND: &'static str = "chat";

    fn to_bytes(&self) -> Vec<u8> {
        postcard::to_stdvec(&self).unwrap()
    }

    fn from_bytes(bytes: &[u8]) -> Result<Self, iroh_base::ticket::Error> {
        let ticket = postcard::from_bytes(bytes)?;
        Ok(ticket)
    }
}
