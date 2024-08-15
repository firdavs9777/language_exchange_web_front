import React from "react";
import "./App.scss";

import MainNavbar from "./components/navbar/MainNavbar";
import AppRouter from "./router/AppRouter";
import { Container } from "react-bootstrap";
import { Outlet } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
// import TodoList from './components/TodoList';

const App = () => {
  return (
    <>
      <MainNavbar />
      <Container fluid>
        <Outlet />
      </Container>

      <ToastContainer />
    </>
  );
};

export default App;
