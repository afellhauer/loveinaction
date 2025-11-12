import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { submitRating } from '../../utils/api/ratings';

export const submitRatingThunk = createAsyncThunk(
  'ratings/submitRating',
  async (ratingData, { rejectWithValue }) => {
    try {
      return await submitRating(ratingData);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const ratingSlice = createSlice({
  name: 'ratings',
  initialState: {
    ratings: [],
    loading: false,
    error: null,
    success: false,
  },
  reducers: {
    resetRatingStatus: (state) => {
    state.success = false;
    state.error = null;
  }
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitRatingThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(submitRatingThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.ratings.push(action.payload);
      })
      .addCase(submitRatingThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      });
      
  },
});
export const { resetRatingStatus } = ratingSlice.actions;
export default ratingSlice.reducer;