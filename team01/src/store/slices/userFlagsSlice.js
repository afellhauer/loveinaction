// 📁 src/store/slices/userFlagsSlice.js
import { createSlice } from "@reduxjs/toolkit";
import { Views } from "../../data/Views.jsx";
import { Pages } from "../../data/Pages.jsx";

const initialState = {
  isLoggedIn: false,
  justSignedUp: false,
  showProfile: false,
  activeSession: false,
  showSafety: false,
  safetyPayload: { safetyScore: 0, badges: [] },
  showMoreInfo: false,
  showTermsDialog: false,
  alertDismissed: false,
  upcomingDismissed: true,
  authPage: "login",
  sideBarOpen: false,
  currentView: Views.HOME,
  pageTitle: Pages.HOME,
};

const userFlagsSlice = createSlice({
  name: "userFlags",
  initialState,
  reducers: {
    setLoggedIn: (state, action) => {
      state.isLoggedIn = action.payload;
      // When logging out, reset the app state
      if (!state.isLoggedIn) {
        state.sideBarOpen = false;
        state.currentView = Views.HOME;
        state.pageTitle = Pages.HOME;
        state.showSafety = false;
        state.showMoreInfo = false;
        state.showProfile = false;
      }
    },

    setJustSignedUp: (state, action) => {
      state.justSignedUp = action.payload;
    },
    setShowProfile: (state, action) => {
      state.showProfile = action.payload;
    },
    setActiveSession: (state, action) => {
      state.activeSession = action.payload;
    },
    setShowSafety(state, action) {
      state.showSafety = action.payload;
    },
    setSafetyPayload(state, action) {
      state.safetyPayload = action.payload;
    },
    setShowMoreInfo(state, action) {
      state.showMoreInfo = action.payload;
    },
    setAlertDismissed: (state, action) => {
      state.alertDismissed = action.payload;
    },
    setUpcomingDismissed: (state, action) => {
      state.upcomingDismissed = action.payload;
    },
    setAuthPage: (state, action) => {
      state.authPage = action.payload;
    },
    setSideBarOpen: (state, action) => {
      state.sideBarOpen = action.payload;
    },
    changeView: (state, action) => {
      state.currentView = action.payload;
      state.sideBarOpen = false;
      state.pageTitle = setPageTitle(state.currentView);
      state.showSafety = false;
    },
    // Add a specific logout action for better control
    logout: (state) => {
      return {
        ...initialState,
        // Keep some state that might be relevant for the next login
      };
    },
    setShowTermsDialog: (state, action) => {
      state.showTermsDialog = action.payload;
    },
  },
});

function setPageTitle(view) {
  switch (view) {
    case Views.HOME:
      return Pages.HOME;
    case Views.CHAT:
      return Pages.CHAT;
    case Views.PROFILE:
      return Pages.PROFILE;
    case Views.FILTER:
    case Views.SWIPE:
      return Pages.MATCHING;
  }
  return "";
}

export const {
  setLoggedIn,
  setJustSignedUp,
  setShowProfile,
  setActiveSession,
  setShowSafety,
  setSafetyPayload,
  setAlertDismissed,
  setUpcomingDismissed,
  setAuthPage,
  setSideBarOpen,
  changeView,
  setShowMoreInfo,
  logout,
  setShowTermsDialog,
} = userFlagsSlice.actions;

export default userFlagsSlice.reducer;
