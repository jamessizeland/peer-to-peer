import { leaveRoom } from "services/ipc";
import PeerInfoDropdown from "./peerList";
import TicketViewer from "./ticket";
import { PeerInfo } from "types";
import { CiLogout, CiMemoPad } from "react-icons/ci";

const TopBar: React.FC<{
  openEventLog: () => void;
  neighbours: PeerInfo[];
}> = ({ openEventLog, neighbours }) => {
  return (
    <div className="w-screen flex justify-between p-1">
      <button
        type="button"
        className="text-2xl w-15 btn btn-accent"
        onClick={async () => {
          await leaveRoom();
          location.href = "/lobby";
        }}
      >
        <CiLogout />
      </button>
      <div className="flex flex-row space-x-2">
        <PeerInfoDropdown peers={neighbours} />
        <TicketViewer />
      </div>
      <button
        type="button"
        className="text-2xl w-15 btn btn-accent"
        onClick={() => {
          openEventLog();
        }}
      >
        <CiMemoPad />
      </button>
    </div>
  );
};

export default TopBar;
