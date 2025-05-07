import { listen } from "@tauri-apps/api/event";
import Honeycomb from "components/Layout/loader";
import { useEffect } from "react";
import ChatIcon from "assets/chat.png";

export const SplashPage: React.FC = () => {
  useEffect(() => {
    // wait for backend to tell us it's finished setting up and loading info from persistent storage.
    const listenRef = listen("backend-init", async () => {
      setTimeout(() => {
        location.href = "/lobby";
      }, 1000);
    });
    return () => {
      listenRef.then((drop) => drop());
    };
  }, []);
  return (
    <div className="flex items-center justify-center h-screen w-screen flex-col space-y-6">
      <h1 className="text-3xl font-bold">Peer to Peer</h1>
      <img src={ChatIcon} alt="chat icon" className="w-36 h-auto" />
      <h1 className="text-3xl font-bold">Chat</h1>
      <Honeycomb className="m-5" color="#326fa8" />
    </div>
  );
};
