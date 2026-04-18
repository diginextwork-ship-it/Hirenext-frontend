import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "./AdminLayout";
import {
  API_BASE_URL,
  getAdminHeaders,
  readJsonResponse,
  adminAdvanceStatus,
  adminRollbackStatus,
  adminDeleteRecruiter,
  adminUpdateRecruiterAccountStatus,
  updateTeamLeaderNote,
} from "./adminApi";
import { getAuthSession } from "../../auth/session";
import {
  buildCandidatePayloadAliases,
  formatResumeCompanyDisplay,
  normalizeResumeData,
} from "../../utils/dashboardData";
import "../../styles/admin-panel.css";

const TABS = {
  OVERVIEW: "overview",
  TEAM_LEADERS: "team_leaders",
  RECRUITERS: "recruiters",
};

const PRESETS = {
  TODAY: "today",
  YESTERDAY: "yesterday",
  THIS_MONTH: "this_month",
  LAST_MONTH: "last_month",
  CUSTOM: "custom",
};

const STATUS_CARDS = [
  {
    key: "verified",
    label: "Verified",
    summaryKey: "totalVerified",
    tone: "green",
  },
  {
    key: "others",
    label: "Others",
    summaryKey: "totalOthers",
    tone: "teal",
  },
  {
    key: "walk_in",
    label: "Walk In",
    summaryKey: "totalWalkIn",
    tone: "green",
  },
  {
    key: "shortlisted",
    label: "Shortlisted",
    summaryKey: "totalShortlisted",
    tone: "blue",
  },
  {
    key: "selected",
    label: "Selected",
    summaryKey: "totalSelected",
    tone: "purple",
  },
  {
    key: "rejected",
    label: "Rejected",
    summaryKey: "totalRejected",
    tone: "red",
  },
  {
    key: "joined",
    label: "Joined",
    summaryKey: "totalJoined",
    tone: "gold",
  },
  {
    key: "dropout",
    label: "Dropout",
    summaryKey: "totalDropout",
    tone: "pink",
  },
  {
    key: "billed",
    label: "Billed",
    summaryKey: "totalBilled",
    tone: "teal",
  },
  {
    key: "left",
    label: "Left",
    summaryKey: "totalLeft",
    tone: "orange",
  },
];

const PERSON_METRIC_CARDS = [
  { key: "submitted", label: "Submitted", tone: "submitted" },
  { key: "verified", label: "Verified", tone: "green" },
  { key: "walk_in", label: "Verified Walk-in", tone: "green" },
  { key: "shortlisted", label: "Shortlisted", tone: "blue" },
  { key: "selected", label: "Selected", tone: "purple" },
  { key: "rejected", label: "Rejected", tone: "red" },
  { key: "joined", label: "Joined", tone: "gold" },
  { key: "dropout", label: "Dropout", tone: "pink" },
  { key: "billed", label: "Billed", tone: "teal" },
  { key: "left", label: "Left", tone: "orange" },
  { key: "on_hold", label: "On Hold", tone: "blue" },
  { key: "points", label: "Points", tone: "teal" },
];

const ADMIN_ACTIONS_BY_STATUS = {
  submitted: [
    { value: "verified", label: "Verify", color: "#2563eb" },
    { value: "others", label: "Others", color: "#0d9488" },
    { value: "rejected", label: "Reject", color: "#dc2626" },
  ],
  verified: [
    { value: "walk_in", label: "Walk In", color: "#ca8a04" },
    { value: "others", label: "Others", color: "#0d9488" },
    { value: "rejected", label: "Reject", color: "#dc2626" },
  ],
  others: [
    { value: "walk_in", label: "Walk In", color: "#ca8a04" },
    { value: "rejected", label: "Reject", color: "#dc2626" },
  ],
  walk_in: [
    { value: "shortlisted", label: "Shortlisted", color: "#2563eb" },
    { value: "rejected", label: "Reject", color: "#dc2626" },
  ],
  shortlisted: [
    {
      value: "selected",
      label: "Selected",
      color: "#16a34a",
    },
    { value: "dropout", label: "Dropout", color: "#dc2626" },
  ],
  selected: [
    { value: "joined", label: "Joined", color: "#16a34a" },
    { value: "dropout", label: "Dropout", color: "#dc2626" },
  ],
  joined: [
    { value: "billed", label: "Billed", color: "#16a34a" },
    { value: "left", label: "Left", color: "#dc2626" },
  ],
};

const ROLLBACKABLE_ADMIN_STATUSES = new Set([
  "others",
  "verified",
  "walk_in",
  "selected",
  "rejected",
  "shortlisted",
  "joined",
]);

const ALLOWED_TRANSITIONS = {
  submitted: ["verified", "others", "rejected"],
  verified: ["walk_in", "others", "rejected"],
  others: ["walk_in", "rejected"],
  walk_in: ["shortlisted", "rejected"],
  shortlisted: ["selected", "dropout"],
  selected: ["joined", "dropout"],
  joined: ["billed", "left"],
};

const resolveRollbackTargetStatus = (item) => {
  const currentStatus = normalizeStatus(item?.status);
  if (currentStatus === "others") {
    return item?.verifiedReason ? "verified" : "submitted";
  }
  if (currentStatus === "walk_in") {
    return item?.othersReason ? "others" : "verified";
  }
  if (currentStatus === "verified") return "submitted";
  if (currentStatus === "shortlisted") return "walk_in";
  if (currentStatus === "selected") return "shortlisted";
  if (currentStatus === "rejected") {
    if (item?.joiningDate) return "selected";
    if (item?.walkInDate || item?.walkInReason) return "walk_in";
    if (item?.othersReason) return "others";
    return item?.verifiedReason ? "verified" : "submitted";
  }
  if (currentStatus === "joined") return "selected";
  return null;
};

function toDateStr(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPresetRange(preset) {
  const now = new Date();
  switch (preset) {
    case PRESETS.TODAY:
      return { start: toDateStr(now), end: toDateStr(now) };
    case PRESETS.YESTERDAY: {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { start: toDateStr(y), end: toDateStr(y) };
    }
    case PRESETS.THIS_MONTH:
      return {
        start: toDateStr(new Date(now.getFullYear(), now.getMonth(), 1)),
        end: toDateStr(now),
      };
    case PRESETS.LAST_MONTH: {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: toDateStr(first), end: toDateStr(last) };
    }
    default:
      return null;
  }
}

const getExistingRevenueAmount = (item) => {
  const revenueValue = Number(
    item?.revenue ??
      item?.revenueAmount ??
      item?.candidateRevenue ??
      item?.companyRevenue ??
      item?.amount ??
      item?.companyRev ??
      item?.company_rev ??
      item?.job?.revenue ??
      item?.job?.revenueAmount ??
      item?.job?.candidateRevenue ??
      item?.job?.companyRevenue ??
      item?.job?.companyRev ??
      item?.job?.company_rev ??
      0,
  );

  return Number.isFinite(revenueValue) ? Math.trunc(revenueValue) : 0;
};

function getConfirmBilledDisabledReason(candidate, billedFile) {
  const currentStatus = String(
    candidate?.currentStatus ?? candidate?.status ?? "",
  )
    .trim()
    .toLowerCase();

  if (!candidate?.resId) {
    return "Resume ID is missing.";
  }

  if (currentStatus !== "joined" && currentStatus !== "billed") {
    return `Only a Joined candidate can move to Billed. Current status: ${candidate?.currentStatus || candidate?.status || "unknown"}.`;
  }

  if (!billedFile) {
    return "Upload the candidate PDF attachment to enable Confirm Billed.";
  }

  if (billedFile.type !== "application/pdf") {
    return "Only PDF files are allowed for billing.";
  }

  return "";
}

const buildBilledFormData = (resume, attachmentFile) => {
  const normalized = normalizeResumeData(resume);
  const formData = new FormData();

  formData.append("status", "billed");
  if (normalized.candidateName) {
    formData.append("candidate_name", String(normalized.candidateName));
  }
  if (normalized.candidateEmail) {
    formData.append("candidate_email", String(normalized.candidateEmail));
  }
  if (normalized.candidatePhone) {
    formData.append("candidate_phone", String(normalized.candidatePhone));
  }
  formData.append("photo", attachmentFile);

  return formData;
};

function formatLabel(preset) {
  switch (preset) {
    case PRESETS.TODAY:
      return "Today";
    case PRESETS.YESTERDAY:
      return "Yesterday";
    case PRESETS.THIS_MONTH:
      return "This Month";
    case PRESETS.LAST_MONTH:
      return "Last Month";
    case PRESETS.CUSTOM:
      return "Custom Range";
    default:
      return "";
  }
}

function formatStatusLabel(status) {
  const normalized = String(status || "")
    .trim()
    .toLowerCase();
  if (!normalized) return "Unknown";
  if (normalized === "submitted") return "Resumes Submitted";
  return normalized
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value) {
  if (!value) return "Not set";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString();
}

function getCandidateDisplayName(item) {
  return (
    item?.candidateName ||
    item?.applicantName ||
    item?.name ||
    item?.fullName ||
    "N/A"
  );
}

function getLatestPerformanceNote(item) {
  return (
    item?.latestNote ||
    item?.note ||
    item?.reason ||
    item?.selectionNote ||
    item?.submittedReason ||
    item?.verifiedReason ||
    item?.othersReason ||
    item?.walkInReason ||
    item?.shortlistedReason ||
    item?.selectReason ||
    item?.joiningNote ||
    item?.joinedReason ||
    item?.dropoutReason ||
    item?.rejectReason ||
    item?.billedReason ||
    item?.leftReason ||
    "N/A"
  );
}

function normalizeStatus(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (normalized === "walkin") return "walk_in";
  if (normalized === "walk_in") return "walk_in";
  if (normalized === "select") return "selected";
  if (normalized === "pendingjoining") return "shortlisted";
  if (normalized === "pending_joining") return "shortlisted";

  return normalized;
}

function normalizeLookupKey(value) {
  return String(value || "").trim().toLowerCase();
}

function matchesCandidateSearch(item, searchValue) {
  const normalizedSearch = normalizeLookupKey(searchValue);
  if (!normalizedSearch) return true;

  const candidateName = getCandidateDisplayName(item);
  if (candidateName !== "N/A" && normalizeLookupKey(candidateName).includes(normalizedSearch)) {
    return true;
  }

  const digitsOnlySearch = normalizedSearch.replace(/\D/g, "");
  if (digitsOnlySearch) {
    const phones = [item?.candidatePhone, item?.phone].map((p) =>
      String(p || "").replace(/\D/g, ""),
    );
    if (phones.some((p) => p.includes(digitsOnlySearch))) {
      return true;
    }
  }

  return [item?.candidatePhone, item?.phone].some((value) =>
    normalizeLookupKey(value).includes(normalizedSearch),
  );
}

function matchesPersonStatusItem(item, person, roleLabel) {
  if (!person) return false;

  const normalizedRole = normalizeLookupKey(roleLabel);
  if (normalizedRole === "recruiter") {
    return (
      normalizeLookupKey(item?.recruiterRid) === normalizeLookupKey(person?.rid) ||
      normalizeLookupKey(item?.rid) === normalizeLookupKey(person?.rid) ||
      normalizeLookupKey(item?.recruiterName) === normalizeLookupKey(person?.name)
    );
  }

  if (normalizedRole === "team leader") {
    const itemTeamLeaderRid = normalizeLookupKey(
      item?.teamLeaderRid || item?.team_leader_rid,
    );
    const personRid = normalizeLookupKey(person?.rid);
    if (itemTeamLeaderRid && personRid) {
      return itemTeamLeaderRid === personRid;
    }

    return normalizeLookupKey(item?.teamLeaderName) === normalizeLookupKey(person?.name);
  }

  return false;
}

const STATUS_PROGRESS_RANK = {
  submitted: 0,
  verified: 1,
  others: 1,
  walk_in: 2,
  shortlisted: 3,
  selected: 4,
  joined: 5,
  billed: 6,
  left: 7,
  dropout: 7,
  rejected: 7,
};

function getStatusRank(status) {
  const normalized = normalizeStatus(status);
  return Object.prototype.hasOwnProperty.call(STATUS_PROGRESS_RANK, normalized)
    ? STATUS_PROGRESS_RANK[normalized]
    : -1;
}

const TERMINAL_EXCLUSIVE_STATUSES = new Set(["rejected", "left"]);

function dedupeItemsByResId(items) {
  // Dedupe by `resId`, but merge fields from duplicates so we don't lose
  // partial job/company/city/team-leader info that arrives on some entries.
  const isPresent = (value) =>
    value !== null &&
    value !== undefined &&
    !(typeof value === "string" && value.trim() === "") &&
    !(
      typeof value === "string" &&
      ["n/a", "na", "not set"].includes(value.trim().toLowerCase())
    ) &&
    // Treat empty objects as absent.
    !(
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).length === 0
    );

  const getResId = (item) =>
    item?.resId ?? item?.res_id ?? item?.resumeId ?? item?.resume_id;

  const isPlainObject = (v) =>
    typeof v === "object" && v !== null && !Array.isArray(v);

  const deepMergeByPresence = (prev, next) => {
    if (!isPlainObject(prev) || !isPlainObject(next)) {
      return isPresent(prev) ? prev : next;
    }

    const out = { ...prev };
    for (const [key, nextVal] of Object.entries(next)) {
      const prevVal = out[key];

      // If nested job objects exist, merge them recursively.
      if (key === "job" && isPlainObject(prevVal) && isPlainObject(nextVal)) {
        out[key] = deepMergeByPresence(prevVal, nextVal);
        continue;
      }

      // Fill missing scalar fields.
      if (!isPresent(prevVal) && isPresent(nextVal)) {
        out[key] = nextVal;
        continue;
      }

      // If both are objects, merge recursively to fill nested values.
      if (isPlainObject(prevVal) && isPlainObject(nextVal)) {
        out[key] = deepMergeByPresence(prevVal, nextVal);
      }
    }
    return out;
  };

  const map = new Map();
  for (const item of items) {
    const key = getResId(item);
    if (!key || String(key).trim() === "") continue;

    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...item, resId: key });
      continue;
    }

    map.set(key, deepMergeByPresence(existing, { ...item, resId: key }));
  }

  return Array.from(map.values());
}

export default function AdminPerformance({ setCurrentPage }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submittedResumes, setSubmittedResumes] = useState([]);
  const [submittedLoading, setSubmittedLoading] = useState(false);
  const [submittedError, setSubmittedError] = useState("");
  const [activeTab, setActiveTab] = useState(TABS.OVERVIEW);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("submitted");
  const [sortDir, setSortDir] = useState("desc");
  const [selectedStatusKey, setSelectedStatusKey] = useState("verified");
  const [selectedRecruiterRid, setSelectedRecruiterRid] = useState("");
  const [selectedTeamLeaderRid, setSelectedTeamLeaderRid] = useState("");
  const [recruiterEntrySearch, setRecruiterEntrySearch] = useState("");

  // Admin status action modal state
  const [actionModalItem, setActionModalItem] = useState(null);
  const [actionTarget, setActionTarget] = useState("");
  const [actionReason, setActionReason] = useState("");
  const [actionContacted, setActionContacted] = useState("Yes");
  const [actionSituation, setActionSituation] = useState("");
  const [actionJoiningDate, setActionJoiningDate] = useState("");
  const [actionJoiningNote, setActionJoiningNote] = useState("");
  const [actionRevenue, setActionRevenue] = useState("");
  const [actionAttachmentFile, setActionAttachmentFile] = useState(null);
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const billedDisabledReason =
    actionTarget === "billed"
      ? getConfirmBilledDisabledReason(actionModalItem, actionAttachmentFile)
      : "";
  const isConfirmBilledDisabled = Boolean(billedDisabledReason);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteDeleting, setDeleteDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [statusTarget, setStatusTarget] = useState(null);
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [statusError, setStatusError] = useState("");

  // Timeline filter state
  const [timelinePreset, setTimelinePreset] = useState(PRESETS.TODAY);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [statusOverrides, setStatusOverrides] = useState({});

  // Temporary debugging toggle:
  // set localStorage.setItem("perf_debug_admin","1") then refresh the page.
  const PERF_DEBUG =
    typeof window !== "undefined" &&
    window.localStorage?.getItem("perf_debug_admin") === "1";

  const dateRange = useMemo(() => {
    if (timelinePreset === PRESETS.CUSTOM) {
      return customStart && customEnd
        ? { start: customStart, end: customEnd }
        : null;
    }
    return getPresetRange(timelinePreset);
  }, [timelinePreset, customStart, customEnd]);

  const fetchPerformance = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (dateRange) {
        params.set("startDate", dateRange.start);
        params.set("endDate", dateRange.end);
      }
      const qs = params.toString();
      const url = `${API_BASE_URL}/api/admin/performance${qs ? `?${qs}` : ""}`;
      const response = await fetch(url, {
        headers: getAdminHeaders(),
      });
      const json = await readJsonResponse(
        response,
        "Failed to fetch performance data.",
      );
      if (!response.ok)
        throw new Error(json?.message || "Failed to load performance data.");
      setData(json);
    } catch (err) {
      setError(err.message || "Failed to load performance data.");
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  // Auto-refresh performance data daily at midnight and every 6 hours
  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const timeUntilMidnight = tomorrow.getTime() - now.getTime();

    // Refresh at midnight
    const timeoutId = setTimeout(() => {
      fetchPerformance();
      // Then refresh every 24 hours
      const intervalId = setInterval(
        () => {
          fetchPerformance();
        },
        24 * 60 * 60 * 1000,
      );
      return () => clearInterval(intervalId);
    }, timeUntilMidnight);

    // Also refresh every 6 hours to catch updates throughout the day
    const intervalId = setInterval(
      () => {
        fetchPerformance();
      },
      6 * 60 * 60 * 1000,
    );

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [fetchPerformance]);

  const fetchSubmittedResumes = useCallback(async () => {
    setSubmittedLoading(true);
    setSubmittedError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/dashboard`, {
        headers: getAdminHeaders(),
      });
      const json = await readJsonResponse(
        response,
        "Failed to fetch submitted resumes.",
      );
      if (!response.ok) {
        throw new Error(json?.message || "Failed to fetch submitted resumes.");
      }

      const uploads = Array.isArray(json?.recruiterResumeUploads)
        ? json.recruiterResumeUploads
        : [];

      const filteredUploads = uploads.filter((item) => {
        if (!dateRange) return true;
        const rawDate = item?.uploadedAt;
        if (!rawDate) return false;
        const parsed = new Date(rawDate);
        if (Number.isNaN(parsed.getTime())) return false;
        const start = new Date(`${dateRange.start}T00:00:00`);
        const end = new Date(`${dateRange.end}T23:59:59.999`);
        return parsed >= start && parsed <= end;
      });

      setSubmittedResumes(
        filteredUploads.map((item) => {
          const normalized = normalizeResumeData(item);
          return {
            ...normalized,
            recruiterName: normalized.recruiterName || "N/A",
            recruiterRid: normalized.rid || "N/A",
            teamLeaderRid:
              item.teamLeaderRid || item.team_leader_rid || null,
            teamLeaderName:
              item.teamLeaderName || item.team_leader_name || "N/A",
            candidatePhone: normalized.candidatePhone || null,
            jobJid: normalized.jobJid ?? "N/A",
            companyName: normalized.companyName || null,
            officeLocationCity:
              normalized.officeLocationCity ||
              normalized.office_location_city ||
              null,
            city: normalized.city || null,
            resumeFilename:
              normalized.resumeFilename || normalized.resId || "View resume",
            status: "submitted",
            uploadedAt: normalized.uploadedAt || null,
          };
        }),
      );
    } catch (err) {
      setSubmittedResumes([]);
      setSubmittedError(err.message || "Failed to fetch submitted resumes.");
    } finally {
      setSubmittedLoading(false);
    }
  }, [dateRange]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const sortIndicator = (field) => {
    if (sortField !== field) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
  };

  const filteredRecruiters = (data?.recruiters || [])
    .filter((r) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        r.name?.toLowerCase().includes(term) ||
        r.email?.toLowerCase().includes(term) ||
        r.rid?.toLowerCase().includes(term)
      );
    })
    .sort((a, b) => {
      const valA = a[sortField] ?? 0;
      const valB = b[sortField] ?? 0;
      if (typeof valA === "string") {
        return sortDir === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      return sortDir === "asc" ? valA - valB : valB - valA;
    });

  const filteredTLs = (data?.teamLeaders || []).filter((tl) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      tl.name?.toLowerCase().includes(term) ||
      tl.email?.toLowerCase().includes(term) ||
      tl.rid?.toLowerCase().includes(term)
    );
  });

  const selectedRecruiter = useMemo(
    () =>
      (data?.recruiters || []).find((recruiter) => recruiter.rid === selectedRecruiterRid) ||
      null,
    [data?.recruiters, selectedRecruiterRid],
  );

  const selectedTeamLeader = useMemo(
    () =>
      (data?.teamLeaders || []).find(
        (teamLeader) => teamLeader.rid === selectedTeamLeaderRid,
      ) || null,
    [data?.teamLeaders, selectedTeamLeaderRid],
  );

  const statusDrilldown = useMemo(() => data?.statusDrilldown || {}, [data]);
  const performanceSubmittedItems = useMemo(
    () =>
      statusDrilldown?.submitted && Array.isArray(statusDrilldown.submitted)
        ? statusDrilldown.submitted
        : [],
    [statusDrilldown],
  );
  const latestStatusByResId = useMemo(() => {
    const map = new Map();
    const getResId = (item) =>
      item?.resId ?? item?.res_id ?? item?.resumeId ?? item?.resume_id;

    for (const [bucketStatus, bucketItems] of Object.entries(statusDrilldown)) {
      if (!Array.isArray(bucketItems)) continue;
      const bucketRank = getStatusRank(bucketStatus);
      for (const item of bucketItems) {
        const normalizedItem = normalizeResumeData(item);
        const resId = getResId(item);
        if (!resId || String(resId).trim() === "") continue;
        const itemStatus = normalizeStatus(
          normalizedItem?.workflowStatus ||
            normalizedItem?.status ||
            item?.workflowStatus ||
            item?.workflow_status ||
            item?.status,
        );
        const itemRank = getStatusRank(itemStatus);
        const currentRank = Math.max(bucketRank, itemRank);
        if (currentRank < 0) continue;

        const prev = map.get(String(resId));
        if (!prev || currentRank > prev.rank) {
          map.set(String(resId), {
            status:
              currentRank === itemRank && itemRank >= 0
                ? itemStatus
                : normalizeStatus(bucketStatus),
            rank: currentRank,
          });
        }
      }
    }

    for (const [resId, status] of Object.entries(statusOverrides)) {
      const normalizedStatus = normalizeStatus(status);
      const rank = getStatusRank(normalizedStatus);
      if (rank < 0) continue;
      map.set(String(resId), { status: normalizedStatus, rank });
    }

    return map;
  }, [statusDrilldown, statusOverrides]);
  const statusItemsByStatus = useMemo(() => {
    const buildItems = (rawItems, fallbackStatus) => {
      const normalizedItems = rawItems.map((item) => {
        const normalized = normalizeResumeData(item);
        const teamLeaderName =
          item?.teamLeaderName ||
          item?.team_leader_name ||
          normalized?.teamLeaderName;
        const resId =
          item?.resId ??
          item?.res_id ??
          item?.resumeId ??
          item?.resume_id ??
          normalized?.resId;
        const latestResolved = resId
          ? latestStatusByResId.get(String(resId))
          : null;
        const sourceStatus = normalizeStatus(
          normalized?.workflowStatus ||
            normalized?.workflow_status ||
            normalized?.status ||
            item?.workflowStatus ||
            item?.workflow_status ||
            item?.status ||
            fallbackStatus,
        );
        const effectiveStatus = normalizeStatus(
          latestResolved?.status || sourceStatus || fallbackStatus,
        );

        return {
          ...normalized,
          teamLeaderRid:
            item?.teamLeaderRid ||
            item?.team_leader_rid ||
            normalized?.teamLeaderRid ||
            normalized?.team_leader_rid ||
            null,
          teamLeaderName,
          resId,
          status: effectiveStatus,
        };
      });

      const dedupedItems = dedupeItemsByResId(normalizedItems);
      if (fallbackStatus === "submitted") {
        return dedupedItems.filter((item) => {
          const effectiveStatus = normalizeStatus(item?.status);
          return !TERMINAL_EXCLUSIVE_STATUSES.has(effectiveStatus);
        });
      }

      return dedupedItems.filter((item) => {
        const effectiveStatus = normalizeStatus(item?.status);
        if (!TERMINAL_EXCLUSIVE_STATUSES.has(effectiveStatus)) {
          return true;
        }

        return effectiveStatus === normalizeStatus(fallbackStatus);
      });
    };

    const submittedRawItems =
      performanceSubmittedItems.length > 0 ? performanceSubmittedItems : submittedResumes;

    return {
      submitted: buildItems(submittedRawItems, "submitted"),
      verified: buildItems(
        Array.isArray(statusDrilldown?.verified) ? statusDrilldown.verified : [],
        "verified",
      ),
      others: buildItems(
        Array.isArray(statusDrilldown?.others) ? statusDrilldown.others : [],
        "others",
      ),
      walk_in: buildItems(
        Array.isArray(statusDrilldown?.walk_in) ? statusDrilldown.walk_in : [],
        "walk_in",
      ),
      shortlisted: buildItems(
        Array.isArray(statusDrilldown?.shortlisted)
          ? statusDrilldown.shortlisted
          : [],
        "shortlisted",
      ),
      selected: buildItems(
        Array.isArray(statusDrilldown?.selected) ? statusDrilldown.selected : [],
        "selected",
      ),
      rejected: buildItems(
        Array.isArray(statusDrilldown?.rejected) ? statusDrilldown.rejected : [],
        "rejected",
      ),
      joined: buildItems(
        Array.isArray(statusDrilldown?.joined) ? statusDrilldown.joined : [],
        "joined",
      ),
      dropout: buildItems(
        Array.isArray(statusDrilldown?.dropout) ? statusDrilldown.dropout : [],
        "dropout",
      ),
      billed: buildItems(
        Array.isArray(statusDrilldown?.billed) ? statusDrilldown.billed : [],
        "billed",
      ),
      left: buildItems(
        Array.isArray(statusDrilldown?.left) ? statusDrilldown.left : [],
        "left",
      ),
    };
  }, [
    latestStatusByResId,
    performanceSubmittedItems,
    statusDrilldown,
    submittedResumes,
  ]);
  const teamLeaderMetricMap = useMemo(() => {
    const baseMetrics = () => ({
      submitted: 0,
      verified: 0,
      walk_in: 0,
      shortlisted: 0,
      selected: 0,
      rejected: 0,
      joined: 0,
      dropout: 0,
      billed: 0,
      left: 0,
      on_hold: 0,
      points: 0,
    });

    const teamLeaders = data?.teamLeaders || [];
    const map = new Map();
    const teamLeaderByRid = new Map();
    const teamLeaderByName = new Map();

    for (const teamLeader of teamLeaders) {
      map.set(teamLeader.rid, {
        ...baseMetrics(),
        points: Number(teamLeader.points) || 0,
      });
      teamLeaderByRid.set(normalizeLookupKey(teamLeader.rid), teamLeader);
      teamLeaderByName.set(normalizeLookupKey(teamLeader.name), teamLeader);
    }

    const incrementFromBucket = (bucketKey, items) => {
      if (!Array.isArray(items)) return;
      for (const item of items) {
        const matchedTeamLeader =
          teamLeaderByRid.get(
            normalizeLookupKey(item?.teamLeaderRid || item?.team_leader_rid),
          ) ||
          teamLeaderByName.get(normalizeLookupKey(item?.teamLeaderName));
        if (!matchedTeamLeader) continue;

        const current = map.get(matchedTeamLeader.rid) || {
          ...baseMetrics(),
          points: Number(matchedTeamLeader.points) || 0,
        };
        current[bucketKey] = (Number(current[bucketKey]) || 0) + 1;
        current.points = Number(matchedTeamLeader.points) || 0;
        map.set(matchedTeamLeader.rid, current);
      }
    };

    incrementFromBucket("submitted", statusItemsByStatus.submitted);
    incrementFromBucket("verified", statusItemsByStatus.verified);
    incrementFromBucket("walk_in", statusItemsByStatus.walk_in);
    incrementFromBucket("shortlisted", statusItemsByStatus.shortlisted);
    incrementFromBucket("selected", statusItemsByStatus.selected);
    incrementFromBucket("rejected", statusItemsByStatus.rejected);
    incrementFromBucket("joined", statusItemsByStatus.joined);
    incrementFromBucket("dropout", statusItemsByStatus.dropout);
    incrementFromBucket("billed", statusItemsByStatus.billed);
    incrementFromBucket("left", statusItemsByStatus.left);

    return map;
  }, [data?.teamLeaders, statusItemsByStatus]);
  const selectedTeamLeaderMetrics = useMemo(() => {
    if (!selectedTeamLeader) return null;
    return (
      teamLeaderMetricMap.get(selectedTeamLeader.rid) || {
        submitted: 0,
        verified: 0,
        walk_in: 0,
        shortlisted: 0,
        selected: 0,
        rejected: 0,
        joined: 0,
        dropout: 0,
        billed: 0,
        left: 0,
        on_hold: 0,
        points: Number(selectedTeamLeader.points) || 0,
      }
    );
  }, [selectedTeamLeader, teamLeaderMetricMap]);
  const drilldownKey = selectedStatusKey;
  const selectedStatusItems = useMemo(() => {
    const items = statusItemsByStatus[drilldownKey] || [];

    if (PERF_DEBUG) {
      const sample = items.slice(0, 8).map((it) => ({
        resId: it.resId,
        rawTeamLeader: it.teamLeaderName ?? null,
        companyName: it.companyName ?? it.company_name ?? null,
        city: it.city ?? it.job?.city ?? null,
        jobJid: it.jobJid ?? it.job?.jobJid ?? null,
      }));

      const counts = {};
      for (const it of items) {
        const k = it.resId;
        if (!k) continue;
        counts[k] = (counts[k] || 0) + 1;
      }
      const dupResIds = Object.entries(counts)
        .filter(([, c]) => c > 1)
        .slice(0, 12)
        .map(([k, c]) => ({ resId: k, count: c }));

      console.debug("[AdminPerformance] drilldown sample", {
        selectedStatusKey,
        itemCount: items.length,
        dupResIds,
        sample,
      });
    }

    return items;
  }, [PERF_DEBUG, drilldownKey, selectedStatusKey, statusItemsByStatus]);
  const filteredSelectedStatusItems = useMemo(
    () =>
      selectedStatusItems.filter((item) =>
        matchesCandidateSearch(item, recruiterEntrySearch),
      ),
    [recruiterEntrySearch, selectedStatusItems],
  );
  const visibleSummary = useMemo(() => {
    const isSearchEmpty = !normalizeLookupKey(recruiterEntrySearch);

    const getCount = (key) => {
      const items = statusItemsByStatus[key] || [];
      if (isSearchEmpty) return items.length;
      return items.filter((item) =>
        matchesCandidateSearch(item, recruiterEntrySearch),
      ).length;
    };

    return {
      totalSubmitted: getCount("submitted"),
      totalVerified: getCount("verified"),
      totalOthers: getCount("others"),
      totalWalkIn: getCount("walk_in"),
      totalShortlisted: getCount("shortlisted"),
      totalSelected: getCount("selected"),
      totalRejected: getCount("rejected"),
      totalJoined: getCount("joined"),
      totalDropout: getCount("dropout"),
      totalBilled: getCount("billed"),
      totalLeft: getCount("left"),
    };
  }, [recruiterEntrySearch, statusItemsByStatus]);

  const selectedRecruiterStatusItems = useMemo(() => {
    const items = statusItemsByStatus[selectedStatusKey] || [];
    return items.filter((item) =>
      matchesPersonStatusItem(item, selectedRecruiter, "Recruiter"),
    );
  }, [selectedRecruiter, selectedStatusKey, statusItemsByStatus]);

  const selectedTeamLeaderStatusItems = useMemo(() => {
    const items = statusItemsByStatus[selectedStatusKey] || [];
    return items.filter((item) =>
      matchesPersonStatusItem(item, selectedTeamLeader, "Team Leader"),
    );
  }, [selectedStatusKey, selectedTeamLeader, statusItemsByStatus]);

  const handleSubmittedCardClick = async () => {
    setSelectedStatusKey("submitted");
    if (performanceSubmittedItems.length > 0) {
      setSubmittedError("");
      return;
    }
    await fetchSubmittedResumes();
  };

  useEffect(() => {
    if (selectedStatusKey !== "submitted") return;
    if (performanceSubmittedItems.length > 0) return;
    fetchSubmittedResumes();
  }, [
    selectedStatusKey,
    performanceSubmittedItems.length,
    fetchSubmittedResumes,
  ]);
  useEffect(() => {
    if (!normalizeLookupKey(recruiterEntrySearch)) return;
    if (performanceSubmittedItems.length > 0 || submittedResumes.length > 0) return;
    fetchSubmittedResumes();
  }, [
    fetchSubmittedResumes,
    performanceSubmittedItems.length,
    recruiterEntrySearch,
    submittedResumes.length,
  ]);

  const handleResumeOpen = (resId) => {
    const token = getAuthSession()?.token;
    if (!token) return;
    window.open(
      `${API_BASE_URL}/api/admin/resumes/${encodeURIComponent(resId)}/file?token=${encodeURIComponent(token)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const openActionModal = (item, targetStatus) => {
    setActionModalItem(item);
    setActionTarget(targetStatus);
    setActionReason("");
    setActionContacted("Yes");
    setActionSituation("");
    setActionJoiningDate("");
    setActionJoiningNote("");
    setActionRevenue("");
    setActionAttachmentFile(null);
    setActionError("");
  };

  const closeActionModal = () => {
    if (actionSubmitting) return;
    setActionModalItem(null);
    setActionTarget("");
    setActionReason("");
    setActionContacted("Yes");
    setActionSituation("");
    setActionJoiningDate("");
    setActionJoiningNote("");
    setActionRevenue("");
    setActionAttachmentFile(null);
    setActionError("");
  };

  const ensureBilledIntakeEntry = async ({
    resId,
    amount,
    reason,
    attachmentFile,
  }) => {
    const marker = `[BILLED:${resId}]`;
    const revenueResponse = await fetch(`${API_BASE_URL}/api/admin/revenue`, {
      headers: getAdminHeaders(),
    });
    const revenueJson = await readJsonResponse(
      revenueResponse,
      "Failed to read revenue entries while syncing billed intake.",
    );
    if (!revenueResponse.ok) {
      throw new Error(
        revenueJson?.message || "Failed to verify existing revenue entries.",
      );
    }

    const existingEntries = Array.isArray(revenueJson?.entries)
      ? revenueJson.entries
      : [];
    const alreadyRecorded = existingEntries.some((entry) => {
      const entryReason = String(entry?.reason || "")
        .trim()
        .toLowerCase();
      const entryType = String(entry?.entryType || "")
        .trim()
        .toLowerCase();
      return entryType === "intake" && entryReason.includes(marker.toLowerCase());
    });
    if (alreadyRecorded) return;

    const payload = new FormData();
    payload.append("entryType", "intake");
    payload.append("amount", String(Math.trunc(amount)));
    payload.append("reasonCategory", "others");
    payload.append(
      "otherReason",
      `${marker} ${reason?.trim() || "Candidate moved to billed"}`,
    );
    if (attachmentFile) {
      payload.append("photo", attachmentFile);
    }

    const createResponse = await fetch(`${API_BASE_URL}/api/admin/revenue/entries`, {
      method: "POST",
      headers: getAdminHeaders(),
      body: payload,
    });
    const createJson = await readJsonResponse(
      createResponse,
      "Failed to read billed intake sync response.",
    );
    if (!createResponse.ok) {
      throw new Error(createJson?.error || createJson?.message || "Failed to add billed intake entry.");
    }
  };

  const handleAdminAdvanceStatus = async () => {
    if (!actionModalItem || !actionTarget) return;
    const currentStatus = normalizeStatus(actionModalItem.status);
    const normalizedTarget = normalizeStatus(actionTarget);
    const allowedTargets = ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!allowedTargets.includes(normalizedTarget)) {
      setActionError(
        `Frontend blocked an invalid transition from '${currentStatus || "unknown"}' to '${normalizedTarget}'. Refresh the table if this row looks stale.`,
      );
      return;
    }
    const normalizedReason = actionReason.trim();
    if (
      actionTarget === "selected" &&
      !String(actionJoiningDate || "").trim()
    ) {
      setActionError("Please provide a joining date.");
      return;
    }
    if (actionTarget === "others" && !normalizedReason) {
      setActionError("Please provide a reason for Others status.");
      return;
    }
    if (actionTarget === "joined") {
      const revStr = String(actionRevenue || "").trim();
      if (!revStr) {
        setActionError("Please provide the revenue amount.");
        return;
      }
      const revNum = Number(revStr);
      if (!Number.isFinite(revNum) || revNum <= 0 || !Number.isInteger(revNum)) {
        setActionError("Revenue must be a positive integer.");
        return;
      }
    }
    if (actionTarget === "billed") {
      const disableReason = getConfirmBilledDisabledReason(
        actionModalItem,
        actionAttachmentFile,
      );
      if (disableReason) {
        setActionError(disableReason);
        return;
      }
      if (!actionAttachmentFile) {
        setActionError("photo PDF attachment is required for billed status.");
        return;
      }
      const fileType = String(actionAttachmentFile.type || "").toLowerCase();
      if (fileType !== "application/pdf") {
        setActionError("Only PDF attachments are allowed for billed status.");
        return;
      }
      if (actionAttachmentFile.size > 8 * 1024 * 1024) {
        setActionError("Billed attachment must be 8MB or smaller.");
        return;
      }
    }
    setActionSubmitting(true);
    setActionError("");
    try {
      if (actionTarget === "walk_in" && actionContacted === "No") {
        await updateTeamLeaderNote(
          actionModalItem.resId,
          `[Not Contacted] ${actionSituation}`
        );
        closeActionModal();
        await fetchPerformance();
        await fetchSubmittedResumes();
        return;
      }

      const payload =
        actionTarget === "billed" && actionAttachmentFile
          ? buildBilledFormData(actionModalItem, actionAttachmentFile)
          : {
              status: actionTarget,
              ...buildCandidatePayloadAliases(actionModalItem),
              ...(!["selected"].includes(actionTarget)
                ? {
                    reason: normalizedReason || null,
                    ...(actionTarget === "others"
                      ? { othersReason: normalizedReason || null, others_reason: normalizedReason || null }
                      : {}),
                  }
                : {}),
              ...(actionTarget === "selected"
                ? {
                    selection_reason: normalizedReason || null,
                    select_reason: normalizedReason || null,
                    selectReason: normalizedReason || null,
                  }
                : {}),
              ...((actionTarget === "selected" || actionTarget === "joined") &&
              actionJoiningDate
                ? { joining_date: actionJoiningDate }
                : {}),
              ...(actionTarget === "joined" && actionJoiningNote.trim()
                ? {
                    joining_note: actionJoiningNote.trim(),
                    joined_reason: actionJoiningNote.trim(),
                  }
                : {}),
              ...(actionTarget === "joined" && String(actionRevenue || "").trim()
                ? { revenue: Number(String(actionRevenue).trim()) }
                : {}),
            };

      const advanceResponse = await adminAdvanceStatus(
        actionModalItem.resId,
        payload,
      );
      setStatusOverrides((prev) => ({
        ...prev,
        [String(actionModalItem.resId)]: normalizedTarget,
      }));
      let intakeSyncWarning = "";
      if (actionTarget === "billed") {
        const syncRevenueAmount = getExistingRevenueAmount(
          advanceResponse?.resume ||
            advanceResponse?.candidate ||
            advanceResponse ||
            actionModalItem,
        );
        try {
          if (syncRevenueAmount <= 0) {
            throw new Error(
              "Revenue amount was not returned after moving the candidate to billed.",
            );
          }
          await ensureBilledIntakeEntry({
            resId: actionModalItem.resId,
            amount: syncRevenueAmount,
            reason: "",
            attachmentFile: actionAttachmentFile,
          });
        } catch (syncError) {
          intakeSyncWarning = `Candidate moved to billed, but intake sync failed: ${syncError.message || "unknown error"}`;
        }
      }
      closeActionModal();
      await fetchPerformance();
      await fetchSubmittedResumes();
      if (intakeSyncWarning) {
        window.alert(intakeSyncWarning);
      }
    } catch (err) {
      setActionError(err.message || "Failed to advance status.");
    } finally {
      setActionSubmitting(false);
    }
  };

  const selectedStatusRank = getStatusRank(selectedStatusKey);

  const getRowActionState = useCallback(
    (item) => {
      const effectiveStatus = normalizeStatus(item?.status);
      const effectiveRank = getStatusRank(effectiveStatus);
      const isPreviousStageView =
        selectedStatusRank >= 0 &&
        effectiveRank >= 0 &&
        selectedStatusRank < effectiveRank;

      if (isPreviousStageView) {
        return { availableActions: [], canRollback: false };
      }

      return {
        availableActions: ADMIN_ACTIONS_BY_STATUS[effectiveStatus] || [],
        canRollback: ROLLBACKABLE_ADMIN_STATUSES.has(effectiveStatus),
      };
    },
    [selectedStatusRank],
  );

  const hasAnyRowActions = useMemo(
    () =>
      filteredSelectedStatusItems.some((item) => {
        const rowActionState = getRowActionState(item);
        return rowActionState.availableActions.length > 0 || rowActionState.canRollback;
      }),
    [filteredSelectedStatusItems, getRowActionState],
  );

  const handleAdminRollback = async (item) => {
    if (!item?.resId) return;
    const currentStatus = normalizeStatus(item.status);
    const confirmed = window.confirm(
      `Rollback ${item.candidateName || item.name || item.resId} from ${formatStatusLabel(item.status)} to the previous stage?`,
    );
    if (!confirmed) return;

    try {
      await adminRollbackStatus(item.resId);
      const rollbackTarget = resolveRollbackTargetStatus(item);
      if (rollbackTarget) {
        setStatusOverrides((prev) => ({
          ...prev,
          [String(item.resId)]: rollbackTarget,
        }));
      }
      await fetchPerformance();
      await fetchSubmittedResumes();
    } catch (err) {
      window.alert(err.message || "Failed to rollback resume status.");
    }
  };

  const closeDeleteModal = () => {
    if (deleteDeleting) return;
    setDeleteTarget(null);
    setDeleteError("");
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget?.rid) return;
    setDeleteDeleting(true);
    setDeleteError("");
    try {
      await adminDeleteRecruiter(deleteTarget.rid);
      closeDeleteModal();
      fetchPerformance();
    } catch (err) {
      setDeleteError(err.message || "Failed to delete.");
    } finally {
      setDeleteDeleting(false);
    }
  };

  const closeStatusModal = () => {
    if (statusSubmitting) return;
    setStatusTarget(null);
    setStatusError("");
  };

  const handleStatusConfirm = async () => {
    if (!statusTarget?.rid || !statusTarget?.nextStatus) return;
    setStatusSubmitting(true);
    setStatusError("");
    try {
      await adminUpdateRecruiterAccountStatus(
        statusTarget.rid,
        statusTarget.nextStatus,
      );
      setData((prev) => {
        if (!prev) return prev;
        const applyStatus = (items) =>
          Array.isArray(items)
            ? items.map((item) =>
                item.rid === statusTarget.rid
                  ? { ...item, accountStatus: statusTarget.nextStatus }
                  : item,
              )
            : items;
        return {
          ...prev,
          teamLeaders: applyStatus(prev.teamLeaders),
          recruiters: applyStatus(prev.recruiters),
        };
      });
      closeStatusModal();
      await fetchPerformance();
    } catch (err) {
      setStatusError(err.message || "Failed to update account status.");
    } finally {
      setStatusSubmitting(false);
    }
  };

  const renderPersonMetrics = (person, metrics, roleLabel, personStatusItems) => {
    if (!person || !metrics) return null;

    return (
      <div className="perf-person-detail">
        <div className="perf-person-detail-head">
          <div>
            <p className="perf-person-detail-kicker">{roleLabel} Performance</p>
            <h3 className="perf-section-title" style={{ marginBottom: "0.35rem" }}>
              {person.name || person.rid}
            </h3>
            <p className="admin-muted" style={{ margin: 0 }}>
              {person.email || "Email not available"}
            </p>
          </div>
        </div>

        <div className="perf-summary-grid" style={{ marginBottom: 0 }}>
          {PERSON_METRIC_CARDS.map((card) => (
            <button
              key={`${roleLabel}-${person.rid}-${card.key}`}
              type="button"
              className={`perf-stat-card ${
                card.key === "points"
                  ? `perf-stat-card-${card.tone}`
                  : `perf-stat-card-button perf-stat-card-${card.tone}${
                      selectedStatusKey === card.key ? " perf-stat-card-active" : ""
                    }`
              }`}
              onClick={
                card.key === "points"
                  ? undefined
                  : card.key === "submitted"
                    ? handleSubmittedCardClick
                    : () => setSelectedStatusKey(card.key)
              }
              disabled={card.key === "points"}
            >
              <span className="perf-stat-label">{card.label}</span>
              <span className="perf-stat-value">{metrics[card.key] ?? 0}</span>
            </button>
          ))}
        </div>

        <div className="perf-section" style={{ marginTop: "24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <h3 className="perf-section-title" style={{ marginBottom: 0 }}>
              {selectedStatusKey === "submitted"
                ? "Submitted Resume List"
                : `${formatStatusLabel(selectedStatusKey)} Resume List`}
            </h3>
            <span className="admin-muted">
              {personStatusItems.length} item
              {personStatusItems.length === 1 ? "" : "s"}
            </span>
          </div>
          {personStatusItems.length > 0 ? (
            <div className="admin-table-wrap" style={{ marginTop: "16px" }}>
              <table className="admin-table admin-table-wide">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Recruiter</th>
                    <th>Team Leader</th>
                    <th>Contact Number</th>
                    <th>Job ID</th>
                    <th>Company Name</th>
                    <th>City</th>
                    <th>Resume File</th>
                    <th>Status</th>
                    {selectedStatusKey === "walk_in" && <th>Walk-in Date</th>}
                    {[
                      "dropout",
                      "selected",
                      "joined",
                      "billed",
                      "left",
                    ].includes(selectedStatusKey) && (
                      <th>
                        {selectedStatusKey === "dropout"
                          ? "Dropout Reason"
                          : selectedStatusKey === "selected"
                            ? "Joining Date"
                            : "Joining Info"}
                      </th>
                    )}
                    {hasAnyRowActions && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {personStatusItems.map((item) => {
                    const rowActionState = getRowActionState(item);
                    const rowHasActions =
                      rowActionState.availableActions.length > 0 ||
                      rowActionState.canRollback;
                    return (
                      <tr key={`${roleLabel}-${selectedStatusKey}-${item.resId}`}>
                        <td>
                          <strong>{getCandidateDisplayName(item)}</strong>
                        </td>
                        <td>
                          <strong>{item.recruiterName || "N/A"}</strong>
                          <div className="admin-muted">
                            {item.recruiterRid || "N/A"}
                          </div>
                        </td>
                        <td>{item.teamLeaderName || "N/A"}</td>
                        <td>
                          {item.candidatePhone || item.phone ? (
                            <a href={`tel:${item.candidatePhone || item.phone}`}>
                              {item.candidatePhone || item.phone}
                            </a>
                          ) : (
                            "N/A"
                          )}
                        </td>
                        <td>{item.jobJid ?? "N/A"}</td>
                        <td>{formatResumeCompanyDisplay(item) || "N/A"}</td>
                        <td>{item.city || item.job?.city || "N/A"}</td>
                        <td>
                          <button
                            type="button"
                            className="admin-refresh-btn"
                            onClick={() => handleResumeOpen(item.resId)}
                          >
                            {item.resumeFilename || item.resId || "View resume"}
                          </button>
                        </td>
                        <td>{formatStatusLabel(item.status)}</td>
                        {selectedStatusKey === "walk_in" && (
                          <td>{item.walkInReason || formatDate(item.walkInDate)}</td>
                        )}
                        {[
                          "dropout",
                          "selected",
                          "joined",
                          "billed",
                          "left",
                        ].includes(selectedStatusKey) && (
                          <td>
                            {selectedStatusKey === "dropout" ? (
                              item.dropoutReason || item.reason || "Not set"
                            ) : selectedStatusKey === "selected" ? (
                              formatDate(item.joiningDate)
                            ) : item.joiningDate ||
                              item.joiningNote ||
                              item.joinedReason ? (
                              <>
                                {item.joiningDate ? (
                                  <div>
                                    <strong>Date:</strong>{" "}
                                    {formatDate(item.joiningDate)}
                                  </div>
                                ) : null}
                                {item.joiningNote || item.joinedReason ? (
                                  <div>
                                    <strong>Note:</strong>{" "}
                                    {item.joiningNote || item.joinedReason}
                                  </div>
                                ) : null}
                              </>
                            ) : (
                              "Not set"
                            )}
                          </td>
                        )}
                        {hasAnyRowActions && (
                          <td>
                            {rowHasActions ? (
                              <div
                                style={{
                                  display: "flex",
                                  gap: "6px",
                                  flexWrap: "wrap",
                                }}
                              >
                                {rowActionState.availableActions.map((action) => (
                                  <button
                                    key={action.value}
                                    type="button"
                                    className="admin-refresh-btn"
                                    style={{
                                      backgroundColor: action.color,
                                      color: "#fff",
                                      border: "none",
                                    }}
                                    onClick={() =>
                                      openActionModal(item, action.value)
                                    }
                                  >
                                    {action.label}
                                  </button>
                                ))}
                                {rowActionState.canRollback && (
                                  <button
                                    type="button"
                                    className="admin-refresh-btn"
                                    style={{
                                      backgroundColor: "#111827",
                                      color: "#fff",
                                      border: "none",
                                    }}
                                    onClick={() => handleAdminRollback(item)}
                                  >
                                    Rollback
                                  </button>
                                )}
                              </div>
                            ) : null}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : selectedStatusKey === "submitted" && submittedLoading ? (
            <p className="admin-chart-empty" style={{ marginTop: "16px" }}>
              Loading submitted resumes...
            </p>
          ) : selectedStatusKey === "submitted" && submittedError ? (
            <div
              className="admin-alert admin-alert-error"
              style={{ marginTop: "16px" }}
            >
              {submittedError}
            </div>
          ) : (
            <p className="admin-chart-empty" style={{ marginTop: "16px" }}>
              No resumes found for {formatStatusLabel(selectedStatusKey)}.
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <AdminLayout
      title="Performance Dashboard"
      subtitle="Track recruiter and team leader performance across all metrics."
      setCurrentPage={setCurrentPage}
      actions={
        <button
          type="button"
          className="admin-refresh-btn"
          onClick={fetchPerformance}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      }
    >
      {error && <div className="admin-alert admin-alert-error">{error}</div>}

      {/* Timeline filter */}
      <div className="perf-timeline-bar">
        <div className="perf-timeline-presets">
          {[
            { key: PRESETS.TODAY, label: "Today" },
            { key: PRESETS.YESTERDAY, label: "Yesterday" },
            { key: PRESETS.THIS_MONTH, label: "This Month" },
            { key: PRESETS.LAST_MONTH, label: "Last Month" },
            { key: PRESETS.CUSTOM, label: "Custom" },
          ].map((p) => (
            <button
              key={p.key}
              type="button"
              className={`perf-timeline-btn${timelinePreset === p.key ? " perf-timeline-btn-active" : ""}`}
              onClick={() => setTimelinePreset(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {timelinePreset === PRESETS.CUSTOM && (
          <div className="perf-timeline-custom">
            <label className="perf-timeline-input">
              From
              <input
                type="date"
                value={customStart}
                max={customEnd || undefined}
                onChange={(e) => setCustomStart(e.target.value)}
              />
            </label>
            <label className="perf-timeline-input">
              To
              <input
                type="date"
                value={customEnd}
                min={customStart || undefined}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
            </label>
          </div>
        )}

        {dateRange && (
          <p className="perf-timeline-label">
            Showing: <strong>{formatLabel(timelinePreset)}</strong>
            {" — "}
            {dateRange.start === dateRange.end
              ? dateRange.start
              : `${dateRange.start} to ${dateRange.end}`}
          </p>
        )}
      </div>

      {/* Tab navigation */}
      <div className="perf-tabs">
        {[
          { key: TABS.OVERVIEW, label: "Overview" },
          { key: TABS.TEAM_LEADERS, label: "Team Leaders" },
          { key: TABS.RECRUITERS, label: "Recruiters" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`perf-tab${activeTab === tab.key ? " perf-tab-active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ──────────────────────────────────────── */}
      {activeTab === TABS.OVERVIEW && (
        <div className="perf-overview">
          <div className="perf-summary-grid">
            <button
              type="button"
              className={`perf-stat-card perf-stat-card-button perf-stat-card-submitted${selectedStatusKey === "submitted" ? " perf-stat-card-active" : ""}`}
              onClick={handleSubmittedCardClick}
            >
              <span className="perf-stat-label">Resumes Submitted</span>
              <span className="perf-stat-value">
                {visibleSummary.totalSubmitted ?? 0}
              </span>
            </button>
            {STATUS_CARDS.map((card) => (
              <button
                key={card.key}
                type="button"
                className={`perf-stat-card perf-stat-card-button perf-stat-card-${card.tone}${selectedStatusKey === card.key ? " perf-stat-card-active" : ""}`}
                onClick={() => setSelectedStatusKey(card.key)}
              >
                <span className="perf-stat-label">{card.label}</span>
                <span className="perf-stat-value">
                  {visibleSummary[card.summaryKey] ?? 0}
                </span>
              </button>
            ))}
          </div>

          <div className="perf-section">
            <div className="perf-inline-search">
              <input
                type="text"
                className="perf-search perf-search-wide"
                placeholder="Search by candidate name or phone..."
                value={recruiterEntrySearch}
                onChange={(e) => setRecruiterEntrySearch(e.target.value)}
              />
              {normalizeLookupKey(recruiterEntrySearch) ? (
                <button
                  type="button"
                  className="admin-back-btn"
                  onClick={() => setRecruiterEntrySearch("")}
                >
                  Clear
                </button>
              ) : null}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <h3 className="perf-section-title" style={{ marginBottom: 0 }}>
                {selectedStatusKey === "submitted"
                  ? "Submitted Resume List"
                  : `${formatStatusLabel(selectedStatusKey)} Resume List`}
              </h3>
              <span className="admin-muted">
                {filteredSelectedStatusItems.length} item
                {filteredSelectedStatusItems.length === 1 ? "" : "s"}
              </span>
            </div>
            {filteredSelectedStatusItems.length > 0 ? (
              <div className="admin-table-wrap" style={{ marginTop: "16px" }}>
                <table className="admin-table admin-table-wide">
                  <thead>
                    <tr>
                      <th>Candidate Name</th>
                      <th>Recruiter</th>
                      <th>Contact Number</th>
                      <th>Job ID</th>
                      <th>Company Name</th>
                      <th>City</th>
                      <th>Resume File</th>
                      <th>Status</th>
                      {selectedStatusKey === "walk_in" && <th>Walk-in Date</th>}
                      {["selected", "joined", "billed", "left"].includes(selectedStatusKey) && (
                        <th>Joining Date</th>
                      )}
                      <th>Note / Reason</th>
                      {hasAnyRowActions && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSelectedStatusItems.map((item) => {
                      const rowActionState = getRowActionState(item);
                      const rowHasActions =
                        rowActionState.availableActions.length > 0 ||
                        rowActionState.canRollback;
                      return (
                      <tr
                        key={`${selectedStatusKey}-${item.resId}`}
                        style={{
                          backgroundColor:
                            selectedStatusKey === "verified" &&
                            item.verifiedReason &&
                            item.verifiedReason.includes("[Not Contacted]")
                              ? "lightpink"
                              : "inherit",
                        }}
                      >
                        <td>
                          <strong>{getCandidateDisplayName(item)}</strong>
                        </td>
                        <td>
                          <strong>{item.recruiterName || "N/A"}</strong>
                          <div className="admin-muted">
                            {item.recruiterRid || "N/A"}
                          </div>
                        </td>
                        <td>
                          {item.candidatePhone || item.phone ? (
                            <a
                              href={`tel:${item.candidatePhone || item.phone}`}
                            >
                              {item.candidatePhone || item.phone}
                            </a>
                          ) : (
                            "N/A"
                          )}
                        </td>
                        <td>{item.jobJid ?? "N/A"}</td>
                        <td>{formatResumeCompanyDisplay(item) || "N/A"}</td>
                        <td>{item.city || item.job?.city || "N/A"}</td>
                        <td>
                          <button
                            type="button"
                            className="admin-refresh-btn"
                            onClick={() => handleResumeOpen(item.resId)}
                          >
                            {item.resumeFilename || item.resId || "View resume"}
                          </button>
                        </td>
                        <td>{formatStatusLabel(item.status)}</td>
                        {selectedStatusKey === "walk_in" && (
                          <td>{formatDate(item.walkInDate)}</td>
                        )}
                        {["selected", "joined", "billed", "left"].includes(selectedStatusKey) && (
                          <td>{item.joiningDate ? formatDate(item.joiningDate) : "Not set"}</td>
                        )}
                        <td>
                          {getLatestPerformanceNote(item)}
                        </td>
                        {hasAnyRowActions && (
                          <td>
                            {rowHasActions ? (
                              <div
                                style={{
                                  display: "flex",
                                  gap: "6px",
                                  flexWrap: "wrap",
                                }}
                              >
                                {rowActionState.availableActions.map((action) => (
                                  <button
                                    key={action.value}
                                    type="button"
                                    className="admin-refresh-btn"
                                    style={{
                                      backgroundColor: action.color,
                                      color: "#fff",
                                      border: "none",
                                    }}
                                    onClick={() =>
                                      openActionModal(item, action.value)
                                    }
                                  >
                                    {action.label}
                                  </button>
                                ))}
                                {rowActionState.canRollback && (
                                  <button
                                    type="button"
                                    className="admin-refresh-btn"
                                    style={{
                                      backgroundColor: "#111827",
                                      color: "#fff",
                                      border: "none",
                                    }}
                                    onClick={() => handleAdminRollback(item)}
                                  >
                                    Rollback
                                  </button>
                                )}
                              </div>
                            ) : null}
                          </td>
                        )}
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : selectedStatusKey === "submitted" && submittedLoading ? (
              <p className="admin-chart-empty" style={{ marginTop: "16px" }}>
                Loading submitted resumes...
              </p>
            ) : selectedStatusKey === "submitted" && submittedError ? (
              <div
                className="admin-alert admin-alert-error"
                style={{ marginTop: "16px" }}
              >
                {submittedError}
              </div>
            ) : (
              <p className="admin-chart-empty" style={{ marginTop: "16px" }}>
                {normalizeLookupKey(recruiterEntrySearch)
                  ? `No resumes found for recruiter "${recruiterEntrySearch.trim()}" in ${selectedStatusKey === "submitted" ? "Resumes Submitted" : formatStatusLabel(selectedStatusKey)}.`
                  : `No resumes found for ${selectedStatusKey === "submitted" ? "Resumes Submitted" : formatStatusLabel(selectedStatusKey)}.`}
              </p>
            )}
          </div>

          {/* Top 5 recruiters by submissions */}
          <div className="perf-section">
            <h3 className="perf-section-title">
              Top Recruiters by Submissions
            </h3>
            {(data?.recruiters || []).length > 0 ? (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Submitted</th>
                      <th>Verified</th>
                      <th>Walk-in</th>
                      <th>Shortlisted</th>
                      <th>Selected</th>
                      <th>Joined</th>
                      <th>Billed</th>
                      <th>Left</th>
                      <th>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.recruiters || []).slice(0, 5).map((r, i) => (
                      <tr key={r.rid}>
                        <td>{i + 1}</td>
                        <td>{r.name}</td>
                        <td>{r.submitted}</td>
                        <td>{r.verified}</td>
                        <td>{r.walk_in}</td>
                        <td>{r.shortlisted ?? 0}</td>
                        <td>{r.selected}</td>
                        <td>{r.joined}</td>
                        <td>{r.billed ?? 0}</td>
                        <td>{r.left ?? 0}</td>
                        <td>{r.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="admin-chart-empty">No recruiter data yet.</p>
            )}
          </div>

          {/* Top team leaders by jobs created */}
          <div className="perf-section">
            <h3 className="perf-section-title">
              Top Team Leaders by Jobs Created
            </h3>
            {(data?.teamLeaders || []).length > 0 ? (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Jobs Created</th>
                      <th>Open</th>
                      <th>Restricted</th>
                      <th>Total Positions</th>
                      <th>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.teamLeaders || []).slice(0, 5).map((tl, i) => (
                      <tr key={tl.rid}>
                        <td>{i + 1}</td>
                        <td>{tl.name}</td>
                        <td>{tl.jobsCreated}</td>
                        <td>{tl.openJobs}</td>
                        <td>{tl.restrictedJobs}</td>
                        <td>{tl.totalPositions}</td>
                        <td>{tl.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="admin-chart-empty">No team leader data yet.</p>
            )}
          </div>
        </div>
      )}

      {/* ── Team Leaders Tab ──────────────────────────────────── */}
      {activeTab === TABS.TEAM_LEADERS && (
        <div className="perf-section">
          <div className="perf-toolbar">
            <input
              type="text"
              className="perf-search"
              placeholder="Search team leaders by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {selectedTeamLeader ? (
            <>
              <div className="perf-person-actions">
                <button
                  type="button"
                  className="admin-back-btn"
                  onClick={() => setSelectedTeamLeaderRid("")}
                >
                  Back to Team Leaders
                </button>
              </div>
              {renderPersonMetrics(
                selectedTeamLeader,
                selectedTeamLeaderMetrics,
                "Team Leader",
                selectedTeamLeaderStatusItems,
              )}
            </>
          ) : filteredTLs.length > 0 ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTLs.map((tl) => (
                    <tr key={tl.rid}>
                      <td>
                        <button
                          type="button"
                          className="perf-person-link"
                          onClick={() => setSelectedTeamLeaderRid(tl.rid)}
                        >
                          {tl.name || tl.rid}
                        </button>
                      </td>
                      <td>{tl.email || "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="admin-chart-empty">
              {searchTerm
                ? "No team leaders match your search."
                : "No team leaders found."}
            </p>
          )}
        </div>
      )}

      {/* ── Recruiters Tab ──────────────────────────────────── */}
      {activeTab === TABS.RECRUITERS && (
        <div className="perf-section">
          <div className="perf-toolbar">
            <input
              type="text"
              className="perf-search"
              placeholder="Search recruiters by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {selectedRecruiter ? (
            <>
              <div className="perf-person-actions">
                <button
                  type="button"
                  className="admin-back-btn"
                  onClick={() => setSelectedRecruiterRid("")}
                >
                  Back to Recruiters
                </button>
              </div>
              {renderPersonMetrics(
                selectedRecruiter,
                selectedRecruiter,
                "Recruiter",
                selectedRecruiterStatusItems,
              )}
            </>
          ) : filteredRecruiters.length > 0 ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th
                      className="perf-sortable"
                      onClick={() => handleSort("name")}
                    >
                      Name{sortIndicator("name")}
                    </th>
                    <th>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecruiters.map((r) => (
                    <tr key={r.rid}>
                      <td>
                        <button
                          type="button"
                          className="perf-person-link"
                          onClick={() => setSelectedRecruiterRid(r.rid)}
                        >
                          {r.name || r.rid}
                        </button>
                      </td>
                      <td>{r.email || "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="admin-chart-empty">
              {searchTerm
                ? "No recruiters match your search."
                : "No recruiters found."}
            </p>
          )}
        </div>
      )}

      {statusTarget ? (
        <div
          className="admin-modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={closeStatusModal}
        >
          <div
            className="admin-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: "10px" }}>
              {statusTarget.nextStatus === "inactive"
                ? "Deactivate profile"
                : "Activate profile"}
            </h3>
            <p style={{ margin: 0, color: "#475569", lineHeight: 1.55 }}>
              {statusTarget.nextStatus === "inactive"
                ? `Do you want to deactivate this profile for ${statusTarget.name || statusTarget.rid}?`
                : `Do you want to activate this profile for ${statusTarget.name || statusTarget.rid}?`}
            </p>
            <p style={{ margin: "10px 0 0", color: "#64748b", fontSize: "0.9rem" }}>
              {statusTarget.nextStatus === "inactive"
                ? "Confirm will replace the current password with a random value."
                : "Confirm will reset the password to 12345678."}
            </p>
            {statusError ? (
              <p
                style={{
                  marginTop: "12px",
                  color: "#b91c1c",
                  fontSize: "0.92rem",
                }}
              >
                {statusError}
              </p>
            ) : null}
            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-back-btn"
                onClick={closeStatusModal}
                disabled={statusSubmitting}
              >
                No
              </button>
              <button
                type="button"
                className={`admin-back-btn ${
                  statusTarget.nextStatus === "inactive"
                    ? "admin-deactivate-btn"
                    : "admin-activate-btn"
                }`}
                onClick={handleStatusConfirm}
                disabled={statusSubmitting}
              >
                {statusSubmitting ? "Saving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Delete confirmation modal */}
      {deleteTarget ? (
        <div
          className="admin-modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={closeDeleteModal}
        >
          <div
            className="admin-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{ marginTop: 0, marginBottom: "10px", color: "#dc2626" }}
            >
              Delete {deleteTarget.role}
            </h3>
            <p style={{ margin: "0 0 8px" }}>
              Are you sure you want to permanently delete{" "}
              <strong>{deleteTarget.name}</strong> ({deleteTarget.rid})?
            </p>
            <p className="admin-muted" style={{ margin: "0 0 8px" }}>
              Email: {deleteTarget.email || "N/A"}
            </p>
            <p
              style={{ margin: "0 0 12px", color: "#b91c1c", fontWeight: 600 }}
            >
              This will permanently remove this user and all their associated
              data including resumes, phone numbers, attendance records, and
              performance history. This action cannot be undone.
            </p>
            {deleteError ? (
              <div
                className="admin-alert admin-alert-error"
                style={{ marginBottom: "10px" }}
              >
                {deleteError}
              </div>
            ) : null}
            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-back-btn"
                onClick={closeDeleteModal}
                disabled={deleteDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-refresh-btn"
                style={{ backgroundColor: "#dc2626", border: "none" }}
                onClick={handleDeleteConfirm}
                disabled={deleteDeleting}
              >
                {deleteDeleting ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Admin status action modal */}
      {actionModalItem && actionTarget ? (
        <div
          className="admin-modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={closeActionModal}
        >
          <div
            className="admin-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: "10px" }}>
              Move to {formatStatusLabel(actionTarget)}
            </h3>
            <div style={{ marginBottom: "12px" }}>
              <p className="admin-muted" style={{ margin: 0 }}>
                <strong>Candidate:</strong>{" "}
                {actionModalItem.candidateName ||
                  actionModalItem.resumeFilename ||
                  actionModalItem.resId}
              </p>
              <p className="admin-muted" style={{ margin: 0 }}>
                <strong>Job ID:</strong> {actionModalItem.jobJid ?? "N/A"}
              </p>
              <p className="admin-muted" style={{ margin: 0 }}>
                <strong>Current Status:</strong>{" "}
                {formatStatusLabel(actionModalItem.status)}
              </p>
            </div>

            {actionTarget === "selected" ? (
              <>
                <div style={{ marginBottom: "10px" }}>
                  <label
                    style={{
                      display: "block",
                      fontWeight: 600,
                      marginBottom: "4px",
                    }}
                  >
                    Tentative joining date
                  </label>
                  <input
                    type="date"
                    value={actionJoiningDate}
                    onChange={(e) => setActionJoiningDate(e.target.value)}
                    disabled={actionSubmitting}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                    }}
                  />
                </div>
                <div style={{ marginBottom: "10px" }}>
                  <label
                    style={{
                      display: "block",
                      fontWeight: 600,
                      marginBottom: "4px",
                    }}
                  >
                    Selection Reason (optional)
                  </label>
                  <textarea
                    rows={3}
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="Enter selection reason..."
                    disabled={actionSubmitting}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                      fontFamily: "inherit",
                    }}
                  />
                </div>
              </>
            ) : actionTarget === "joined" ? (
              <>
                <div style={{ marginBottom: "10px" }}>
                  <label
                    style={{
                      display: "block",
                      fontWeight: 600,
                      marginBottom: "4px",
                    }}
                  >
                    Joining Date
                  </label>
                  <input
                    type="date"
                    value={actionJoiningDate}
                    onChange={(e) => setActionJoiningDate(e.target.value)}
                    disabled={actionSubmitting}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                    }}
                  />
                </div>
                <div style={{ marginBottom: "10px" }}>
                  <label
                    style={{
                      display: "block",
                      fontWeight: 600,
                      marginBottom: "4px",
                    }}
                  >
                    Revenue Amount (integer)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={actionRevenue}
                    onChange={(e) => setActionRevenue(e.target.value)}
                    disabled={actionSubmitting}
                    placeholder="Enter revenue amount"
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                    }}
                  />
                </div>
                <div style={{ marginBottom: "10px" }}>
                  <label
                    style={{
                      display: "block",
                      fontWeight: 600,
                      marginBottom: "4px",
                    }}
                  >
                    Joining Note (optional)
                  </label>
                  <textarea
                    rows={3}
                    value={actionJoiningNote}
                    onChange={(e) => setActionJoiningNote(e.target.value)}
                    placeholder="Enter any joining notes..."
                    disabled={actionSubmitting}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                      fontFamily: "inherit",
                    }}
                  />
                </div>
              </>
            ) : actionTarget === "billed" ? (
              <>
                <div style={{ marginBottom: "10px" }}>
                  <label
                    style={{
                      display: "block",
                      fontWeight: 600,
                      marginBottom: "4px",
                    }}
                  >
                    Candidate PDF Attachment
                  </label>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) =>
                      setActionAttachmentFile(e.target.files?.[0] || null)
                    }
                    disabled={actionSubmitting}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                    }}
                  />
                  <p className="admin-muted" style={{ margin: "6px 0 0" }}>
                    This PDF will be stored as the revenue attachment in the
                    `photo` field. The existing joined revenue amount will be
                    reused automatically.
                  </p>
                </div>
              </>
            ) : actionTarget === "others" ? (
              <div style={{ marginBottom: "10px" }}>
                <label
                  style={{
                    display: "block",
                    fontWeight: 600,
                    marginBottom: "4px",
                  }}
                >
                  Others Reason <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <textarea
                  rows={4}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Describe why this candidate is in Others status..."
                  disabled={actionSubmitting}
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "4px",
                    border: actionReason.trim() ? "1px solid #ccc" : "1px solid #dc2626",
                    fontFamily: "inherit",
                  }}
                />
                {!actionReason.trim() && (
                  <p style={{ color: "#dc2626", margin: "4px 0 0", fontSize: "0.85em" }}>
                    A reason is required for Others status.
                  </p>
                )}
              </div>
            ) : actionTarget === "walk_in" ? (
              <>
                <div style={{ marginBottom: "10px" }}>
                  <label
                    style={{
                      display: "block",
                      fontWeight: 600,
                      marginBottom: "4px",
                    }}
                  >
                    Contacted to the candidate?
                  </label>
                  <select
                    value={actionContacted}
                    onChange={(e) => setActionContacted(e.target.value)}
                    disabled={actionSubmitting}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                    }}
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
                {actionContacted === "No" ? (
                  <div style={{ marginBottom: "10px" }}>
                    <label
                      style={{
                        display: "block",
                        fontWeight: 600,
                        marginBottom: "4px",
                      }}
                    >
                      Describe the situation
                    </label>
                    <textarea
                      rows={4}
                      value={actionSituation}
                      onChange={(e) => setActionSituation(e.target.value)}
                      placeholder="Describe what happened..."
                      disabled={actionSubmitting}
                      style={{
                        width: "100%",
                        padding: "8px",
                        borderRadius: "4px",
                        border: "1px solid #ccc",
                        fontFamily: "inherit",
                      }}
                    />
                  </div>
                ) : (
                  <div style={{ marginBottom: "10px" }}>
                    <label
                      style={{
                        display: "block",
                        fontWeight: 600,
                        marginBottom: "4px",
                      }}
                    >
                      Walk-in Reason (optional)
                    </label>
                    <textarea
                      rows={4}
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      placeholder="Enter reason..."
                      disabled={actionSubmitting}
                      style={{
                        width: "100%",
                        padding: "8px",
                        borderRadius: "4px",
                        border: "1px solid #ccc",
                        fontFamily: "inherit",
                      }}
                    />
                  </div>
                )}
              </>
            ) : (
              <div style={{ marginBottom: "10px" }}>
                <label
                  style={{
                    display: "block",
                    fontWeight: 600,
                    marginBottom: "4px",
                  }}
                >
                  {actionTarget === "rejected"
                    ? "Rejection Reason (optional)"
                    : actionTarget === "verified"
                      ? "Verification Note (optional)"
                      : actionTarget === "shortlisted"
                        ? "Shortlist Reason (optional)"
                        : actionTarget === "selected"
                        ? "Selection Reason (optional)"
                        : actionTarget === "dropout"
                            ? "Dropout Reason (optional)"
                            : actionTarget === "left"
                              ? "Reason for Leaving (optional)"
                              : "Reason (optional)"}
                </label>
                <textarea
                  rows={4}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Enter reason..."
                  disabled={actionSubmitting}
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "4px",
                    border: "1px solid #ccc",
                    fontFamily: "inherit",
                  }}
                />
              </div>
            )}

            {actionError ? (
              <div
                className="admin-alert admin-alert-error"
                style={{ marginBottom: "10px" }}
              >
                {actionError}
              </div>
            ) : null}

            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-back-btn"
                onClick={closeActionModal}
                disabled={actionSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-refresh-btn"
                onClick={handleAdminAdvanceStatus}
                disabled={
                  actionSubmitting ||
                  (actionTarget === "selected" &&
                    !actionJoiningDate.trim()) ||
                  (actionTarget === "joined" &&
                    !String(actionRevenue || "").trim()) ||
                  (actionTarget === "billed" && isConfirmBilledDisabled)
                }
              >
                {actionSubmitting
                  ? "Updating..."
                  : `Confirm ${formatStatusLabel(actionTarget)}`}
              </button>
            </div>
            {actionTarget === "billed" && billedDisabledReason ? (
              <p className="billed-disabled-reason">{billedDisabledReason}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </AdminLayout>
  );
}
