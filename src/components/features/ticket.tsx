import { MdShare } from "react-icons/md";
import { notifyInfo } from "services/notifications";
import { getLatestTicket } from "services/ipc";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";

const TicketViewer: React.FC = () => {
  return (
    <div className="flex flex-row space-x-2 max-w-screen">
      <button
        className="btn btn-accent"
        onClick={async () => {
          const ticket = await getLatestTicket();
          await writeText(ticket || "");
          notifyInfo(`Room ID copied:\n ${ticket}`);
        }}
      >
        Invite <MdShare />
      </button>
    </div>
  );
};

export default TicketViewer;
