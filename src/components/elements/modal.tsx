import { useModal } from "hooks/useModal";
import { GrClose } from "react-icons/gr";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children?: React.ReactNode;
}

const Modal: React.FC<AboutModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  const dialogRef = useModal({ isOpen, onClose });

  return (
    <dialog ref={dialogRef} id="event-log" className="modal">
      <div className="modal-box flex justify-center flex-col items-center">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <div className="h-64 w-full overflow-y-auto border border-gray-300 rounded-md p-2 bg-base-200">
          {children}
        </div>
        <div className="modal-action flex justify-end">
          <button className="btn btn-accent" onClick={onClose}>
            Close <GrClose />
          </button>
        </div>
      </div>
    </dialog>
  );
};

export default Modal;
