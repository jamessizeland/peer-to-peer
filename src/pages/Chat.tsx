import { useEffect, useState } from "react";
import { ChatEvent, MessageReceivedEvent } from "types/events";
import { listen } from "@tauri-apps/api/event";
import TopBar from "components/features/topbar";
import EventLogModal from "components/features/eventLog";
import Messages from "components/features/messages";
import { notify, notifyError } from "services/notifications";
import { PeerInfo, VisitedRoom } from "types";
import { getLatestTicket } from "services/ipc";
import {
  addMessage,
  buildMessage,
  ensureConversationExists,
  getMessages,
} from "services/db";

export function ChatPage() {
  const [messages, setMessages] = useState<MessageReceivedEvent[]>([]);
  const [eventLog, setEventLog] = useState<ChatEvent[]>([]);
  const [neighbours, setNeighbours] = useState<PeerInfo[]>([]);
  const [openLog, setOpenLog] = useState<boolean>(false);
  const [ticket, setTicket] = useState<VisitedRoom>();

  useEffect(() => {
    getLatestTicket().then((newTicket) => {
      if (newTicket) {
        setTicket(newTicket);
      }
    });
  }, []);

  useEffect(() => {
    if (!ticket) return;
    const setupConversation = async () => {
      try {
        // Ensure the conversation record exists in the DB
        await ensureConversationExists(ticket.id, ticket.name);
      } catch (error) {
        notifyError(
          `Failed to set up conversation: ${error}`,
          "setupConvError"
        );
      }
    };
    setupConversation();

    const loadPersistedMessages = async () => {
      try {
        const persisted = await getMessages(ticket.id);
        const historicalMessages: MessageReceivedEvent[] = persisted.map(
          (dbMsg) => ({
            type: "messageReceived",
            from: dbMsg.sender_id,
            nickname: dbMsg.nickname,
            text: dbMsg.content,
            sentTimestamp: dbMsg.created_at,
          })
        );
        setMessages(historicalMessages);
      } catch (error) {
        notifyError(
          `Error loading persisted messages: ${error}`,
          "loadingError"
        );
      }
    };
    loadPersistedMessages();
  }, [ticket]);

  useEffect(() => {
    // If ticket is not yet available, don't set up listeners that depend on it.
    // The effect will re-run when ticket is set.
    if (!ticket) return;
    const updatePeersRef = listen<PeerInfo[]>("peers-event", async (event) => {
      console.log(event.payload);
      setNeighbours(event.payload);
    });
    const welcomePeersRef = listen<String>("peers-new", async (event) => {
      notify(`${event.payload} joined ${ticket.name}`);
    });

    const eventsRef = listen<ChatEvent>("chat-event", async (event) => {
      console.log(event);
      setEventLog((prevLog) => [...prevLog, event.payload]);
      if (event.payload.type === "messageReceived") {
        const liveMessage = event.payload;
        setMessages((prevMsgs) => [...prevMsgs, liveMessage]);
        try {
          // Add message to database for persistence
          await addMessage(buildMessage(liveMessage, ticket));
        } catch (dbError) {
          console.error("Failed to persist message:", dbError);
          notifyError(`Error saving message: ${dbError}`, "saveMsgError");
        }
      }
    });
    return () => {
      Promise.all([updatePeersRef, eventsRef, welcomePeersRef]).then((drops) =>
        drops.forEach((drop) => drop())
      );
    };
  }, [ticket]);

  return (
    <div className="flex flex-col items-center h-screen w-screen space-y-2">
      <TopBar openEventLog={() => setOpenLog(true)} neighbours={neighbours} />
      <EventLogModal
        eventLog={eventLog}
        isOpen={openLog}
        onClose={() => setOpenLog(false)}
      />
      <h1 className="text-xl font-bold">{ticket?.name}</h1>
      <Messages messages={messages} />
    </div>
  );
}
