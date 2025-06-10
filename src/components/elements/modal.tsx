import { useModal } from "hooks/useModal";
import { GrClose } from "react-icons/gr";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  id?: string;
}

const Modal: React.FC<
  ModalProps & { title?: string; children?: React.ReactNode }
> = ({ isOpen, onClose, title, children, id }) => {
  const dialogRef = useModal({ isOpen, onClose });

  return (
    <dialog ref={dialogRef} id={id} className="modal">
      <div className="modal-box flex justify-center flex-col items-center">
        {title && <h3 className="text-lg font-semibold mb-2">{title}</h3>}
        <div className="h-full w-full overflow-y-auto">{children}</div>
        <form method="dialog" className="modal-action flex justify-end">
          <button className="btn btn-primary" onClick={onClose}>
            Close <GrClose />
          </button>
        </form>
      </div>
    </dialog>
  );
};

export default Modal;
