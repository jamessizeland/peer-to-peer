import { useEffect, useState } from "react";
import { ChatEvent } from "types/events";
import { listen } from "@tauri-apps/api/event";
import TopBar from "components/features/topbar";
import Messages from "components/features/messages";
import { notify, notifyError } from "services/notifications";
import { PeerInfo, VisitedRoom } from "types";
import { getLatestTicket } from "services/ipc";
import {
  addMessage,
  eventToMessage,
  ensureConversationExists,
} from "services/db";
import { useMessageLoader } from "hooks/useMessageLoader";

export function ChatPage() {
  const [eventLog, setEventLog] = useState<ChatEvent[]>([]);
  const [neighbours, setNeighbours] = useState<PeerInfo[]>([]);
  const [ticket, setTicket] = useState<VisitedRoom>();
  const {
    dbMessages,
    loadMorePreviousMessages,
    isLoadingMore,
    hasMoreOldMessages,
    addLiveMessageToDisplay,
  } = useMessageLoader({ ticket });

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
        await ensureConversationExists(ticket.id, ticket.name);
      } catch (error) {
        notifyError(`Failed to set up conversation: ${error}`, "convError");
      }
    };
    setupConversation();
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
      notify(`found ${event.payload}`, "newPeer", 1000);
    });

    const eventsRef = listen<ChatEvent>("chat-event", async (event) => {
      console.log(event);
      setEventLog((prevLog) => [...prevLog, event.payload]);
      if (event.payload.type === "messageReceived") {
        const liveMessage = event.payload;
        addLiveMessageToDisplay(liveMessage); // Update messages via the hook
        try {
          // Add message to database for persistence
          await addMessage(eventToMessage(liveMessage, ticket));
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
      <div className="w-full text-center pb-1">
        <TopBar eventLog={eventLog} neighbours={neighbours} />
        <h1 className="text-xl font-bold">{ticket?.name}</h1>
      </div>
      <Messages
        dbMessages={dbMessages}
        onLoadMore={loadMorePreviousMessages}
        isLoadingMore={isLoadingMore}
        hasMoreOldMessages={hasMoreOldMessages}
        peersOnline={neighbours.length > 0}
      />
    </div>
  );
}
