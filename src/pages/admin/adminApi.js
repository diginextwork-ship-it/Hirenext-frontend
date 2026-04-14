import {
  authFetch,
  authFetchMultipart,
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

export const adminAdvanceStatus = async (resId, payload) =>
  payload instanceof FormData
    ? authFetchMultipart(
        `${API_BASE_URL}/api/admin/resumes/${encodeURIComponent(resId)}/advance-status`,
        payload,
        "Failed to advance resume status.",
      )
    : authFetch(
        `${API_BASE_URL}/api/admin/resumes/${encodeURIComponent(resId)}/advance-status`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
        "Failed to advance resume status.",
      );

export const adminRollbackStatus = async (resId) =>
  authFetch(
    `${API_BASE_URL}/api/admin/resumes/${encodeURIComponent(resId)}/rollback-status`,
    { method: "POST" },
    "Failed to rollback resume status.",
  );

export const adminDeleteRecruiter = async (rid) =>
  authFetch(
    `${API_BASE_URL}/api/admin/recruiters/${encodeURIComponent(rid)}`,
    { method: "DELETE" },
    "Failed to delete recruiter.",
  );

export const adminUpdateRecruiterAccountStatus = async (rid, status) =>
  authFetch(
    `${API_BASE_URL}/api/admin/recruiters/${encodeURIComponent(rid)}/account-status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    },
    "Failed to update recruiter account status.",
  );

export const adminDeleteCandidate = async (resId) =>
  authFetch(
    `${API_BASE_URL}/api/admin/candidates/${encodeURIComponent(resId)}`,
    { method: "DELETE" },
    "Failed to delete candidate.",
  );

export const fetchAdminSalaryHistoryDetail = async (rid) =>
  authFetch(
    `${API_BASE_URL}/api/admin/recruiters/${encodeURIComponent(rid)}/salary-history`,
    {},
    "Failed to fetch salary history detail.",
  );

export const updateAdminSalaryHistory = async (rid, payload) =>
  authFetch(
    `${API_BASE_URL}/api/admin/recruiters/${encodeURIComponent(rid)}/salary-history`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    "Failed to update salary history.",
  );


