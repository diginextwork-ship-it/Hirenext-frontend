const STORAGE_KEY = "hirenext_auth_session";
const DEFAULT_SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const decodeJwtPayload = (token) => {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
};

export const getAuthSession = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.token || !parsed.role) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const saveAuthSession = (session) => {
  if (!session || !session.token || !session.role) return;

  let expiresAt = session.expiresAt;
  if (!expiresAt) {
    const payload = decodeJwtPayload(session.token);
    if (payload?.exp) {
      expiresAt = payload.exp * 1000; // JWT exp is in seconds
    } else {
      expiresAt = Date.now() + DEFAULT_SESSION_TTL_MS;
    }
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...session, expiresAt }),
  );
};

export const clearAuthSession = () => {
  window.localStorage.removeItem(STORAGE_KEY);
};

export const getAuthToken = () => getAuthSession()?.token || "";

export const isSessionExpired = () => {
  const session = getAuthSession();
  if (!session) return true;
  if (!session.expiresAt) return false;
  return Date.now() >= session.expiresAt;
};

export const SESSION_EXPIRED_EVENT = "hirenext:session-expired";

export const broadcastSessionExpired = () => {
  clearAuthSession();
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
};
