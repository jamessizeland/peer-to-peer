import { MdShare } from "react-icons/md";
import { notifyError, notifyInfo } from "services/notifications";
import { getLatestTicket } from "services/ipc";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";

const TicketViewer: React.FC = () => {
  return (
    <div className="flex flex-row space-x-2 max-w-screen">
      <button
        className="btn btn-primary"
        onClick={async () => {
          const ticket = await getLatestTicket();
          if (ticket === null) {
            notifyError("No Room ID to copy.");
            return;
          }
          await writeText(ticket[0]);
          notifyInfo(`Room ID copied:\n ${ticket}`);
        }}
      >
        Invite <MdShare />
      </button>
    </div>
  );
};

export default TicketViewer;
