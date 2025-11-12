import { request } from "./client";

export function login({ email, password }) {
  return request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

export function signup({ firstName, lastName, email, password, dateOfBirth }) {
  return request("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ firstName, lastName, email, password, dateOfBirth }),
  });
}

export function deactivateAccount({reason, password}) {
  return request("/api/auth/deactivate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason, password }),
  });
}

export function reactivateAccount({email, password}) {
  return request("/api/auth/reactivate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}
