import { useEffect, useState, useMemo } from "react";
import { fetchEmployeeLeaderboard } from "../../services/performanceService";
import "../../styles/performance-dashboard.css";

const FILTER_PRESETS = {
  ALL_TIME: "all_time",
  TODAY: "today",
  THIS_MONTH: "this_month",
  LAST_MONTH: "last_month",
  CUSTOM: "custom",
};

function toDateStr(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPresetDates(preset) {
  const now = new Date();
  switch (preset) {
    case FILTER_PRESETS.TODAY: {
      const todayStr = toDateStr(now);
      return { startDate: todayStr, endDate: todayStr };
    }
    case FILTER_PRESETS.THIS_MONTH: {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: toDateStr(first), endDate: toDateStr(now) };
    }
    case FILTER_PRESETS.LAST_MONTH: {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { startDate: toDateStr(first), endDate: toDateStr(last) };
    }
    case FILTER_PRESETS.ALL_TIME:
    default:
      return { startDate: null, endDate: null };
  }
}

function getSixMonthsAgoStr() {
  const d = new Date();
  d.setMonth(d.getMonth() - 6);
  return toDateStr(d);
}

export default function EmployeeRankingWidget({
  currentRecruiterRid,
  team: controlledTeam,
  onSelectTeam,
  layout = "horizontal",
  activeRecruiterRids,
}) {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [internalTeam, setInternalTeam] = useState("all");

  const activeTeam = controlledTeam !== undefined ? controlledTeam : internalTeam;

  const handleTeamClick = (selectedTeamKey) => {
    if (onSelectTeam) {
      onSelectTeam(selectedTeamKey);
    }
    setInternalTeam(selectedTeamKey);
  };

  const [filterPreset, setFilterPreset] = useState(FILTER_PRESETS.ALL_TIME);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const [showRecruiterModal, setShowRecruiterModal] = useState(false);
  const [modalTeamFilter, setModalTeamFilter] = useState("all");
  const [modalSearchQuery, setModalSearchQuery] = useState("");

  useEffect(() => {
    if (!showRecruiterModal) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setShowRecruiterModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showRecruiterModal]);

  const activeDateParams = useMemo(() => {
    if (filterPreset === FILTER_PRESETS.CUSTOM) {
      if (customStart && customEnd && customStart <= customEnd) {
        return { startDate: customStart, endDate: customEnd };
      }
      return null;
    }
    return getPresetDates(filterPreset);
  }, [filterPreset, customStart, customEnd]);

  const handlePresetClick = (presetKey) => {
    setFilterPreset(presetKey);
    if (presetKey === FILTER_PRESETS.CUSTOM && (!customStart || !customEnd)) {
      const now = new Date();
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      setCustomStart(toDateStr(monthAgo));
      setCustomEnd(toDateStr(now));
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadRankings = async (isBackground = false) => {
      if (filterPreset === FILTER_PRESETS.CUSTOM && !activeDateParams) {
        return;
      }

      if (!isBackground) setLoading(true);
      setError("");
      try {
        const params = {
          ...(activeDateParams?.startDate && activeDateParams?.endDate
            ? {
                startDate: activeDateParams.startDate,
                endDate: activeDateParams.endDate,
              }
            : {}),
        };
        const data = await fetchEmployeeLeaderboard(params);
        if (isMounted) {
          setRankings(Array.isArray(data?.rankings) ? data.rankings : []);
        }
      } catch (err) {
        if (isMounted && !isBackground) {
          setError(err.message || "Failed to load employee rankings.");
        }
      } finally {
        if (isMounted && !isBackground) setLoading(false);
      }
    };

    loadRankings(false);

    // 8-second real-time polling interval
    const intervalId = setInterval(() => {
      loadRankings(true);
    }, 8000);

    const handleFocus = () => loadRankings(true);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);
    window.addEventListener("hirenext:leaderboard_refresh", handleFocus);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
      window.removeEventListener("hirenext:leaderboard_refresh", handleFocus);
    };
  }, [activeDateParams, filterPreset]);

  // List of only active recruiters
  const activeRecruitersList = useMemo(() => {
    return rankings.filter((emp) => {
      const status = String(emp.accountStatus || "").toLowerCase().trim();
      if (status === "inactive" || status === "disabled" || status === "deactivated" || status === "blocked") {
        return false;
      }
      if (activeRecruiterRids && activeRecruiterRids.size > 0) {
        return activeRecruiterRids.has(String(emp.rid || "").trim());
      }
      return true;
    });
  }, [rankings, activeRecruiterRids]);

  // Team counts across active recruiters
  const teamCounts = useMemo(() => {
    let bpo = 0;
    let nbfc = 0;
    for (const emp of activeRecruitersList) {
      const t = String(emp.team || "").toLowerCase();
      if (t.includes("nbfc")) {
        nbfc += 1;
      } else {
        bpo += 1;
      }
    }
    return { all: activeRecruitersList.length, bpo, nbfc };
  }, [activeRecruitersList]);

  // Filter rankings by selected team and search query
  const filteredRankings = useMemo(() => {
    return activeRecruitersList.filter((emp) => {
      if (activeTeam && activeTeam !== "all") {
        const empTeam = String(emp.team || "Team BPO").toLowerCase();
        if (activeTeam === "Team NBFC" && !empTeam.includes("nbfc")) return false;
        if (activeTeam === "Team BPO" && empTeam.includes("nbfc")) return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const name = String(emp.name || "").toLowerCase();
        const rid = String(emp.rid || "").toLowerCase();
        return name.includes(query) || rid.includes(query);
      }
      return true;
    });
  }, [activeRecruitersList, activeTeam, searchQuery]);

  const dynamicSubtitle = useMemo(() => {
    const total = filteredRankings.length;
    const teamSuffix =
      activeTeam && activeTeam !== "all" ? ` in ${activeTeam}` : "";

    switch (filterPreset) {
      case FILTER_PRESETS.TODAY:
        return `Today's Joined Candidates (${total} Employee${total === 1 ? "" : "s"}${teamSuffix})`;
      case FILTER_PRESETS.THIS_MONTH:
        return `This Month's Joined Candidates (${total} Employee${total === 1 ? "" : "s"}${teamSuffix})`;
      case FILTER_PRESETS.LAST_MONTH:
        return `Last Month's Joined Candidates (${total} Employee${total === 1 ? "" : "s"}${teamSuffix})`;
      case FILTER_PRESETS.CUSTOM: {
        if (activeDateParams?.startDate && activeDateParams?.endDate) {
          return `Joined: ${activeDateParams.startDate} to ${activeDateParams.endDate} (${total} Employee${total === 1 ? "" : "s"}${teamSuffix})`;
        }
        return `Select custom date range (${total} Employee${total === 1 ? "" : "s"}${teamSuffix})`;
      }
      case FILTER_PRESETS.ALL_TIME:
      default:
        return `All-Time Joined Candidates (${total} Employee${total === 1 ? "" : "s"}${teamSuffix})`;
    }
  }, [filterPreset, activeDateParams, filteredRankings.length, activeTeam]);

  // Counts of active recruiters by team
  const activeCounts = useMemo(() => {
    let bpo = 0;
    let nbfc = 0;
    activeRecruitersList.forEach((emp) => {
      const t = String(emp.team || "").toLowerCase();
      if (t.includes("nbfc")) {
        nbfc += 1;
      } else {
        bpo += 1;
      }
    });
    return { all: activeRecruitersList.length, bpo, nbfc };
  }, [activeRecruitersList]);

  // Filtered active recruiters for modal
  const filteredModalRecruiters = useMemo(() => {
    return activeRecruitersList.filter((emp) => {
      if (modalTeamFilter !== "all") {
        const empTeam = String(emp.team || "Team BPO").toLowerCase();
        if (modalTeamFilter === "Team NBFC" && !empTeam.includes("nbfc")) return false;
        if (modalTeamFilter === "Team BPO" && empTeam.includes("nbfc")) return false;
      }
      if (modalSearchQuery.trim()) {
        const q = modalSearchQuery.toLowerCase().trim();
        const name = String(emp.name || "").toLowerCase();
        const rid = String(emp.rid || "").toLowerCase();
        const email = String(emp.email || "").toLowerCase();
        const phone = String(emp.phone || "").toLowerCase();
        return name.includes(q) || rid.includes(q) || email.includes(q) || phone.includes(q);
      }
      return true;
    });
  }, [activeRecruitersList, modalTeamFilter, modalSearchQuery]);

  const getRankBadge = (rank) => {
    if (rank === 1) return <span className="rank-badge rank-badge-gold" title="1st Place">🥇 1st</span>;
    if (rank === 2) return <span className="rank-badge rank-badge-silver" title="2nd Place">🥈 2nd</span>;
    if (rank === 3) return <span className="rank-badge rank-badge-bronze" title="3rd Place">🥉 3rd</span>;
    return <span className="rank-badge rank-badge-neutral">#{rank}</span>;
  };

  const getInitials = (name) => {
    if (!name) return "E";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  const isHorizontal = layout === "horizontal";

  const top3Recruiters = useMemo(() => {
    const list = [...filteredRankings];
    list.sort(
      (a, b) =>
        (b.joined ?? 0) - (a.joined ?? 0) ||
        (b.points ?? 0) - (a.points ?? 0) ||
        String(a.name || "").localeCompare(String(b.name || "")),
    );
    return list.slice(0, 3);
  }, [filteredRankings]);

  return (
    <article
      className={`employee-ranking-card employee-ranking-card-prominent ${
        isHorizontal ? "employee-ranking-card-horizontal" : ""
      } employee-ranking-card-compact`}
    >
      {/* Header with Title and Team Switcher Tabs */}
      <div className={`employee-ranking-head ${isHorizontal ? "employee-ranking-head-horizontal" : ""} employee-ranking-head-compact`}>
        <div className="employee-ranking-title-wrap">
          <div className="employee-ranking-icon-box">🏆</div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h3 style={{ margin: 0 }}>Employee Ranking</h3>
              <span className="leaderboard-live-tag" title="Auto-updating in real time">
                <span className="live-dot" /> REAL-TIME
              </span>
              <button
                type="button"
                className="view-active-recruiters-btn"
                onClick={() => {
                  setModalTeamFilter(activeTeam || "all");
                  setShowRecruiterModal(true);
                }}
                title="View all current active recruiters"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span>View Recruiter</span>
                <span className="view-recruiters-count-badge">{activeRecruitersList.length}</span>
              </button>
            </div>
            <p className="employee-ranking-subtitle">
              Active Team Members ({activeRecruitersList.length} Active Employee{activeRecruitersList.length === 1 ? "" : "s"} across teams)
            </p>
          </div>
        </div>

        {/* Team Switcher Tabs */}
        <div className="employee-team-switcher" role="tablist" aria-label="Filter members by team">
          <button
            type="button"
            className={`employee-team-btn ${activeTeam === "all" ? "is-active" : ""}`}
            onClick={() => handleTeamClick("all")}
          >
            All Teams <span className="team-count-badge">{teamCounts.all}</span>
          </button>
          <button
            type="button"
            className={`employee-team-btn ${activeTeam === "Team BPO" ? "is-active" : ""}`}
            onClick={() => handleTeamClick("Team BPO")}
          >
            Team BPO <span className="team-count-badge">{teamCounts.bpo}</span>
          </button>
          <button
            type="button"
            className={`employee-team-btn ${activeTeam === "Team NBFC" ? "is-active" : ""}`}
            onClick={() => handleTeamClick("Team NBFC")}
          >
            Team NBFC <span className="team-count-badge">{teamCounts.nbfc}</span>
          </button>
        </div>
      </div>

      {/* Top 3 Recruiters Joined-Wise Section */}
      <div className="top3-recruiters-section">
        <div className="top3-recruiters-header">
          <div className="top3-recruiters-title-wrap">
            <span className="top3-flame-icon">🔥</span>
            <span className="top3-title">Top 3 Recruiters (Joined)</span>
            <span className="top3-team-label">
              {activeTeam === "all" ? "All Teams" : activeTeam}
            </span>
          </div>

          <div className="top3-timeline-pills">
            {[
              { key: FILTER_PRESETS.ALL_TIME, label: "All Time" },
              { key: FILTER_PRESETS.THIS_MONTH, label: "This Month" },
              { key: FILTER_PRESETS.TODAY, label: "Today" },
            ].map((p) => (
              <button
                key={p.key}
                type="button"
                className={`top3-timeline-btn ${filterPreset === p.key ? "is-active" : ""}`}
                onClick={() => handlePresetClick(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="top3-loading-wrap">
            <div className="employee-ranking-spinner" style={{ width: 20, height: 20 }}></div>
            <span>Loading top recruiters...</span>
          </div>
        ) : top3Recruiters.length === 0 ? (
          <div className="top3-empty-state">
            No joined candidate records found for this period.
          </div>
        ) : (
          <div className="top3-cards-grid">
            {top3Recruiters.map((recruiter, idx) => {
              const rank = idx + 1;
              const isFirst = rank === 1;
              const isSecond = rank === 2;
              const isThird = rank === 3;
              const isNbfc = String(recruiter.team || "").toLowerCase().includes("nbfc");

              return (
                <div
                  key={recruiter.rid || idx}
                  className={`top3-recruiter-card top3-card-rank-${rank}`}
                >
                  <div className="top3-card-left">
                    <div className={`top3-rank-badge top3-rank-badge-${rank}`}>
                      {isFirst ? "🥇 1st" : isSecond ? "🥈 2nd" : "🥉 3rd"}
                    </div>
                    <div className="top3-avatar-wrap">
                      <div className={`top3-avatar top3-avatar-rank-${rank}`}>
                        {getInitials(recruiter.name)}
                      </div>
                      <span className="top3-online-dot" />
                    </div>
                    <div className="top3-info">
                      <div className="top3-name" title={recruiter.name}>
                        {recruiter.name || "Unknown"}
                      </div>
                      <div className="top3-sub">
                        <span className="top3-rid">{recruiter.rid}</span>
                        <span className="top3-dot">•</span>
                        <span
                          className={`top3-team-tag ${
                            isNbfc ? "top3-team-nbfc" : "top3-team-bpo"
                          }`}
                        >
                          {recruiter.team || (isNbfc ? "Team NBFC" : "Team BPO")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="top3-card-right">
                    <div className="top3-stat-joined">
                      <span className="top3-stat-number">{recruiter.joined ?? 0}</span>
                      <span className="top3-stat-label">Joined</span>
                    </div>
                    <div
                      className="top3-stat-points"
                      title={`${recruiter.points ?? 0} total points`}
                    >
                      ⭐ {recruiter.points ?? 0} pts
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Smooth Active Recruiters Modal */}
      {showRecruiterModal && (
        <div
          className="active-recruiters-modal-backdrop"
          onClick={() => setShowRecruiterModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="active-recruiters-modal-title"
        >
          <div
            className="active-recruiters-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="active-recruiters-modal-head">
              <div className="active-recruiters-modal-title-wrap">
                <div className="active-recruiters-icon-badge">
                  👥
                </div>
                <div>
                  <h3 id="active-recruiters-modal-title" className="active-recruiters-modal-title">
                    <span>Current Active Recruiters</span>
                    <span className="active-recruiters-live-badge">
                      <span className="active-recruiters-live-dot" />
                      {activeRecruitersList.length} Active
                    </span>
                  </h3>
                  <p className="active-recruiters-modal-sub">
                    Viewing verified active recruiters and team leaders currently working on HireNext
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="active-recruiters-modal-close"
                onClick={() => setShowRecruiterModal(false)}
                aria-label="Close active recruiters modal"
                title="Close (Esc)"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="active-recruiters-modal-body">
              {/* Toolbar: Search and Team Filter Pills */}
              <div className="active-recruiters-toolbar">
                <div className="active-recruiters-search-wrap">
                  <svg
                    className="active-recruiters-search-icon"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    className="active-recruiters-search-input"
                    placeholder="Search by name, ID, email, or phone..."
                    value={modalSearchQuery}
                    onChange={(e) => setModalSearchQuery(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="active-recruiters-team-pills">
                  <button
                    type="button"
                    className={`active-recruiters-team-btn ${modalTeamFilter === "all" ? "is-active" : ""}`}
                    onClick={() => setModalTeamFilter("all")}
                  >
                    All ({activeCounts.all})
                  </button>
                  <button
                    type="button"
                    className={`active-recruiters-team-btn ${modalTeamFilter === "Team BPO" ? "is-active" : ""}`}
                    onClick={() => setModalTeamFilter("Team BPO")}
                  >
                    Team BPO ({activeCounts.bpo})
                  </button>
                  <button
                    type="button"
                    className={`active-recruiters-team-btn ${modalTeamFilter === "Team NBFC" ? "is-active" : ""}`}
                    onClick={() => setModalTeamFilter("Team NBFC")}
                  >
                    Team NBFC ({activeCounts.nbfc})
                  </button>
                </div>
              </div>

              {/* Timeline Preset Filter Bar in Modal */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
                <div className="employee-ranking-presets" style={{ margin: 0 }}>
                  {[
                    { key: FILTER_PRESETS.ALL_TIME, label: "All Time" },
                    { key: FILTER_PRESETS.TODAY, label: "Today" },
                    { key: FILTER_PRESETS.THIS_MONTH, label: "This Month" },
                    { key: FILTER_PRESETS.LAST_MONTH, label: "Last Month" },
                    { key: FILTER_PRESETS.CUSTOM, label: "Custom" },
                  ].map((preset) => (
                    <button
                      key={preset.key}
                      type="button"
                      className={`employee-ranking-filter-btn ${
                        filterPreset === preset.key ? "is-active" : ""
                      }`}
                      onClick={() => handlePresetClick(preset.key)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {filterPreset === FILTER_PRESETS.CUSTOM ? (
                  <div className="employee-ranking-custom-range" style={{ margin: 0 }}>
                    <label className="employee-ranking-date-label">
                      <span>From:</span>
                      <input
                        type="date"
                        className="employee-ranking-date-input"
                        value={customStart}
                        min={getSixMonthsAgoStr()}
                        max={customEnd || toDateStr(new Date())}
                        onChange={(e) => setCustomStart(e.target.value)}
                      />
                    </label>
                    <label className="employee-ranking-date-label">
                      <span>To:</span>
                      <input
                        type="date"
                        className="employee-ranking-date-input"
                        value={customEnd}
                        min={customStart || getSixMonthsAgoStr()}
                        max={toDateStr(new Date())}
                        onChange={(e) => setCustomEnd(e.target.value)}
                      />
                    </label>
                  </div>
                ) : null}
              </div>

              {/* Grid of Active Recruiters */}
              {loading ? (
                <div style={{ textAlign: "center", padding: "40px 16px", color: "#64748b" }}>
                  <div className="employee-ranking-spinner" style={{ margin: "0 auto 12px" }}></div>
                  <p style={{ margin: 0, fontSize: "0.95rem" }}>Updating member stats...</p>
                </div>
              ) : filteredModalRecruiters.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 16px", color: "#64748b" }}>
                  <p style={{ margin: 0, fontSize: "0.95rem" }}>
                    No active recruiters found matching "{modalSearchQuery}".
                  </p>
                </div>
              ) : (
                <div className="active-recruiters-grid">
                  {filteredModalRecruiters.map((recruiter, idx) => {
                    const isNbfc = String(recruiter.team || "").toLowerCase().includes("nbfc");
                    const roleLabel =
                      String(recruiter.role || "").toLowerCase().includes("leader")
                        ? "Team Leader"
                        : "Recruiter";

                    return (
                      <div key={recruiter.rid} className="active-recruiter-card">
                        <div className="active-recruiter-head">
                          <div className="active-recruiter-avatar-wrap">
                            {getInitials(recruiter.name)}
                            <span className="active-recruiter-online-dot" title="Active Account" />
                          </div>
                          <div className="active-recruiter-info">
                            <div className="active-recruiter-name" title={recruiter.name}>
                              {recruiter.name || "Unnamed"}
                            </div>
                            <div className="active-recruiter-rid">{recruiter.rid}</div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {getRankBadge(idx + 1)}
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                color: "#16a34a",
                                background: "#f0fdf4",
                                padding: "2px 8px",
                                borderRadius: "9999px",
                                border: "1px solid #bbf7d0",
                              }}
                            >
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />
                              Active
                            </span>
                          </div>
                        </div>

                        <div className="active-recruiter-badges">
                          <span
                            className={`active-recruiter-team-badge ${
                              isNbfc ? "active-recruiter-team-nbfc" : "active-recruiter-team-bpo"
                            }`}
                          >
                            {recruiter.team || (isNbfc ? "Team NBFC" : "Team BPO")}
                          </span>
                          <span className="active-recruiter-role-badge">{roleLabel}</span>
                        </div>

                        {(recruiter.email || recruiter.phone) && (
                          <div className="active-recruiter-meta">
                            {recruiter.email && (
                              <div className="active-recruiter-meta-item" title={recruiter.email}>
                                <span>✉</span>
                                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {recruiter.email}
                                </span>
                              </div>
                            )}
                            {recruiter.phone && (
                              <div className="active-recruiter-meta-item">
                                <span>📞</span>
                                <span>{recruiter.phone}</span>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="active-recruiter-stats">
                          <span style={{ color: "#64748b" }}>
                            Joined:{" "}
                            <strong className="active-recruiter-stat-pill">
                              {recruiter.joined ?? 0}
                            </strong>
                          </span>
                          <span style={{ color: "#64748b" }}>
                            Points:{" "}
                            <strong className="active-recruiter-stat-pill">
                              {recruiter.points ?? 0}
                            </strong>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="active-recruiters-modal-foot">
              <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
                Showing {filteredModalRecruiters.length} of {activeRecruitersList.length} active members
              </span>
              <button
                type="button"
                className="active-recruiters-close-btn"
                onClick={() => setShowRecruiterModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
