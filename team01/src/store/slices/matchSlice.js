// 📁 src/store/slices/matchSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { fetchMatches } from "../../utils/api/matches";

export const loadMatches = createAsyncThunk(
  "matches/load",
  async (_, { rejectWithValue }) => {
    try {
      const data = await fetchMatches();
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const matchSlice = createSlice({
  name: "matches",
  initialState: {
    matches: [],
    isLoading: false,
    error: null,
  },
  reducers: {
    addMatch: (state, action) => {
      if (!state.matches.some((m) => m._id === action.payload._id)) {
        state.matches.push(action.payload);
      }
    },
    removeMatchById(state, action) {
      state.matches = state.matches.filter(m => m._id !== action.payload);
    },
    updateMatchConfirmedStatusInStore: (state, action) => {
      const updated = action.payload;
      const idx = state.matches.findIndex(m => m._id === updated._id);
      if (idx === -1) return;

      const matchToUpdate = state.matches[idx];
      const otherUserId = matchToUpdate.otherUser._id;
      const isUser1 = updated.user2Id === otherUserId
      const isUser2 = updated.user1Id === otherUserId

      if (!isUser1 && !isUser2) return;

      // Update only the fields that may have changed
      matchToUpdate.status = updated.status;

      if (isUser1) {
        matchToUpdate.myConfirmed = updated.user1Confirmed;
        matchToUpdate.theirConfirmed = updated.user2Confirmed;
        matchToUpdate.myRating = updated.user1Rating;
        matchToUpdate.theirRating = updated.user2Rating;
      } else {
        matchToUpdate.myConfirmed = updated.user2Confirmed;
        matchToUpdate.theirConfirmed = updated.user1Confirmed;
        matchToUpdate.myRating = updated.user2Rating;
        matchToUpdate.theirRating = updated.user1Rating;
      }

      matchToUpdate.updatedAt = updated.updatedAt;
      matchToUpdate.lastMessageAt = updated.lastMessageAt;
    },
    updateTrustedStatusInStore: (state, action) => {
      const matchId = action.payload;
      const idx = state.matches.findIndex(m => m._id.toString() === matchId.toString());
      if (idx === -1) {
        return;
      }
      const matchToUpdate = state.matches[idx];
      matchToUpdate.myTrustedContactNotified = true;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadMatches.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadMatches.fulfilled, (state, action) => {
        state.isLoading = false;
        // Instead of hand-picking fields, spread the entire match object:
        state.matches = action.payload.data.map((m) => ({
          ...m,
          // now you have:
          // m._id, m.otherUser, m.activityType, m.location, m.dates,
          // m.times, m.status, m.myRating, m.theirRating,
          // m.matchedAt, m.lastMessageAt, m.updatedAt, etc
        }));
      })
      .addCase(loadMatches.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const selectMatches = (state) => state.matches.matches;
export const selectMatchesLoading = (state) => state.matches.isLoading;
export const selectMatchesError = (state) => state.matches.error;
export const selectHasUnratedConfirmedMatches = (state) => {
  const matches = selectMatches(state);
  return (matches || []).some(match =>
      match.status === "date_passed" && match.myRating === null
  );
};

export const { addMatch,
  updateMatchConfirmedStatusInStore,
  removeMatchById,
  updateTrustedStatusInStore} = matchSlice.actions;
export default matchSlice.reducer;
