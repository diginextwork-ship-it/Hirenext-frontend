import { useEffect, useMemo, useState } from "react";
import PerformanceMetricCard from "./PerformanceMetricCard";
import ResumeStatusActionModal from "./ResumeStatusActionModal";
import {
  fetchRecruiterDashboard,
  markResumeLeft,
} from "../../services/performanceService";
import { getAuthToken } from "../../auth/session";
import { API_BASE_URL } from "../../config/api";

const toDisplay = (value) =>
  value === null || value === undefined ? "-" : value;
const getPointsProgressColor = (points) => {
  if (points <= 25) return "danger";
  if (points <= 75) return "warning";
  return "success";
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

  useEffect(() => {
    if (!recruiterId) return;
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetchRecruiterDashboard(
          recruiterId,
          appliedFilters,
        );
        if (!active) return;
        setData(response);
      } catch (loadError) {
        if (!active) return;
        setError(loadError.message || "Failed to load recruiter dashboard.");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [recruiterId, appliedFilters]);

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

  const readJsonResponse = async (response) => {
    const raw = await response.text();
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error(
        `Server returned non-JSON response (${response.status}).`,
      );
    }
  };

  const fetchRecruiterResumes = async () => {
    const token = getAuthToken();
    if (!token) throw new Error("Authentication required.");
    const response = await fetch(
      `${API_BASE_URL}/api/recruiters/${encodeURIComponent(recruiterId)}/resumes`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    const payload = await readJsonResponse(response);
    if (!response.ok) {
      throw new Error(
        payload?.error ||
          payload?.message ||
          "Failed to fetch recruiter resumes.",
      );
    }
    return Array.isArray(payload.resumes) ? payload.resumes : [];
  };

  const normalizeStatus = (value) =>
    String(value || "")
      .trim()
      .toLowerCase();
  const mapStatusToFilter = (status) => {
    const normalized = normalizeStatus(status);
    if (normalized === "submitted") return "submitted";
    if (normalized === "verified") return "verified";
    if (normalized === "walk in" || normalized === "walk_in") return "walk_in";
    if (normalized === "selected" || normalized === "select") return "selected";
    if (normalized === "rejected" || normalized === "reject") return "rejected";
    if (normalized === "joined") return "joined";
    if (normalized === "dropout") return "dropout";
    if (normalized === "billed") return "billed";
    if (normalized === "left") return "left";
    return "";
  };

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

  const activeStatusLabel = useMemo(() => {
    if (!activeStatus) return "";
    return activeStatus.replace(/_/g, " ");
  }, [activeStatus]);

  const filteredStatusResumes = useMemo(() => {
    const normalizedStatus = normalizeStatus(activeStatus);
    let resumes = Array.isArray(statusResumes) ? statusResumes : [];
    if (normalizedStatus && normalizedStatus !== "submitted") {
      resumes = resumes.filter(
        (resume) => normalizeStatus(resume.workflowStatus) === normalizedStatus,
      );
    }
    const { startDate, endDate } = appliedFilters;
    if (startDate && endDate) {
      const start = new Date(`${startDate}T00:00:00`);
      const end = new Date(`${endDate}T23:59:59.999`);
      resumes = resumes.filter((resume) => {
        const raw = resume.workflowUpdatedAt || resume.uploadedAt;
        if (!raw) return false;
        const parsed = new Date(raw);
        if (Number.isNaN(parsed.getTime())) return false;
        return parsed >= start && parsed <= end;
      });
    }
    return resumes;
  }, [activeStatus, statusResumes, appliedFilters]);

  const refreshDashboardStats = async () => {
    try {
      const response = await fetchRecruiterDashboard(
        recruiterId,
        appliedFilters,
      );
      setData(response);
    } catch {
      // Stats refresh is best-effort; don't overwrite main error state
    }
  };

  const handleRefreshDashboard = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchRecruiterDashboard(
        recruiterId,
        appliedFilters,
      );
      setData(response);
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

  const totalPoints = Number(data.recruiter?.points) || 0;
  const cappedPoints = Math.max(0, Math.min(100, totalPoints));
  const progressWidth = totalPoints > 100 ? 100 : cappedPoints;
  const pointsProgressColor = getPointsProgressColor(totalPoints);
  const formatDateTime = (value) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    return parsed.toLocaleString();
  };

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
          title="Walk in"
          color="green"
          value={toDisplay(data.stats?.walk_in)}
          clickable
          onClick={() => handleStatusCardClick("walk_in")}
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
                    <th>Job ID</th>
                    <th>Submitted Reason</th>
                    <th>Verified Reason</th>
                    <th>
                      {activeStatus === "walk_in"
                        ? "Walk In Reason"
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
                    {(activeStatus === "joined" ||
                      activeStatus === "billed" ||
                      activeStatus === "left") && <th>Joining Info</th>}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStatusResumes.map((resume) => {
                    let currentReasonField = null;
                    if (activeStatus === "walk_in") {
                      currentReasonField = resume.walkInReason;
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
                        <td>{resume.candidateName || "N/A"}</td>
                        <td>
                          {resume.candidatePhone ? (
                            <a href={`tel:${resume.candidatePhone}`}>
                              {resume.candidatePhone}
                            </a>
                          ) : (
                            "N/A"
                          )}
                        </td>
                        <td>{resume.jobJid ?? "N/A"}</td>
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
                          {normalizeStatus(resume.workflowStatus) === "left" &&
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
                        {(activeStatus === "joined" ||
                          activeStatus === "billed" ||
                          activeStatus === "left") && (
                          <td className="table-cell-wrap">
                            {resume.joiningDate ? (
                              <div>
                                <strong>Date:</strong>{" "}
                                {new Date(
                                  resume.joiningDate + "T00:00:00",
                                ).toLocaleDateString()}
                              </div>
                            ) : null}
                            {resume.joiningNote ? (
                              <div>
                                <strong>Note:</strong> {resume.joiningNote}
                              </div>
                            ) : null}
                            {!resume.joiningDate && !resume.joiningNote
                              ? "-"
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
                          {normalizeStatus(resume.workflowStatus) ===
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
                  {leftModalResume.candidateName || "N/A"}
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
