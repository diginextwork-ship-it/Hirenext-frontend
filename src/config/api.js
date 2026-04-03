const FALLBACK_API_BASE_URL = "http://localhost:5000";

const normalizeApiBaseUrl = (rawBaseUrl) => {
  const trimmed = String(rawBaseUrl || "").trim();
  const candidate = trimmed || FALLBACK_API_BASE_URL;
  const withProtocol = /^https?:\/\//i.test(candidate)
    ? candidate
    : `https://${candidate}`;

  const parsed = new URL(withProtocol);
  const pathname = parsed.pathname.replace(/\/+$/, "");
  const normalizedPath = pathname.endsWith("/api")
    ? pathname.slice(0, -4)
    : pathname;

  parsed.pathname = normalizedPath || "/";
  return parsed.toString().replace(/\/+$/, "");
};

const resolveApiBaseUrl = () => {
  // When the frontend is running locally via Vite dev, always talk to the
  // locally running backend so local actions never hit production APIs.
  if (import.meta.env.DEV) {
    return FALLBACK_API_BASE_URL;
  }

  return import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
};

export const API_BASE_URL = normalizeApiBaseUrl(resolveApiBaseUrl());

export const BACKEND_CONNECTION_ERROR =
  "Cannot connect to backend. Check your local backend in development or your deployed backend URL in production.";

export const buildApiUrl = (endpointPath) => {
  const normalizedEndpointPath = endpointPath.startsWith("/")
    ? endpointPath
    : `/${endpointPath}`;
  const baseUrl = new URL(API_BASE_URL);
  const basePath = (baseUrl.pathname || "").replace(/\/+$/, "");
  const endpointPathWithoutDuplicateApi =
    basePath.endsWith("/api") && normalizedEndpointPath.startsWith("/api/")
      ? normalizedEndpointPath.slice(4)
      : normalizedEndpointPath;

  baseUrl.pathname = `${basePath}${endpointPathWithoutDuplicateApi}`.replace(
    /\/{2,}/g,
    "/"
  );

  return baseUrl.toString();
};
