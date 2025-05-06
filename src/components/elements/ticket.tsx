import { IoMdCopy } from "react-icons/io";
import { notifyInfo } from "services/notifications";

const TicketViewer: React.FC<{ ticket?: string }> = ({ ticket }) => {
  return (
    <div className="flex flex-row items-center space-x-2 p-1 max-w-screen">
      <h2 className=" overflow-auto p-2 border border-accent rounded-md">
        {ticket}
      </h2>
      <button
        className="btn btn-accent text-2xl"
        onClick={() => {
          navigator.clipboard.writeText(ticket || "");
          notifyInfo("Copied to clipboard");
        }}
      >
        <IoMdCopy />
      </button>
    </div>
  );
};

export default TicketViewer;
