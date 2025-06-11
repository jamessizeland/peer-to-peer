import { useModal } from "hooks/useModal";
import { GrClose } from "react-icons/gr";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  id?: string;
  title?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  id,
  actions,
}) => {
  const dialogRef = useModal({ isOpen, onClose });

  return (
    <dialog ref={dialogRef} id={id} className="modal">
      <div className="modal-box flex justify-center flex-col items-center">
        {title && <h3 className="text-lg font-semibold mb-2">{title}</h3>}
        <div className="h-full w-full overflow-y-auto">{children}</div>
        {actions ? (
          // Render custom actions if provided
          <div className="modal-action flex justify-center space-x-4 mt-4">
            {actions}
          </div>
        ) : (
          // Otherwise, render the default close button
          <form method="dialog" className="modal-action flex justify-end mt-4">
            <button
              className="btn btn-ghost btn-sm sm:btn-md"
              onClick={onClose}
            >
              Close <GrClose />
            </button>
          </form>
        )}
      </div>
    </dialog>
  );
};

export default Modal;
