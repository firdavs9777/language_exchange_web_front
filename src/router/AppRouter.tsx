import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  useLocation,
  useParams,
} from "react-router-dom";
import App from "../App";
import HomeScreen from "../components/home/HomeMain";
import React from "react";
import MainCommnity from "../components/community/MainCommunity";
import Login from "../components/auth/Login";
import MainMoments from "../components/moments/MainMoments";
import Register from "../components/auth/Register";
import MomentDetail from "../components/moments/MomentDetail";
import CreateMoment from "../components/moments/CreateMoment";
import ProfileScreen from "../components/profile/Profile";
import CoursesMain from "../components/courses/CoursesMain";
import CommunityDetail from "../components/community/CommunityDetail";
import UserFollowersList from "../components/profile/UserFollowers";
import UserFollowingList from "../components/profile/UserFollowing";
import MyMoments from "../components/profile/MyMoments";
import MainChat from "../components/chat/MainChat";
import ForgetPassword from "../components/auth/ForgetPassword";
import EditMyMoment from "../components/profile/EditMyMoment";

const MainChatWrapper = () => {
  const { userId } = useParams();
  console.log("Chat userId param:", userId);
  return <MainChat key={userId || "no-user"} />;
};

const AppRouter = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<App />}>
      {/* Home route - this should be the only index route */}
      <Route index element={<HomeScreen />} />

      {/* Auth routes */}
      <Route path="login" element={<Login />} />
      <Route path="register" element={<Register />} />
      <Route path="forgot-password" element={<ForgetPassword />} />

      {/* Community routes */}
      <Route path="communities" element={<MainCommnity />} />
      <Route path="community/:id" element={<CommunityDetail />} />

      {/* Moment routes */}
      <Route path="moments" element={<MainMoments />} />
      <Route path="moment/:id" element={<MomentDetail />} />
      <Route path="add-moment" element={<CreateMoment />} />
      <Route path="edit-moment/:id" element={<EditMyMoment />} />
      <Route path="my-moments" element={<MyMoments />} />

      {/* Profile routes */}
      <Route path="profile" element={<ProfileScreen />} />
      <Route path="followersList" element={<UserFollowersList />} />
      <Route path="followingsList" element={<UserFollowingList />} />

      {/* Chat route - Single route with optional parameter */}
      <Route path="chat/:userId?" element={<MainChatWrapper />} />

      {/* Courses route */}
      <Route path="courses" element={<CoursesMain />} />
    </Route>
  )
);

export default AppRouter;

// Alternative approach using a single route with optional parameter:
// Replace the two chat routes above with this single line:
// <Route path="chat/:userId?" element={<MainChatWrapper />} />

// If you want to be extra sure about re-rendering, use this enhanced wrapper:
const MainChatWrapperEnhanced = () => {
  const { userId } = useParams();
  const [currentUserId, setCurrentUserId] = React.useState(userId);

  React.useEffect(() => {
    console.log("Route changed - userId:", userId);
    setCurrentUserId(userId);
  }, [userId]);

  return <MainChat key={currentUserId || "no-user"} userId={currentUserId} />;
};

// Debug version to help troubleshoot:
const MainChatWrapperDebug = () => {
  const { userId } = useParams();
  const location = useLocation();

  console.log("=== CHAT ROUTE DEBUG ===");
  console.log("Current pathname:", location.pathname);
  console.log("userId param:", userId);
  console.log("All params:", useParams());
  console.log("========================");

  return <MainChat key={userId || "no-user"} userId={userId} />;
};
