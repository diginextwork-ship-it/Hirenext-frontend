import {
  authFetch,
  buildAuthHeaders,
  readJsonResponse,
} from "../../auth/authFetch";
import { API_BASE_URL } from "../../config/api";

export { API_BASE_URL, readJsonResponse };

export const getAdminHeaders = buildAuthHeaders;

export const updateTeamLeaderNote = async (resId, verifiedReason) =>
  authFetch(
    `${API_BASE_URL}/api/admin/resumes/${encodeURIComponent(resId)}/verified-reason`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verified_reason: verifiedReason || null }),
    },
    "Failed to update team leader note.",
  );
