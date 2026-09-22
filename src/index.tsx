import React from "react";

import "./index.css";
import { createRoot } from "react-dom/client";
import {  RouterProvider } from "react-router-dom";
import { Provider } from "react-redux";
import { HelmetProvider } from "react-helmet-async";
import "./assets/styles/bootstrap.custom.css";
import "./assets/styles/legacy-buttons.css";
import "bootstrap-icons/font/bootstrap-icons.css";

import router from "./router/AppRouter";
import rootReducer from "./store";

const root = createRoot(document.getElementById("root") as HTMLElement);

root.render(
  <React.StrictMode>
    <HelmetProvider>
      <Provider store={rootReducer}>
        <RouterProvider router={router} />
      </Provider>
    </HelmetProvider>
  </React.StrictMode>
);
