import { useEffect, useState, useMemo } from "react";
import { fetchEmployeeLeaderboard } from "../../services/performanceService";

export default function EmployeeRankingWidget({ currentRecruiterRid }) {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadRankings = async (isBackground = false) => {
      if (!isBackground) setLoading(true);
      setError("");
      try {
        const data = await fetchEmployeeLeaderboard();
        if (isMounted) {
          setRankings(Array.isArray(data.rankings) ? data.rankings : []);
        }
      } catch (err) {
        if (isMounted && !isBackground) {
          setError(err.message || "Failed to load employee rankings.");
        }
      } finally {
        if (isMounted && !isBackground) setLoading(false);
      }
    };

    // Initial fetch
    loadRankings(false);

    // 8-second real-time polling interval
    const intervalId = setInterval(() => {
      loadRankings(true);
    }, 8000);

    // Trigger update on tab focus or visibility change
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
  }, []);

  const filteredRankings = useMemo(() => {
    if (!searchQuery.trim()) return rankings;
    const query = searchQuery.toLowerCase().trim();
    return rankings.filter(
      (emp) =>
        (emp.name && emp.name.toLowerCase().includes(query)) ||
        (emp.email && emp.email.toLowerCase().includes(query))
    );
  }, [rankings, searchQuery]);

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
              All-Time Joined Candidates ({rankings.length} Total Employees)
            </p>
          </div>
        </div>
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
          {searchQuery ? "No employees match your search." : "No ranking data available yet."}
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
