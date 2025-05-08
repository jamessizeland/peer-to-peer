import { useEffect, useState } from "react";
import { ChatEvent, MessageReceivedEvent } from "types/events";
import { listen } from "@tauri-apps/api/event";
import TopBar from "components/elements/topbar";
import EventLogModal from "components/elements/eventLog";
import Messages from "components/elements/messages";
import { notify } from "services/notifications";
import { PeerInfo } from "types";

export function ChatPage() {
  const [messages, setMessages] = useState<MessageReceivedEvent[]>([]);
  const [eventLog, setEventLog] = useState<ChatEvent[]>([]);
  const [neighbours, setNeighbours] = useState<PeerInfo[]>([]);
  const [openLog, setOpenLog] = useState<boolean>(false);

  useEffect(() => {
    const updatePeersRef = listen<PeerInfo[]>("peers-event", async (event) => {
      console.log(event.payload);
      setNeighbours(event.payload);
    });
    const welcomePeersRef = listen<String>("peers-new", async (event) => {
      notify(`${event.payload} joined the room`);
    });

    const eventsRef = listen<ChatEvent>("chat-event", async (event) => {
      console.log(event);
      setEventLog((eventLog) => [...eventLog, event.payload]);
      if (event.payload.type === "messageReceived") {
        const message = event.payload;
        setMessages((messages) => [...messages, message]);
      }
    });
    return () => {
      updatePeersRef.then((drop) => drop());
      eventsRef.then((drop) => drop());
      welcomePeersRef.then((drop) => drop());
    };
  }, []);

  return (
    <div className="flex flex-col items-center h-screen w-screen space-y-2">
      <TopBar openEventLog={() => setOpenLog(true)} neighbours={neighbours} />
      <EventLogModal
        eventLog={eventLog}
        isOpen={openLog}
        onClose={() => setOpenLog(false)}
      />
      <Messages messages={messages} />
    </div>
  );
}
