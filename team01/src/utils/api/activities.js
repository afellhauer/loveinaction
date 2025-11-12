import { request } from "./client";

export function createActivity({ activityType, location, dates, times }) {
  return request("/api/activities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ activityType, location, dates, times }),
  });
}

export function getMyActivities() {
  return request("/api/activities/my-activities");
}

export function getPotentialMatches(activityId) {
  return request(`/api/activities/${activityId}/matches`);
}

export function updateActivity(
  activityId,
  { activityType, location, dates, times, isActive }
) {
  return request(`/api/activities/${activityId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ activityType, location, dates, times, isActive }),
  });
}

export function deleteActivity(activityId) {
  return request(`/api/activities/${activityId}`, { method: "DELETE" });
}
