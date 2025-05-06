import { IoLogoGithub } from "react-icons/io";
import pjson from "../../../package.json";

/**
 * Footer component that displays the link to the source code and the license.
 *
 */
const Footer = () => {
  return (
    <div className="w-full flex justify-center p-2 items-center">
      <a
        target="_blank"
        href="https://github.com/jamessizeland/peer-to-peer"
        className="flex items-center border border-gray-200 rounded-lg p-2 shadow-md hover:bg-gray-100 active:bg-gray-200 transition-colors duration-200 ease-in-out space-x-3"
      >
        <p>v{pjson.version}</p>
        <IoLogoGithub className="h-7 w-auto" />
        <p>2025</p>
      </a>
    </div>
  );
};

export default Footer;
