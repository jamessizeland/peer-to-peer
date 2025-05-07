export type ChannelInfo = {
  id: string;
  name: string;
};

export type TicketOpts = {
  includeMyself: boolean;
  includeBootstrap: boolean;
  includeNeighbors: boolean;
};

export interface Message {
  id: string;
  sender: string;
  content: string;
  nickname?: string;
}

export interface PeerInfo {
  id: string;
  name: string;
  status: "Online" | "Away" | "Offline";
  lastSeen: Date;
  role: "Myself" | "RemoteNode";
}
