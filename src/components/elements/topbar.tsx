import { useEffect, useState } from "react";
import { MdArrowBack, MdInfo } from "react-icons/md";
import { getNickname, leaveRoom } from "services/ipc";

const TopBar: React.FC<{ openEventLog: () => void }> = ({ openEventLog }) => {
  const [nickname, setNickname] = useState("");

  useEffect(() => {
    getNickname().then((name) => {
      if (name) setNickname(name);
    });
  }, []);

  return (
    <div className="w-screen h-10 text-white flex items-center justify-center">
      <button
        type="button"
        className="absolute left-1 text-2xl btn btn-outline btn-accent"
        onClick={async () => {
          await leaveRoom();
          location.href = "/";
        }}
      >
        <MdArrowBack />
      </button>
      <h1 className="m-2 text-2xl font-bold uppercase">{nickname}</h1>
      <button
        type="button"
        className="absolute right-1 text-2xl btn btn-outline btn-accent"
        onClick={() => {
          openEventLog();
        }}
      >
        <MdInfo />
      </button>
    </div>
  );
};

export default TopBar;
