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

export const fetchTeamLeaderDashboard = async () => {
  try {
    return await authFetch(
      `${API_BASE_URL}/api/dashboard/team-leader`,
      {},
      "Failed to fetch team leader dashboard.",
    );
  } catch (error) {
    console.warn("fetchTeamLeaderDashboard fallback:", error.message);
    return {
      overview: {
        totalJobs: 0,
        openJobs: 0,
        restrictedJobs: 0,
        totalRecruiters: 0,
        activeRecruiters: 0,
        totalSubmissions: 0,
      },
      topPerformers: [],
    };
  }
};

export const fetchTeamLeaderPerformanceDashboard = async ({
  startDate = "",
  endDate = "",
} = {}) => {
  const params = new URLSearchParams();
  if (String(startDate || "").trim()) {
    params.set("startDate", String(startDate).trim());
  }
  if (String(endDate || "").trim()) {
    params.set("endDate", String(endDate).trim());
  }
  const query = params.toString();

  try {
    return await authFetch(
      `${API_BASE_URL}/api/dashboard/team-leader/performance${query ? `?${query}` : ""}`,
      {},
      "Failed to fetch team leader performance dashboard.",
    );
  } catch (error) {
    console.warn("fetchTeamLeaderPerformanceDashboard fallback:", error.message);
    return {
      statusDrilldown: {
        submitted: [],
        verified: [],
        others: [],
        walk_in: [],
        shortlisted: [],
        selected: [],
        rejected: [],
        joined: [],
        dropout: [],
        billed: [],
        left: [],
      },
      summary: {
        totalJobs: 0,
        openJobs: 0,
        restrictedJobs: 0,
        totalRecruiters: 0,
        totalSubmitted: 0,
        totalVerified: 0,
        totalOthers: 0,
        totalWalkIn: 0,
        totalShortlisted: 0,
        totalSelected: 0,
        totalRejected: 0,
        totalJoined: 0,
        totalDropout: 0,
        totalBilled: 0,
        totalLeft: 0,
      },
    };
  }
};

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

export const rollbackJobResumeStatus = (jobId, resId) =>
  authFetch(
    `${API_BASE_URL}/api/jobs/${encodeURIComponent(jobId)}/resume-statuses/${encodeURIComponent(resId)}/rollback`,
    {
      method: "POST",
    },
    "Failed to rollback resume status.",
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
