import { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout";
import {
  API_BASE_URL,
  adminDeleteResume,
  getAdminHeaders,
  readJsonResponse,
} from "./adminApi";
import {
  formatResumeCompanyDisplay,
  normalizeResumeData,
} from "../../utils/dashboardData";
import { formatDateTimeInIndia } from "../../utils/dateTime";
import "../../styles/admin-panel.css";

const formatDateTime = (value) => formatDateTimeInIndia(value);

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

const SOURCE_FILTERS = {
  ALL: "all",
  CANDIDATE: "candidate",
  RECRUITER: "recruiter",
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
  const [citySearch, setCitySearch] = useState("");
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

  const cityFilteredResumes = citySearch.trim()
    ? filteredResumes.filter((resume) =>
        String(resume.city || resume.job?.city || "")
          .trim()
          .toLowerCase()
          .includes(citySearch.trim().toLowerCase()),
      )
    : filteredResumes;

  const handleResumeOpen = (resId) => {
    const token =
      localStorage.getItem("adminToken") || localStorage.getItem("token");
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
        <label className="admin-candidate-resumes-search">
          <span>Search by city</span>
          <input
            type="text"
            placeholder="Enter city"
            value={citySearch}
            onChange={(event) => setCitySearch(event.target.value)}
          />
        </label>
        {phoneSearch.trim() || citySearch.trim() ? (
          <button
            type="button"
            className="admin-back-btn admin-candidate-resumes-clear"
            onClick={() => {
              setPhoneSearch("");
              setCitySearch("");
            }}
          >
            Clear
          </button>
        ) : null}
      </div>

      <div className="admin-dashboard-card admin-card-large">
        {cityFilteredResumes.length === 0 ? (
          <p className="admin-chart-empty">
            {isLoading
              ? "Loading resumes..."
              : phoneSearch.trim() || citySearch.trim()
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
                  <th>Job Company Name</th>
                  <th>City</th>
                  <th>ATS Score</th>
                  <th>Latest Status</th>
                  <th>Recruiter Note</th>
                  <th>Submitted At</th>
                  <th>Resume File</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {cityFilteredResumes.map((resume) => (
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
                    <td>{formatResumeCompanyDisplay(resume) || "N/A"}</td>
                    <td>{resume.city || resume.job?.city || "N/A"}</td>
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
                    <td>{resume.submittedReason || "-"}</td>
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
