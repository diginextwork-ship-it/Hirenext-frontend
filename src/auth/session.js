const STORAGE_KEY = "hirenext_auth_session";

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
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
};

export const clearAuthSession = () => {
  window.localStorage.removeItem(STORAGE_KEY);
};

export const getAuthToken = () => getAuthSession()?.token || "";
