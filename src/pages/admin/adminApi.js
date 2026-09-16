import {
  authFetch,
  authFetchMultipart,
  buildAuthHeaders,
  readJsonResponse,
} from "../../auth/authFetch";
import { API_BASE_URL } from "../../config/api";

export { API_BASE_URL, readJsonResponse };

import { getAuthSession } from "../../auth/session";

export const getAdminHeaders = buildAuthHeaders;

export const fetchAdminSubmittedResumes = async (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      query.append(key, String(value).trim());
    }
  });
  const queryString = query.toString();
  return authFetch(
    `${API_BASE_URL}/api/admin/all-submitted-resumes${queryString ? `?${queryString}` : ""}`,
    {},
    "Failed to fetch all submitted resumes.",
  );
};

export const exportAdminSubmittedResumes = async (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      query.append(key, String(value).trim());
    }
  });
  const token = getAuthSession()?.token;
  if (token) {
    query.append("token", token);
  }
  const queryString = query.toString();
  const url = `${API_BASE_URL}/api/admin/all-submitted-resumes/export${queryString ? `?${queryString}` : ""}`;

  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    let errorMsg = "Failed to export Excel file.";
    try {
      const errJson = await response.json();
      if (errJson?.message) errorMsg = errJson.message;
    } catch {}
    throw new Error(errorMsg);
  }
  const blob = await response.blob();
  const fileDate = new Date().toISOString().slice(0, 10);
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = `all-submitted-resumes-${fileDate}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);
  return true;
};

export const fetchAdminCandidateResumes = async () =>
  authFetch(
    `${API_BASE_URL}/api/admin/candidate-resumes`,
    {},
    "Failed to fetch candidate submitted resumes.",
  );

export const fetchAdminDashboard = async () =>
  authFetch(
    `${API_BASE_URL}/api/admin/dashboard`,
    {},
    "Failed to fetch recruiter resume uploads.",
  );

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

export const adminDeleteResume = async (resId) =>
  authFetch(
    `${API_BASE_URL}/api/admin/resumes/${encodeURIComponent(resId)}`,
    { method: "DELETE" },
    "Failed to delete resume.",
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


