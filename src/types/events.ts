interface BaseEvent {
  type:
    | "joined"
    | "messageReceived"
    | "neighborUp"
    | "neighborDown"
    | "presence"
    | "lagged"
    | "errored"
    | "disconnected";
}

/** We joined the topic with at least one peer.
 *
 * This is the first event on a [`GossipReceiver`] and will only be emitted once.*/
export interface JoinedEvent extends BaseEvent {
  type: "joined";
  neighbors: string[];
}

/** We received a gossip message for this topic. */
export interface MessageReceivedEvent extends BaseEvent {
  type: "messageReceived";
  from: string;
  text: string;
  nickname: string;
  sentTimestamp: number;
}

export interface PresenceEvent extends BaseEvent {
  type: "presence";
  from: string;
  nickname: string;
  sentTimestamp: number;
}

/** We have a new, direct neighbor in the swarm membership layer for this topic. */
export interface NeighborUpEvent extends BaseEvent {
  type: "neighborUp";
  nodeId: string;
}

/** We dropped direct neighbor in the swarm membership layer for this topic. */
export interface NeighborDownEvent extends BaseEvent {
  type: "neighborDown";
  nodeId: string;
}

/** We missed some messages because our [`GossipReceiver`] was not progressing fast enough. */
export interface LaggedEvent extends BaseEvent {
  type: "lagged";
}

/** Backend reporting an end of stream event.  Not part of the Gossip Events protocol. */
export interface DisconnectedEvent extends BaseEvent {
  type: "disconnected";
}

/** Backend reporting an error event.  Not part of the Gossip Events protocol. */
export interface ErrorEvent extends BaseEvent {
  type: "errored";
  message: string;
}

/** Gossip Events */
export type ChatEvent =
  | JoinedEvent
  | MessageReceivedEvent
  | NeighborUpEvent
  | NeighborDownEvent
  | PresenceEvent
  | LaggedEvent
  | DisconnectedEvent
  | ErrorEvent;
