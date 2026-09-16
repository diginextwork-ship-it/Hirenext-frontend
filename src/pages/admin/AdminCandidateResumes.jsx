import { useEffect, useMemo, useState } from "react";
import { getAuthSession } from "../../auth/session";
import AdminLayout from "./AdminLayout";
import {
  API_BASE_URL,
  adminDeleteResume,
  fetchAdminSubmittedResumes,
  exportAdminSubmittedResumes,
} from "./adminApi";
import { normalizeResumeData } from "../../utils/dashboardData";
import SubmittedResumesPanel from "../../components/common/SubmittedResumesPanel";

const SOURCE_FILTERS = {
  ALL: "all",
  CANDIDATE: "candidate",
  RECRUITER: "recruiter",
};

export default function AdminCandidateResumes({ setCurrentPage }) {
  const [resumes, setResumes] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [deletingResId, setDeletingResId] = useState("");

  const loadAllResumes = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const data = await fetchAdminSubmittedResumes({ limit: 5000 });
      const rawResumes = Array.isArray(data?.resumes) ? data.resumes : [];

      setResumes(
        rawResumes.map((item) => {
          const normalized = normalizeResumeData(item);
          const cleanCompanyName =
            item.companyName || normalized.companyName || normalized.job?.companyName || "N/A";
          const cleanCity =
            item.officeLocationCity || item.city || normalized.officeLocationCity || normalized.city || normalized.job?.city || "N/A";

          return {
            ...normalized,
            applicantName:
              normalized.applicantName ||
              normalized.candidateName ||
              normalized.name ||
              "N/A",
            // Keep pure company name without office city appended to prevent search/filter leakage
            companyName: cleanCompanyName,
            job: {
              ...normalized.job,
              companyName: cleanCompanyName,
            },
            city: cleanCity,
            officeLocationCity: item.officeLocationCity || normalized.officeLocationCity || null,
            atsScore:
              normalized.atsScore ?? item.atsScore ?? item.ats_score ?? null,
            _source: item._source || (item.source === "candidate" ? "candidate" : "recruiter"),
            _recruiterName: item._recruiterName || item.recruiterName || normalized.recruiterName || "N/A",
          };
        }),
      );
      setTotalCount(Number(data?.totalCount) || rawResumes.length);
    } catch (error) {
      setResumes([]);
      setTotalCount(0);
      setErrorMessage(
        error.message || "Failed to fetch submitted resumes.",
      );
    } finally {
      setIsLoading(false);
    }
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
    const companyName = resume?.companyName || "Unknown company";
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

  const sourceOptions = useMemo(() => {
    const candidateCount = resumes.filter((r) => r._source === "candidate").length;
    const recruiterCount = resumes.filter((r) => r._source !== "candidate").length;
    return [
      {
        key: SOURCE_FILTERS.ALL,
        label: "All",
        count: resumes.length,
      },
      {
        key: SOURCE_FILTERS.CANDIDATE,
        label: "Candidate",
        count: candidateCount,
      },
      {
        key: SOURCE_FILTERS.RECRUITER,
        label: "Recruiter",
        count: recruiterCount,
      },
    ];
  }, [resumes]);

  const getResumeUrl = (resume) => {
    const token = getAuthSession()?.token;
    if (!token || !resume?.resId) return "";
    return `${API_BASE_URL}/api/admin/resumes/${encodeURIComponent(resume.resId)}/file?token=${encodeURIComponent(token)}`;
  };

  const handleDownloadExcel = async (activeFilters) => {
    return await exportAdminSubmittedResumes(activeFilters);
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
        resumes={resumes}
        isLoading={isLoading}
        sourceOptions={sourceOptions}
        getResumeUrl={getResumeUrl}
        deletingResId={deletingResId}
        onDownloadExcel={handleDownloadExcel}
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
