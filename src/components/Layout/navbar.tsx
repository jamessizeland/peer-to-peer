import { Link } from "react-router-dom";
import { routes } from "routes";

const Footer = () => {
  return (
    <div>
      <nav className="bottom-nav fixed bottom-0 w-full bg-white border-t border-gray-200 flex justify-around">
        {routes.map(({ title, path, icon }) => (
          <Link
            to={path}
            key={title}
            className="nav-button flex flex-col items-center flex-1 transition-colors duration-200 ease-in-out hover:bg-gray-100 active:bg-gray-200 p-2"
          >
            <span className="icon text-xl">{icon}</span>
            <span className="text text-xs">{title}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default Footer;
