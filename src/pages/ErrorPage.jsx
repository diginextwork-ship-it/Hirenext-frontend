import "../styles/error-page.css";

export default function ErrorPage({
  code = 500,
  title = "Something went wrong",
  message = "An unexpected error occurred. Please try again.",
  onRetry,
}) {
  const errorCode = String(code || 500);

  return (
    <main className="error-page" role="alert" aria-live="assertive">
      <div className="error-card">
        <p className="error-label">Error</p>
        <h1 className="error-code">{errorCode}</h1> 
        <h2 className="error-title">{title}</h2>
        <p className="error-message">{message}</p>
        <div className="error-actions">
          <button type="button" className="error-btn" onClick={onRetry}>
            Try Again
          </button>
          <a href="/" className="error-link">
            Go to Home
          </a>
        </div>
      </div>
    </main>
  );
}