import { leaveRoom } from "services/ipc";
import PeerInfoModal from "./peerList";
import TicketViewer from "./ticket";
import { PeerInfo } from "types";
import { CiLogout, CiMemoPad } from "react-icons/ci";
import Button from "components/elements/button";
import { ChatEvent } from "types/events";
import EventLogModal from "./eventLog";
import { useState } from "react";

const TopBar: React.FC<{
  eventLog: ChatEvent[];
  neighbours: PeerInfo[];
}> = ({ eventLog, neighbours }) => {
  const [openLog, setOpenLog] = useState<boolean>(false);

  return (
    <div className="w-screen flex justify-between bg-blue-950 py-1 px-1">
      <Button
        onClick={async () => {
          await leaveRoom();
          location.href = "/lobby";
        }}
      >
        <CiLogout />
      </Button>
      <div className="flex flex-row space-x-2">
        <PeerInfoModal peers={neighbours} />
        <TicketViewer />
      </div>
      <EventLogModal
        eventLog={eventLog}
        isOpen={openLog}
        onClose={() => setOpenLog(false)}
      />
      <Button onClick={() => setOpenLog(true)}>
        <CiMemoPad />
      </Button>
    </div>
  );
};

export default TopBar;
