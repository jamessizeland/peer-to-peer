import { useState, useEffect } from "react";
import { CiLogin, CiShare1 } from "react-icons/ci";
import {
  createRoom,
  joinRoom,
  getNickname,
  getLatestTicket,
} from "services/ipc";

const LobbyForm: React.FC = () => {
  const [nickname, setNickname] = useState<string>();
  const [ticket, setTicket] = useState<string>();
  const [rejoinTicket, setRejoinTicket] = useState<string>();

  useEffect(() => {
    getNickname().then((name) => {
      if (name) setNickname(name);
    });
    getLatestTicket().then((ticket) => {
      if (ticket) setRejoinTicket(ticket);
    });
  }, []);
  return (
    <>
      <form
        className="flex flex-col space-y-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (nickname) {
            if (ticket) {
              if (await joinRoom(ticket, nickname)) {
                window.location.href = "/chat";
              }
            } else {
              if (await createRoom(nickname)) {
                window.location.href = "/chat";
              }
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
          {ticket ? (
            <>
              Enter Room <CiLogin />
            </>
          ) : (
            <>
              Create Room <CiShare1 />
            </>
          )}
        </button>
        {rejoinTicket ? (
          <button
            disabled={!nickname}
            type="button"
            className="btn btn-accent"
            onClick={async () => {
              if (!nickname) return;
              if (await joinRoom(rejoinTicket, nickname)) {
                window.location.href = "/chat";
              }
            }}
          >
            Rejoin Room <CiLogin />
          </button>
        ) : null}
      </form>
    </>
  );
};

export default LobbyForm;
