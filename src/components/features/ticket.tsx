import { MdShare } from "react-icons/md";
import { notify, notifyError } from "services/notifications";
import { getLatestTicket } from "services/ipc";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";

const TicketViewer: React.FC = () => {
  return (
    <div className="flex flex-row space-x-2 max-w-screen">
      <button
        className="btn btn-primary bg-blue-950 hover:bg-primary"
        onClick={async () => {
          const ticket = await getLatestTicket();
          if (ticket === null) {
            notifyError("No Room ID to copy.");
            return;
          }
          const ticketString = ticket.ticket;
          await writeText(ticketString);
          notify(`🔗 Room ID copied to clipboard.`);
        }}
      >
        Invite <MdShare />
      </button>
    </div>
  );
};

export default TicketViewer;
