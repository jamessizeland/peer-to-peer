import LobbyForm from "components/elements/lobbyForm";
import Footer from "components/Layout/footer";

export function LobbyPage() {
  return (
    <div className="flex flex-col items-center h-screen w-screen space-y-2">
      <h1 className="m-2 text-2xl font-bold uppercase">Lobby</h1>
      {/*  create a new room or join an existing room */}
      <LobbyForm />
      <AboutCard />
      <div className="h-full" />
      <Footer />
    </div>
  );
}

const AboutCard: React.FC = () => {
  return (
    <p className="backdrop-opacity-100 p-2 m-4 text-sm border rounded-md border-accent max-h-fit">
      This is a peer to peer messaging app using the{" "}
      <a
        target="_blank"
        className="link link-secondary"
        href="https://www.iroh.computer/proto/iroh-gossip"
      >
        Iroh Gossip Protocol
      </a>{" "}
      to send messages between peers sharing a Room. <br />
      <br />
      Messages are sent as events to all connected peers directly, are encrypted
      as standard and are not persisted anywhere. <br />
      <br />
      This is a proof of concept based heavily on the{" "}
      <a
        target="_blank"
        className="link link-secondary"
        href="https://github.com/n0-computer/iroh-examples/tree/main/browser-chat"
      >
        Iroh chat example
      </a>{" "}
      and modified for a{" "}
      <a
        target="_blank"
        className="link link-secondary"
        href="https://tauri.app/"
      >
        Tauri App
      </a>
      .
    </p>
  );
};
