import { useEffect, useState } from "react";
import { getNickname, setNickname } from "services/ipc";
import { FaEdit } from "react-icons/fa";
import { useModal } from "hooks/useModal";
import { notifyError } from "services/notifications";
import { GrClose } from "react-icons/gr";
import Honeycomb from "components/Layout/loader";
import { ModalProps } from "components/elements/modal";

const UserEditModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const dialogRef = useModal({ isOpen, onClose });
  const [name, setName] = useState<string>();
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    getNickname().then((name) => {
      if (name) setName(name);
    });
    setLoading(false);
  }, []);

  return (
    <dialog ref={dialogRef} id="event-log" className="modal">
      {loading ? (
        <Honeycomb className="m-5" color="#326fa8" />
      ) : (
        <form
          className="flex flex-col space-y-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!name) {
              notifyError("Nickname cannot be empty");
              return;
            }
            await setNickname(name);
            onClose();
          }}
        >
          <div className="modal-box flex justify-center flex-col items-center w-full">
            <div className="h-full w-full overflow-y-auto">
              <label className="input validator">
                <svg
                  className="h-[1em] opacity-50"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                >
                  <g
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    strokeWidth="2.5"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </g>
                </svg>
                <input
                  type="text"
                  required
                  placeholder="Username"
                  pattern="[A-Za-z][A-Za-z0-9\-]*"
                  minLength={3}
                  maxLength={30}
                  title="Only letters, numbers or dash"
                />
              </label>
              <p className="validator-hint">
                Must be 3 to 30 characters
                <br />
                containing only letters, numbers or dash
              </p>
            </div>
            <div className="modal-action flex justify-end">
              <button
                disabled={!name}
                type="submit"
                className="btn btn-primary"
              >
                Set <FaEdit />
              </button>
              <button className="btn btn-primary" onClick={onClose}>
                Cancel <GrClose />
              </button>
            </div>
          </div>
        </form>
      )}
    </dialog>
  );
};

export default UserEditModal;
