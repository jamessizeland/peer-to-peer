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
import { deleteConversation } from "services/db";
import { useConfirm } from "hooks/useConfirm";
import LobbyForm from "./lobbyForm";
import { IoMdAddCircle } from "react-icons/io";

const RoomsList: React.FC = () => {
  const [rooms, setRooms] = useState<VisitedRoom[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [openCreateRoom, setOpenCreateRoom] = useState<boolean>(false);
  const { confirm, ConfirmationModal } = useConfirm();
  useEffect(() => {
    getVisitedRooms().then((rooms) => {
      setRooms(rooms);
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
        {filterRooms().map(({ id, name, ticket }) => (
          <div key={id} className="flex flex-row items-center space-x-2 w-full">
            {/* Button to enter the room */}
            <button
              type="button"
              className="btn btn-info flex-grow justify-start btn-soft text-yellow-400 overflow-ellipsis"
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
              {name}
            </button>
            {/* Delete button */}
            <button
              type="button"
              className="btn btn-error btn-square"
              onClick={async () => {
                const confirmed = await confirm({
                  question:
                    "Are you sure you want to delete this room and its conversation history? This action cannot be undone.",
                  title: "Delete Room Confirmation",
                  yesText: "Delete",
                  noText: "Cancel",
                  invertColors: true,
                });
                if (confirmed) {
                  await deleteConversation(id);
                  await deleteVisitedRoom(id);
                  const updatedRooms = await getVisitedRooms();
                  setRooms(updatedRooms);
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
