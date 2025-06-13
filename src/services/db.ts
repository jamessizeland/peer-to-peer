// src/db.ts
import Database from "@tauri-apps/plugin-sql";
import { Conversation, Message, VisitedRoom } from "types";
import { MessageReceivedEvent } from "types/events";

// This will load the 'chat.db' database configured in the 'preload' section of tauri.conf.json
// Migrations are handled by the Tauri backend.
let db: Database | null = null;

export async function getDb() {
  if (db) return db;
  try {
    db = await Database.load("sqlite:chat.db");
    console.log("Database connection loaded.");
    return db;
  } catch (error) {
    console.error("Failed to load database:", error);
    throw error;
  }
}

/** Function to ensure a conversation record exists in the database. */
export async function ensureConversationExists(
  conversationId: string,
  conversationName?: string
): Promise<void> {
  if (!conversationId) {
    console.error("ensureConversationExists called with no conversationId");
    throw new Error("Conversation ID cannot be empty.");
  }
  const conn = await getDb();
  try {
    const result = await conn.select<Array<{ id: string }>>(
      "SELECT id FROM conversations WHERE id = $1",
      [conversationId]
    );

    if (result.length === 0) {
      console.log(
        `Conversation '${conversationId}' not found, creating with name: '${
          conversationName || "Unnamed Chat"
        }'...`
      );
      await conn.execute(
        "INSERT INTO conversations (id, name) VALUES ($1, $2)", // last_message_at will be NULL by default
        [
          conversationId,
          conversationName || `Chat ${conversationId.substring(0, 8)}`, // Default name
        ]
      );
      console.log(`Conversation '${conversationId}' created.`);
    } else {
      console.log(`Conversation '${conversationId}' already exists.`);
      // Potential future option: Update the name if it has changed (no mechanism for changing room names yet).
      // const existing = await conn.select<Conversation[]>("SELECT * FROM conversations WHERE id = $1", [conversationId]);
      // if (existing.length > 0 && conversationName && existing[0].name !== conversationName && existing[0].name !== `Chat ${conversationId.substring(0,8)}`) {
      //   console.log(`Updating conversation '${conversationId}' name to '${conversationName}'`);
      //   await conn.execute("UPDATE conversations SET name = $1 WHERE id = $2", [conversationName, conversationId]);
      // }
    }
  } catch (error) {
    console.error(
      `Error in ensureConversationExists for ID ${conversationId}:`,
      error
    );
    throw error; // Re-throw
  }
}

export function eventToMessage(
  eventPayload: MessageReceivedEvent,
  ticket: VisitedRoom
): Message {
  if (!ticket || !ticket.id) {
    console.error("buildMessage called with invalid roomTicket:", ticket);
    throw new Error("Invalid room ticket provided to buildMessage.");
  }
  return {
    id: globalThis.crypto.randomUUID(),
    nickname: eventPayload.nickname,
    conversation_id: ticket.id,
    content: eventPayload.text,
    created_at: eventPayload.sentTimestamp,
    sender_id: eventPayload.from,
  };
}

export function messageToEvent(message: Message): MessageReceivedEvent {
  return {
    type: "messageReceived",
    from: message.sender_id,
    nickname: message.nickname,
    text: message.content,
    sentTimestamp: message.created_at,
  };
}

/** Add message to the database for persistence. */
export async function addMessage(message: Message) {
  if (!message.conversation_id) {
    console.error("addMessage called with no conversation_id:", message);
    throw new Error("Message must have a conversation_id.");
  }
  console.log("addMessage: Attempting to begin transaction...");
  const db = await getDb();
  try {
    await db.execute(
      `
        BEGIN;
        INSERT INTO messages (id, conversation_id, sender_id, nickname, content, created_at) 
        VALUES ($1, $2, $3, $4, $5, $6);
        UPDATE conversations SET last_message_at = $7 WHERE id = $8;
        COMMIT;
      `,
      [
        // Parameters for the INSERT statement
        message.id,
        message.conversation_id,
        message.sender_id,
        message.nickname,
        message.content,
        message.created_at,
        // Parameters for the UPDATE statement
        message.created_at,
        message.conversation_id,
      ]
    );
    console.log("Message added and conversation updated successfully.");
  } catch (error) {
    await db.execute("ROLLBACK;");
    console.error("Failed to add message:", error);
    throw error; // Re-throw
  }
}

/** Retrieves messages for a given conversation ID, sorted by creation time. */
export async function getMessages(
  conversationId: string,
  page: number = 1,
  limit: number = 50
): Promise<Message[]> {
  if (!conversationId) {
    console.warn(
      "getMessages called with no conversationId. Returning empty array."
    );
    return [];
  }
  const db = await getDb();
  const offset = (page - 1) * limit;
  try {
    const messages = await db.select<Message[]>(
      "SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
      [conversationId, limit, offset]
    );
    console.log(
      `Fetched ${messages.length} messages for conversation '${conversationId}'`
    );
    // Messages are fetched in reverse chronological order for pagination (latest first)
    return messages.reverse();
  } catch (error) {
    console.error(
      `Error fetching messages for conversation ${conversationId}:`,
      error
    );
    throw error; // Re-throw
  }
}

/** Retrieve all conversations as a map of id to last_message_at. */
export async function getConversations(): Promise<
  Map<string, number | null | undefined>
> {
  const db = await getDb();
  try {
    const conversations = await db.select<Conversation[]>(
      "SELECT * FROM conversations"
    );
    const chatMap = new Map<string, number | null | undefined>();
    conversations.forEach((con) => chatMap.set(con.id, con.last_message_at));
    return chatMap;
  } catch (error) {
    console.error("Error fetching conversations: ", error);
    throw error; // Re-throw
  }
}

/**
 * Deletes a conversation and all of its associated messages from the database.
 * This works because of the "ON DELETE CASCADE" constraint in the messages table schema.
 * @param conversationId The ID of the conversation to delete.
 */
export async function deleteConversation(
  conversationId: string
): Promise<void> {
  if (!conversationId) {
    console.error("deleteConversation called with no conversationId");
    throw new Error("Conversation ID cannot be empty.");
  }

  console.log(`Attempting to delete conversation '${conversationId}'...`);
  const db = await getDb();

  try {
    // Only need to delete from the parent 'conversations' table.
    // The database will automatically delete all child messages.
    const result = await db.execute("DELETE FROM conversations WHERE id = $1", [
      conversationId,
    ]);

    if (result.rowsAffected > 0) {
      console.log(
        `Successfully deleted conversation '${conversationId}' and its messages.`
      );
    } else {
      console.warn(
        `Attempted to delete conversation '${conversationId}', but it was not found.`
      );
    }
  } catch (error) {
    console.error(`Error deleting conversation ${conversationId}:`, error);
    throw error; // Re-throw
  }
}
