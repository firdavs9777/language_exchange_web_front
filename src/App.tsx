import React, { useEffect } from "react";
import "./App.scss";
import { I18nextProvider } from "react-i18next";
import i18n from "./utils/i18n";
import { restoreAfterHydration } from "./utils/hydrationLanguage";
import { restoreAuthAfterHydration } from "./utils/hydrationAuth";
import { clearPrerendered, isPrerendered } from "./seo/prerender/hydrationFlag";
import RouteMeta from "./seo/RouteMeta";

import MainNavbar from "./components/navbar/MainNavbar";
import { Container } from "react-bootstrap";
import { Outlet } from "react-router-dom";
import { useDispatch } from "react-redux";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import FooterMain from "./components/footer/FooterMain";
import { SocketProvider } from "./components/chat/hooks/useSocket";
import AppBanner from "./components/linking/AppBanner";
import { usePageView } from "./analytics/usePageView";
import ConsentBar from "./components/growth/ConsentBar";

const App = () => {
  usePageView();
  const dispatch = useDispatch();

  // After a prerendered page hydrates logged out and in English, put the
  // visitor's session and language back — and let later mounts animate again:
  // hydration has committed, so nothing more will be compared against the
  // prerendered markup. Client-rendered pages already have both.
  useEffect(() => {
    if (isPrerendered()) restoreAuthAfterHydration(dispatch);
    restoreAfterHydration(i18n);
    clearPrerendered();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <RouteMeta />
      <SocketProvider>
        <MainNavbar />
        <AppBanner />
        <Container fluid>
          <Outlet />
        </Container>
        <FooterMain />
        <ConsentBar />
        <ToastContainer />
      </SocketProvider>
    </I18nextProvider>
  );
};

export default App;
