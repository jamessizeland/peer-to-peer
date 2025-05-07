import { useCallback, useEffect, useState } from "react";
import { ChatEvent, MessageReceivedEvent } from "types/events";
import { listen } from "@tauri-apps/api/event";
import TopBar from "components/elements/topbar";
import TicketViewer from "components/elements/ticket";
import EventLogModal from "components/elements/eventLog";
import Messages from "components/elements/messages";
import { notify } from "services/notifications";
import { PeerInfo, PeerStatus } from "types";

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

    const eventsRef = listen<ChatEvent>("chat-event", async (event) => {
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
          break;
      }
    });
    return () => {
      updatePeersRef.then((drop) => drop());
      eventsRef.then((drop) => drop());
    };
  }, []);

  return (
    <div className="flex flex-col items-center h-screen w-screen space-y-2">
      <TopBar openEventLog={() => setOpenLog(true)} />
      <div className="flex flex-row">
        <PeerInfoDropdown peers={neighbours} />
        <TicketViewer />
      </div>
      <EventLogModal
        eventLog={eventLog}
        isOpen={openLog}
        onClose={() => setOpenLog(false)}
      />
      <Messages messages={messages} />
    </div>
  );
}

const PeerInfoDropdown: React.FC<{ peers: PeerInfo[] }> = ({ peers }) => {
  console.log("dropdown", peers);
  const online = useCallback(() => {
    return peers.filter((p) => p.status === "Online");
  }, [peers]);

  return (
    <div className="dropdown dropdown-center">
      <div tabIndex={0} role="button" className="btn btn-accent m-1">
        Online: {online().length}
      </div>
      <ul
        tabIndex={0}
        className="dropdown-content menu bg-base-100 rounded-box z-1 w-52 p-2 shadow-sm"
      >
        {peers.map((peer) => (
          <li key={peer.id}>
            <PeerActivityStatus status={peer.status} />
            {peer.nickname} -{" "}
            {new Date(peer.lastSeen / 1000).toLocaleTimeString()}
          </li>
        ))}
      </ul>
    </div>
  );
};

const PeerActivityStatus: React.FC<{ status: PeerStatus }> = ({ status }) => {
  switch (status) {
    case "Online":
      return (
        <span className="status mx-1" style={{ backgroundColor: "green" }} />
      );
    case "Offline":
      return (
        <span className="status mx-1" style={{ backgroundColor: "red" }} />
      );
    case "Away":
      return (
        <span className="status mx-1" style={{ backgroundColor: "yellow" }} />
      );
  }
};
