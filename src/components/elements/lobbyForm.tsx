import { useState, useEffect } from "react";
import { createRoom, joinRoom, getNickname } from "services/ipc";

const LobbyForm: React.FC = () => {
  const [nickname, setNickname] = useState<string>();
  const [ticket, setTicket] = useState<string>();
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    getNickname().then((name) => {
      if (name) setNickname(name);
    });
  }, []);
  return (
    <>
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
    </>
  );
};

export default LobbyForm;
