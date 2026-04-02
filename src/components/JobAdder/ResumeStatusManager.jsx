import { useEffect, useMemo, useState } from "react";
import { getAuthSession } from "../../auth/session";
import { API_BASE_URL } from "../../config/api";
import { fetchMyJobs } from "../../services/jobAccessService";
import {
  fetchJobResumeStatuses,
  updateJobResumeStatus,
} from "../../services/performanceService";
import { useNotification } from "../../context/NotificationContext";
import {
  buildCandidatePayloadAliases,
  normalizeJobData,
  normalizeResumeData,
} from "../../utils/dashboardData";

const formatLabel = (value) =>
  String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatDateTime = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString();
};

const formatDate = (value) => {
  if (!value) return "-";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString();
};
const getResumeCompanyName = (resume, selectedJob) =>
  normalizeResumeData(resume, selectedJob).companyName ||
  selectedJob?.companyName ||
  selectedJob?.company_name ||
  "N/A";
const getResumeCityName = (resume, selectedJob) =>
  normalizeResumeData(resume, selectedJob).city || selectedJob?.city || "N/A";
const getResumeCandidatePhone = (resume, selectedJob) => {
  const normalized = normalizeResumeData(resume, selectedJob);
  return (
    normalized.candidatePhone ||
    normalized.applicantPhone ||
    normalized.phone ||
    normalized.mobile ||
    "N/A"
  );
};

const isPostWalkInStatus = (status) =>
  ["walk_in", "pending_joining", "joined", "billed", "left"].includes(
    String(status || "").trim().toLowerCase(),
  );

const VERIFIED_STATUS_FALLBACKS = ["verified", "verfied", "verify"];

export default function ResumeStatusManager({ onStatusUpdated }) {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [verifyingResumeId, setVerifyingResumeId] = useState("");
  const [verifyNote, setVerifyNote] = useState("");
  const [leftResumeId, setLeftResumeId] = useState("");
  const [leftNote, setLeftNote] = useState("");
  const { addNotification } = useNotification();

  const selectedJob = useMemo(
    () => jobs.find((job) => String(job.jid) === String(selectedJobId)) || null,
    [jobs, selectedJobId],
  );

  const loadJobResumes = async (jobId) => {
    if (!jobId) {
      setResumes([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await fetchJobResumeStatuses(jobId);
      setResumes(
        Array.isArray(data.resumes)
          ? data.resumes.map((item) => normalizeResumeData(item, selectedJob))
          : [],
      );
    } catch (loadError) {
      setError(loadError.message || "Failed to fetch resumes.");
      setResumes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const loadJobs = async () => {
      setJobsLoading(true);
      setError("");
      try {
        const data = await fetchMyJobs();
        if (!active) return;
        const nextJobs = Array.isArray(data.jobs)
          ? data.jobs.map((item) => normalizeJobData(item))
          : [];
        setJobs(nextJobs);
        setSelectedJobId(nextJobs[0]?.jid ? String(nextJobs[0].jid) : "");
      } catch (loadError) {
        if (!active) return;
        setError(loadError.message || "Failed to fetch jobs.");
      } finally {
        if (active) setJobsLoading(false);
      }
    };
    loadJobs();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setMessage("");
    setVerifyingResumeId("");
    setVerifyNote("");
    setLeftResumeId("");
    setLeftNote("");
    loadJobResumes(selectedJobId);
  }, [selectedJobId]);

  const handleStatusChange = async (resume, status) => {
    if (!selectedJobId || !resume?.resId) return;
    setMessage("");
    setError("");
    try {
      await updateJobResumeStatus(selectedJobId, {
        resId: resume.resId,
        status,
        ...buildCandidatePayloadAliases(resume, selectedJob),
      });
      setResumes((prev) =>
        prev.map((item) =>
          item.resId === resume.resId
            ? {
                ...item,
                status,
                updatedAt: new Date().toISOString(),
                updatedBy: "You",
              }
            : item,
        ),
      );
      const statusLabel = formatLabel(status);
      const notificationMessage = `Status updated to ${statusLabel} for Resume ID: ${resume.resId} (Job ID: ${selectedJobId})`;
      addNotification(notificationMessage, "success", 5000);
      setMessage(`Updated ${resume.resId} to ${formatLabel(status)}.`);
      onStatusUpdated?.();
    } catch (updateError) {
      setError(updateError.message || "Failed to update status.");
    }
  };

  const openVerifyComposer = (resume) => {
    setVerifyingResumeId(resume?.resId || "");
    setVerifyNote(resume?.verifiedReason || "");
    setLeftResumeId("");
    setLeftNote("");
    setMessage("");
    setError("");
  };

  const openLeftComposer = (resume) => {
    setLeftResumeId(resume?.resId || "");
    setLeftNote("");
    setVerifyingResumeId("");
    setVerifyNote("");
    setMessage("");
    setError("");
  };

  const handleMarkLeft = async (resume) => {
    if (!selectedJobId || !resume?.resId) return;
    const trimmedNote = leftNote.trim();
    if (!trimmedNote) {
      setError("A reason is required to mark a candidate as left.");
      return;
    }
    setMessage("");
    setError("");
    try {
      await updateJobResumeStatus(selectedJobId, {
        resId: resume.resId,
        status: "left",
        note: trimmedNote,
        ...buildCandidatePayloadAliases(resume, selectedJob),
      });
      setResumes((prev) =>
        prev.map((item) =>
          item.resId === resume.resId
            ? {
                ...item,
                status: "left",
                leftReason: trimmedNote,
                updatedAt: new Date().toISOString(),
                updatedBy: "You",
              }
            : item,
        ),
      );
      setLeftResumeId("");
      setLeftNote("");
      addNotification(
        `Marked as Left: Resume ID ${resume.resId} (Job ID: ${selectedJobId})`,
        "success",
        5000,
      );
      setMessage(`Marked ${resume.resId} as Left.`);
      onStatusUpdated?.();
    } catch (updateError) {
      setError(updateError.message || "Failed to mark candidate as left.");
    }
  };

  const handleVerifyResume = async (resume) => {
    if (!selectedJobId || !resume?.resId) return;
    setMessage("");
    setError("");
    try {
      const normalizedNote = verifyNote.trim();
      const basePayload = {
        resId: resume.resId,
        note: normalizedNote,
        ...buildCandidatePayloadAliases(resume, selectedJob),
      };
      let lastError = null;

      for (const statusValue of VERIFIED_STATUS_FALLBACKS) {
        try {
          await updateJobResumeStatus(selectedJobId, {
            ...basePayload,
            status: statusValue,
          });
          lastError = null;
          break;
        } catch (updateError) {
          lastError = updateError;
          const errorMessage = String(
            updateError?.message || "",
          ).toLowerCase();
          if (!errorMessage.includes("invalid target status")) {
            throw updateError;
          }
        }
      }

      if (lastError) throw lastError;

      setResumes((prev) =>
        prev.map((item) =>
          item.resId === resume.resId
            ? {
                ...item,
                status: "verified",
                updatedAt: new Date().toISOString(),
                updatedBy: "You",
                verifiedReason: normalizedNote || null,
              }
            : item,
        ),
      );
      setVerifyingResumeId("");
      setVerifyNote("");

      const notificationMessage = `Status updated to Verified for Resume ID: ${resume.resId} (Job ID: ${selectedJobId})`;
      addNotification(notificationMessage, "success", 5000);

      setMessage(`Verified ${resume.resId}.`);
      onStatusUpdated?.();
    } catch (updateError) {
      setError(updateError.message || "Failed to verify resume.");
    }
  };

  const handleResumeOpen = (resume) => {
    const token = getAuthSession()?.token;
    const rid = resume?.rid || resume?.recruiterRid;
    const resId = resume?.resId;
    if (!token || !rid || !resId) return;
    window.open(
      `${API_BASE_URL}/api/recruiters/${encodeURIComponent(rid)}/resumes/${encodeURIComponent(resId)}/file?token=${encodeURIComponent(token)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <section className="resume-status-manager">
      <div className="recruiter-performance-head">
        <h2>Manual Resume Status</h2>
        <select
          value={selectedJobId}
          onChange={(event) => setSelectedJobId(event.target.value)}
          disabled={jobsLoading || jobs.length === 0}
        >
          {jobs.length === 0 ? <option value="">No jobs found</option> : null}
          {jobs.map((job) => (
            <option key={job.jid} value={job.jid}>
              #{job.jid} - {job.role_name || "Role"} (
              {job.company_name || "Company"})
            </option>
          ))}
        </select>
      </div>

      {selectedJob ? (
        <p className="job-message">
          Managing resumes for job #{selectedJob.jid}:{" "}
          {selectedJob.role_name || "Role"} at{" "}
          {selectedJob.company_name || "Company"}
        </p>
      ) : null}

      {message ? (
        <p className="job-message job-message-success">{message}</p>
      ) : null}
      {error ? <p className="job-message job-message-error">{error}</p> : null}
      {loading ? <p className="chart-empty">Loading resumes...</p> : null}

      {!loading && resumes.length === 0 && selectedJobId ? (
        <p className="chart-empty">
          No recruiter resumes submitted for this job yet.
        </p>
      ) : null}

      {!loading && resumes.length > 0 ? (
        <div className="ui-table-wrap">
          <table className="performance-table">
            <thead>
              <tr>
                <th>Resume ID</th>
                <th>RID</th>
                <th>Recruiter</th>
                <th>Candidate Phone</th>
                <th>Job</th>
                <th>File</th>
                <th>ATS Match</th>
                <th>Recruiter Note</th>
                <th>Timing Info</th>
                <th>Status</th>
                <th>Action</th>
                <th>Status Info</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {resumes.map((resume) => (
                <tr key={resume.resId}>
                  <td>{resume.resId}</td>
                  <td>{resume.rid}</td>
                  <td>{resume.recruiterName || "N/A"}</td>
                  <td>
                    {getResumeCandidatePhone(resume, selectedJob) !== "N/A" ? (
                      <a href={`tel:${getResumeCandidatePhone(resume, selectedJob)}`}>
                        {getResumeCandidatePhone(resume, selectedJob)}
                      </a>
                    ) : (
                      "N/A"
                    )}
                  </td>
                  <td>
                    <div>{selectedJobId ? `#${selectedJobId}` : "N/A"}</div>
                    <div className="admin-muted">
                      {getResumeCompanyName(resume, selectedJob)}
                    </div>
                    <div className="admin-muted">
                      {getResumeCityName(resume, selectedJob)}
                    </div>
                  </td>
                  <td>
                    <div className="table-cell-wrap">
                      <div>
                        {resume.resumeFilename || resume.resId || "N/A"}
                        {resume.resumeType
                          ? ` (${String(resume.resumeType).toUpperCase()})`
                          : ""}
                      </div>
                      <div className="ui-mt-xs">
                        <button
                          type="button"
                          className="resume-action-btn"
                          onClick={() => handleResumeOpen(resume)}
                          disabled={!resume?.rid || !resume?.resId}
                        >
                          View Resume
                        </button>
                      </div>
                    </div>
                  </td>
                  <td>
                    {resume.atsMatchPercentage === null ||
                    resume.atsMatchPercentage === undefined
                      ? "N/A"
                      : `${resume.atsMatchPercentage}%`}
                  </td>
                  <td className="table-cell-wrap">
                    {resume.submittedReason || "-"}
                  </td>
                  <td className="table-cell-wrap">
                    {resume.verifiedReason || "-"}
                  </td>
                  <td>
                    <span
                      className={`status-pill status-${resume.status || "pending"}`}
                    >
                      {formatLabel(resume.status || "pending")}
                    </span>
                    {resume.status === "left" && resume.leftReason ? (
                      <span
                        className="left-reason-tooltip"
                        title={resume.leftReason}
                      >
                        {" "}
                        ℹ️
                        <span className="left-reason-text">
                          {resume.leftReason}
                        </span>
                      </span>
                    ) : null}
                  </td>
                  <td>
                    <div className="resume-status-actions">
                      {!isPostWalkInStatus(resume.status) ? (
                        <>
                          <button
                            type="button"
                            className={`resume-action-btn resume-action-verify ${
                              resume.status === "verified" ? "active" : ""
                            }`}
                            onClick={() => openVerifyComposer(resume)}
                          >
                            Verify
                          </button>
                          <button
                            type="button"
                            className={`resume-action-btn resume-action-select ${
                              resume.status === "selected" ? "active" : ""
                            }`}
                            onClick={() => handleStatusChange(resume, "selected")}
                          >
                            Select
                          </button>
                          <button
                            type="button"
                            className={`resume-action-btn resume-action-reject ${
                              resume.status === "rejected" ? "active" : ""
                            }`}
                            onClick={() => handleStatusChange(resume, "rejected")}
                          >
                            Reject
                          </button>
                        </>
                      ) : null}
                      {resume.status === "billed" ? (
                        <button
                          type="button"
                          className="resume-action-btn action-btn-warning"
                          onClick={() => openLeftComposer(resume)}
                        >
                          Mark as Left
                        </button>
                      ) : null}
                    </div>
                    {verifyingResumeId === resume.resId ? (
                      <div className="resume-verify-box">
                        <label htmlFor={`verify-note-${resume.resId}`}>
                          Any information about timing?
                        </label>
                        <textarea
                          id={`verify-note-${resume.resId}`}
                          value={verifyNote}
                          onChange={(event) =>
                            setVerifyNote(event.target.value)
                          }
                          rows={3}
                          placeholder="Optional timing information"
                        />
                        <div className="resume-status-actions">
                          <button
                            type="button"
                            className="resume-action-btn resume-action-verify active"
                            onClick={() => handleVerifyResume(resume)}
                          >
                            Save Verify
                          </button>
                          <button
                            type="button"
                            className="resume-action-btn"
                            onClick={() => {
                              setVerifyingResumeId("");
                              setVerifyNote("");
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}
                    {leftResumeId === resume.resId ? (
                      <div className="resume-verify-box">
                        <label htmlFor={`left-note-${resume.resId}`}>
                          Reason for leaving (required)
                        </label>
                        <textarea
                          id={`left-note-${resume.resId}`}
                          value={leftNote}
                          onChange={(event) => setLeftNote(event.target.value)}
                          rows={3}
                          placeholder="Enter reason why the candidate left..."
                        />
                        <div className="resume-status-actions">
                          <button
                            type="button"
                            className="resume-action-btn action-btn-warning active"
                            onClick={() => handleMarkLeft(resume)}
                            disabled={!leftNote.trim()}
                          >
                            Confirm Left
                          </button>
                          <button
                            type="button"
                            className="resume-action-btn"
                            onClick={() => {
                              setLeftResumeId("");
                              setLeftNote("");
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </td>
                  <td className="table-cell-wrap">
                    {resume.status === "walk_in" ||
                    resume.status === "pending_joining" ||
                    resume.status === "joined" ||
                    resume.status === "billed" ||
                    resume.status === "left" ? (
                      <>
                        {resume.status === "walk_in" && resume.walkInDate ? (
                          <div>
                            <strong>Walk-in Date:</strong>{" "}
                            {formatDate(resume.walkInDate)}
                          </div>
                        ) : null}
                        {resume.joiningDate ? (
                          <div>
                            <strong>Date:</strong>{" "}
                            {formatDate(resume.joiningDate)}
                          </div>
                        ) : null}
                        {resume.joiningNote || resume.joinedReason ? (
                          <div>
                            <strong>Note:</strong>{" "}
                            {resume.joiningNote || resume.joinedReason}
                          </div>
                        ) : null}
                        {!resume.walkInDate &&
                        !resume.joiningDate &&
                        !resume.joiningNote &&
                        !resume.joinedReason
                          ? "-"
                          : null}
                      </>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>
                    {formatDateTime(resume.updatedAt || resume.uploadedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
