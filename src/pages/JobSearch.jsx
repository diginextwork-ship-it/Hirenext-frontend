import { useEffect, useMemo, useState } from "react";
import "../styles/job-search.css";
import PageBackButton from "../components/PageBackButton";
import { fetchJobsFromApi, storeSelectedJob } from "../utils/jobSearch";

export default function JobSearch({ setCurrentPage }) {
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");

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
        setLoadError(error.message || "Unable to load jobs right now.");
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

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const normalizedQuery = searchQuery.toLowerCase();
      const normalizedLocation = locationQuery.toLowerCase();
      const matchesQuery =
        !normalizedQuery ||
        job.title.toLowerCase().includes(normalizedQuery) ||
        job.company.toLowerCase().includes(normalizedQuery) ||
        job.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery));
      const matchesLocation =
        !normalizedLocation || job.location.toLowerCase().includes(normalizedLocation);

      return matchesQuery && matchesLocation;
    });
  }, [jobs, searchQuery, locationQuery]);

  const handleOpenJob = (job) => {
    storeSelectedJob(job);
    setCurrentPage("jobdetail", { jobId: job.id });
  };

  return (
    <main className="job-search-page ui-page">
      <section className="job-search-shell ui-shell">
        <div className="ui-page-back">
          <PageBackButton setCurrentPage={setCurrentPage} />
        </div>

        <section className="job-search-hero">
          <div>
            <span className="job-search-kicker">Search All Jobs</span>
            <h1>Find the next role that fits you best</h1>
            <p>
              Explore active openings, compare hiring details quickly, and open the
              full job page before you apply.
            </p>
          </div>
        </section>

        <div className="job-search-topbar">
          <div className="search-field">
            <span className="search-label">Skills / Designation / Company</span>
            <input
              type="text"
              placeholder="Search jobs, companies, or keywords"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>

          <div className="search-divider" />

          <div className="search-field">
            <span className="search-label">Location</span>
            <input
              type="text"
              placeholder="Enter city or state"
              value={locationQuery}
              onChange={(event) => setLocationQuery(event.target.value)}
            />
          </div>

          <div className="search-divider" />

          <button type="button" className="job-search-btn ui-btn-primary">
            Search
          </button>
        </div>

        <section className="job-results-panel">
          <div className="job-results-header">
            <div>
              <h2>Recommended openings</h2>
              <p>Click any card to open the full job details page.</p>
            </div>
            <span className="job-results-count">{filteredJobs.length} jobs</span>
          </div>

          {isLoading ? (
            <div className="empty-results">
              <p>Loading jobs...</p>
            </div>
          ) : loadError ? (
            <div className="empty-results">
              <p>{loadError}</p>
            </div>
          ) : filteredJobs.length ? (
            <div className="job-cards">
              {filteredJobs.map((job) => (
                <article
                  key={job.id}
                  className="job-list-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => handleOpenJob(job)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleOpenJob(job);
                    }
                  }}
                >
                  <div className="job-card-topline">
                    <div>
                      <h3>{job.title}</h3>
                      <p className="job-company">{job.company}</p>
                    </div>
                    <span className="job-openings-pill">{job.positionsOpen} openings</span>
                  </div>

                  <div className="job-card-meta">
                    <span>{job.location}</span>
                    <span>{job.experience}</span>
                    <span>{job.salary}</span>
                  </div>

                  <p className="job-card-summary">{job.summary}</p>

                  <div className="job-tags">
                    {job.tags.slice(0, 5).map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>

                  <div className="job-card-footer">
                    <span>{job.type}</span>
                    <span className="job-card-link">View details</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-results">
              <p>No jobs match your current search. Try broader keywords.</p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
