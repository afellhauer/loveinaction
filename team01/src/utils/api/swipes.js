import { request } from "./client";

export function createSwipe({ swipedUserId, activityId, type }) {
  return request("/api/swipes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ swipedUserId, activityId, type }),
  });
}

export function getAlreadySwipedUsers(activityId) {
  return request(`/api/swipes/activity/${activityId}/already-swiped`);
}

export function getMatchesForActivity(activityId) {
  return request(`/api/swipes/matches/${activityId}`);
}

export function getMySwipes({ activityId, type } = {}) {
  const params = new URLSearchParams();
  if (activityId) params.append("activityId", activityId);
  if (type) params.append("type", type);

  const qs = params.toString() ? `?${params.toString()}` : "";
  return request(`/api/swipes/my-swipes${qs}`);
}

export function deleteSwipe(swipeId) {
  return request(`/api/swipes/${swipeId}`, { method: "DELETE" });
}
