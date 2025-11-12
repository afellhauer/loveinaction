import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import * as blockedUsersAPI from "../../utils/api/blockedUsers";

export const fetchBlockedUsers = createAsyncThunk(
  "blockedUsers/fetchBlockedUsers",
  async (_, { rejectWithValue }) => {
    try {
      const response = await blockedUsersAPI.getBlockedUsers();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const blockUserAsync = createAsyncThunk(
  "blockedUsers/blockUser",
  async ({ userId, reason }, { rejectWithValue }) => {
    try {
      const response = await blockedUsersAPI.blockUser(userId, reason);
      return response.data;
    } catch (error) {
      console.error("Error blocking user:", error);
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const unblockUserAsync = createAsyncThunk(
  "blockedUsers/unblockUser",
  async (userId, { rejectWithValue }) => {
    try {
      await blockedUsersAPI.unblockUser(userId);
      return userId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const checkBlockStatusAsync = createAsyncThunk(
  "blockedUsers/checkBlockStatus",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await blockedUsersAPI.checkBlockStatus(userId);
      return { userId, ...response };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const getBlockedCountAsync = createAsyncThunk(
  "blockedUsers/getBlockedCount",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await blockedUsersAPI.getBlockedCount(userId);
      return { userId, ...response };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

const blockedUsersSlice = createSlice({
  name: "blockedUsers",
  initialState: {
    blockedUsers: [],
    blockStatus: {}, 
    blockedCounts: {}, 
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBlockedUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBlockedUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.blockedUsers = action.payload;
      })
      .addCase(fetchBlockedUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(blockUserAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(blockUserAsync.fulfilled, (state, action) => {
        state.loading = false;
      })
      .addCase(blockUserAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(checkBlockStatusAsync.fulfilled, (state, action) => {
        const { userId, isBlocked, blockRecord } = action.payload;
        state.blockStatus[userId] = { isBlocked, blockRecord };
      })
      .addCase(getBlockedCountAsync.fulfilled, (state, action) => {
        const { userId, data } = action.payload;
        state.blockedCounts[userId] = {
          blockedCount: data.blockedCount,
          penalty: data.penalty,
        };
      });
  },
});

export const selectBlockedUsers = (state) => state.blockedUsers.blockedUsers;
export const selectBlockedUsersLoading = (state) => state.blockedUsers.loading;
export const selectBlockedUsersError = (state) => state.blockedUsers.error;
export const selectBlockStatus = (userId) => (state) => 
  state.blockedUsers.blockStatus[userId];
export const selectBlockedCount = (userId) => (state) => 
  state.blockedUsers.blockedCounts[userId];

export const { clearError } = blockedUsersSlice.actions;
export default blockedUsersSlice.reducer;
