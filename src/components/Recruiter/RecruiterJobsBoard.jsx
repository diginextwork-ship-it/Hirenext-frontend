import { useEffect, useMemo, useState } from "react";
import JobCard from "./JobCard";
import ResumeSubmissionModal from "./ResumeSubmissionModal";
import SearchFilters from "./SearchFilters";
import { fetchAccessibleJobs } from "../../services/jobAccessService";

const PAGE_SIZE = 12;

const toDisplayText = (value) => {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "";
  if (["n/a", "na", "not specified"].includes(normalized.toLowerCase())) {
    return "";
  }
  if (normalized === "000000") {
    return "";
  }
  return normalized;
};

const splitList = (value) =>
  String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const formatDate = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const buildDetailRows = (job) => {
  const location = [
    toDisplayText(job?.city),
    toDisplayText(job?.state),
    toDisplayText(job?.pincode),
  ]
    .filter(Boolean)
    .join(", ");

  const rows = [
    ["Job ID", toDisplayText(job?.jid)],
    ["Company", toDisplayText(job?.company_name)],
    ["Role", toDisplayText(job?.role_name)],
    ["Access", toDisplayText(job?.access_mode)],
    ["Location", location],
    ["Salary", toDisplayText(job?.salary)],
    [
      "Positions Open",
      Number(job?.positions_open) > 0 ? String(Number(job.positions_open)) : "",
    ],
    ["Experience", toDisplayText(job?.experience)],
    ["Qualification", toDisplayText(job?.qualification)],
    ["Posted On", formatDate(job?.created_at)],
  ];

  return rows.filter(([, value]) => value);
};

export default function RecruiterJobsBoard({ recruiterId, onResumeSubmitted }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [filters, setFilters] = useState({
    location: "",
    company: "",
    search: "",
  });
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [activeJobId, setActiveJobId] = useState(null);
  const [activeJob, setActiveJob] = useState(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / PAGE_SIZE)),
    [total],
  );
  const currentPage = useMemo(
    () => Math.floor(offset / PAGE_SIZE) + 1,
    [offset],
  );

  useEffect(() => {
    setOffset(0);
  }, [filters.location, filters.company, filters.search]);

  useEffect(() => {
    if (!recruiterId) return;
    let active = true;

    const loadJobs = async () => {
      setLoading(true);
      setErrorMessage("");
      try {
        const data = await fetchAccessibleJobs(recruiterId, {
          location: filters.location,
          company: filters.company,
          search: filters.search,
          limit: PAGE_SIZE,
          offset,
        });
        if (!active) return;
        setJobs(Array.isArray(data.jobs) ? data.jobs : []);
        setTotal(Number(data.total) || 0);
      } catch (error) {
        if (!active) return;
        setErrorMessage(error.message || "Failed to fetch jobs.");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadJobs();
    return () => {
      active = false;
    };
  }, [recruiterId, filters.location, filters.company, filters.search, offset]);

  const openSubmitModal = (jobId) => {
    const selectedJob =
      jobs.find((job) => String(job?.jid) === String(jobId)) || null;
    setActiveJobId(jobId);
    setActiveJob(selectedJob);
    setIsSubmitModalOpen(true);
  };

  const openDetailsModal = (job) => {
    setActiveJob(job || null);
    setIsDetailsModalOpen(true);
  };

  const closeDetailsModal = () => {
    setIsDetailsModalOpen(false);
    if (!isSubmitModalOpen) {
      setActiveJob(null);
    }
  };

  const closeSubmitModal = () => {
    setIsSubmitModalOpen(false);
    setActiveJobId(null);
    if (!isDetailsModalOpen) {
      setActiveJob(null);
    }
  };

  const handleSubmitFromDetails = () => {
    if (!activeJob?.jid) return;
    setIsDetailsModalOpen(false);
    openSubmitModal(activeJob.jid);
  };

  const handleRefreshJobs = async () => {
    if (!recruiterId) return;
    setLoading(true);
    setErrorMessage("");
    try {
      const data = await fetchAccessibleJobs(recruiterId, {
        location: filters.location,
        company: filters.company,
        search: filters.search,
        limit: PAGE_SIZE,
        offset,
      });
      setJobs(Array.isArray(data.jobs) ? data.jobs : []);
      setTotal(Number(data.total) || 0);
    } catch (error) {
      setErrorMessage(error.message || "Failed to fetch jobs.");
    } finally {
      setLoading(false);
    }
  };

  const detailRows = useMemo(
    () => (activeJob ? buildDetailRows(activeJob) : []),
    [activeJob],
  );
  const activeSkills = useMemo(
    () => (activeJob ? splitList(activeJob.skills) : []),
    [activeJob],
  );

  return (
    <section className="recruiter-jobs-board">
      <div className="recruiter-jobs-board-head">
        <div className="ui-row-between ui-row-wrap">
          <h2>Available Jobs</h2>
          <button
            type="button"
            className="click-here-btn"
            onClick={handleRefreshJobs}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
        <p>
          Showing {jobs.length} of {total} accessible jobs.
        </p>
      </div>

      <SearchFilters filters={filters} onFilterChange={setFilters} />

      {loading ? <p className="chart-empty">Loading jobs...</p> : null}
      {errorMessage ? (
        <p className="job-message job-message-error">{errorMessage}</p>
      ) : null}

      {!loading && !errorMessage && jobs.length === 0 ? (
        <p className="chart-empty">No jobs available matching your criteria.</p>
      ) : null}

      {!loading && jobs.length > 0 ? (
        <div className="recruiter-jobs-grid">
          {jobs.map((job) => (
            <JobCard key={job.jid} job={job} onViewDetails={openDetailsModal} />
          ))}
        </div>
      ) : null}

      {total > PAGE_SIZE ? (
        <div className="recruiter-pagination">
          <button
            type="button"
            className="btn-secondary"
            disabled={currentPage <= 1}
            onClick={() => setOffset((prev) => Math.max(prev - PAGE_SIZE, 0))}
          >
            Previous
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            className="btn-secondary"
            disabled={currentPage >= totalPages}
            onClick={() => setOffset((prev) => prev + PAGE_SIZE)}
          >
            Next
          </button>
        </div>
      ) : null}

      {isDetailsModalOpen && activeJob ? (
        <div
          className="job-details-modal-overlay"
          role="presentation"
          onClick={closeDetailsModal}
        >
          <div
            className="job-details-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="job-details-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="job-details-modal-header">
              <div>
                <h2 id="job-details-modal-title">
                  {toDisplayText(activeJob.role_name) || "Untitled Role"}
                </h2>
                {toDisplayText(activeJob.company_name) ? (
                  <p className="job-detail-company">
                    {toDisplayText(activeJob.company_name)}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={closeDetailsModal}
              >
                Close
              </button>
            </div>

            <div className="job-detail-top-meta">
              {[
                toDisplayText(activeJob.city),
                toDisplayText(activeJob.state),
                toDisplayText(activeJob.pincode),
              ]
                .filter(Boolean)
                .join(", ") ? (
                <span className="job-detail-meta-chip">
                  {[
                    toDisplayText(activeJob.city),
                    toDisplayText(activeJob.state),
                    toDisplayText(activeJob.pincode),
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              ) : null}
              {toDisplayText(activeJob.salary) ? (
                <span className="job-detail-meta-chip">
                  {toDisplayText(activeJob.salary)}
                </span>
              ) : null}
              {Number(activeJob.positions_open) ? (
                <span className="job-detail-meta-chip">
                  {Number(activeJob.positions_open)} positions
                </span>
              ) : null}
              {toDisplayText(activeJob.experience) ? (
                <span className="job-detail-meta-chip">
                  {toDisplayText(activeJob.experience)}
                </span>
              ) : null}
              {toDisplayText(activeJob.qualification) ? (
                <span className="job-detail-meta-chip">
                  {toDisplayText(activeJob.qualification)}
                </span>
              ) : null}
            </div>

            {detailRows.length ? (
              <section className="job-detail-section">
                <h3>Job Details</h3>
                <div className="job-detail-info-grid">
                  {detailRows.map(([label, value]) => (
                    <div key={label} className="job-detail-info-item">
                      <span className="job-detail-info-label">{label}</span>
                      <strong className="job-detail-info-value">{value}</strong>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {toDisplayText(activeJob.job_description) ? (
              <section className="job-detail-section">
                <h3>Job Description</h3>
                <p className="job-description-text">
                  {toDisplayText(activeJob.job_description)}
                </p>
              </section>
            ) : null}

            {activeSkills.length ? (
              <section className="job-detail-section">
                <h3>Skills</h3>
                <div className="job-skills">
                  {activeSkills.map((skill) => (
                    <span key={skill} className="skill-tag">
                      {skill}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            {toDisplayText(activeJob.benefits) ? (
              <section className="job-detail-section">
                <h3>Benefits</h3>
                <p className="job-description-text">
                  {toDisplayText(activeJob.benefits)}
                </p>
              </section>
            ) : null}

            {formatDate(activeJob.created_at) ? (
              <p className="job-footer">Posted {formatDate(activeJob.created_at)}</p>
            ) : null}

            <div className="job-details-modal-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={handleSubmitFromDetails}
              >
                Submit Resume
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ResumeSubmissionModal
        recruiterId={recruiterId}
        jobId={activeJobId}
        job={activeJob}
        isOpen={isSubmitModalOpen}
        onClose={closeSubmitModal}
        onSuccess={onResumeSubmitted}
      />
    </section>
  );
}
