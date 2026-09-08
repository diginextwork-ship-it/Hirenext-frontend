import { useEffect, useState, useMemo } from "react";
import { fetchEmployeeLeaderboard } from "../../services/performanceService";

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

export default function EmployeeRankingWidget({ currentRecruiterRid }) {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [filterPreset, setFilterPreset] = useState(FILTER_PRESETS.ALL_TIME);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

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
        const params =
          activeDateParams?.startDate && activeDateParams?.endDate
            ? {
                startDate: activeDateParams.startDate,
                endDate: activeDateParams.endDate,
              }
            : {};
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

  const filteredRankings = useMemo(() => {
    if (!searchQuery.trim()) return rankings;
    const query = searchQuery.toLowerCase().trim();
    return rankings.filter(
      (emp) =>
        (emp.name && emp.name.toLowerCase().includes(query)) ||
        (emp.email && emp.email.toLowerCase().includes(query))
    );
  }, [rankings, searchQuery]);

  const dynamicSubtitle = useMemo(() => {
    const count = rankings.length;
    switch (filterPreset) {
      case FILTER_PRESETS.TODAY:
        return `Today's Joined Candidates (${count} Employees)`;
      case FILTER_PRESETS.THIS_MONTH:
        return `This Month's Joined Candidates (${count} Employees)`;
      case FILTER_PRESETS.LAST_MONTH:
        return `Last Month's Joined Candidates (${count} Employees)`;
      case FILTER_PRESETS.CUSTOM: {
        if (activeDateParams?.startDate && activeDateParams?.endDate) {
          return `Joined: ${activeDateParams.startDate} to ${activeDateParams.endDate} (${count} Employees)`;
        }
        return `Select custom date range (${count} Employees)`;
      }
      case FILTER_PRESETS.ALL_TIME:
      default:
        return `All-Time Joined Candidates (${count} Total Employees)`;
    }
  }, [filterPreset, activeDateParams, rankings.length]);

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

  return (
    <article className="employee-ranking-card employee-ranking-card-prominent">
      <div className="employee-ranking-head">
        <div className="employee-ranking-title-wrap">
          <div className="employee-ranking-icon-box">🏆</div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h3 style={{ margin: 0 }}>Employee Ranking</h3>
              <span className="leaderboard-live-tag" title="Auto-updating in real time">
                <span className="live-dot" /> REAL-TIME
              </span>
            </div>
            <p className="employee-ranking-subtitle">
              {dynamicSubtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="employee-ranking-filter-bar">
        <div className="employee-ranking-presets">
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
          <div className="employee-ranking-custom-range">
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

      {rankings.length > 5 ? (
        <div className="employee-ranking-search-box">
          <input
            type="text"
            className="employee-ranking-search-input"
            placeholder="Search employee by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery ? (
            <button
              type="button"
              className="employee-ranking-search-clear"
              onClick={() => setSearchQuery("")}
            >
              ✕
            </button>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <div className="employee-ranking-loading">
          <div className="employee-ranking-spinner"></div>
          <p>Loading employee leaderboard...</p>
        </div>
      ) : error ? (
        <p className="job-message job-message-error">{error}</p>
      ) : filteredRankings.length === 0 ? (
        <p className="chart-empty">
          {searchQuery
            ? "No employees match your search."
            : "No ranking data available for this timeframe."}
        </p>
      ) : (
        <div className="employee-ranking-list-wrap">
          <ul className="employee-ranking-list">
            {filteredRankings.map((emp) => {
              const isCurrentRecruiter =
                currentRecruiterRid &&
                String(emp.rid).trim() === String(currentRecruiterRid).trim();

              return (
                <li
                  key={emp.rid || emp.rank}
                  className={`employee-ranking-item ${
                    isCurrentRecruiter ? "is-current-user" : ""
                  } ${emp.rank <= 3 ? "is-top-three" : ""}`}
                >
                  <div className="employee-ranking-rank-col">
                    {getRankBadge(emp.rank)}
                  </div>

                  <div className="employee-ranking-avatar">
                    {getInitials(emp.name)}
                  </div>

                  <div className="employee-ranking-info">
                    <span className="employee-ranking-name">
                      {emp.name || "Employee"}
                    </span>
                    {isCurrentRecruiter ? (
                      <span className="current-user-tag">YOU</span>
                    ) : null}
                  </div>

                  <div className="employee-ranking-stat">
                    <strong className="stat-count">{emp.joined}</strong>
                    <span className="stat-label">
                      joined
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </article>
  );
}
