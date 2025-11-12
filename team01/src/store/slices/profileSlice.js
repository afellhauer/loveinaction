// src/store/slices/profileSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  fetchMeAndProfile,
  saveProfile as apiSaveProfile,
} from "../../utils/api";

// Thunk to load “me + profile”
export const loadProfile = createAsyncThunk(
  "profile/load",
  async (_, { rejectWithValue }) => {
    try {
      const { user, profile } = await fetchMeAndProfile();
      return { user, profile };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// Thunk to save/update profile
export const saveProfile = createAsyncThunk(
  "profile/save",
  async (formData, { rejectWithValue }) => {
    try {
      return await apiSaveProfile(formData);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const initialState = {
  user: null, // { id, firstName, lastName, email }
  profile: null, // { age, location, …, profilePicUrl, socialMedia, … }
  isLoading: false,
  isSaving: false,
  loadError: null,
  saveError: null,
};

const profileSlice = createSlice({
  name: "profile",
  initialState,
  reducers: {
    clearLoadError(state) {
      state.loadError = null;
    },
    clearSaveError(state) {
      state.saveError = null;
    },
    // If you ever need to wipe out everything (e.g. on logout)
    resetProfileState() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      // —— loadProfile ——
      .addCase(loadProfile.pending, (state) => {
        state.isLoading = true;
        state.loadError = null;
      })
      .addCase(loadProfile.fulfilled, (state, { payload }) => {
        state.isLoading = false;
        state.user = payload.user;
        state.profile = payload.profile;
      })
      .addCase(loadProfile.rejected, (state, { payload }) => {
        state.isLoading = false;
        state.loadError = payload;
      })

      // —— saveProfile ——
      .addCase(saveProfile.pending, (state) => {
        state.isSaving = true;
        state.saveError = null;
      })
      .addCase(saveProfile.fulfilled, (state, { payload }) => {
        state.isSaving = false;
        // payload is the saved profile object
        state.profile = payload;
      })
      .addCase(saveProfile.rejected, (state, { payload }) => {
        state.isSaving = false;
        state.saveError = payload;
      });
  },
});

export const { clearLoadError, clearSaveError, resetProfileState } =
  profileSlice.actions;

// Selectors
export const selectUser = (state) => state.profile.user;
export const selectProfile = (state) => state.profile.profile;
export const selectIsLoading = (state) => state.profile.isLoading;
export const selectLoadError = (state) => state.profile.loadError;
export const selectIsSaving = (state) => state.profile.isSaving;
export const selectSaveError = (state) => state.profile.saveError;

export default profileSlice.reducer;
