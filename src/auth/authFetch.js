import {
  getAuthToken,
  isSessionExpired,
  saveAuthSession,
  getAuthSession,
  broadcastSessionExpired,
} from "./session";
import { API_BASE_URL } from "../config/api";

const readJsonBody = async (response) => {
  const raw = await response.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Server returned non-JSON response (${response.status}).`);
  }
};

export const buildAuthHeaders = (extraHeaders = {}) => {
  const token = getAuthToken();
  return token
    ? { Authorization: `Bearer ${token}`, ...extraHeaders }
    : extraHeaders;
};

// Deduplicate concurrent refresh calls
let refreshPromise = null;

const attemptTokenRefresh = async () => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: "POST",
        headers: buildAuthHeaders({ "Content-Type": "application/json" }),
      });
      if (!response.ok) return false;

      const data = await readJsonBody(response);
      if (data.token) {
        const current = getAuthSession() || {};
        saveAuthSession({
          ...current,
          token: data.token,
          expiresAt: undefined, // saveAuthSession will re-derive from new JWT
        });
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

const handleUnauthorized = async () => {
  const refreshed = await attemptTokenRefresh();
  if (!refreshed) {
    broadcastSessionExpired();
    throw new Error("Session expired. Please log in again.");
  }
};

/**
 * Authenticated JSON fetch with automatic expiration check, 401 retry, and refresh.
 */
export const authFetch = async (
  url,
  options = {},
  fallbackMessage = "Request failed.",
) => {
  // Pre-flight expiration check
  if (isSessionExpired()) {
    await handleUnauthorized();
  }

  const response = await fetch(url, {
    ...options,
    cache: options.cache || "no-store",
    headers: buildAuthHeaders(options.headers || {}),
  });

  if (response.status === 401) {
    await handleUnauthorized();

    // Retry with fresh token
    const retryResponse = await fetch(url, {
      ...options,
      cache: options.cache || "no-store",
      headers: buildAuthHeaders(options.headers || {}),
    });
    const retryData = await readJsonBody(retryResponse);
    if (!retryResponse.ok) {
      if (retryResponse.status === 401) {
        broadcastSessionExpired();
        throw new Error("Session expired. Please log in again.");
      }
      throw new Error(
        retryData?.error || retryData?.message || fallbackMessage,
      );
    }
    return retryData;
  }

  const data = await readJsonBody(response);
  if (!response.ok) {
    throw new Error(data?.error || data?.message || fallbackMessage);
  }
  return data;
};

/**
 * Authenticated FormData fetch (for file uploads) with the same expiration/401 handling.
 */
export const authFetchMultipart = async (
  url,
  formData,
  fallbackMessage = "Request failed.",
) => {
  if (isSessionExpired()) {
    await handleUnauthorized();
  }

  const token = getAuthToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const response = await fetch(url, {
    method: "POST",
    cache: "no-store",
    headers,
    body: formData,
  });

  if (response.status === 401) {
    await handleUnauthorized();
    const newToken = getAuthToken();
    const retryHeaders = newToken
      ? { Authorization: `Bearer ${newToken}` }
      : {};
    const retryResponse = await fetch(url, {
      method: "POST",
      cache: "no-store",
      headers: retryHeaders,
      body: formData,
    });
    const retryData = await readJsonBody(retryResponse);
    if (!retryResponse.ok) {
      if (retryResponse.status === 401) {
        broadcastSessionExpired();
        throw new Error("Session expired. Please log in again.");
      }
      throw new Error(
        retryData?.error || retryData?.message || fallbackMessage,
      );
    }
    return retryData;
  }

  const data = await readJsonBody(response);
  if (!response.ok) {
    throw new Error(data?.error || data?.message || fallbackMessage);
  }
  return data;
};

// Backward-compatible re-exports used by adminApi.js and RecruiterLogin.jsx
export const getAuthHeaders = buildAuthHeaders;

export const readJsonResponse = async (response, fallbackMessage) => {
  const raw = await response.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(
      `Server returned non-JSON response (${response.status})${response.url ? ` for ${response.url}` : ""}. ${fallbackMessage || ""}`,
    );
  }
};
