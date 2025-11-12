// src/utils/api/verification.js
import { request } from "./client";

export function submitVerification(formData) {
  return request("/api/verify/auto-submit", {
    method: "POST",
    body: formData,
  });
}

export function getVerificationStatus() {
  return request("/api/verify/status");
}
