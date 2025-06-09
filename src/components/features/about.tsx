import Modal from "components/elements/modal";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  return <Modal isOpen={isOpen} onClose={onClose}></Modal>;
};
