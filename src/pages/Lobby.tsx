import Button from "components/elements/button";
import AboutModal from "components/features/about";
import Branding from "components/features/branding";
import LobbyForm from "components/features/lobbyForm";
import RoomsList from "components/features/roomsList";
import UserEditModal from "components/features/userEdit";
import Footer from "components/Layout/footer";
import { useState } from "react";
import { FaUserEdit } from "react-icons/fa";
import { FaCircleInfo } from "react-icons/fa6";
import { IoMdAddCircle } from "react-icons/io";

export function LobbyPage() {
  return (
    <div className="flex flex-col items-center h-screen w-screen space-y-2 ">
      <TopBar />
      <RoomsList />
      <Footer />
    </div>
  );
}

const TopBar = () => {
  const [openAbout, setOpenAbout] = useState<boolean>(false);
  const [openUserEdit, setOpenUserEdit] = useState<boolean>(false);
  const [openCreateRoom, setOpenCreateRoom] = useState<boolean>(false);

  return (
    <div className="w-screen flex justify-between">
      {/* Modal pop-ups */}
      <AboutModal isOpen={openAbout} onClose={() => setOpenAbout(false)} />
      <UserEditModal
        isOpen={openUserEdit}
        onClose={() => setOpenUserEdit(false)}
      />
      <LobbyForm
        isOpen={openCreateRoom}
        onClose={() => setOpenCreateRoom(false)}
      />
      {/* Top bar buttons */}
      <div className="flex flex-row space-x-1">
        <Button onClick={() => setOpenUserEdit(true)}>
          <FaUserEdit />
        </Button>
        <Button onClick={() => setOpenCreateRoom(true)}>
          <IoMdAddCircle />
        </Button>
      </div>
      <Branding />
      <Button onClick={() => setOpenAbout(true)}>
        <FaCircleInfo />
      </Button>
    </div>
  );
};
