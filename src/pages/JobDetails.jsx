import { useEffect, useMemo, useState } from "react";
import PageBackButton from "../components/PageBackButton";
import "../styles/job-details.css";
import { fetchJobsFromApi, readStoredJob, storeSelectedJob } from "../utils/jobSearch";

const formatPostedLabel = (postedAt) => {
  if (!postedAt) return "Recently posted";

  const parsed = new Date(postedAt);
  if (Number.isNaN(parsed.getTime())) return "Recently posted";

  return `Posted on ${parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
};

export default function JobDetails({ setCurrentPage, routeJobId }) {
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let isActive = true;

    const loadJobs = async () => {
      setIsLoading(true);
      setLoadError("");

      try {
        const nextJobs = await fetchJobsFromApi();
        if (!isActive) return;
        setJobs(nextJobs);
      } catch (error) {
        if (!isActive) return;
        setLoadError(error.message || "Unable to load this job right now.");
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadJobs();
    return () => {
      isActive = false;
    };
  }, []);

  const selectedJob = useMemo(() => {
    const matchedJob = jobs.find((job) => job.id === routeJobId);
    if (matchedJob) return matchedJob;

    const storedJob = readStoredJob();
    if (storedJob?.id === routeJobId) return storedJob;

    return null;
  }, [jobs, routeJobId]);

  useEffect(() => {
    if (selectedJob) {
      storeSelectedJob(selectedJob);
    }
  }, [selectedJob]);

  const handleApplyNow = () => {
    if (!selectedJob) return;
    storeSelectedJob(selectedJob);
    setCurrentPage("applyjob", { jobId: selectedJob.id });
  };

  return (
    <main className="job-details-page ui-page">
      <section className="job-details-shell ui-shell">
        <div className="ui-page-back">
          <PageBackButton setCurrentPage={setCurrentPage} fallbackPage="jobs" />
        </div>

        {isLoading ? (
          <section className="job-details-state-card">
            <h1>Loading job details...</h1>
            <p>Please wait while we fetch the role information.</p>
          </section>
        ) : loadError ? (
          <section className="job-details-state-card">
            <h1>Unable to load this job</h1>
            <p>{loadError}</p>
          </section>
        ) : !selectedJob ? (
          <section className="job-details-state-card">
            <h1>Job not found</h1>
            <p>This role may have been removed or the link is incomplete.</p>
          </section>
        ) : (
          <>
            <section className="job-details-hero">
              <div className="job-details-hero-main">
                <span className="job-details-company-chip">{selectedJob.company}</span>
                <h1>{selectedJob.title}</h1>
                <p className="job-details-location">{selectedJob.location}</p>
                <div className="job-details-meta-row">
                  <span>{selectedJob.salary}</span>
                  <span>{selectedJob.experience}</span>
                  <span>{selectedJob.type}</span>
                  <span>{selectedJob.positionsOpen} openings</span>
                </div>
              </div>

              <aside className="job-details-hero-side">
                <p className="job-details-posted">{formatPostedLabel(selectedJob.postedAt)}</p>
                <button
                  type="button"
                  className="job-details-apply-btn ui-btn-primary"
                  onClick={handleApplyNow}
                >
                  Apply now
                </button>
              </aside>
            </section>

            <section className="job-details-content">
              <div className="job-details-main">
                <article className="job-details-panel">
                  <h2>Job description</h2>
                  <p>{selectedJob.description}</p>
                </article>

                <article className="job-details-panel">
                  <h2>Key skills</h2>
                  {selectedJob.tags.length ? (
                    <div className="job-details-tag-list">
                      {selectedJob.tags.map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                  ) : (
                    <p>No skills listed for this job yet.</p>
                  )}
                </article>

                <article className="job-details-panel">
                  <h2>Benefits and extras</h2>
                  {selectedJob.benefits.length ? (
                    <div className="job-details-bullet-list">
                      {selectedJob.benefits.map((benefit) => (
                        <span key={benefit}>{benefit}</span>
                      ))}
                    </div>
                  ) : (
                    <p>Benefits have not been specified for this role.</p>
                  )}
                </article>
              </div>

              <aside className="job-details-sidebar">
                <article className="job-details-panel">
                  <h2>Role overview</h2>
                  <div className="job-details-overview-grid">
                    <div>
                      <span>Company</span>
                      <strong>{selectedJob.company}</strong>
                    </div>
                    <div>
                      <span>Location</span>
                      <strong>{selectedJob.location}</strong>
                    </div>
                    <div>
                      <span>Experience</span>
                      <strong>{selectedJob.experience}</strong>
                    </div>
                    <div>
                      <span>Qualification</span>
                      <strong>{selectedJob.type}</strong>
                    </div>
                    <div>
                      <span>Salary</span>
                      <strong>{selectedJob.salary}</strong>
                    </div>
                    <div>
                      <span>Openings</span>
                      <strong>{selectedJob.positionsOpen}</strong>
                    </div>
                  </div>
                </article>

                <article className="job-details-panel job-details-cta-panel">
                  <h2>Interested in this role?</h2>
                  <p>Complete the application form and share your resume to continue.</p>
                  <button
                    type="button"
                    className="job-details-apply-btn ui-btn-primary"
                    onClick={handleApplyNow}
                  >
                    Apply now
                  </button>
                </article>
              </aside>
            </section>
          </>
        )}
      </section>
    </main>
  );
}
