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

const toDisplayText = (value) => {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : "";
};

export default function JobCard({ job, onViewDetails }) {
  const roleName = toDisplayText(job.role_name) || "Untitled Role";
  const companyName = toDisplayText(job.company_name) || "Unknown company";
  const city = toDisplayText(job.city);
  const state = toDisplayText(job.state);
  const salary = toDisplayText(job.salary);
  const location = [city, state].filter(Boolean).join(", ");
  const positionsOpen = Number(job.positions_open) || 0;
  const formattedDate = formatDate(job.created_at);

  return (
    <article className="recruiter-job-card-item">
      <header className="recruiter-job-card-head">
        <h3>{roleName}</h3>
        <span
          className={`job-access-badge ${
            job.access_mode === "restricted" ? "restricted" : "open"
          }`}
        >
          {job.access_mode === "restricted" ? "Restricted Access" : "Open to All"}
        </span>
      </header>

      <p className="job-company">{companyName}</p>
      {location ? <p className="job-location">{location}</p> : null}

      {salary || positionsOpen ? (
        <div className="job-details">
          {salary ? <span>{salary}</span> : <span />}
          {positionsOpen ? <span>{positionsOpen} positions</span> : null}
        </div>
      ) : null}

      <div className="job-actions">
        <button
          type="button"
          className="btn-primary"
          onClick={() => onViewDetails(job)}
        >
          View Details
        </button>
      </div>

      {formattedDate ? <footer className="job-footer">Posted {formattedDate}</footer> : null}
    </article>
  );
}
