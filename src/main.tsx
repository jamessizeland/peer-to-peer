import { Layout } from "components/Layout";
import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "routes";
import { initContext } from "services/ipc";

import "styles/global.css";
import "styles/tailwind.css";

const Store: React.FC = () => {
  useEffect(() => {
    initContext(); // initialize the backend data store.
  }, []);
  return null;
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Store />
    <BrowserRouter>
      <Layout>
        <AppRoutes />
      </Layout>
    </BrowserRouter>
  </React.StrictMode>
);
