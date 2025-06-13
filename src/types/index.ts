export type ChannelInfo = {
  id: string;
  name: string;
};

export type TicketOpts = {
  includeMyself: boolean;
  includeBootstrap: boolean;
  includeNeighbors: boolean;
};

export interface Conversation {
  id: string;
  name?: string;
  last_message_at?: number | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  content: string;
  created_at: number;
  sender_id: string;
  nickname: string;
}

export interface PeerInfo {
  id: string;
  nickname: string;
  status: PeerStatus;
  lastSeen: number;
  role: "Myself" | "RemoteNode";
}

export type PeerStatus = "Online" | "Away" | "Offline";

/** Helper function from backend */
export type VisitedRoom = {
  id: string;
  name: string;
  ticket: string;
  last_message_at?: number | null; // updated from sql db
};
