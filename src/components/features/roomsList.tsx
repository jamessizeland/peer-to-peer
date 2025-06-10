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

const RoomsList: React.FC = () => {
  const [rooms, setRooms] = useState<VisitedRoom[]>([]);
  const [filter, setFilter] = useState<string>("");
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
    <div className="flex flex-col flex-1 w-full px-4 pt-4 lg:w-96 min-h-0">
      <SearchBar setFilter={setFilter} />
      <div className="grow space-y-2 py-2 overflow-y-scroll min-h-0">
        {filterRooms().map(({ id, name, ticket }) => (
          <div key={id} className="flex flex-row items-center space-x-2 w-full">
            {/* Button to enter the room */}
            <button
              type="button"
              className="btn btn-primary flex-grow justify-start btn-outline text-yellow-400 overflow-ellipsis"
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
              className="btn btn-outline btn-error btn-square"
              onClick={async () => {
                if (confirm("Are you sure you want to delete this room?")) {
                  await deleteConversation(id);
                  await deleteVisitedRoom(id);
                  let rooms = await getVisitedRooms();
                  setRooms(rooms);
                }
              }}
            >
              <MdDelete />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RoomsList;
