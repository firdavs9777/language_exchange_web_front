import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
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
import MyMoments from "../components/moments/MyMoments";
import MainChat from "../components/chat/MainChat";

const AppRouter = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<App />}>
      <Route index={true} path="/login" element={<Login />} />
      <Route index={true} path="/" element={<HomeScreen />} />
      <Route index={true} path="/communities" element={<MainCommnity />} />
      <Route index={true} path="/community/:id" element={<CommunityDetail />} />
      <Route
        index={true}
        path="/followersList"
        element={<UserFollowersList />}
      />
      <Route
        index={true}
        path="/followingsList"
        element={<UserFollowingList />}
      />
      <Route index={true} path="/moment/:id" element={<MomentDetail />} />
      <Route index={true} path="/add-moment" element={<CreateMoment />} />
      <Route index={true} path="/moments" element={<MainMoments />} />
      <Route index={true} path="/chat" element={<MainChat />} />
      <Route index={true} path="/register" element={<Register />} />
      <Route index={true} path="/profile" element={<ProfileScreen />} />
      <Route index={true} path="/my-moments" element={<MyMoments />} />
      <Route index={true} path="/courses" element={<CoursesMain />} />
    </Route>
  )
);

export default AppRouter;
