import Footer from "components/Layout/footer";
import { useState, useEffect } from "react";
import { createRoom, joinRoom, getNickname } from "services/ipc";

export function LobbyPage() {
  const [nickname, setNickname] = useState<string>();
  const [ticket, setTicket] = useState<string>();
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    getNickname().then((name) => {
      if (name) setNickname(name);
    });
  }, []);

  return (
    <div className="flex flex-col items-center h-screen w-screen space-y-2">
      <h1 className="m-2 text-2xl font-bold uppercase">Lobby</h1>
      {/*  create a new room or join an existing room */}
      <form
        className="flex flex-col space-y-2"
        onSubmit={async (e) => {
          setSubmitting(true);
          e.preventDefault();
          if (nickname) {
            if (ticket) {
              if (await joinRoom(ticket, nickname)) {
                window.location.href = "/chat";
              }
              setSubmitting(false);
            } else {
              if (await createRoom(nickname)) {
                window.location.href = "/chat";
              }
              setSubmitting(false);
            }
          }
        }}
      >
        <input
          className="input input-accent"
          type="text"
          placeholder="Nickname"
          defaultValue={nickname}
          onChange={(e) => setNickname(e.target.value)}
          required // Optional: makes the browser enforce that the field is filled
        />
        <input
          className="input input-accent"
          type="text"
          placeholder="Room ID"
          defaultValue={ticket}
          onChange={(e) => setTicket(e.target.value)}
        />
        <button disabled={!nickname} type="submit" className="btn btn-accent">
          {ticket ? "Join Room" : "Create Room"}
        </button>
      </form>
      {submitting && <p>Submitting...</p>}
      <p className="backdrop-opacity-100 p-2 m-4 text-sm border rounded-md border-accent max-h-fit">
        This is a peer to peer messaging app using the{" "}
        <a
          target="_blank"
          className="link link-secondary"
          href="https://www.iroh.computer/proto/iroh-gossip"
        >
          Iroh Gossip Protocol
        </a>{" "}
        to send messages between peers sharing a Room. <br />
        <br />
        Messages are sent as events to all connected peers directly, are
        encrypted as standard and are not persisted anywhere. <br />
        <br />
        This is a proof of concept based heavily on the{" "}
        <a
          target="_blank"
          className="link link-secondary"
          href="https://github.com/n0-computer/iroh-examples/tree/main/browser-chat"
        >
          Iroh chat example
        </a>{" "}
        and modified for a Tauri App.
      </p>
      <div className="h-full"></div>
      <Footer />
    </div>
  );
}
