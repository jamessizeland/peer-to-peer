import { leaveRoom } from "services/ipc";
import PeerInfoDropdown from "./peerList";
import TicketViewer from "./ticket";
import { PeerInfo } from "types";
import { CiLogout, CiMemoPad } from "react-icons/ci";
import Button from "components/elements/button";

const TopBar: React.FC<{
  openEventLog: () => void;
  neighbours: PeerInfo[];
}> = ({ openEventLog, neighbours }) => {
  return (
    <div className="w-screen flex justify-between p-1">
      <Button
        onClick={async () => {
          await leaveRoom();
          location.href = "/lobby";
        }}
      >
        <CiLogout />
      </Button>
      <div className="flex flex-row space-x-2">
        <PeerInfoDropdown peers={neighbours} />
        <TicketViewer />
      </div>
      <Button onClick={openEventLog}>
        <CiMemoPad />
      </Button>
    </div>
  );
};

export default TopBar;
