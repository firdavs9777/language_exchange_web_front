import React from "react";
import "./App.scss";

import MainNavbar from "./components/navbar/MainNavbar";
import AppRouter from "./router/AppRouter";
import { Container } from "react-bootstrap";
import { Outlet } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import FooterMain from "./components/footer/FooterMain";
// import TodoList from './components/TodoList';

const App = () => {
  return (
    <>
      <MainNavbar />
      <Container fluid>
        <Outlet />
      </Container>
      <FooterMain />
      <ToastContainer />
    </>
  );
};

export default App;
