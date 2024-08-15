import React from "react";

import "./index.css";
import App from "./App";
import { createRoot } from "react-dom/client";
import { BrowserRouter as Router, RouterProvider } from "react-router-dom";
import { Provider } from "react-redux";
import "./assets/styles/bootstrap.custom.css";
import router from "./router/AppRouter";
import rootReducer from "./store";

const root = createRoot(document.getElementById("root") as HTMLElement);

root.render(
  <React.StrictMode>
    <Provider store={rootReducer}>
      <RouterProvider router={router} />
    </Provider>
  </React.StrictMode>
);
