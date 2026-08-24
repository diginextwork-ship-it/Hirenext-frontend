import { useEffect, useMemo, useState } from "react";
import { Search, MapPin, Briefcase, IndianRupee, Clock, Filter, ArrowRight, Building, Sparkles, X, ChevronRight } from "lucide-react";
import "../styles/job-search.css";
import PageBackButton from "../components/PageBackButton";
import { fetchJobsFromApi, storeSelectedJob } from "../utils/jobSearch";

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

export default function JobSearch({ setCurrentPage }) {
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

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

  const categories = useMemo(() => {
    const cats = new Set(["All"]);
    jobs.forEach((j) => {
      if (j.type) cats.add(j.type);
    });
    return Array.from(cats);
  }, [jobs]);

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
      const matchesCategory =
        selectedCategory === "All" || job.type === selectedCategory;

      return matchesQuery && matchesLocation && matchesCategory;
    });
  }, [jobs, searchQuery, locationQuery, selectedCategory]);

  const handleOpenJob = (job) => {
    storeSelectedJob(job);
    setCurrentPage("jobdetail", { jobId: job.id });
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setLocationQuery("");
    setSelectedCategory("All");
  };

  return (
    <main className="job-search-page ui-page">
      <section className="job-search-shell ui-shell">
        <div className="ui-page-back">
          <PageBackButton setCurrentPage={setCurrentPage} />
        </div>

        {/* Hero Section */}
        <section className="job-search-hero">
          <div className="hero-tag-badge">
            <Sparkles size={14} />
            <span>Verified Career Opportunities</span>
          </div>
          <h1>Explore Premium Open Roles</h1>
          <p>
            Filter through top engineering, tech, and corporate vacancies across verified partner employers.
          </p>

          {/* Search Filter Bar */}
          <div className="job-search-bar glass-card">
            <div className="search-field">
              <Search size={18} className="field-icon" />
              <input
                type="text"
                placeholder="Title, skill, or company..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>

            <div className="search-field-divider" />

            <div className="search-field">
              <MapPin size={18} className="field-icon" />
              <input
                type="text"
                placeholder="City or location..."
                value={locationQuery}
                onChange={(event) => setLocationQuery(event.target.value)}
              />
            </div>

            {(searchQuery || locationQuery || selectedCategory !== "All") && (
              <button
                type="button"
                className="btn-clear-filter"
                onClick={handleResetFilters}
                title="Clear filters"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Category Quick Filter Chips */}
          <div className="category-chips">
            <span className="chip-label"><Filter size={14} /> Category:</span>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`category-chip ${selectedCategory === cat ? "active" : ""}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        {/* Results Panel */}
        <section className="job-results-panel">
          <div className="job-results-header">
            <div>
              <h2>Available Positions</h2>
              <p>Found {filteredJobs.length} active matching job posting(s)</p>
            </div>
          </div>

          {isLoading ? (
            <div className="empty-results glass-card">
              <div className="loading-spinner" />
              <p>Fetching active roles...</p>
            </div>
          ) : loadError ? (
            <div className="empty-results glass-card error">
              <p>{loadError}</p>
            </div>
          ) : filteredJobs.length ? (
            <div className="job-cards-grid">
              {filteredJobs.map((job) => (
                <article
                  key={job.id}
                  className="job-card-item glass-card"
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
                  <div className="job-card-header">
                    <div className="company-logo-placeholder">
                      <Building size={20} />
                    </div>
                    <div className="job-card-title-group">
                      <h3>{job.title}</h3>
                      <span className="company-name">{job.company}</span>
                    </div>
                    {job.positionsOpen && (
                      <span className="openings-badge">{job.positionsOpen} Openings</span>
                    )}
                  </div>

                  <div className="job-meta-pills">
                    <span className="meta-pill"><MapPin size={14} /> {job.location}</span>
                    <span className="meta-pill"><Briefcase size={14} /> {job.experience}</span>
                    <span className="meta-pill salary"><IndianRupee size={14} /> {formatSalaryText(job.salary)}</span>
                  </div>

                  <p className="job-summary">{job.summary}</p>

                  <div className="job-tags-list">
                    {job.tags.slice(0, 4).map((tag) => (
                      <span key={tag} className="tag-item">{tag}</span>
                    ))}
                  </div>

                  <div className="job-card-footer">
                    <span className="job-type-tag">{job.type}</span>
                    <button type="button" className="btn-view-job">
                      <span>View Role</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-results glass-card">
              <p>No job postings match your criteria. Try adjusting your search query or location.</p>
              <button type="button" className="btn btn-primary" onClick={handleResetFilters}>
                Clear Search Filters
              </button>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

