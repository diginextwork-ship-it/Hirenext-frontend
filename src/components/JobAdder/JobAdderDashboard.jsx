import { useState } from "react";
import RecruiterPerformanceTable from "./RecruiterPerformanceTable";
import ResumeStatusManager from "./ResumeStatusManager";
import TeamLeaderPerformanceOverview from "./TeamLeaderPerformanceOverview";

export default function TeamLeaderDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [performanceRefreshKey, setPerformanceRefreshKey] = useState(0);
  const [overviewRefreshKey, setOverviewRefreshKey] = useState(0);

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
          Team Performance
        </button>
      </div>

      {activeTab === "overview" ? (
        <TeamLeaderPerformanceOverview refreshKey={overviewRefreshKey} />
      ) : null}

      {activeTab === "performance" ? (
        <>
          <ResumeStatusManager
            onStatusUpdated={() => {
              setPerformanceRefreshKey((prev) => prev + 1);
              setOverviewRefreshKey((prev) => prev + 1);
            }}
          />
          <RecruiterPerformanceTable refreshKey={performanceRefreshKey} />
        </>
      ) : null}
    </section>
  );
}
