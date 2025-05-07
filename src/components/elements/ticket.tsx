import { MdShare } from "react-icons/md";
import { notifyInfo } from "services/notifications";
import { getLatestTicket } from "services/ipc";

const TicketViewer: React.FC = () => {
  return (
    <div className="flex flex-row items-center space-x-2 p-1 max-w-screen">
      <button
        className="btn btn-accent"
        onClick={async () => {
          const ticket = await getLatestTicket();
          navigator.clipboard.writeText(ticket || "");
          notifyInfo("Room ID copied");
        }}
      >
        Invite <MdShare />
      </button>
    </div>
  );
};

export default TicketViewer;
