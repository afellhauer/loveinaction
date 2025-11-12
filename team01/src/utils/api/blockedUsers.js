import { request } from "./client";

export const getBlockedUsers = async () => {
  const response = await request("/api/blocked-users");
  return response.data;
};

export const blockUser = async (userId, reason = "other") => {
  const response = await request("/api/blocked-users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, reason }),
  });
  return response.data;
};

export const unblockUser = async (userId) => {
  const response = await request(`/api/blocked-users/${userId}`, {
    method: "DELETE",
  });
  return response.data;
};

export const checkBlockStatus = async (userId) => {
  const response = await request(`/api/blocked-users/check/${userId}`);
  return response.data;
};

export const getBlockedCount = async (userId) => {
  const response = await request(`/api/blocked-users/count/${userId}`);
  return response.data;
};
