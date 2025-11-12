import { request } from "./client";

export function fetchMatches(statuses = "active,confirmed,date_passed") {
  return request(`/api/matches?status=${statuses}`);
}

export function getMatch(matchId) {
  return request(`/api/matches/${matchId}`);
}

export async function findMatchWithUser(userId) {
  try {
    const response = await fetchMatches();
    const matches = response.data || [];

    const match = matches.find(
      (match) => match.otherUser._id.toString() === userId.toString()
    );

    return match || null;
  } catch (error) {
    console.error("Error finding match with user:", error);
    return null;
  }
}

export function confirmPlans(matchId) {
  return request(`/api/matches/${matchId}/confirm-plans`, {
    method: "POST"
  });
}

export function finalizeDate(matchId) {
  return request(`/api/matches/${matchId}/finalize-date`, {
    method: "POST"
  });
}
