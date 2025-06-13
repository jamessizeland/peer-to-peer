import { IoLogoGithub } from "react-icons/io";
import pjson from "../../../package.json";

/**
 * Footer component that displays the link to the source code and the license.
 *
 */
const Footer = () => {
  return (
    <div className="w-full flex justify-center p-2 items-center bg-blue-950">
      <a
        target="_blank"
        href={pjson.repository}
        className="flex items-center border hover:border-gray-200 rounded-lg p-2 shadow-md border-primary active:bg-gray-200 transition-colors duration-200 ease-in-out space-x-3"
      >
        <p>v{pjson.version}</p>
        <IoLogoGithub className="h-7 w-auto" />
        <p>2025</p>
      </a>
    </div>
  );
};

export default Footer;
