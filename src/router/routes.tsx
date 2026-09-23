import React from "react";
import {
  createRoutesFromElements,
  Route,
  useParams,
} from "react-router-dom";
import App from "../App";
import Loader from "../components/Loader";

// --- Eager: the prerendered public pages ------------------------------------
//
// Everything in this block is reachable from src/seo/publicRoutes.ts, i.e.
// scripts/prerender.js renders it to static HTML in plain Node. React.lazy
// THROWS inside renderToString unless the chunk is already resolved, so a
// prerendered page can never be lazy. It is also the right call for weight:
// these are exactly the modules a first-time visitor needs at first paint.
//
// PRERENDER_PATHS today: / /download /meet /learn-korean /communities
// /moments /privacy-policy /terms-of-use /support /data-deletion /404.
// Add a page to SEO_PAGES and its component belongs here.
import HomeScreen from "../components/home/HomeMain";
import NotFound from "../components/errors/NotFound";
import MainCommnity from "../components/community/MainCommunity";
import MainMoments from "../components/moments/MainMoments";
import PrivacyPolicy from "../components/navbar/PrivacyPolicy";
import DataDeletion from "../components/navbar/DataDeletion";
import TermsOfUse from "../components/navbar/TermsOfUse";
import SupportPage from "../components/support/SupportMain";
import DownloadApp from "../components/download/DownloadApp";
import MeetLanding from "../components/landing/MeetLanding";
import LearnKoreanLanding from "../components/landing/LearnKoreanLanding";
// Not prerendered, but eager on purpose: /moment/:id is the page every shared
// moment link lands on, and it is built almost entirely out of modules the
// eager /moments feed already pulls in (SingleMoment shares its reaction row,
// share button, media players and translator). Splitting it would buy a few
// hundred bytes and cost a logged-out visitor a round trip.
import MomentDetail from "../components/moments/MomentDetail";

// --- Lazy: everything behind a login ----------------------------------------
//
// None of these routes is prerendered and none of them is on a path a crawler
// or a first-time visitor walks, so their code has no business in the main
// bundle. React.lazy also keeps this module importable in plain Node: the
// import only runs when something renders the element.

// Auth
const Login = React.lazy(() => import("../components/auth/Login"));
const Register = React.lazy(() => import("../components/auth/Register"));
const ForgetPassword = React.lazy(() => import("../components/auth/ForgetPassword"));
const AuthCallback = React.lazy(() => import("../components/auth/AuthCallback"));

// Profile
const ProfileScreen = React.lazy(() => import("../components/profile/Profile"));
const PublicProfile = React.lazy(() => import("../components/profile/PublicProfile"));
const EditProfile = React.lazy(() => import("../components/profile/EditProfile"));
const UserFollowersList = React.lazy(() => import("../components/profile/UserFollowers"));
const UserFollowingList = React.lazy(() => import("../components/profile/UserFollowing"));
const UserVisitorsList = React.lazy(() => import("../components/profile/UserVisitors"));
const MyMoments = React.lazy(() => import("../components/profile/MyMoments"));
const EditMyMoment = React.lazy(() => import("../components/profile/EditMyMoment"));

// Moments composer and the saved list (the feed and the detail stay eager)
const CreateMoment = React.lazy(() => import("../components/moments/CreateMoment"));
const SavedMoments = React.lazy(() => import("../components/moments/SavedMoments"));

// Chat. The heaviest group: socket plumbing, media galleries, emoji.
const MainChat = React.lazy(() => import("../components/chat/MainChat"));
const NewChat = React.lazy(() => import("../components/chat/NewChat"));
const ChatSettings = React.lazy(() => import("../components/chat/ChatSettings"));
const MediaGallery = React.lazy(() => import("../components/chat/MediaGallery"));

// Stories / reels
const MainStories = React.lazy(() => import("../components/stories/MainStories"));
const Highlights = React.lazy(() => import("../components/stories/Highlights"));
const CreateStory = React.lazy(() => import("../components/stories/CreateStory"));
const StoryViewer = React.lazy(() => import("../components/stories/StoryViewer"));

// Settings
const Settings = React.lazy(() => import("../components/settings/Settings"));
const PrivacySettings = React.lazy(() => import("../components/settings/PrivacySettings"));
const NotificationSettings = React.lazy(() => import("../components/settings/NotificationSettings"));
const VipSettings = React.lazy(() => import("../components/settings/VipSettings"));
const LanguageSettings = React.lazy(() => import("../components/settings/LanguageSettings"));
const BlockedUsers = React.lazy(() => import("../components/settings/BlockedUsers"));
const CloseFriends = React.lazy(() => import("../components/settings/CloseFriends"));

// Community, authenticated. /communities itself (MainCommnity, which renders
// PublicCommunities for logged-out visitors) is prerendered and stays eager.
const CommunityDetail = React.lazy(() => import("../components/community/CommunityDetail"));
const NearbyUsers = React.lazy(() => import("../components/community/NearbyUsers"));
const Waves = React.lazy(() => import("../components/community/Waves"));
const Topics = React.lazy(() => import("../components/community/Topics"));

// Courses
const CoursesMain = React.lazy(() => import("../components/courses/CoursesMain"));

// Admin console. Lazy on purpose, and lazy is load-bearing twice over: this
// module is required by scripts/prerender.js in plain Node, and the console
// pulls in charts, tables and the whole admin slice that no visitor of a
// public page should download. React.lazy defers the import until a route
// actually renders, so /admin costs nothing to anyone who never opens it.
const AdminLayout = React.lazy(() => import("../components/admin/AdminLayout"));
const AdminOverview = React.lazy(() => import("../components/admin/pages/AdminOverview"));
const AdminReach = React.lazy(() => import("../components/admin/pages/AdminReach"));
const AdminUsers = React.lazy(() => import("../components/admin/pages/AdminUsers"));
const AdminContent = React.lazy(() => import("../components/admin/pages/AdminContent"));
const AdminAiUsage = React.lazy(() => import("../components/admin/pages/AdminAiUsage"));
const AdminAudit = React.lazy(() => import("../components/admin/pages/AdminAudit"));

// The one fallback every lazy group shares: the app's existing spinner in a
// block tall enough that the footer does not jump up and then back down while
// a chunk is in flight. Neutral on purpose -- a skeleton would have to guess
// at seven different layouts.
const RouteFallback = () => (
  <div
    className="route-chunk-loading"
    style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}
    aria-busy="true"
    aria-live="polite"
  >
    <Loader />
  </div>
);

// One boundary per lazy group. Only one element of a group is ever mounted at
// a time, so a boundary around each element is the same thing as a boundary
// around the group without the extra layout route in between.
const lazyRoute = (node: React.ReactNode) => (
  <React.Suspense fallback={<RouteFallback />}>{node}</React.Suspense>
);

// The admin console nests a lazy layout around a lazy page: two boundaries
// resolve in sequence there, and a spinner that flashes twice reads worse
// than nothing at all.
const lazyAdminRoute = (node: React.ReactNode) => (
  <React.Suspense fallback={null}>{node}</React.Suspense>
);

const MainChatWrapper = () => {
  const { userId } = useParams();
  return <MainChat key={userId || "no-user"} />;
};

// One route tree, two consumers: AppRouter.tsx wraps it in createBrowserRouter
// for the browser; scripts/prerender.js feeds it to createStaticHandler. Keep
// this module free of anything that touches window at import time.
export const routes = createRoutesFromElements(
  <Route path="/" element={<App />}>
    <Route index element={<HomeScreen />} />
    <Route path="login" element={lazyRoute(<Login />)} />
    <Route path="auth/callback" element={lazyRoute(<AuthCallback />)} />

    <Route path="data-deletion/" element={<DataDeletion />} />
    <Route path="register" element={lazyRoute(<Register />)} />
    <Route path="forgot-password" element={lazyRoute(<ForgetPassword />)} />
    <Route path="communities" element={<MainCommnity />} />
    <Route path="community/:id" element={lazyRoute(<CommunityDetail />)} />
    <Route path="moments" element={<MainMoments />} />
    <Route path="moment/:id" element={<MomentDetail />} />
    <Route path="add-moment" element={lazyRoute(<CreateMoment />)} />
    <Route path="edit-moment/:id" element={lazyRoute(<EditMyMoment />)} />
    <Route path="my-moments" element={lazyRoute(<MyMoments />)} />
    <Route path="profile" element={lazyRoute(<ProfileScreen />)} />
    <Route path="profile/edit" element={lazyRoute(<EditProfile />)} />
    {/* Public, read-only profile route for shared links. Must stay public
        (no auth guard) so logged-out visitors can view it; react-router v6
        ranks the static "profile/edit" segment above this dynamic
        "profile/:userId" segment regardless of declaration order, so
        there's no conflict between the two. */}
    <Route path="profile/:userId" element={lazyRoute(<PublicProfile />)} />
    <Route path="followersList" element={lazyRoute(<UserFollowersList />)} />
    <Route path="followingsList" element={lazyRoute(<UserFollowingList />)} />
    <Route path="visitors" element={lazyRoute(<UserVisitorsList />)} />
    <Route path="chat/new" element={lazyRoute(<NewChat />)} />
    <Route path="chat/:conversationId/settings" element={lazyRoute(<ChatSettings />)} />
    <Route path="chat/:conversationId/media" element={lazyRoute(<MediaGallery />)} />
    <Route path="chat/:userId?" element={lazyRoute(<MainChatWrapper />)} />
    <Route path="courses" element={lazyRoute(<CoursesMain />)} />
    <Route path="support/" element={<SupportPage />} />
    <Route path="stories/" element={lazyRoute(<MainStories />)} />
    <Route path="create-story" element={lazyRoute(<CreateStory />)} />
    <Route path="stories/:userId" element={lazyRoute(<StoryViewer />)} />
    <Route path="highlights" element={lazyRoute(<Highlights />)} />
    <Route path="privacy-policy/" element={<PrivacyPolicy />} />
    <Route path="terms-of-use/" element={<TermsOfUse />} />
    <Route path="download" element={<DownloadApp />} />
    <Route path="meet" element={<MeetLanding />} />
    <Route path="learn-korean" element={<LearnKoreanLanding />} />

    {/* Settings */}
    <Route path="settings" element={lazyRoute(<Settings />)} />
    <Route path="settings/privacy" element={lazyRoute(<PrivacySettings />)} />
    <Route path="settings/notifications" element={lazyRoute(<NotificationSettings />)} />
    <Route path="settings/vip" element={lazyRoute(<VipSettings />)} />
    <Route path="settings/language" element={lazyRoute(<LanguageSettings />)} />
    <Route path="settings/blocked" element={lazyRoute(<BlockedUsers />)} />
    <Route path="settings/close-friends" element={lazyRoute(<CloseFriends />)} />

    {/* Community */}
    <Route path="community/nearby" element={lazyRoute(<NearbyUsers />)} />
    <Route path="waves" element={lazyRoute(<Waves />)} />
    <Route path="topics" element={lazyRoute(<Topics />)} />

    {/* Moments */}
    <Route path="moments/saved" element={lazyRoute(<SavedMoments />)} />

    {/* Admin console. Guarded inside AdminLayout (RequireAdmin) and noindex
        by default — RouteMeta marks every path outside SEO_PAGES. */}
    <Route path="admin" element={lazyAdminRoute(<AdminLayout />)}>
      <Route index element={lazyAdminRoute(<AdminOverview />)} />
      <Route path="reach" element={lazyAdminRoute(<AdminReach />)} />
      <Route path="users" element={lazyAdminRoute(<AdminUsers />)} />
      <Route path="content" element={lazyAdminRoute(<AdminContent />)} />
      <Route path="ai-usage" element={lazyAdminRoute(<AdminAiUsage />)} />
      <Route path="audit" element={lazyAdminRoute(<AdminAudit />)} />
    </Route>

    {/* Catch-all. Must stay last. */}
    <Route path="*" element={<NotFound />} />
  </Route>
);
