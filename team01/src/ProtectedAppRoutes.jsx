import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import HomePage from "./pages/HomePage";
import ChatPage from "./pages/ChatPage";
import FilterPage from "./pages/FilterPage";
import MatchesPage from "./pages/MatchesPage";
import ViewProfilePage from "./pages/ViewProfilePage";
import AboutUsPage from "./pages/AboutUsPage";
import RatingsPage from "./pages/RatingsPage";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { fetchMyActivities } from "./store/slices/activitySlice";
import { loadMatches } from "./store/slices/matchSlice.js";
import TutorialPage from "./pages/TutorialPage.jsx";

export default function ProtectedAppRoutes() {
  const isLoggedIn = useSelector((state) => state.userFlags.isLoggedIn);
  const dispatch = useDispatch();
  const profile = useSelector((state) => state.profile);
  
  const checkProfileCompletion = () => {
    return !profile.profile || !profile.profile.age || !profile.profile.location ||
    !profile.profile.gender || !profile.profile.pronouns;
  }

  useEffect(() => {
    dispatch(fetchMyActivities());
    dispatch(loadMatches());
  }, [dispatch]);

  if (
    isLoggedIn &&
    checkProfileCompletion() &&
    location.pathname !== "/complete-profile"
  ) {
    return <Navigate to="/complete-profile" replace />;
  }

  return (
    <Routes>
      <Route path="home" element={<HomePage />} />
      <Route path="chat" element={<ChatPage />} />
      <Route path="chat/:matchId" element={<ChatPage />} />
      <Route path="make-a-new-match" element={<FilterPage />} />
      <Route path="matches" element={<MatchesPage />} />
      <Route path="profile" element={<ViewProfilePage />} />
        <Route path="ratings" element={<RatingsPage />} />
        <Route path="help" element={<TutorialPage/>} />
      {/* Fallback for unknown /loveinaction/* routes */}
      <Route
        path="*"
        element={
          isLoggedIn ? (
            <Navigate to="/loveinaction/home" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route path="about" element={<AboutUsPage />} />
    </Routes>
  );
}