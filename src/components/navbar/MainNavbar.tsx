import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  FaUsers,
  FaComment,
  FaGlobe,
  FaRegUser,
  FaCog,
  FaSignOutAlt,
  FaUserFriends,
  FaChevronDown,
  FaUserShield,
  FaFilm,
  FaCalendarAlt,
  FaMicrophone,
  FaDoorOpen,
  FaSearch,
  FaStream,
  FaRegImages,
  FaRocket,
} from "react-icons/fa";
import { useWebFlag } from "../../utils/webFlags";
import { useTranslation } from "react-i18next";
import { switchLanguage } from "../../utils/switchLanguage";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout, selectIsAdmin } from "../../store/slices/authSlice";
import { Bounce, toast } from "react-toastify";
import { NavLink } from "react-router-dom";

import { BASE_URL } from "../../constants";
import logo from "../../assets/logo.png";
import { useGetConversationsQuery } from "../../store/slices/chatSlice";
import { useSocket } from "../chat/hooks/useSocket";
import { CONVERSATIONS_PAGE } from "../chat/lib/conversationMatch";
import NavDropdown from "./NavDropdown";
import "./MainNavbar.scss";

const LANGUAGES = [
  { code: "en", flag: "🇺🇸", name: "English" },
  { code: "ko", flag: "🇰🇷", name: "한국어" },
  { code: "ja", flag: "🇯🇵", name: "日本語" },
  { code: "zh", flag: "🇨🇳", name: "中文" },
  { code: "zh_TW", flag: "🇹🇼", name: "繁體中文" },
  { code: "es", flag: "🇪🇸", name: "Español" },
  { code: "fr", flag: "🇫🇷", name: "Français" },
  { code: "de", flag: "🇩🇪", name: "Deutsch" },
  { code: "pt", flag: "🇧🇷", name: "Português" },
  { code: "it", flag: "🇮🇹", name: "Italiano" },
  { code: "ru", flag: "🇷🇺", name: "Русский" },
  { code: "ar", flag: "🇸🇦", name: "العربية" },
  { code: "hi", flag: "🇮🇳", name: "हिन्दी" },
  { code: "vi", flag: "🇻🇳", name: "Tiếng Việt" },
  { code: "th", flag: "🇹🇭", name: "ไทย" },
  { code: "tr", flag: "🇹🇷", name: "Türkçe" },
  { code: "id", flag: "🇮🇩", name: "Bahasa" },
  { code: "tl", flag: "🇵🇭", name: "Filipino" },
];

// Which top-level section a path belongs to, so the parent (desktop) and the
// tab (mobile) light up for every page underneath them, not only the exact
// path the link points at.
const COMMUNITY_PATHS = ["/communities", "/community", "/gatherings", "/clubs", "/voice-rooms", "/rooms", "/waves", "/topics"];
const MOMENTS_PATHS = ["/moments", "/moment", "/reels", "/my-moments", "/add-moment", "/edit-moment"];
const CHAT_PATHS = ["/chat"];
const PROFILE_PATHS = ["/profile", "/followersList", "/followingsList", "/visitors", "/visited", "/settings"];

export const under = (pathname: string, prefixes: string[]) =>
  prefixes.some((p) => pathname === p || pathname.indexOf(p + "/") === 0);

// A conversation (and anything below /chat/…) is laid out to the bottom edge
// of the viewport, with its own composer there; the tab bar would sit on top
// of it. The conversation list at /chat keeps the bar.
export const hidesBottomTabs = (pathname: string) => /^\/chat\/.+/.test(pathname);

export interface NavEntry {
  to: string;
  label: string;
  icon: React.ReactNode;
  testId?: string;
}

interface SectionMenuProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  entries: NavEntry[];
  active: boolean;
}

/**
 * A top-level desktop section. Two or more visible entries make a dropdown;
 * a single one is just a link — a menu that opens onto one item is a click
 * for nothing.
 */
const SectionMenu = ({ id, label, icon, entries, active }: SectionMenuProps) => {
  if (entries.length === 0) return null;
  if (entries.length === 1) {
    const only = entries[0];
    return (
      <NavLink
        to={only.to}
        data-testid={only.testId || `${id}-link`}
        className={`nav-item ${active ? "active" : ""}`}
        aria-current={active ? "page" : undefined}
      >
        {icon}
        <span>{label}</span>
      </NavLink>
    );
  }
  return (
    <NavDropdown
      id={id}
      testId={`${id}-trigger`}
      triggerClassName={`nav-item nav-item--menu ${active ? "active" : ""}`}
      panelClassName="section-dropdown"
      trigger={
        <>
          {icon}
          <span>{label}</span>
          <FaChevronDown className="chevron" aria-hidden="true" />
        </>
      }
    >
      {(close) =>
        entries.map((e) => (
          <NavLink key={e.to} to={e.to} data-testid={e.testId} className="dropdown-item" onClick={close}>
            {e.icon} <span>{e.label}</span>
          </NavLink>
        ))
      }
    </NavDropdown>
  );
};

const MainNavbar = () => {
  const requestedLanguage = useRef<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  const userInfo = useSelector((state: any) => state.auth.userInfo);
  // The console's only entry point. Role comes from the backend; the route
  // itself is guarded again by RequireAdmin, and the API by authorize('admin').
  const isAdmin = useSelector(selectIsAdmin);
  // Phase 4 rooms: dark until the owner turns the flags on.
  const voiceRoomsOn = useWebFlag("webVoiceRoomsEnabled");
  const languageRoomsOn = useWebFlag("webLanguageRoomsEnabled");
  const boostsOn = useWebFlag("boostsEnabled");
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { t, i18n } = useTranslation();
  const reelsOn = useWebFlag("webReelsEnabled");
  const gatheringsOn = useWebFlag("webGatheringsEnabled");

  // `resolvedLanguage`, not `language`: since locales load on demand i18next is
  // no longer restricted to bare language codes, so `language` can be "ko-KR"
  // (from navigator) while the bundle actually in force is "ko". resolvedLanguage
  // is the entry in the resolution hierarchy that really has translations, which
  // is exactly the one this menu should tick.
  const activeLang = i18n.resolvedLanguage || i18n.language;
  const currentLang = LANGUAGES.find((l) => l.code === activeLang) || LANGUAGES[0];

  // Unread chat badge. Shares the same RTK Query cache key UsersList uses --
  // CONVERSATIONS_PAGE, the one literal every caller passes -- so there is no
  // duplicate request when the chat page is also mounted, and no second copy
  // of the list going stale on its own: this badge used to ask with its own
  // {page:1, limit:50} while the chat list asked with {page:1, limit:100}, two
  // cache entries that refetched independently. Refetches live off the same
  // socket events UsersList reacts to, so the badge stays correct even when
  // the chat page isn't open at all.
  const currentUserId = userInfo?.user?._id;
  const { data: conversationsData, refetch: refetchConversations } = useGetConversationsQuery(
    CONVERSATIONS_PAGE,
    { skip: !currentUserId }
  );
  const { socket } = useSocket();

  const unreadChatCount = useMemo(() => {
    const list = conversationsData?.data;
    if (!Array.isArray(list)) return 0;
    return list.reduce((sum: number, c: any) => sum + (c?.unreadCount || 0), 0);
  }, [conversationsData]);

  useEffect(() => {
    if (!socket || !currentUserId) return;
    const handleConversationsChanged = () => refetchConversations();
    socket.on("newMessage", handleConversationsChanged);
    socket.on("newVoiceMessage", handleConversationsChanged);
    socket.on("newVideoMessage", handleConversationsChanged);
    socket.on("messagesRead", handleConversationsChanged);
    // A message WE sent changes the list too -- new last message, new row
    // order, and a brand-new row for a first message. The server addresses it
    // to every device on the account.
    socket.on("messageSent", handleConversationsChanged);
    return () => {
      socket.off("newMessage", handleConversationsChanged);
      socket.off("newVoiceMessage", handleConversationsChanged);
      socket.off("newVideoMessage", handleConversationsChanged);
      socket.off("messagesRead", handleConversationsChanged);
      socket.off("messageSent", handleConversationsChanged);
    };
  }, [socket, currentUserId, refetchConversations]);

  // Scroll effect
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // The bottom tab bar is fixed, so the page needs room underneath it. The
  // class only does anything below the desktop breakpoint (MainNavbar.scss),
  // which keeps the padding off desktop without a JS media query.
  const showBottomTabs = !!userInfo && !hidesBottomTabs(location.pathname);
  useEffect(() => {
    document.body.classList.toggle("has-bottom-tabs", showBottomTabs);
    return () => document.body.classList.remove("has-bottom-tabs");
  }, [showBottomTabs]);

  const changeLanguage = (lng: string) => {
    const lang = LANGUAGES.find((l) => l.code === lng);
    requestedLanguage.current = lng;
    // Locales are chunks now, so two clicks inside one load window settle in
    // *network* order and i18next has no staleness guard: the slower-arriving
    // language wins and the menu disagrees with the page. Re-apply whatever was
    // asked for last once a switch settles. Bounded: the re-apply's own callback
    // finds the two in agreement and stops.
    void switchLanguage(i18n, lng).then(() => {
      const wanted = requestedLanguage.current;
      if (wanted && wanted !== i18n.language) void switchLanguage(i18n, wanted);
    });
    localStorage.setItem("preferredLanguage", lng);
    toast.info(`${lang?.flag} ${lang?.name}`, {
      autoClose: 2000,
      hideProgressBar: true,
      theme: "dark",
      transition: Bounce,
    });
  };

  const logoutHandler = async () => {
    try {
      dispatch(logout());
      navigate("/login");
      toast.success(t("logout") + " ✓", {
        autoClose: 2000,
        hideProgressBar: true,
        theme: "dark",
        transition: Bounce,
      });
    } catch (error: any) {
      alert(error.message);
    }
  };

  // "Features" for a visitor: the homepage's feature section if it is on the
  // page (id="features", or the showcase's test id), otherwise the homepage.
  const goToFeatures = (e: React.MouseEvent) => {
    e.preventDefault();
    const scroll = () => {
      const target =
        document.getElementById("features") || document.querySelector('[data-testid="feature-showcase"]');
      if (target && typeof (target as HTMLElement).scrollIntoView === "function") {
        (target as HTMLElement).scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    if (location.pathname !== "/") {
      navigate("/");
      window.setTimeout(scroll, 300);
    } else {
      scroll();
    }
  };

  const getUserImage = () => {
    if (Array.isArray(userInfo?.user?.imageUrls) && userInfo.user.imageUrls[0]?.startsWith("http")) {
      return userInfo.user.imageUrls[0];
    }
    if (Array.isArray(userInfo?.user?.images) && userInfo.user.images[0]) {
      return userInfo.user.images[0].startsWith("http")
        ? userInfo.user.images[0]
        : `${BASE_URL}/uploads/${userInfo.user.images[0]}`;
    }
    return "/default-avatar.png";
  };

  const path = location.pathname;
  const communityLabel = t("community") || "Community";
  const momentsLabel = t("moments") || "Moments";
  const chatsLabel = t("nav.chats") || "Chats";
  const profileLabel = t("nav.profile") || "Profile";
  const gatheringsLabel = t("gatherings.nav") || "Gatherings";
  const voiceRoomsLabel = t("nav.voiceRooms") || "Voice rooms";
  const languageRoomsLabel = t("nav.languageRooms") || "Language rooms";
  const reelsLabel = t("reels.nav") || "Reels";
  const myMomentsLabel = t("my_moments") || "My moments";

  // Entries whose flag is off are never built, so they can't leak into either
  // the desktop menu or the mobile "more" list.
  const communityEntries: NavEntry[] = [
    { to: "/communities", label: t("nav.findPartners") || "Find partners", icon: <FaSearch /> },
  ];
  if (gatheringsOn) communityEntries.push({ to: "/gatherings", label: gatheringsLabel, icon: <FaCalendarAlt />, testId: "nav-gatherings" });
  if (voiceRoomsOn) communityEntries.push({ to: "/voice-rooms", label: voiceRoomsLabel, icon: <FaMicrophone />, testId: "nav-voice-rooms" });
  if (languageRoomsOn) communityEntries.push({ to: "/rooms", label: languageRoomsLabel, icon: <FaDoorOpen />, testId: "nav-language-rooms" });

  const momentsEntries: NavEntry[] = [{ to: "/moments", label: t("nav.feed") || "Feed", icon: <FaStream /> }];
  if (reelsOn) momentsEntries.push({ to: "/reels", label: reelsLabel, icon: <FaFilm />, testId: "nav-reels" });
  momentsEntries.push({ to: "/my-moments", label: myMomentsLabel, icon: <FaRegImages /> });

  // What the phone can't reach from its four tabs. Shown only inside the
  // account menu below the desktop breakpoint.
  const moreEntries: NavEntry[] = [];
  if (gatheringsOn) moreEntries.push({ to: "/gatherings", label: gatheringsLabel, icon: <FaCalendarAlt />, testId: "nav-gatherings-mobile" });
  if (voiceRoomsOn) moreEntries.push({ to: "/voice-rooms", label: voiceRoomsLabel, icon: <FaMicrophone />, testId: "nav-voice-rooms-mobile" });
  if (languageRoomsOn) moreEntries.push({ to: "/rooms", label: languageRoomsLabel, icon: <FaDoorOpen />, testId: "nav-language-rooms-mobile" });
  if (reelsOn) moreEntries.push({ to: "/reels", label: reelsLabel, icon: <FaFilm />, testId: "nav-reels-mobile" });
  moreEntries.push({ to: "/my-moments", label: myMomentsLabel, icon: <FaRegImages /> });

  const chatBadge = (testId: string) =>
    unreadChatCount > 0 ? (
      <span className="navbar-unread-badge" data-testid={testId}>
        {unreadChatCount > 99 ? "99+" : unreadChatCount}
      </span>
    ) : null;

  const chatActive = under(path, CHAT_PATHS);

  const tabs = [
    { key: "community", to: "/communities", label: communityLabel, icon: <FaUsers />, active: under(path, COMMUNITY_PATHS), badge: false },
    { key: "chats", to: "/chat", label: chatsLabel, icon: <FaComment />, active: chatActive, badge: true },
    { key: "moments", to: "/moments", label: momentsLabel, icon: <FaGlobe />, active: under(path, MOMENTS_PATHS), badge: false },
    { key: "profile", to: "/profile", label: profileLabel, icon: <FaRegUser />, active: under(path, PROFILE_PATHS), badge: false },
  ];

  return (
    <>
      <header className={`main-navbar ${isScrolled ? "scrolled" : ""}`}>
        <nav className="navbar-inner" aria-label={t("nav.main") || "Main navigation"}>
          {/* Logo */}
          <NavLink to="/" className="navbar-logo">
            <img src={logo} alt="" />
            <span className="logo-name">BananaTalk</span>
          </NavLink>

          {/* Desktop sections */}
          <div className="navbar-links">
            {userInfo ? (
              <>
                <SectionMenu
                  id="nav-community"
                  label={communityLabel}
                  icon={<FaUsers />}
                  entries={communityEntries}
                  active={under(path, COMMUNITY_PATHS)}
                />
                <NavLink
                  to="/chat"
                  className={`nav-item ${chatActive ? "active" : ""}`}
                  aria-current={chatActive ? "page" : undefined}
                >
                  <span className="navbar-icon-wrap">
                    <FaComment />
                    {chatBadge("chat-unread-badge")}
                  </span>
                  <span>{chatsLabel}</span>
                </NavLink>
                <SectionMenu
                  id="nav-moments"
                  label={momentsLabel}
                  icon={<FaGlobe />}
                  entries={momentsEntries}
                  active={under(path, MOMENTS_PATHS)}
                />
              </>
            ) : (
              <>
                <a href="/" className="nav-item" onClick={goToFeatures}>
                  <span>{t("nav.features") || "Features"}</span>
                </a>
                <NavLink to="/download" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
                  <span>{t("nav.downloadApp") || "Download app"}</span>
                </NavLink>
              </>
            )}
          </div>

          {/* Right side actions */}
          <div className="navbar-actions">
            <NavDropdown
              id="nav-language"
              triggerClassName="lang-btn"
              triggerLabel={t("language") || "Language"}
              panelClassName="lang-dropdown"
              trigger={
                <>
                  <span className="lang-flag" aria-hidden="true">{currentLang.flag}</span>
                  <span className="lang-label">{currentLang.name}</span>
                  <FaChevronDown className="chevron" aria-hidden="true" />
                </>
              }
            >
              {(close) => (
                <>
                  <div className="dropdown-header">{t("language") || "Language"}</div>
                  <div className="lang-grid">
                    {LANGUAGES.map((lang) => (
                      <button
                        type="button"
                        key={lang.code}
                        lang={lang.code.replace("_", "-")}
                        onClick={() => {
                          changeLanguage(lang.code);
                          close();
                        }}
                        className={`lang-option ${activeLang === lang.code ? "active" : ""}`}
                        aria-pressed={activeLang === lang.code}
                      >
                        <span className="lang-option-flag" aria-hidden="true">{lang.flag}</span>
                        <span className="lang-option-name">{lang.name}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </NavDropdown>

            {userInfo ? (
              <NavDropdown
                id="nav-account"
                testId="nav-account-trigger"
                triggerClassName="user-btn"
                triggerLabel={t("nav.accountMenu") || "Account menu"}
                panelClassName="user-dropdown"
                trigger={
                  <>
                    <img src={getUserImage()} alt="" className="user-avatar" />
                    <FaChevronDown className="chevron" aria-hidden="true" />
                  </>
                }
              >
                {(close) => (
                  <>
                    <div className="dropdown-user-header">
                      <img src={getUserImage()} alt="" />
                      <div>
                        <div className="dropdown-user-name">{userInfo.user?.name}</div>
                        <div className="dropdown-user-email">{userInfo.user?.email}</div>
                      </div>
                    </div>
                    <div className="dropdown-divider" />
                    <NavLink to="/profile" className="dropdown-item" onClick={close}>
                      <FaRegUser /> <span>{t("profile.title") || "Profile"}</span>
                    </NavLink>
                    <NavLink to="/followersList" className="dropdown-item" onClick={close}>
                      <FaUserFriends /> <span>{t("nav.followersFollowing") || "Followers & following"}</span>
                    </NavLink>
                    {boostsOn && (
                      <NavLink to="/boost" className="dropdown-item" data-testid="nav-boost" onClick={close}>
                        <FaRocket /> <span>{t("boost.title") || "Boost my profile"}</span>
                      </NavLink>
                    )}
                    <NavLink to="/settings" className="dropdown-item" onClick={close}>
                      <FaCog /> <span>{t("settings.title") || "Settings"}</span>
                    </NavLink>
                    {isAdmin && (
                      <NavLink to="/admin" className="dropdown-item" onClick={close}>
                        <FaUserShield /> <span>{t("admin.nav.admin") || "Admin"}</span>
                      </NavLink>
                    )}
                    <div className="only-mobile" data-testid="nav-more">
                      <div className="dropdown-divider" />
                      <div className="dropdown-header">{t("nav.more") || "More"}</div>
                      {moreEntries.map((e) => (
                        <NavLink key={e.to} to={e.to} data-testid={e.testId} className="dropdown-item" onClick={close}>
                          {e.icon} <span>{e.label}</span>
                        </NavLink>
                      ))}
                    </div>
                    <div className="dropdown-divider" />
                    <button type="button" onClick={logoutHandler} className="dropdown-item logout-item">
                      <FaSignOutAlt /> <span>{t("logout") || "Log out"}</span>
                    </button>
                  </>
                )}
              </NavDropdown>
            ) : (
              <>
                <NavLink to="/login" className="login-link">
                  {t("sign_in") || "Log in"}
                </NavLink>
                <NavLink to="/register" className="signup-btn">
                  {t("nav.signUp") || "Sign up"}
                </NavLink>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* Mobile bottom tab bar, the app's own tab layout. */}
      {showBottomTabs && (
        <nav className="bottom-tabs" data-dark="" data-testid="bottom-tabs" aria-label={t("nav.tabs") || "Sections"}>
          {tabs.map((tab) => (
            <NavLink
              key={tab.key}
              to={tab.to}
              data-testid={`bottom-tab-${tab.key}`}
              className={`bottom-tab ${tab.active ? "active" : ""}`}
              aria-current={tab.active ? "page" : undefined}
            >
              <span className="navbar-icon-wrap">
                {tab.icon}
                {tab.badge && chatBadge("chat-unread-badge-mobile")}
              </span>
              <span className="bottom-tab-label">{tab.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </>
  );
};

export default MainNavbar;
