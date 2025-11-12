import { request } from "./client";

export function fetchMeAndProfile() {
  return request("/api/profile/me");
}

/**
 * formData should already include all fields (including `profilePic` file).
 */
export function saveProfile(formData) {
  return request("/api/profile", {
    method: "POST",
    body: formData, // browser will set Content-Type: multipart/form-data
  });
}

export function fetchProfileByUserId(userId) {
  return request(`/api/profile/${userId}`);
}
