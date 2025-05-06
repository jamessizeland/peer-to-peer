// export types used in chat-browser, for now they are defined manually here.
export type JoinedEvent = {
  type: "joined";
  neighbors: string[];
};

export type MessageEvent = {
  type: "messageReceived";
  from: string;
  text: string;
  nickname: string;
  sentTimestamp: number;
};

export type PresenceEvent = {
  type: "presence";
  from: string;
  nickname: string;
  sentTimestamp: number;
};

export type NeighborUpEvent = {
  type: "neighborUp";
  nodeId: string;
};

export type NeighborDownEvent = {
  type: "neighborDown";
  nodeId: string;
};

export type LaggedEvent = {
  type: "lagged";
};

export type ErrorEvent = {
  type: "errored";
  message: string;
};

export type ChatEvent =
  | JoinedEvent
  | MessageEvent
  | NeighborUpEvent
  | NeighborDownEvent
  | PresenceEvent
  | LaggedEvent
  | ErrorEvent;
