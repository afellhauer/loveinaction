import { persistor } from "../../store/store";
import { deobfuscateResponse } from "../deobfuscation"; // Add this import

const BASE_URL = "http://localhost:3001";

/**
 * Returns `{ Authorization: 'Bearer …' }` if an accessToken exists.
 */
export function getAuthHeader() {
  const token = localStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) return null;

  let res = await fetch(`${BASE_URL}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: refreshToken }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  if (data.accessToken) {
    localStorage.setItem("accessToken", data.accessToken);
    return data.accessToken;
  }
  return null;
}

/**
 * Wrapper around fetch that
 *  • prefixes BASE_URL
 *  • merges in auth headers
 *  • parses JSON and throws on non-OK responses
 *  • deobfuscates responses when needed
 */
export async function request(
  path,
  { method = "GET", headers = {}, body = null } = {}
) {
  const opts = {
    method,
    headers: {
      ...getAuthHeader(),
      ...headers,
    },
  };
  if (body != null) opts.body = body;

  let res = await fetch(`${BASE_URL}${path}`, opts);

  // Parse JSON response
  let data;
  try {
    data = await res.json();
  } catch (error) {
    data = {};
  }

  // ADD THIS: Deobfuscate the response data
  data = deobfuscateResponse(data);

  {
    /* Handle 401 Unauthorized */
  }
  if (res.status === 401) {
    const newAccessToken = await refreshAccessToken();
    if (newAccessToken) {
      // Retry original request with new token
      opts.headers.Authorization = `Bearer ${newAccessToken}`;
      res = await fetch(`${BASE_URL}${path}`, opts);

      // Parse and deobfuscate the retry response too
      try {
        data = await res.json();
        data = deobfuscateResponse(data); // Add this line
      } catch (error) {
        data = {};
      }
    }
    if (res.status === 401) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      persistor.purge().then(() => {
        window.location.href =
          "/login?message=Logged%20out%20due%20to%20session%20expiry";
      });
    }
  }

  if (!res.ok) {
    throw new Error(data.error || data.message || "API request failed");
  }

  return data;
}
