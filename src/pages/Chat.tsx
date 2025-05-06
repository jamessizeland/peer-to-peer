import { useEffect, useState } from "react";
import { getLatestTicket, getPeers } from "services/ipc";
import { ChatEvent } from "types/chat";
import { listen } from "@tauri-apps/api/event";
import { MessageReceivedEvent } from "types/chat";
import TopBar from "components/elements/topbar";
import TicketViewer from "components/elements/ticket";
import EventLogModal from "components/elements/eventLog";
import Messages from "components/elements/messages";
import { notify } from "services/notifications";
import { PeerInfo } from "types";

export function ChatPage() {
  const [ticket, setTicket] = useState<string>();
  const [messages, setMessages] = useState<MessageReceivedEvent[]>([]);
  const [eventLog, setEventLog] = useState<ChatEvent[]>([]);
  const [neighbours, setNeighbours] = useState<PeerInfo[]>([]);
  const [openLog, setOpenLog] = useState<boolean>(false);

  useEffect(() => {
    getLatestTicket().then((ticket) => {
      console.log(ticket);
      if (ticket) setTicket(ticket);
    });
  }, []);

  useEffect(() => {
    const eventsRef = listen<ChatEvent>("chat-event", (event) => {
      console.log(event);
      setEventLog((eventLog) => [...eventLog, event.payload]);
      switch (event.payload.type) {
        case "messageReceived":
          const message = event.payload;
          setMessages((messages) => [...messages, message]);
          break;
        case "joined":
          const peer = event.payload;
          peer.neighbors.forEach((n) => {
            notify(`${n} joined the room`);
          });
          getPeers().then((peers) => {
            setNeighbours(peers);
          });
          break;
      }
    });
    return () => {
      eventsRef.then((drop) => drop());
    };
  }, []);

  return (
    <div className="flex flex-col items-center h-screen w-screen space-y-2">
      <TopBar openEventLog={() => setOpenLog(true)} />
      <p>Online: {neighbours.length}</p>
      <TicketViewer ticket={ticket} />
      <EventLogModal
        eventLog={eventLog}
        isOpen={openLog}
        onClose={() => setOpenLog(false)}
      />
      <Messages messages={messages} />
    </div>
  );
}
