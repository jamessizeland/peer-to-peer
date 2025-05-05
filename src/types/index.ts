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
  status: "online" | "away" | "offline";
  lastSeen: Date;
  role: PeerRole;
}

export enum PeerRole {
  Myself,
  RemoteNode,
}

export interface API {
  createChannel(nickname: string): ChannelInfo;
  joinChannel(ticket: string, nickname: string): ChannelInfo;
  sendMessage(channelId: string, message: string): void;
  setNickname(channelId: string, nickname: string): void;
  getMessages(channelId: string): Message[];
  getPeers(channelId: string): PeerInfo[];
  getMyself(channelId: string): PeerInfo;
  subscribeToMessages(
    channelId: string,
    callback: (message: Message) => void
  ): () => void;
  subscribeToPeers(channelId: string, callback: () => void): () => void;
  subscribeToNeighbors(
    channelId: string,
    callback: (neighbors: number) => void
  ): () => void;
  getTicket(channelId: string, opts: TicketOpts): string;
  closeChannel(channelId: string): Promise<void>;
}

export type SubscribeCb = (message: Message) => void;
