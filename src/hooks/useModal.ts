import { useEffect, useRef } from "react";

interface UseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const useModal = ({ isOpen, onClose }: UseModalProps) => {
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

  return dialogRef;
};
