import { invoke } from "@tauri-apps/api/core";

import { notifyError } from "./notifications";
import { PeerInfo } from "types";

/** Initialize Backend context from persistent store */
export async function initContext(): Promise<void> {
  try {
    await invoke("init_context");
  } catch (e) {
    notifyError(`Failed to initialize app context: ${e}`, "StoreError");
  }
}

/** Create a new room and return the information required to send
 an out-of-band Join Code to others to connect. */
export async function createRoom(nickname: string): Promise<string> {
  try {
    let ticket = await invoke<string>("create_room", { nickname });
    return ticket;
  } catch (e) {
    notifyError(`Failed to create room: ${e}`, "RoomCreateError");
    return "";
  }
}

/** Join an existing room. */
export async function joinRoom(
  ticket: string,
  nickname: string
): Promise<boolean> {
  try {
    await invoke("join_room", { ticket, nickname });
    return true;
  } catch (e) {
    notifyError(`Failed to join room: ${e}`, "RoomJoinError");
    return false;
  }
}

/** Return the ticket string for the latest created room. */
export async function getLatestTicket(): Promise<string | null> {
  try {
    return await invoke<string | null>("get_latest_ticket");
  } catch (e) {
    notifyError(`Failed to get latest ticket: ${e}`, "TicketGetError");
    return null;
  }
}

/** Send a message to a room. */
export async function sendMessage(message: string): Promise<void> {
  try {
    await invoke("send_message", { message });
  } catch (e) {
    notifyError(`Failed to send message: ${e}`, "MessageSendError");
  }
}

/** Set a new nickname for this node. */
export async function setNickname(nickname: string): Promise<void> {
  try {
    await invoke("set_nickname", { nickname });
  } catch (e) {
    notifyError(`Failed to set nickname: ${e}`, "NicknameSetError");
  }
}

/** Get the stored nickname for this node. */
export async function getNickname(): Promise<string | null> {
  try {
    return await invoke<string | null>("get_nickname");
  } catch (e) {
    notifyError(`Failed to get nickname: ${e}`, "NicknameGetError");
    return null;
  }
}

/** Leave the currently joined room. */
export async function leaveRoom(): Promise<void> {
  try {
    await invoke("leave_room");
  } catch (e) {
    notifyError(`Failed to leave room: ${e}`, "RoomLeaveError");
  }
}

/** Disconnect from the session. */
export async function disconnect(): Promise<void> {
  try {
    await invoke("disconnect");
  } catch (e) {
    notifyError(`Failed to disconnect: ${e}`, "DisconnectError");
  }
}

/** Returns information about all the remote endpoints this endpoint knows about. */
export async function getPeers(): Promise<PeerInfo[]> {
  try {
    return await invoke<PeerInfo[]>("get_peers");
  } catch (e) {
    notifyError(`Failed to get peers: ${e}`, "PeersGetError");
    return [];
  }
}

/** Return the node id of this node */
export async function getNodeId(): Promise<string> {
  try {
    return await invoke<string>("get_node_id");
  } catch (e) {
    notifyError(`Failed to get node id: ${e}`, "NodeIdGetError");
    return "";
  }
}
