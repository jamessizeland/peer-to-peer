import { Routes, Route, useLocation } from "react-router-dom";
import { checkEnv } from "utils";
import { AnimatePresence, motion } from "motion/react";
import { LobbyPage, ChatPage, SplashPage } from "pages";

type RouteType = {
  title: string;
  path: string;
  element: React.ReactNode;
  icon?: React.ReactNode;
};

const allRoutes: RouteType[] = [
  {
    title: "Splash",
    path: "/",
    element: <SplashPage />,
  },
  {
    title: "Lobby",
    path: "/lobby",
    element: <LobbyPage />,
  },
  {
    title: "Chat",
    path: "/chat",
    element: <ChatPage />,
  },
];

const devRoutes: RouteType[] = [];

export const routes: RouteType[] = checkEnv("development")
  ? allRoutes.concat(...devRoutes)
  : allRoutes;

export default function AppRoutes(): React.ReactNode {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Map through the routes and create a Route for each */}
        {routes.map(({ path, element, title }) => (
          // Wrap each route in an AnimationWrapper for animation effects
          <Route
            key={title}
            path={path}
            element={<AnimationWrapper>{element}</AnimationWrapper>}
          />
        ))}
      </Routes>
    </AnimatePresence>
  );
}

function AnimationWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}
