import { loadMatches } from "../slices/matchSlice.js";
import { fetchProfilesByUserIds } from "../slices/matchedProfilesSlice.js";

export const loadMatchesWithProfiles = () => async (dispatch) => {
    const result = await dispatch(loadMatches());
    console.log("Load Matches Result:", result);

    if (loadMatches.fulfilled.match(result)) {
        const matches = result.payload?.data;
        if (!Array.isArray(matches)) {
            console.error("Matches is not an array:", matches);
            return;
        }
        const otherUserIds = matches
            .map(match =>
                typeof match.otherUser === "object"
                    ? match.otherUser._id || match.otherUser.id
                    : match.otherUser
            )
            .filter(id => !!id);

        if (otherUserIds.length === 0) {
            console.error("No valid user IDs found in matches:", matches);
            return;
        }

        try {
            await dispatch(fetchProfilesByUserIds(otherUserIds));
        } catch (error) {
            console.error("Error fetching profiles by user IDs:", error);
        }

    } else {
        console.error("Failed to load matches:", result.error);
    }
};