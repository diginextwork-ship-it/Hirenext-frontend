import { useEffect, useMemo, useState } from "react";
import JobCard from "./JobCard";
import ResumeSubmissionModal from "./ResumeSubmissionModal";
import SearchFilters from "./SearchFilters";
import {
  fetchAccessibleJobs,
  updateJobDetails,
} from "../../services/jobAccessService";

const PAGE_SIZE = 12;

const createEditForm = (job = null) => ({
  company_name: job?.company_name || "",
  role_name: job?.role_name || "",
  city: job?.city || "",
  state: job?.state || "",
  pincode: job?.pincode || "",
  positions_open: Number(job?.positions_open) || 1,
  experience: job?.experience || "",
  salary: job?.salary || "",
  qualification: job?.qualification || "",
  skills: job?.skills || "",
  job_description: job?.job_description || "",
  benefits: job?.benefits || "",
});

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

const formatSalaryText = (value) => {
  const normalized = toDisplayText(value);
  if (!normalized) return "";
  if (normalized.includes("$")) {
    return normalized.replace(/\$/g, "₹");
  }
  if (/^\d+(\.\d+)?$/.test(normalized)) {
    return `₹${Number(normalized).toLocaleString("en-IN")}`;
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
    ["Salary", formatSalaryText(job?.salary)],
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

export default function RecruiterJobsBoard({
  recruiterId,
  onResumeSubmitted,
  canEditJobs = false,
  refreshKey = 0,
}) {
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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [editForm, setEditForm] = useState(() => createEditForm());
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

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
  }, [recruiterId, filters.location, filters.company, filters.search, offset, refreshKey]);

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

  const openEditModal = (job) => {
    setEditingJob(job || null);
    setEditForm(createEditForm(job));
    setEditError("");
    setIsEditModalOpen(true);
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

  const closeEditModal = () => {
    if (isEditSaving) return;
    setIsEditModalOpen(false);
    setEditingJob(null);
    setEditForm(createEditForm());
    setEditError("");
  };

  const handleSubmitFromDetails = () => {
    if (!activeJob?.jid) return;
    setIsDetailsModalOpen(false);
    openSubmitModal(activeJob.jid);
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveEdit = async () => {
    if (!editingJob?.jid) return;
    setIsEditSaving(true);
    setEditError("");
    try {
      const updated = await updateJobDetails(editingJob.jid, {
        ...editForm,
        positions_open: Number(editForm.positions_open) || 1,
      });
      const nextJob = updated?.job || {
        ...(editingJob || {}),
        ...editForm,
        positions_open: Number(editForm.positions_open) || 1,
      };
      setJobs((prev) =>
        prev.map((job) =>
          String(job?.jid) === String(editingJob.jid) ? nextJob : job,
        ),
      );
      setActiveJob((prev) =>
        prev && String(prev?.jid) === String(editingJob.jid) ? nextJob : prev,
      );
      setIsEditModalOpen(false);
      setEditingJob(null);
    } catch (error) {
      setEditError(error.message || "Failed to update job.");
    } finally {
      setIsEditSaving(false);
    }
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
            <JobCard
              key={job.jid}
              job={job}
              onViewDetails={openDetailsModal}
              onEditDetails={canEditJobs ? openEditModal : undefined}
            />
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
              {formatSalaryText(activeJob.salary) ? (
                <span className="job-detail-meta-chip">
                  {formatSalaryText(activeJob.salary)}
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

      {isEditModalOpen && editingJob ? (
        <div
          className="job-details-modal-overlay"
          role="presentation"
          onClick={closeEditModal}
        >
          <div
            className="job-details-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="job-edit-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="job-details-modal-header">
              <div>
                <h2 id="job-edit-modal-title">
                  Edit {editingJob.role_name || "Job"}
                </h2>
                {editingJob.company_name ? (
                  <p className="job-detail-company">{editingJob.company_name}</p>
                ) : null}
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={closeEditModal}
                disabled={isEditSaving}
              >
                Close
              </button>
            </div>

            <div className="job-form-grid ui-mt-sm">
              <div className="job-field">
                <label htmlFor="edit-job-company">Company</label>
                <input
                  id="edit-job-company"
                  name="company_name"
                  value={editForm.company_name}
                  onChange={handleEditChange}
                  disabled={isEditSaving}
                />
              </div>
              <div className="job-field">
                <label htmlFor="edit-job-role">Role</label>
                <input
                  id="edit-job-role"
                  name="role_name"
                  value={editForm.role_name}
                  onChange={handleEditChange}
                  disabled={isEditSaving}
                />
              </div>
              <div className="job-field">
                <label htmlFor="edit-job-city">City</label>
                <input
                  id="edit-job-city"
                  name="city"
                  value={editForm.city}
                  onChange={handleEditChange}
                  disabled={isEditSaving}
                />
              </div>
              <div className="job-field">
                <label htmlFor="edit-job-state">State</label>
                <input
                  id="edit-job-state"
                  name="state"
                  value={editForm.state}
                  onChange={handleEditChange}
                  disabled={isEditSaving}
                />
              </div>
              <div className="job-field">
                <label htmlFor="edit-job-pincode">Pincode</label>
                <input
                  id="edit-job-pincode"
                  name="pincode"
                  value={editForm.pincode}
                  onChange={handleEditChange}
                  disabled={isEditSaving}
                />
              </div>
              <div className="job-field">
                <label htmlFor="edit-job-positions">Positions Open</label>
                <input
                  id="edit-job-positions"
                  name="positions_open"
                  type="number"
                  min="1"
                  value={editForm.positions_open}
                  onChange={handleEditChange}
                  disabled={isEditSaving}
                />
              </div>
            </div>

            <div className="job-field">
              <label htmlFor="edit-job-description">Job Description</label>
              <textarea
                id="edit-job-description"
                name="job_description"
                rows={4}
                value={editForm.job_description}
                onChange={handleEditChange}
                disabled={isEditSaving}
              />
            </div>

            <div className="job-form-grid ui-mt-sm">
              <div className="job-field">
                <label htmlFor="edit-job-experience">Experience</label>
                <input
                  id="edit-job-experience"
                  name="experience"
                  value={editForm.experience}
                  onChange={handleEditChange}
                  disabled={isEditSaving}
                />
              </div>
              <div className="job-field">
                <label htmlFor="edit-job-salary">Salary</label>
                <input
                  id="edit-job-salary"
                  name="salary"
                  value={editForm.salary}
                  onChange={handleEditChange}
                  disabled={isEditSaving}
                />
              </div>
              <div className="job-field">
                <label htmlFor="edit-job-qualification">Qualification</label>
                <input
                  id="edit-job-qualification"
                  name="qualification"
                  value={editForm.qualification}
                  onChange={handleEditChange}
                  disabled={isEditSaving}
                />
              </div>
            </div>

            <div className="job-field">
              <label htmlFor="edit-job-skills">Skills</label>
              <textarea
                id="edit-job-skills"
                name="skills"
                rows={3}
                value={editForm.skills}
                onChange={handleEditChange}
                disabled={isEditSaving}
              />
            </div>

            <div className="job-field">
              <label htmlFor="edit-job-benefits">Benefits</label>
              <textarea
                id="edit-job-benefits"
                name="benefits"
                rows={3}
                value={editForm.benefits}
                onChange={handleEditChange}
                disabled={isEditSaving}
              />
            </div>

            {editError ? <p className="job-message job-message-error">{editError}</p> : null}

            <div className="job-details-modal-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={handleSaveEdit}
                disabled={isEditSaving}
              >
                {isEditSaving ? "Saving..." : "Save Changes"}
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
