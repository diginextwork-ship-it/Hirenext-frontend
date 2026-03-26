import { useEffect, useState } from "react";
import emailjs from "@emailjs/browser";
import AdminLayout from "./AdminLayout";
import {
  API_BASE_URL,
  getAdminHeaders,
  readJsonResponse,
  updateTeamLeaderNote,
  adminDeleteCandidate,
} from "./adminApi";
import {
  buildCandidatePayloadAliases,
  normalizeResumeData,
} from "../../utils/dashboardData";
import "../../styles/admin-panel.css";

const shortlistEmailServiceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const shortlistEmailTemplateId = import.meta.env
  .VITE_EMAILJS_SHORTLIST_TEMPLATE_ID;
const shortlistEmailPublicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString();
};

const formatDate = (value) => {
  if (!value) return "N/A";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString();
};

const formatMoney = (value) => {
  if (value === null || value === undefined || value === "") return "N/A";
  return Number(value).toLocaleString("en-IN");
};

const SOURCE_FILTERS = {
  ALL: "all",
  CANDIDATE: "candidate",
  RECRUITER: "recruiter",
};

export default function AdminCandidateResumes({ setCurrentPage }) {
  const [resumes, setResumes] = useState([]);
  const [recruiterResumes, setRecruiterResumes] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isShortlisting, setIsShortlisting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [pendingResume, setPendingResume] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [noteValue, setNoteValue] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteDeleting, setDeleteDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [sourceFilter, setSourceFilter] = useState(SOURCE_FILTERS.ALL);

  const loadCandidateResumes = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/candidate-resumes`,
        {
          headers: getAdminHeaders(),
        },
      );
      const data = await readJsonResponse(
        response,
        "Check VITE_API_BASE_URL and ensure the admin candidate resumes route is available.",
      );
      if (!response.ok) {
        throw new Error(
          data?.message || "Failed to fetch candidate submitted resumes.",
        );
      }

      setResumes(
        (Array.isArray(data?.resumes) ? data.resumes : []).map((r) => ({
          ...normalizeResumeData(r),
          _source: "candidate",
        })),
      );
      setTotalCount(Number(data?.totalCount) || 0);
    } catch (error) {
      setResumes([]);
      setTotalCount(0);
      setErrorMessage(
        error.message || "Failed to fetch candidate submitted resumes.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecruiterResumes = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/dashboard`, {
        headers: getAdminHeaders(),
      });
      const data = await readJsonResponse(
        response,
        "Failed to fetch recruiter resume uploads.",
      );
      if (!response.ok) return;
      const uploads = Array.isArray(data?.recruiterResumeUploads)
        ? data.recruiterResumeUploads
        : [];
      setRecruiterResumes(
        uploads.map((item) => {
          const normalized = normalizeResumeData(item);
          return {
            ...normalized,
            applicantName: normalized.recruiterName || "N/A",
            applicantEmail: normalized.recruiterEmail || "N/A",
            job: {
              ...normalized.job,
              roleName:
                normalized.roleName ||
                normalized.job?.roleName ||
                normalized.job?.role_name ||
                "",
              companyName: normalized.companyName || normalized.job?.companyName || "",
              city: normalized.city || normalized.job?.city || "",
              jobDescription:
                item.jobDescription ||
                item.job_description ||
                normalized.job?.jobDescription ||
                normalized.job?.job_description ||
                "",
              skills: item.skills || normalized.job?.skills || "",
            },
            atsScore: null,
            atsMatchPercentage: null,
            submittedReason: null,
            verifiedReason: null,
            hasPriorExperience: null,
            experience: null,
            selection: { status: item.isAccepted ? "accepted" : "pending" },
            _source: "recruiter",
            _recruiterName: normalized.recruiterName,
            _recruiterRid: normalized.rid,
            _recruiterEmail: normalized.recruiterEmail,
          };
        }),
      );
    } catch {
      setRecruiterResumes([]);
    }
  };

  const loadAllResumes = async () => {
    await Promise.all([loadCandidateResumes(), loadRecruiterResumes()]);
  };

  useEffect(() => {
    loadAllResumes();
  }, []);

  const displayedResumes =
    sourceFilter === SOURCE_FILTERS.CANDIDATE
      ? resumes
      : sourceFilter === SOURCE_FILTERS.RECRUITER
        ? recruiterResumes
        : [...resumes, ...recruiterResumes];

  const displayedCount =
    sourceFilter === SOURCE_FILTERS.CANDIDATE
      ? totalCount
      : sourceFilter === SOURCE_FILTERS.RECRUITER
        ? recruiterResumes.length
        : totalCount + recruiterResumes.length;

  const openShortlistModal = (resume) => {
    setErrorMessage("");
    setStatusMessage("");
    setPendingResume(resume);
  };

  const closeShortlistModal = () => {
    if (isShortlisting) return;
    setPendingResume(null);
  };

  const openNoteEditor = (resume) => {
    setEditingNote(resume.resId);
    setNoteValue(resume.verifiedReason || "");
    setErrorMessage("");
  };

  const closeNoteEditor = () => {
    if (isSavingNote) return;
    setEditingNote(null);
    setNoteValue("");
  };

  const openDeleteCandidateModal = (resume) => {
    setDeleteTarget(resume);
    setDeleteError("");
  };

  const closeDeleteCandidateModal = () => {
    if (deleteDeleting) return;
    setDeleteTarget(null);
    setDeleteError("");
  };

  const handleDeleteCandidate = async () => {
    if (!deleteTarget?.resId) return;
    setDeleteDeleting(true);
    setDeleteError("");
    try {
      await adminDeleteCandidate(deleteTarget.resId);
      closeDeleteCandidateModal();
      await loadCandidateResumes();
    } catch (err) {
      setDeleteError(err.message || "Failed to delete candidate.");
    } finally {
      setDeleteDeleting(false);
    }
  };

  const saveTeamLeaderNote = async () => {
    if (!editingNote) return;

    setIsSavingNote(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      await updateTeamLeaderNote(editingNote, noteValue);
      setStatusMessage("Team leader note updated successfully.");
      setEditingNote(null);
      setNoteValue("");
      await loadCandidateResumes();
    } catch (error) {
      setErrorMessage(error.message || "Failed to update team leader note.");
    } finally {
      setIsSavingNote(false);
    }
  };

  const sendShortlistEmail = async (resume) => {
    if (
      !shortlistEmailServiceId ||
      !shortlistEmailTemplateId ||
      !shortlistEmailPublicKey
    ) {
      throw new Error(
        "Email service is not configured. Set VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_SHORTLIST_TEMPLATE_ID, and VITE_EMAILJS_PUBLIC_KEY.",
      );
    }

    if (!resume?.applicantEmail) {
      throw new Error("Candidate email is not available for this resume.");
    }

    const templateParams = {
      to_email: resume.applicantEmail,
      candidate_email: resume.applicantEmail,
      candidate_name: resume.applicantName || "Candidate",
      resume_id: resume.resId || "",
      job_id: resume.jobJid || "",
      job_role: resume.job?.roleName || "",
      company_name: resume.job?.companyName || "",
      resume_filename: resume.resumeFilename || "",
      shortlisted_at: new Date().toLocaleString(),
      shortlist_status: "shortlisted",
      admin_name: "admin-panel",
      message:
        "Your profile has been shortlisted. Our team will reach out with the next steps soon.",
    };

    await emailjs.send(
      shortlistEmailServiceId,
      shortlistEmailTemplateId,
      templateParams,
      { publicKey: shortlistEmailPublicKey },
    );
  };

  const confirmShortlist = async () => {
    if (!pendingResume?.resId || !pendingResume?.jobJid) {
      setErrorMessage(
        "This resume is not linked to a valid job, so it cannot be shortlisted.",
      );
      setPendingResume(null);
      return;
    }

    setIsShortlisting(true);
    setErrorMessage("");
    setStatusMessage("");

    let selectionSaved = false;
    try {
      const selectionResponse = await fetch(
        `${API_BASE_URL}/api/admin/jobs/${pendingResume.jobJid}/resume-selections`,
        {
          method: "POST",
          headers: getAdminHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            resId: pendingResume.resId,
            selection_status: "selected",
            selection_note:
              "Shortlisted from candidate submitted resumes panel.",
            selected_by_admin: "admin-panel",
            ...buildCandidatePayloadAliases(pendingResume),
          }),
        },
      );
      const selectionData = await readJsonResponse(
        selectionResponse,
        "Failed to parse shortlist update response.",
      );
      if (!selectionResponse.ok) {
        throw new Error(
          selectionData?.message || "Failed to shortlist this resume.",
        );
      }
      selectionSaved = true;

      await sendShortlistEmail(pendingResume);
      setStatusMessage(
        `Shortlisted ${pendingResume.applicantName || pendingResume.resId} and triggered the EmailJS notification.`,
      );
      setPendingResume(null);
      await loadCandidateResumes();
    } catch (error) {
      if (selectionSaved) {
        setPendingResume(null);
        await loadCandidateResumes();
        setErrorMessage(
          `Resume was shortlisted, but the email could not be sent. ${error.message || "EmailJS failed."}`,
        );
      } else {
        setErrorMessage(error.message || "Failed to shortlist this resume.");
      }
    } finally {
      setIsShortlisting(false);
    }
  };

  return (
    <AdminLayout
      title="All Submitted Resumes"
      subtitle="See resumes submitted by candidates and recruiters, along with JD and ATS details."
      setCurrentPage={setCurrentPage}
      actions={
        <button
          type="button"
          className="admin-refresh-btn"
          onClick={loadAllResumes}
          disabled={isLoading}
        >
          {isLoading ? "Refreshing..." : "Refresh"}
        </button>
      }
    >
      {errorMessage ? (
        <div className="admin-alert admin-alert-error">{errorMessage}</div>
      ) : null}
      {statusMessage ? (
        <div className="admin-alert">{statusMessage}</div>
      ) : null}

      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "16px",
          flexWrap: "wrap",
        }}
      >
        {[
          {
            key: SOURCE_FILTERS.ALL,
            label: "All",
            count: totalCount + recruiterResumes.length,
          },
          {
            key: SOURCE_FILTERS.CANDIDATE,
            label: "Candidate",
            count: totalCount,
          },
          {
            key: SOURCE_FILTERS.RECRUITER,
            label: "Recruiter",
            count: recruiterResumes.length,
          },
        ].map((f) => (
          <button
            key={f.key}
            type="button"
            className={`perf-timeline-btn${sourceFilter === f.key ? " perf-timeline-btn-active" : ""}`}
            onClick={() => setSourceFilter(f.key)}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      <div className="admin-dashboard-card admin-card-large">
        {displayedResumes.length === 0 ? (
          <p className="admin-chart-empty">
            {isLoading
              ? "Loading resumes..."
              : "No resumes found for this filter."}
          </p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table admin-table-wide">
              <thead>
                <tr>
                  <th>Resume ID</th>
                  <th>Source</th>
                  <th>Candidate / Recruiter</th>
                  <th>Job</th>
                  <th>JD</th>
                  <th>ATS Score</th>
                  <th>ATS Match</th>
                  <th>Recruiter Note</th>
                  <th>Team Leader Note</th>
                  <th>Experience</th>
                  <th>File</th>
                  <th>Submitted At</th>
                  <th>Status</th>
                  <th>Joining Info</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedResumes.map((resume) => (
                  <tr key={`${resume._source}-${resume.resId}`}>
                    <td>{resume.resId || "N/A"}</td>
                    <td>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: 600,
                          backgroundColor:
                            resume._source === "recruiter"
                              ? "#dbeafe"
                              : "#dcfce7",
                          color:
                            resume._source === "recruiter"
                              ? "#1e40af"
                              : "#166534",
                        }}
                      >
                        {resume._source === "recruiter"
                          ? "Recruiter"
                          : "Candidate"}
                      </span>
                    </td>
                    <td>
                      {resume._source === "recruiter" ? (
                        <>
                          <div>{resume._recruiterName || "N/A"}</div>
                          <div className="admin-muted">
                            {resume._recruiterRid || ""}
                            {resume._recruiterEmail
                              ? ` · ${resume._recruiterEmail}`
                              : ""}
                          </div>
                        </>
                      ) : (
                        resume.applicantName || "Name not found"
                      )}
                    </td>
                    <td className="admin-job-cell">
                      <strong>
                        {resume.jobJid ? `#${resume.jobJid}` : "No job"}
                      </strong>
                      <div>{resume.job?.roleName || "N/A"}</div>
                      <div className="admin-muted">
                        {resume.job?.companyName || "N/A"}
                      </div>
                      <div className="admin-muted">
                        {resume.job?.city || "N/A"}
                      </div>
                    </td>
                    <td
                      style={{
                        maxWidth: "200px",
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                      }}
                    >
                      {resume.job?.jobDescription ||
                        resume.job?.skills ||
                        "N/A"}
                    </td>
                    <td>
                      {resume.atsScore === null ? "N/A" : `${resume.atsScore}%`}
                    </td>
                    <td>
                      {resume.atsMatchPercentage === null
                        ? "N/A"
                        : `${resume.atsMatchPercentage}%`}
                    </td>
                    <td
                      className="table-cell-wrap"
                      style={{ maxWidth: "160px", wordBreak: "break-word" }}
                    >
                      {resume.submittedReason || "-"}
                    </td>
                    <td
                      className="table-cell-wrap"
                      style={{ maxWidth: "160px", wordBreak: "break-word" }}
                    >
                      {resume.verifiedReason || "-"}
                      <button
                        type="button"
                        className="admin-refresh-btn"
                        onClick={() => openNoteEditor(resume)}
                        disabled={isLoading || isSavingNote}
                        style={{
                          marginLeft: "8px",
                          padding: "4px 8px",
                          fontSize: "12px",
                        }}
                      >
                        Edit
                      </button>
                    </td>
                    <td
                      style={{
                        maxWidth: "200px",
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                      }}
                    >
                      {resume.hasPriorExperience === null ? (
                        "N/A"
                      ) : resume.hasPriorExperience ? (
                        <>
                          <div>
                            <strong>Industry:</strong>{" "}
                            {resume.experience?.industry === "others"
                              ? resume.experience?.industryOther || "Others"
                              : resume.experience?.industry || "N/A"}
                          </div>
                          <div>
                            <strong>Current:</strong>{" "}
                            {formatMoney(resume.experience?.currentSalary)}
                          </div>
                          <div>
                            <strong>Expected:</strong>{" "}
                            {formatMoney(resume.experience?.expectedSalary)}
                          </div>
                          <div>
                            <strong>Notice:</strong>{" "}
                            {resume.experience?.noticePeriod || "N/A"}
                          </div>
                          <div>
                            <strong>Years:</strong>{" "}
                            {resume.experience?.yearsOfExperience ?? "N/A"}
                          </div>
                        </>
                      ) : (
                        "No prior experience"
                      )}
                    </td>
                    <td>
                      {resume.resumeFilename || "N/A"}
                      {resume.resumeType
                        ? ` (${String(resume.resumeType).toUpperCase()})`
                        : ""}
                    </td>
                    <td>{formatDateTime(resume.uploadedAt)}</td>
                    <td>{resume.selection?.status || "pending"}</td>
                    <td className="table-cell-wrap">
                      {[
                        "walk_in",
                        "pending_joining",
                        "joined",
                        "billed",
                        "left",
                      ].includes(
                        String(resume.selection?.status || "").toLowerCase(),
                      ) ? (
                        <>
                          {String(resume.selection?.status || "").toLowerCase() ===
                            "walk_in" && resume.selection?.walkInDate ? (
                            <div>
                              <strong>Walk-in Date:</strong>{" "}
                              {formatDate(resume.selection.walkInDate)}
                            </div>
                          ) : null}
                          {resume.selection?.joiningDate ? (
                            <div>
                              <strong>Date:</strong>{" "}
                              {formatDate(resume.selection.joiningDate)}
                            </div>
                          ) : null}
                          {resume.selection?.joiningNote ||
                          resume.selection?.joinedReason ? (
                            <div>
                              <strong>Note:</strong>{" "}
                              {resume.selection.joiningNote ||
                                resume.selection.joinedReason}
                            </div>
                          ) : null}
                          {!resume.selection?.walkInDate &&
                          !resume.selection?.joiningDate &&
                          !resume.selection?.joiningNote &&
                          !resume.selection?.joinedReason
                            ? "-"
                            : null}
                        </>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          gap: "6px",
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          type="button"
                          className="admin-refresh-btn admin-shortlist-btn"
                          onClick={() => openShortlistModal(resume)}
                          disabled={
                            isShortlisting ||
                            !resume.jobJid ||
                            String(
                              resume.selection?.status || "",
                            ).toLowerCase() === "selected"
                          }
                        >
                          {String(
                            resume.selection?.status || "",
                          ).toLowerCase() === "selected"
                            ? "Shortlisted"
                            : "Shortlist"}
                        </button>
                        <button
                          type="button"
                          className="admin-back-btn"
                          style={{
                            backgroundColor: "#dc2626",
                            color: "#fff",
                            border: "none",
                            padding: "4px 10px",
                            fontSize: "13px",
                          }}
                          onClick={() => openDeleteCandidateModal(resume)}
                        >
                          Delete
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

      {pendingResume ? (
        <div
          className="admin-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="shortlist-modal-title"
        >
          <div className="admin-modal-card">
            <h3
              id="shortlist-modal-title"
              style={{ marginTop: 0, marginBottom: "10px" }}
            >
              Confirm shortlist
            </h3>
            <p style={{ marginTop: 0 }}>
              An email will be sent to{" "}
              <strong>
                {pendingResume.applicantEmail || "this candidate"}
              </strong>{" "}
              after you confirm the shortlist action.
            </p>
            <p className="admin-muted" style={{ marginTop: 0 }}>
              Candidate: {pendingResume.applicantName || "Name not found"} |
              Job: {pendingResume.job?.roleName || "N/A"} at{" "}
              {pendingResume.job?.companyName || "N/A"}
            </p>
            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-back-btn"
                onClick={closeShortlistModal}
                disabled={isShortlisting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-refresh-btn"
                onClick={confirmShortlist}
                disabled={isShortlisting}
              >
                {isShortlisting ? "Confirming..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editingNote ? (
        <div
          className="admin-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="note-modal-title"
        >
          <div className="admin-modal-card">
            <h3
              id="note-modal-title"
              style={{ marginTop: 0, marginBottom: "10px" }}
            >
              Edit Team Leader Note
            </h3>
            <p className="admin-muted" style={{ marginTop: 0 }}>
              Resume ID: {editingNote}
            </p>
            <textarea
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              placeholder="Add or edit team leader note..."
              rows={5}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ccc",
                fontFamily: "inherit",
                marginBottom: "10px",
              }}
            />
            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-back-btn"
                onClick={closeNoteEditor}
                disabled={isSavingNote}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-refresh-btn"
                onClick={saveTeamLeaderNote}
                disabled={isSavingNote}
              >
                {isSavingNote ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div
          className="admin-modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={closeDeleteCandidateModal}
        >
          <div
            className="admin-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{ marginTop: 0, marginBottom: "10px", color: "#dc2626" }}
            >
              Delete Candidate
            </h3>
            <p style={{ margin: "0 0 8px" }}>
              Are you sure you want to permanently delete{" "}
              <strong>{deleteTarget.applicantName || "this candidate"}</strong>?
            </p>
            <p className="admin-muted" style={{ margin: "0 0 4px" }}>
              Resume ID: {deleteTarget.resId} | Email:{" "}
              {deleteTarget.applicantEmail || "N/A"}
            </p>
            {deleteTarget.jobJid ? (
              <p className="admin-muted" style={{ margin: "0 0 4px" }}>
                Job: #{deleteTarget.jobJid} —{" "}
                {deleteTarget.job?.roleName || "N/A"} at{" "}
                {deleteTarget.job?.companyName || "N/A"}
              </p>
            ) : null}
            <p
              style={{
                margin: "8px 0 12px",
                color: "#b91c1c",
                fontWeight: 600,
              }}
            >
              This will permanently remove this candidate's resume, phone
              number, and all associated data. This action cannot be undone.
            </p>
            {deleteError ? (
              <div
                className="admin-alert admin-alert-error"
                style={{ marginBottom: "10px" }}
              >
                {deleteError}
              </div>
            ) : null}
            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-back-btn"
                onClick={closeDeleteCandidateModal}
                disabled={deleteDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-refresh-btn"
                style={{ backgroundColor: "#dc2626", border: "none" }}
                onClick={handleDeleteCandidate}
                disabled={deleteDeleting}
              >
                {deleteDeleting ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminLayout>
  );
}
