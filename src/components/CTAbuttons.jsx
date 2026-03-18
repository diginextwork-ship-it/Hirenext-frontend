import "../styles/buttons.css";

export default function CTAButtons({ setCurrentPage }) {
  return (
    <div className="cta-buttons">
      <button
        className="btn btn-primary"
        onClick={() => setCurrentPage("jobs")}
      >
        Find your next job
      </button>
      <button
        className="btn btn-secondary-light"
        onClick={() => setCurrentPage("recruiterlogin")}
      >
        Login as a recruiter
      </button>
    </div>
  );
}
