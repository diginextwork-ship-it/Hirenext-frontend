import { useEffect, useMemo, useState } from "react";
import AdminLayout from "./AdminLayout";
import { API_BASE_URL, getAdminHeaders, readJsonResponse } from "./adminApi";
import "../../styles/admin-panel.css";

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

export default function AdminManualSelection({ setCurrentPage }) {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [jobResumes, setJobResumes] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [isLoadingResumes, setIsLoadingResumes] = useState(false);
  const [isUpdatingSelection, setIsUpdatingSelection] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const selectedJob = useMemo(
    () => jobs.find((item) => Number(item.jobJid) === Number(selectedJobId)) || null,
    [jobs, selectedJobId]
  );

  const loadJobs = async () => {
    setIsLoadingJobs(true);
    setErrorMessage("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/job-alerts`, {
        headers: getAdminHeaders(),
      });
      const data = await readJsonResponse(
        response,
        "Check VITE_API_BASE_URL and ensure backend admin routes are running."
      );
      if (!response.ok) {
        throw new Error(data?.message || "Failed to load job alerts.");
      }
      const nextJobs = Array.isArray(data.jobs) ? data.jobs : [];
      setJobs(nextJobs);
      if (!nextJobs.some((item) => Number(item.jobJid) === Number(selectedJobId))) {
        setSelectedJobId(nextJobs[0]?.jobJid || null);
      }
    } catch (error) {
      setErrorMessage(error.message || "Failed to load job alerts.");
    } finally {
      setIsLoadingJobs(false);
    }
  };

  const loadJobResumes = async (jid) => {
    if (!jid) return;
    setIsLoadingResumes(true);
    setErrorMessage("");
    try {
      const [resumesResponse, summaryResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/jobs/${jid}/resumes`, {
          headers: getAdminHeaders(),
        }),
        fetch(`${API_BASE_URL}/api/admin/jobs/${jid}/selection-summary`, {
          headers: getAdminHeaders(),
        }),
      ]);
      const resumesData = await readJsonResponse(
        resumesResponse,
        "Failed to parse job resumes response."
      );
      const summaryData = await readJsonResponse(
        summaryResponse,
        "Failed to parse selection summary response."
      );

      if (!resumesResponse.ok) {
        throw new Error(resumesData?.message || "Failed to load job resumes.");
      }
      if (!summaryResponse.ok) {
        throw new Error(summaryData?.message || "Failed to load selection summary.");
      }

      setJobResumes(Array.isArray(resumesData.resumes) ? resumesData.resumes : []);
      setSummary(summaryData.summary || null);
    } catch (error) {
      setErrorMessage(error.message || "Failed to load job data.");
    } finally {
      setIsLoadingResumes(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    if (!selectedJobId) {
      setJobResumes([]);
      setSummary(null);
      return;
    }
    loadJobResumes(selectedJobId);
  }, [selectedJobId]);

  const updateSelection = async (resId, nextStatus) => {
    if (!selectedJobId) return;
    setIsUpdatingSelection(true);
    setErrorMessage("");
    setStatusMessage("");

    const selectionNote = window.prompt(`Optional note for ${resId}:`, "") || "";
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/jobs/${selectedJobId}/resume-selections`,
        {
          method: "POST",
          headers: getAdminHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            resId,
            selection_status: nextStatus,
            selection_note: selectionNote,
            selected_by_admin: "admin-panel",
          }),
        }
      );
      const data = await readJsonResponse(response, "Failed to parse selection update response.");
      if (!response.ok) {
        throw new Error(data?.message || "Failed to update selection.");
      }

      setStatusMessage(`Updated ${resId} as ${nextStatus}.`);
      await loadJobs();
      await loadJobResumes(selectedJobId);
    } catch (error) {
      setErrorMessage(error.message || "Failed to update selection.");
    } finally {
      setIsUpdatingSelection(false);
    }
  };

  return (
    <AdminLayout
      title="Manual resume selection"
      subtitle="Select, reject, or hold resumes for each job alert."
      setCurrentPage={setCurrentPage}
      actions={
        <button
          type="button"
          className="admin-refresh-btn"
          onClick={loadJobs}
          disabled={isLoadingJobs || isLoadingResumes}
        >
          {isLoadingJobs || isLoadingResumes ? "Refreshing..." : "Refresh"}
        </button>
      }
    >
      {errorMessage ? <div className="admin-alert admin-alert-error">{errorMessage}</div> : null}
      {statusMessage ? <div className="admin-alert">{statusMessage}</div> : null}

      <div className="admin-dashboard-card admin-card-large">
        <h2 style={{ marginBottom: "8px" }}>Job alerts</h2>
        {jobs.length === 0 ? (
          <p className="admin-chart-empty">
            {isLoadingJobs ? "Loading job alerts..." : "No job alerts found."}
          </p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table admin-table-wide">
              <thead>
                <tr>
                  <th>Job ID</th>
                  <th>Company</th>
                  <th>Role</th>
                  <th>Positions</th>
                  <th>Submitted</th>
                  <th>Selected</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => {
                  const isActive = Number(selectedJobId) === Number(job.jobJid);
                  return (
                    <tr
                      key={job.jobJid}
                      onClick={() => setSelectedJobId(job.jobJid)}
                      style={{
                        cursor: "pointer",
                        backgroundColor: isActive ? "rgba(198, 40, 40, 0.08)" : "transparent",
                      }}
                    >
                      <td>#{job.jobJid}</td>
                      <td>{job.companyName || "N/A"}</td>
                      <td>{job.roleName || "N/A"}</td>
                      <td>{job.positionsOpen ?? 1}</td>
                      <td>{job.totalSubmittedResumes ?? 0}</td>
                      <td>{job.selectedCount ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedJob ? (
        <div className="admin-dashboard-card admin-card-large">
          <h2 style={{ marginBottom: "8px" }}>
            Resume pool for Job #{selectedJob.jobJid} ({selectedJob.roleName || "N/A"} -{" "}
            {selectedJob.companyName || "N/A"})
          </h2>
          <p className="admin-muted" style={{ marginBottom: "8px" }}>
            Selected {summary?.selectedCount ?? 0} of {summary?.positionsOpen ?? selectedJob.positionsOpen ?? 1}
            {" | "}Remaining {summary?.remainingSlots ?? 0}
          </p>
          {(summary?.remainingSlots ?? 0) < 0 ? (
            <div className="admin-alert admin-alert-error" style={{ marginBottom: "8px" }}>
              Selected count exceeds positions open for this job alert.
            </div>
          ) : null}

          {jobResumes.length === 0 ? (
            <p className="admin-chart-empty">
              {isLoadingResumes ? "Loading resumes..." : "No resumes submitted for this job yet."}
            </p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table admin-table-wide">
                <thead>
                  <tr>
                    <th>Resume ID</th>
                    <th>RID</th>
                    <th>Recruiter</th>
                    <th>Filename</th>
                    <th>ATS Match</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobResumes.map((resume) => (
                    <tr key={resume.resId}>
                      <td>{resume.resId}</td>
                      <td>{resume.rid}</td>
                      <td>
                        <div>{resume.recruiterName || "N/A"}</div>
                        <div className="admin-muted">{resume.recruiterEmail || "N/A"}</div>
                      </td>
                      <td>{resume.resumeFilename || "N/A"}</td>
                      <td>
                        {resume.atsMatchPercentage === null
                          ? "N/A"
                          : `${resume.atsMatchPercentage}%`}
                      </td>
                      <td>{resume.selection?.status || "pending"}</td>
                      <td>{formatDateTime(resume.selection?.selectedAt || resume.uploadedAt)}</td>
                      <td>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          <button
                            type="button"
                            className="admin-refresh-btn"
                            onClick={() => updateSelection(resume.resId, "selected")}
                            disabled={isUpdatingSelection}
                          >
                            Select
                          </button>
                          <button
                            type="button"
                            className="admin-back-btn"
                            onClick={() => updateSelection(resume.resId, "rejected")}
                            disabled={isUpdatingSelection}
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            className="admin-back-btn"
                            onClick={() => updateSelection(resume.resId, "on_hold")}
                            disabled={isUpdatingSelection}
                          >
                            Hold
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </AdminLayout>
  );
}
