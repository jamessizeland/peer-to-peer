import { useCallback, useEffect, useState } from "react";
import SearchBar from "./search";
import { MdDelete } from "react-icons/md";
import {
  deleteVisitedRoom,
  getNickname,
  getVisitedRooms,
  joinRoom,
} from "services/ipc";
import { notifyWarning } from "services/notifications";
import { VisitedRoom } from "types";
import { deleteConversation, getConversations } from "services/db";
import { useConfirm } from "hooks/useConfirm";
import LobbyForm from "./lobbyForm";
import { IoMdAddCircle } from "react-icons/io";
import { formatDate } from "utils";

const RoomsList: React.FC = () => {
  const [rooms, setRooms] = useState<VisitedRoom[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [openCreateRoom, setOpenCreateRoom] = useState<boolean>(false);
  const { confirm, ConfirmationModal } = useConfirm();
  useEffect(() => {
    getVisitedRooms().then(async (rooms) => {
      const conv = await getConversations();
      setRooms(
        rooms.map((room) => ({
          ...room,
          last_message_at: conv.get(room.id),
        }))
      );
    });
  }, []);

  const filterRooms = useCallback(() => {
    return rooms.filter((room) =>
      room.name.toLowerCase().includes(filter.toLowerCase())
    );
  }, [rooms, filter]);

  return (
    <div className="flex flex-col flex-1 w-full px-4 pt-1 min-h-0 space-y-2">
      <SearchBar setFilter={setFilter} />
      <LobbyForm
        isOpen={openCreateRoom}
        onClose={() => setOpenCreateRoom(false)}
      />
      <div className="grow space-y-2 overflow-y-scroll min-h-0">
        <button
          className="btn btn-primary bg-blue-950 hover:bg-primary flex-grow text-white overflow-ellipsis w-full text-center"
          type="button"
          onClick={() => setOpenCreateRoom(true)}
        >
          <>
            Add <IoMdAddCircle />
          </>
        </button>
        {filterRooms().map(({ id, name, ticket, last_message_at }) => (
          <div key={id} className="flex flex-row items-center w-full">
            {/* Button to enter the room */}
            <button
              type="button"
              className="btn btn-info h-14 flex-grow justify-start btn-soft text-yellow-400 overflow-ellipsis"
              onClick={async () => {
                let nickName = await getNickname();
                if (!nickName) {
                  notifyWarning("Please set a nickname first");
                  return;
                }
                if (await joinRoom(ticket, nickName)) {
                  window.location.href = "/chat";
                }
              }}
            >
              <div className="flex flex-col items-start space-y-1">
                <span className="mr-1 font-semibold">{name}</span>
                <span className="text-xs opacity-50 text-white">
                  Last active:{" "}
                  {last_message_at ? (
                    <time className="">
                      {formatDate(last_message_at / 1000)}
                    </time>
                  ) : (
                    "Never"
                  )}
                </span>
              </div>
            </button>
            {/* Delete button */}
            <button
              type="button"
              className="btn btn-square h-10 w-10 text-xl btn-ghost absolute right-6"
              onClick={async () => {
                const confirmed = await confirm({
                  question: `Are you sure you want to delete this room's ticket and its conversation history from your device? This action cannot be undone.`,
                  title: `Forget Room: ${name}`,
                  yesText: "Forget",
                  noText: "Cancel",
                  invertColors: true,
                });
                if (confirmed) {
                  await deleteConversation(id);
                  await deleteVisitedRoom(id);
                  const conv = await getConversations();
                  const updatedRooms = await getVisitedRooms();
                  setRooms(
                    updatedRooms.map((room) => ({
                      ...room,
                      last_message_at: conv.get(room.id),
                    }))
                  );
                }
              }}
            >
              <MdDelete />
            </button>
          </div>
        ))}
      </div>
      <ConfirmationModal />
    </div>
  );
};

export default RoomsList;
