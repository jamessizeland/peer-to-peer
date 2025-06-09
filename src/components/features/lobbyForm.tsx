import Modal, { ModalProps } from "components/elements/modal";
import { useState, useEffect } from "react";
import { CiLogin, CiShare1 } from "react-icons/ci";
import { createRoom, joinRoom, getNickname } from "services/ipc";

const LobbyForm: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const [nickname, setNickname] = useState<string>();
  const [roomName, setRoomName] = useState<string>();
  const [ticket, setTicket] = useState<string>();

  useEffect(() => {
    getNickname().then((name) => {
      if (name) setNickname(name);
    });
  }, []);
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4 flex flex-col items-center p-4 border rounded-md border-secondary">
        <form
          className="flex flex-col space-y-2 items-center"
          onSubmit={async (e) => {
            e.preventDefault();
            if (nickname) {
              if (ticket) {
                if (await joinRoom(ticket, nickname)) {
                  window.location.href = "/chat";
                }
              } else if (roomName) {
                if (await createRoom(nickname, roomName)) {
                  window.location.href = "/chat";
                }
              }
            }
          }}
        >
          <input
            className="input input-primary"
            type="text"
            placeholder="Room name"
            defaultValue={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            required // Optional: makes the browser enforce that the field is filled
          />
          <button
            disabled={!nickname || !roomName}
            type="submit"
            className="btn btn-primary"
          >
            Create Room <CiShare1 />
          </button>
        </form>
        <form
          className="flex flex-col space-y-2 items-center"
          onSubmit={async (e) => {
            e.preventDefault();
            if (nickname) {
              if (ticket) {
                if (await joinRoom(ticket, nickname)) {
                  window.location.href = "/chat";
                }
              } else if (roomName) {
                if (await createRoom(nickname, roomName)) {
                  window.location.href = "/chat";
                }
              }
            }
          }}
        >
          <input
            className="input input-primary"
            type="text"
            placeholder="Room ID"
            defaultValue={ticket}
            onChange={(e) => setTicket(e.target.value)}
          />
          <button
            disabled={!nickname || !ticket}
            type="submit"
            className="btn btn-primary"
          >
            Enter Room <CiLogin />
          </button>
        </form>
      </div>
    </Modal>
  );
};

export default LobbyForm;
