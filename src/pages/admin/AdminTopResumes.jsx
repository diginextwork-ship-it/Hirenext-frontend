import AdminLayout from "./AdminLayout";
import useAdminDashboard from "./useAdminDashboard";
import "../../styles/admin-panel.css";

export default function AdminTopResumes({ setCurrentPage }) {
  const { dashboard, isLoadingDashboard, errorMessage, refreshDashboard } =
    useAdminDashboard();

  return (
    <AdminLayout
      title="Top ATS resumes"
      subtitle="Review the top two ATS-matched resumes for every job."
      setCurrentPage={setCurrentPage}
      actions={
        <button
          type="button"
          className="admin-refresh-btn"
          onClick={refreshDashboard}
          disabled={isLoadingDashboard}
        >
          {isLoadingDashboard ? "Refreshing..." : "Refresh"}
        </button>
      }
    >
      {errorMessage ? (
        <div className="admin-alert admin-alert-error">{errorMessage}</div>
      ) : null}

      <div className="admin-dashboard-card admin-card-large">
        {dashboard.topResumesByJob.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table admin-table-wide">
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Top resumes</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.topResumesByJob.map((job) => (
                  <tr key={job.jobJid}>
                    <td className="admin-job-cell">
                      <strong>#{job.jobJid}</strong>
                      <div>{job.roleName || "N/A"}</div>
                      <div className="admin-muted">{job.companyName || "N/A"}</div>
                    </td>
                    <td>
                      {Array.isArray(job.topResumes) && job.topResumes.length > 0 ? (
                        <div className="admin-resume-grid">
                          {job.topResumes.map((resume, index) => (
                            <div
                              key={`${job.jobJid}-${resume.resId}`}
                              className="admin-resume-card"
                            >
                              <div className="admin-resume-title">
                                Rank {index + 1}: {resume.applicantName || "Name not found"}
                              </div>
                              <div className="admin-resume-meta">
                                ATS Match:{" "}
                                {resume.atsMatchPercentage === null
                                  ? "N/A"
                                  : `${resume.atsMatchPercentage}%`}
                              </div>
                              <div className="admin-resume-meta">
                                ATS Score:{" "}
                                {resume.atsScore === null ? "N/A" : `${resume.atsScore}%`}
                              </div>
                              <div className="admin-resume-meta">
                                Resume ID: {resume.resId} | RID: {resume.rid}
                              </div>
                              <div className="admin-resume-meta">
                                File: {resume.resumeFilename || "N/A"}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="admin-muted">No scored resumes for this job yet.</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="admin-chart-empty">No jobs found yet.</p>
        )}
      </div>
    </AdminLayout>
  );
}
