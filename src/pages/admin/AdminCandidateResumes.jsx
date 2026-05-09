import { useEffect, useMemo, useState } from "react";
import { getAuthSession } from "../../auth/session";
import AdminLayout from "./AdminLayout";
import {
  API_BASE_URL,
  adminDeleteResume,
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

  useEffect(() => {
    loadAllResumes();
  }, []);

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
    </AdminLayout>
  );
}
