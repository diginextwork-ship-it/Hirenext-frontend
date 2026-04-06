import { useCallback, useEffect, useMemo, useState } from "react";
import { getAuthSession } from "../../auth/session";
import { API_BASE_URL } from "../../config/api";
import { normalizeResumeData } from "../../utils/dashboardData";
import {
  fetchTeamLeaderPerformanceDashboard,
  rollbackJobResumeStatus,
  updateJobResumeStatus,
} from "../../services/performanceService";
import "../../styles/admin-panel.css";

const PRESETS = {
  TODAY: "today",
  YESTERDAY: "yesterday",
  THIS_MONTH: "this_month",
  LAST_MONTH: "last_month",
  CUSTOM: "custom",
};

const STATUS_CARDS = [
  { key: "verified", label: "Verified", summaryKey: "totalVerified", tone: "green" },
  { key: "walk_in", label: "Walk In", summaryKey: "totalWalkIn", tone: "green" },
  { key: "shortlisted", label: "Shortlisted", summaryKey: "totalShortlisted", tone: "blue" },
  { key: "selected", label: "Selected", summaryKey: "totalSelected", tone: "purple" },
  { key: "rejected", label: "Rejected", summaryKey: "totalRejected", tone: "red" },
  { key: "joined", label: "Joined", summaryKey: "totalJoined", tone: "gold" },
  { key: "dropout", label: "Dropout", summaryKey: "totalDropout", tone: "pink" },
  { key: "billed", label: "Billed", summaryKey: "totalBilled", tone: "teal" },
  { key: "left", label: "Left", summaryKey: "totalLeft", tone: "orange" },
];

const TEAM_LEADER_ACTIONS_BY_STATUS = {
  submitted: [
    { value: "verified", label: "Verify", color: "#2563eb" },
    { value: "rejected", label: "Reject", color: "#dc2626" },
  ],
  verified: [
    { value: "walk_in", label: "Walk In", color: "#ca8a04" },
    { value: "rejected", label: "Reject", color: "#dc2626" },
  ],
  walk_in: [
    { value: "shortlisted", label: "Shortlisted", color: "#2563eb" },
    { value: "rejected", label: "Reject", color: "#dc2626" },
  ],
  shortlisted: [
    { value: "selected", label: "Selected", color: "#16a34a" },
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

const ROLLBACKABLE_STATUSES = new Set([
  "verified",
  "walk_in",
  "shortlisted",
  "selected",
  "joined",
  "billed",
  "left",
  "rejected",
  "dropout",
]);

const STATUS_PROGRESS_RANK = {
  submitted: 0,
  verified: 1,
  walk_in: 2,
  shortlisted: 3,
  selected: 4,
  joined: 5,
  billed: 6,
  left: 7,
  dropout: 7,
  rejected: 7,
};

const toDateStr = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getPresetRange = (preset) => {
  const now = new Date();
  switch (preset) {
    case PRESETS.TODAY:
      return { start: toDateStr(now), end: toDateStr(now) };
    case PRESETS.YESTERDAY: {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return { start: toDateStr(yesterday), end: toDateStr(yesterday) };
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
};

const formatPresetLabel = (preset) => {
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
};

const formatStatusLabel = (status) => {
  const normalized = String(status || "")
    .trim()
    .toLowerCase();
  if (!normalized) return "Unknown";
  if (normalized === "submitted") return "Resumes Submitted";
  return normalized
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const formatDate = (value) => {
  if (!value) return "Not set";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString();
};

const normalizeStatus = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (normalized === "walkin") return "walk_in";
  if (normalized === "select") return "selected";
  if (normalized === "pendingjoining" || normalized === "pending_joining") {
    return "shortlisted";
  }
  return normalized || "submitted";
};

const getStatusRank = (status) => {
  const normalized = normalizeStatus(status);
  return Object.prototype.hasOwnProperty.call(STATUS_PROGRESS_RANK, normalized)
    ? STATUS_PROGRESS_RANK[normalized]
    : -1;
};

const dedupeItemsByResId = (items) => {
  const map = new Map();

  for (const item of items) {
    const resId = String(
      item?.resId ?? item?.res_id ?? item?.resumeId ?? item?.resume_id ?? "",
    ).trim();
    if (!resId) continue;

    if (!map.has(resId)) {
      map.set(resId, { ...item, resId });
      continue;
    }

    map.set(resId, {
      ...map.get(resId),
      ...item,
      resId,
    });
  }

  return Array.from(map.values());
};

export default function TeamLeaderPerformanceOverview({ refreshKey = 0 }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timelinePreset, setTimelinePreset] = useState(PRESETS.TODAY);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [selectedStatusKey, setSelectedStatusKey] = useState("verified");
  const [actionModalItem, setActionModalItem] = useState(null);
  const [actionTarget, setActionTarget] = useState("");
  const [actionReason, setActionReason] = useState("");
  const [actionJoiningDate, setActionJoiningDate] = useState("");
  const [actionJoiningNote, setActionJoiningNote] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");

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
      const nextData = await fetchTeamLeaderPerformanceDashboard({
        startDate: dateRange?.start || "",
        endDate: dateRange?.end || "",
      });
      setData(nextData);
    } catch (loadError) {
      setError(
        loadError.message || "Failed to load team leader performance data.",
      );
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance, refreshKey]);

  const statusDrilldown = data?.statusDrilldown || {};
  const summary = data?.summary || {};

  const latestStatusByResId = useMemo(() => {
    const map = new Map();

    for (const [bucketStatus, bucketItems] of Object.entries(statusDrilldown)) {
      if (!Array.isArray(bucketItems)) continue;

      for (const item of bucketItems) {
        const normalized = normalizeResumeData(item);
        const resId = String(
          item?.resId ??
            item?.res_id ??
            item?.resumeId ??
            item?.resume_id ??
            normalized?.resId ??
            "",
        ).trim();
        if (!resId) continue;

        const effectiveStatus = normalizeStatus(
          normalized?.workflowStatus ||
            normalized?.workflow_status ||
            normalized?.status ||
            item?.workflowStatus ||
            item?.workflow_status ||
            item?.status ||
            bucketStatus,
        );

        map.set(resId, effectiveStatus);
      }
    }

    return map;
  }, [statusDrilldown]);

  const selectedStatusItems = useMemo(() => {
    const rawItems =
      selectedStatusKey === "submitted"
        ? Array.isArray(statusDrilldown.submitted)
          ? statusDrilldown.submitted
          : []
        : Array.isArray(statusDrilldown[selectedStatusKey])
          ? statusDrilldown[selectedStatusKey]
          : [];

    const normalizedItems = rawItems.map((item) => {
      const normalized = normalizeResumeData(item);
      const resId = String(
        item?.resId ??
          item?.res_id ??
          item?.resumeId ??
          item?.resume_id ??
          normalized?.resId ??
          "",
      ).trim();
      const effectiveStatus = normalizeStatus(
        latestStatusByResId.get(resId) ||
          normalized?.workflowStatus ||
          normalized?.workflow_status ||
          normalized?.status ||
          item?.workflowStatus ||
          item?.workflow_status ||
          item?.status ||
          selectedStatusKey,
      );

      return {
        ...normalized,
        ...item,
        resId,
        status: effectiveStatus,
      };
    });

    const dedupedItems = dedupeItemsByResId(normalizedItems);

    if (selectedStatusKey === "submitted") {
      return dedupedItems;
    }

    return dedupedItems.filter(
      (item) => normalizeStatus(item?.status) === normalizeStatus(selectedStatusKey),
    );
  }, [latestStatusByResId, selectedStatusKey, statusDrilldown]);

  const handleResumeOpen = (resId) => {
    const token = getAuthSession()?.token;
    if (!token || !resId) return;
    window.open(
      `${API_BASE_URL}/api/dashboard/team-leader/resumes/${encodeURIComponent(resId)}/file?token=${encodeURIComponent(token)}`,
      "_blank",
      "noopener,noreferrer",
    );
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
        availableActions: TEAM_LEADER_ACTIONS_BY_STATUS[effectiveStatus] || [],
        canRollback: ROLLBACKABLE_STATUSES.has(effectiveStatus),
      };
    },
    [selectedStatusRank],
  );

  const hasAnyRowActions = useMemo(
    () =>
      selectedStatusItems.some((item) => {
        const rowActionState = getRowActionState(item);
        return rowActionState.availableActions.length > 0 || rowActionState.canRollback;
      }),
    [getRowActionState, selectedStatusItems],
  );

  const openActionModal = (item, targetStatus) => {
    setActionModalItem(item);
    setActionTarget(targetStatus);
    setActionReason("");
    setActionJoiningDate("");
    setActionJoiningNote("");
    setActionError("");
  };

  const closeActionModal = () => {
    if (actionSubmitting) return;
    setActionModalItem(null);
    setActionTarget("");
    setActionReason("");
    setActionJoiningDate("");
    setActionJoiningNote("");
    setActionError("");
  };

  const handleAdvanceStatus = async () => {
    if (!actionModalItem?.jobJid || !actionModalItem?.resId || !actionTarget) return;

    setActionSubmitting(true);
    setActionError("");
    try {
      const payload = {
        resId: actionModalItem.resId,
        status: actionTarget,
      };

      const trimmedReason = actionReason.trim();
      const trimmedJoiningNote = actionJoiningNote.trim();

      if (actionTarget === "selected") {
        if (!actionJoiningDate.trim()) {
          throw new Error("Joining date is required for Selected.");
        }
        payload.joining_date = actionJoiningDate.trim();
        if (trimmedReason) payload.note = trimmedReason;
      } else if (actionTarget === "joined") {
        if (trimmedJoiningNote) payload.joinedReason = trimmedJoiningNote;
        else if (trimmedReason) payload.note = trimmedReason;
      } else if (trimmedReason) {
        payload.reason = trimmedReason;
        payload.note = trimmedReason;
      }

      await updateJobResumeStatus(actionModalItem.jobJid, payload);
      closeActionModal();
      await fetchPerformance();
    } catch (error) {
      setActionError(error.message || "Failed to update status.");
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleRollback = async (item) => {
    if (!item?.jobJid || !item?.resId) return;
    const confirmed = window.confirm(
      `Rollback ${item.candidateName || item.name || item.resId} from ${formatStatusLabel(item.status)} to the previous stage?`,
    );
    if (!confirmed) return;

    try {
      await rollbackJobResumeStatus(item.jobJid, item.resId);
      await fetchPerformance();
    } catch (error) {
      window.alert(error.message || "Failed to rollback resume status.");
    }
  };

  return (
    <section className="perf-section">
      <div className="ui-row-between ui-row-wrap" style={{ gap: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Performance Dashboard</h2>
          <p className="admin-muted" style={{ margin: "8px 0 0" }}>
            Track everyone's activity, including your own, across all team leader jobs.
          </p>
        </div>
        <button
          type="button"
          className="admin-refresh-btn"
          onClick={fetchPerformance}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error ? (
        <div className="admin-alert admin-alert-error" style={{ marginTop: 16 }}>
          {error}
        </div>
      ) : null}

      <div className="perf-timeline-bar">
        <div className="perf-timeline-presets">
          {[
            { key: PRESETS.TODAY, label: "Today" },
            { key: PRESETS.YESTERDAY, label: "Yesterday" },
            { key: PRESETS.THIS_MONTH, label: "This Month" },
            { key: PRESETS.LAST_MONTH, label: "Last Month" },
            { key: PRESETS.CUSTOM, label: "Custom" },
          ].map((preset) => (
            <button
              key={preset.key}
              type="button"
              className={`perf-timeline-btn${timelinePreset === preset.key ? " perf-timeline-btn-active" : ""}`}
              onClick={() => setTimelinePreset(preset.key)}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {timelinePreset === PRESETS.CUSTOM ? (
          <div className="perf-timeline-custom">
            <label className="perf-timeline-input">
              From
              <input
                type="date"
                value={customStart}
                max={customEnd || undefined}
                onChange={(event) => setCustomStart(event.target.value)}
              />
            </label>
            <label className="perf-timeline-input">
              To
              <input
                type="date"
                value={customEnd}
                min={customStart || undefined}
                onChange={(event) => setCustomEnd(event.target.value)}
              />
            </label>
          </div>
        ) : null}

        {dateRange ? (
          <p className="perf-timeline-label">
            Showing: <strong>{formatPresetLabel(timelinePreset)}</strong>
            {" - "}
            {dateRange.start === dateRange.end
              ? dateRange.start
              : `${dateRange.start} to ${dateRange.end}`}
          </p>
        ) : null}
      </div>

      <div className="perf-summary-grid">
        <button
          type="button"
          className={`perf-stat-card perf-stat-card-button perf-stat-card-submitted${selectedStatusKey === "submitted" ? " perf-stat-card-active" : ""}`}
          onClick={() => setSelectedStatusKey("submitted")}
        >
          <span className="perf-stat-label">Resumes Submitted</span>
          <span className="perf-stat-value">{summary.totalSubmitted ?? 0}</span>
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
              {summary[card.summaryKey] ?? 0}
            </span>
          </button>
        ))}
      </div>

      <div className="perf-section">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <h3 className="perf-section-title" style={{ marginBottom: 0 }}>
            {selectedStatusKey === "submitted"
              ? "Submitted Resume List"
              : `${formatStatusLabel(selectedStatusKey)} Resume List`}
          </h3>
          <span className="admin-muted">
            {selectedStatusItems.length} item
            {selectedStatusItems.length === 1 ? "" : "s"}
          </span>
        </div>

        {loading && !data ? (
          <p className="admin-chart-empty" style={{ marginTop: 16 }}>
            Loading performance data...
          </p>
        ) : selectedStatusItems.length > 0 ? (
          <div className="admin-table-wrap" style={{ marginTop: 16 }}>
            <table className="admin-table admin-table-wide">
              <thead>
                <tr>
                  <th>Recruiter</th>
                  <th>Team Leader</th>
                  <th>Contact Number</th>
                  <th>Job ID</th>
                  <th>Company Name</th>
                  <th>City</th>
                  <th>Resume File</th>
                  <th>Status</th>
                  {selectedStatusKey === "walk_in" ? <th>Walk-in Date</th> : null}
                  {["dropout", "selected", "joined", "billed", "left"].includes(
                    selectedStatusKey,
                  ) ? (
                    <th>
                      {selectedStatusKey === "dropout"
                        ? "Dropout Reason"
                        : selectedStatusKey === "selected"
                          ? "Joining Date"
                          : "Joining Info"}
                    </th>
                  ) : null}
                  {hasAnyRowActions ? <th>Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {selectedStatusItems.map((item) => {
                  const rowActionState = getRowActionState(item);
                  const rowHasActions =
                    rowActionState.availableActions.length > 0 ||
                    rowActionState.canRollback;

                  return (
                  <tr key={`${selectedStatusKey}-${item.resId}`}>
                    <td>
                      <strong>{item.recruiterName || "N/A"}</strong>
                      <div className="admin-muted">{item.recruiterRid || "N/A"}</div>
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
                    <td>
                      {item.companyName ||
                        item.company_name ||
                        item.job?.companyName ||
                        "N/A"}
                    </td>
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
                    {selectedStatusKey === "walk_in" ? (
                      <td>{formatDate(item.walkInDate)}</td>
                    ) : null}
                    {["dropout", "selected", "joined", "billed", "left"].includes(
                      selectedStatusKey,
                    ) ? (
                      <td>
                        {selectedStatusKey === "dropout" ? (
                          item.dropoutReason || item.reason || "Not set"
                        ) : selectedStatusKey === "selected" ? (
                          formatDate(item.joiningDate)
                        ) : item.joiningDate || item.joiningNote || item.joinedReason ? (
                          <>
                            {item.joiningDate ? (
                              <div>
                                <strong>Date:</strong> {formatDate(item.joiningDate)}
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
                    ) : null}
                    {hasAnyRowActions ? (
                      <td>
                        {rowHasActions ? (
                          <div
                            style={{
                              display: "flex",
                              gap: 6,
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
                                onClick={() => openActionModal(item, action.value)}
                              >
                                {action.label}
                              </button>
                            ))}
                            {rowActionState.canRollback ? (
                              <button
                                type="button"
                                className="admin-refresh-btn"
                                style={{
                                  backgroundColor: "#111827",
                                  color: "#fff",
                                  border: "none",
                                }}
                                onClick={() => handleRollback(item)}
                              >
                                Rollback
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="admin-chart-empty" style={{ marginTop: 16 }}>
            No resumes found for{" "}
            {selectedStatusKey === "submitted"
              ? "Resumes Submitted"
              : formatStatusLabel(selectedStatusKey)}
            .
          </p>
        )}
      </div>

      {actionModalItem && actionTarget ? (
        <div
          className="admin-modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={closeActionModal}
        >
          <div
            className="admin-modal-card"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: 10 }}>
              Move to {formatStatusLabel(actionTarget)}
            </h3>
            <div style={{ marginBottom: 12 }}>
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
                <div style={{ marginBottom: 10 }}>
                  <label
                    style={{
                      display: "block",
                      fontWeight: 600,
                      marginBottom: 4,
                    }}
                  >
                    Tentative joining date
                  </label>
                  <input
                    type="date"
                    value={actionJoiningDate}
                    onChange={(event) => setActionJoiningDate(event.target.value)}
                    disabled={actionSubmitting}
                    style={{
                      width: "100%",
                      padding: 8,
                      borderRadius: 4,
                      border: "1px solid #ccc",
                    }}
                  />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label
                    style={{
                      display: "block",
                      fontWeight: 600,
                      marginBottom: 4,
                    }}
                  >
                    Selection note (optional)
                  </label>
                  <textarea
                    rows={3}
                    value={actionReason}
                    onChange={(event) => setActionReason(event.target.value)}
                    placeholder="Enter selection note..."
                    disabled={actionSubmitting}
                    style={{
                      width: "100%",
                      padding: 8,
                      borderRadius: 4,
                      border: "1px solid #ccc",
                      fontFamily: "inherit",
                    }}
                  />
                </div>
              </>
            ) : actionTarget === "joined" ? (
              <div style={{ marginBottom: 10 }}>
                <label
                  style={{
                    display: "block",
                    fontWeight: 600,
                    marginBottom: 4,
                  }}
                >
                  Joining note (optional)
                </label>
                <textarea
                  rows={3}
                  value={actionJoiningNote}
                  onChange={(event) => setActionJoiningNote(event.target.value)}
                  placeholder="Enter joining note..."
                  disabled={actionSubmitting}
                  style={{
                    width: "100%",
                    padding: 8,
                    borderRadius: 4,
                    border: "1px solid #ccc",
                    fontFamily: "inherit",
                  }}
                />
              </div>
            ) : ["rejected", "dropout", "left", "verified", "walk_in", "shortlisted", "billed"].includes(
                actionTarget,
              ) ? (
              <div style={{ marginBottom: 10 }}>
                <label
                  style={{
                    display: "block",
                    fontWeight: 600,
                    marginBottom: 4,
                  }}
                >
                  Note (optional)
                </label>
                <textarea
                  rows={4}
                  value={actionReason}
                  onChange={(event) => setActionReason(event.target.value)}
                  placeholder="Enter note..."
                  disabled={actionSubmitting}
                  style={{
                    width: "100%",
                    padding: 8,
                    borderRadius: 4,
                    border: "1px solid #ccc",
                    fontFamily: "inherit",
                  }}
                />
              </div>
            ) : null}

            {actionError ? (
              <div
                className="admin-alert admin-alert-error"
                style={{ marginBottom: 10 }}
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
                onClick={handleAdvanceStatus}
                disabled={
                  actionSubmitting ||
                  (actionTarget === "selected" && !actionJoiningDate.trim())
                }
              >
                {actionSubmitting
                  ? "Updating..."
                  : `Confirm ${formatStatusLabel(actionTarget)}`}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
