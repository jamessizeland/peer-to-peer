import { useModal } from "hooks/useModal";
import { GrClose } from "react-icons/gr";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const Modal: React.FC<
  ModalProps & { title?: string; children?: React.ReactNode }
> = ({ isOpen, onClose, title, children }) => {
  const dialogRef = useModal({ isOpen, onClose });

  return (
    <dialog ref={dialogRef} id="event-log" className="modal">
      <div className="modal-box flex justify-center flex-col items-center">
        {title && <h3 className="text-lg font-semibold mb-2">{title}</h3>}
        <div className="h-full w-full overflow-y-auto">{children}</div>
        <div className="modal-action flex justify-end">
          <button className="btn btn-primary" onClick={onClose}>
            Close <GrClose />
          </button>
        </div>
      </div>
    </dialog>
  );
};

export default Modal;
