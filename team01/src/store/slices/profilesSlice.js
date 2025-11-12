import { createSlice } from '@reduxjs/toolkit';
import { profiles as profileData } from '../../data/profiles';

const initialState = {
  profileId: 0,
  currentUserId: null,
  profiles: profileData,
  currentProfileIndex: 0,
  swipedProfiles: [], // Array of {profileId, action: 'pass' | 'match'}
  matches: [], // Array of profile IDs that were matched
  isLoading: false,
  error: null
};

const profilesSlice = createSlice({
  name: 'profiles',
  initialState,
  reducers: {
    nextProfile: (state) => {
      if (state.currentProfileIndex < state.profiles.length - 1) {
        state.currentProfileIndex += 1;
      }
    },
    
    swipeProfile: (state, action) => {
      const { profileId, swipeAction } = action.payload;
      
      state.swipedProfiles.push({ profileId, action: swipeAction });
      
      if (swipeAction === 'match') {
        state.matches.push(profileId);
      }
      
      if (state.currentProfileIndex < state.profiles.length - 1) {
        state.currentProfileIndex += 1;
      }
    },
    
    resetSwipes: (state) => {
      state.currentProfileIndex = 0;
      state.swipedProfiles = [];
    },
    
    addProfiles: (state, action) => {
      state.profiles = [...state.profiles, ...action.payload];
    },
    
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    
    setError: (state, action) => {
      state.error = action.payload;
    },

    updateProfile: (state, action) => {
      const updatedProfile = { ...action.payload, id: 0 };
      const index = state.profiles.findIndex(p => p.id === 0);
      if (index !== -1) {
        state.profiles[index] = updatedProfile;
      }
    },
    hardCodeActivity: (state, action) => {
      const activity = action.payload.activity
      for (const p of state.profiles) {
        if (p.id !== 0) {
          p.activity = activity
        }
      }
    },
    hardCodeTime: (state, action) => {
      const time = action.payload.time
      for (const p of state.profiles) {
        if (p.id !== 0) {
          p.time = time
          p.timeOfDay = timesOfDay[getRandomNumber()]
        }
      }
    },
    setCurrentUser: (state, action) => {
      state.currentUserId = action.payload.userId;
    },
    clearCurrentUser: (state) => {
      state.currentUserId = null;
    }
  }
});

const timesOfDay = [
  "Morning",
  "Afternoon",
  "Night"
]

const getRandomNumber = () => {
  return Math.floor(Math.random() * 3);
}

export const {
  nextProfile,
  swipeProfile,
  resetSwipes,
  addProfiles,
  setLoading,
  setError,
  updateProfile,
  hardCodeActivity,
  hardCodeTime,
  setCurrentUser,
  clearCurrentUser
} = profilesSlice.actions;

export const selectCurrentProfile = (state) => {
  const { profiles, currentProfileIndex } = state.profiles;
  return profiles[currentProfileIndex] || null;
};

export const currentProfileIndex = (state) => state.profiles.currentProfileIndex
export const selectAllProfiles = (state) => state.profiles.profiles;
export const currentUserProfile = (state) => state.profiles.currentUserId;
export const selectMatches = (state) => state.profiles.matches;
export const selectSwipedProfiles = (state) => state.profiles.swipedProfiles;
export const selectIsLoading = (state) => state.profiles.isLoading;
export const selectError = (state) => state.profiles.error;
export const selectHasMoreProfiles = (state) => {
  const { profiles, currentProfileIndex } = state.profiles;
  return currentProfileIndex < profiles.length - 1;
};

export default profilesSlice.reducer; 