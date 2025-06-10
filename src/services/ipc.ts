import { invoke } from "@tauri-apps/api/core";
import { notifyError } from "./notifications";
import { VisitedRoom } from "types";

/** Create a new room and return the information required to send
 an out-of-band Join Code to others to connect. */
export async function createRoom(
  nickname: string,
  name: string
): Promise<string> {
  try {
    let ticket = await invoke<string>("create_room", { nickname, name });
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
export async function getLatestTicket(): Promise<VisitedRoom | null> {
  try {
    return await invoke<VisitedRoom | null>("get_latest_ticket");
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

/** Return the node id of this node. */
export async function getNodeId(): Promise<string> {
  try {
    return await invoke<string>("get_node_id");
  } catch (e) {
    notifyError(`Failed to get node id: ${e}`, "NodeIdGetError");
    return "";
  }
}

/** Return the list of visited rooms in order of most recently visited.
 * [topic_id, room_name, ticket_string]
 */
export async function getVisitedRooms(): Promise<VisitedRoom[]> {
  try {
    return await invoke<VisitedRoom[]>("get_visited_rooms");
  } catch (e) {
    notifyError(`Failed to get visited rooms: ${e}`, "RoomsGetError");
    return [];
  }
}

/** Delete a visited room from the list. */
export async function deleteVisitedRoom(topic: string) {
  try {
    await invoke("delete_visited_room", { topic });
  } catch (e) {
    notifyError(`Failed to delete: ${e}`, "RoomsDeleteError");
  }
}
