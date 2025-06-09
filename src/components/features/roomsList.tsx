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

const RoomsList: React.FC = () => {
  const [rooms, setRooms] = useState<[string, string, string][]>([]);
  const [filter, setFilter] = useState<string>("");
  useEffect(() => {
    getVisitedRooms().then((rooms) => {
      setRooms(rooms);
    });
  }, []);

  const filterRooms = useCallback(() => {
    return rooms.filter((room) =>
      room[1].toLowerCase().includes(filter.toLowerCase())
    );
  }, [rooms, filter]);

  return (
    <div className="flex flex-col w-full lg:w-96 p-4">
      <SearchBar setFilter={setFilter} />
      <ul className="flex flex-col space-y-2 py-2 overflow-y-auto">
        {filterRooms().map(([id, name, ticket]) => (
          <li key={id} className="flex flex-row items-center space-x-2 w-full">
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
                await deleteVisitedRoom(id);
                let rooms = await getVisitedRooms();
                setRooms(rooms);
              }}
            >
              <MdDelete />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RoomsList;
