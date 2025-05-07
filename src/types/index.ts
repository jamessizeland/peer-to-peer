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
  nickname: string;
  status: PeerStatus;
  lastSeen: number;
  role: "Myself" | "RemoteNode";
}

export type PeerStatus = "Online" | "Away" | "Offline";
