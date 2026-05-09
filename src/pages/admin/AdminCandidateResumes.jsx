import { useEffect, useMemo, useState } from "react";
import { getAuthSession } from "../../auth/session";
import AdminLayout from "./AdminLayout";
import {
  API_BASE_URL,
  adminDeleteResume,
  getAdminHeaders,
  readJsonResponse,
} from "./adminApi";
import {
  displayNote,
  formatResumeCompanyDisplay,
  normalizeResumeData,
} from "../../utils/dashboardData";
import { formatDateTimeInIndia, parseDateTimeValue } from "../../utils/dateTime";
import "../../styles/admin-panel.css";

const formatDateTime = (value) => formatDateTimeInIndia(value);

const EMPTY_ADVANCED_FILTERS = {
  company: "",
  city: "",
  submittedDate: "",
  status: "",
};

const pickFirstValue = (...values) =>
  values.find((value) => value !== null && value !== undefined && value !== "");

const formatPercent = (value) => {
  const resolved = pickFirstValue(value);
  if (resolved === undefined) return "N/A";
  return `${resolved}%`;
};

const formatStatusLabel = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (!normalized) return "Submitted";

  return normalized
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const normalizeStatusValue = (value) =>
  String(value || "submitted")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const EXCEL_EXPORT_COLUMNS = [
  "Recruiter Name",
  "Candidate Name",
  "Phone",
  "Email",
  "Job Company Name",
  "Role",
  "City",
  "Education",
  "Age",
  "ATS Score",
  "Latest Status",
  "Recruiter Note",
  "Submitted At",
  "Resume File",
];

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const sanitizeExcelValue = (value) => {
  const resolved = String(value ?? "").trim();
  if (!resolved) return "N/A";
  return /^[=+\-@]/.test(resolved) ? `'${resolved}` : resolved;
};

const formatDateInputInIndia = (value) => {
  const parsed = parseDateTimeValue(value);
  if (!parsed) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(parsed);
  const lookup = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
  );
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
};

const SOURCE_FILTERS = {
  ALL: "all",
  CANDIDATE: "candidate",
  RECRUITER: "recruiter",
};

const formatEducationDisplay = (resume) =>
  [
    resume.latestEducationLevel,
    resume.boardUniversity,
    resume.institutionName,
  ]
    .filter(Boolean)
    .join(" / ") || "N/A";

const buildResumeFileUrl = (resId, token) => {
  if (!resId || !token) return "";
  return `${API_BASE_URL}/api/admin/resumes/${encodeURIComponent(resId)}/file?token=${encodeURIComponent(token)}`;
};

const buildExcelExportRows = (resumes, token) =>
  resumes.map((resume) => ({
    recruiterName:
      resume._source === "recruiter" ? resume._recruiterName || "N/A" : "N/A",
    candidateName:
      resume.applicantName || resume.candidateName || "Name not found",
    phone: resume.applicantPhone || resume.candidatePhone || "N/A",
    email: resume.applicantEmail || resume.candidateEmail || "N/A",
    companyName: formatResumeCompanyDisplay(resume) || "N/A",
    role: resume.job?.roleName || resume.roleName || "N/A",
    city: resume.city || resume.job?.city || "N/A",
    education: formatEducationDisplay(resume),
    age: resume.age ?? "N/A",
    atsScore: formatPercent(resume.atsScore),
    latestStatus: formatStatusLabel(resume.workflowStatus || resume.status),
    recruiterNote: displayNote(resume.submittedReason),
    submittedAt: formatDateTime(resume.uploadedAt) || "N/A",
    resumeFileUrl: buildResumeFileUrl(resume.resId, token) || "N/A",
  }));

const downloadExcelFile = (rows) => {
  const tableRows = rows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(sanitizeExcelValue(row.recruiterName))}</td>
          <td>${escapeHtml(sanitizeExcelValue(row.candidateName))}</td>
          <td>${escapeHtml(sanitizeExcelValue(row.phone))}</td>
          <td>${escapeHtml(sanitizeExcelValue(row.email))}</td>
          <td>${escapeHtml(sanitizeExcelValue(row.companyName))}</td>
          <td>${escapeHtml(sanitizeExcelValue(row.role))}</td>
          <td>${escapeHtml(sanitizeExcelValue(row.city))}</td>
          <td>${escapeHtml(sanitizeExcelValue(row.education))}</td>
          <td>${escapeHtml(sanitizeExcelValue(row.age))}</td>
          <td>${escapeHtml(sanitizeExcelValue(row.atsScore))}</td>
          <td>${escapeHtml(sanitizeExcelValue(row.latestStatus))}</td>
          <td>${escapeHtml(sanitizeExcelValue(row.recruiterNote))}</td>
          <td>${escapeHtml(sanitizeExcelValue(row.submittedAt))}</td>
          <td>${row.resumeFileUrl !== "N/A" ? `<a href="${escapeHtml(row.resumeFileUrl)}">${escapeHtml(row.resumeFileUrl)}</a>` : "N/A"}</td>
        </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
  </head>
  <body>
    <table border="1">
      <thead>
        <tr>${EXCEL_EXPORT_COLUMNS.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
  </body>
</html>`;

  const blob = new Blob(["\ufeff", html], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });
  const fileDate = new Date().toISOString().slice(0, 10);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `submitted-resumes-${fileDate}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default function AdminCandidateResumes({ setCurrentPage }) {
  const [resumes, setResumes] = useState([]);
  const [recruiterResumes, setRecruiterResumes] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [sourceFilter, setSourceFilter] = useState(SOURCE_FILTERS.ALL);
  const [phoneSearch, setPhoneSearch] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [draftFilters, setDraftFilters] = useState(EMPTY_ADVANCED_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_ADVANCED_FILTERS);
  const [deletingResId, setDeletingResId] = useState("");

  const loadCandidateResumes = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/candidate-resumes`,
        {
          headers: getAdminHeaders(),
        },
      );
      const data = await readJsonResponse(
        response,
        "Check VITE_API_BASE_URL and ensure the admin candidate resumes route is available.",
      );
      if (!response.ok) {
        throw new Error(
          data?.message || "Failed to fetch candidate submitted resumes.",
        );
      }

      setResumes(
        (Array.isArray(data?.resumes) ? data.resumes : []).map((resume) => ({
          ...normalizeResumeData(resume),
          _source: "candidate",
        })),
      );
      setTotalCount(Number(data?.totalCount) || 0);
    } catch (error) {
      setResumes([]);
      setTotalCount(0);
      setErrorMessage(
        error.message || "Failed to fetch candidate submitted resumes.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecruiterResumes = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/dashboard`, {
        headers: getAdminHeaders(),
      });
      const data = await readJsonResponse(
        response,
        "Failed to fetch recruiter resume uploads.",
      );
      if (!response.ok) return;

      const uploads = Array.isArray(data?.recruiterResumeUploads)
        ? data.recruiterResumeUploads
        : [];

      setRecruiterResumes(
        uploads.map((item) => {
          const normalized = normalizeResumeData(item);
          return {
            ...normalized,
              applicantName:
                normalized.applicantName ||
                normalized.candidateName ||
                normalized.name ||
                "N/A",
            job: {
              ...normalized.job,
              companyName: formatResumeCompanyDisplay(normalized),
            },
            atsScore: pickFirstValue(
              normalized.atsScore,
              item.atsScore,
              item.ats_score,
            ),
            _source: "recruiter",
            _recruiterName: normalized.recruiterName || "N/A",
          };
        }),
      );
    } catch {
      setRecruiterResumes([]);
    }
  };

  const loadAllResumes = async () => {
    await Promise.all([loadCandidateResumes(), loadRecruiterResumes()]);
  };

  useEffect(() => {
    loadAllResumes();
  }, []);

  const normalizePhoneForSearch = (value) =>
    String(value || "").replace(/\D/g, "");

  const displayedResumes =
    sourceFilter === SOURCE_FILTERS.CANDIDATE
      ? resumes
      : sourceFilter === SOURCE_FILTERS.RECRUITER
        ? recruiterResumes
        : [...resumes, ...recruiterResumes];

  const statusOptions = useMemo(() => {
    const statusMap = new Map();
    displayedResumes.forEach((resume) => {
      const value = normalizeStatusValue(resume.workflowStatus || resume.status);
      statusMap.set(value, formatStatusLabel(value));
    });
    return Array.from(statusMap.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [displayedResumes]);

  const filteredResumes = phoneSearch.trim()
    ? displayedResumes.filter((resume) =>
        [
          resume.candidatePhone,
          resume.phone,
          resume.mobile,
          resume.applicantPhone,
        ].some((value) =>
          normalizePhoneForSearch(value).includes(
            normalizePhoneForSearch(phoneSearch),
          ),
        ),
      )
    : displayedResumes;

  const hasAppliedAdvancedFilters = Object.values(appliedFilters).some((value) =>
    String(value || "").trim(),
  );

  const advancedFilteredResumes = filteredResumes.filter((resume) => {
    const companyQuery = appliedFilters.company.trim().toLowerCase();
    const cityQuery = appliedFilters.city.trim().toLowerCase();
    const statusQuery = normalizeStatusValue(appliedFilters.status);
    const submittedDateQuery = appliedFilters.submittedDate.trim();

    const company = String(formatResumeCompanyDisplay(resume) || "").toLowerCase();
    const city = String(resume.city || resume.job?.city || "").toLowerCase();
    const status = normalizeStatusValue(resume.workflowStatus || resume.status);
    const submittedDate = formatDateInputInIndia(resume.uploadedAt);

    return (
      (!companyQuery || company.includes(companyQuery)) &&
      (!cityQuery || city.includes(cityQuery)) &&
      (!appliedFilters.status || status === statusQuery) &&
      (!submittedDateQuery || submittedDate === submittedDateQuery)
    );
  });

  const handleDraftFilterChange = (event) => {
    const { name, value } = event.target;
    setDraftFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleApplyAdvancedFilters = () => {
    setAppliedFilters({ ...draftFilters });
    setShowAdvancedFilters(false);
  };

  const handleClearAdvancedFilters = () => {
    setDraftFilters(EMPTY_ADVANCED_FILTERS);
    setAppliedFilters(EMPTY_ADVANCED_FILTERS);
  };

  const handleDownloadAsExcel = () => {
    try {
      const token = getAuthSession()?.token || "";
      const exportRows = buildExcelExportRows(advancedFilteredResumes, token);

      if (!exportRows.length) {
        setSuccessMessage("");
        setErrorMessage("No resumes available to download.");
        return;
      }

      downloadExcelFile(exportRows);
      setErrorMessage("");
      setSuccessMessage(
        `Downloaded ${exportRows.length} submitted resume${exportRows.length === 1 ? "" : "s"}.`,
      );
    } catch (error) {
      setSuccessMessage("");
      setErrorMessage(error.message || "Failed to download Excel file.");
    }
  };

  const handleResumeOpen = (resId) => {
    const token = getAuthSession()?.token;
    if (!token || !resId) return;

    window.open(
      `${API_BASE_URL}/api/admin/resumes/${encodeURIComponent(resId)}/file?token=${encodeURIComponent(token)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const handleResumeDelete = async (resume) => {
    const resId = String(resume?.resId || "").trim();
    if (!resId) {
      setErrorMessage("Resume ID is missing for this record.");
      setSuccessMessage("");
      return;
    }

    const candidateName =
      resume?.applicantName || resume?.candidateName || "Unknown candidate";
    const companyName = formatResumeCompanyDisplay(resume) || "Unknown company";
    const shouldDelete = window.confirm(
      `Delete this resume from the database?\n\nCandidate: ${candidateName}\nCompany: ${companyName}`,
    );

    if (!shouldDelete) return;

    setDeletingResId(resId);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const data = await adminDeleteResume(resId);
      await loadAllResumes();
      setSuccessMessage(data?.message || "Resume deleted successfully.");
    } catch (error) {
      setErrorMessage(error.message || "Failed to delete resume.");
    } finally {
      setDeletingResId("");
    }
  };

  return (
    <AdminLayout
      title="All Submitted Resumes"
      subtitle="See resumes submitted by candidates and recruiters."
      setCurrentPage={setCurrentPage}
      actions={
        <button
          type="button"
          className="admin-refresh-btn"
          onClick={loadAllResumes}
          disabled={isLoading}
        >
          {isLoading ? "Refreshing..." : "Refresh"}
        </button>
      }
    >
      {successMessage ? (
        <div className="admin-alert">{successMessage}</div>
      ) : null}
      {errorMessage ? (
        <div className="admin-alert admin-alert-error">{errorMessage}</div>
      ) : null}

      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "16px",
          flexWrap: "wrap",
        }}
      >
        {[
          {
            key: SOURCE_FILTERS.ALL,
            label: "All",
            count: totalCount + recruiterResumes.length,
          },
          {
            key: SOURCE_FILTERS.CANDIDATE,
            label: "Candidate",
            count: totalCount,
          },
          {
            key: SOURCE_FILTERS.RECRUITER,
            label: "Recruiter",
            count: recruiterResumes.length,
          },
        ].map((filterOption) => (
          <button
            key={filterOption.key}
            type="button"
            className={`perf-timeline-btn${sourceFilter === filterOption.key ? " perf-timeline-btn-active" : ""}`}
            onClick={() => setSourceFilter(filterOption.key)}
          >
            {filterOption.label} ({filterOption.count})
          </button>
        ))}
      </div>

      <div className="admin-candidate-resumes-toolbar">
        <label className="admin-candidate-resumes-search">
          <span>Search by candidate phone</span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="Enter phone number"
            value={phoneSearch}
            onChange={(event) => setPhoneSearch(event.target.value)}
          />
        </label>
        <button
          type="button"
          className={`admin-refresh-btn admin-candidate-filter-btn${hasAppliedAdvancedFilters ? " is-active" : ""}`}
          onClick={() => setShowAdvancedFilters((prev) => !prev)}
        >
          Filter
        </button>
        {phoneSearch.trim() || hasAppliedAdvancedFilters ? (
          <button
            type="button"
            className="admin-back-btn admin-candidate-resumes-clear"
            onClick={() => {
              setPhoneSearch("");
              handleClearAdvancedFilters();
            }}
          >
            Clear
          </button>
        ) : null}
      </div>

      {showAdvancedFilters ? (
        <div className="admin-candidate-filter-panel">
          <label>
            <span>Company</span>
            <input
              name="company"
              type="text"
              placeholder="Company name"
              value={draftFilters.company}
              onChange={handleDraftFilterChange}
            />
          </label>
          <label>
            <span>City</span>
            <input
              name="city"
              type="text"
              placeholder="City"
              value={draftFilters.city}
              onChange={handleDraftFilterChange}
            />
          </label>
          <label>
            <span>Submission date</span>
            <input
              name="submittedDate"
              type="date"
              value={draftFilters.submittedDate}
              onChange={handleDraftFilterChange}
            />
          </label>
          <label>
            <span>Current status</span>
            <select
              name="status"
              value={draftFilters.status}
              onChange={handleDraftFilterChange}
            >
              <option value="">Any status</option>
              {statusOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div className="admin-candidate-filter-actions">
            <button
              type="button"
              className="admin-back-btn"
              onClick={handleClearAdvancedFilters}
            >
              Clear filters
            </button>
            <button
              type="button"
              className="admin-refresh-btn"
              onClick={handleApplyAdvancedFilters}
            >
              Apply
            </button>
          </div>
          <div className="admin-candidate-export-wrap">
            <button
              type="button"
              className="admin-refresh-btn admin-candidate-export-btn"
              onClick={handleDownloadAsExcel}
              disabled={advancedFilteredResumes.length === 0}
            >
              Download as Excel
            </button>
          </div>
        </div>
      ) : null}

      <div className="admin-dashboard-card admin-card-large">
        {advancedFilteredResumes.length === 0 ? (
          <p className="admin-chart-empty">
            {isLoading
              ? "Loading resumes..."
              : phoneSearch.trim() || hasAppliedAdvancedFilters
                ? "No resumes found for the current search."
                : "No resumes found for this filter."}
          </p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table admin-table-wide admin-candidate-resumes-table">
              <thead>
                <tr>
                  <th>Recruiter Name</th>
                  <th>Candidate Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Job Company Name</th>
                  <th>Role</th>
                  <th>City</th>
                  <th>Education</th>
                  <th>Age</th>
                  <th>ATS Score</th>
                  <th>Latest Status</th>
                  <th>Recruiter Note</th>
                  <th>Submitted At</th>
                  <th>Resume File</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {advancedFilteredResumes.map((resume) => (
                  <tr key={`${resume._source}-${resume.resId}`}>
                    <td>
                      {resume._source === "recruiter"
                        ? resume._recruiterName || "N/A"
                        : "N/A"}
                    </td>
                    <td>
                      {resume.applicantName ||
                        resume.candidateName ||
                        "Name not found"}
                    </td>
                    <td>
                      {resume.applicantPhone || resume.candidatePhone || "N/A"}
                    </td>
                    <td>
                      {resume.applicantEmail || resume.candidateEmail || "N/A"}
                    </td>
                    <td>{formatResumeCompanyDisplay(resume) || "N/A"}</td>
                    <td>{resume.job?.roleName || resume.roleName || "N/A"}</td>
                    <td>{resume.city || resume.job?.city || "N/A"}</td>
                    <td>{formatEducationDisplay(resume)}</td>
                    <td>{resume.age ?? "N/A"}</td>
                    <td>
                      <span className="admin-stat-pill">
                        {formatPercent(resume.atsScore)}
                      </span>
                    </td>
                    <td>
                      <span className="admin-candidate-status-badge">
                        {formatStatusLabel(
                          resume.workflowStatus || resume.status,
                        )}
                      </span>
                    </td>
                    <td>{displayNote(resume.submittedReason)}</td>
                    <td>{formatDateTime(resume.uploadedAt)}</td>
                    <td>
                      {resume.resId ? (
                        <div className="admin-resume-file-cell">
                          <button
                            type="button"
                            className="admin-refresh-btn admin-resume-file-btn"
                            onClick={() => handleResumeOpen(resume.resId)}
                          >
                            View Resume
                          </button>
                          <span className="admin-resume-file-name">
                            {resume.resumeFilename || "N/A"}
                            {resume.resumeType
                              ? ` (${String(resume.resumeType).toUpperCase()})`
                              : ""}
                          </span>
                        </div>
                      ) : (
                        <>
                          {resume.resumeFilename || "N/A"}
                          {resume.resumeType
                            ? ` (${String(resume.resumeType).toUpperCase()})`
                            : ""}
                        </>
                      )}
                    </td>
                    <td>
                      <div className="admin-actions-cell">
                        <button
                          type="button"
                          className="admin-refresh-btn admin-delete-btn"
                          onClick={() => handleResumeDelete(resume)}
                          disabled={deletingResId === resume.resId}
                        >
                          {deletingResId === resume.resId
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
