// src/store/slices/verificationSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  submitVerification as apiSubmitVerification,
  getVerificationStatus as apiGetVerificationStatus,
} from "../../utils/api/verification";

// Thunk to submit verification
export const submitVerification = createAsyncThunk(
  "verification/submit",
  async (formData, { rejectWithValue }) => {
    try {
      const result = await apiSubmitVerification(formData);
      return result;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// Thunk to check verification status
export const checkVerificationStatus = createAsyncThunk(
  "verification/checkStatus",
  async (_, { rejectWithValue }) => {
    try {
      const status = await apiGetVerificationStatus();
      return status;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const initialState = {
  isVerified: false,
  status: "not_submitted", // 'not_submitted', 'pending', 'approved', 'rejected'
  score: 0,
  reasons: [],
  verifiedAt: null,
  isSubmitting: false,
  isLoading: false,
  error: null,
  lastSubmissionResult: null,
};

const verificationSlice = createSlice({
  name: "verification",
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
    clearLastSubmissionResult(state) {
      state.lastSubmissionResult = null;
    },
    resetVerificationState() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      // Submit verification
      .addCase(submitVerification.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(submitVerification.fulfilled, (state, { payload }) => {
        state.isSubmitting = false;
        state.lastSubmissionResult = payload;
        state.isVerified = payload.verified;
        state.status = payload.verified ? "approved" : "rejected";
        state.score = payload.score;
        state.reasons = payload.reasons || [];
      })
      .addCase(submitVerification.rejected, (state, { payload }) => {
        state.isSubmitting = false;
        state.error = payload;
      })

      // Check status
      .addCase(checkVerificationStatus.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(checkVerificationStatus.fulfilled, (state, { payload }) => {
        state.isLoading = false;
        state.isVerified = payload.isVerified;
        state.status = payload.status;
        state.score = payload.score;
        state.reasons = payload.reasons || [];
        state.verifiedAt = payload.verifiedAt;
      })
      .addCase(checkVerificationStatus.rejected, (state, { payload }) => {
        state.isLoading = false;
        state.error = payload;
      });
  },
});

export const { clearError, clearLastSubmissionResult, resetVerificationState } =
  verificationSlice.actions;

// Selectors
export const selectIsVerified = (state) => state.verification.isVerified;
export const selectVerificationStatus = (state) => state.verification.status;
export const selectVerificationScore = (state) => state.verification.score;
export const selectVerificationReasons = (state) => state.verification.reasons;
export const selectIsSubmitting = (state) => state.verification.isSubmitting;
export const selectIsLoading = (state) => state.verification.isLoading;
export const selectVerificationError = (state) => state.verification.error;
export const selectLastSubmissionResult = (state) =>
  state.verification.lastSubmissionResult;
export const selectVerifiedAt = (state) => state.verification.verifiedAt;

export default verificationSlice.reducer;
