import { useEffect, useState } from "react";
import { IoMdCopy } from "react-icons/io";
import {
  getLatestTicket,
  getNickname,
  getPeers,
  leaveRoom,
  sendMessage,
} from "services/ipc";
import { ChatEvent } from "types/chat";
import { listen } from "@tauri-apps/api/event";

export function ChatPage() {
  const [ticket, setTicket] = useState<string>();
  // const [peers, setPeers] = useState<PeerInfo[]>([]);
  // const [messages, setMessages] = useState<string[]>([]);
  const [nickname, setNickname] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [eventLog, setEventLog] = useState<ChatEvent[]>([]);

  useEffect(() => {
    getLatestTicket().then((ticket) => {
      console.log(ticket);
      if (ticket) setTicket(ticket);
    });

    getPeers().then((peers) => {
      console.log(peers);
      // if (peers) setPeers(peers);
    });
    getNickname().then((name) => {
      if (name) setNickname(name);
    });
    const eventsRef = listen<ChatEvent>("chat-event", (event) => {
      console.log(event);
      setEventLog((eventLog) => [...eventLog, event.payload]);
    });
    return () => {
      eventsRef.then((drop) => drop());
    };
  }, []);

  return (
    <div className="flex flex-col items-center h-screen w-screen space-y-2">
      <h1 className="m-2 text-2xl font-bold uppercase">Chat</h1>
      <h2 className="">{nickname}</h2>
      <div className="flex flex-row items-center space-x-2 p-3 max-w-screen">
        <h2 className=" overflow-auto p-2 border border-accent rounded-md">
          {ticket}
        </h2>
        <button
          className="btn btn-accent"
          onClick={() => {
            navigator.clipboard.writeText(ticket || "");
          }}
        >
          <IoMdCopy />
        </button>
      </div>
      <form
        className="flex flex-col space-y-2"
        onSubmit={async (e) => {
          setSubmitting(true);
          e.preventDefault();
          if (message) {
            await sendMessage(message);
            setMessage("");
            setSubmitting(false);
          }
        }}
      >
        <input
          className="input input-accent"
          type="text"
          placeholder="Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required // Optional: makes the browser enforce that the field is filled
        />
        <button disabled={!message} type="submit" className="btn btn-accent">
          Send
        </button>
      </form>
      <button
        className="btn btn-accent"
        onClick={async () => {
          await leaveRoom();
          window.location.href = "/";
        }}
      >
        Leave Room
      </button>
      {submitting && <p>Submitting...</p>}
      {/* Event Log Section */}
      <div className="w-full max-w-md mt-4">
        <h3 className="text-lg font-semibold mb-2">Event Log</h3>
        <div className="h-64 overflow-y-auto border border-gray-300 rounded-md p-2 bg-base-200 flex flex-col-reverse">
          {/* We use flex flex-col-reverse to keep the scroll bar at the bottom initially if content overflows,
              but since we are also reversing the array, new items will appear at the top.
              Alternatively, map over eventLog.slice().reverse() and don't use flex-col-reverse.
              Let's go with reversing the array for clarity on "latest first". */}
          {eventLog.length === 0 && (
            <p className="text-gray-500">No events yet.</p>
          )}
          {eventLog
            .slice()
            .reverse()
            .map((event, index) => (
              <div key={index} className="p-1 border-b border-gray-400 text-sm">
                <pre className="whitespace-pre-wrap break-all">
                  {JSON.stringify(event, null, 2)}
                </pre>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
