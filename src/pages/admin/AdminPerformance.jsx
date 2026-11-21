import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "./AdminLayout";
import TablePaginationControls from "../../components/common/TablePaginationControls";
import NoteViewButton from "../../components/common/NoteViewButton";
import useTablePagination from "../../hooks/useTablePagination";
import {
  API_BASE_URL,
  getAdminHeaders,
  readJsonResponse,
  adminAdvanceStatus,
  adminRollbackStatus,
  adminUpdateResumeNote,
  adminDeleteRecruiter,
  adminUpdateRecruiterAccountStatus,
  updateTeamLeaderNote,
  fetchAdminRecruiterResumes,
  fetchAdminRecruitersList,
  fetchAdminRecruiterTargets,
  fetchAdminRecruiterTargetsHistory,
  adminUpdateRecruiterTarget,
  adminUpdateRecruitersTargetsBulk,
  exportAdminRecruiterTargets,
} from "./adminApi";
import XLSX from "xlsx-js-style";
import { getAuthSession } from "../../auth/session";
import {
  buildCandidatePayloadAliases,
  formatQualificationDisplay,
  formatResumeCompanyDisplay,
  normalizeResumeData,
} from "../../utils/dashboardData";
import {
  formatDateInIndia,
  formatDateTimeInIndia,
  formatEventDateOrDateTime,
  parseDateTimeValue,
} from "../../utils/dateTime";
import "../../styles/admin-panel.css";
import EmployeeRankingWidget from "../../components/Recruiter/EmployeeRankingWidget";
import "../../styles/performance-dashboard.css";

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
    key: "didnt_turn_up",
    label: "Didn't Turn Up",
    summaryKey: "totalDidntTurnUp",
    tone: "orange",
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
    key: "pending",
    label: "Pending",
    summaryKey: "totalPending",
    tone: "blue",
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
  { key: "others", label: "Others", tone: "teal" },
  { key: "walk_in", label: "Verified Walk-in", tone: "green" },
  { key: "didnt_turn_up", label: "Didn't Turn Up", tone: "orange" },
  { key: "shortlisted", label: "Shortlisted", tone: "blue" },
  { key: "selected", label: "Selected", tone: "purple" },
  { key: "pending", label: "Pending", tone: "blue" },
  { key: "rejected", label: "Rejected", tone: "red" },
  { key: "joined", label: "Joined", tone: "gold" },
  { key: "dropout", label: "Dropout", tone: "pink" },
  { key: "billed", label: "Billed", tone: "teal" },
  { key: "left", label: "Left", tone: "orange" },
  { key: "on_hold", label: "On Hold", tone: "blue" },
  { key: "points", label: "Points", tone: "teal" },
];

const DOWNLOADABLE_STAGES = [
  "walk_in",
  "didnt_turn_up",
  "shortlisted",
  "selected",
  "pending",
  "rejected",
  "joined",
  "dropout",
  "billed",
  "left",
  "on_hold",
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
    { value: "others", label: "Others", color: "#0d9488" },
    { value: "didnt_turn_up", label: "Didn't Turn Up", color: "#ea580c" },
    { value: "shortlisted", label: "Shortlisted", color: "#2563eb" },
    { value: "selected", label: "Selected", color: "#9333ea" },
    { value: "pending", label: "Pending", color: "#0284c7" },
    { value: "rejected", label: "Reject", color: "#dc2626" },
    { value: "joined", label: "Joined", color: "#16a34a" },
    { value: "dropout", label: "Dropout", color: "#db2777" },
    { value: "billed", label: "Billed", color: "#0d9488" },
    { value: "left", label: "Left", color: "#f97316" },
  ],
  didnt_turn_up: [
    { value: "walk_in", label: "Walk In", color: "#ca8a04" },
    { value: "others", label: "Others", color: "#0d9488" },
    { value: "shortlisted", label: "Shortlisted", color: "#2563eb" },
    { value: "selected", label: "Selected", color: "#9333ea" },
    { value: "pending", label: "Pending", color: "#0284c7" },
    { value: "rejected", label: "Reject", color: "#dc2626" },
    { value: "joined", label: "Joined", color: "#16a34a" },
    { value: "dropout", label: "Dropout", color: "#db2777" },
    { value: "billed", label: "Billed", color: "#0d9488" },
    { value: "left", label: "Left", color: "#f97316" },
  ],
  shortlisted: [
    { value: "selected", label: "Selected", color: "#9333ea" },
    { value: "pending", label: "Pending", color: "#0284c7" },
    { value: "rejected", label: "Reject", color: "#dc2626" },
    { value: "joined", label: "Joined", color: "#16a34a" },
    { value: "dropout", label: "Dropout", color: "#db2777" },
    { value: "billed", label: "Billed", color: "#0d9488" },
    { value: "left", label: "Left", color: "#f97316" },
  ],
  selected: [
    { value: "pending", label: "Pending", color: "#0284c7" },
    { value: "rejected", label: "Reject", color: "#dc2626" },
    { value: "joined", label: "Joined", color: "#16a34a" },
    { value: "dropout", label: "Dropout", color: "#db2777" },
    { value: "billed", label: "Billed", color: "#0d9488" },
    { value: "left", label: "Left", color: "#f97316" },
  ],
  pending: [
    { value: "selected", label: "Selected", color: "#9333ea" },
    { value: "rejected", label: "Reject", color: "#dc2626" },
    { value: "joined", label: "Joined", color: "#16a34a" },
    { value: "dropout", label: "Dropout", color: "#db2777" },
    { value: "billed", label: "Billed", color: "#0d9488" },
    { value: "left", label: "Left", color: "#f97316" },
  ],
  rejected: [
    { value: "joined", label: "Joined", color: "#16a34a" },
    { value: "dropout", label: "Dropout", color: "#db2777" },
    { value: "billed", label: "Billed", color: "#0d9488" },
    { value: "left", label: "Left", color: "#f97316" },
  ],
  joined: [
    { value: "dropout", label: "Dropout", color: "#db2777" },
    { value: "billed", label: "Billed", color: "#0d9488" },
    { value: "left", label: "Left", color: "#f97316" },
  ],
  dropout: [
    { value: "joined", label: "Joined", color: "#16a34a" },
    { value: "billed", label: "Billed", color: "#0d9488" },
    { value: "left", label: "Left", color: "#f97316" },
  ],
  billed: [
    { value: "left", label: "Left", color: "#f97316" },
    { value: "dropout", label: "Dropout", color: "#db2777" },
  ],
  left: [
    { value: "joined", label: "Joined", color: "#16a34a" },
    { value: "billed", label: "Billed", color: "#0d9488" },
    { value: "dropout", label: "Dropout", color: "#db2777" },
  ],
};

const ROLLBACKABLE_ADMIN_STATUSES = new Set([
  "others",
  "verified",
  "walk_in",
  "didnt_turn_up",
  "selected",
  "pending",
  "rejected",
  "shortlisted",
  "joined",
  "billed",
  "left",
  "dropout",
]);

const ALLOWED_TRANSITIONS = Object.fromEntries(
  Object.entries(ADMIN_ACTIONS_BY_STATUS).map(([statusKey, actions]) => [
    statusKey,
    actions.map((act) => act.value),
  ]),
);

const isFromWalkInStage = (status) => {
  const s = normalizeStatus(status);
  return [
    "walk_in",
    "didnt_turn_up",
    "shortlisted",
    "selected",
    "pending",
    "rejected",
    "joined",
    "dropout",
    "billed",
    "left",
  ].includes(s);
};

const resolveRollbackTargetStatus = (item) => {
  const currentStatus = normalizeStatus(item?.currentStatus || item?.status);
  if (currentStatus === "others") {
    return item?.verifiedReason ? "verified" : "submitted";
  }
  if (currentStatus === "walk_in") {
    return item?.othersReason ? "others" : "verified";
  }
  if (currentStatus === "didnt_turn_up") return "walk_in";
  if (currentStatus === "verified") return "submitted";
  if (currentStatus === "shortlisted") return "walk_in";
  if (currentStatus === "selected") return "shortlisted";
  if (currentStatus === "pending") return "selected";
  if (currentStatus === "rejected") {
    if (item?.pendingAt || item?.pendingReason) return "pending";
    if (item?.joiningDate) return "selected";
    if (item?.walkInDate || item?.walkInReason) return "walk_in";
    if (item?.othersReason) return "others";
    return item?.verifiedReason ? "verified" : "submitted";
  }
  if (currentStatus === "joined") return item?.pendingAt ? "pending" : "selected";
  if (currentStatus === "billed" || currentStatus === "left") return "joined";
  if (currentStatus === "dropout") {
    if (item?.pendingAt || item?.pendingReason) return "pending";
    return item?.joiningDate ? "selected" : "shortlisted";
  }
  return null;
};

const INDIA_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function toDateStr(d) {
  if (!d) return "";
  const safeDate = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(safeDate.getTime())) return "";
  return INDIA_DATE_FORMATTER.format(safeDate);
}

function getPerformanceRating(pct) {
  const p = Number(pct) || 0;
  if (p > 75) {
    return {
      label: "Excellent",
      bg: "#dcfce7",
      color: "#15803d",
      border: "#86efac",
    };
  }
  if (p > 50) {
    return {
      label: "Very Good",
      bg: "#dbeafe",
      color: "#1d4ed8",
      border: "#bfdbfe",
    };
  }
  if (p > 25) {
    return {
      label: "Good",
      bg: "#fef3c7",
      color: "#b45309",
      border: "#fde68a",
    };
  }
  return {
    label: "Poor",
    bg: "#fee2e2",
    color: "#b91c1c",
    border: "#fca5a5",
  };
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

const buildBilledFormData = (resume, attachmentFile, customDate = null, processValue = null) => {
  const normalized = normalizeResumeData(resume);
  const formData = new FormData();

  formData.append("status", "billed");
  if (customDate) {
    formData.append("custom_date", String(customDate));
  }
  if (processValue) {
    formData.append("process", String(processValue));
    formData.append("process_name", String(processValue));
  }
  if (normalized.candidateName) {
    formData.append("candidate_name", String(normalized.candidateName));
  }
  if (normalized.candidateEmail) {
    formData.append("candidate_email", String(normalized.candidateEmail));
  }
  if (normalized.candidatePhone) {
    formData.append("candidate_phone", String(normalized.candidatePhone));
  }
  const effectiveJoining = resume?.joiningDate || resume?.currentJoiningDate;
  if (effectiveJoining) {
    formData.append("joining_date", String(effectiveJoining));
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
  return formatDateInIndia(value, "-");
}

function formatDateTime(value) {
  return formatDateTimeInIndia(value, "-");
}

function formatEventDate(value) {
  return formatEventDateOrDateTime(value, "-");
}

function displayValue(value) {
  const normalized = String(value ?? "").trim();
  if (
    !normalized ||
    ["n/a", "na", "not set"].includes(normalized.toLowerCase())
  ) {
    return "-";
  }
  return normalized;
}

function getCandidateDisplayName(item) {
  return (
    item?.candidateName ||
    item?.applicantName ||
    item?.name ||
    item?.fullName ||
    "-"
  );
}

function formatWalkInDateForExcel(val) {
  if (!val) return "-";
  const parsed = parseDateTimeValue(val);
  if (parsed && !Number.isNaN(parsed.getTime())) {
    const parts = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    }).formatToParts(parsed).reduce((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});
    return `${parts.day}/${parts.month}/${parts.year}`;
  }
  const str = String(val).trim();
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const [, year, month, day] = m;
    return `${day}/${month}/${year.slice(-2)}`;
  }
  return str || "-";
}

function formatJoiningDateForExcel(val) {
  if (!val) return "-";
  const parsed = parseDateTimeValue(val);
  if (parsed && !Number.isNaN(parsed.getTime())) {
    const parts = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "numeric",
      year: "2-digit",
    }).formatToParts(parsed).reduce((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});
    return `${parts.day}/${parts.month}/${parts.year}`;
  }
  const str = String(val).trim();
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const [, year, month, day] = m;
    return `${parseInt(day, 10)}/${parseInt(month, 10)}/${year.slice(-2)}`;
  }
  return str || "-";
}

function getJoiningMonthName(items) {
  if (Array.isArray(items)) {
    for (const item of items) {
      const d =
        item?.joiningDate ||
        item?.currentJoiningDate ||
        item?.joinedAt ||
        item?.eventAt;
      if (d) {
        const parsed = parseDateTimeValue(d) || new Date(d);
        if (parsed && !Number.isNaN(parsed.getTime())) {
          return parsed.toLocaleString("en-US", { timeZone: "Asia/Kolkata", month: "long" });
        }
      }
    }
  }
  return new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata", month: "long" });
}

function getSelectionMonthName(items) {
  if (Array.isArray(items)) {
    for (const item of items) {
      const d =
        item?.selectedAt ||
        item?.selectionDate ||
        item?.joiningDate ||
        item?.currentJoiningDate ||
        item?.eventAt;
      if (d) {
        const parsed = parseDateTimeValue(d) || new Date(d);
        if (parsed && !Number.isNaN(parsed.getTime())) {
          return parsed.toLocaleString("en-US", { timeZone: "Asia/Kolkata", month: "long" });
        }
      }
    }
  }
  return new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata", month: "long" });
}

function getStageMonthName(items, stageKey) {
  if (Array.isArray(items)) {
    for (const item of items) {
      const d = getStageDateVal(item, stageKey);
      if (d) {
        const parsed = parseDateTimeValue(d) || new Date(d);
        if (parsed && !Number.isNaN(parsed.getTime())) {
          return parsed.toLocaleString("en-US", { timeZone: "Asia/Kolkata", month: "long" });
        }
      }
    }
  }
  return new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata", month: "long" });
}

function getStageDateVal(item, stageKey) {
  return (
    (stageKey === "joined" ? (item?.joiningDate || item?.currentJoiningDate || item?.joinedAt || item?.joined_at) : null) ||
    (stageKey === "selected" ? (item?.selectedAt || item?.selected_at || item?.selectionDate || item?.selection_date || item?.joiningDate || item?.currentJoiningDate) : null) ||
    (stageKey === "shortlisted" ? (item?.shortlistedAt || item?.shortlisted_at) : null) ||
    (stageKey === "didnt_turn_up" ? (item?.didntTurnUpAt || item?.didnt_turn_up_at) : null) ||
    (stageKey === "pending" ? (item?.pendingAt || item?.pending_at || item?.selectedAt || item?.shortlistedAt) : null) ||
    (stageKey === "rejected" ? (item?.rejectedAt || item?.rejected_at) : null) ||
    (stageKey === "dropout" ? (item?.dropoutAt || item?.dropout_at) : null) ||
    (stageKey === "billed" ? (item?.billedAt || item?.billed_at) : null) ||
    (stageKey === "left" ? (item?.leftAt || item?.left_at) : null) ||
    (stageKey === "walk_in" ? (item?.walkInDate || item?.walk_in_date || item?.walkInAt || item?.walk_in_at) : null) ||
    item?.eventAt ||
    item?.[`${stageKey}At`] ||
    item?.[`${stageKey}_at`] ||
    item?.submittedAt ||
    item?.uploadedAt ||
    item?.createdAt
  );
}

function getStageNoteVal(item, stageKey) {
  const currentStatus = normalizeStatus(item?.currentStatus || item?.status || stageKey);
  return (
    normalizeNoteText(getPerformanceNoteForStatus(item, stageKey)) ||
    normalizeNoteText(getPerformanceNoteForStatus(item, currentStatus)) ||
    normalizeNoteText(item?.joiningNote) ||
    normalizeNoteText(item?.joinedReason) ||
    normalizeNoteText(item?.shortlistedReason) ||
    normalizeNoteText(item?.selectionNote) ||
    normalizeNoteText(item?.selectReason) ||
    normalizeNoteText(item?.pendingReason) ||
    normalizeNoteText(item?.rejectReason) ||
    normalizeNoteText(item?.dropoutReason) ||
    normalizeNoteText(item?.didntTurnUpReason) ||
    normalizeNoteText(item?.billedReason) ||
    normalizeNoteText(item?.leftReason) ||
    normalizeNoteText(item?.note) ||
    normalizeNoteText(item?.latestNote) ||
    ""
  );
}

function formatExcelWalkInStatus(status) {
  const s = normalizeStatus(status);
  if (!s || s === "walk_in" || s === "walkin") return "Walk In";
  return formatStatusLabel(s);
}

function getStatusRowColor(status) {
  const s = normalizeStatus(status);
  // Selected (green)
  if (s === "selected" || s === "joined" || s === "billed") {
    return "70AD47"; // Green
  }
  // Rejected (red)
  if (s === "rejected" || s === "dropout") {
    return "FF0000"; // Red
  }
  // Pending, shortlisted, didn't turn up (yellow)
  if (s === "pending" || s === "shortlisted" || s === "didnt_turn_up") {
    return "FFFF00"; // Yellow
  }
  // Rest of the candidate background should be white only
  return null;
}

function getPerformanceNoteForStatus(item, statusValue) {
  const status = normalizeStatus(statusValue || item?.currentStatus || item?.status);
  const byStatus = {
    submitted: item?.submittedReason || item?.recruiterNote,
    verified: item?.verifiedReason || item?.selectionNote,
    others: item?.othersReason || item?.selectionNote,
    walk_in: item?.walkInReason || item?.selectionNote,
    didnt_turn_up: item?.didntTurnUpReason || item?.didnt_turn_up_reason || item?.selectionNote,
    shortlisted: item?.shortlistedReason || item?.selectionNote,
    selected: item?.selectReason || item?.selectionNote,
    pending: item?.pendingReason || item?.pending_reason || (item?.currentStatus === "pending" ? item?.selectionNote : ""),
    joined: item?.joiningNote || item?.joinedReason || item?.selectionNote,
    dropout: item?.dropoutReason || item?.selectionNote,
    rejected: item?.rejectReason || item?.selectionNote,
    billed: item?.billedReason || item?.selectionNote,
    left: item?.leftReason || item?.selectionNote,
  };

  const statusNote = normalizeNoteText(byStatus[status]);
  const recruiterNote = normalizeNoteText(
    item?.recruiterNote ||
    item?.submittedReason ||
    item?.candidateNote
  );

  if (status === "submitted") {
    return recruiterNote || statusNote || item?.latestNote || item?.note || null;
  }

  if (status === "pending") {
    return normalizeNoteText(byStatus.pending) || item?.latestNote || item?.note || "";
  }

  if (statusNote && recruiterNote && statusNote !== recruiterNote) {
    return `Recruiter Note: ${recruiterNote}\n\n${formatStatusLabel(status)} Note: ${statusNote}`;
  }

  if (statusNote) {
    return statusNote;
  }

  if (recruiterNote) {
    return recruiterNote;
  }

  return item?.latestNote || item?.note || item?.selectionNote || null;
}

const normalizeNoteText = (value) => String(value ?? "").trim();

function resolveNoteAuthor(item, noteValue, statusValue) {
  const note = normalizeNoteText(noteValue);
  if (!note) return "-";
  if (note.includes("Recruiter Note:")) {
    return `${item?.recruiterName || "Recruiter"} & Team Leader / Admin`;
  }
  const status = normalizeStatus(statusValue || item?.currentStatus || item?.status);

  if (
    status === "submitted" ||
    note === normalizeNoteText(item?.submittedReason) ||
    note === normalizeNoteText(item?.recruiterNote)
  ) {
    return item?.recruiterName || "Recruiter";
  }

  const selectedByAdmin = normalizeNoteText(item?.selectedByAdmin);
  const statusActorName =
    item?.statusActorName ||
    (selectedByAdmin === "admin-panel" ? "Admin" : selectedByAdmin);

  if (note === normalizeNoteText(item?.selectionNote)) {
    return statusActorName || "Admin";
  }

  return statusActorName || item?.teamLeaderName || item?.recruiterName || "-";
}

function normalizeStatus(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (normalized === "walkin") return "walk_in";
  if (normalized === "walk_in") return "walk_in";
  if (
    normalized === "didnt_turn_up" ||
    normalized === "did_not_turn_up" ||
    normalized === "didntturnup" ||
    normalized === "didn't_turn_up"
  ) {
    return "didnt_turn_up";
  }
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
  if (candidateName !== "-" && normalizeLookupKey(candidateName).includes(normalizedSearch)) {
    return true;
  }

  const companyDisplay = formatResumeCompanyDisplay(item);
  if (
    companyDisplay &&
    companyDisplay !== "-" &&
    companyDisplay !== "N/A" &&
    normalizeLookupKey(companyDisplay).includes(normalizedSearch)
  ) {
    return true;
  }

  const companyValues = [
    item?.companyName,
    item?.company_name,
    item?.company,
    item?.job?.companyName,
    item?.job?.company_name,
    item?.jobTitle,
    item?.roleName,
    item?.role_name,
    item?.officeLocationCity,
    item?.office_location_city,
    item?.city,
  ];
  if (companyValues.some((val) => val && normalizeLookupKey(val).includes(normalizedSearch))) {
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
  didnt_turn_up: 2,
  shortlisted: 3,
  selected: 4,
  pending: 5,
  joined: 6,
  billed: 7,
  left: 8,
  dropout: 8,
  rejected: 8,
};

function getStatusRank(status) {
  const normalized = normalizeStatus(status);
  return Object.prototype.hasOwnProperty.call(STATUS_PROGRESS_RANK, normalized)
    ? STATUS_PROGRESS_RANK[normalized]
    : -1;
}

function truncateResumeFilename(value, maxLength = 15) {
  const text = String(value || "").trim();
  if (!text) return "View resume";
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
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

const LINEAR_STAGES = [
  "submitted",
  "verified",
  "walk_in",
  "shortlisted",
  "selected",
  "pending",
  "joined",
  "billed",
];

function hasCandidatePassedStage(item, targetStage) {
  const target = normalizeStatus(targetStage);
  if (!target) return false;

  const currentStatus = normalizeStatus(
    item?.currentStatus || item?.workflowStatus || item?.status,
  );

  // Pending: includes all active candidates who are shortlisted, selected, or pending.
  // When they move anywhere else (e.g. joined, dropout, rejected, rollback), they leave pending.
  if (target === "pending") {
    return (
      currentStatus === "pending" ||
      currentStatus === "selected" ||
      currentStatus === "shortlisted"
    );
  }

  // If candidate is currently at this stage, they belong in this stage
  if (currentStatus === target) return true;

  // Submitted: All candidates pass through submitted, including those who were later rejected, left, or reached any other stage
  if (target === "submitted") {
    return true;
  }

  // Check explicit timestamps or reasons for this stage if recorded
  const hasStageRecord = (stageKey) => {
    switch (stageKey) {
      case "verified":
        return Boolean(
          item?.verifiedAt ||
          item?.verified_at ||
          item?.verifiedReason ||
          item?.verified_reason
        );
      case "others":
        return Boolean(
          item?.othersAt ||
          item?.others_at ||
          item?.othersReason ||
          item?.others_reason
        );
      case "walk_in":
        return Boolean(
          item?.walkInAt ||
          item?.walk_in_at ||
          item?.walkInDate ||
          item?.walk_in_date ||
          item?.walkInReason ||
          item?.walk_in_reason
        );
      case "didnt_turn_up":
        return Boolean(
          item?.didntTurnUpAt ||
          item?.didnt_turn_up_at ||
          item?.didntTurnUpReason ||
          item?.didnt_turn_up_reason
        );
      case "shortlisted":
        return Boolean(
          item?.shortlistedAt ||
          item?.shortlisted_at ||
          item?.shortlistedReason ||
          item?.shortlisted_reason
        );
      case "selected":
        return Boolean(
          item?.selectedAt ||
          item?.selected_at ||
          item?.selectReason ||
          item?.select_reason ||
          (currentStatus === "selected" && (item?.joiningDate || item?.currentJoiningDate))
        );
      case "pending":
        return Boolean(
          item?.pendingAt ||
          item?.pending_at ||
          item?.pendingReason ||
          item?.pending_reason ||
          currentStatus === "pending"
        );
      case "joined":
        return Boolean(
          item?.joinedAt ||
          item?.joined_at ||
          item?.joinedReason ||
          item?.joined_reason ||
          item?.joiningNote ||
          (currentStatus === "joined" && (item?.joiningDate || item?.currentJoiningDate))
        );
      case "billed":
        return Boolean(
          item?.billedAt ||
          item?.billed_at ||
          item?.billedReason ||
          item?.billed_reason
        );
      case "dropout":
        return Boolean(
          item?.dropoutAt ||
          item?.dropout_at ||
          item?.dropoutReason ||
          item?.dropout_reason ||
          currentStatus === "dropout"
        );
      case "rejected":
        return Boolean(
          item?.rejectedAt ||
          item?.rejected_at ||
          item?.rejectReason ||
          item?.reject_reason ||
          currentStatus === "rejected"
        );
      case "left":
        return Boolean(
          item?.leftAt ||
          item?.left_at ||
          item?.leftReason ||
          item?.left_reason ||
          currentStatus === "left"
        );
      default:
        return false;
    }
  };

  const targetIndex = LINEAR_STAGES.indexOf(target);
  if (targetIndex !== -1) {
    const currentIndex = LINEAR_STAGES.indexOf(currentStatus);
    if (currentIndex !== -1 && currentIndex < targetIndex) {
      return false;
    }
    if (currentIndex > targetIndex) {
      if (target === "verified" && hasStageRecord("others") && !hasStageRecord("verified")) {
        return false;
      }
      return true;
    }

    if (currentStatus === "dropout") {
      const dropoutMax = (item?.joiningDate || item?.selectedAt) ? 4 : 3;
      return targetIndex <= dropoutMax;
    }

    if (currentStatus === "left") {
      return targetIndex <= 5;
    }

    if (currentStatus === "rejected") {
      if (item?.joiningDate && targetIndex <= 4) return true;
      if ((item?.walkInReason || item?.walkInAt) && targetIndex <= 2) return true;
      if ((item?.verifiedReason || item?.verifiedAt) && targetIndex <= 1) return true;
    }
  }

  if (hasStageRecord(target)) return true;

  return false;
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
  const [actionProcess, setActionProcess] = useState("");
  const [actionContacted, setActionContacted] = useState("Yes");
  const [actionSituation, setActionSituation] = useState("");
  const [actionJoiningDate, setActionJoiningDate] = useState("");
  const [actionCustomDate, setActionCustomDate] = useState("");
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

  // Inactive recruiter resume inspection state
  const [allStaffList, setAllStaffList] = useState([]);
  const [selectedInactiveRid, setSelectedInactiveRid] = useState("");
  const [inactiveResumesModalOpen, setInactiveResumesModalOpen] = useState(false);
  const [selectedInactiveRecruiter, setSelectedInactiveRecruiter] = useState(null);
  const [inactiveRecruiterResumes, setInactiveRecruiterResumes] = useState([]);
  const [loadingInactiveResumes, setLoadingInactiveResumes] = useState(false);
  const [inactiveResumesError, setInactiveResumesError] = useState("");
  const [inactiveResumeSearch, setInactiveResumeSearch] = useState("");
  const [inactiveResumeStatusFilter, setInactiveResumeStatusFilter] = useState("all");

  // Set recruiter targets state & custom period tracking
  const [targetPreset, setTargetPreset] = useState("this_month");
  const [targetCustomStart, setTargetCustomStart] = useState("");
  const [targetCustomEnd, setTargetCustomEnd] = useState("");
  const [targetRecruiters, setTargetRecruiters] = useState([]);
  const [targetLoading, setTargetLoading] = useState(false);
  const [targetError, setTargetError] = useState("");
  const [targetInputs, setTargetInputs] = useState({});
  const [targetSavingRid, setTargetSavingRid] = useState("");
  const [savingAllTargets, setSavingAllTargets] = useState(false);
  const [targetMessage, setTargetMessage] = useState({ type: "", text: "" });
  const [targetSearch, setTargetSearch] = useState("");
  const [targetTeamFilter, setTargetTeamFilter] = useState("all");
  const [exportingExcel, setExportingExcel] = useState(false);

  // Target History Modal State
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [historyError, setHistoryError] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [historySelectedRid, setHistorySelectedRid] = useState("");

  // Set Target Modal State (modal with calendar date pickers start date & end date)
  const [setTargetModalOpen, setSetTargetModalOpen] = useState(false);
  const [targetModalRecruiter, setTargetModalRecruiter] = useState(null);
  const [targetModalStart, setTargetModalStart] = useState("");
  const [targetModalEnd, setTargetModalEnd] = useState("");
  const [targetModalTarget, setTargetModalTarget] = useState("");
  const [targetModalNote, setTargetModalNote] = useState("");
  const [targetModalSaving, setTargetModalSaving] = useState(false);
  const [targetModalError, setTargetModalError] = useState("");

  const targetDateRange = useMemo(() => {
    const now = new Date();
    const toYmd = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    switch (targetPreset) {
      case "this_month": {
        const first = new Date(now.getFullYear(), now.getMonth(), 1);
        const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return { start: toYmd(first), end: toYmd(last), label: "This Month" };
      }
      case "last_month": {
        const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const last = new Date(now.getFullYear(), now.getMonth(), 0);
        return { start: toYmd(first), end: toYmd(last), label: "Last Month" };
      }
      case "last_20_days": {
        const start = new Date(now);
        start.setDate(start.getDate() - 19);
        return { start: toYmd(start), end: toYmd(now), label: "Last 20 Days" };
      }
      case "last_7_days": {
        const start = new Date(now);
        start.setDate(start.getDate() - 6);
        return { start: toYmd(start), end: toYmd(now), label: "Last 7 Days" };
      }
      case "custom": {
        return {
          start: targetCustomStart || toYmd(now),
          end: targetCustomEnd || toYmd(now),
          label: "Custom Period",
        };
      }
      default: {
        const first = new Date(now.getFullYear(), now.getMonth(), 1);
        const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return { start: toYmd(first), end: toYmd(last), label: "This Month" };
      }
    }
  }, [targetPreset, targetCustomStart, targetCustomEnd]);

  const fetchTargetsForRange = useCallback(async (start, end) => {
    setTargetLoading(true);
    setTargetError("");
    try {
      const res = await fetchAdminRecruiterTargets(start, end);
      if (Array.isArray(res?.recruiters)) {
        setTargetRecruiters(res.recruiters);
      }
    } catch (err) {
      setTargetError(err.message || "Failed to load targets for selected period.");
    } finally {
      setTargetLoading(false);
    }
  }, []);

  useEffect(() => {
    if (targetDateRange?.start && targetDateRange?.end) {
      setTargetInputs({});
      fetchTargetsForRange(targetDateRange.start, targetDateRange.end);
    }
  }, [targetDateRange.start, targetDateRange.end, fetchTargetsForRange]);

  const openTargetHistory = async (rid = "") => {
    setHistorySelectedRid(rid);
    setHistoryModalOpen(true);
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const res = await fetchAdminRecruiterTargetsHistory(rid);
      setHistoryList(Array.isArray(res?.history) ? res.history : []);
    } catch (err) {
      setHistoryError(err.message || "Failed to load target history.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const openSetTargetModal = (recruiter) => {
    setTargetModalRecruiter(recruiter);
    setTargetModalStart(targetDateRange.start);
    setTargetModalEnd(targetDateRange.end);
    setTargetModalTarget(recruiter.target ?? recruiter.joiningTarget ?? 0);
    setTargetModalNote("");
    setTargetModalError("");
    setSetTargetModalOpen(true);
  };

  const closeSetTargetModal = () => {
    if (targetModalSaving) return;
    setSetTargetModalOpen(false);
    setTargetModalRecruiter(null);
    setTargetModalError("");
  };

  const handleSaveModalTarget = async (e) => {
    if (e) e.preventDefault();
    if (!targetModalRecruiter?.rid) return;
    if (!targetModalStart || !targetModalEnd) {
      setTargetModalError("Please select both start date and end date.");
      return;
    }
    if (targetModalStart > targetModalEnd) {
      setTargetModalError("Start date cannot be after end date.");
      return;
    }
    const numVal = Math.max(0, parseInt(targetModalTarget, 10) || 0);

    setTargetModalSaving(true);
    setTargetModalError("");
    try {
      await adminUpdateRecruiterTarget(
        targetModalRecruiter.rid,
        numVal,
        targetModalStart,
        targetModalEnd,
        targetModalNote || null,
      );
      setTargetMessage({
        type: "success",
        text: `Target (${numVal} joins) saved for ${targetModalRecruiter.name || targetModalRecruiter.rid} (${targetModalStart} to ${targetModalEnd}).`,
      });
      setSetTargetModalOpen(false);
      setTargetModalRecruiter(null);

      // Re-fetch current target data so all achievements and target are freshly computed
      fetchTargetsForRange(targetDateRange.start, targetDateRange.end);
    } catch (err) {
      setTargetModalError(err.message || "Failed to set target.");
    } finally {
      setTargetModalSaving(false);
    }
  };

  const targetTeamOptions = useMemo(() => {
    const list = Array.isArray(targetRecruiters) ? targetRecruiters : [];
    const activeList = list.filter((r) => {
      const status = String(r.accountStatus || "active").trim().toLowerCase();
      return !["inactive", "disabled", "deactivated", "blocked"].includes(status);
    });

    const teamCounts = new Map();
    for (const r of activeList) {
      const team = String(r.team || "").trim();
      if (team) {
        teamCounts.set(team, (teamCounts.get(team) || 0) + 1);
      }
    }

    const primaryTeams = ["Team BPO", "Team NBFC"];
    const allFoundTeams = Array.from(teamCounts.keys());
    const sortedTeams = [
      ...primaryTeams.filter((t) => allFoundTeams.includes(t)),
      ...allFoundTeams.filter((t) => !primaryTeams.includes(t)),
    ];

    if (sortedTeams.length === 0) {
      sortedTeams.push("Team BPO", "Team NBFC");
    }

    return [
      { key: "all", label: "All Recruiters", count: activeList.length },
      ...sortedTeams.map((teamName) => ({
        key: teamName,
        label: teamName,
        count: teamCounts.get(teamName) || 0,
      })),
    ];
  }, [targetRecruiters]);

  const filteredTargetRecruiters = useMemo(() => {
    const list = Array.isArray(targetRecruiters) ? targetRecruiters : [];
    // Filter out disabled / inactive accounts
    const activeList = list.filter((r) => {
      const status = String(r.accountStatus || "active").trim().toLowerCase();
      return !["inactive", "disabled", "deactivated", "blocked"].includes(status);
    });

    // Filter by team
    const teamFiltered =
      targetTeamFilter === "all"
        ? activeList
        : activeList.filter((r) => {
            const recTeam = String(r.team || "").trim().toLowerCase();
            const filterTeam = String(targetTeamFilter).trim().toLowerCase();
            return recTeam === filterTeam;
          });

    const searchFiltered = !targetSearch.trim()
      ? teamFiltered
      : teamFiltered.filter((r) => {
          const q = targetSearch.toLowerCase().trim();
          return (
            String(r.name || "").toLowerCase().includes(q) ||
            String(r.rid || "").toLowerCase().includes(q) ||
            String(r.team || "").toLowerCase().includes(q)
          );
        });

    // Sort recruiters by highest joining first (descending)
    return [...searchFiltered].sort((a, b) => {
      const joinedA = Number(a.joined ?? 0);
      const joinedB = Number(b.joined ?? 0);
      if (joinedB !== joinedA) {
        return joinedB - joinedA; // highest joining first
      }
      const walkA = Number(a.walk_in ?? a.walkIn ?? 0);
      const walkB = Number(b.walk_in ?? b.walkIn ?? 0);
      if (walkB !== walkA) {
        return walkB - walkA;
      }
      const subsA = Number(a.submitted ?? 0);
      const subsB = Number(b.submitted ?? 0);
      if (subsB !== subsA) {
        return subsB - subsA;
      }
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  }, [targetRecruiters, targetTeamFilter, targetSearch]);

  const clientExportTargetsExcel = (recruiters, startDate, endDate) => {
    const wb = XLSX.utils.book_new();

    const formatList = (list) =>
      list.map((r, idx) => {
        const targetVal = Number(r.target ?? r.joiningTarget ?? 0);
        const achieved = Number(r.joined ?? 0);
        const pct =
          targetVal > 0
            ? Math.round((achieved / targetVal) * 100)
            : achieved > 0
            ? 100
            : 0;
        const perfLabel =
          pct > 75 ? "Excellent" : pct > 50 ? "Very Good" : pct > 25 ? "Good" : "Poor";
        return {
          "S.No.": idx + 1,
          NAME: r.name || "Unknown",
          "JOINING TARGET": targetVal,
          "TARGET ACHIEVED": achieved,
          PERFORMANCE: perfLabel,
        };
      });

    const activeList = (Array.isArray(recruiters) ? recruiters : []).filter((r) => {
      const status = String(r.accountStatus || "active").trim().toLowerCase();
      return !["inactive", "disabled", "deactivated", "blocked"].includes(status);
    });

    const bpoList = activeList.filter((r) =>
      String(r.team || "").toLowerCase().includes("bpo"),
    );
    const nbfcList = activeList.filter((r) =>
      String(r.team || "").toLowerCase().includes("nbfc"),
    );

    const wsBPO = XLSX.utils.json_to_sheet(formatList(bpoList));
    wsBPO["!cols"] = [{ wch: 8 }, { wch: 24 }, { wch: 18 }, { wch: 18 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsBPO, "Team BPO");

    const wsNBFC = XLSX.utils.json_to_sheet(formatList(nbfcList));
    wsNBFC["!cols"] = [{ wch: 8 }, { wch: 24 }, { wch: 18 }, { wch: 18 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsNBFC, "Team NBFC");

    const wsAll = XLSX.utils.json_to_sheet(
      activeList.map((r, idx) => {
        const targetVal = Number(r.target ?? r.joiningTarget ?? 0);
        const achieved = Number(r.joined ?? 0);
        const pct =
          targetVal > 0
            ? Math.round((achieved / targetVal) * 100)
            : achieved > 0
            ? 100
            : 0;
        const perfLabel =
          pct > 75 ? "Excellent" : pct > 50 ? "Very Good" : pct > 25 ? "Good" : "Poor";
        return {
          "S.No.": idx + 1,
          NAME: r.name || "Unknown",
          TEAM: r.team || "-",
          "JOINING TARGET": targetVal,
          "TARGET ACHIEVED": achieved,
          PERFORMANCE: perfLabel,
        };
      }),
    );
    wsAll["!cols"] = [{ wch: 8 }, { wch: 24 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsAll, "All Teams");

    XLSX.writeFile(wb, `recruiter-targets-${startDate || "all"}-to-${endDate || "all"}.xlsx`, {
      bookType: "xlsx",
    });
  };

  const handleExportTargetsExcel = async () => {
    setExportingExcel(true);
    try {
      await exportAdminRecruiterTargets(
        targetDateRange.start,
        targetDateRange.end,
        targetTeamFilter,
      );
    } catch (err) {
      console.warn("Backend export failed, falling back to client-side XLSX generation:", err);
      clientExportTargetsExcel(
        targetRecruiters,
        targetDateRange.start,
        targetDateRange.end,
      );
    } finally {
      setExportingExcel(false);
    }
  };

  const hasAnyTargetChanges = useMemo(() => {
    if (!Array.isArray(targetRecruiters)) return false;
    return Object.entries(targetInputs).some(([rid, val]) => {
      const rec = targetRecruiters.find((r) => r.rid === rid);
      return (
        rec &&
        val !== "" &&
        Number(val) !== Number(rec.target ?? rec.joiningTarget ?? 0)
      );
    });
  }, [targetInputs, targetRecruiters]);

  const handleSaveTarget = async (recruiter) => {
    const rid = recruiter.rid;
    const currentVal =
      targetInputs[rid] !== undefined
        ? targetInputs[rid]
        : (recruiter.target ?? recruiter.joiningTarget ?? 0);
    const numVal = Math.max(0, parseInt(currentVal, 10) || 0);

    setTargetSavingRid(rid);
    setTargetMessage({ type: "", text: "" });
    try {
      await adminUpdateRecruiterTarget(
        rid,
        numVal,
        targetDateRange.start,
        targetDateRange.end,
      );
      setTargetMessage({
        type: "success",
        text: `Target (${numVal} joins) saved for ${recruiter.name || rid} (${targetDateRange.label || `${targetDateRange.start} to ${targetDateRange.end}`}).`,
      });
      setTargetRecruiters((prev) =>
        prev.map((rec) =>
          rec.rid === rid
            ? {
                ...rec,
                target: numVal,
                progressPct:
                  numVal > 0
                    ? Math.min(100, Math.round(((rec.joined || 0) / numVal) * 100))
                    : (rec.joined || 0) > 0
                    ? 100
                    : 0,
              }
            : rec
        )
      );
      setTargetInputs((prev) => {
        const next = { ...prev };
        delete next[rid];
        return next;
      });
      setTimeout(() => setTargetMessage({ type: "", text: "" }), 3500);
    } catch (err) {
      setTargetMessage({
        type: "error",
        text: err.message || "Failed to update target.",
      });
    } finally {
      setTargetSavingRid("");
    }
  };

  const handleSaveAllTargets = async () => {
    if (!Array.isArray(targetRecruiters)) return;
    const changed = Object.entries(targetInputs).filter(([rid, val]) => {
      const rec = targetRecruiters.find((r) => r.rid === rid);
      return (
        rec &&
        val !== "" &&
        Number(val) !== Number(rec.target ?? rec.joiningTarget ?? 0)
      );
    });
    if (changed.length === 0) return;

    setSavingAllTargets(true);
    setTargetMessage({ type: "", text: "" });
    try {
      const targets = changed.map(([rid, val]) => ({
        rid,
        target: Math.max(0, parseInt(val, 10) || 0),
      }));
      await adminUpdateRecruitersTargetsBulk(
        targets,
        targetDateRange.start,
        targetDateRange.end,
      );
      setTargetMessage({
        type: "success",
        text: `Successfully saved targets for ${targets.length} recruiter${targets.length === 1 ? "" : "s"} (${targetDateRange.label || `${targetDateRange.start} to ${targetDateRange.end}`}).`,
      });
      const targetMap = new Map(targets.map((t) => [t.rid, t.target]));
      setTargetRecruiters((prev) =>
        prev.map((rec) => {
          if (!targetMap.has(rec.rid)) return rec;
          const newTarget = targetMap.get(rec.rid);
          return {
            ...rec,
            target: newTarget,
            progressPct:
              newTarget > 0
                ? Math.min(100, Math.round(((rec.joined || 0) / newTarget) * 100))
                : (rec.joined || 0) > 0
                ? 100
                : 0,
          };
        })
      );
      setTargetInputs({});
      setTimeout(() => setTargetMessage({ type: "", text: "" }), 3500);
    } catch (err) {
      setTargetMessage({
        type: "error",
        text: err.message || "Failed to save targets.",
      });
    } finally {
      setSavingAllTargets(false);
    }
  };

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

  const loadStaffList = useCallback(async () => {
    try {
      const respData = await fetchAdminRecruitersList();
      if (Array.isArray(respData?.recruiters)) {
        setAllStaffList(respData.recruiters);
      }
    } catch (err) {
      console.error("Failed to load staff list for inactive recruiters:", err);
    }
  }, []);

  useEffect(() => {
    loadStaffList();
  }, [loadStaffList]);

  const inactiveRecruiters = useMemo(() => {
    const map = new Map();
    (allStaffList || []).forEach((r) => {
      const st = String(r?.accountStatus || r?.account_status || "").trim().toLowerCase();
      if (st === "inactive" || st === "disabled" || st === "deactivated") {
        map.set(r.rid, r);
      }
    });
    (data?.recruiters || []).forEach((r) => {
      const st = String(r?.accountStatus || r?.account_status || "").trim().toLowerCase();
      if (st === "inactive" || st === "disabled" || st === "deactivated") {
        if (!map.has(r.rid)) {
          map.set(r.rid, r);
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [allStaffList, data?.recruiters]);

  const activeRecruiterRids = useMemo(() => {
    if (!allStaffList || allStaffList.length === 0) return null;
    const s = new Set();
    allStaffList.forEach((r) => {
      const st = String(r?.accountStatus || r?.account_status || "active").trim().toLowerCase();
      if (st !== "inactive" && st !== "disabled" && st !== "deactivated" && st !== "blocked") {
        if (r?.rid) s.add(String(r.rid).trim());
      }
    });
    return s;
  }, [allStaffList]);

  const handleViewInactiveResumes = async () => {
    if (!selectedInactiveRid) return;
    const rec = inactiveRecruiters.find((r) => String(r.rid) === String(selectedInactiveRid));
    setSelectedInactiveRecruiter(rec || { rid: selectedInactiveRid, name: "Recruiter" });
    setInactiveResumesModalOpen(true);
    setLoadingInactiveResumes(true);
    setInactiveResumesError("");
    setInactiveResumeSearch("");
    setInactiveResumeStatusFilter("all");
    try {
      const resData = await fetchAdminRecruiterResumes(selectedInactiveRid);
      if (resData?.recruiter) {
        setSelectedInactiveRecruiter(resData.recruiter);
      }
      setInactiveRecruiterResumes(Array.isArray(resData?.resumes) ? resData.resumes : []);
    } catch (err) {
      setInactiveResumesError(err.message || "Failed to load recruiter resumes.");
      setInactiveRecruiterResumes([]);
    } finally {
      setLoadingInactiveResumes(false);
    }
  };

  const handleOpenResumeFile = (resId) => {
    const token = getAuthSession()?.token;
    const url = `${API_BASE_URL}/api/admin/resumes/${encodeURIComponent(resId)}/file${
      token ? `?token=${encodeURIComponent(token)}` : ""
    }`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const filteredInactiveResumes = useMemo(() => {
    return (inactiveRecruiterResumes || []).filter((item) => {
      if (inactiveResumeStatusFilter !== "all") {
        const itemStatus = String(item.currentStatus || item.status || "").toLowerCase();
        if (itemStatus !== inactiveResumeStatusFilter) {
          return false;
        }
      }
      if (inactiveResumeSearch.trim()) {
        const query = inactiveResumeSearch.toLowerCase();
        const candName = String(item.candidateName || item.name || "").toLowerCase();
        const candPhone = String(item.candidatePhone || item.phone || "").toLowerCase();
        const jobTitle = String(
          item.jobTitle || item.jobRole || item.companyName || "",
        ).toLowerCase();
        const resId = String(item.resId || "").toLowerCase();
        return (
          candName.includes(query) ||
          candPhone.includes(query) ||
          jobTitle.includes(query) ||
          resId.includes(query)
        );
      }
      return true;
    });
  }, [inactiveRecruiterResumes, inactiveResumeStatusFilter, inactiveResumeSearch]);

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
            highestQualification:
              normalized.highestQualification ||
              item.highestQualification ||
              item.latestEducationLevel ||
              null,
            recruiterName: normalized.recruiterName || "-",
            recruiterRid: normalized.rid || "-",
            teamLeaderRid:
              item.teamLeaderRid ||
              item.team_leader_rid ||
              item.jobOwnerTeamLeaderRid ||
              item.job_owner_team_leader_rid ||
              null,
            teamLeaderName:
              item.teamLeaderName ||
              item.team_leader_name ||
              item.jobOwnerTeamLeaderName ||
              item.job_owner_team_leader_name ||
              "-",
            candidatePhone: normalized.candidatePhone || null,
            jobJid: normalized.jobJid ?? "-",
            companyName: normalized.companyName || null,
            officeLocationCity:
              normalized.officeLocationCity ||
              normalized.office_location_city ||
              null,
            city: normalized.city || null,
            resumeFilename:
              normalized.resumeFilename || normalized.resId || "View resume",
            status: "submitted",
            submittedAt: item.submittedAt || item.uploadedAt || null,
            uploadedAt: item.uploadedAt || item.submittedAt || null,
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
      for (const item of bucketItems) {
        const normalizedItem = normalizeResumeData(item);
        const resId = getResId(item);
        if (!resId || String(resId).trim() === "") continue;
        const itemStatus = normalizeStatus(
          item?.workflowStatus ||
          item?.workflow_status ||
          item?.status ||
          normalizedItem?.workflowStatus ||
          normalizedItem?.status ||
          bucketStatus,
        );
        const itemRank = getStatusRank(itemStatus);
        if (itemRank < 0) continue;

        const prev = map.get(String(resId));
        if (!prev || itemRank > prev.rank) {
          map.set(String(resId), {
            status: itemStatus,
            rank: itemRank,
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
          item?.jobOwnerTeamLeaderName ||
          item?.job_owner_team_leader_name ||
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
        const bucketStatus = normalizeStatus(fallbackStatus);
        const currentStatus = normalizeStatus(
          latestResolved?.status || sourceStatus || fallbackStatus,
        );

        return {
          ...normalized,
          teamLeaderRid:
            item?.teamLeaderRid ||
            item?.team_leader_rid ||
            item?.jobOwnerTeamLeaderRid ||
            item?.job_owner_team_leader_rid ||
            normalized?.teamLeaderRid ||
            normalized?.team_leader_rid ||
            normalized?.jobOwnerTeamLeaderRid ||
            normalized?.job_owner_team_leader_rid ||
            null,
          teamLeaderName,
          resId,
          status: bucketStatus,
          currentStatus,
        };
      });

      const dedupedItems = dedupeItemsByResId(normalizedItems);
      const targetStatus = normalizeStatus(fallbackStatus);
      return dedupedItems.filter((item) => {
        return hasCandidatePassedStage(item, targetStatus);
      });
    };

    const submittedRawItems =
      performanceSubmittedItems.length > 0 ? performanceSubmittedItems : submittedResumes;

    const getResId = (it) =>
      it?.resId ?? it?.res_id ?? it?.resumeId ?? it?.resume_id;

    const isSubmittedWithinRange = (item) => {
      if (!dateRange) return true;
      const rawDate =
        item?.submittedAt ||
        item?.submitted_at ||
        item?.uploadedAt ||
        item?.uploaded_at ||
        item?.createdAt ||
        item?.created_at;
      if (!rawDate) return false;
      const str = String(rawDate).trim();
      const ymd = str.slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
        if (dateRange.start && dateRange.end) {
          return ymd >= dateRange.start && ymd <= dateRange.end;
        }
      }
      const parsed = new Date(str.includes(" ") ? str.replace(" ", "T") : str);
      if (Number.isNaN(parsed.getTime())) return false;
      const start = new Date(`${dateRange.start}T00:00:00`);
      const end = new Date(`${dateRange.end}T23:59:59.999`);
      return parsed >= start && parsed <= end;
    };

    const submittedPoolMap = new Map();
    const primarySubmitted =
      Array.isArray(statusDrilldown?.submitted)
        ? statusDrilldown.submitted
        : submittedRawItems;

    for (const it of primarySubmitted) {
      const id = getResId(it);
      if (id) {
        if (Array.isArray(statusDrilldown?.submitted) || isSubmittedWithinRange(it)) {
          submittedPoolMap.set(String(id), it);
        }
      }
    }

    // Only candidates whose submission timestamp falls within the active date range belong in submitted
    for (const [, bucketArr] of Object.entries(statusDrilldown || {})) {
      if (!Array.isArray(bucketArr)) continue;
      for (const it of bucketArr) {
        const id = getResId(it);
        if (id && !submittedPoolMap.has(String(id)) && isSubmittedWithinRange(it)) {
          submittedPoolMap.set(String(id), it);
        }
      }
    }

    return {
      submitted: buildItems(Array.from(submittedPoolMap.values()), "submitted"),
      verified: buildItems(statusDrilldown?.verified || [], "verified"),
      others: buildItems(statusDrilldown?.others || [], "others"),
      walk_in: buildItems(statusDrilldown?.walk_in || [], "walk_in"),
      didnt_turn_up: buildItems(statusDrilldown?.didnt_turn_up || [], "didnt_turn_up"),
      shortlisted: buildItems(statusDrilldown?.shortlisted || [], "shortlisted"),
      selected: buildItems(statusDrilldown?.selected || [], "selected"),
      pending: buildItems(
        (() => {
          const map = new Map();
          for (const it of statusDrilldown?.pending || []) {
            const id = getResId(it);
            if (id) map.set(String(id), it);
          }
          for (const it of statusDrilldown?.selected || []) {
            const id = getResId(it);
            if (id && !map.has(String(id))) map.set(String(id), it);
          }
          for (const it of statusDrilldown?.shortlisted || []) {
            const id = getResId(it);
            if (id && !map.has(String(id))) map.set(String(id), it);
          }
          return Array.from(map.values()).filter((it) => {
            const cur = normalizeStatus(
              statusOverrides[it?.resId] ||
                it?.currentStatus ||
                it?.workflowStatus ||
                it?.status,
            );
            return cur === "shortlisted" || cur === "selected" || cur === "pending";
          });
        })(),
        "pending",
      ),
      rejected: buildItems(statusDrilldown?.rejected || [], "rejected"),
      joined: buildItems(statusDrilldown?.joined || [], "joined"),
      dropout: buildItems(statusDrilldown?.dropout || [], "dropout"),
      billed: buildItems(statusDrilldown?.billed || [], "billed"),
      left: buildItems(statusDrilldown?.left || [], "left"),
    };
  }, [
    dateRange,
    latestStatusByResId,
    performanceSubmittedItems,
    statusDrilldown,
    submittedResumes,
  ]);
  const teamLeaderMetricMap = useMemo(() => {
    const baseMetrics = () => ({
      submitted: 0,
      verified: 0,
      others: 0,
      walk_in: 0,
      didnt_turn_up: 0,
      shortlisted: 0,
      selected: 0,
      pending: 0,
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
    incrementFromBucket("others", statusItemsByStatus.others);
    incrementFromBucket("walk_in", statusItemsByStatus.walk_in);
    incrementFromBucket("didnt_turn_up", statusItemsByStatus.didnt_turn_up);
    incrementFromBucket("shortlisted", statusItemsByStatus.shortlisted);
    incrementFromBucket("selected", statusItemsByStatus.selected);
    incrementFromBucket("pending", statusItemsByStatus.pending);
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
        others: 0,
        walk_in: 0,
        didnt_turn_up: 0,
        shortlisted: 0,
        selected: 0,
        pending: 0,
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
      totalDidntTurnUp: getCount("didnt_turn_up"),
      totalShortlisted: getCount("shortlisted"),
      totalSelected: getCount("selected"),
      totalPending: getCount("pending"),
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
  const overviewPagination = useTablePagination(
    filteredSelectedStatusItems,
    JSON.stringify({
      customEnd,
      customStart,
      recruiterEntrySearch,
      selectedStatusKey,
      tab: activeTab,
      timelinePreset,
    }),
    "admin-performance-overview-page-size",
  );
  const recruiterDetailPagination = useTablePagination(
    selectedRecruiterStatusItems,
    JSON.stringify({
      recruiterRid: selectedRecruiter?.rid || "",
      selectedStatusKey,
    }),
    "admin-performance-recruiter-detail-page-size",
  );
  const teamLeaderDetailPagination = useTablePagination(
    selectedTeamLeaderStatusItems,
    JSON.stringify({
      selectedStatusKey,
      teamLeaderRid: selectedTeamLeader?.rid || "",
    }),
    "admin-performance-team-leader-detail-page-size",
  );
  const selectedStatusRank = getStatusRank(selectedStatusKey);

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
    setActionProcess(item?.process || item?.selectionProcess || item?.processName || "");
    setActionContacted("Yes");
    setActionSituation("");
    setActionJoiningDate(item?.joiningDate || item?.currentJoiningDate || "");
    setActionJoiningNote(item?.joiningNote || item?.selectionNote || "");
    setActionRevenue(
      item?.revenue !== undefined && item?.revenue !== null && item?.revenue !== ""
        ? String(item.revenue)
        : "",
    );
    setActionAttachmentFile(null);
    setActionError("");
    const stageDefaultDate =
      (targetStatus === "walk_in" ? (item?.walkInDate || item?.walk_in_date) : null) ||
      (targetStatus === "didnt_turn_up" ? (item?.didntTurnUpAt || item?.didnt_turn_up_at) : null) ||
      (targetStatus === "pending" ? (item?.pendingAt || item?.pending_at) : null) ||
      (targetStatus === "joined" ? (item?.joiningDate || item?.currentJoiningDate) : null) ||
      toDateStr(new Date());
    setActionCustomDate(stageDefaultDate || toDateStr(new Date()));
  };

  const openApplyActionModal = (item) => {
    const rowActionState = getRowActionState(item);
    const availableActions = rowActionState?.availableActions || [];
    const firstTarget = availableActions[0]?.value || "";
    openActionModal(item, firstTarget);
  };

  const switchActionTarget = (newTarget) => {
    setActionTarget(newTarget);
    setActionError("");
    const stageDefaultDate =
      (newTarget === "walk_in" ? (actionModalItem?.walkInDate || actionModalItem?.walk_in_date) : null) ||
      (newTarget === "didnt_turn_up" ? (actionModalItem?.didntTurnUpAt || actionModalItem?.didnt_turn_up_at) : null) ||
      (newTarget === "pending" ? (actionModalItem?.pendingAt || actionModalItem?.pending_at) : null) ||
      (newTarget === "joined" ? (actionModalItem?.joiningDate || actionModalItem?.currentJoiningDate) : null) ||
      toDateStr(new Date());
    setActionCustomDate(stageDefaultDate || toDateStr(new Date()));
    if (newTarget === "joined") {
      setActionJoiningDate(stageDefaultDate || toDateStr(new Date()));
    }
  };

  const closeActionModal = () => {
    if (actionSubmitting) return;
    setActionModalItem(null);
    setActionTarget("");
    setActionReason("");
    setActionProcess("");
    setActionContacted("Yes");
    setActionSituation("");
    setActionJoiningDate("");
    setActionJoiningNote("");
    setActionRevenue("");
    setActionAttachmentFile(null);
    setActionError("");
    setActionCustomDate("");
  };

  const ensureBilledIntakeEntry = async ({
    resId,
    amount,
    reason,
    attachmentFile,
    createdAt = null,
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
      const entryResId = String(entry?.resId || "").trim();
      return (
        entryType === "intake" &&
        (entryResId === String(resId).trim() ||
          entryReason.includes(marker.toLowerCase()))
      );
    });
    if (alreadyRecorded) return;

    const payload = new FormData();
    payload.append("resId", resId);
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
    if (createdAt) {
      payload.append("createdAt", String(createdAt));
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
    const currentStatus = normalizeStatus(
      actionModalItem.currentStatus || actionModalItem.status,
    );
    const normalizedTarget = normalizeStatus(actionTarget);
    const activeStage =
      selectedStatusKey && selectedStatusKey !== "submitted" && selectedStatusKey !== "all"
        ? selectedStatusKey
        : currentStatus;
    const allowedTargets =
      ALLOWED_TRANSITIONS[currentStatus] ||
      ALLOWED_TRANSITIONS[activeStage] ||
      [];
    if (!allowedTargets.includes(normalizedTarget)) {
      setActionError(
        `Frontend blocked an invalid transition from '${activeStage || currentStatus || "unknown"}' to '${normalizedTarget}'. Refresh the table if this row looks stale.`,
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
          ? buildBilledFormData(actionModalItem, actionAttachmentFile, actionCustomDate, actionProcess.trim())
          : {
            status: actionTarget,
            custom_date: actionCustomDate || null,
            ...(actionProcess.trim()
              ? { process: actionProcess.trim(), process_name: actionProcess.trim() }
              : {}),
            ...buildCandidatePayloadAliases(actionModalItem),
            ...(!["selected"].includes(actionTarget)
              ? {
                reason: normalizedReason || null,
                ...(actionTarget === "others"
                  ? { othersReason: normalizedReason || null, others_reason: normalizedReason || null }
                  : {}),
                ...(actionTarget === "didnt_turn_up"
                  ? { didntTurnUpReason: normalizedReason || null, didnt_turn_up_reason: normalizedReason || null }
                  : {}),
                ...(actionTarget === "pending"
                  ? {
                    pendingReason: normalizedReason || null,
                    pending_reason: normalizedReason || null,
                    pendingNote: normalizedReason || null,
                    pending_note: normalizedReason || null,
                  }
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
              (actionJoiningDate || actionCustomDate)
              ? { joining_date: actionJoiningDate || actionCustomDate }
              : {}),
            ...(actionTarget === "walk_in" && actionCustomDate
              ? { walk_in_date: actionCustomDate, walkIn: actionCustomDate }
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
            createdAt:
              actionCustomDate ||
              actionModalItem?.joiningDate ||
              actionModalItem?.currentJoiningDate ||
              actionJoiningDate ||
              null,
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

  const getRowActionState = useCallback(
    (item) => {
      const itemStatus = normalizeStatus(
        item?.currentStatus || item?.status,
      );
      const stageKey =
        selectedStatusKey && selectedStatusKey !== "submitted" && selectedStatusKey !== "all"
          ? selectedStatusKey
          : itemStatus;
      const effectiveRank = getStatusRank(itemStatus);
      const isPreviousStageView =
        selectedStatusRank >= 0 &&
        effectiveRank >= 0 &&
        selectedStatusRank < effectiveRank;
      if (isPreviousStageView) {
        return {
          availableActions: [],
          canRollback: ROLLBACKABLE_ADMIN_STATUSES.has(itemStatus),
        };
      }
      return {
        availableActions:
          ADMIN_ACTIONS_BY_STATUS[stageKey] ||
          ADMIN_ACTIONS_BY_STATUS[itemStatus] ||
          [],
        canRollback:
          ROLLBACKABLE_ADMIN_STATUSES.has(stageKey) ||
          ROLLBACKABLE_ADMIN_STATUSES.has(itemStatus),
      };
    },
    [selectedStatusKey, selectedStatusRank],
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
    const currentStatus = normalizeStatus(item?.currentStatus || item?.status);
    const confirmed = window.confirm(
      `Rollback ${item.candidateName || item.name || item.resId} from ${formatStatusLabel(currentStatus)} to the previous stage?`,
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

  const handleDownloadWalkInXlsx = (customItems = null) => {
    const items = customItems || filteredSelectedStatusItems || [];
    if (!items || items.length === 0) {
      window.alert("No walk-in records available to download.");
      return;
    }

    const headers = [
      "S.NO",
      "DATE",
      "NAME",
      "COMPANY",
      "LOCATION",
      "RECRUITER",
      "STATUS",
      "NOTE",
    ];

    const dataRows = items.map((item, idx) => {
      const walkInDateVal =
        item.walkInDate ||
        item.walk_in_date ||
        item.walkInAt ||
        item.walk_in_at ||
        item.eventAt ||
        item.submittedAt ||
        item.createdAt;

      const currentStatus = normalizeStatus(item.currentStatus || item.status || "walk_in");
      const latestNote =
        normalizeNoteText(getPerformanceNoteForStatus(item, currentStatus)) ||
        normalizeNoteText(getPerformanceNoteForStatus(item, "walk_in")) ||
        normalizeNoteText(item.selectionNote) ||
        normalizeNoteText(item.walkInReason) ||
        normalizeNoteText(item.note) ||
        normalizeNoteText(item.latestNote) ||
        "-";

      return [
        idx + 1,
        formatWalkInDateForExcel(walkInDateVal),
        getCandidateDisplayName(item),
        formatResumeCompanyDisplay(item) || item.companyName || "-",
        item.city || item.job?.city || item.location || "-",
        item.recruiterName || item.recruiter || "-",
        formatExcelWalkInStatus(currentStatus),
        latestNote,
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);

    const thinBorder = {
      top: { style: "thin", color: { rgb: "D9D9D9" } },
      bottom: { style: "thin", color: { rgb: "D9D9D9" } },
      left: { style: "thin", color: { rgb: "D9D9D9" } },
      right: { style: "thin", color: { rgb: "D9D9D9" } },
    };

    const headerStyle = {
      fill: { fgColor: { rgb: "BDD7EE" } },
      font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "000000" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: thinBorder,
    };

    const colLetters = ["A", "B", "C", "D", "E", "F", "G", "H"];
    colLetters.forEach((col) => {
      const cellRef = `${col}1`;
      if (ws[cellRef]) {
        ws[cellRef].s = headerStyle;
      }
    });

    items.forEach((item, rowIdx) => {
      const rowNum = rowIdx + 2;
      const rowColor = getStatusRowColor(item.currentStatus || item.status);
      colLetters.forEach((col, colIdx) => {
        const cellRef = `${col}${rowNum}`;
        if (!ws[cellRef]) return;
        const isCenter =
          colIdx === 0 ||
          colIdx === 1 ||
          colIdx === 4 ||
          colIdx === 5 ||
          colIdx === 6;
        const cellStyle = {
          font: { name: "Calibri", sz: 11, color: { rgb: "000000" } },
          alignment: {
            horizontal: isCenter ? "center" : "left",
            vertical: "center",
            wrapText: colIdx === 7,
          },
          border: thinBorder,
        };
        if (rowColor) {
          cellStyle.fill = { fgColor: { rgb: rowColor } };
        } else {
          cellStyle.fill = { fgColor: { rgb: "FFFFFF" } };
        }
        ws[cellRef].s = cellStyle;
      });
    });

    ws["!cols"] = [
      { wch: 8 },
      { wch: 14 },
      { wch: 28 },
      { wch: 22 },
      { wch: 20 },
      { wch: 20 },
      { wch: 18 },
      { wch: 35 },
    ];

    ws["!autofilter"] = { ref: `A1:H${dataRows.length + 1}` };

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Walk-in");
    const fileName = `Walk_In_Candidates_${toDateStr(new Date())}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const handleDownloadStageWithoutSalaryXlsx = (stageKey, customItems = null) => {
    const items = customItems || filteredSelectedStatusItems || [];
    if (!items || items.length === 0) {
      window.alert(`No ${formatStatusLabel(stageKey).toLowerCase()} candidate records available to download.`);
      return;
    }

    const monthName = getStageMonthName(items, stageKey);
    const topRow = ["", "", "", "", monthName, "", "", "", "", ""];
    const headerRow = [
      "",
      "S.No",
      "Date",
      "Name",
      "Number",
      "Company",
      "Process",
      "Location",
      "Recruiter",
      "Notes",
    ];

    const dataRows = items.map((item, idx) => {
      const stageDateVal = getStageDateVal(item, stageKey);
      const noteVal = getStageNoteVal(item, stageKey);
      const processVal =
        item.process ||
        item.processName ||
        item.extra_info?.process ||
        item.extraInfo?.process ||
        "";

      return [
        "",
        idx + 1,
        formatJoiningDateForExcel(stageDateVal),
        getCandidateDisplayName(item),
        item.candidatePhone || item.phone || item.contactNumber || item.contact_number || "",
        formatResumeCompanyDisplay(item) || item.companyName || "-",
        processVal,
        item.city || item.job?.city || item.officeLocationCity || item.location || "-",
        item.recruiterName || item.recruiter || "-",
        noteVal,
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([topRow, headerRow, ...dataRows]);

    const thinBorder = {
      top: { style: "thin", color: { rgb: "D9D9D9" } },
      bottom: { style: "thin", color: { rgb: "D9D9D9" } },
      left: { style: "thin", color: { rgb: "D9D9D9" } },
      right: { style: "thin", color: { rgb: "D9D9D9" } },
    };

    const colLetters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

    // Style top month row
    colLetters.forEach((col) => {
      const cellRef = `${col}1`;
      if (!ws[cellRef]) ws[cellRef] = { t: "s", v: "" };
      ws[cellRef].s = {
        font: {
          name: "Calibri",
          sz: 11,
          bold: col === "E",
          color: { rgb: "000000" },
        },
        alignment: { horizontal: "center", vertical: "center" },
        border: thinBorder,
      };
      if (col === "E") {
        ws[cellRef].s.fill = { fgColor: { rgb: "4DD0E1" } };
      }
    });

    // Style header row (Row 2)
    colLetters.forEach((col) => {
      const cellRef = `${col}2`;
      if (!ws[cellRef]) ws[cellRef] = { t: "s", v: "" };
      ws[cellRef].s = {
        font: {
          name: "Calibri",
          sz: 11,
          bold: true,
          color: { rgb: "000000" },
        },
        alignment: { horizontal: "center", vertical: "center" },
        border: thinBorder,
      };
      if (col !== "A") {
        ws[cellRef].s.fill = { fgColor: { rgb: "BDD7EE" } };
      }
    });

    // Style data rows (Row 3 onwards)
    items.forEach((item, rowIdx) => {
      const rowNum = rowIdx + 3;
      colLetters.forEach((col) => {
        const cellRef = `${col}${rowNum}`;
        if (!ws[cellRef]) ws[cellRef] = { t: "s", v: "" };
        ws[cellRef].s = {
          font: { name: "Calibri", sz: 11, color: { rgb: "000000" } },
          alignment: { horizontal: "center", vertical: "center" },
          border: thinBorder,
        };
      });
    });

    ws["!cols"] = [
      { wch: 4 },  // A
      { wch: 8 },  // B: S.No
      { wch: 12 }, // C: Date
      { wch: 28 }, // D: Name
      { wch: 16 }, // E: Number
      { wch: 30 }, // F: Company
      { wch: 16 }, // G: Process
      { wch: 18 }, // H: Location
      { wch: 22 }, // I: Recruiter
      { wch: 25 }, // J: Notes
    ];

    const label = formatStatusLabel(stageKey);
    const sheetName = `${label} Sheet`.slice(0, 31);
    const safeStage = label.replace(/\s+/g, "_");
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const fileName = `${safeStage}_Sheet_${monthName}_${toDateStr(new Date())}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const handleDownloadShortlistedXlsx = (customItems = null) => {
    handleDownloadStageWithoutSalaryXlsx("shortlisted", customItems);
  };

  const handleDownloadJoinedXlsx = (customItems = null) => {
    const items = customItems || filteredSelectedStatusItems || [];
    if (!items || items.length === 0) {
      window.alert("No joined candidate records available to download.");
      return;
    }

    const monthName = getJoiningMonthName(items);
    const topRow = ["", "", "", "", monthName, "", "", "", "", "", ""];
    const headerRow = [
      "",
      "S.No",
      "Date",
      "Name",
      "Number",
      "Company",
      "Process",
      "Location",
      "Recruiter",
      "Notes",
      "Amount",
    ];

    const dataRows = items.map((item, idx) => {
      const rev =
        getExistingRevenueAmount(item) ||
        item.revenue ||
        item.revenueAmount ||
        item.amount ||
        "";
      const joiningDateVal =
        item.joiningDate ||
        item.currentJoiningDate ||
        item.joinedAt ||
        item.eventAt;

      const noteVal =
        normalizeNoteText(item.joiningNote) ||
        normalizeNoteText(item.joinedReason) ||
        normalizeNoteText(getPerformanceNoteForStatus(item, "joined")) ||
        normalizeNoteText(item.selectionNote) ||
        normalizeNoteText(item.note) ||
        "";

      return [
        "",
        idx + 1,
        formatJoiningDateForExcel(joiningDateVal),
        getCandidateDisplayName(item),
        item.candidatePhone || item.phone || item.contactNumber || item.contact_number || "",
        formatResumeCompanyDisplay(item) || item.companyName || "-",
        item.process || item.processName || "",
        item.city || item.job?.city || item.location || "-",
        item.recruiterName || item.recruiter || "-",
        noteVal,
        rev ? Number(rev) : "",
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([topRow, headerRow, ...dataRows]);

    const thinBorder = {
      top: { style: "thin", color: { rgb: "D9D9D9" } },
      bottom: { style: "thin", color: { rgb: "D9D9D9" } },
      left: { style: "thin", color: { rgb: "D9D9D9" } },
      right: { style: "thin", color: { rgb: "D9D9D9" } },
    };

    const colLetters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"];

    // Style top month row
    colLetters.forEach((col) => {
      const cellRef = `${col}1`;
      if (!ws[cellRef]) ws[cellRef] = { t: "s", v: "" };
      ws[cellRef].s = {
        font: {
          name: "Calibri",
          sz: 11,
          bold: col === "E",
          color: { rgb: "000000" },
        },
        alignment: { horizontal: "center", vertical: "center" },
        border: thinBorder,
      };
      if (col === "E") {
        ws[cellRef].s.fill = { fgColor: { rgb: "4DD0E1" } };
      }
    });

    // Style header row (Row 2)
    colLetters.forEach((col) => {
      const cellRef = `${col}2`;
      if (!ws[cellRef]) ws[cellRef] = { t: "s", v: "" };
      ws[cellRef].s = {
        font: {
          name: "Calibri",
          sz: 11,
          bold: true,
          color: { rgb: "000000" },
        },
        alignment: { horizontal: "center", vertical: "center" },
        border: thinBorder,
      };
      if (col !== "A") {
        ws[cellRef].s.fill = { fgColor: { rgb: "BDD7EE" } };
      }
    });

    // Style data rows (Row 3 onwards)
    items.forEach((item, rowIdx) => {
      const rowNum = rowIdx + 3;
      colLetters.forEach((col) => {
        const cellRef = `${col}${rowNum}`;
        if (!ws[cellRef]) ws[cellRef] = { t: "s", v: "" };
        ws[cellRef].s = {
          font: { name: "Calibri", sz: 11, color: { rgb: "000000" } },
          alignment: { horizontal: "center", vertical: "center" },
          border: thinBorder,
        };
      });
    });

    ws["!cols"] = [
      { wch: 4 },  // A
      { wch: 8 },  // B: S.No
      { wch: 12 }, // C: Date
      { wch: 28 }, // D: Name
      { wch: 16 }, // E: Number
      { wch: 30 }, // F: Company
      { wch: 16 }, // G: Process
      { wch: 18 }, // H: Location
      { wch: 22 }, // I: Recruiter
      { wch: 20 }, // J: Notes
      { wch: 14 }, // K: Amount
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Joining Sheet");
    const fileName = `Joining_Sheet_${monthName}_${toDateStr(new Date())}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const handleDownloadSelectedXlsx = (customItems = null) => {
    handleDownloadStageWithoutSalaryXlsx("selected", customItems);
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

  const handleSaveNote = async (item, statusKey, newNote) => {
    const resId = item?.resId ?? item?.res_id ?? item?.resumeId ?? item?.resume_id;
    if (!resId) throw new Error("Resume ID not found");
    await adminUpdateResumeNote(resId, { note: newNote, status: statusKey || "pending" });
    item.pendingReason = newNote;
    item.pending_reason = newNote;
    item.selectionNote = newNote;
    item.latestNote = newNote;
    item.note = newNote;
    setStatusOverrides((prev) => ({
      ...prev,
      [`note_${resId}`]: newNote,
    }));
  };

  const renderNoteButton = (item, noteValue, statusValue) => {
    const currentStatus = normalizeStatus(statusValue || selectedStatusKey || item?.currentStatus || item?.status);
    const isPending = currentStatus === "pending" || selectedStatusKey === "pending";
    const effectiveNote =
      isPending && statusOverrides[`note_${item?.resId}`] !== undefined
        ? statusOverrides[`note_${item?.resId}`]
        : noteValue;
    return (
      <NoteViewButton
        note={effectiveNote}
        candidateName={getCandidateDisplayName(item)}
        authorName={resolveNoteAuthor(item, effectiveNote, statusValue)}
        editable={isPending}
        emptyLabel="+ Add Note"
        onSave={isPending ? (newNote) => handleSaveNote(item, currentStatus, newNote) : undefined}
      />
    );
  };

  const renderPersonMetrics = (
    person,
    metrics,
    roleLabel,
    personStatusItems,
    pagination,
  ) => {
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
              className={`perf-stat-card ${card.key === "points"
                  ? `perf-stat-card-${card.tone}`
                  : `perf-stat-card-button perf-stat-card-${card.tone}${selectedStatusKey === card.key ? " perf-stat-card-active" : ""
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
            <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
              <h3 className="perf-section-title" style={{ marginBottom: 0 }}>
                {selectedStatusKey === "submitted"
                  ? "Submitted Resume List"
                  : `${formatStatusLabel(selectedStatusKey)} Resume List`}
              </h3>
              {DOWNLOADABLE_STAGES.includes(selectedStatusKey) && (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedStatusKey === "joined") handleDownloadJoinedXlsx(personStatusItems);
                    else if (selectedStatusKey === "walk_in") handleDownloadWalkInXlsx(personStatusItems);
                    else handleDownloadStageWithoutSalaryXlsx(selectedStatusKey, personStatusItems);
                  }}
                  className="admin-refresh-btn"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    backgroundColor: "#16a34a",
                    color: "#ffffff",
                    border: "none",
                    padding: "6px 14px",
                    borderRadius: "6px",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    boxShadow: "0 2px 4px rgba(22, 163, 74, 0.2)",
                  }}
                  title={`Download ${formatStatusLabel(selectedStatusKey)} candidates as Excel (.xlsx)`}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download XLSX
                </button>
              )}
            </div>
            <span className="admin-muted">
              {personStatusItems.length} item
              {personStatusItems.length === 1 ? "" : "s"}
            </span>
          </div>
          {personStatusItems.length > 0 ? (
            <div style={{ marginTop: "16px" }}>
              <TablePaginationControls {...pagination} />
              <div className="admin-table-wrap perf-records-scroll-wrap">
                <table className="admin-table admin-table-wide perf-fixed-header-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: "160px" }}>Candidate</th>
                    <th style={{ minWidth: "150px" }}>Recruiter</th>
                    <th style={{ minWidth: "140px" }}>Team Leader</th>
                    <th style={{ minWidth: "140px" }}>Contact Number</th>
                    <th style={{ minWidth: "140px" }}>Highest Qualification</th>
                    <th style={{ minWidth: "180px" }}>Company Name</th>
                    <th className="perf-city-col" style={{ minWidth: "160px" }}>City</th>
                    <th style={{ minWidth: "120px" }}>Resume File</th>
                    <th style={{ minWidth: "110px" }}>Status</th>
                    <th style={{ minWidth: "140px" }}>Submitted At</th>
                    {selectedStatusKey !== "submitted" && (
                      <th>
                        {selectedStatusKey === "verified"
                          ? "Verification Date"
                          : selectedStatusKey === "walk_in"
                            ? "Walk-in Date"
                            : selectedStatusKey === "didnt_turn_up"
                              ? "Didn't Turn Up Date"
                              : selectedStatusKey === "shortlisted"
                              ? "Shortlist Date"
                              : selectedStatusKey === "selected"
                                ? "Selection Date"
                                : selectedStatusKey === "pending"
                                  ? "Pending Date"
                                  : selectedStatusKey === "joined"
                                  ? "Joining Date"
                                  : selectedStatusKey === "rejected"
                                    ? "Rejection Date"
                                    : selectedStatusKey === "dropout"
                                      ? "Dropout Date"
                                      : selectedStatusKey === "billed"
                                        ? "Billing Date"
                                        : selectedStatusKey === "left"
                                          ? "Exit Date"
                                          : `${formatStatusLabel(selectedStatusKey)} Date`}
                      </th>
                    )}
                    {selectedStatusKey === "shortlisted" && (
                      <th style={{ minWidth: "150px" }}>Process</th>
                    )}
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
                              ? "Tentative Joining Date"
                              : "Joining Info"}
                        </th>
                      )}
                    <th>Note / Reason</th>
                    {hasAnyRowActions && <th style={{ minWidth: "240px" }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {pagination.paginatedItems.map((item) => {
                    const rowActionState = getRowActionState(item);
                    const rowHasActions =
                      rowActionState.availableActions.length > 0 ||
                      rowActionState.canRollback;
                    return (
                      <tr key={`${roleLabel}-${selectedStatusKey}-${item.resId}`}>
                        <td className="admin-performance-key-cell">
                          <strong>{getCandidateDisplayName(item)}</strong>
                        </td>
                        <td>
                          <strong>{displayValue(item.recruiterName)}</strong>
                          <div className="admin-muted">
                            {displayValue(item.recruiterRid)}
                          </div>
                        </td>
                        <td>{displayValue(item.teamLeaderName)}</td>
                        <td className="admin-performance-key-cell">
                          {item.candidatePhone || item.phone ? (
                            <a href={`tel:${item.candidatePhone || item.phone}`}>
                              {item.candidatePhone || item.phone}
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="admin-performance-key-cell">
                          {formatQualificationDisplay(
                            item.highestQualification ||
                              item.latestEducationLevel ||
                              item.levelOfEdu,
                          )}
                        </td>
                        <td className="admin-performance-key-cell">
                          {displayValue(formatResumeCompanyDisplay(item))}
                        </td>
                        <td className="admin-performance-key-cell perf-city-cell" style={{ minWidth: "160px", whiteSpace: "nowrap" }}>
                          {displayValue(item.city || item.job?.city)}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="admin-refresh-btn admin-resume-file-btn"
                            onClick={() => handleResumeOpen(item.resId)}
                            title={item.resumeFilename || item.resId || "View resume"}
                          >
                            <span className="admin-resume-file-btn-label">
                              {truncateResumeFilename(
                                item.resumeFilename || item.resId || "View resume",
                              )}
                            </span>
                          </button>
                        </td>
                        <td>{formatStatusLabel(item.currentStatus || item.status)}</td>
                        <td>{formatDateTime(item.submittedAt || item.uploadedAt)}</td>
                        {selectedStatusKey !== "submitted" && (
                          <td>
                            {formatEventDate(
                              (selectedStatusKey === "walk_in" ? (item.walkInDate || item.walkInAt) : null) ||
                              (selectedStatusKey === "didnt_turn_up" ? (item.didntTurnUpAt || item.didnt_turn_up_at) : null) ||
                              (selectedStatusKey === "joined" ? (item.joiningDate || item.joinedAt) : null) ||
                              (selectedStatusKey === "selected" ? item.selectedAt : null) ||
                              (selectedStatusKey === "pending" ? (item.pendingAt || item.pending_at || item.selectedAt || item.shortlistedAt) : null) ||
                              item.eventAt ||
                              item[`${selectedStatusKey}At`]
                            )}
                          </td>
                        )}
                        {selectedStatusKey === "shortlisted" && (
                          <td>{item.process || item.processName || "-"}</td>
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
                                renderNoteButton(
                                  item,
                                  item.dropoutReason || item.reason,
                                  "dropout",
                                )
                              ) : selectedStatusKey === "selected" ? (
                                item.joiningDate ? formatDate(item.joiningDate) : "-"
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
                                      {renderNoteButton(
                                        item,
                                        item.joiningNote || item.joinedReason,
                                        "joined",
                                      )}
                                    </div>
                                  ) : null}
                                </>
                              ) : (
                                "-"
                              )}
                            </td>
                          )}
                        <td>
                          {renderNoteButton(
                            item,
                            getPerformanceNoteForStatus(item, selectedStatusKey),
                            selectedStatusKey,
                          )}
                        </td>
                        {hasAnyRowActions && (
                          <td style={{ minWidth: isFromWalkInStage(selectedStatusKey) || isFromWalkInStage(item.currentStatus || item.status) ? "180px" : "240px" }}>
                            {rowHasActions ? (
                              <div
                                style={{
                                  display: "flex",
                                  gap: "6px",
                                  flexWrap: "wrap",
                                }}
                              >
                                {(isFromWalkInStage(selectedStatusKey) || isFromWalkInStage(item.currentStatus || item.status)) ? (
                                  <>
                                    {rowActionState.availableActions.length > 0 && (
                                      <button
                                        type="button"
                                        className="admin-refresh-btn"
                                        style={{
                                          backgroundColor: "#2563eb",
                                          color: "#ffffff",
                                          border: "none",
                                          padding: "6px 14px",
                                          borderRadius: "6px",
                                          fontWeight: 600,
                                          fontSize: "0.85rem",
                                          cursor: "pointer",
                                          boxShadow: "0 2px 4px rgba(37, 99, 235, 0.2)",
                                        }}
                                        onClick={() => openApplyActionModal(item)}
                                      >
                                        Apply Action
                                      </button>
                                    )}
                                    {rowActionState.canRollback && (
                                      <button
                                        type="button"
                                        className="admin-refresh-btn"
                                        style={{
                                          backgroundColor: "#111827",
                                          color: "#ffffff",
                                          border: "none",
                                          padding: "6px 14px",
                                          borderRadius: "6px",
                                          fontWeight: 600,
                                          fontSize: "0.85rem",
                                          cursor: "pointer",
                                        }}
                                        onClick={() => handleAdminRollback(item)}
                                      >
                                        Rollback
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  <>
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
                                  </>
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

      {/* Horizontal Employee Ranking & Team Breakdown Showcase */}
      <div className="perf-horizontal-ranking-wrap" style={{ marginTop: 8, marginBottom: 24 }}>
        <EmployeeRankingWidget layout="horizontal" activeRecruiterRids={activeRecruiterRids} />
      </div>

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
            <div className="perf-inline-search" style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <input
                type="text"
                className="perf-search perf-search-wide"
                placeholder="Search by candidate name, phone or company..."
                value={recruiterEntrySearch}
                onChange={(e) => setRecruiterEntrySearch(e.target.value)}
              />
              {normalizeLookupKey(recruiterEntrySearch) ? (
                <>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "6px 14px",
                      borderRadius: "6px",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      backgroundColor:
                        filteredSelectedStatusItems.length > 0
                          ? "#ecfdf5"
                          : "#fef2f2",
                      color:
                        filteredSelectedStatusItems.length > 0
                          ? "#047857"
                          : "#b91c1c",
                      border: `1px solid ${
                        filteredSelectedStatusItems.length > 0
                          ? "#a7f3d0"
                          : "#fecaca"
                      }`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {filteredSelectedStatusItems.length}{" "}
                    {filteredSelectedStatusItems.length === 1
                      ? "record found"
                      : "records found"}
                  </span>
                  <button
                    type="button"
                    className="admin-back-btn"
                    onClick={() => setRecruiterEntrySearch("")}
                  >
                    Clear
                  </button>
                </>
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
              <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
                <h3 className="perf-section-title" style={{ marginBottom: 0 }}>
                  {selectedStatusKey === "submitted"
                    ? "Submitted Resume List"
                    : `${formatStatusLabel(selectedStatusKey)} Resume List`}
                </h3>
                {DOWNLOADABLE_STAGES.includes(selectedStatusKey) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedStatusKey === "joined") handleDownloadJoinedXlsx();
                      else if (selectedStatusKey === "walk_in") handleDownloadWalkInXlsx();
                      else handleDownloadStageWithoutSalaryXlsx(selectedStatusKey);
                    }}
                    className="admin-refresh-btn"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      backgroundColor: "#16a34a",
                      color: "#ffffff",
                      border: "none",
                      padding: "6px 14px",
                      borderRadius: "6px",
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      boxShadow: "0 2px 4px rgba(22, 163, 74, 0.2)",
                    }}
                    title={`Download ${formatStatusLabel(selectedStatusKey)} candidates as Excel (.xlsx)`}
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download XLSX
                  </button>
                )}
              </div>
              <span className="admin-muted">
                {normalizeLookupKey(recruiterEntrySearch)
                  ? `${filteredSelectedStatusItems.length} record${filteredSelectedStatusItems.length === 1 ? "" : "s"} found`
                  : `${filteredSelectedStatusItems.length} item${filteredSelectedStatusItems.length === 1 ? "" : "s"}`}
              </span>
            </div>
            {filteredSelectedStatusItems.length > 0 ? (
              <div style={{ marginTop: "16px" }}>
                <TablePaginationControls {...overviewPagination} />
                <div className="admin-table-wrap perf-records-scroll-wrap">
                  <table className="admin-table admin-table-wide perf-fixed-header-table">
                  <thead>
                    <tr>
                      <th style={{ minWidth: "160px" }}>Candidate Name</th>
                      <th style={{ minWidth: "150px" }}>Recruiter</th>
                      <th style={{ minWidth: "140px" }}>Contact Number</th>
                      <th style={{ minWidth: "140px" }}>Highest Qualification</th>
                      <th style={{ minWidth: "180px" }}>Company Name</th>
                      <th className="perf-city-col" style={{ minWidth: "160px" }}>City</th>
                      <th style={{ minWidth: "120px" }}>Resume File</th>
                      <th style={{ minWidth: "110px" }}>Status</th>
                      <th style={{ minWidth: "140px" }}>Submitted At</th>
                      {selectedStatusKey !== "submitted" && (
                        <th>
                          {selectedStatusKey === "verified"
                            ? "Verification Date"
                            : selectedStatusKey === "walk_in"
                              ? "Walk-in Date"
                              : selectedStatusKey === "didnt_turn_up"
                                ? "Didn't Turn Up Date"
                                : selectedStatusKey === "shortlisted"
                                ? "Shortlist Date"
                                : selectedStatusKey === "selected"
                                  ? "Selection Date"
                                  : selectedStatusKey === "pending"
                                    ? "Pending Date"
                                    : selectedStatusKey === "joined"
                                    ? "Joining Date"
                                    : selectedStatusKey === "rejected"
                                      ? "Rejection Date"
                                      : selectedStatusKey === "dropout"
                                        ? "Dropout Date"
                                        : selectedStatusKey === "billed"
                                          ? "Billing Date"
                                          : selectedStatusKey === "left"
                                            ? "Exit Date"
                                            : `${formatStatusLabel(selectedStatusKey)} Date`}
                        </th>
                      )}
                      {selectedStatusKey === "shortlisted" && (
                        <th style={{ minWidth: "150px" }}>Process</th>
                      )}
                      {["selected", "joined", "billed", "left"].includes(selectedStatusKey) && (
                        <th>{selectedStatusKey === "selected" ? "Tentative Joining Date" : "Joining Date"}</th>
                      )}
                      <th>Note / Reason</th>
                      {hasAnyRowActions && <th style={{ minWidth: "240px" }}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {overviewPagination.paginatedItems.map((item) => {
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
                          <td className="admin-performance-key-cell">
                            <strong>{getCandidateDisplayName(item)}</strong>
                          </td>
                          <td>
                            <strong>{displayValue(item.recruiterName)}</strong>
                            <div className="admin-muted">
                              {displayValue(item.recruiterRid)}
                            </div>
                          </td>
                          <td className="admin-performance-key-cell">
                            {item.candidatePhone || item.phone ? (
                              <a
                                href={`tel:${item.candidatePhone || item.phone}`}
                              >
                                {item.candidatePhone || item.phone}
                              </a>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="admin-performance-key-cell">
                            {formatQualificationDisplay(
                              item.highestQualification ||
                                item.latestEducationLevel ||
                                item.levelOfEdu,
                            )}
                          </td>
                          <td className="admin-performance-key-cell">
                            {displayValue(formatResumeCompanyDisplay(item))}
                          </td>
                          <td className="admin-performance-key-cell perf-city-cell" style={{ minWidth: "160px", whiteSpace: "nowrap" }}>
                            {displayValue(item.city || item.job?.city)}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="admin-refresh-btn admin-resume-file-btn"
                              onClick={() => handleResumeOpen(item.resId)}
                              title={item.resumeFilename || item.resId || "View resume"}
                            >
                              <span className="admin-resume-file-btn-label">
                                {truncateResumeFilename(
                                  item.resumeFilename || item.resId || "View resume",
                                )}
                              </span>
                            </button>
                          </td>
                          <td>{formatStatusLabel(item.currentStatus || item.status)}</td>
                          <td>{formatDateTime(item.submittedAt || item.uploadedAt)}</td>
                          {selectedStatusKey !== "submitted" && (
                            <td>
                              {formatEventDate(
                                (selectedStatusKey === "walk_in" ? (item.walkInDate || item.walkInAt) : null) ||
                                (selectedStatusKey === "didnt_turn_up" ? (item.didntTurnUpAt || item.didnt_turn_up_at) : null) ||
                                (selectedStatusKey === "joined" ? (item.joiningDate || item.joinedAt) : null) ||
                                (selectedStatusKey === "selected" ? item.selectedAt : null) ||
                                (selectedStatusKey === "pending" ? (item.pendingAt || item.pending_at || item.selectedAt || item.shortlistedAt) : null) ||
                                item.eventAt ||
                                item[`${selectedStatusKey}At`]
                              )}
                            </td>
                          )}
                          {selectedStatusKey === "shortlisted" && (
                            <td>{item.process || item.processName || "-"}</td>
                          )}
                          {["selected", "joined", "billed", "left"].includes(selectedStatusKey) && (
                            <td>{item.joiningDate ? formatDate(item.joiningDate) : "-"}</td>
                          )}
                          <td>
                            {renderNoteButton(
                              item,
                              getPerformanceNoteForStatus(item, selectedStatusKey),
                              selectedStatusKey,
                            )}
                          </td>
                          {hasAnyRowActions && (
                            <td style={{ minWidth: isFromWalkInStage(selectedStatusKey) || isFromWalkInStage(item.currentStatus || item.status) ? "180px" : "240px" }}>
                              {rowHasActions ? (
                                <div
                                  style={{
                                    display: "flex",
                                    gap: "6px",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  {(isFromWalkInStage(selectedStatusKey) || isFromWalkInStage(item.currentStatus || item.status)) ? (
                                    <>
                                      {rowActionState.availableActions.length > 0 && (
                                        <button
                                          type="button"
                                          className="admin-refresh-btn"
                                          style={{
                                            backgroundColor: "#2563eb",
                                            color: "#ffffff",
                                            border: "none",
                                            padding: "6px 14px",
                                            borderRadius: "6px",
                                            fontWeight: 600,
                                            fontSize: "0.85rem",
                                            cursor: "pointer",
                                            boxShadow: "0 2px 4px rgba(37, 99, 235, 0.2)",
                                          }}
                                          onClick={() => openApplyActionModal(item)}
                                        >
                                          Apply Action
                                        </button>
                                      )}
                                      {rowActionState.canRollback && (
                                        <button
                                          type="button"
                                          className="admin-refresh-btn"
                                          style={{
                                            backgroundColor: "#111827",
                                            color: "#ffffff",
                                            border: "none",
                                            padding: "6px 14px",
                                            borderRadius: "6px",
                                            fontWeight: 600,
                                            fontSize: "0.85rem",
                                            cursor: "pointer",
                                          }}
                                          onClick={() => handleAdminRollback(item)}
                                        >
                                          Rollback
                                        </button>
                                      )}
                                    </>
                                  ) : (
                                    <>
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
                                    </>
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
                  ? `No resumes found matching "${recruiterEntrySearch.trim()}" in ${selectedStatusKey === "submitted" ? "Resumes Submitted" : formatStatusLabel(selectedStatusKey)}.`
                  : `No resumes found for ${selectedStatusKey === "submitted" ? "Resumes Submitted" : formatStatusLabel(selectedStatusKey)}.`}
              </p>
            )}
          </div>

          {/* Set Recruiter Targets Section */}
          <div className="perf-section recruiter-targets-section">
            <div className="recruiter-targets-header">
              <div className="recruiter-targets-title-wrap">
                <span className="recruiter-targets-icon">🎯</span>
                <div>
                  <h3 className="perf-section-title" style={{ margin: 0 }}>
                    Set Recruiter Targets
                  </h3>
                  <p className="recruiter-targets-subtitle">
                    Set joining targets for custom date ranges and monitor real-time & historical progress.
                  </p>
                </div>
              </div>

              <div className="recruiter-targets-controls">
                <button
                  type="button"
                  className="target-export-excel-btn"
                  onClick={handleExportTargetsExcel}
                  disabled={exportingExcel || targetLoading}
                  title="Download Targets Excel (.xlsx) with Team BPO and Team NBFC sheets"
                >
                  <span>📥</span> {exportingExcel ? "Exporting..." : "Download Excel (.xlsx)"}
                </button>
                <button
                  type="button"
                  className="target-history-trigger-btn"
                  onClick={() => openTargetHistory("")}
                  title="View previous target periods and progress history"
                >
                  <span>📜</span> View Target History
                </button>
                <input
                  type="text"
                  className="recruiter-targets-search"
                  placeholder="Search recruiter by name, RID, or team..."
                  value={targetSearch}
                  onChange={(e) => setTargetSearch(e.target.value)}
                />
                {hasAnyTargetChanges && (
                  <button
                    type="button"
                    className="admin-btn admin-btn-primary"
                    disabled={savingAllTargets}
                    onClick={handleSaveAllTargets}
                  >
                    {savingAllTargets ? "Saving..." : "Save All Changes"}
                  </button>
                )}
              </div>
            </div>

            {/* Target Period Selector Bar */}
            <div className="recruiter-targets-period-bar">
              <div className="target-preset-group">
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", marginRight: "4px" }}>
                  PERIOD:
                </span>
                <button
                  type="button"
                  className={`target-preset-btn ${targetPreset === "this_month" ? "active" : ""}`}
                  onClick={() => setTargetPreset("this_month")}
                >
                  This Month
                </button>
                <button
                  type="button"
                  className={`target-preset-btn ${targetPreset === "last_month" ? "active" : ""}`}
                  onClick={() => setTargetPreset("last_month")}
                >
                  Last Month
                </button>
                <button
                  type="button"
                  className={`target-preset-btn ${targetPreset === "last_20_days" ? "active" : ""}`}
                  onClick={() => setTargetPreset("last_20_days")}
                >
                  Last 20 Days
                </button>
                <button
                  type="button"
                  className={`target-preset-btn ${targetPreset === "last_7_days" ? "active" : ""}`}
                  onClick={() => setTargetPreset("last_7_days")}
                >
                  Last 7 Days
                </button>
                <button
                  type="button"
                  className={`target-preset-btn ${targetPreset === "custom" ? "active" : ""}`}
                  onClick={() => {
                    setTargetPreset("custom");
                    if (!targetCustomStart) setTargetCustomStart(targetDateRange.start);
                    if (!targetCustomEnd) setTargetCustomEnd(targetDateRange.end);
                  }}
                >
                  Custom Range
                </button>
              </div>

              {/* Team Wise Filter Buttons (All Recruiters, Team BPO, Team NBFC) */}
              <div className="target-team-filter-group" role="tablist" aria-label="Filter recruiters by team">
                <span className="target-team-filter-label">
                  TEAM:
                </span>
                {targetTeamOptions.map((opt) => {
                  const isActive = targetTeamFilter === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      className={`target-team-btn ${isActive ? "active" : ""}`}
                      onClick={() => setTargetTeamFilter(opt.key)}
                      title={`Filter by ${opt.label}`}
                    >
                      <span>{opt.label}</span>
                      <span className="target-team-badge">{opt.count}</span>
                    </button>
                  );
                })}
              </div>

              {targetPreset === "custom" && (
                <div className="target-custom-inputs-wrap">
                  <span style={{ fontSize: "12px", color: "#475569", fontWeight: 600 }}>From:</span>
                  <input
                    type="date"
                    className="target-date-picker"
                    value={targetCustomStart}
                    onChange={(e) => setTargetCustomStart(e.target.value)}
                  />
                  <span style={{ fontSize: "12px", color: "#475569", fontWeight: 600 }}>To:</span>
                  <input
                    type="date"
                    className="target-date-picker"
                    value={targetCustomEnd}
                    onChange={(e) => setTargetCustomEnd(e.target.value)}
                  />
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    style={{ padding: "4px 10px", fontSize: "12px" }}
                    onClick={() => {
                      if (targetCustomStart && targetCustomEnd) {
                        fetchTargetsForRange(targetCustomStart, targetCustomEnd);
                      }
                    }}
                  >
                    Apply
                  </button>
                </div>
              )}

              <div className="target-period-badge">
                <span>📅</span>
                <span>
                  {targetDateRange.start} to {targetDateRange.end}
                  {targetDateRange.label ? ` (${targetDateRange.label})` : ""}
                </span>
              </div>
            </div>

            {targetMessage.text && (
              <div
                className={`admin-alert ${
                  targetMessage.type === "error"
                    ? "admin-alert-error"
                    : "admin-alert-success"
                }`}
                style={{ marginBottom: "14px" }}
              >
                {targetMessage.text}
              </div>
            )}

            {targetLoading ? (
              <p className="admin-chart-empty" style={{ padding: "30px 0" }}>
                Loading targets & progress for {targetDateRange.label || "selected period"}...
              </p>
            ) : filteredTargetRecruiters.length > 0 ? (
              <div className="admin-table-wrap perf-records-scroll-wrap">
                <table className="admin-table recruiter-targets-table perf-fixed-header-table">
                  <thead>
                    <tr>
                      <th style={{ width: "40px" }}>#</th>
                      <th style={{ minWidth: "160px" }}>Recruiter</th>
                      <th>Submissions</th>
                      <th>Walk-in</th>
                      <th>Selected</th>
                      <th>Pending</th>
                      <th>Joining</th>
                      <th>Drop</th>
                      <th>Joining Target</th>
                      <th style={{ minWidth: "140px" }}>Progress</th>
                      <th style={{ minWidth: "110px", textAlign: "center" }}>Performance</th>
                      <th style={{ textAlign: "center", width: "120px" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTargetRecruiters.map((r, i) => {
                      const targetNumber = Number(r.target ?? r.joiningTarget ?? 0);
                      const achieved = Number(r.joined ?? 0);
                      const pct = Number(
                        r.progressPct ?? (
                          targetNumber > 0
                            ? Math.min(100, Math.round((achieved / targetNumber) * 100))
                            : achieved > 0
                            ? 100
                            : 0
                        )
                      );
                      const perfRating = getPerformanceRating(pct);

                      return (
                        <tr key={r.rid}>
                          <td>{i + 1}</td>
                          <td>
                            <div style={{ fontWeight: 700, color: "#0f172a" }}>
                              {r.name || "Unknown"}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "3px" }}>
                              <span style={{ fontSize: "11.5px", color: "#64748b", fontWeight: 600 }}>
                                {r.rid || "-"}
                              </span>
                              {r.team && (
                                <span
                                  style={{
                                    display: "inline-block",
                                    padding: "1px 6px",
                                    borderRadius: "4px",
                                    fontSize: "11px",
                                    background: "#f1f5f9",
                                    color: "#475569",
                                    fontWeight: 600,
                                    border: "1px solid #e2e8f0",
                                  }}
                                >
                                  {r.team}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span style={{ fontWeight: 600 }}>{r.submitted ?? 0}</span>
                          </td>
                          <td>
                            <span style={{ fontWeight: 600 }}>{r.walk_in ?? r.walkIn ?? 0}</span>
                          </td>
                          <td>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                background: Number(r.selected || 0) > 0 ? "#e0e7ff" : "#f3f4f6",
                                color: Number(r.selected || 0) > 0 ? "#4338ca" : "#6b7280",
                                fontWeight: 600,
                                fontSize: "12px",
                              }}
                            >
                              {r.selected ?? 0}
                            </span>
                          </td>
                          <td>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                background: Number(r.pending || 0) > 0 ? "#fef3c7" : "#f3f4f6",
                                color: Number(r.pending || 0) > 0 ? "#b45309" : "#6b7280",
                                fontWeight: 600,
                                fontSize: "12px",
                              }}
                            >
                              {r.pending ?? 0}
                            </span>
                          </td>
                          <td>
                            <span
                              className="target-joined-badge"
                              style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                background: Number(achieved) > 0 ? "#dcfce7" : "#f3f4f6",
                                color: Number(achieved) > 0 ? "#15803d" : "#6b7280",
                                fontWeight: 600,
                                fontSize: "12px",
                              }}
                            >
                              {achieved} Joined
                            </span>
                          </td>
                          <td>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                background: Number(r.drop || 0) > 0 ? "#fee2e2" : "#f3f4f6",
                                color: Number(r.drop || 0) > 0 ? "#b91c1c" : "#6b7280",
                                fontWeight: 600,
                                fontSize: "12px",
                              }}
                            >
                              {r.drop ?? 0}
                            </span>
                          </td>
                          <td>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "4px 10px",
                                borderRadius: "6px",
                                background: targetNumber > 0 ? "#eff6ff" : "#f8fafc",
                                border: targetNumber > 0 ? "1px solid #bfdbfe" : "1px solid #e2e8f0",
                                fontWeight: 700,
                                color: targetNumber > 0 ? "#1d4ed8" : "#64748b",
                                fontSize: "13px",
                              }}
                            >
                              🎯 {targetNumber} joins
                            </span>
                          </td>
                          <td>
                            <div className="target-progress-cell">
                              <div className="target-progress-bar-bg">
                                <div
                                  className={`target-progress-bar-fill ${
                                    pct >= 100
                                      ? "fill-success"
                                      : pct >= 50
                                      ? "fill-primary"
                                      : "fill-neutral"
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span
                                className={`target-progress-text ${
                                  pct >= 100 ? "text-success" : ""
                                }`}
                              >
                                {pct}% ({achieved}/{targetNumber})
                              </span>
                            </div>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "3px 10px",
                                borderRadius: "999px",
                                fontSize: "11px",
                                fontWeight: 800,
                                textTransform: "uppercase",
                                letterSpacing: "0.03em",
                                background: perfRating.bg,
                                color: perfRating.color,
                                border: `1px solid ${perfRating.border}`,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {perfRating.label}
                            </span>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              type="button"
                              className="target-save-action-btn"
                              onClick={() => openSetTargetModal(r)}
                              title="Set target for date range"
                            >
                              🎯 Set Target
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="admin-chart-empty">
                {targetSearch.trim()
                  ? `No recruiters match "${targetSearch}".`
                  : targetTeamFilter !== "all"
                  ? `No recruiters found for ${targetTeamFilter}.`
                  : "No recruiter data available."}
              </p>
            )}
          </div>

          {/* ── Target & Progress History Modal ── */}
          {historyModalOpen && (
            <div
              className="target-history-modal-overlay"
              onClick={() => setHistoryModalOpen(false)}
            >
              <div
                className="target-history-modal-card"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="target-history-modal-header">
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>
                      📜 Recruiter Targets & Progress History
                    </h3>
                    <p style={{ margin: "3px 0 0", fontSize: "0.84rem", color: "#64748b" }}>
                      Review all previously set targets, date ranges, and actual achievements.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setHistoryModalOpen(false)}
                    style={{
                      background: "transparent",
                      border: "none",
                      fontSize: "1.5rem",
                      cursor: "pointer",
                      color: "#64748b",
                      padding: "4px 8px",
                    }}
                  >
                    ✕
                  </button>
                </div>

                <div className="target-history-modal-body">
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      marginBottom: "16px",
                      flexWrap: "wrap",
                    }}
                  >
                    <input
                      type="text"
                      className="recruiter-targets-search"
                      style={{ flex: 1, minWidth: "220px" }}
                      placeholder="Filter by recruiter name or RID..."
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                    />
                    <select
                      className="recruiter-targets-search"
                      style={{ minWidth: "180px" }}
                      value={historySelectedRid}
                      onChange={(e) => {
                        const rid = e.target.value;
                        setHistorySelectedRid(rid);
                        openTargetHistory(rid);
                      }}
                    >
                      <option value="">All Recruiters</option>
                      {(targetRecruiters || []).map((r) => (
                        <option key={r.rid} value={r.rid}>
                          {r.name} ({r.rid})
                        </option>
                      ))}
                    </select>
                  </div>

                  {historyLoading ? (
                    <p className="admin-chart-empty" style={{ padding: "30px 0" }}>
                      Loading target history...
                    </p>
                  ) : historyError ? (
                    <div className="admin-alert admin-alert-error">{historyError}</div>
                  ) : historyList.length === 0 ? (
                    <p className="admin-chart-empty" style={{ padding: "30px 0" }}>
                      No target history records found. Set a target for any period and it will appear here.
                    </p>
                  ) : (
                    <div className="admin-table-wrap perf-records-scroll-wrap">
                      <table className="admin-table recruiter-targets-table perf-fixed-header-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Recruiter</th>
                            <th>Target Period</th>
                            <th>Target</th>
                            <th>Joined</th>
                            <th>Progress</th>
                            <th>Submissions</th>
                            <th>Walk-in</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historyList
                            .filter((h) => {
                              if (!historySearch.trim()) return true;
                              const q = historySearch.toLowerCase().trim();
                              return (
                                String(h.name || "").toLowerCase().includes(q) ||
                                String(h.rid || "").toLowerCase().includes(q) ||
                                String(h.team || "").toLowerCase().includes(q)
                              );
                            })
                            .map((h, i) => (
                              <tr key={h.id || `${h.rid}_${h.startDate}_${h.endDate}`}>
                                <td>{i + 1}</td>
                                <td>
                                  <div style={{ fontWeight: 600, color: "#111827" }}>
                                    {h.name}
                                  </div>
                                  <div style={{ fontSize: "11px", color: "#6b7280" }}>
                                    {h.rid} • {h.team}
                                  </div>
                                </td>
                                <td>
                                  <div style={{ fontWeight: 600, color: "#1e293b", fontSize: "12px" }}>
                                    📅 {h.startDate} to {h.endDate}
                                  </div>
                                </td>
                                <td style={{ fontWeight: 700 }}>{h.target} joins</td>
                                <td>
                                  <span className="target-joined-badge">
                                    {h.joined} Joined
                                  </span>
                                </td>
                                <td>
                                  <div className="target-progress-cell">
                                    <div className="target-progress-bar-bg">
                                      <div
                                        className={`target-progress-bar-fill ${
                                          h.progressPct >= 100
                                            ? "fill-success"
                                            : h.progressPct >= 50
                                            ? "fill-primary"
                                            : "fill-neutral"
                                        }`}
                                        style={{ width: `${h.progressPct}%` }}
                                      />
                                    </div>
                                    <span
                                      className={`target-progress-text ${
                                        h.progressPct >= 100 ? "text-success" : ""
                                      }`}
                                    >
                                      {h.progressPct}% ({h.joined}/{h.target})
                                    </span>
                                  </div>
                                </td>
                                <td>{h.submitted}</td>
                                <td>{h.walkIn}</td>
                                <td>
                                  <span
                                    className={`target-status-pill status-${h.status}`}
                                  >
                                    {h.status === "achieved"
                                      ? "🎯 Achieved"
                                      : h.status === "in_progress"
                                      ? "⏳ In Progress"
                                      : "⚠️ Missed"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div
                  style={{
                    padding: "14px 24px",
                    borderTop: "1.5px solid #f1f5f9",
                    display: "flex",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    onClick={() => setHistoryModalOpen(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Set Recruiter Target Modal ── */}
          {setTargetModalOpen && targetModalRecruiter && (
            <div
              className="bs-modal-overlay"
              onClick={closeSetTargetModal}
              role="dialog"
              aria-modal="true"
            >
              <div
                className="bs-modal-dialog"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: "500px" }}
              >
                <div className="bs-modal-content">
                  <div className="bs-modal-header">
                    <h5 className="bs-modal-title">
                      🎯 Set Recruiter Target
                    </h5>
                    <button
                      type="button"
                      className="bs-btn-close"
                      onClick={closeSetTargetModal}
                      disabled={targetModalSaving}
                      aria-label="Close"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleSaveModalTarget}>
                    <div className="bs-modal-body">
                      {/* Recruiter info header */}
                      <div
                        style={{
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                          padding: "10px 14px",
                          marginBottom: "16px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, color: "#1e293b", fontSize: "0.98rem" }}>
                            {targetModalRecruiter.name || "Unknown"}
                          </div>
                          <div style={{ fontSize: "12px", color: "#64748b" }}>
                            ID: <code>{targetModalRecruiter.rid}</code>
                          </div>
                        </div>
                        <span
                          style={{
                            padding: "3px 10px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            background: "#e0f2fe",
                            color: "#0369a1",
                            fontWeight: 600,
                          }}
                        >
                          {targetModalRecruiter.team || "Team BPO"}
                        </span>
                      </div>

                      {/* Date Range Selectors */}
                      <div style={{ marginBottom: "16px" }}>
                        <label
                          style={{
                            display: "block",
                            fontSize: "0.85rem",
                            fontWeight: 700,
                            color: "#334155",
                            marginBottom: "6px",
                          }}
                        >
                          Target Date Range (Calendar):
                        </label>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                          <div>
                            <span
                              style={{
                                fontSize: "11px",
                                color: "#64748b",
                                fontWeight: 600,
                                display: "block",
                                marginBottom: "4px",
                              }}
                            >
                              Start Date
                            </span>
                            <input
                              type="date"
                              className="admin-form-input"
                              style={{
                                width: "100%",
                                padding: "8px 10px",
                                fontSize: "13px",
                                borderRadius: "6px",
                                border: "1px solid #cbd5e1",
                                background: "#ffffff",
                              }}
                              value={targetModalStart}
                              onChange={(e) => setTargetModalStart(e.target.value)}
                              required
                            />
                          </div>
                          <div>
                            <span
                              style={{
                                fontSize: "11px",
                                color: "#64748b",
                                fontWeight: 600,
                                display: "block",
                                marginBottom: "4px",
                              }}
                            >
                              End Date
                            </span>
                            <input
                              type="date"
                              className="admin-form-input"
                              style={{
                                width: "100%",
                                padding: "8px 10px",
                                fontSize: "13px",
                                borderRadius: "6px",
                                border: "1px solid #cbd5e1",
                                background: "#ffffff",
                              }}
                              value={targetModalEnd}
                              onChange={(e) => setTargetModalEnd(e.target.value)}
                              required
                            />
                          </div>
                        </div>
                      </div>

                      {/* Joining Target input */}
                      <div style={{ marginBottom: "16px" }}>
                        <label
                          style={{
                            display: "block",
                            fontSize: "0.85rem",
                            fontWeight: 700,
                            color: "#334155",
                            marginBottom: "6px",
                          }}
                        >
                          Joining Target:
                        </label>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <input
                            type="number"
                            min="0"
                            placeholder="e.g. 10"
                            className="admin-form-input"
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              fontSize: "15px",
                              fontWeight: 700,
                              borderRadius: "6px",
                              border: "1px solid #cbd5e1",
                              background: "#ffffff",
                            }}
                            value={targetModalTarget}
                            onChange={(e) => setTargetModalTarget(e.target.value)}
                            required
                          />
                          <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 700, whiteSpace: "nowrap" }}>
                            joins
                          </span>
                        </div>
                        <span style={{ fontSize: "12px", color: "#64748b", marginTop: "4px", display: "block" }}>
                          Number of successful candidate joins required in this date period.
                        </span>
                      </div>

                      {/* Optional Note */}
                      <div style={{ marginBottom: "10px" }}>
                        <label
                          style={{
                            display: "block",
                            fontSize: "0.85rem",
                            fontWeight: 700,
                            color: "#334155",
                            marginBottom: "6px",
                          }}
                        >
                          Note / Remark (Optional):
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Monthly joining target"
                          className="admin-form-input"
                          style={{
                            width: "100%",
                            padding: "8px 10px",
                            fontSize: "13px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            background: "#ffffff",
                          }}
                          value={targetModalNote}
                          onChange={(e) => setTargetModalNote(e.target.value)}
                        />
                      </div>

                      {targetModalError && (
                        <div
                          className="admin-alert admin-alert-error"
                          style={{ margin: "10px 0 0", padding: "8px 12px", fontSize: "13px" }}
                        >
                          {targetModalError}
                        </div>
                      )}
                    </div>

                    <div className="bs-modal-footer">
                      <button
                        type="button"
                        className="bs-btn bs-btn-secondary"
                        onClick={closeSetTargetModal}
                        disabled={targetModalSaving}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="bs-btn bs-btn-primary"
                        disabled={targetModalSaving}
                      >
                        {targetModalSaving ? "Saving..." : "Save Target"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
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
                teamLeaderDetailPagination,
              )}
            </>
          ) : filteredTLs.length > 0 ? (
            <div className="admin-table-wrap perf-records-scroll-wrap">
              <table className="admin-table perf-fixed-header-table">
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
                      <td>{displayValue(tl.email)}</td>
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
                recruiterDetailPagination,
              )}
            </>
          ) : filteredRecruiters.length > 0 ? (
            <div className="admin-table-wrap perf-records-scroll-wrap">
              <table className="admin-table perf-fixed-header-table">
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
                      <td>{displayValue(r.email)}</td>
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

      {/* Inactive Recruiters Resumes Section (At the bottom of the page) */}
      <div className="perf-inactive-recruiter-bar" style={{ marginTop: 32, marginBottom: 24 }}>
        <div className="perf-inactive-recruiter-left">
          <div className="perf-inactive-icon-box">📁</div>
          <div>
            <h4 className="perf-inactive-title">Ex-Recruiters / Inactive Staff</h4>
            <p className="perf-inactive-desc">
              Review candidate resumes uploaded by recruiters who have left or been deactivated
            </p>
          </div>
        </div>
        <div className="perf-inactive-recruiter-controls">
          <select
            className="perf-inactive-select"
            value={selectedInactiveRid}
            onChange={(e) => setSelectedInactiveRid(e.target.value)}
          >
            <option value="">
              {inactiveRecruiters.length === 0
                ? "No inactive recruiters found"
                : `-- Select Inactive Recruiter (${inactiveRecruiters.length}) --`}
            </option>
            {inactiveRecruiters.map((rec) => (
              <option key={rec.rid} value={rec.rid}>
                {rec.name || rec.rid} ({rec.team || "Team BPO"}) — {rec.rid}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="perf-view-resumes-btn"
            onClick={handleViewInactiveResumes}
            disabled={!selectedInactiveRid}
          >
            📄 View Resumes
          </button>
        </div>
      </div>

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
                className={`admin-back-btn ${statusTarget.nextStatus === "inactive"
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
              Email: {displayValue(deleteTarget.email)}
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
            style={{ maxWidth: "560px", width: "95%" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>
                Apply Action
              </h3>
              <button
                type="button"
                onClick={closeActionModal}
                disabled={actionSubmitting}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.3rem",
                  cursor: "pointer",
                  color: "#6b7280",
                  padding: "4px 8px",
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>
            <div
              style={{
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "12px 14px",
                marginBottom: "16px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px 16px",
                fontSize: "0.88rem",
              }}
            >
              <div>
                <span style={{ color: "#64748b" }}>Candidate:</span>{" "}
                <strong>{getCandidateDisplayName(actionModalItem)}</strong>
              </div>
              <div>
                <span style={{ color: "#64748b" }}>Phone:</span>{" "}
                <strong>{actionModalItem.candidatePhone || actionModalItem.phone || "-"}</strong>
              </div>
              <div>
                <span style={{ color: "#64748b" }}>Current Status:</span>{" "}
                <strong>{formatStatusLabel(actionModalItem.status || actionModalItem.currentStatus)}</strong>
              </div>
              <div>
                <span style={{ color: "#64748b" }}>Job ID:</span>{" "}
                <strong>{displayValue(actionModalItem.jobJid)}</strong>
              </div>
            </div>

            {/* Select Action buttons */}
            {(() => {
              const modalRowActionState = getRowActionState(actionModalItem);
              const availableActions = modalRowActionState.availableActions || [];
              if (availableActions.length === 0) return null;
              return (
                <div style={{ marginBottom: "16px" }}>
                  <label
                    style={{
                      display: "block",
                      fontWeight: 600,
                      marginBottom: "8px",
                      fontSize: "0.9rem",
                    }}
                  >
                    Select Action
                  </label>
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    {availableActions.map((action) => {
                      const isSelected = actionTarget === action.value;
                      return (
                        <button
                          key={action.value}
                          type="button"
                          onClick={() => switchActionTarget(action.value)}
                          disabled={actionSubmitting}
                          style={{
                            padding: "7px 16px",
                            borderRadius: "6px",
                            fontWeight: 600,
                            fontSize: "0.85rem",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            backgroundColor: isSelected ? action.color : "#ffffff",
                            color: isSelected ? "#ffffff" : action.color,
                            border: `2px solid ${action.color}`,
                            boxShadow: isSelected
                              ? `0 2px 8px ${action.color}50`
                              : "none",
                          }}
                        >
                          {action.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Optional Process Input field from Walk-In */}
            {(isFromWalkInStage(actionModalItem?.currentStatus || actionModalItem?.status) ||
              isFromWalkInStage(selectedStatusKey) ||
              isFromWalkInStage(actionTarget)) && (
              <div style={{ marginBottom: "10px" }}>
                <label
                  style={{
                    display: "block",
                    fontWeight: 600,
                    marginBottom: "4px",
                  }}
                >
                  Process (optional)
                </label>
                <input
                  type="text"
                  value={actionProcess}
                  onChange={(e) => setActionProcess(e.target.value)}
                  placeholder="Enter process..."
                  disabled={actionSubmitting}
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "4px",
                    border: "1px solid #ccc",
                  }}
                />
              </div>
            )}
            {/* Custom Date Input for Every Stage */}
            <div style={{ marginBottom: "10px" }}>
              <label
                style={{
                  display: "block",
                  fontWeight: 600,
                  marginBottom: "4px",
                }}
              >
                {actionTarget === "verified"
                  ? "Verification Date"
                  : actionTarget === "walk_in"
                    ? "Walk-in Date"
                    : actionTarget === "didnt_turn_up"
                      ? "Didn't Turn Up Date"
                      : actionTarget === "shortlisted"
                      ? "Shortlist Date"
                      : actionTarget === "selected"
                        ? "Selection Date"
                        : actionTarget === "pending"
                          ? "Pending Date"
                          : actionTarget === "joined"
                          ? "Joining Date"
                          : actionTarget === "rejected"
                            ? "Rejection Date"
                            : actionTarget === "dropout"
                              ? "Dropout Date"
                              : actionTarget === "billed"
                                ? "Billing Date"
                                : actionTarget === "left"
                                  ? "Exit Date"
                                  : "Date"}
              </label>
              <input
                type="date"
                value={actionCustomDate}
                onChange={(e) => {
                  setActionCustomDate(e.target.value);
                  if (actionTarget === "joined") {
                    setActionJoiningDate(e.target.value);
                  }
                }}
                disabled={actionSubmitting}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                }}
              />
              <span
                className="admin-muted"
                style={{ fontSize: "0.82em", marginTop: "2px", display: "block" }}
              >
                Candidate will be recorded and shown on this date in performance reports.
              </span>
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
            ) : actionTarget === "shortlisted" ? (
              <div style={{ marginBottom: "10px" }}>
                <label
                  style={{
                    display: "block",
                    fontWeight: 600,
                    marginBottom: "4px",
                  }}
                >
                  Shortlist Reason (optional)
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
                      : actionTarget === "didnt_turn_up"
                        ? "Didn't Turn Up Reason (optional)"
                        : actionTarget === "shortlisted"
                        ? "Shortlist Reason (optional)"
                        : actionTarget === "selected"
                          ? "Selection Reason (optional)"
                          : actionTarget === "pending"
                            ? "Pending Note (optional)"
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
                  !actionTarget ||
                  (actionTarget === "selected" &&
                    !actionJoiningDate.trim()) ||
                  (actionTarget === "joined" &&
                    !String(actionRevenue || "").trim()) ||
                  (actionTarget === "billed" && isConfirmBilledDisabled) ||
                  (actionTarget === "others" && !actionReason.trim())
                }
                style={{
                  backgroundColor:
                    (getRowActionState(actionModalItem)?.availableActions?.find((a) => a.value === actionTarget)?.color || "#2563eb"),
                  color: "#fff",
                  border: "none",
                  fontWeight: 600,
                  padding: "8px 18px",
                  borderRadius: "6px",
                }}
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

      {/* Inactive Recruiter Resumes Modal */}
      {inactiveResumesModalOpen && (
        <div
          className="perf-resumes-modal-overlay"
          onClick={() => setInactiveResumesModalOpen(false)}
        >
          <div
            className="perf-resumes-modal-container"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="perf-resumes-modal-header">
              <div className="perf-resumes-modal-title-wrap">
                <div className="perf-inactive-icon-box">📁</div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "#0f172a" }}>
                    Resumes Uploaded by {selectedInactiveRecruiter?.name || selectedInactiveRecruiter?.rid}
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                    Recruiter ID: <strong>{selectedInactiveRecruiter?.rid}</strong>
                    {selectedInactiveRecruiter?.team ? ` • Team: ${selectedInactiveRecruiter.team}` : ""}
                    {selectedInactiveRecruiter?.email ? ` • ${selectedInactiveRecruiter.email}` : ""}
                    {" • "}
                    <span style={{ color: "#dc2626", fontWeight: 600 }}>Deactivated / Left</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="perf-resumes-modal-close"
                onClick={() => setInactiveResumesModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="perf-resumes-modal-body">
              {/* Search & filter toolbar */}
              <div className="perf-modal-toolbar">
                <input
                  type="text"
                  className="perf-modal-search"
                  placeholder="Search by candidate name, phone, job role, or ID..."
                  value={inactiveResumeSearch}
                  onChange={(e) => setInactiveResumeSearch(e.target.value)}
                />
                <select
                  className="perf-modal-filter-select"
                  value={inactiveResumeStatusFilter}
                  onChange={(e) => setInactiveResumeStatusFilter(e.target.value)}
                >
                  <option value="all">All Stages ({inactiveRecruiterResumes.length})</option>
                  <option value="submitted">Submitted</option>
                  <option value="verified">Verified</option>
                  <option value="others">Others</option>
                  <option value="walk_in">Walk In</option>
                  <option value="didnt_turn_up">Didn't Turn Up</option>
                  <option value="shortlisted">Shortlisted</option>
                  <option value="selected">Selected</option>
                  <option value="pending">Pending</option>
                  <option value="joined">Joined</option>
                  <option value="billed">Billed</option>
                  <option value="left">Left</option>
                  <option value="dropout">Dropout</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {loadingInactiveResumes ? (
                <div style={{ padding: "48px 20px", textAlign: "center", color: "#64748b" }}>
                  <div style={{ fontSize: "1.2rem", marginBottom: 8 }}>⏳ Loading uploaded resumes...</div>
                </div>
              ) : inactiveResumesError ? (
                <div className="admin-alert admin-alert-error">{inactiveResumesError}</div>
              ) : filteredInactiveResumes.length === 0 ? (
                <div style={{ padding: "48px 20px", textAlign: "center", color: "#64748b" }}>
                  <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "#334155" }}>
                    No resumes found
                  </div>
                  <div style={{ fontSize: "0.85rem", marginTop: 4 }}>
                    {inactiveResumeSearch || inactiveResumeStatusFilter !== "all"
                      ? "Try clearing your search or status filter."
                      : "This recruiter has not uploaded any resumes yet."}
                  </div>
                </div>
              ) : (
                <div className="perf-resumes-table-wrap">
                  <table className="perf-resumes-table">
                    <thead>
                      <tr>
                        <th>Candidate</th>
                        <th>Phone</th>
                        <th>Job / Company</th>
                        <th>Current Stage</th>
                        <th>Uploaded On</th>
                        <th>Resume File</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInactiveResumes.map((resume) => {
                        const statusKey = String(
                          resume.currentStatus || resume.status || "submitted",
                        ).toLowerCase();
                        return (
                          <tr key={resume.resId}>
                            <td>
                              <div style={{ fontWeight: 600, color: "#0f172a" }}>
                                {resume.candidateName || "Unnamed Candidate"}
                              </div>
                              {resume.candidateEmail && (
                                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                                  {resume.candidateEmail}
                                </div>
                              )}
                            </td>
                            <td>{resume.candidatePhone || "—"}</td>
                            <td>
                              <div style={{ fontWeight: 600, color: "#334155" }}>
                                {resume.jobTitle || `Job #${resume.jobId || "—"}`}
                              </div>
                              {resume.companyName && (
                                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                                  {resume.companyName}
                                </div>
                              )}
                            </td>
                            <td>
                              <span className={`perf-status-pill perf-status-${statusKey}`}>
                                {formatStatusLabel(statusKey)}
                              </span>
                            </td>
                            <td style={{ fontSize: "0.8rem", color: "#475569" }}>
                              {formatDateTime(resume.uploadedAt || resume.createdAt)}
                            </td>
                            <td>
                              <button
                                type="button"
                                className="perf-view-file-btn"
                                onClick={() => handleOpenResumeFile(resume.resId)}
                              >
                                View File ↗
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
