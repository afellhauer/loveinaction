import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  createActivity,
  getMyActivities,
  getPotentialMatches,
  updateActivity,
  deleteActivity,
} from "../../utils/api";

export const fetchMyActivities = createAsyncThunk(
  "activity/fetchMyActivities",
  async (_, { rejectWithValue }) => {
    try {
      const response = await getMyActivities();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchPotentialMatches = createAsyncThunk(
  "activity/fetchPotentialMatches",
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
      
      const response = await getPotentialMatches(activityId);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const createNewActivity = createAsyncThunk(
  "activity/createNewActivity",
  async (activityData, { rejectWithValue }) => {
    try {
      const response = await createActivity(activityData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateExistingActivity = createAsyncThunk(
  "activity/updateExistingActivity",
  async ({ activityId, ...updateData }, { rejectWithValue }) => {
    try {
      const response = await updateActivity(activityId, updateData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const removeActivity = createAsyncThunk(
  "activity/removeActivity",
  async (activityId, { rejectWithValue }) => {
    try {
      await deleteActivity(activityId);
      return activityId;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  myActivities: [],

  potentialMatches: [],

  currentActivity: null,

  currentProfileIndex: 0,

  deletedActivityIds: [],

  isActivitiesLoading: false,
  isMatchesLoading: false,
  isCreateLoading: false,
  isUpdateLoading: false,

  activitiesError: null,
  matchesError: null,
  createError: null,
  updateError: null,
};

const activitySlice = createSlice({
  name: "activity",
  initialState,
  reducers: {
    setCurrentActivity: (state, action) => {
      state.currentActivity = action.payload;
      state.currentProfileIndex = 0; // Reset profile index when activity changes
    },

    nextProfile: (state) => {
      if (state.currentProfileIndex < state.potentialMatches.length - 1) {
        state.currentProfileIndex += 1;
      }
    },

    resetProfileIndex: (state) => {
      state.currentProfileIndex = 0;
    },

    clearActivitiesError: (state) => {
      state.activitiesError = null;
    },

    clearMatchesError: (state) => {
      state.matchesError = null;
    },

    clearCreateError: (state) => {
      state.createError = null;
    },

    clearUpdateError: (state) => {
      state.updateError = null;
    },

    //clear activity-related data when the activity is deleted
    clearActivityData: (state, action) => {
      const activityId = action.payload;
      
      if (!state.deletedActivityIds.includes(activityId)) {
        state.deletedActivityIds.push(activityId);
      }
      
      if (state.currentActivity?._id === activityId) { //clear matches for this activity
        state.potentialMatches = []; 
        state.currentProfileIndex = 0;
        state.currentActivity = null;
      }
  
      //remove from 'my activities'
      state.myActivities = state.myActivities.filter(
        activity => activity._id !== activityId
      );
    },

    // Filter out already swiped users from potential matches
    filterSwipedUsers: (state, action) => {
      const swipedUserIds = action.payload;
      state.potentialMatches = state.potentialMatches.filter(
        (match) => !swipedUserIds.includes(match.userId._id.toString())
      );

      // Reset index if current profile was filtered out
      if (state.currentProfileIndex >= state.potentialMatches.length) {
        state.currentProfileIndex = 0;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyActivities.pending, (state) => {
        state.isActivitiesLoading = true;
        state.activitiesError = null;
      })
      .addCase(fetchMyActivities.fulfilled, (state, action) => {
        state.isActivitiesLoading = false;
        state.myActivities = action.payload;

        if (!state.currentActivity && action.payload.length > 0) {
          const firstActiveActivity = action.payload.find((a) => a.isActive);
          if (firstActiveActivity) {
            state.currentActivity = firstActiveActivity;
          }
        }
      })
      .addCase(fetchMyActivities.rejected, (state, action) => {
        state.isActivitiesLoading = false;
        state.activitiesError = action.payload;
      })

      .addCase(fetchPotentialMatches.pending, (state) => {
        state.isMatchesLoading = true;
        state.matchesError = null;
      })
      .addCase(fetchPotentialMatches.fulfilled, (state, action) => {
        state.isMatchesLoading = false;
        state.potentialMatches = action.payload;
        state.currentProfileIndex = 0; // Reset index when new matches loaded
      })
      .addCase(fetchPotentialMatches.rejected, (state, action) => {
        state.isMatchesLoading = false;
        state.matchesError = action.payload;
      })

      .addCase(createNewActivity.pending, (state) => {
        state.isCreateLoading = true;
        state.createError = null;
      })
      .addCase(createNewActivity.fulfilled, (state, action) => {
        state.isCreateLoading = false;
        state.myActivities.unshift(action.payload);

        if (!state.currentActivity) {
          state.currentActivity = action.payload;
        }
      })
      .addCase(createNewActivity.rejected, (state, action) => {
        state.isCreateLoading = false;
        state.createError = action.payload;
      })

      .addCase(updateExistingActivity.pending, (state) => {
        state.isUpdateLoading = true;
        state.updateError = null;
      })
      .addCase(updateExistingActivity.fulfilled, (state, action) => {
        state.isUpdateLoading = false;
        const updatedActivity = action.payload;
        const index = state.myActivities.findIndex(
          (a) => a._id === updatedActivity._id
        );

        if (index !== -1) {
          state.myActivities[index] = updatedActivity;
        }

        if (
          state.currentActivity &&
          state.currentActivity._id === updatedActivity._id
        ) {
          state.currentActivity = updatedActivity;
        }
      })
      .addCase(updateExistingActivity.rejected, (state, action) => {
        state.isUpdateLoading = false;
        state.updateError = action.payload;
      })

      .addCase(removeActivity.fulfilled, (state, action) => {
        const activityId = action.payload;
        state.myActivities = state.myActivities.filter(
          (a) => a._id !== activityId
        );

        if (state.currentActivity && state.currentActivity._id === activityId) {
          state.currentActivity =
            state.myActivities.length > 0 ? state.myActivities[0] : null;
          state.currentProfileIndex = 0;
        }
      });
  },
});

export const {
  setCurrentActivity,
  nextProfile,
  resetProfileIndex,
  clearActivitiesError,
  clearMatchesError,
  clearCreateError,
  clearUpdateError,
  clearActivityData,
  filterSwipedUsers,
} = activitySlice.actions;

export const selectMyActivities = (state) => state.activity.myActivities;
export const selectPotentialMatches = (state) =>
  state.activity.potentialMatches;
export const selectCurrentActivity = (state) => state.activity.currentActivity;
export const selectCurrentProfileIndex = (state) =>
  state.activity.currentProfileIndex;
export const selectCurrentProfile = (state) => {
  const { potentialMatches, currentProfileIndex } = state.activity;
  return potentialMatches[currentProfileIndex] || null;
};
export const selectIsActivitiesLoading = (state) =>
  state.activity.isActivitiesLoading;
export const selectIsMatchesLoading = (state) =>
  state.activity.isMatchesLoading;
export const selectIsCreateLoading = (state) => state.activity.isCreateLoading;
export const selectIsUpdateLoading = (state) => state.activity.isUpdateLoading;
export const selectActivitiesError = (state) => state.activity.activitiesError;
export const selectMatchesError = (state) => state.activity.matchesError;
export const selectCreateError = (state) => state.activity.createError;
export const selectUpdateError = (state) => state.activity.updateError;
export const selectHasMoreProfiles = (state) => {
  const { potentialMatches, currentProfileIndex } = state.activity;
  return currentProfileIndex < potentialMatches.length - 1;
};

export default activitySlice.reducer;
