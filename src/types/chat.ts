interface BaseEvent {
  type: string;
}

// export types used in chat-browser, for now they are defined manually here.
export interface JoinedEvent extends BaseEvent {
  type: "joined";
  neighbors: string[];
}

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

export interface NeighborUpEvent extends BaseEvent {
  type: "neighborUp";
  nodeId: string;
}

export interface NeighborDownEvent extends BaseEvent {
  type: "neighborDown";
  nodeId: string;
}

export interface LaggedEvent extends BaseEvent {
  type: "lagged";
}

export interface ErrorEvent extends BaseEvent {
  type: "errored";
  message: string;
}

export type ChatEvent =
  | JoinedEvent
  | MessageReceivedEvent
  | NeighborUpEvent
  | NeighborDownEvent
  | PresenceEvent
  | LaggedEvent
  | ErrorEvent;
