import Modal, { ModalProps } from "components/elements/modal";

const AboutModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <p className="backdrop-opacity-100 p-4 m-4 border rounded-md border-secondary max-h-fit">
        This is a peer-to-peer messaging app using the{" "}
        <a
          target="_blank"
          className="link link-accent"
          href="https://www.iroh.computer/proto/iroh-gossip"
        >
          Iroh Gossip Protocol
        </a>{" "}
        to send messages between peers sharing a Room. <br />
        <br />
        Messages are sent as events to all connected peers directly, are
        encrypted as standard and are not persisted anywhere other than on your
        device. <br />
        <br />
        This is a proof of concept based heavily on the{" "}
        <a
          target="_blank"
          className="link link-accent"
          href="https://github.com/n0-computer/iroh-examples/tree/main/browser-chat"
        >
          Iroh chat example
        </a>{" "}
        and modified for a{" "}
        <a
          target="_blank"
          className="link link-accent"
          href="https://tauri.app/"
        >
          Tauri App
        </a>
        .
      </p>
    </Modal>
  );
};

export default AboutModal;
