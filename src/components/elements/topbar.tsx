import { MdArrowBack, MdInfo } from "react-icons/md";
import { leaveRoom } from "services/ipc";
import PeerInfoDropdown from "./peerList";
import TicketViewer from "./ticket";
import { PeerInfo } from "types";

const TopBar: React.FC<{
  openEventLog: () => void;
  neighbours: PeerInfo[];
}> = ({ openEventLog, neighbours }) => {
  return (
    <div className="w-screen h-10 text-white flex justify-between">
      <button
        type="button"
        className="text-2xl w-15 btn btn-outline btn-accent"
        onClick={async () => {
          await leaveRoom();
          location.href = "/lobby";
        }}
      >
        <MdArrowBack />
      </button>
      <div className="flex flex-row space-x-2">
        <PeerInfoDropdown peers={neighbours} />
        <TicketViewer />
      </div>
      <button
        type="button"
        className="text-2xl w-15 btn btn-outline btn-accent"
        onClick={() => {
          openEventLog();
        }}
      >
        <MdInfo />
      </button>
    </div>
  );
};

export default TopBar;
