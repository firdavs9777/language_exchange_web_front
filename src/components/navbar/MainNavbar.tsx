import React from "react";
import { Container, Navbar, Nav, NavDropdown } from "react-bootstrap";
import { FaUser, FaUsers, FaComment, FaGlobe, FaBook } from "react-icons/fa";
import logo from "../../assets/logo.png";
import "./MainNavbar.css";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useSelector } from "react-redux";
import { RootState } from "@reduxjs/toolkit/query";
import { logout } from "../../store/slices/authSlice";
import { LinkContainer } from "react-router-bootstrap";
import { toast } from "react-toastify";

const MainNavbar = () => {
  // const cart = useSelector((state: any) => state.cart.cartItems);
  const userInfo = useSelector((state: any) => state.auth.userInfo);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  // const [logoutApiCall] = useLogoutUserMutation();

  const logoutHandler = async () => {
    try {
      // logoutApiCall(userInfo).unwrap();
      dispatch(logout(userInfo)); // Corrected dispatch call without passing userInfo
      navigate("/login");
      toast.success("User successfully logged out!");
    } catch (error: any) {
      alert(error.message);
    }
  };
  return (
    <header>
      <Navbar bg="dark" variant="dark" expand="md" collapseOnSelect>
        <Container>
          <Navbar.Brand href="/">
            <img src={logo} className="logo" alt="BananaTalk" />
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="w-100 justify-content-center justify-content-md-end">
              <Nav.Link href="/communities" className="custom-nav-link">
                <FaUsers /> Community
              </Nav.Link>
              {userInfo && (
                <>
                  <Nav.Link href="/chat" className="custom-nav-link">
                    <FaComment /> Chat
                  </Nav.Link>
                  <Nav.Link href="/moments" className="custom-nav-link">
                    <FaGlobe /> Moments
                  </Nav.Link>
                  <Nav.Link href="/courses" className="custom-nav-link">
                    <FaBook /> Courses
                  </Nav.Link>
                </>
              )}

              {userInfo ? (
                <NavDropdown
                  title={`${
                    userInfo.user ? userInfo.user.name : userInfo.name
                  }`}
                  id="username"
                >
                  <LinkContainer to="/profile">
                    <NavDropdown.Item>Profile</NavDropdown.Item>
                  </LinkContainer>
                  <NavDropdown.Item onClick={logoutHandler}>
                    Logout
                  </NavDropdown.Item>
                </NavDropdown>
              ) : (
                <Nav.Link href="/login" className="custom-nav-link">
                  <FaUser /> Sign In
                </Nav.Link>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </header>
  );
};
export default MainNavbar;
