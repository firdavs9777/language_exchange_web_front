import React from "react";
import { Container, Navbar, Nav, NavDropdown, Dropdown } from "react-bootstrap";
import {
  FaUser,
  FaUsers,
  FaComment,
  FaGlobe,
  FaCaretDown,
  FaRegUser,
  FaLanguage,
} from "react-icons/fa";
import { useTranslation } from "react-i18next";

import logo from "../../assets/logo.png";
import "./MainNavbar.css";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useSelector } from "react-redux";
import { logout } from "../../store/slices/authSlice";
import { LinkContainer } from "react-router-bootstrap";
import { Bounce, toast } from "react-toastify";
import { NavLink } from "react-router-dom";
import { BASE_URL } from "../../constants";

const MainNavbar = () => {
  const userInfo = useSelector((state: any) => state.auth.userInfo);

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    // You can also store the language preference in localStorage if needed
    localStorage.setItem("preferredLanguage", lng);
    // Optional: show toast notification
    toast.info(`Language changed to ${lng === "en" ? "English" : "한국어"}`, {
      autoClose: 3000,
      hideProgressBar: false,
      theme: "dark",
      transition: Bounce,
    });
  };

  const logoutHandler = async () => {
    try {
      dispatch(logout()); // Removed userInfo parameter as it seems to be incorrect
      navigate("/login");
      toast.success("User successfully logged out!", {
        autoClose: 3000,
        hideProgressBar: false,
        theme: "dark",
        transition: Bounce,
      });
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
              <NavLink
                to="/communities"
                className={({ isActive }) =>
                  isActive ? "custom-nav-link active" : "custom-nav-link"
                }
              >
                <FaUsers size={20} className="icon-style" /> {t("community")}
              </NavLink>

              {userInfo && (
                <>
                  <NavLink
                    to="/chat"
                    className={({ isActive }) =>
                      isActive ? "custom-nav-link active" : "custom-nav-link"
                    }
                  >
                    <FaComment size={20} className="icon-style" /> {t("chat")}
                  </NavLink>
                  {/* <NavLink
                    to="/notifications"
                    className={({ isActive }) =>
                      isActive ? "custom-nav-link active" : "custom-nav-link"
                    }
                  >
                    <FaBell size={20} className="icon-style" />{" "}
                    {t("notifications")}
                  </NavLink> */}
                  <NavLink
                    to="/moments"
                    className={({ isActive }) =>
                      isActive ? "custom-nav-link active" : "custom-nav-link"
                    }
                  >
                    <FaGlobe size={20} className="icon-style" /> {t("moments")}
                  </NavLink>
                </>
              )}

              {/* Language Dropdown */}
              <NavDropdown
                title={
                  <div className="language-dropdown-title">
                    <FaLanguage size={20} className="me-1" />
                    <span className="d-none d-md-inline">{i18n.language === 'en' ? (<>
                      {t('english')}
                    </>) : (

                      <>
                        {t('korean')}
                      </>
                    )}</span>
                  </div>
                }
                id="language-dropdown"
                className="ms-2"
              >
                <NavDropdown.Item
                  onClick={() => changeLanguage("en")}
                  active={i18n.language === "en"}
                >
                  🇺🇸 {t("english")}
                </NavDropdown.Item>
                <NavDropdown.Item
                  onClick={() => changeLanguage("ko")}
                  active={i18n.language === "ko"}
                >
                  🇰🇷 {t("korean")}
                </NavDropdown.Item>
              </NavDropdown>

              {userInfo ? (
                <NavDropdown
                  drop="down-centered"
                  title={
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        width: "110px",
                        gap: "10px", // Space between image and name
                      }}
                    >
                      <img
                        src={
                          Array.isArray(userInfo?.user?.imageUrls) && userInfo.user.imageUrls[0]?.startsWith("http")
                            ? userInfo.user.imageUrls[0]
                            : Array.isArray(userInfo?.user?.images) && userInfo.user.images[0]
                              ? userInfo.user.images[0].startsWith("http")
                                ? userInfo.user.images[0]
                                : `http://localhost:5003/uploads/${userInfo.user.images[0]}`
                              : "/default-avatar.png"
                        }
                        alt="Profile"
                        style={{
                          width: "40px",
                          height: "40px",
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
                      <FaRegUser /> {t("profile.title")}
                    </NavDropdown.Item>
                  </LinkContainer>
                  <LinkContainer to="/followersList">
                    <NavDropdown.Item>
                      <FaUsers /> {t("followers")}
                    </NavDropdown.Item>
                  </LinkContainer>
                  <LinkContainer to="/followingsList">
                    <NavDropdown.Item>
                      <FaUsers /> {t("followings")}
                    </NavDropdown.Item>
                  </LinkContainer>
                  <LinkContainer to="/my-moments">
                    <NavDropdown.Item>
                      <FaGlobe /> {t("my_moments")}
                    </NavDropdown.Item>
                  </LinkContainer>

                  <Dropdown.Divider />

                  <NavDropdown.Item onClick={logoutHandler}>
                    <FaUser /> {t("logout")}
                  </NavDropdown.Item>
                </NavDropdown>
              ) : (
                <Nav.Link href="/login" className="custom-nav-link">
                  <FaRegUser /> {t("sign_in")}
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
