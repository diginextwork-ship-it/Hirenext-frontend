import { useEffect, useState } from "react";
import RecruiterMultiSelect from "./RecruiterMultiSelect";
import { getAuthSession } from "../../auth/session";
import {
  fetchJobAccess,
  fetchMyJobs,
  fetchRecruitersList,
  updateJobDetails,
} from "../../services/jobAccessService";

const createEmptyForm = () => ({
  city: "",
  state: "",
  pincode: "",
  company_name: "",
  role_name: "",
  positions_open: 1,
  revenue: "",
  points_per_joining: 0,
  skills: "",
  job_description: "",
  experience: "",
  salary: "",
  qualification: "",
  benefits: "",
  access_mode: "open",
  recruiterIds: [],
  accessNotes: "",
});

const toEditForm = (job) => ({
  city: job?.city || "",
  state: job?.state || "",
  pincode: job?.pincode || "",
  company_name: job?.company_name || "",
  role_name: job?.role_name || "",
  positions_open: Number(job?.positions_open) || 1,
  revenue: job?.revenue ?? "",
  points_per_joining: Number(job?.points_per_joining) || 0,
  skills: job?.skills || "",
  job_description: job?.job_description || "",
  experience: job?.experience || "",
  salary: job?.salary || "",
  qualification: job?.qualification || "",
  benefits: job?.benefits || "",
  access_mode:
    String(job?.access_mode || "open").trim().toLowerCase() === "restricted"
      ? "restricted"
      : "open",
  recruiterIds: [],
  accessNotes: "",
});

export default function TeamLeaderJobsPanel() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingJob, setEditingJob] = useState(null);
  const [form, setForm] = useState(createEmptyForm());
  const [allRecruiters, setAllRecruiters] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalMessage, setModalMessage] = useState("");

  const loadJobs = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchMyJobs();
      const authRid = String(getAuthSession()?.rid || "").trim();
      const nextJobs = Array.isArray(data?.jobs) ? data.jobs : [];
      setJobs(
        authRid
          ? nextJobs.filter(
              (job) => String(job?.recruiter_rid || "").trim() === authRid,
            )
          : nextJobs,
      );
    } catch (loadError) {
      setError(loadError.message || "Failed to fetch your jobs.");
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const openEditModal = async (job) => {
    setEditingJob(job);
    setForm(toEditForm(job));
    setModalError("");
    setModalMessage("");
    try {
      const [recruiterData, accessData] = await Promise.all([
        fetchRecruitersList(),
        fetchJobAccess(job.jid),
      ]);
      const recruiters = Array.isArray(recruiterData?.recruiters)
        ? recruiterData.recruiters
        : [];
      const accessRecruiters = Array.isArray(accessData?.recruiters)
        ? accessData.recruiters
        : [];
      setAllRecruiters(recruiters);
      setForm((prev) => ({
        ...prev,
        recruiterIds: accessRecruiters.map((item) => item.rid).filter(Boolean),
        accessNotes: accessRecruiters[0]?.notes || "",
      }));
    } catch (loadError) {
      setModalError(loadError.message || "Failed to load job edit details.");
      setAllRecruiters([]);
    }
  };

  const closeEditModal = () => {
    if (submitting) return;
    setEditingJob(null);
    setForm(createEmptyForm());
    setAllRecruiters([]);
    setModalError("");
    setModalMessage("");
  };

  return (
    <section className="ui-mt-md">
      <div className="ui-row-between ui-row-wrap">
        <h2 style={{ margin: 0 }}>My Jobs</h2>
        <button
          type="button"
          className="admin-refresh-btn"
          onClick={loadJobs}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error ? <p className="job-message job-message-error">{error}</p> : null}
      {loading ? <p className="chart-empty">Loading jobs...</p> : null}

      {!loading && jobs.length === 0 ? (
        <p className="chart-empty">No jobs found.</p>
      ) : null}

      {!loading && jobs.length > 0 ? (
        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            marginTop: 16,
          }}
        >
          {jobs.map((job) => {
            const location =
              [job.city, job.state, job.pincode].filter(Boolean).join(", ") || "N/A";
            return (
              <article key={job.jid} className="chart-card">
                <div className="ui-row-between ui-row-wrap" style={{ gap: 10 }}>
                  <div>
                    <div className="admin-muted">#{job.jid}</div>
                    <h3 style={{ margin: "4px 0 6px" }}>
                      {job.role_name || "Role"}
                    </h3>
                    <p className="admin-muted" style={{ margin: 0 }}>
                      {job.company_name || "Company"}
                    </p>
                  </div>
                </div>
                <div className="ui-mt-sm">
                  <p className="admin-muted" style={{ margin: "0 0 6px" }}>
                    Location: {location}
                  </p>
                  <p className="admin-muted" style={{ margin: "0 0 6px" }}>
                    Access: {job.access_mode === "restricted" ? "Restricted" : "Open"}
                  </p>
                  <p className="admin-muted" style={{ margin: 0 }}>
                    Positions: {Number(job.positions_open) || 1}
                  </p>
                </div>
                <button
                  type="button"
                  className="click-here-btn ui-mt-sm"
                  onClick={() => openEditModal(job)}
                >
                  Edit
                </button>
              </article>
            );
          })}
        </div>
      ) : null}

      {editingJob ? (
        <div
          className="admin-modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={closeEditModal}
        >
          <div
            className="admin-modal-card"
            style={{ width: "min(900px, 92vw)", maxHeight: "88vh", overflow: "auto" }}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>Edit Job #{editingJob.jid}</h3>

            <div className="job-form-grid">
              <div className="job-field">
                <label htmlFor="edit-job-company">Company Name *</label>
                <input
                  id="edit-job-company"
                  value={form.company_name}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, company_name: event.target.value }))
                  }
                  disabled={submitting}
                />
              </div>
              <div className="job-field">
                <label htmlFor="edit-job-role">Job Title *</label>
                <input
                  id="edit-job-role"
                  value={form.role_name}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, role_name: event.target.value }))
                  }
                  disabled={submitting}
                />
              </div>
              <div className="job-field">
                <label htmlFor="edit-job-positions">Positions Open *</label>
                <input
                  id="edit-job-positions"
                  type="number"
                  min="1"
                  value={form.positions_open}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, positions_open: event.target.value }))
                  }
                  disabled={submitting}
                />
              </div>
              <div className="job-field">
                <label htmlFor="edit-job-points">Points Per Joining *</label>
                <input
                  id="edit-job-points"
                  type="number"
                  min="0"
                  step="1"
                  value={form.points_per_joining}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      points_per_joining: event.target.value,
                    }))
                  }
                  disabled={submitting}
                />
              </div>
              <div className="job-field">
                <label htmlFor="edit-job-revenue">Revenue</label>
                <input
                  id="edit-job-revenue"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.revenue}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, revenue: event.target.value }))
                  }
                  disabled={submitting}
                />
              </div>
              <div className="job-field">
                <label htmlFor="edit-job-access">Access Mode *</label>
                <select
                  id="edit-job-access"
                  value={form.access_mode}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, access_mode: event.target.value }))
                  }
                  disabled={submitting}
                >
                  <option value="open">Open (All Recruiters)</option>
                  <option value="restricted">Restricted (Selected Recruiters Only)</option>
                </select>
              </div>
            </div>

            {form.access_mode === "restricted" ? (
              <div className="job-field">
                <label>Assign Recruiters</label>
                <RecruiterMultiSelect
                  allRecruiters={allRecruiters}
                  selectedRecruiters={form.recruiterIds}
                  onSelectionChange={(value) =>
                    setForm((prev) => ({ ...prev, recruiterIds: value }))
                  }
                />
                <label htmlFor="edit-job-access-notes">Assignment Notes</label>
                <textarea
                  id="edit-job-access-notes"
                  rows={2}
                  value={form.accessNotes}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, accessNotes: event.target.value }))
                  }
                  disabled={submitting}
                />
              </div>
            ) : null}

            <div className="job-field">
              <label htmlFor="edit-job-description">Job Description *</label>
              <textarea
                id="edit-job-description"
                rows={4}
                value={form.job_description}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    job_description: event.target.value,
                  }))
                }
                disabled={submitting}
              />
            </div>

            <div className="job-form-grid ui-mt-sm">
              <div className="job-field">
                <label htmlFor="edit-job-city">City</label>
                <input
                  id="edit-job-city"
                  value={form.city}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, city: event.target.value }))
                  }
                  disabled={submitting}
                />
              </div>
              <div className="job-field">
                <label htmlFor="edit-job-state">State</label>
                <input
                  id="edit-job-state"
                  value={form.state}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, state: event.target.value }))
                  }
                  disabled={submitting}
                />
              </div>
              <div className="job-field">
                <label htmlFor="edit-job-pincode">Pincode</label>
                <input
                  id="edit-job-pincode"
                  value={form.pincode}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, pincode: event.target.value }))
                  }
                  disabled={submitting}
                />
              </div>
              <div className="job-field">
                <label htmlFor="edit-job-experience">Experience</label>
                <input
                  id="edit-job-experience"
                  value={form.experience}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, experience: event.target.value }))
                  }
                  disabled={submitting}
                />
              </div>
              <div className="job-field">
                <label htmlFor="edit-job-salary">Salary</label>
                <input
                  id="edit-job-salary"
                  value={form.salary}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, salary: event.target.value }))
                  }
                  disabled={submitting}
                />
              </div>
              <div className="job-field">
                <label htmlFor="edit-job-qualification">Qualification</label>
                <input
                  id="edit-job-qualification"
                  value={form.qualification}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      qualification: event.target.value,
                    }))
                  }
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="job-field">
              <label htmlFor="edit-job-skills">Skills</label>
              <textarea
                id="edit-job-skills"
                rows={3}
                value={form.skills}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, skills: event.target.value }))
                }
                disabled={submitting}
              />
            </div>
            <div className="job-field">
              <label htmlFor="edit-job-benefits">Benefits</label>
              <textarea
                id="edit-job-benefits"
                rows={3}
                value={form.benefits}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, benefits: event.target.value }))
                }
                disabled={submitting}
              />
            </div>

            {modalError ? <p className="job-message job-message-error">{modalError}</p> : null}
            {modalMessage ? <p className="job-message job-message-success">{modalMessage}</p> : null}

            <div
              style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}
            >
              <button
                type="button"
                className="btn-secondary"
                onClick={closeEditModal}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={submitting}
                onClick={async () => {
                  setSubmitting(true);
                  setModalError("");
                  setModalMessage("");
                  try {
                    const data = await updateJobDetails(editingJob.jid, {
                      ...form,
                      positions_open: Number(form.positions_open) || 1,
                      points_per_joining: Number(form.points_per_joining) || 0,
                      recruiterIds:
                        form.access_mode === "restricted" ? form.recruiterIds : [],
                      accessNotes:
                        form.access_mode === "restricted" ? form.accessNotes : "",
                    });
                    setModalMessage(data?.message || "Job updated successfully.");
                    await loadJobs();
                    setEditingJob(null);
                  } catch (saveError) {
                    setModalError(saveError.message || "Failed to update job.");
                  } finally {
                    setSubmitting(false);
                  }
                }}
              >
                {submitting ? "Saving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
