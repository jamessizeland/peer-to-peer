import { useCallback } from "react";
import { PeerInfo, PeerStatus } from "types";

const PeerInfoDropdown: React.FC<{ peers: PeerInfo[] }> = ({ peers }) => {
  const online = useCallback(() => {
    return peers.filter((p) => p.status === "Online");
  }, [peers]);

  return (
    <div className="dropdown dropdown-center">
      <div tabIndex={0} role="button" className="btn btn-accent">
        Peers: {online().length}
      </div>
      <ul
        tabIndex={0}
        className="dropdown-content menu bg-base-100 rounded-box z-1 w-52 p-2 shadow-sm"
      >
        {peers.map((peer) => (
          <li key={peer.id} className="flex items-center flex-row">
            <PeerActivityStatus status={peer.status} />
            {peer.nickname} -{" "}
            {new Date(peer.lastSeen / 1000).toLocaleTimeString()}
          </li>
        ))}
      </ul>
    </div>
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

export default PeerInfoDropdown;
