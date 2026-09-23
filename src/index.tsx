import React from "react";

import "./index.css";
import { createRoot, hydrateRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { Provider } from "react-redux";
import { HelmetProvider } from "react-helmet-async";
import "./assets/styles/bootstrap.custom.css";
import "./assets/styles/legacy-buttons.css";
// bootstrap-icons is deliberately NOT imported here. It is ~2,000 glyph
// rules plus a webfont that no prerendered marketing page uses; the
// authenticated screens that still spell `bi-*` import src/lazyIcons.ts
// instead, so webpack ships it with their lazy chunk.

import router from "./router/AppRouter";
import store from "./store";
import i18n from "./utils/i18n";
import { prepareForHydration } from "./utils/hydrationLanguage";
import { markPrerendered } from "./seo/prerender/hydrationFlag";

const container = document.getElementById("root") as HTMLElement;

const app = (
  <React.StrictMode>
    <HelmetProvider>
      <Provider store={store}>
        <RouterProvider router={router} />
      </Provider>
    </HelmetProvider>
  </React.StrictMode>
);

if (container.hasChildNodes()) {
  // Prerendered page: hydrate over the English markup; App switches to the
  // visitor's language after the first commit.
  markPrerendered();
  prepareForHydration(i18n);
  hydrateRoot(container, app);
} else {
  createRoot(container).render(app);
}
