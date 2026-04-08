import { BACKEND_CONNECTION_ERROR, buildApiUrl } from "../config/api";

const JOB_STORAGE_KEY = "selectedJob";

const readJsonResponse = async (response, fallbackMessage) => {
  const rawBody = await response.text();
  if (!rawBody) return {};

  try {
    return JSON.parse(rawBody);
  } catch {
    throw new Error(
      `Jobs API returned non-JSON response (${response.status}) from ${response.url}. ${fallbackMessage}`,
    );
  }
};

const createListFromCsv = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const formatLocation = (job) => {
  const city = String(job.city || "").trim();
  const state = String(job.state || "").trim();
  const pincode = String(job.pincode || "").trim();

  const mainLocation = [city, state].filter(Boolean).join(", ");
  if (mainLocation && pincode) return `${mainLocation} - ${pincode}`;
  return mainLocation || pincode || "Location not specified";
};

const buildHighlights = (job) => {
  const highlights = [
    job.salary || "Salary not specified",
    job.qualification || "Qualification not specified",
    job.experience || "Experience not specified",
  ];

  return highlights.filter(Boolean);
};

export const toUiJob = (job) => {
  const description = String(job.job_description || "No description provided.").trim();
  const skills = createListFromCsv(job.skills);
  const benefits = createListFromCsv(job.benefits);

  return {
    id: String(job.jid || "").trim(),
    recruiterRid: job.recruiter_rid || null,
    title: job.role_name || "Untitled role",
    company: job.company_name || "Unknown company",
    location: formatLocation(job),
    city: String(job.city || "").trim(),
    state: String(job.state || "").trim(),
    pincode: String(job.pincode || "").trim(),
    salary: job.salary || "Salary not specified",
    type: job.qualification || "Qualification not specified",
    experience: job.experience || "Experience not specified",
    description,
    summary:
      description.length > 220 ? `${description.slice(0, 217).trim()}...` : description,
    tags: skills,
    benefits,
    highlights: buildHighlights(job),
    positionsOpen: Number(job.positions_open) || 1,
    revenue: job.revenue ?? null,
    pointsPerJoining: job.points_per_joining ?? null,
    accessMode: job.access_mode || "open",
    postedAt: job.created_at || null,
  };
};

export const fetchJobsFromApi = async () => {
  try {
    const jobsUrl = buildApiUrl("/api/jobs");
    const response = await fetch(jobsUrl, {
      headers: {
        Accept: "application/json",
      },
    });
    const data = await readJsonResponse(
      response,
      "Check VITE_API_BASE_URL and ensure backend is restarted with GET /api/jobs route.",
    );

    if (!response.ok) {
      throw new Error(data?.message || "Failed to fetch jobs.");
    }

    return (data.jobs || []).map(toUiJob);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(BACKEND_CONNECTION_ERROR);
    }

    throw error;
  }
};

export const storeSelectedJob = (job) => {
  if (!job) return;
  sessionStorage.setItem(JOB_STORAGE_KEY, JSON.stringify(job));
};

export const readStoredJob = () => {
  try {
    const raw = sessionStorage.getItem(JOB_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
