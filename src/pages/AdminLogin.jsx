import { useState } from "react";
import { API_BASE_URL } from "../config/api";
import { readJsonResponse } from "../auth/authFetch";
import { saveAuthSession } from "../auth/session";
import { fetchWithRetry } from "../utils/network";
import "../styles/recruiter-login.css";

export default function AdminLogin({ onLoginSuccess }) {
  const [adminKey, setAdminKey] = useState("");
  const [showAdminKey, setShowAdminKey] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetchWithRetry(
        `${API_BASE_URL}/api/admin/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ adminKey }),
        },
        {
          timeoutMs: 0,
          retries: 1,
        },
      );
      const data = await readJsonResponse(
        response,
        "Check VITE_API_BASE_URL and backend route setup.",
      );
      if (!response.ok) {
        throw new Error(data?.message || "Invalid admin credentials.");
      }

      const session = {
        token: data.token,
        role: "admin",
        name: data?.admin?.name || "Admin",
      };
      saveAuthSession(session);
      onLoginSuccess?.(session);
    } catch (error) {
      setMessage(
        error instanceof Error && error.message
          ? error.message
          : "Login failed. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="recruiter-login-page ui-page">
      <section className="recruiter-login-shell ui-shell">
        <div className="recruiter-login-card">
          <h1>admin login</h1>
          <p>Sign in to access protected admin pages.</p>
          <form onSubmit={handleSubmit}>
            <label htmlFor="adminKey">Admin Key</label>
            <div className="password-input-wrap">
              <input
                id="adminKey"
                type={showAdminKey ? "text" : "password"}
                value={adminKey}
                onChange={(event) => setAdminKey(event.target.value)}
                placeholder="Enter admin key"
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowAdminKey((prev) => !prev)}
                aria-label={showAdminKey ? "Hide admin key" : "Show admin key"}
              >
                {showAdminKey ? (
                  <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 3l18 18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <path
                      d="M10.58 10.58a2 2 0 1 0 2.83 2.83"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M9.88 5.08A10.9 10.9 0 0 1 12 4.9c5.25 0 8.85 3.97 10 7.1a12.64 12.64 0 0 1-3.12 4.49M6.6 6.6A13.4 13.4 0 0 0 2 12c1.15 3.13 4.75 7.1 10 7.1 1.87 0 3.5-.5 4.94-1.27"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    aria-hidden="true"
                  >
                    <path
                      d="M2 12s3.6-7.1 10-7.1S22 12 22 12s-3.6 7.1-10 7.1S2 12 2 12z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                  </svg>
                )}
              </button>
            </div>
            <button
              type="submit"
              className="recruiter-login-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Logging in..." : "Login"}
            </button>
            {message ? (
              <p className="job-message job-message-error">{message}</p>
            ) : null}
          </form>
        </div>
      </section>
    </main>
  );
}
