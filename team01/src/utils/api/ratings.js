import { request } from "./client";

export async function submitRating(ratingData) {
  return request("/api/ratings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ratingData),
  });
}