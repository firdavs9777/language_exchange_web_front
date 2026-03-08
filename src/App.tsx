import React, { useEffect } from "react";
import "./App.scss";
import { I18nextProvider } from "react-i18next";
import i18n from "./utils/i18n";

import MainNavbar from "./components/navbar/MainNavbar";
import { Container } from "react-bootstrap";
import { Outlet, useLocation } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import FooterMain from "./components/footer/FooterMain";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5003";

const App = () => {
  const location = useLocation();

  // Track page visits for analytics
  useEffect(() => {
    try {
      fetch(`${API_URL}/api/v1/analytics/visit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page: location.pathname,
          referrer: document.referrer || null,
          language: navigator.language || null,
        }),
      }).catch(() => {}); // Silently fail — analytics should never block UX
    } catch {
      // Ignore errors
    }
  }, [location.pathname]);

  return (
    <I18nextProvider i18n={i18n}>
      <MainNavbar />
      <Container fluid>
        <Outlet />
      </Container>
      <FooterMain />
      <ToastContainer />
    </I18nextProvider>
  );
};

export default App;
