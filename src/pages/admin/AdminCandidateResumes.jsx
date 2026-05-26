import { useEffect, useMemo, useState } from "react";
import { getAuthSession } from "../../auth/session";
import AdminLayout from "./AdminLayout";
import {
  API_BASE_URL,
  assignDuplicateConflict,
  adminDeleteResume,
  fetchDuplicateConflicts,
  getAdminHeaders,
  readJsonResponse,
} from "./adminApi";
import {
  formatResumeCompanyDisplay,
  normalizeResumeData,
} from "../../utils/dashboardData";
import SubmittedResumesPanel from "../../components/common/SubmittedResumesPanel";

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
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [deletingResId, setDeletingResId] = useState("");
  const [duplicateConflicts, setDuplicateConflicts] = useState([]);
  const [showDuplicateConflicts, setShowDuplicateConflicts] = useState(false);
  const [expandedConflictId, setExpandedConflictId] = useState("");
  const [assigningConflictResId, setAssigningConflictResId] = useState("");

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
        (Array.isArray(data?.resumes) ? data.resumes : []).map((resume) => ({
          ...normalizeResumeData(resume),
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
            applicantName:
              normalized.applicantName ||
              normalized.candidateName ||
              normalized.name ||
              "N/A",
            job: {
              ...normalized.job,
              companyName: formatResumeCompanyDisplay(normalized),
            },
            atsScore:
              normalized.atsScore ?? item.atsScore ?? item.ats_score ?? null,
            _source: "recruiter",
            _recruiterName: normalized.recruiterName || "N/A",
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

  const loadDuplicateConflicts = async () => {
    try {
      const data = await fetchDuplicateConflicts();
      setDuplicateConflicts(Array.isArray(data?.conflicts) ? data.conflicts : []);
    } catch (error) {
      setErrorMessage(error.message || "Failed to fetch duplicate conflicts.");
    }
  };

  useEffect(() => {
    loadAllResumes();
    loadDuplicateConflicts();
  }, []);

  const openDuplicateConflicts = async () => {
    await loadDuplicateConflicts();
    setShowDuplicateConflicts(true);
  };

  const handleConflictAssign = async (groupId, entry) => {
    setAssigningConflictResId(entry.resId);
    setErrorMessage("");
    try {
      await assignDuplicateConflict(groupId, entry.resId, entry.recruiterRid);
      setSuccessMessage(`Candidate assigned to ${entry.recruiterName}.`);
      await Promise.all([loadAllResumes(), loadDuplicateConflicts()]);
    } catch (error) {
      setErrorMessage(error.message || "Failed to assign duplicate conflict.");
    } finally {
      setAssigningConflictResId("");
    }
  };

  const handleResumeDelete = async (resume) => {
    const resId = String(resume?.resId || "").trim();
    if (!resId) {
      setErrorMessage("Resume ID is missing for this record.");
      setSuccessMessage("");
      return;
    }

    const candidateName =
      resume?.applicantName || resume?.candidateName || "Unknown candidate";
    const companyName = formatResumeCompanyDisplay(resume) || "Unknown company";
    const shouldDelete = window.confirm(
      `Delete this resume from the database?\n\nCandidate: ${candidateName}\nCompany: ${companyName}`,
    );

    if (!shouldDelete) return;

    setDeletingResId(resId);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const data = await adminDeleteResume(resId);
      await loadAllResumes();
      setSuccessMessage(data?.message || "Resume deleted successfully.");
    } catch (error) {
      setErrorMessage(error.message || "Failed to delete resume.");
    } finally {
      setDeletingResId("");
    }
  };

  const allResumes = useMemo(
    () => [...resumes, ...recruiterResumes],
    [recruiterResumes, resumes],
  );

  const sourceOptions = useMemo(
    () => [
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
    ],
    [recruiterResumes.length, totalCount],
  );

  const getResumeUrl = (resume) => {
    const token = getAuthSession()?.token;
    if (!token || !resume?.resId) return "";
    return `${API_BASE_URL}/api/admin/resumes/${encodeURIComponent(resume.resId)}/file?token=${encodeURIComponent(token)}`;
  };

  return (
    <AdminLayout
      title="All Submitted Resumes"
      subtitle="See resumes submitted by candidates and recruiters."
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
      {successMessage ? <div className="admin-alert">{successMessage}</div> : null}
      {errorMessage ? (
        <div className="admin-alert admin-alert-error">{errorMessage}</div>
      ) : null}

      <SubmittedResumesPanel
        resumes={allResumes}
        isLoading={isLoading}
        sourceOptions={sourceOptions}
        getResumeUrl={getResumeUrl}
        deletingResId={deletingResId}
        afterSourceActions={
          <button
            type="button"
            className="perf-timeline-btn duplicate-conflicts-btn"
            onClick={openDuplicateConflicts}
          >
            Duplicate Conflicts ({duplicateConflicts.length})
          </button>
        }
        renderRowActions={(resume) => (
          <button
            type="button"
            className="admin-refresh-btn admin-delete-btn"
            onClick={() => handleResumeDelete(resume)}
            disabled={deletingResId === resume.resId}
          >
            {deletingResId === resume.resId ? "Deleting..." : "Delete"}
          </button>
        )}
      />
      {showDuplicateConflicts ? (
        <div className="duplicate-conflicts-overlay" role="presentation">
          <section className="duplicate-conflicts-modal" role="dialog" aria-modal="true">
            <div className="duplicate-conflicts-head">
              <h2>Duplicate Conflicts</h2>
              <button type="button" className="admin-refresh-btn" onClick={() => setShowDuplicateConflicts(false)}>
                Close
              </button>
            </div>
            {!duplicateConflicts.length ? <p>No duplicate conflicts found.</p> : null}
            {duplicateConflicts.map((conflict) => (
              <div className="duplicate-conflict-card" key={conflict.duplicateGroupId}>
                <button
                  type="button"
                  className="duplicate-conflict-name"
                  onClick={() =>
                    setExpandedConflictId((current) =>
                      current === conflict.duplicateGroupId ? "" : conflict.duplicateGroupId,
                    )
                  }
                >
                  {conflict.candidateName} ({conflict.entries.length})
                </button>
                {expandedConflictId === conflict.duplicateGroupId ? (
                  <div className="duplicate-conflict-entries">
                    {conflict.entries.map((entry) => (
                      <div className="duplicate-conflict-entry" key={entry.resId}>
                        <div>
                          <strong>{entry.candidateName}</strong>
                          <span>{entry.submittedAt || "N/A"} IST</span>
                        </div>
                        <button
                          type="button"
                          className="admin-refresh-btn"
                          disabled={assigningConflictResId === entry.resId}
                          onClick={() => handleConflictAssign(conflict.duplicateGroupId, entry)}
                        >
                          {assigningConflictResId === entry.resId
                            ? "Assigning..."
                            : entry.recruiterName}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </section>
        </div>
      ) : null}
    </AdminLayout>
  );
}
