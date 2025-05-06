import React, { useEffect, useRef } from "react";
import { ChatEvent } from "types/chat";

interface EventLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventLog: ChatEvent[];
}

const EventLogModal: React.FC<EventLogModalProps> = ({
  isOpen,
  onClose,
  eventLog,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogNode = dialogRef.current;
    if (!dialogNode) return;

    if (isOpen) {
      if (!dialogNode.hasAttribute("open")) {
        dialogNode.showModal(); // Use showModal() for true modal behavior
      }
    } else {
      if (dialogNode.hasAttribute("open")) {
        dialogNode.close();
      }
    }
  }, [isOpen]);

  // Handles the dialog's native 'close' event (e.g., ESC key)
  useEffect(() => {
    const dialogNode = dialogRef.current;
    if (!dialogNode) return;

    const handleNativeClose = () => {
      if (isOpen) {
        // Only call onClose if the parent thinks it's open
        onClose(); // Sync parent state
      }
    };

    dialogNode.addEventListener("close", handleNativeClose);
    return () => {
      dialogNode.removeEventListener("close", handleNativeClose);
    };
  }, [isOpen, onClose]);

  return (
    <dialog ref={dialogRef} id="event-log" className="modal">
      <div className="modal-box flex justify-center flex-col items-center">
        <h3 className="text-lg font-semibold mb-2">Event Log</h3>
        <div className="h-64 w-full overflow-y-auto border border-gray-300 rounded-md p-2 bg-base-200">
          {eventLog.length === 0 && (
            <p className="text-gray-500">No events yet.</p>
          )}
          {eventLog
            .slice()
            .reverse()
            .map((event, index) => (
              <div key={index} className="p-1 border-b border-gray-400 text-sm">
                <pre className="whitespace-pre-wrap break-all">
                  {JSON.stringify(event, null, 2)}
                </pre>
              </div>
            ))}
        </div>
        <div className="modal-action flex justify-end">
          <button className="btn btn-accent" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
};

export default EventLogModal;
