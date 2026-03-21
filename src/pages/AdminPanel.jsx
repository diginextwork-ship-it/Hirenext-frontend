import useAdminDashboard from "./admin/useAdminDashboard";
import "../styles/admin-panel.css";

export default function AdminPanel({ setCurrentPage, onLogout }) {
  const { dashboard, isLoadingDashboard, errorMessage, refreshDashboard } =
    useAdminDashboard();

  const cards = [
    {
      title: "Create Recruiter",
      description: "Add a new recruiter account and assign a role.",
      stat: "Access management",
      page: "admincreate",
    },
    {
      title: "Performance Dashboard",
      description:
        "Track recruiter and team leader performance across all metrics.",
      stat: "All metrics",
      page: "adminperformance",
    },
    {
      title: "All Submitted Resumes",
      description: "Review resumes submitted by candidates and recruiters.",
      stat: `${dashboard.candidateResumeCount} candidate + ${dashboard.recruiterResumeUploads.length} recruiter uploads`,
      page: "admincandidateresumes",
    },
    {
      title: "Manual Resume Selection",
      description: "Select resumes for each job against open positions.",
      stat: `${dashboard.totalResumeCount} resumes`,
      page: "adminmanualselection",
    },
    {
      title: "Revenue",
      description:
        "Track intake and expenses (salaries, electricity bills, client payments) with charts and table.",
      stat: "Finance tracking",
      page: "adminrevenue",
    },
    {
      title: "Attendance system",
      description:
        "Mark team leaders and recruiters daily, and sync salary expense into the finance ledger.",
      stat: "Present, absent, half day",
      page: "adminattendance",
    },
    {
      title: "Process Billing",
      description:
        "Manually trigger the billing job to move eligible joined candidates (90+ days) to billed status.",
      stat: "Billing management",
      page: "adminbilling",
    },
  ];

  return (
    <main className="admin-page admin-panel-page">
      <section className="admin-hero">
        <div>
          <p className="admin-kicker">Admin Control Center</p>
          <h1>Admin dashboard</h1>
          <p className="admin-hero-subtitle">
            Organize recruiter access, track resume activity, and manage core
            admin workflows.
          </p>
        </div>
        <div className="admin-page-actions">
          <button type="button" className="admin-back-btn" onClick={onLogout}>
            Logout
          </button>
          <button
            type="button"
            className="admin-refresh-btn"
            onClick={refreshDashboard}
            disabled={isLoadingDashboard}
          >
            {isLoadingDashboard ? "Refreshing..." : "Refresh data"}
          </button>
        </div>
      </section>

      {errorMessage ? (
        <div className="admin-alert admin-alert-error">{errorMessage}</div>
      ) : null}

      <section className="admin-cards-grid">
        {cards.map((card) => (
          <button
            key={card.title}
            type="button"
            className="admin-card-link"
            onClick={() => setCurrentPage(card.page)}
          >
            <div className="admin-card">
              <div className="admin-card-top">
                <h2>{card.title}</h2>
                <span className="admin-card-stat">{card.stat}</span>
              </div>
              <p>{card.description}</p>
              <span className="admin-card-action">Open</span>
            </div>
          </button>
        ))}
      </section>
    </main>
  );
}
