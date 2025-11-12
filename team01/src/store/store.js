import { configureStore } from "@reduxjs/toolkit";
import storage from "redux-persist/lib/storage"; // defaults to localStorage
import profilesReducer from "./slices/profilesSlice";
import messageReducer from "./slices/messageSlice.js";
import userFlagReducer from "./slices/userFlagsSlice.js";
import swipeReducer from "./slices/swipeSlice.js";
import activityReducer from "./slices/activitySlice.js";
import profileReducer from "./slices/profileSlice";
import ratingReducer from "./slices/ratingSlice.js";
import matchReducer from "./slices/matchSlice.js";
import matchedProfilesReducer from "./slices/matchedProfilesSlice.js";
import blockedUsersReducer from "./slices/blockedUsersSlice.js";
import verificationReducer from "./slices/verificationSlice.js";

import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";

import { combineReducers } from "redux";

const rootReducer = combineReducers({
  profiles: profilesReducer,
  profile: profileReducer,
  messages: messageReducer,
  userFlags: userFlagReducer,
  swipe: swipeReducer,
  activity: activityReducer,
  ratings: ratingReducer,
  matches: matchReducer,
  matchedProfiles: matchedProfilesReducer,
  blockedUsers: blockedUsersReducer,
  verification: verificationReducer,
});

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["userFlags", "profile"], // Only persist userFlags slice
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  devTools: process.env.NODE_ENV !== "production",
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore redux-persist actions
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export default store;
