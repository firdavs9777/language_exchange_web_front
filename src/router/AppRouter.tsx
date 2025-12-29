import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  useParams,
} from "react-router-dom";
import App from "../App";
import HomeScreen from "../components/home/HomeMain";

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
import UserVisitorsList from "../components/profile/UserVisitors";
import MyMoments from "../components/profile/MyMoments";
import MyStories from "../components/stories/MyStories";
import MainChat from "../components/chat/MainChat";
import ForgetPassword from "../components/auth/ForgetPassword";
import EditMyMoment from "../components/profile/EditMyMoment";
import MainStories from "../components/stories/MainStories";
import StoryViewer from "../components/stories/StoryViewer";
import CreateStory from "../components/stories/CreateStory";
import PrivacyPolicy from "../components/navbar/PrivacyPolicy";
import DataDeletion from "../components/navbar/DataDeletion";
import SupportPage from "../components/support/SupportMain";
import TermsOfUse from "../components/navbar/TermsOfUse";
import OAuthCallback from "../components/auth/OAuthCallback";

const MainChatWrapper = () => {
  const { userId } = useParams();
  console.log("Chat userId param:", userId);
  return <MainChat key={userId || "no-user"} />;
};

const AppRouter = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<App />}>
      <Route index element={<HomeScreen />} />
      <Route path="login" element={<Login />} />
      <Route path="auth/callback" element={<OAuthCallback />} />

      <Route path="data-deletion/" element={<DataDeletion />} />
      <Route path="register" element={<Register />} />
      <Route path="forgot-password" element={<ForgetPassword />} />
      <Route path="communities" element={<MainCommnity />} />
      <Route path="community/:id" element={<CommunityDetail />} />
      <Route path="moments" element={<MainMoments />} />
      <Route path="moment/:id" element={<MomentDetail />} />
      <Route path="add-moment" element={<CreateMoment />} />
      <Route path="edit-moment/:id" element={<EditMyMoment />} />
      <Route path="my-moments" element={<MyMoments />} />
      <Route path="my-stories" element={<MyStories />} />
      <Route path="profile" element={<ProfileScreen />} />
      <Route path="followersList" element={<UserFollowersList />} />
      <Route path="followingsList" element={<UserFollowingList />} />
      <Route path="visitorsList" element={<UserVisitorsList />} />
      <Route path="chat/:userId?" element={<MainChatWrapper />} />
      <Route path="courses" element={<CoursesMain />} />
      <Route path="support/" element={<SupportPage />} />
      <Route path="stories/" element={<MainStories />} />
      <Route path="stories/:userId" element={<StoryViewer />} />
      <Route path="create-story" element={<CreateStory />} />
      <Route path="stories/archive" element={<MainStories />} />
      <Route path="stories/highlights" element={<MainStories />} />
      <Route path="stories/close-friends" element={<MainStories />} />
      <Route path="privacy-policy/" element={<PrivacyPolicy />} />
      <Route path="terms-of-use/" element={<TermsOfUse />} />
    </Route>
  )
);

export default AppRouter;
