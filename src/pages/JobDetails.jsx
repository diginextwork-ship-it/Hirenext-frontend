import { useEffect, useMemo, useState } from "react";
import { Building, MapPin, IndianRupee, Briefcase, Calendar, Users, CheckCircle2, ArrowRight, Sparkles, Share2, Award, Zap } from "lucide-react";
import PageBackButton from "../components/PageBackButton";
import "../styles/job-details.css";
import { fetchJobsFromApi, readStoredJob, storeSelectedJob } from "../utils/jobSearch";

const formatSalaryText = (value) => {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "";
  if (normalized.includes("$")) {
    return normalized.replace(/\$/g, "₹");
  }
  if (/^\d+(\.\d+)?$/.test(normalized)) {
    return `₹${Number(normalized).toLocaleString("en-IN")}`;
  }
  return normalized;
};

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
  const [copied, setCopied] = useState(false);

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

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <main className="job-details-page ui-page">
      <section className="job-details-shell ui-shell">
        <div className="ui-page-back">
          <PageBackButton setCurrentPage={setCurrentPage} fallbackPage="jobs" />
        </div>

        {isLoading ? (
          <section className="job-details-state-card glass-card">
            <div className="loading-spinner" />
            <h1>Fetching Role Information...</h1>
          </section>
        ) : loadError ? (
          <section className="job-details-state-card glass-card error">
            <h1>Unable to load job details</h1>
            <p>{loadError}</p>
          </section>
        ) : !selectedJob ? (
          <section className="job-details-state-card glass-card">
            <h1>Job Posting Not Found</h1>
            <p>This posting may have expired or been removed by the recruiter.</p>
          </section>
        ) : (
          <>
            {/* Header Hero Banner */}
            <section className="job-details-hero glass-card">
              <div className="job-details-hero-main">
                <div className="hero-company-row">
                  <div className="company-logo-box">
                    <Building size={24} />
                  </div>
                  <span className="job-details-company-chip">{selectedJob.company}</span>
                </div>
                <h1>{selectedJob.title}</h1>

                <div className="job-details-meta-row">
                  <span className="meta-badge"><MapPin size={15} /> {selectedJob.location}</span>
                  <span className="meta-badge salary"><IndianRupee size={15} /> {formatSalaryText(selectedJob.salary)}</span>
                  <span className="meta-badge"><Briefcase size={15} /> {selectedJob.experience}</span>
                  <span className="meta-badge"><Users size={15} /> {selectedJob.positionsOpen} Openings</span>
                </div>
              </div>

              <aside className="job-details-hero-side">
                <span className="job-details-posted">
                  <Calendar size={14} />
                  {formatPostedLabel(selectedJob.postedAt)}
                </span>
                <div className="action-buttons-group">
                  <button
                    type="button"
                    className="btn btn-primary btn-hero-apply"
                    onClick={handleApplyNow}
                  >
                    <span>Apply Now</span>
                    <ArrowRight size={18} />
                  </button>
                  <button
                    type="button"
                    className="btn-share"
                    onClick={handleShare}
                    title="Copy Job Link"
                  >
                    <Share2 size={18} />
                    {copied && <span className="tooltip-copied">Copied!</span>}
                  </button>
                </div>
              </aside>
            </section>

            <section className="job-details-content">
              {/* Main Content Details */}
              <div className="job-details-main">
                <article className="job-details-panel glass-card">
                  <h2><Sparkles size={20} className="section-title-icon" /> Role Overview & Description</h2>
                  <p className="description-text">{selectedJob.description}</p>
                </article>

                <article className="job-details-panel glass-card">
                  <h2><Zap size={20} className="section-title-icon" /> Required Key Skills</h2>
                  {selectedJob.tags.length ? (
                    <div className="job-details-tag-list">
                      {selectedJob.tags.map((tag) => (
                        <span key={tag} className="tag-chip">{tag}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="muted-text">No specific skill keywords listed.</p>
                  )}
                </article>

                <article className="job-details-panel glass-card">
                  <h2><Award size={20} className="section-title-icon" /> Compensation & Benefits</h2>
                  {selectedJob.benefits.length ? (
                    <div className="job-details-bullet-list">
                      {selectedJob.benefits.map((benefit) => (
                        <div key={benefit} className="benefit-item">
                          <CheckCircle2 size={16} className="check-icon" />
                          <span>{benefit}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="muted-text">Standard employer benefits apply.</p>
                  )}
                </article>
              </div>

              {/* Sidebar Snapshot */}
              <aside className="job-details-sidebar">
                <article className="job-details-panel glass-card">
                  <h3>Job Specifications</h3>
                  <div className="job-details-overview-grid">
                    <div className="overview-item">
                      <span>Employer</span>
                      <strong>{selectedJob.company}</strong>
                    </div>
                    <div className="overview-item">
                      <span>Location</span>
                      <strong>{selectedJob.location}</strong>
                    </div>
                    <div className="overview-item">
                      <span>Experience</span>
                      <strong>{selectedJob.experience}</strong>
                    </div>
                    <div className="overview-item">
                      <span>Employment Type</span>
                      <strong>{selectedJob.type}</strong>
                    </div>
                    <div className="overview-item">
                      <span>Offered CTC</span>
                      <strong className="salary-highlight">{selectedJob.salary}</strong>
                    </div>
                    <div className="overview-item">
                      <span>Open Positions</span>
                      <strong>{selectedJob.positionsOpen} seat(s)</strong>
                    </div>
                  </div>
                </article>

                <article className="job-details-panel glass-card cta-box">
                  <h3>Ready to Take the Next Step?</h3>
                  <p>Submit your profile directly to the hiring manager and get instant application tracking.</p>
                  <button
                    type="button"
                    className="btn btn-primary w-full"
                    onClick={handleApplyNow}
                  >
                    Submit Application
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

