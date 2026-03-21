import { authFetch, authFetchMultipart } from "../auth/authFetch";
import { API_BASE_URL } from "../config/api";

export const fetchMyJobs = () =>
  authFetch(`${API_BASE_URL}/api/jobs/my`, {}, "Failed to fetch your jobs.");

export const fetchJobAccess = (jobId) =>
  authFetch(
    `${API_BASE_URL}/api/jobs/${jobId}/access`,
    {},
    "Failed to fetch job access.",
  );

export const assignJobAccess = (jobId, recruiterIds, notes = "") =>
  authFetch(
    `${API_BASE_URL}/api/jobs/${jobId}/access`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recruiterIds, notes }),
    },
    "Failed to assign recruiters.",
  );

export const revokeJobAccess = (jobId, recruiterRid) =>
  authFetch(
    `${API_BASE_URL}/api/jobs/${jobId}/access/${encodeURIComponent(recruiterRid)}`,
    { method: "DELETE" },
    "Failed to revoke recruiter access.",
  );

export const updateJobAccessMode = (jobId, accessMode) =>
  authFetch(
    `${API_BASE_URL}/api/jobs/${jobId}/access-mode`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessMode }),
    },
    "Failed to update access mode.",
  );

export const fetchRecruitersList = (search = "") => {
  const query = String(search || "").trim();
  const suffix = query ? `?search=${encodeURIComponent(query)}` : "";
  return authFetch(
    `${API_BASE_URL}/api/recruiters/list${suffix}`,
    {},
    "Failed to fetch recruiters list.",
  );
};

export const fetchAccessibleJobs = (recruiterId, options = {}) => {
  const params = new URLSearchParams();
  const location = String(options.location || "").trim();
  const company = String(options.company || "").trim();
  const search = String(options.search || "").trim();
  const limit = Number(options.limit);
  const offset = Number(options.offset);

  if (location) params.set("location", location);
  if (company) params.set("company", company);
  if (search) params.set("search", search);
  if (Number.isInteger(limit) && limit >= 0) params.set("limit", String(limit));
  if (Number.isInteger(offset) && offset >= 0)
    params.set("offset", String(offset));

  const query = params.toString() ? `?${params.toString()}` : "";
  return authFetch(
    `${API_BASE_URL}/api/recruiters/${encodeURIComponent(recruiterId)}/accessible-jobs${query}`,
    {},
    "Failed to fetch accessible jobs.",
  );
};

export const checkRecruiterJobAccess = (recruiterId, jobId) =>
  authFetch(
    `${API_BASE_URL}/api/recruiters/${encodeURIComponent(recruiterId)}/can-access/${encodeURIComponent(jobId)}`,
    {},
    "Failed to verify job access.",
  );

export const submitRecruiterResume = async (formData) =>
  authFetchMultipart(
    `${API_BASE_URL}/api/resumes/submit`,
    formData,
    "Failed to submit resume.",
  );
