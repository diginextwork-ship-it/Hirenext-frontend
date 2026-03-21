import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "./AdminLayout";
import {
  API_BASE_URL,
  getAdminHeaders,
  readJsonResponse,
  adminAdvanceStatus,
  adminDeleteRecruiter,
} from "./adminApi";
import { getAuthSession } from "../../auth/session";
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
  { key: "verified", label: "Verified", summaryKey: "totalVerified" },
  { key: "walk_in", label: "Walk In", summaryKey: "totalWalkIn" },
  { key: "selected", label: "Selected", summaryKey: "totalSelected" },
  {
    key: "pending_joining",
    label: "Pending Joining",
    summaryKey: "totalSelected",
    color: "#2563eb",
  },
  { key: "joined", label: "Joined", summaryKey: "totalJoined" },
  {
    key: "dropout",
    label: "Dropout",
    summaryKey: "totalDropout",
    color: "#b45309",
  },
  { key: "rejected", label: "Rejected", summaryKey: "totalRejected" },
  {
    key: "billed",
    label: "Billed",
    summaryKey: "totalBilled",
    color: "#166534",
  },
  { key: "left", label: "Left", summaryKey: "totalLeft", color: "#9a3412" },
];

const ADMIN_ACTIONS_BY_STATUS = {
  walk_in: [
    { value: "selected", label: "Selected", color: "#0f766e" },
    { value: "rejected", label: "Reject", color: "#dc2626" },
  ],
  selected: [
    { value: "joined", label: "Joined", color: "#16a34a" },
    { value: "dropout", label: "Dropout", color: "#b45309" },
  ],
  pending_joining: [
    { value: "joined", label: "Joined", color: "#16a34a" },
    { value: "dropout", label: "Dropout", color: "#b45309" },
  ],
  joined: [
    { value: "billed", label: "Billed", color: "#0f766e" },
    { value: "left", label: "Left", color: "#9a3412" },
  ],
};

function toDateStr(d) {
  return d.toISOString().slice(0, 10);
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
  return normalized
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function AdminPerformance({ setCurrentPage }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(TABS.OVERVIEW);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("submitted");
  const [sortDir, setSortDir] = useState("desc");
  const [selectedStatusKey, setSelectedStatusKey] = useState("verified");

  // Admin status action modal state
  const [actionModalItem, setActionModalItem] = useState(null);
  const [actionTarget, setActionTarget] = useState("");
  const [actionReason, setActionReason] = useState("");
  const [actionJoiningDate, setActionJoiningDate] = useState("");
  const [actionJoiningNote, setActionJoiningNote] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteDeleting, setDeleteDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Timeline filter state
  const [timelinePreset, setTimelinePreset] = useState(PRESETS.TODAY);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

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

  const summary = data?.summary || {};
  const drilldownKey =
    selectedStatusKey === "pending_joining" ? "selected" : selectedStatusKey;
  const selectedStatusItems =
    data?.statusDrilldown?.[drilldownKey] &&
    Array.isArray(data.statusDrilldown[drilldownKey])
      ? data.statusDrilldown[drilldownKey]
      : [];

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

  const handleAdminAdvanceStatus = async () => {
    if (!actionModalItem || !actionTarget) return;
    const needsReason = actionTarget !== "joined";
    if (needsReason && !actionReason.trim()) {
      setActionError("Please provide a reason.");
      return;
    }
    setActionSubmitting(true);
    setActionError("");
    try {
      await adminAdvanceStatus(actionModalItem.resId, {
        status: actionTarget,
        reason: actionReason.trim() || undefined,
        ...(actionTarget === "joined" && actionJoiningDate
          ? { joining_date: actionJoiningDate }
          : {}),
        ...(actionTarget === "joined" && actionJoiningNote.trim()
          ? { joining_note: actionJoiningNote.trim() }
          : {}),
      });
      closeActionModal();
      fetchPerformance();
    } catch (err) {
      setActionError(err.message || "Failed to advance status.");
    } finally {
      setActionSubmitting(false);
    }
  };

  const availableActions = ADMIN_ACTIONS_BY_STATUS[selectedStatusKey] || [];

  const openDeleteModal = (item) => {
    setDeleteTarget(item);
    setDeleteError("");
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
            <div className="perf-stat-card">
              <span className="perf-stat-label">Resumes Submitted</span>
              <span className="perf-stat-value">
                {summary.totalSubmitted ?? 0}
              </span>
            </div>
            {STATUS_CARDS.map((card) => (
              <button
                key={card.key}
                type="button"
                className="perf-stat-card"
                onClick={() => setSelectedStatusKey(card.key)}
                style={{
                  textAlign: "left",
                  border:
                    selectedStatusKey === card.key
                      ? "2px solid #0f766e"
                      : undefined,
                }}
              >
                <span className="perf-stat-label">{card.label}</span>
                <span
                  className="perf-stat-value"
                  style={card.color ? { color: card.color } : undefined}
                >
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
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <h3 className="perf-section-title" style={{ marginBottom: 0 }}>
                {formatStatusLabel(selectedStatusKey)} Resume List
              </h3>
              <span className="admin-muted">
                {selectedStatusItems.length} item
                {selectedStatusItems.length === 1 ? "" : "s"}
              </span>
            </div>
            {selectedStatusItems.length > 0 ? (
              <div className="admin-table-wrap" style={{ marginTop: "16px" }}>
                <table className="admin-table admin-table-wide">
                  <thead>
                    <tr>
                      <th>Recruiter</th>
                      <th>Team Leader</th>
                      <th>Job ID</th>
                      <th>Resume File</th>
                      <th>Status</th>
                      {selectedStatusKey === "pending_joining" && (
                        <th>Expected Joining Date</th>
                      )}
                      {availableActions.length > 0 && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedStatusItems.map((item) => (
                      <tr key={`${selectedStatusKey}-${item.resId}`}>
                        <td>
                          <strong>{item.recruiterName || "N/A"}</strong>
                          <div className="admin-muted">
                            {item.recruiterRid || "N/A"}
                          </div>
                        </td>
                        <td>{item.teamLeaderName || "N/A"}</td>
                        <td>{item.jobJid ?? "N/A"}</td>
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
                        {selectedStatusKey === "pending_joining" && (
                          <td>
                            {item.joiningDate
                              ? new Date(
                                  item.joiningDate + "T00:00:00",
                                ).toLocaleDateString()
                              : "Not set"}
                          </td>
                        )}
                        {availableActions.length > 0 && (
                          <td>
                            <div
                              style={{
                                display: "flex",
                                gap: "6px",
                                flexWrap: "wrap",
                              }}
                            >
                              {availableActions.map((action) => (
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
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="admin-chart-empty" style={{ marginTop: "16px" }}>
                No resumes found for {formatStatusLabel(selectedStatusKey)}.
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
                      <th>Selected</th>
                      <th>Pending Joining</th>
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
                        <td>{r.selected}</td>
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
              placeholder="Search by name, email, or RID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {filteredTLs.length > 0 ? (
            <div className="admin-table-wrap">
              <table className="admin-table admin-table-wide">
                <thead>
                  <tr>
                    <th>RID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Jobs Created</th>
                    <th>Open Jobs</th>
                    <th>Restricted Jobs</th>
                    <th>Total Positions</th>
                    <th>Points</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTLs.map((tl) => (
                    <tr key={tl.rid}>
                      <td>{tl.rid}</td>
                      <td>{tl.name}</td>
                      <td>{tl.email}</td>
                      <td>{tl.jobsCreated}</td>
                      <td>{tl.openJobs}</td>
                      <td>{tl.restrictedJobs}</td>
                      <td>{tl.totalPositions}</td>
                      <td>{tl.points}</td>
                      <td>
                        <button
                          type="button"
                          className="admin-back-btn"
                          style={{
                            backgroundColor: "#dc2626",
                            color: "#fff",
                            border: "none",
                          }}
                          onClick={() =>
                            openDeleteModal({
                              rid: tl.rid,
                              name: tl.name,
                              email: tl.email,
                              role: "Team Leader",
                            })
                          }
                        >
                          Delete
                        </button>
                      </td>
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
              placeholder="Search by name, email, or RID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {filteredRecruiters.length > 0 ? (
            <div className="admin-table-wrap">
              <table className="admin-table admin-table-wide">
                <thead>
                  <tr>
                    <th>RID</th>
                    <th
                      className="perf-sortable"
                      onClick={() => handleSort("name")}
                    >
                      Name{sortIndicator("name")}
                    </th>
                    <th
                      className="perf-sortable"
                      onClick={() => handleSort("submitted")}
                    >
                      Submitted{sortIndicator("submitted")}
                    </th>
                    <th
                      className="perf-sortable"
                      onClick={() => handleSort("verified")}
                    >
                      Verified{sortIndicator("verified")}
                    </th>
                    <th
                      className="perf-sortable"
                      onClick={() => handleSort("walk_in")}
                    >
                      Walk-in{sortIndicator("walk_in")}
                    </th>
                    <th
                      className="perf-sortable"
                      onClick={() => handleSort("selected")}
                    >
                      Selected{sortIndicator("selected")}
                    </th>
                    <th
                      className="perf-sortable"
                      onClick={() => handleSort("rejected")}
                    >
                      Rejected{sortIndicator("rejected")}
                    </th>
                    <th>Pending Joining</th>
                    <th
                      className="perf-sortable"
                      onClick={() => handleSort("joined")}
                    >
                      Joined{sortIndicator("joined")}
                    </th>
                    <th
                      className="perf-sortable"
                      onClick={() => handleSort("dropout")}
                    >
                      Dropout{sortIndicator("dropout")}
                    </th>
                    <th
                      className="perf-sortable"
                      onClick={() => handleSort("billed")}
                    >
                      Billed{sortIndicator("billed")}
                    </th>
                    <th
                      className="perf-sortable"
                      onClick={() => handleSort("left")}
                    >
                      Left{sortIndicator("left")}
                    </th>
                    <th
                      className="perf-sortable"
                      onClick={() => handleSort("on_hold")}
                    >
                      On Hold{sortIndicator("on_hold")}
                    </th>
                    <th
                      className="perf-sortable"
                      onClick={() => handleSort("points")}
                    >
                      Points{sortIndicator("points")}
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecruiters.map((r) => (
                    <tr key={r.rid}>
                      <td>{r.rid}</td>
                      <td>{r.name}</td>
                      <td>{r.submitted}</td>
                      <td>{r.verified}</td>
                      <td>{r.walk_in}</td>
                      <td>{r.selected}</td>
                      <td>{r.rejected}</td>
                      <td>{r.selected}</td>
                      <td>{r.joined}</td>
                      <td>{r.dropout}</td>
                      <td>{r.billed ?? 0}</td>
                      <td>{r.left ?? 0}</td>
                      <td>{r.on_hold}</td>
                      <td>{r.points}</td>
                      <td>
                        <button
                          type="button"
                          className="admin-back-btn"
                          style={{
                            backgroundColor: "#dc2626",
                            color: "#fff",
                            border: "none",
                          }}
                          onClick={() =>
                            openDeleteModal({
                              rid: r.rid,
                              name: r.name,
                              email: r.email,
                              role: "Recruiter",
                            })
                          }
                        >
                          Delete
                        </button>
                      </td>
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
                {formatStatusLabel(selectedStatusKey)}
              </p>
            </div>

            {actionTarget === "joined" ? (
              <>
                <div style={{ marginBottom: "10px" }}>
                  <label
                    style={{
                      display: "block",
                      fontWeight: 600,
                      marginBottom: "4px",
                    }}
                  >
                    Joining Date (optional)
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
                <div style={{ marginBottom: "10px" }}>
                  <label
                    style={{
                      display: "block",
                      fontWeight: 600,
                      marginBottom: "4px",
                    }}
                  >
                    Reason (optional)
                  </label>
                  <textarea
                    rows={3}
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
                    ? "Rejection Reason"
                    : actionTarget === "dropout"
                      ? "Dropout Reason"
                      : actionTarget === "left"
                        ? "Reason for Leaving"
                        : "Reason"}
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
                  (actionTarget !== "joined" && !actionReason.trim())
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
    </AdminLayout>
  );
}
