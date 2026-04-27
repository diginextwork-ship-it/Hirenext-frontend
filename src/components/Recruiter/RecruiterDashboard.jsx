import { useCallback, useEffect, useMemo, useState } from "react";
import PerformanceMetricCard from "./PerformanceMetricCard";
import ResumeStatusActionModal from "./ResumeStatusActionModal";
import {
  fetchRecruiterDashboard,
  markResumeLeft,
} from "../../services/performanceService";
import { authFetch } from "../../auth/authFetch";
import { API_BASE_URL } from "../../config/api";
import {
  formatResumeCompanyDisplay,
  normalizeResumeData,
} from "../../utils/dashboardData";
import {
  formatDateInIndia,
  formatDateTimeInIndia,
  parseDateTimeValue,
} from "../../utils/dateTime";

const toDisplay = (value) =>
  value === null || value === undefined ? "-" : value;
const formatDate = (value) => {
  return formatDateInIndia(value, "Not set");
};
const getResumeCompanyName = (resume) =>
  formatResumeCompanyDisplay(resume);
const getResumeCityName = (resume) =>
  normalizeResumeData(resume).city || "N/A";
const getResumeCandidateName = (resume) =>
  normalizeResumeData(resume).candidateName || "N/A";
const getResumeCandidatePhone = (resume) =>
  normalizeResumeData(resume).candidatePhone || null;
const getPointsProgressColor = (points) => {
  if (points <= 25) return "danger";
  if (points <= 75) return "warning";
  return "success";
};

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

const normalizeStatusValue = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const hasValue = (value) =>
  value !== null &&
  value !== undefined &&
  !(typeof value === "string" && value.trim() === "");

const getOthersEventAt = (resume) => {
  if (hasValue(resume?.othersAt)) return resume.othersAt;
  if (hasValue(resume?.others_at)) return resume.others_at;
  if (normalizeStatusValue(resume?.workflowStatus) === "others") {
    return resume?.workflowUpdatedAt || null;
  }
  return null;
};

const getStatusRank = (status) => {
  const normalized = normalizeStatusValue(status);
  return Object.prototype.hasOwnProperty.call(STATUS_PROGRESS_RANK, normalized)
    ? STATUS_PROGRESS_RANK[normalized]
    : -1;
};

const mapStatusToFilter = (status) => {
  const normalized = normalizeStatusValue(status);
  if (normalized === "submitted") return "submitted";
  if (normalized === "verified") return "verified";
  if (normalized === "others") return "others";
  if (normalized === "walk in" || normalized === "walk_in") return "walk_in";
  if (
    normalized === "shortlisted" ||
    normalized === "pending_joining" ||
    normalized === "pending joining"
  ) {
    return "shortlisted";
  }
  if (normalized === "selected" || normalized === "select") return "selected";
  if (normalized === "rejected" || normalized === "reject") return "rejected";
  if (normalized === "joined") return "joined";
  if (normalized === "dropout") return "dropout";
  if (normalized === "billed") return "billed";
  if (normalized === "left") return "left";
  return "";
};

export default function RecruiterDashboard({ recruiterId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ startDate: "", endDate: "" });
  const [appliedFilters, setAppliedFilters] = useState({
    startDate: "",
    endDate: "",
  });
  const [filterError, setFilterError] = useState("");
  const [statusResumes, setStatusResumes] = useState([]);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [activeStatus, setActiveStatus] = useState("");
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [selectedResumeForAction, setSelectedResumeForAction] = useState(null);
  const [leftModalOpen, setLeftModalOpen] = useState(false);
  const [leftModalResume, setLeftModalResume] = useState(null);
  const [leftReason, setLeftReason] = useState("");
  const [leftSubmitting, setLeftSubmitting] = useState(false);
  const [leftError, setLeftError] = useState("");
  const [rollbackSubmittingResId, setRollbackSubmittingResId] = useState("");

  const handleFilterChange = (field) => (event) => {
    const nextValue = event.target.value;
    setFilters((prev) => ({ ...prev, [field]: nextValue }));
    if (filterError) setFilterError("");
  };

  const handleApplyFilters = () => {
    const startDate = String(filters.startDate || "").trim();
    const endDate = String(filters.endDate || "").trim();

    if ((startDate && !endDate) || (!startDate && endDate)) {
      setFilterError("Select both start date and end date.");
      return;
    }
    if (startDate && endDate && startDate > endDate) {
      setFilterError("Start date cannot be after end date.");
      return;
    }

    setFilterError("");
    setAppliedFilters({ startDate, endDate });
  };

  const handleClearFilters = () => {
    setFilterError("");
    setFilters({ startDate: "", endDate: "" });
    setAppliedFilters({ startDate: "", endDate: "" });
  };

  const fetchRecruiterResumes = useCallback(async () => {
    const payload = await authFetch(
      `${API_BASE_URL}/api/recruiters/${encodeURIComponent(recruiterId)}/resumes`,
      {},
      "Failed to fetch recruiter resumes.",
    );
    return Array.isArray(payload.resumes)
      ? payload.resumes.map((item) => normalizeResumeData(item))
      : [];
  }, [recruiterId]);

  useEffect(() => {
    if (!recruiterId) return;
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [dashboardResult, resumesResult] = await Promise.allSettled([
          fetchRecruiterDashboard(recruiterId, appliedFilters),
          fetchRecruiterResumes(),
        ]);
        if (dashboardResult.status !== "fulfilled") {
          throw dashboardResult.reason;
        }
        if (!active) return;
        setData(dashboardResult.value);
        setStatusResumes(
          resumesResult.status === "fulfilled" &&
            Array.isArray(resumesResult.value)
            ? resumesResult.value
            : [],
        );
      } catch (loadError) {
        if (!active) return;
        setError(loadError.message || "Failed to load recruiter dashboard.");
        setStatusResumes([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [recruiterId, appliedFilters, fetchRecruiterResumes]);

  const handleStatusCardClick = async (statusKey) => {
    const nextStatus = mapStatusToFilter(statusKey);
    setActiveStatus(nextStatus);
    setStatusError("");
    setStatusLoading(true);
    try {
      const resumes = await fetchRecruiterResumes();
      setStatusResumes(resumes);
    } catch (loadError) {
      setStatusError(loadError.message || "Failed to load resumes.");
      setStatusResumes([]);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleRollbackOthers = async (resume) => {
    const resId = String(resume?.resId || "").trim();
    if (!resId) return;

    setStatusError("");
    setRollbackSubmittingResId(resId);
    try {
      await authFetch(
        `${API_BASE_URL}/api/recruiters/${encodeURIComponent(recruiterId)}/resumes/${encodeURIComponent(resId)}/rollback-status`,
        { method: "POST" },
        "Failed to rollback resume status.",
      );
      const resumes = await fetchRecruiterResumes();
      setStatusResumes(resumes);
      refreshDashboardStats();
    } catch (rollbackError) {
      setStatusError(rollbackError.message || "Failed to rollback resume.");
    } finally {
      setRollbackSubmittingResId("");
    }
  };

  const activeStatusLabel = useMemo(() => {
    if (!activeStatus) return "";
    return activeStatus.replace(/_/g, " ");
  }, [activeStatus]);

  const matchesAppliedDateRange = useCallback(
    (rawValue) => {
      const { startDate, endDate } = appliedFilters;
      if (!startDate || !endDate) return true;
      if (!rawValue) return false;
      const parsed = parseDateTimeValue(rawValue);
      if (!parsed) return false;
      const start = new Date(`${startDate}T00:00:00`);
      const end = new Date(`${endDate}T23:59:59.999`);
      return parsed >= start && parsed <= end;
    },
    [appliedFilters],
  );

  const othersEventResumes = useMemo(() => {
    const byResId = new Map();
    for (const resume of Array.isArray(statusResumes) ? statusResumes : []) {
      const resId = String(
        resume?.resId ?? resume?.res_id ?? resume?.resumeId ?? resume?.resume_id ?? "",
      ).trim();
      const othersEventAt = getOthersEventAt(resume);
      if (!resId || !othersEventAt || !matchesAppliedDateRange(othersEventAt)) continue;
      const nextTime = new Date(othersEventAt).getTime();
      const prev = byResId.get(resId);
      if (!prev || nextTime > prev.time) {
        byResId.set(resId, { resume, time: Number.isFinite(nextTime) ? nextTime : 0 });
      }
    }
    return Array.from(byResId.values()).map(({ resume }) => resume);
  }, [matchesAppliedDateRange, statusResumes]);

  const filteredStatusResumes = useMemo(() => {
    const normalizedStatus = normalizeStatusValue(activeStatus);
    if (normalizedStatus === "others") {
      return othersEventResumes;
    }
    const dedupedByLatestStatus = (() => {
      const byResId = new Map();
      for (const resume of Array.isArray(statusResumes) ? statusResumes : []) {
        const resId =
          resume?.resId ?? resume?.res_id ?? resume?.resumeId ?? resume?.resume_id;
        if (!resId || String(resId).trim() === "") continue;
        const currentStatus = normalizeStatusValue(
          resume?.workflowStatus || resume?.workflow_status || resume?.status,
        );
        const currentRank = getStatusRank(currentStatus);
        const currentUpdatedAt = new Date(
          resume?.workflowUpdatedAt || resume?.uploadedAt || 0,
        ).getTime();
        const next = {
          resume,
          status: currentStatus,
          rank: currentRank,
          updatedAt: Number.isFinite(currentUpdatedAt) ? currentUpdatedAt : 0,
        };
        const prev = byResId.get(String(resId));
        if (
          !prev ||
          next.updatedAt > prev.updatedAt ||
          (next.updatedAt === prev.updatedAt && next.rank > prev.rank)
        ) {
          byResId.set(String(resId), next);
        }
      }
      return Array.from(byResId.values()).map((item) => ({
        ...item.resume,
        workflowStatus: item.status || item.resume?.workflowStatus,
        status: item.status || item.resume?.status,
      }));
    })();

    let resumes = dedupedByLatestStatus;
    if (normalizedStatus && normalizedStatus !== "submitted") {
      resumes = resumes.filter(
        (resume) =>
          normalizeStatusValue(resume.workflowStatus) === normalizedStatus,
      );
    }
    resumes = resumes.filter((resume) =>
      matchesAppliedDateRange(resume.workflowUpdatedAt || resume.uploadedAt),
    );
    return resumes;
  }, [activeStatus, statusResumes, matchesAppliedDateRange, othersEventResumes]);

  const refreshDashboardStats = async () => {
    try {
      const [dashboardResult, resumesResult] = await Promise.allSettled([
        fetchRecruiterDashboard(recruiterId, appliedFilters),
        fetchRecruiterResumes(),
      ]);
      if (dashboardResult.status !== "fulfilled") return;
      setData(dashboardResult.value);
      setStatusResumes(
        resumesResult.status === "fulfilled" && Array.isArray(resumesResult.value)
          ? resumesResult.value
          : [],
      );
    } catch {
      // Stats refresh is best-effort; don't overwrite main error state
    }
  };

  const handleRefreshDashboard = async () => {
    setLoading(true);
    setError("");
    try {
      const [dashboardResult, resumesResult] = await Promise.allSettled([
        fetchRecruiterDashboard(recruiterId, appliedFilters),
        fetchRecruiterResumes(),
      ]);
      if (dashboardResult.status !== "fulfilled") {
        throw dashboardResult.reason;
      }
      setData(dashboardResult.value);
      setStatusResumes(
        resumesResult.status === "fulfilled" && Array.isArray(resumesResult.value)
          ? resumesResult.value
          : [],
      );
    } catch (loadError) {
      setError(loadError.message || "Failed to load recruiter dashboard.");
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return <p className="chart-empty">Loading performance dashboard...</p>;
  if (error) return <p className="job-message job-message-error">{error}</p>;
  if (!data) return <p className="chart-empty">No dashboard data available.</p>;

  const billedResumePoints = statusResumes.reduce((sum, resume) => {
    const normalizedStatus = normalizeStatusValue(resume?.workflowStatus);
    if (!["billed", "left"].includes(normalizedStatus)) return sum;
    return sum + (Number(resume?.points) || 0);
  }, 0);
  const totalPoints =
    billedResumePoints > 0
      ? billedResumePoints
      : Number(data.recruiter?.points) || 0;
  const cappedPoints = Math.max(0, Math.min(100, totalPoints));
  const progressWidth = totalPoints > 100 ? 100 : cappedPoints;
  const pointsProgressColor = getPointsProgressColor(totalPoints);
  const formatDateTime = (value) => formatDateTimeInIndia(value, "-");

  return (
    <section className="recruiter-performance-dashboard">
      <div className="ui-row-between ui-row-wrap">
        <h2>My Performance Dashboard</h2>
        <button
          type="button"
          className="click-here-btn"
          onClick={handleRefreshDashboard}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>
      <div className="dashboard-date-filter">
        <div className="dashboard-date-input">
          <label htmlFor="recruiterDashboardStartDate">Start date</label>
          <input
            id="recruiterDashboardStartDate"
            type="date"
            value={filters.startDate}
            onChange={handleFilterChange("startDate")}
          />
        </div>
        <div className="dashboard-date-input">
          <label htmlFor="recruiterDashboardEndDate">End date</label>
          <input
            id="recruiterDashboardEndDate"
            type="date"
            value={filters.endDate}
            onChange={handleFilterChange("endDate")}
          />
        </div>
        <div className="dashboard-date-actions">
          <button
            type="button"
            className="dashboard-date-btn"
            onClick={handleApplyFilters}
          >
            Apply
          </button>
          <button
            type="button"
            className="dashboard-date-btn dashboard-date-btn-secondary"
            onClick={handleClearFilters}
          >
            Clear
          </button>
        </div>
      </div>
      {filterError ? (
        <p className="job-message job-message-error">{filterError}</p>
      ) : null}
      {appliedFilters.startDate && appliedFilters.endDate ? (
        <p className="dashboard-filter-summary">
          Showing statistics from <strong>{appliedFilters.startDate}</strong> to{" "}
          <strong>{appliedFilters.endDate}</strong>.
        </p>
      ) : null}
      <h3>Status Breakdown</h3>
      <div className="metric-grid">
        <PerformanceMetricCard
          title="Submitted"
          color="blue"
          value={data.stats?.submitted || 0}
          clickable
          onClick={() => handleStatusCardClick("submitted")}
        />
        <PerformanceMetricCard
          title="Verified"
          color="green"
          value={toDisplay(data.stats?.verified)}
          clickable
          onClick={() => handleStatusCardClick("verified")}
        />
        <PerformanceMetricCard
          title="Others"
          color="teal"
          value={toDisplay(othersEventResumes.length)}
          clickable
          onClick={() => handleStatusCardClick("others")}
        />
        <PerformanceMetricCard
          title="Walk in"
          color="green"
          value={toDisplay(data.stats?.walk_in)}
          clickable
          onClick={() => handleStatusCardClick("walk_in")}
        />
        <PerformanceMetricCard
          title="Shortlisted"
          color="blue"
          value={toDisplay(data.stats?.shortlisted)}
          clickable
          onClick={() => handleStatusCardClick("shortlisted")}
        />
        <PerformanceMetricCard
          title="Selected"
          color="purple"
          value={toDisplay(data.stats?.select)}
          clickable
          onClick={() => handleStatusCardClick("selected")}
        />
        <PerformanceMetricCard
          title="Rejected"
          color="red"
          value={toDisplay(data.stats?.reject)}
          clickable
          onClick={() => handleStatusCardClick("rejected")}
        />
        <PerformanceMetricCard
          title="Joined"
          color="gold"
          value={toDisplay(data.stats?.joined)}
          clickable
          onClick={() => handleStatusCardClick("joined")}
        />
        <PerformanceMetricCard
          title="Dropout"
          color="pink"
          value={toDisplay(data.stats?.dropout)}
          clickable
          onClick={() => handleStatusCardClick("dropout")}
        />
        <PerformanceMetricCard
          title="Billed"
          color="teal"
          value={toDisplay(data.stats?.billed)}
          clickable
          onClick={() => handleStatusCardClick("billed")}
        />
        <PerformanceMetricCard
          title="Left"
          color="orange"
          value={toDisplay(data.stats?.left)}
          clickable
          onClick={() => handleStatusCardClick("left")}
        />
      </div>

      {data.calculatedMetrics ? (
        <div className="metric-grid" style={{ marginTop: 12 }}>
          <article className="metric-card teal">
            <h4>Billing Rate</h4>
            <div className="billing-rate-bar">
              <div className="billing-rate-track">
                <div
                  className="billing-rate-fill"
                  style={{
                    width: `${Math.min(Number(data.calculatedMetrics.billingRate) || 0, 100)}%`,
                  }}
                />
              </div>
              <span className="billing-rate-label">
                {data.calculatedMetrics.billingRate ?? 0}%
              </span>
            </div>
          </article>
          <article className="metric-card orange">
            <h4>Left Rate</h4>
            <p className="metric-value">
              {data.calculatedMetrics.leftRate ?? 0}%
            </p>
          </article>
        </div>
      ) : null}

      {activeStatus ? (
        <section className="chart-card ui-mt-md">
          <div className="ui-row-between ui-row-wrap">
            <h3>
              {activeStatusLabel} resumes ({filteredStatusResumes.length})
            </h3>
            <button
              type="button"
              className="dashboard-date-btn dashboard-date-btn-secondary"
              onClick={() => setActiveStatus("")}
            >
              Close
            </button>
          </div>
          {statusLoading ? (
            <p className="chart-empty">Loading resumes...</p>
          ) : null}
          {statusError ? (
            <p className="job-message job-message-error">{statusError}</p>
          ) : null}
          {!statusLoading &&
          !statusError &&
          filteredStatusResumes.length === 0 ? (
            <p className="chart-empty">No resumes found for this status.</p>
          ) : null}
          {!statusLoading &&
          !statusError &&
          filteredStatusResumes.length > 0 ? (
            <div className="ui-table-wrap ui-mt-xs">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Phone</th>
                    <th>Job</th>
                    <th>Submitted Reason</th>
                    <th>Verified Reason</th>
                    <th>
                      {activeStatus === "others"
                        ? "Others Reason"
                        : activeStatus === "walk_in"
                        ? "Walk In Reason"
                        : activeStatus === "shortlisted"
                          ? "Shortlist Reason"
                          : activeStatus === "selected"
                            ? "Selection Reason"
                          : activeStatus === "joined"
                            ? "Joined Reason"
                            : activeStatus === "dropout"
                              ? "Dropout Reason"
                              : activeStatus === "rejected"
                                ? "Rejection Reason"
                                : activeStatus === "billed"
                                  ? "Billing Info"
                                  : activeStatus === "left"
                                    ? "Left Reason"
                                    : "Current Reason"}
                    </th>
                    <th>Status</th>
                    <th>Updated</th>
                    {activeStatus === "walk_in" && <th>Walk-in Date</th>}
                    {(activeStatus === "selected" ||
                      activeStatus === "joined" ||
                      activeStatus === "billed" ||
                      activeStatus === "left") && <th>Joining Info</th>}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStatusResumes.map((resume) => {
                    let currentReasonField = null;
                    if (activeStatus === "others") {
                      currentReasonField = resume.othersReason;
                    } else if (activeStatus === "walk_in") {
                      currentReasonField = resume.walkInReason;
                    } else if (activeStatus === "shortlisted") {
                      currentReasonField =
                        resume.shortlistedReason ||
                        resume.pendingJoiningReason;
                    } else if (activeStatus === "selected") {
                      currentReasonField = resume.selectReason;
                    } else if (activeStatus === "joined") {
                      currentReasonField = resume.joinedReason;
                    } else if (activeStatus === "dropout") {
                      currentReasonField = resume.dropoutReason;
                    } else if (activeStatus === "rejected") {
                      currentReasonField = resume.rejectReason;
                    } else if (activeStatus === "billed") {
                      currentReasonField = resume.billedReason || "Auto-billed";
                    } else if (activeStatus === "left") {
                      currentReasonField = resume.leftReason;
                    }

                    return (
                      <tr key={resume.resId}>
                        <td>{getResumeCandidateName(resume)}</td>
                        <td>
                          {getResumeCandidatePhone(resume) ? (
                            <a href={`tel:${getResumeCandidatePhone(resume)}`}>
                              {getResumeCandidatePhone(resume)}
                            </a>
                          ) : (
                            "N/A"
                          )}
                        </td>
                        <td>
                          <div>{resume.jobJid ? `#${resume.jobJid}` : "N/A"}</div>
                          <div className="admin-muted">
                            {getResumeCompanyName(resume)}
                          </div>
                          <div className="admin-muted">
                            {getResumeCityName(resume)}
                          </div>
                        </td>
                        <td className="table-cell-wrap">
                          {resume.submittedReason || "-"}
                        </td>
                        <td className="table-cell-wrap">
                          {resume.verifiedReason || "-"}
                        </td>
                        <td className="table-cell-wrap">
                          {currentReasonField || "-"}
                        </td>
                        <td>
                          {String(resume.workflowStatus || "pending").replace(
                            /_/g,
                            " ",
                          )}
                          {normalizeStatusValue(resume.workflowStatus) ===
                            "left" &&
                          resume.leftReason ? (
                            <span
                              className="left-reason-tooltip"
                              title={resume.leftReason}
                            >
                              {" "}
                              ℹ️
                              <span className="left-reason-text">
                                {resume.leftReason}
                              </span>
                            </span>
                          ) : null}
                        </td>
                        <td>
                          {formatDateTime(
                            resume.workflowUpdatedAt || resume.uploadedAt,
                          )}
                        </td>
                        {activeStatus === "walk_in" && (
                          <td>{formatDate(resume.walkInDate)}</td>
                        )}
                        {(activeStatus === "selected" ||
                          activeStatus === "joined" ||
                          activeStatus === "billed" ||
                          activeStatus === "left") && (
                          <td className="table-cell-wrap">
                            {resume.joiningDate ? (
                              <div>
                                <strong>Date:</strong>{" "}
                                {formatDate(resume.joiningDate)}
                              </div>
                            ) : null}
                            {resume.joiningNote || resume.joinedReason ? (
                              <div>
                                <strong>Note:</strong>{" "}
                                {resume.joiningNote || resume.joinedReason}
                              </div>
                            ) : null}
                            {!resume.joiningDate &&
                            !resume.joiningNote &&
                            !resume.joinedReason
                              ? "Not set"
                              : null}
                          </td>
                        )}
                        <td>
                          <button
                            type="button"
                            className="action-btn action-btn-primary"
                            onClick={() => {
                              setSelectedResumeForAction({
                                ...resume,
                                recruiterRid: recruiterId,
                              });
                              setActionModalOpen(true);
                            }}
                          >
                            Take Action
                          </button>
                          {activeStatus === "others" ? (
                            <button
                              type="button"
                              className="action-btn action-btn-warning"
                              style={{ marginLeft: 6 }}
                              onClick={() => handleRollbackOthers(resume)}
                              disabled={
                                rollbackSubmittingResId ===
                                String(resume.resId || "")
                              }
                            >
                              {rollbackSubmittingResId ===
                              String(resume.resId || "")
                                ? "Rolling back..."
                                : "Rollback"}
                            </button>
                          ) : null}
                          {normalizeStatusValue(resume.workflowStatus) ===
                          "billed" ? (
                            <button
                              type="button"
                              className="action-btn action-btn-warning"
                              style={{ marginLeft: 6 }}
                              onClick={() => {
                                setLeftModalResume(resume);
                                setLeftReason("");
                                setLeftError("");
                                setLeftModalOpen(true);
                              }}
                            >
                              Mark as Left
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      ) : null}

      <article className="points-progress-card">
        <div className="points-progress-head">
          <h3>Total Points Progress</h3>
          <p className="points-progress-label">
            <strong>{totalPoints}</strong>
            {totalPoints <= 100 ? " / 100" : ""}
          </p>
        </div>
        <div
          className="points-progress-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={cappedPoints}
        >
          <div
            className={`points-progress-fill ${pointsProgressColor}`}
            style={{ width: `${progressWidth}%` }}
          />
        </div>
        <div className="points-progress-actions"></div>
      </article>

      <ResumeStatusActionModal
        isOpen={actionModalOpen}
        onClose={() => {
          setActionModalOpen(false);
          setSelectedResumeForAction(null);
        }}
        resume={selectedResumeForAction}
        currentStatus={selectedResumeForAction?.workflowStatus}
        onSuccess={async () => {
          setStatusError("");
          setStatusLoading(true);
          try {
            const resumes = await fetchRecruiterResumes();
            setStatusResumes(resumes);
          } catch (loadError) {
            setStatusError(loadError.message || "Failed to reload resumes.");
          } finally {
            setStatusLoading(false);
          }
          refreshDashboardStats();
        }}
      />

      {leftModalOpen && leftModalResume ? (
        <div
          className="modal-overlay"
          onClick={() => !leftSubmitting && setLeftModalOpen(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "500px" }}
          >
            <div className="modal-header">
              <h3>Mark Candidate as Left</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setLeftModalOpen(false)}
                disabled={leftSubmitting}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="resume-info-preview">
                <p>
                  <strong>Candidate:</strong>{" "}
                  {getResumeCandidateName(leftModalResume)}
                </p>
                <p>
                  <strong>Job ID:</strong> {leftModalResume.jobJid || "N/A"}
                </p>
                <p>
                  <strong>Current Status:</strong> Billed
                </p>
              </div>
              <div className="form-group">
                <label htmlFor="left-reason-input">
                  Reason for leaving (required)
                </label>
                <textarea
                  id="left-reason-input"
                  className="form-control"
                  rows="4"
                  placeholder="Enter why the candidate left..."
                  value={leftReason}
                  onChange={(e) => setLeftReason(e.target.value)}
                  disabled={leftSubmitting}
                />
              </div>
              {leftError ? (
                <div className="job-message job-message-error">{leftError}</div>
              ) : null}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setLeftModalOpen(false)}
                disabled={leftSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={leftSubmitting || !leftReason.trim()}
                onClick={async () => {
                  setLeftSubmitting(true);
                  setLeftError("");
                  try {
                    await markResumeLeft(leftModalResume.jobJid, {
                      resId: leftModalResume.resId,
                      note: leftReason.trim(),
                    });
                    setLeftModalOpen(false);
                    setLeftModalResume(null);
                    setLeftReason("");
                    setStatusLoading(true);
                    try {
                      const resumes = await fetchRecruiterResumes();
                      setStatusResumes(resumes);
                    } catch (reloadErr) {
                      setStatusError(
                        reloadErr.message || "Failed to reload resumes.",
                      );
                    } finally {
                      setStatusLoading(false);
                    }
                    refreshDashboardStats();
                  } catch (err) {
                    setLeftError(err.message || "Failed to mark as left.");
                  } finally {
                    setLeftSubmitting(false);
                  }
                }}
              >
                {leftSubmitting ? "Submitting..." : "Confirm Left"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
