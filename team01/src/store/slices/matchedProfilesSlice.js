import { createSlice } from '@reduxjs/toolkit';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { fetchProfileByUserId } from '../../utils/api/profile'; // Adjust the import
// This slice manages profiles matched with users, indexed by user ID

export const fetchProfilesByUserIds = createAsyncThunk(
    'profiles/fetchByUserIds',
    async (userIds, { rejectWithValue }) => {
        if (!Array.isArray(userIds) || userIds.length === 0) {
            console.error("fetchProfilesByUserIds: userIds is not a valid array", userIds);
            return rejectWithValue("No user IDs provided");
        }

        const results = await Promise.all(
            userIds.map(async (userId) => {
                if (!userId) {
                    console.error("fetchProfilesByUserIds: Invalid userId", userId);
                    return null;
                }
                try {
                    const profile = await fetchProfileByUserId(userId);
                    if (!profile) {
                        console.error(`fetchProfilesByUserIds: No profile found for userId ${userId}`);
                        return null;
                    }
                    return { userId, profile };
                } catch (err) {
                    console.error(`fetchProfilesByUserIds: Error fetching profile for userId ${userId}`, err);
                    return null;
                }
            })
        );

        const profilesMap = {};
        results.forEach(item => {
            if (item && item.userId && item.profile) {
                profilesMap[item.userId] = item.profile;
            }
        });

        if (Object.keys(profilesMap).length === 0) {
            return rejectWithValue("No profiles fetched");
        }
        console.log("fetchProfilesByUserIds: Fetched profiles", profilesMap);

        return profilesMap;
    }
);

const initialState = {
  profilesByUserId: {}, // { [userId]: profileObj }
  isLoading: false,
  error: null,
};

const matchedProfilesSlice = createSlice({
  name: 'profiles',
  initialState,
  reducers: {
    setProfiles: (state, action) => {
        state.profilesByUserId = {};
        action.payload.forEach(profile => {
            state.profilesByUserId[profile.user] = profile; 
        });
    },
    addOrUpdateProfile: (state, action) => {
        const profile = action.payload;
        state.profilesByUserId[profile.user] = profile;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchProfilesByUserIds.fulfilled, (state, action) => {
        // Merge the new profiles into the state map
        state.profilesByUserId = {
        ...state.profilesByUserId,
        ...action.payload,
        };
        state.isLoading = false;
        state.error = null;
        console.log("fetchProfilesByUserIds: Profiles fetched successfully", action.payload);
    });
    builder.addCase(fetchProfilesByUserIds.pending, (state) => {
        state.isLoading = true;
        state.error = null;
    });
    builder.addCase(fetchProfilesByUserIds.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message;
    });
}
  });

export const { setProfiles, addOrUpdateProfile } = matchedProfilesSlice.actions;

export const selectProfileByUserId = (state, userId) =>
  state.profiles.profilesByUserId[userId] || null;

export const selectProfilesByUserIds = (state, userIds) =>
  userIds.map(id => state.profiles.profilesByUserId[id]).filter(Boolean);

export default matchedProfilesSlice.reducer;