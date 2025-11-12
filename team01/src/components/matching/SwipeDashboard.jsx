// 📁 src/components/SwipeDashboard.jsx
import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import ProfileCard from "../profile/ProfileCard.jsx";
import MatchSuccessfulModal from "./MatchSuccessfulModal.jsx";
import { createNewMessage } from "../../store/slices/messageSlice.js";
import {
  setShowSafety,
  setSafetyPayload,
} from "../../store/slices/userFlagsSlice.js";
import { Views } from "../../data/Views.jsx";
import { useNavigate } from "react-router-dom";

import {
  fetchPotentialMatches,
  selectPotentialMatches,
  selectCurrentActivity,
  selectIsMatchesLoading,
  selectMatchesError,
  selectCurrentProfileIndex,
  nextProfile,
} from "../../store/slices/activitySlice.js";

import {
  swipeUser,
  fetchAlreadySwipedUsers,
  selectAlreadySwipedUsers,
  selectIsSwipeLoading,
  selectSwipeError,
  selectLatestMatch,
  selectIsMatch,
  clearLatestMatch,
} from "../../store/slices/swipeSlice.js";

import { updateConfirmationState } from "../../store/slices/messageSlice.js";
import { loadMatches, selectMatches } from "../../store/slices/matchSlice.js";

import "./SwipeDashboard.css";

export default function SwipeDashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Redux state
  const currentActivity = useSelector(selectCurrentActivity);
  const matches = useSelector(selectMatches);
  const matchedUserIds = new Set((matches || []).map((m) => m.otherUser._id));
  const allMatches = useSelector(selectPotentialMatches);
  const alreadySwiped = useSelector((state) =>
    selectAlreadySwipedUsers(state, currentActivity?._id)
  );
  const currentIndex = useSelector(selectCurrentProfileIndex);
  const isMatchesLoading = useSelector(selectIsMatchesLoading);
  const matchesError = useSelector(selectMatchesError);

  const isSwipeLoading = useSelector(selectIsSwipeLoading);
  const swipeError = useSelector(selectSwipeError);
  const latestMatch = useSelector(selectLatestMatch);
  const isMatch = useSelector(selectIsMatch);

  // Local UI state
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [nextCardReady, setNextCardReady] = useState(true);

  // Redirect if activity disappears
  useEffect(() => {
    if (
      !currentActivity &&
      window.location.pathname.includes("/loveinaction/matches")
    ) {
      navigate("/loveinaction/myactivities");
    }
  }, [currentActivity, navigate]);

  // Load matches and swiped users on activity change
  useEffect(() => {
    if (!currentActivity) return;
    dispatch(fetchPotentialMatches(currentActivity._id));
    dispatch(fetchAlreadySwipedUsers(currentActivity._id));
  }, [dispatch, currentActivity]);

  // Only show unseen, unmatched profiles
  const filteredMatches = allMatches.filter(
    (m) => !alreadySwiped.includes(m.userId) && !matchedUserIds.has(m.userId)
  );
  const currentProfile = filteredMatches[currentIndex] || null;

  // Auto‐open chat on mutual match
  useEffect(() => {
    if (isMatch && latestMatch && currentActivity) {
      const meIsUser1 =
        latestMatch.user1Id._id.toString() === currentActivity.userId;
      const matchedUser = meIsUser1 ? latestMatch.user2Id : latestMatch.user1Id;
      dispatch(createNewMessage({ match: matchedUser }));
    }
  }, [isMatch, latestMatch, dispatch, currentActivity]);

  // When user clicks “View Safety Score”
  const onViewSafety = ({ safetyScore, badges }) => {
    dispatch(setSafetyPayload({ safetyScore, badges }));
    dispatch(setShowSafety(true));
  };

  // Swipe action (like or pass)
  const handleSwipe = (direction) => {
    if (!currentProfile || !currentActivity || isAnimating || isSwipeLoading)
      return;

    setSwipeDirection(direction);
    setIsAnimating(true);
    setNextCardReady(false);

    setTimeout(async () => {
      const type = direction === "right" ? "like" : "pass";
      try {
        await dispatch(
          swipeUser({
            swipedUserId: currentProfile.userId,
            activityId: currentActivity._id,
            type,
          })
        ).unwrap();
        dispatch(nextProfile());
      } catch (err) {
        console.error("Swipe error:", err);
      } finally {
        setSwipeDirection(null);
        setIsAnimating(false);
        setNextCardReady(true);
      }
    }, 500);
  };

  const handleMatchModalClose = () => dispatch(clearLatestMatch());

  // --- Render states ----------------------------------

  if (isMatchesLoading) {
    return (
      <div className="dashboard-container">
        <h2>Loading matches...</h2>
      </div>
    );
  }
  if (matchesError) {
    return (
      <div className="dashboard-container error-state">
        <h2>Error loading matches</h2>
        <p>{matchesError}</p>
        <button
          className="dialog-btn back"
          onClick={() => navigate("/loveinaction/home")}>
          Back to Home
        </button>
        <button
          className="dialog-btn"
          onClick={() =>
            currentActivity &&
            dispatch(fetchPotentialMatches(currentActivity._id))
          }>
          Retry
        </button>
      </div>
    );
  }
  if (!currentActivity) {
    return (
      <div className="dashboard-container no-more-cards">
        <h2>No Activity Selected</h2>
        <p>Please pick an activity to start swiping.</p>
        <button
          onClick={() => navigate("/loveinaction/make-a-new-match")}
          className="dialog-btn back">
          Pick Activity
        </button>
      </div>
    );
  }

  // --- Main UI ----------------------------------------
  return (
    <div className="dashboard-container">
      <div className="swipe-dashboard">
        <div className="dash-left bg-left" onClick={() => handleSwipe("left")}>
          <h1 className="pass-text">PASS</h1>
        </div>

        {currentProfile ? (
          <div className="card-container">
            <div
              className={`card ${
                !nextCardReady ? `swipe-${swipeDirection}` : ""
              }`}>
              <ProfileCard
                {...currentProfile}
                ratingsCount={currentProfile.ratingsCount}
                onViewSafety={onViewSafety}
                isNewUser={currentProfile.ratingsCount === 0}
              />
            </div>
            <div className="swipe-buttons">
              <button
                className="swipe-btn pass"
                onClick={() => handleSwipe("left")}
                disabled={isSwipeLoading}>
                PASS
              </button>
              <button
                className="swipe-btn linkup"
                onClick={() => handleSwipe("right")}
                disabled={isSwipeLoading}>
                LINK UP
              </button>
            </div>
          </div>
        ) : (
          <div className="no-more-cards">
            <h2>No more profiles</h2>
            <p>Try another activity or come back later.</p>
            <button
              className="dialog-btn back"
              onClick={() => navigate("/loveinaction/home")}>
              Home
            </button>
          </div>
        )}

        <div
          className="dash-right bg-right"
          onClick={() => handleSwipe("right")}>
          <h1 className="linkup-text">LINK UP</h1>
        </div>
      </div>

      {swipeError && (
        <div className="error-message">Swipe Error: {swipeError}</div>
      )}

      {isMatch && latestMatch && (
        <MatchSuccessfulModal
          profile={
            latestMatch.user1Id._id.toString() === currentActivity.userId
              ? latestMatch.user2Id
              : latestMatch.user1Id
          }
          onClose={handleMatchModalClose}
        />
      )}
    </div>
  );
}
