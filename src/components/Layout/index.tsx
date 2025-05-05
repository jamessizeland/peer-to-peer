import { ReactNode } from "react";
import { ToastContainer } from "react-toastify";
import { checkEnv } from "utils";

console.log(checkEnv());

/** This component is responsible for common elements of the app */
export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <ToastContainer />
      <div>
        <div className="flex-grow">{children}</div>
      </div>
    </div>
  );
}
