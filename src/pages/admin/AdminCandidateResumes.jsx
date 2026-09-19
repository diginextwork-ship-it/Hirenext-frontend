import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const [filteredCount, setFilteredCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [deletingResId, setDeletingResId] = useState("");
  const [activeParams, setActiveParams] = useState({});
  const activeParamsRef = useRef(activeParams);
  activeParamsRef.current = activeParams;
  const initialLoadDone = useRef(false);

  const loadResumes = useCallback(async (params = {}) => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const data = await fetchAdminSubmittedResumes({
        limit: 500,
        ...params,
      });
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
      setFilteredCount(Number(data?.filteredCount) || rawResumes.length);
    } catch (error) {
      setResumes([]);
      setTotalCount(0);
      setFilteredCount(0);
      setErrorMessage(
        error.message || "Failed to fetch submitted resumes.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadResumes({});
    initialLoadDone.current = true;
  }, [loadResumes]);

  const handleQueryChange = useCallback((newParams) => {
    setActiveParams(newParams);
  }, []);

  // Debounced search on activeParams change (skip first trigger on mount)
  useEffect(() => {
    if (!initialLoadDone.current) return;
    const timer = setTimeout(() => {
      loadResumes(activeParams);
    }, 300);
    return () => clearTimeout(timer);
  }, [activeParams, loadResumes]);

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
      await loadResumes(activeParamsRef.current);
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
        count: totalCount || resumes.length,
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
  }, [resumes, totalCount]);

  const getResumeUrl = (resume) => {
    const token = getAuthSession()?.token;
    if (!token || !resume?.resId) return "";
    return `${API_BASE_URL}/api/admin/resumes/${encodeURIComponent(resume.resId)}/file?token=${encodeURIComponent(token)}`;
  };

  const handleDownloadExcel = async (activeFilters) => {
    return await exportAdminSubmittedResumes({
      ...activeParamsRef.current,
      ...activeFilters,
    });
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
          onClick={() => loadResumes(activeParamsRef.current)}
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
        onQueryChange={handleQueryChange}
        serverTotalCount={totalCount}
        serverFilteredCount={filteredCount}
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
