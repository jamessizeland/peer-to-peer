import Button from "components/elements/button";
import AboutModal from "components/features/about";
import Branding from "components/features/branding";
import RoomsList from "components/features/roomsList";
import UserEditModal from "components/features/userEdit";
import Footer from "components/Layout/footer";
import { useState } from "react";
import { FaUserEdit } from "react-icons/fa";
import { FaCircleInfo } from "react-icons/fa6";

export function LobbyPage() {
  return (
    <div className="flex flex-col items-center h-screen w-screen space-y-2 ">
      <TopBar />
      <RoomsList />
      <Footer />
    </div>
  );
}

const TopBar: React.FC = () => {
  const [openAbout, setOpenAbout] = useState<boolean>(false);
  const [openUserEdit, setOpenUserEdit] = useState<boolean>(false);

  return (
    <div className="w-screen flex justify-between bg-blue-950 py-1 px-1">
      {/* Modal pop-ups */}
      <AboutModal isOpen={openAbout} onClose={() => setOpenAbout(false)} />
      <UserEditModal
        isOpen={openUserEdit}
        onClose={() => setOpenUserEdit(false)}
      />
      {/* Top bar buttons */}
      <Button onClick={() => setOpenUserEdit(true)}>
        <FaUserEdit />
      </Button>
      <Branding />
      <Button onClick={() => setOpenAbout(true)}>
        <FaCircleInfo />
      </Button>
    </div>
  );
};
