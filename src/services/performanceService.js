import { authFetch } from "../auth/authFetch";
import { API_BASE_URL } from "../config/api";

export const fetchRecruiterStatus = (rid) =>
  authFetch(
    `${API_BASE_URL}/api/status/recruiter/${encodeURIComponent(rid)}`,
    {},
    "Failed to fetch recruiter stats.",
  );

export const fetchAllRecruiterStatuses = ({
  sortBy = "submitted",
  sortOrder = "desc",
  search = "",
} = {}) => {
  const params = new URLSearchParams();
  params.set("sortBy", sortBy);
  params.set("sortOrder", sortOrder);
  if (String(search || "").trim()) params.set("search", String(search).trim());
  return authFetch(
    `${API_BASE_URL}/api/status/all?${params.toString()}`,
    {},
    "Failed to fetch all recruiter stats.",
  );
};

export const fetchTeamLeaderDashboard = () =>
  authFetch(
    `${API_BASE_URL}/api/dashboard/team-leader`,
    {},
    "Failed to fetch team leader dashboard.",
  );

export const fetchRecruiterDashboard = (
  rid,
  { startDate = "", endDate = "" } = {},
) => {
  const params = new URLSearchParams();
  if (String(startDate || "").trim())
    params.set("startDate", String(startDate).trim());
  if (String(endDate || "").trim())
    params.set("endDate", String(endDate).trim());
  const query = params.toString();

  return authFetch(
    `${API_BASE_URL}/api/dashboard/recruiter/${encodeURIComponent(rid)}${query ? `?${query}` : ""}`,
    {},
    "Failed to fetch recruiter dashboard.",
  );
};

export const fetchJobResumeStatuses = (jobId) =>
  authFetch(
    `${API_BASE_URL}/api/jobs/${encodeURIComponent(jobId)}/resume-statuses`,
    {},
    "Failed to fetch job resumes.",
  );

export const updateJobResumeStatus = (jobId, payload) =>
  authFetch(
    `${API_BASE_URL}/api/jobs/${encodeURIComponent(jobId)}/resume-statuses`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
    },
    "Failed to update resume status.",
  );

export const markResumeLeft = (jobId, payload) =>
  authFetch(
    `${API_BASE_URL}/api/jobs/${encodeURIComponent(jobId)}/resume-statuses/left`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
    },
    "Failed to mark candidate as left.",
  );

export const triggerBillingProcess = () =>
  authFetch(
    `${API_BASE_URL}/api/admin/billing/process`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    "Failed to process billing.",
  );
