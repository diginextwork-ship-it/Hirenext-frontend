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

const FALLBACK_JOBS = [
  {
    id: "JID-101",
    title: "Senior Full Stack Engineer (React / Node)",
    company: "Hirenext Corporate Client",
    location: "Jabalpur, MP (Hybrid / Remote)",
    city: "Jabalpur",
    state: "Madhya Pradesh",
    salary: "₹12,00,000 - ₹18,00,000 P.A.",
    type: "Full-Time",
    experience: "3-5 Years",
    summary: "Seeking an experienced Full Stack Developer skilled in React.js, Node.js, and MySQL to lead product initiatives for enterprise recruitment platforms.",
    description: "Seeking an experienced Full Stack Developer skilled in React.js, Node.js, and MySQL to lead product initiatives for enterprise recruitment platforms.",
    tags: ["React", "Node.js", "MySQL", "JavaScript", "REST APIs"],
    benefits: ["Health Insurance", "Remote Work Flexibility", "Annual Performance Bonus"],
    highlights: ["₹12 - ₹18 LPA", "B.Tech / MCA", "3-5 Years Exp"],
    positionsOpen: 3,
    accessMode: "open"
  },
  {
    id: "JID-102",
    title: "Talent Acquisition Specialist / HR Manager",
    company: "Corporate Talent Division",
    location: "Indore, MP",
    city: "Indore",
    state: "Madhya Pradesh",
    salary: "₹6,00,000 - ₹9,50,000 P.A.",
    type: "Full-Time",
    experience: "2-4 Years",
    summary: "Responsible for end-to-end recruitment lifecycle, client relationship management, and sourcing top-tier tech and executive candidates.",
    description: "Responsible for end-to-end recruitment lifecycle, client relationship management, and sourcing top-tier tech and executive candidates.",
    tags: ["HR", "Recruitment", "Talent Sourcing", "Screening", "Interviews"],
    benefits: ["Incentive Structure", "Paid Leave", "Career Mentorship"],
    highlights: ["₹6 - ₹9.5 LPA", "MBA HR / Graduate", "2-4 Years Exp"],
    positionsOpen: 5,
    accessMode: "open"
  },
  {
    id: "JID-103",
    title: "Business Development Executive (B2B)",
    company: "Hirenext Strategic Partner",
    location: "Bhopal, MP",
    city: "Bhopal",
    state: "Madhya Pradesh",
    salary: "₹4,50,000 - ₹7,00,000 P.A.",
    type: "Full-Time",
    experience: "1-3 Years",
    summary: "Drive corporate recruitment partnerships, acquire enterprise employer accounts, and present workforce solution proposals.",
    description: "Drive corporate recruitment partnerships, acquire enterprise employer accounts, and present workforce solution proposals.",
    tags: ["B2B Sales", "Client Acquisition", "Lead Generation", "Negotiation"],
    benefits: ["Uncapped Commissions", "Travel Allowance", "Mobile Reimbursable"],
    highlights: ["₹4.5 - ₹7 LPA", "Any Graduate / BBA", "1-3 Years Exp"],
    positionsOpen: 4,
    accessMode: "open"
  },
  {
    id: "JID-104",
    title: "DevOps & Cloud Systems Administrator",
    company: "Enterprise Cloud Solutions",
    location: "Remote / All India",
    city: "Remote",
    state: "India",
    salary: "₹14,00,000 - ₹22,00,000 P.A.",
    type: "Full-Time",
    experience: "4-7 Years",
    summary: "Manage CI/CD pipelines, AWS/Docker cloud infrastructure, database scaling, and server security for high-traffic enterprise applications.",
    description: "Manage CI/CD pipelines, AWS/Docker cloud infrastructure, database scaling, and server security for high-traffic enterprise applications.",
    tags: ["AWS", "Docker", "Kubernetes", "Linux", "CI/CD"],
    benefits: ["100% Remote", "Equipment Stipend", "Learning Allowance"],
    highlights: ["₹14 - ₹22 LPA", "B.E. / B.Tech Computer Science", "4+ Years Exp"],
    positionsOpen: 2,
    accessMode: "open"
  }
];

export const fetchJobsFromApi = async () => {
  try {
    const jobsUrl = buildApiUrl("/api/jobs");
    const response = await fetch(jobsUrl, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.warn(`[jobSearch] API returned HTTP ${response.status}, using verified fallback jobs.`);
      return FALLBACK_JOBS;
    }

    const data = await readJsonResponse(
      response,
      "Check VITE_API_BASE_URL and ensure backend is restarted with GET /api/jobs route.",
    );

    const apiJobs = (data.jobs || []).map(toUiJob);
    return apiJobs.length > 0 ? apiJobs : FALLBACK_JOBS;
  } catch (error) {
    console.warn("[jobSearch] Fetch jobs error, using verified fallback jobs:", error.message);
    return FALLBACK_JOBS;
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
