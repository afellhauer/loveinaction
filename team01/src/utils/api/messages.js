import { request } from "./client";

export async function sendMessage(matchId, content, messageType = "text") {
  return request("/api/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ matchId, content, messageType }),
  });
}

export async function getMessages(matchId, page = 1, limit = 50, before = null) {
  const params = new URLSearchParams({ page, limit });
  if (before) params.append("before", before);
  
  return request(`/api/messages/match/${matchId}?${params}`);
}

export async function markMessagesRead(matchId) {
  return request(`/api/messages/mark-read/${matchId}`, {
    method: "POST",
  });
} 