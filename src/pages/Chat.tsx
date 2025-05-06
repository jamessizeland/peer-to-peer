import { useEffect } from "react";
import { getPeers, leaveRoom, sendMessage, setNickname } from "services/ipc";

export function ChatPage() {
  useEffect(() => {
    getPeers().then((peers) => {
      console.log(peers);
    });
  });

  return (
    <div className="flex flex-col items-center h-screen w-screen space-y-2">
      <h1 className="m-2 text-2xl font-bold uppercase">Chat</h1>
    </div>
  );
}
