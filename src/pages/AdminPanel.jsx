import useAdminDashboard from "./admin/useAdminDashboard";
import { UserPlus, BarChart3, FileText, IndianRupee, CalendarCheck, CheckSquare, History, LogOut, RefreshCw, ArrowUpRight } from "lucide-react";
import "../styles/admin-panel.css";
import logo from "../assets/Logo.png";

export default function AdminPanel({ setCurrentPage, onLogout }) {
  const { dashboard, isLoadingDashboard, errorMessage, refreshDashboard } =
    useAdminDashboard();

  const cards = [
    {
      title: "Create Recruiter",
      description: "Add new recruiter accounts, set credentials, and assign roles.",
      stat: "Access Control",
      page: "admincreate",
      icon: UserPlus,
      variant: "card-coral",
    },
    {
      title: "Performance Dashboard",
      description: "Track recruiter activity, interview counts, and team performance.",
      stat: "Live Metrics",
      page: "adminperformance",
      icon: BarChart3,
      variant: "card-indigo",
    },
    {
      title: "Candidate Resumes",
      description: "Review all resumes submitted by candidates and recruiters.",
      stat: `${dashboard.candidateResumeCount || 0} candidate + ${(dashboard.recruiterResumeUploads || []).length} recruiter uploads`,
      page: "admincandidateresumes",
      icon: FileText,
      variant: "card-emerald",
    },
    {
      title: "Revenue & Finance",
      description: "Track intake, salary expenses, operating costs, and client payments.",
      stat: "Finance Hub",
      page: "adminrevenue",
      icon: IndianRupee,
      variant: "card-amber",
    },
    {
      title: "Attendance System",
      description: "Mark daily attendance for team leaders and recruiters.",
      stat: "Daily Sync",
      page: "adminattendance",
      icon: CalendarCheck,
      variant: "card-teal",
    },
    {
      title: "Tasks & Assignments",
      description: "Create work assignments, set deadlines, and track completed tasks.",
      stat: "Task Workflow",
      page: "admintasks",
      icon: CheckSquare,
      variant: "card-purple",
    },
    {
      title: "Salary History",
      description: "View recruiter salary structures, pay history, and salary tiers.",
      stat: "Salary Audit",
      page: "adminsalaryhistory",
      icon: History,
      variant: "card-blue",
    },
  ];

  return (
    <main className="admin-page admin-panel-page">
      <section className="admin-hero glass-card">
        <div className="admin-hero-left">
          <div className="admin-kicker-pill">Admin Control Center</div>
          <h1>Platform Control Dashboard</h1>
          <p className="admin-hero-subtitle">
            Manage team access, monitor recruitment pipelines, and review operational metrics across all routes.
          </p>
        </div>
        <div className="admin-page-actions">
          <img src={logo} alt="HireNext logo" className="admin-dashboard-logo" />
          <div className="admin-action-buttons">
            <button
              type="button"
              className="btn-secondary admin-refresh-btn"
              onClick={refreshDashboard}
              disabled={isLoadingDashboard}
            >
              <RefreshCw size={16} className={isLoadingDashboard ? "spin-icon" : ""} />
              <span>{isLoadingDashboard ? "Refreshing..." : "Refresh Data"}</span>
            </button>
            <button type="button" className="btn-secondary admin-logout-btn" onClick={onLogout}>
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </section>

      {errorMessage && (
        <div className="admin-alert admin-alert-error">{errorMessage}</div>
      )}

      <section className="admin-cards-grid">
        {cards.map((card) => {
          const CardIcon = card.icon;
          return (
            <button
              key={card.title}
              type="button"
              className="admin-card-link"
              onClick={() => setCurrentPage(card.page)}
            >
              <div className={`admin-card glass-card ${card.variant}`}>
                <div className="admin-card-header">
                  <div className="admin-card-icon">
                    <CardIcon size={22} />
                  </div>
                  <span className="admin-card-stat">{card.stat}</span>
                </div>
                <div className="admin-card-body">
                  <h2>{card.title}</h2>
                  <p>{card.description}</p>
                </div>
                <div className="admin-card-footer">
                  <span className="admin-card-action">Open Module</span>
                  <ArrowUpRight size={16} />
                </div>
              </div>
            </button>
          );
        })}
      </section>
    </main>
  );
}

