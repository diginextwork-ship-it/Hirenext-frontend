import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "./AdminLayout";
import { API_BASE_URL, getAdminHeaders, readJsonResponse } from "./adminApi";
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

export default function AdminPerformance({ setCurrentPage }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(TABS.OVERVIEW);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("submitted");
  const [sortDir, setSortDir] = useState("desc");

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
              <span className="perf-stat-label">Team Leaders</span>
              <span className="perf-stat-value">
                {summary.totalTeamLeaders ?? 0}
              </span>
            </div>
            <div className="perf-stat-card">
              <span className="perf-stat-label">Recruiters</span>
              <span className="perf-stat-value">
                {summary.totalRecruiters ?? 0}
              </span>
            </div>
            <div className="perf-stat-card">
              <span className="perf-stat-label">Jobs Created</span>
              <span className="perf-stat-value">
                {summary.totalJobsCreated ?? 0}
              </span>
            </div>
            <div className="perf-stat-card">
              <span className="perf-stat-label">Open Positions</span>
              <span className="perf-stat-value">
                {summary.totalPositions ?? 0}
              </span>
            </div>
            <div className="perf-stat-card">
              <span className="perf-stat-label">Resumes Submitted</span>
              <span className="perf-stat-value">
                {summary.totalSubmitted ?? 0}
              </span>
            </div>
            <div className="perf-stat-card">
              <span className="perf-stat-label">Verified</span>
              <span className="perf-stat-value">
                {summary.totalVerified ?? 0}
              </span>
            </div>
            <div className="perf-stat-card">
              <span className="perf-stat-label">Selected</span>
              <span className="perf-stat-value">
                {summary.totalSelected ?? 0}
              </span>
            </div>
            <div className="perf-stat-card">
              <span className="perf-stat-label">Joined</span>
              <span className="perf-stat-value">
                {summary.totalJoined ?? 0}
              </span>
            </div>
            <div className="perf-stat-card">
              <span className="perf-stat-label">Dropout</span>
              <span className="perf-stat-value">
                {summary.totalDropout ?? 0}
              </span>
            </div>
            <div className="perf-stat-card">
              <span className="perf-stat-label">Rejected</span>
              <span className="perf-stat-value">
                {summary.totalRejected ?? 0}
              </span>
            </div>
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
                      <th>Joined</th>
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
                        <td>{r.joined}</td>
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
                    <th>Verification %</th>
                    <th>Selection %</th>
                    <th>Joining %</th>
                    <th>Dropout %</th>
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
                      <td>{r.joined}</td>
                      <td>{r.dropout}</td>
                      <td>{r.on_hold}</td>
                      <td>{r.points}</td>
                      <td>{r.verificationRate}%</td>
                      <td>{r.selectionRate}%</td>
                      <td>{r.joiningRate}%</td>
                      <td>{r.dropoutRate}%</td>
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
    </AdminLayout>
  );
}
