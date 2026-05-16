import { useEffect, useMemo, useState } from "react";
import { getAuthSession } from "../../auth/session";
import {
  displayNote,
  formatResumeCompanyDisplay,
} from "../../utils/dashboardData";
import {
  formatDateTimeInIndia,
  parseDateTimeValue,
} from "../../utils/dateTime";
import "../../styles/admin-panel.css";

const EMPTY_ADVANCED_FILTERS = {
  company: "",
  city: "",
  startDate: "",
  endDate: "",
  statuses: [],
};

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

const pickFirstValue = (...values) =>
  values.find((value) => value !== null && value !== undefined && value !== "");

const truncateDisplayName = (value, maxLength = 22) => {
  const resolved = String(value || "").trim();
  if (!resolved) return "Name not found";
  return resolved.length > maxLength
    ? `${resolved.slice(0, maxLength).trimEnd()}...`
    : resolved;
};

const formatDateTime = (value) => formatDateTimeInIndia(value);

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

const normalizePhoneForSearch = (value) =>
  String(value || "").replace(/\D/g, "");

const uniqueSortedValues = (values) =>
  Array.from(
    new Map(
      values
        .map((value) => String(value || "").trim())
        .filter(Boolean)
        .map((value) => [value.toLowerCase(), value]),
    ).values(),
  ).sort((a, b) => a.localeCompare(b));

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
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
};

const formatEducationDisplay = (resume) =>
  [
    resume.latestEducationLevel,
    resume.boardUniversity,
    resume.institutionName,
  ]
    .filter(Boolean)
    .join(" / ") || "N/A";

const getCompanyFilterValue = (resume) =>
  String(
    resume?.companyName ||
      resume?.company_name ||
      resume?.job?.companyName ||
      resume?.job?.company_name ||
      formatResumeCompanyDisplay(resume) ||
      "",
  ).trim();

const getRecruiterDisplayName = (resume, defaultRecruiterName) => {
  if (resume?._source === "candidate") return "N/A";
  return (
    resume?._recruiterName ||
    resume?.recruiterName ||
    defaultRecruiterName ||
    "N/A"
  );
};

const buildExcelExportRows = (resumes, defaultRecruiterName, getResumeUrl) =>
  resumes.map((resume) => ({
    recruiterName: getRecruiterDisplayName(resume, defaultRecruiterName),
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
    resumeFileUrl: getResumeUrl(resume) || "N/A",
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

export default function SubmittedResumesPanel({
  resumes = [],
  isLoading = false,
  title = "",
  subtitle = "",
  headerActions = null,
  sourceOptions = [],
  defaultRecruiterName = "",
  getResumeUrl,
  renderRowActions = null,
  deletingResId = "",
}) {
  const [sourceFilter, setSourceFilter] = useState(
    sourceOptions[0]?.key || "all",
  );
  const [phoneSearch, setPhoneSearch] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [draftFilters, setDraftFilters] = useState(EMPTY_ADVANCED_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_ADVANCED_FILTERS);
  const [downloadMessage, setDownloadMessage] = useState("");
  const [downloadError, setDownloadError] = useState("");

  useEffect(() => {
    if (!sourceOptions.length) {
      setSourceFilter("all");
      return;
    }
    if (!sourceOptions.some((option) => option.key === sourceFilter)) {
      setSourceFilter(sourceOptions[0].key);
    }
  }, [sourceFilter, sourceOptions]);

  const displayedResumes = useMemo(() => {
    if (!sourceOptions.length || sourceFilter === "all") return resumes;
    return resumes.filter((resume) => resume._source === sourceFilter);
  }, [resumes, sourceFilter, sourceOptions.length]);

  const statusOptions = useMemo(() => {
    const statusMap = new Map();
    displayedResumes.forEach((resume) => {
      const value = normalizeStatusValue(resume.workflowStatus || resume.status);
      statusMap.set(value, formatStatusLabel(value));
    });
    return Array.from(statusMap.entries()).sort((a, b) =>
      a[1].localeCompare(b[1]),
    );
  }, [displayedResumes]);

  const companyOptions = useMemo(
    () =>
      uniqueSortedValues(displayedResumes.map((resume) => getCompanyFilterValue(resume))),
    [displayedResumes],
  );

  const cityOptions = useMemo(
    () =>
      uniqueSortedValues(
        displayedResumes.map((resume) => resume.city || resume.job?.city),
      ),
    [displayedResumes],
  );

  const companySuggestions = useMemo(() => {
    const companyQuery = draftFilters.company.trim().toLowerCase();
    if (!companyQuery) return companyOptions.slice(0, 12);
    return companyOptions
      .filter((value) => value.toLowerCase().includes(companyQuery))
      .slice(0, 12);
  }, [companyOptions, draftFilters.company]);

  const citySuggestions = useMemo(() => {
    const cityQuery = draftFilters.city.trim().toLowerCase();
    if (!cityQuery) return cityOptions.slice(0, 12);
    return cityOptions
      .filter((value) => value.toLowerCase().includes(cityQuery))
      .slice(0, 12);
  }, [cityOptions, draftFilters.city]);

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
    Array.isArray(value)
      ? value.length > 0
      : String(value || "").trim(),
  );

  const advancedFilteredResumes = filteredResumes.filter((resume) => {
    const companyQuery = appliedFilters.company.trim().toLowerCase();
    const cityQuery = appliedFilters.city.trim().toLowerCase();
    const statusQueries = Array.isArray(appliedFilters.statuses)
      ? appliedFilters.statuses.map((value) => normalizeStatusValue(value))
      : [];
    const startDateQuery = appliedFilters.startDate.trim();
    const endDateQuery = appliedFilters.endDate.trim();

    const company = getCompanyFilterValue(resume).toLowerCase();
    const city = String(resume.city || resume.job?.city || "").toLowerCase();
    const status = normalizeStatusValue(resume.workflowStatus || resume.status);
    const submittedDate = formatDateInputInIndia(resume.uploadedAt);
    
    // Date range validation
    let isWithinDateRange = true;
    if (startDateQuery || endDateQuery) {
      if (!submittedDate) {
        isWithinDateRange = false;
      } else {
        const resumeDate = new Date(submittedDate);
        
        if (startDateQuery) {
          const startDate = new Date(startDateQuery);
          isWithinDateRange = isWithinDateRange && resumeDate >= startDate;
        }
        
        if (endDateQuery) {
          const endDate = new Date(endDateQuery);
          // Set to end of day for end date
          endDate.setHours(23, 59, 59, 999);
          isWithinDateRange = isWithinDateRange && resumeDate <= endDate;
        }
      }
    }

    return (
      (!companyQuery || company.includes(companyQuery)) &&
      (!cityQuery || city.includes(cityQuery)) &&
      (!statusQueries.length || statusQueries.includes(status)) &&
      isWithinDateRange
    );
  });

  const handleDraftFilterChange = (event) => {
    const { name, value } = event.target;
    setDraftFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleDraftStatusToggle = (statusValue) => {
    setDraftFilters((prev) => {
      const nextStatuses = Array.isArray(prev.statuses) ? [...prev.statuses] : [];
      const normalizedTarget = normalizeStatusValue(statusValue);
      const existingIndex = nextStatuses.findIndex(
        (value) => normalizeStatusValue(value) === normalizedTarget,
      );

      if (existingIndex >= 0) {
        nextStatuses.splice(existingIndex, 1);
      } else {
        nextStatuses.push(statusValue);
      }

      return {
        ...prev,
        statuses: nextStatuses,
      };
    });
  };

  const handleApplyAdvancedFilters = () => {
    setAppliedFilters({ ...draftFilters });
    setShowAdvancedFilters(false);
  };

  const handleClearAdvancedFilters = () => {
    setDraftFilters(EMPTY_ADVANCED_FILTERS);
    setAppliedFilters(EMPTY_ADVANCED_FILTERS);
  };

  const handleResumeOpen = (resume) => {
    const url = getResumeUrl(resume);
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleDownloadAsExcel = () => {
    try {
      const exportRows = buildExcelExportRows(
        advancedFilteredResumes,
        defaultRecruiterName,
        getResumeUrl,
      );

      if (!exportRows.length) {
        setDownloadMessage("");
        setDownloadError("No resumes available to download.");
        return;
      }

      downloadExcelFile(exportRows);
      setDownloadError("");
      setDownloadMessage(
        `Downloaded ${exportRows.length} submitted resume${exportRows.length === 1 ? "" : "s"}.`,
      );
    } catch (error) {
      setDownloadMessage("");
      setDownloadError(error.message || "Failed to download Excel file.");
    }
  };

  const showActionsColumn = typeof renderRowActions === "function";

  return (
    <>
      {title || subtitle || headerActions ? (
        <div className="ui-row-between ui-row-wrap" style={{ gap: 12 }}>
          <div>
            {title ? <h2 style={{ margin: 0 }}>{title}</h2> : null}
            {subtitle ? (
              <p className="admin-muted" style={{ margin: "8px 0 0" }}>
                {subtitle}
              </p>
            ) : null}
          </div>
          {headerActions}
        </div>
      ) : null}

      {downloadMessage ? <div className="admin-alert">{downloadMessage}</div> : null}
      {downloadError ? (
        <div className="admin-alert admin-alert-error">{downloadError}</div>
      ) : null}

      {sourceOptions.length > 1 ? (
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "16px",
            flexWrap: "wrap",
          }}
        >
          {sourceOptions.map((filterOption) => (
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
      ) : null}

      <div className="admin-candidate-resumes-toolbar">
        <button
          type="button"
          className={`admin-filter-toggle-btn${hasAppliedAdvancedFilters || phoneSearch.trim() ? " has-filters" : ""}`}
          onClick={() => setShowAdvancedFilters((prev) => !prev)}
        >
          <span className="admin-filter-toggle-icon">⚙️</span>
          Filters
          {(hasAppliedAdvancedFilters || phoneSearch.trim()) && (
            <span className="admin-filter-count">
              {[
                appliedFilters.company,
                appliedFilters.city,
                appliedFilters.startDate,
                appliedFilters.endDate,
                ...(Array.isArray(appliedFilters.statuses)
                  ? appliedFilters.statuses
                  : []),
                phoneSearch,
              ].filter((v) => String(v || "").trim()).length}
            </span>
          )}
        </button>
        {(phoneSearch.trim() || hasAppliedAdvancedFilters) && (
          <button
            type="button"
            className="admin-clear-filters-btn"
            onClick={() => {
              setPhoneSearch("");
              handleClearAdvancedFilters();
            }}
          >
            Clear All
          </button>
        )}
      </div>

      {showAdvancedFilters ? (
        <div className="admin-candidate-filter-panel">
          <div className="admin-filter-row">
            <label className="admin-filter-group">
              <span className="admin-filter-label">Candidate phone</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Enter phone number"
                value={phoneSearch}
                onChange={(event) => setPhoneSearch(event.target.value)}
                className="admin-filter-input"
              />
            </label>
          </div>
          
          <div className="admin-filter-row">
            <label className="admin-filter-group">
              <span className="admin-filter-label">Company</span>
              <input
                name="company"
                type="text"
                placeholder="Company name"
                value={draftFilters.company}
                onChange={handleDraftFilterChange}
                className="admin-filter-input"
                list="admin-company-suggestions"
              />
              <datalist id="admin-company-suggestions">
                {companySuggestions.map((value) => (
                  <option key={value} value={value} />
                ))}
              </datalist>
            </label>
            
            <label className="admin-filter-group">
              <span className="admin-filter-label">City</span>
              <input
                name="city"
                type="text"
                placeholder="City"
                value={draftFilters.city}
                onChange={handleDraftFilterChange}
                className="admin-filter-input"
                list="admin-city-suggestions"
              />
              <datalist id="admin-city-suggestions">
                {citySuggestions.map((value) => (
                  <option key={value} value={value} />
                ))}
              </datalist>
            </label>
          </div>
          
          <div className="admin-filter-row">
            <label className="admin-filter-group">
              <span className="admin-filter-label">Submission date range</span>
              <div className="admin-date-range">
                <input
                  name="startDate"
                  type="date"
                  placeholder="From"
                  value={draftFilters.startDate}
                  onChange={handleDraftFilterChange}
                  className="admin-filter-input"
                />
                <span className="admin-date-range-separator">to</span>
                <input
                  name="endDate"
                  type="date"
                  placeholder="To"
                  value={draftFilters.endDate}
                  onChange={handleDraftFilterChange}
                  className="admin-filter-input"
                />
              </div>
            </label>
            
            <label className="admin-filter-group">
              <span className="admin-filter-label">Current Status</span>
              <div className="admin-filter-checkbox-list">
                {statusOptions.length ? (
                  statusOptions.map(([value, label]) => {
                    const isChecked = draftFilters.statuses.some(
                      (selectedValue) =>
                        normalizeStatusValue(selectedValue) === value,
                    );
                    return (
                      <label
                        key={value}
                        className="admin-filter-checkbox-item"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleDraftStatusToggle(value)}
                        />
                        <span>{label}</span>
                      </label>
                    );
                  })
                ) : (
                  <span className="admin-muted">No status found</span>
                )}
              </div>
            </label>
          </div>
          
          <div className="admin-filter-actions">
            <button
              type="button"
              className="admin-filter-action-btn admin-filter-clear"
              onClick={handleClearAdvancedFilters}
            >
              Clear Filters
            </button>
            <button
              type="button"
              className="admin-filter-action-btn admin-filter-apply"
              onClick={handleApplyAdvancedFilters}
            >
              Apply Filters
            </button>
          </div>
          
          <div className="admin-filter-export">
            <button
              type="button"
              className="admin-filter-action-btn admin-filter-export"
              onClick={handleDownloadAsExcel}
              disabled={advancedFilteredResumes.length === 0}
            >
              📊 Download as Excel
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
            <table
              className={`admin-table admin-table-wide admin-candidate-resumes-table${showActionsColumn ? "" : " submitted-resumes-table-no-actions"}`}
            >
              <colgroup>
                <col className="submitted-resumes-col-recruiter" />
                <col className="submitted-resumes-col-candidate" />
                <col className="submitted-resumes-col-phone" />
                <col className="submitted-resumes-col-email" />
                <col className="submitted-resumes-col-company" />
                <col className="submitted-resumes-col-role" />
                <col className="submitted-resumes-col-city" />
                <col className="submitted-resumes-col-education" />
                <col className="submitted-resumes-col-age" />
                <col className="submitted-resumes-col-ats" />
                <col className="submitted-resumes-col-status" />
                <col className="submitted-resumes-col-note" />
                <col className="submitted-resumes-col-submitted" />
                <col className="submitted-resumes-col-file" />
                {showActionsColumn ? (
                  <col className="submitted-resumes-col-actions" />
                ) : null}
              </colgroup>
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
                  {showActionsColumn ? <th>Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {advancedFilteredResumes.map((resume) => {
                  const candidateName =
                    resume.applicantName ||
                    resume.candidateName ||
                    "Name not found";

                  return (
                  <tr key={`${resume._source || "resume"}-${resume.resId}`}>
                    <td>{getRecruiterDisplayName(resume, defaultRecruiterName)}</td>
                    <td className="submitted-resumes-candidate-name" title={candidateName}>
                      {truncateDisplayName(candidateName)}
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
                            onClick={() => handleResumeOpen(resume)}
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
                    {showActionsColumn ? (
                      <td>
                        <div className="admin-actions-cell">
                          {renderRowActions(resume, deletingResId)}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
