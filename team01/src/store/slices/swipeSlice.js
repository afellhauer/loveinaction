import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  createSwipe,
  getAlreadySwipedUsers,
  getMatchesForActivity,
  getMySwipes,
  deleteSwipe,
} from "../../utils/api";

export const swipeUser = createAsyncThunk(
  "swipe/swipeUser",
  async ({ swipedUserId, activityId, type }, { rejectWithValue }) => {
    try {
      const response = await createSwipe({ swipedUserId, activityId, type });
      return {
        ...response,
        swipedUserId,
        activityId,
        type,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchAlreadySwipedUsers = createAsyncThunk(
  "swipe/fetchAlreadySwipedUsers",
  async (activityId, { rejectWithValue, getState }) => {
    try {
      if (!activityId) {
        return rejectWithValue("No activity ID provided");
      }
      
      //checking if activity was deleted
      const state = getState();
      if (state.activity.deletedActivityIds.includes(activityId)) {
        return rejectWithValue("Activity has been deleted");
      }
      
      const response = await getAlreadySwipedUsers(activityId);
      return { activityId, swipedUserIds: response.data };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchMatches = createAsyncThunk(
  "swipe/fetchMatches",
  async (activityId, { rejectWithValue }) => {
    try {
      const response = await getMatchesForActivity(activityId);
      return { activityId, matches: response.data };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchMySwipeHistory = createAsyncThunk(
  "swipe/fetchMySwipeHistory",
  async (filters = {}, { rejectWithValue }) => {
    try {
      const response = await getMySwipes(filters);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const removeSwipe = createAsyncThunk(
  "swipe/removeSwipe",
  async (swipeId, { rejectWithValue }) => {
    try {
      await deleteSwipe(swipeId);
      return swipeId;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  currentActivityId: null,

  alreadySwipedUsers: {},

  matches: {},

  swipeHistory: [],

  isSwipeLoading: false,
  isMatchesLoading: false,
  isHistoryLoading: false,

  swipeError: null,
  matchesError: null,
  historyError: null,

  latestMatch: null,
  isMatch: false,
};

const swipeSlice = createSlice({
  name: "swipe",
  initialState,
  reducers: {
    setCurrentActivity: (state, action) => {
      state.currentActivityId = action.payload;
    },

    clearLatestMatch: (state) => {
      state.latestMatch = null;
      state.isMatch = false;
    },

    clearSwipeError: (state) => {
      state.swipeError = null;
    },

    clearMatchesError: (state) => {
      state.matchesError = null;
    },

    clearHistoryError: (state) => {
      state.historyError = null;
    },

    resetSwipeState: (state) => {
      return { ...initialState, currentActivityId: state.currentActivityId };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(swipeUser.pending, (state) => {
        state.isSwipeLoading = true;
        state.swipeError = null;
      })
      .addCase(swipeUser.fulfilled, (state, action) => {
        state.isSwipeLoading = false;
        const { swipedUserId, activityId, isMatch, match } = action.payload;

        if (!state.alreadySwipedUsers[activityId]) {
          state.alreadySwipedUsers[activityId] = [];
        }
        if (!state.alreadySwipedUsers[activityId].includes(swipedUserId)) {
          state.alreadySwipedUsers[activityId].push(swipedUserId);
        }

        if (isMatch && match) {
          state.isMatch = true;
          state.latestMatch = match;

          if (!state.matches[activityId]) {
            state.matches[activityId] = [];
          }

          const existingMatch = state.matches[activityId].find(
            (m) => m._id === match._id
          );
          if (!existingMatch) {
            state.matches[activityId].push(match);
          }
        }
      })
      .addCase(swipeUser.rejected, (state, action) => {
        state.isSwipeLoading = false;
        state.swipeError = action.payload;
      })

      .addCase(fetchAlreadySwipedUsers.fulfilled, (state, action) => {
        const { activityId, swipedUserIds } = action.payload;
        state.alreadySwipedUsers[activityId] = swipedUserIds;
      })

      .addCase(fetchMatches.pending, (state) => {
        state.isMatchesLoading = true;
        state.matchesError = null;
      })
      .addCase(fetchMatches.fulfilled, (state, action) => {
        state.isMatchesLoading = false;
        const { activityId, matches } = action.payload;
        state.matches[activityId] = matches;
      })
      .addCase(fetchMatches.rejected, (state, action) => {
        state.isMatchesLoading = false;
        state.matchesError = action.payload;
      })

      .addCase(fetchMySwipeHistory.pending, (state) => {
        state.isHistoryLoading = true;
        state.historyError = null;
      })
      .addCase(fetchMySwipeHistory.fulfilled, (state, action) => {
        state.isHistoryLoading = false;
        state.swipeHistory = action.payload;
      })
      .addCase(fetchMySwipeHistory.rejected, (state, action) => {
        state.isHistoryLoading = false;
        state.historyError = action.payload;
      })

      .addCase(removeSwipe.fulfilled, (state, action) => {
        const swipeId = action.payload;
        state.swipeHistory = state.swipeHistory.filter(
          (swipe) => swipe._id !== swipeId
        );
      });
  },
});

export const {
  setCurrentActivity,
  clearLatestMatch,
  clearSwipeError,
  clearMatchesError,
  clearHistoryError,
  resetSwipeState,
} = swipeSlice.actions;

export const selectCurrentActivityId = (state) => state.swipe.currentActivityId;
export const selectAlreadySwipedUsers = (state, activityId) =>
  state.swipe.alreadySwipedUsers[activityId] || [];
export const selectMatches = (state, activityId) =>
  state.swipe.matches[activityId] || [];
export const selectSwipeHistory = (state) => state.swipe.swipeHistory;
export const selectIsSwipeLoading = (state) => state.swipe.isSwipeLoading;
export const selectIsMatchesLoading = (state) => state.swipe.isMatchesLoading;
export const selectIsHistoryLoading = (state) => state.swipe.isHistoryLoading;
export const selectSwipeError = (state) => state.swipe.swipeError;
export const selectMatchesError = (state) => state.swipe.matchesError;
export const selectHistoryError = (state) => state.swipe.historyError;
export const selectLatestMatch = (state) => state.swipe.latestMatch;
export const selectIsMatch = (state) => state.swipe.isMatch;

export default swipeSlice.reducer;
