import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  FaUser,
  FaUsers,
  FaComment,
  FaGlobe,
  FaCaretDown,
  FaRegUser,
  FaLanguage,
  FaBars,
  FaTimes,
} from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useSelector } from "react-redux";
import { logout } from "../../store/slices/authSlice";
import { useLogoutUserMutation } from "../../store/slices/usersSlice";
import { Bounce, toast } from "react-toastify";
import { NavLink } from "react-router-dom";
import { BASE_URL } from "../../constants";
import "./MainNavbar.scss";

import logo from "../../assets/logo.png";

const MainNavbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  const userInfo = useSelector((state: any) => state.auth.userInfo);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t, i18n } = useTranslation();
  const [logoutUser] = useLogoutUserMutation();

  // Refs for dropdown containers
  const languageDropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close language dropdown
      if (
        languageDropdownRef.current &&
        !languageDropdownRef.current.contains(event.target as Node)
      ) {
        setIsLanguageDropdownOpen(false);
      }

      // Close user dropdown
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target as Node)
      ) {
        setIsUserDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Helper function to get profile image URL with proper fallbacks
  const getProfileImageUrl = useCallback((user: any): string => {
    // Handle different userInfo structures (userInfo.user or userInfo.data)
    const userData = user?.user || user?.data || user;

    // First, try imageUrls array
    if (Array.isArray(userData?.imageUrls) && userData.imageUrls[0]) {
      const url = userData.imageUrls[0];
      if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
        return url;
      }
    }

    // Fallback to images array
    if (Array.isArray(userData?.images) && userData.images[0]) {
      const image = userData.images[0];
      if (image) {
        // If it's already a full URL, return it
        if (image.startsWith("http://") || image.startsWith("https://")) {
          return image;
        }
        // Otherwise, construct the full URL
        return `${BASE_URL}/uploads/${image}`;
      }
    }

    // Default placeholder
    return "/default-avatar.png";
  }, []);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("preferredLanguage", lng);
    setIsLanguageDropdownOpen(false);
    toast.info(`Language changed to ${lng === "en" ? "English" : "한국어"}`, {
      autoClose: 3000,
      hideProgressBar: false,
      theme: "dark",
      transition: Bounce,
    });
  };

  const logoutHandler = async () => {
    try {
      // Call backend logout API if user is authenticated
      if (userInfo?.token) {
        try {
          await logoutUser(undefined).unwrap();
        } catch (apiError: any) {
          // Log error but continue with local logout
          console.error("Backend logout error:", apiError);
        }
      }

      // Clear local state and storage
      dispatch(logout(undefined));

      // Close dropdowns
      setIsUserDropdownOpen(false);
      setIsMobileMenuOpen(false);

      // Navigate to login
      navigate("/login");

      toast.success(
        t("authentication.logout.success") || "User successfully logged out!",
        {
          autoClose: 3000,
          hideProgressBar: false,
          theme: "dark",
          transition: Bounce,
        }
      );
    } catch (error: any) {
      console.error("Logout error:", error);
      toast.error(
        error?.message ||
          t("authentication.logout.error") ||
          "Failed to logout",
        {
          autoClose: 3000,
          hideProgressBar: false,
          theme: "dark",
          transition: Bounce,
        }
      );
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="modern-navbar">
      <nav>
        <div className="navbar-content">
          {/* Logo */}
          <div className="logo-container">
            <a href="/">
              <img src={logo} alt="BananaTalk" />
            </a>
          </div>

          {/* Desktop Navigation */}
          <div className="desktop-nav">
            <NavLink
              to="/communities"
              className={({ isActive }) =>
                `nav-link-modern ${isActive ? "active" : ""}`
              }
            >
              <FaUsers size={18} />
              {t("community")}
            </NavLink>

            {userInfo && (
              <>
                <NavLink
                  to="/chat"
                  className={({ isActive }) =>
                    `nav-link-modern ${isActive ? "active" : ""}`
                  }
                >
                  <FaComment size={18} />
                  {t("chat")}
                </NavLink>

                <NavLink
                  to="/moments"
                  className={({ isActive }) =>
                    `nav-link-modern ${isActive ? "active" : ""}`
                  }
                >
                  <FaGlobe size={18} />
                  {t("moments")}
                </NavLink>
              </>
            )}
            <div className="dropdown-container" ref={languageDropdownRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsLanguageDropdownOpen(!isLanguageDropdownOpen);
                }}
                className="dropdown-button"
                type="button"
              >
                <FaLanguage size={18} />
                <span className="hidden lg:inline">
                  {i18n.language === "en" ? t("english") : t("korean")}
                </span>
                <FaCaretDown size={14} />
              </button>

              {isLanguageDropdownOpen && (
                <div
                  className="dropdown-menu"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => changeLanguage("en")}
                    className={i18n.language === "en" ? "active" : ""}
                  >
                    🇺🇸 <span>{t("english")}</span>
                  </button>
                  <button
                    onClick={() => changeLanguage("ko")}
                    className={i18n.language === "ko" ? "active" : ""}
                  >
                    🇰🇷 <span>{t("korean")}</span>
                  </button>
                </div>
              )}
            </div>

            {/* User Menu / Login */}
            {userInfo ? (
              <div className="dropdown-container" ref={userDropdownRef}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsUserDropdownOpen(!isUserDropdownOpen);
                  }}
                  className="user-menu-button"
                  type="button"
                >
                  <img
                    src={getProfileImageUrl(userInfo)}
                    alt="Profile"
                    onError={(e: any) => {
                      e.target.src = "/default-avatar.png";
                    }}
                  />
                  <span>
                    {userInfo?.user?.name || userInfo?.data?.name || ""}
                  </span>
                  <FaCaretDown size={14} />
                </button>

                {isUserDropdownOpen && (
                  <div
                    className="dropdown-menu"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <NavLink
                      to="/profile"
                      onClick={() => setIsUserDropdownOpen(false)}
                      className={({ isActive }) => (isActive ? "active" : "")}
                    >
                      <FaRegUser />
                      <span>{t("profile.title")}</span>
                    </NavLink>
                    <NavLink
                      to="/followersList"
                      onClick={() => setIsUserDropdownOpen(false)}
                      className={({ isActive }) => (isActive ? "active" : "")}
                    >
                      <FaUsers />
                      <span>{t("followers")}</span>
                    </NavLink>
                    <NavLink
                      to="/followingsList"
                      onClick={() => setIsUserDropdownOpen(false)}
                      className={({ isActive }) => (isActive ? "active" : "")}
                    >
                      <FaUsers />
                      <span>{t("followings")}</span>
                    </NavLink>
                    <NavLink
                      to="/my-moments"
                      onClick={() => setIsUserDropdownOpen(false)}
                      className={({ isActive }) => (isActive ? "active" : "")}
                    >
                      <FaGlobe />
                      <span>{t("my_moments")}</span>
                    </NavLink>
                    <button onClick={logoutHandler}>
                      <FaUser />
                      <span>{t("logout")}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <NavLink to="/login" className="nav-link-modern">
                <FaRegUser size={18} />
                {t("sign_in")}
              </NavLink>
            )}
          </div>

          {/* Mobile menu button */}
          <button onClick={toggleMobileMenu} className="mobile-menu-button">
            {isMobileMenuOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="mobile-menu">
            <NavLink
              to="/communities"
              onClick={closeMobileMenu}
              className={({ isActive }) =>
                `mobile-nav-link ${isActive ? "active" : ""}`
              }
            >
              <FaUsers size={18} />
              <span>{t("community")}</span>
            </NavLink>

            {userInfo && (
              <>
                <NavLink
                  to="/chat"
                  onClick={closeMobileMenu}
                  className={({ isActive }) =>
                    `mobile-nav-link ${isActive ? "active" : ""}`
                  }
                >
                  <FaComment size={18} />
                  <span>{t("chat")}</span>
                </NavLink>

                <NavLink
                  to="/moments"
                  onClick={closeMobileMenu}
                  className={({ isActive }) =>
                    `mobile-nav-link ${isActive ? "active" : ""}`
                  }
                >
                  <FaGlobe size={18} />
                  <span>{t("moments")}</span>
                </NavLink>
              </>
            )}

            {/* Mobile Language Selection */}
            <div className="mobile-section">
              <div className="section-title">{t("language")}</div>
              <button
                onClick={() => changeLanguage("en")}
                className={`mobile-nav-link ${
                  i18n.language === "en" ? "active" : ""
                }`}
              >
                🇺🇸 <span>{t("english")}</span>
              </button>
              <button
                onClick={() => changeLanguage("ko")}
                className={`mobile-nav-link ${
                  i18n.language === "ko" ? "active" : ""
                }`}
              >
                🇰🇷 <span>{t("korean")}</span>
              </button>
            </div>

            {/* Mobile User Menu */}
            {userInfo ? (
              <div className="mobile-section">
                <div className="mobile-user-info">
                  <img
                    src={getProfileImageUrl(userInfo)}
                    alt="Profile"
                    onError={(e: any) => {
                      e.target.src = "/default-avatar.png";
                    }}
                  />
                  <span>
                    {userInfo?.user?.name || userInfo?.data?.name || ""}
                  </span>
                </div>

                <NavLink
                  to="/profile"
                  onClick={closeMobileMenu}
                  className={({ isActive }) =>
                    `mobile-nav-link ${isActive ? "active" : ""}`
                  }
                >
                  <FaRegUser size={18} />
                  <span>{t("profile.title")}</span>
                </NavLink>
                <NavLink
                  to="/followersList"
                  onClick={closeMobileMenu}
                  className={({ isActive }) =>
                    `mobile-nav-link ${isActive ? "active" : ""}`
                  }
                >
                  <FaUsers size={18} />
                  <span>{t("followers")}</span>
                </NavLink>
                <NavLink
                  to="/followingsList"
                  onClick={closeMobileMenu}
                  className={({ isActive }) =>
                    `mobile-nav-link ${isActive ? "active" : ""}`
                  }
                >
                  <FaUsers size={18} />
                  <span>{t("followings")}</span>
                </NavLink>
                <NavLink
                  to="/my-moments"
                  onClick={closeMobileMenu}
                  className={({ isActive }) =>
                    `mobile-nav-link ${isActive ? "active" : ""}`
                  }
                >
                  <FaGlobe size={18} />
                  <span>{t("my_moments")}</span>
                </NavLink>
                <button onClick={logoutHandler} className="mobile-nav-link">
                  <FaUser size={18} />
                  <span>{t("logout")}</span>
                </button>
              </div>
            ) : (
              <div className="mobile-section">
                <NavLink
                  to="/login"
                  onClick={closeMobileMenu}
                  className="mobile-nav-link"
                >
                  <FaRegUser size={18} />
                  <span>{t("sign_in")}</span>
                </NavLink>
              </div>
            )}
          </div>
        )}
      </nav>
    </header>
  );
};

export default MainNavbar;
