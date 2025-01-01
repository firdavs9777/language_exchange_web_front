import React from "react";
import { Container, Navbar, Nav, NavDropdown, Dropdown } from "react-bootstrap";
import {
  FaUser,
  FaUsers,
  FaComment,
  FaGlobe,
  FaBook,
  FaCaretDown,
  FaRegUser, // Fallback icon for profile
  FaRegComments,
  FaBell, // Fallback icon for chat
} from "react-icons/fa";
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
  const userInfo = useSelector((state: any) => state.auth.userInfo);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const logoutHandler = async () => {
    try {
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
                  <Nav.Link href="/notifications" className="custom-nav-link">
                    <FaBell /> Notifications
                  </Nav.Link>
                  <Nav.Link href="/moments" className="custom-nav-link">
                    <FaGlobe /> Moments
                  </Nav.Link>
                </>
              )}

              {userInfo ? (
                <NavDropdown
                  drop="down-centered"
                  title={
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        width: "100px",
                        gap: "10px", // Space between image and name
                      }}
                    >
                      <img
                        src={
                          userInfo.user.images && userInfo.user.images[0]
                            ? userInfo.user.images[0]
                            : "/default-avatar.png"
                        }
                        alt="Profile"
                        style={{
                          width: "30px",
                          height: "30px",
                          borderRadius: "50%",
                          objectFit: "cover",
                        }}
                      />
                      <span>
                        {userInfo.user ? (
                          <>
                            {userInfo.user.name}
                            <FaCaretDown size={22} color="#fff" />
                          </>
                        ) : (
                          ""
                        )}
                      </span>
                    </div>
                  }
                  id="username"
                >
                  <LinkContainer to="/profile">
                    <NavDropdown.Item>
                      <FaRegUser /> Profile
                    </NavDropdown.Item>
                  </LinkContainer>
                  <LinkContainer to="/followersList">
                    <NavDropdown.Item>
                      <FaUsers /> Followers
                    </NavDropdown.Item>
                  </LinkContainer>
                  <LinkContainer to="/followingsList">
                    <NavDropdown.Item>
                      <FaUsers /> Followings
                    </NavDropdown.Item>
                  </LinkContainer>
                  <LinkContainer to="/my-moments">
                    <NavDropdown.Item>
                      <FaGlobe /> My Moments
                    </NavDropdown.Item>
                  </LinkContainer>

                  <Dropdown.Divider />

                  <NavDropdown.Item onClick={logoutHandler}>
                    <FaUser /> Logout
                  </NavDropdown.Item>
                </NavDropdown>
              ) : (
                <Nav.Link href="/login" className="custom-nav-link">
                  <FaRegUser /> Sign In
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
