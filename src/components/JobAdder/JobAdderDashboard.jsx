import { useEffect, useState } from "react";
import { fetchTeamLeaderDashboard } from "../../services/performanceService";
import DashboardOverview from "./DashboardOverview";
import RecruiterPerformanceTable from "./RecruiterPerformanceTable";
import ResumeStatusManager from "./ResumeStatusManager";

export default function TeamLeaderDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [overviewData, setOverviewData] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [overviewError, setOverviewError] = useState("");
  const [performanceRefreshKey, setPerformanceRefreshKey] = useState(0);

  const loadOverview = async () => {
    setLoadingOverview(true);
    setOverviewError("");
    try {
      const data = await fetchTeamLeaderDashboard();
      setOverviewData(data);
    } catch (error) {
      setOverviewError(error.message || "Failed to load team leader overview.");
    } finally {
      setLoadingOverview(false);
    }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoadingOverview(true);
      setOverviewError("");
      try {
        const data = await fetchTeamLeaderDashboard();
        if (!active) return;
        setOverviewData(data);
      } catch (error) {
        if (!active) return;
        setOverviewError(
          error.message || "Failed to load team leader overview.",
        );
      } finally {
        if (active) setLoadingOverview(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="team-leader-dashboard">
      <div className="dashboard-tabs">
        <button
          type="button"
          className={activeTab === "overview" ? "active" : ""}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>
        <button
          type="button"
          className={activeTab === "performance" ? "active" : ""}
          onClick={() => setActiveTab("performance")}
        >
          Recruiter Performance
        </button>
      </div>

      {activeTab === "overview" ? (
        <>
          <div
            className="ui-row-between ui-row-wrap"
            style={{ marginBottom: 12 }}
          >
            <span />
            <button
              type="button"
              className="click-here-btn"
              onClick={loadOverview}
              disabled={loadingOverview}
            >
              {loadingOverview ? "Refreshing..." : "Refresh"}
            </button>
          </div>
          {overviewError ? (
            <p className="job-message job-message-error">{overviewError}</p>
          ) : null}
          <DashboardOverview data={overviewData} loading={loadingOverview} />
        </>
      ) : null}

      {activeTab === "performance" ? (
        <>
          <ResumeStatusManager
            onStatusUpdated={() => {
              setPerformanceRefreshKey((prev) => prev + 1);
              loadOverview();
            }}
          />
          <RecruiterPerformanceTable refreshKey={performanceRefreshKey} />
        </>
      ) : null}
    </section>
  );
}
