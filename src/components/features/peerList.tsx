import Modal from "components/elements/modal";
import { useCallback, useState } from "react";
import { PeerInfo, PeerStatus } from "types";

const PeerInfoModal: React.FC<{ peers: PeerInfo[] }> = ({ peers }) => {
  const [openPeers, setOpenPeers] = useState<boolean>(false);
  const online = useCallback(() => {
    return peers.filter((p) => p.status === "Online");
  }, [peers]);

  return (
    <>
      <Modal
        isOpen={openPeers}
        onClose={() => setOpenPeers(false)}
        title="Peers"
      >
        <ul tabIndex={0} className="p-1 text-sm w-full">
          {peers.map((peer) => (
            <li
              key={peer.id}
              className="flex items-center flex-row border-b border-gray-400"
            >
              <PeerActivityStatus status={peer.status} />
              {peer.nickname} -{" "}
              {new Date(peer.lastSeen / 1000).toLocaleTimeString()}
            </li>
          ))}
        </ul>
      </Modal>
      <button
        className="btn btn-primary bg-blue-950 hover:bg-primary"
        onClick={() => setOpenPeers(true)}
      >
        Peers: {online().length}
      </button>
    </>
  );
};

const PeerActivityStatus: React.FC<{ status: PeerStatus }> = ({ status }) => {
  switch (status) {
    case "Online":
      return (
        <span className="status mr-2" style={{ backgroundColor: "green" }} />
      );
    case "Offline":
      return (
        <span className="status mr-2" style={{ backgroundColor: "red" }} />
      );
    case "Away":
      return (
        <span className="status mr-2" style={{ backgroundColor: "yellow" }} />
      );
  }
};

export default PeerInfoModal;
