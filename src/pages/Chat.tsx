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
  eventToMessage,
  ensureConversationExists,
  getMessages,
  messageToEvent,
} from "services/db";

const MESSAGES_PER_PAGE = 20; // Number of messages to fetch per page

export function ChatPage() {
  const [dbMessages, setDbMessages] = useState<MessageReceivedEvent[]>([]);
  const [eventLog, setEventLog] = useState<ChatEvent[]>([]);
  const [neighbours, setNeighbours] = useState<PeerInfo[]>([]);
  const [openLog, setOpenLog] = useState<boolean>(false);
  const [ticket, setTicket] = useState<VisitedRoom>();

  // Pagination state for historical messages
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreOldMessages, setHasMoreOldMessages] = useState(true);

  useEffect(() => {
    getLatestTicket().then((newTicket) => {
      if (newTicket) {
        setTicket(newTicket);
        setDbMessages([]);
        setCurrentPage(1);
        setIsLoadingMore(false);
        setHasMoreOldMessages(true);
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

    // Load initial batch of messages (infinite scroll will load more if needed)
    const loadInitialMessages = async () => {
      if (!ticket) return;
      try {
        const persisted = await getMessages(ticket.id, 1, MESSAGES_PER_PAGE);
        if (persisted.length < MESSAGES_PER_PAGE) {
          setHasMoreOldMessages(false);
        }
        const historicalMessages: MessageReceivedEvent[] =
          persisted.map(messageToEvent);
        setDbMessages(historicalMessages);
        setCurrentPage(1);
      } catch (error) {
        notifyError(
          `Error loading persisted messages: ${error}`,
          "loadingError"
        );
        setHasMoreOldMessages(false); // Stop trying if error
      } finally {
        setIsLoadingMore(false);
      }
    };
    loadInitialMessages();
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
        setDbMessages((prevMsgs) => [...prevMsgs, liveMessage]);
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

  const loadMorePreviousMessages = async () => {
    if (!ticket || isLoadingMore || !hasMoreOldMessages) return;
    setIsLoadingMore(true);
    try {
      const nextPageToFetch = currentPage + 1;
      const persisted = await getMessages(
        ticket.id,
        nextPageToFetch,
        MESSAGES_PER_PAGE
      );
      if (persisted.length === 0) {
        setHasMoreOldMessages(false);
      } else {
        const historicalMessages: MessageReceivedEvent[] =
          persisted.map(messageToEvent);
        setDbMessages((prevMsgs) => [...prevMsgs, ...historicalMessages]);
        setCurrentPage(nextPageToFetch);
        if (persisted.length < MESSAGES_PER_PAGE) setHasMoreOldMessages(false);
      }
    } catch (error) {
      notifyError(`Error loading more messages: ${error}`, "loadingError");
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <div className="flex flex-col items-center h-screen w-screen space-y-2">
      <TopBar openEventLog={() => setOpenLog(true)} neighbours={neighbours} />
      <EventLogModal
        eventLog={eventLog}
        isOpen={openLog}
        onClose={() => setOpenLog(false)}
      />
      <h1 className="text-xl font-bold">{ticket?.name}</h1>
      <Messages
        dbMessages={dbMessages}
        onLoadMore={loadMorePreviousMessages}
        isLoadingMore={isLoadingMore}
        hasMoreOldMessages={hasMoreOldMessages}
      />
    </div>
  );
}
