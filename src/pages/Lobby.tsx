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
              if (await joinRoom(nickname, ticket)) {
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
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          required // Optional: makes the browser enforce that the field is filled
        />
        <input
          className="input input-accent"
          type="text"
          placeholder="Room ID"
          value={ticket}
          onChange={(e) => setTicket(e.target.value)}
        />
        <button disabled={!nickname} type="submit" className="btn btn-accent">
          {ticket ? "Join Room" : "Create Room"}
        </button>
      </form>
      {submitting && <p>Submitting...</p>}
    </div>
  );
}
