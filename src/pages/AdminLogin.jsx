import { useState } from "react";
import { ShieldCheck, KeyRound, Eye, EyeOff, LogIn, Loader2, AlertCircle, ArrowLeft, Lock } from "lucide-react";
import { API_BASE_URL } from "../config/api";
import { readJsonResponse } from "../auth/authFetch";
import { saveAuthSession } from "../auth/session";
import { fetchWithRetry } from "../utils/network";
import logo from "../assets/Logo.png";
import "../styles/admin-login.css";

export default function AdminLogin({ onLoginSuccess, setCurrentPage }) {
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
        throw new Error(data?.message || "Invalid administrative security key.");
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
          : "Authentication failed. Please verify your admin key.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="admin-login-page">
      <div className="admin-login-wrapper">
        <header className="admin-login-header">
          <img src={logo} alt="HireNext logo" className="admin-login-logo" />
        </header>

        <section className="admin-login-card">
          <div className="admin-login-badge">
            <ShieldCheck size={15} />
            <span>Admin Secure Gateway</span>
          </div>

          <h1>System Control Center</h1>
          <p>
            Enter your system authorization key to manage platform resources, recruiters, and financials.
          </p>

          <form onSubmit={handleSubmit} className="admin-login-form">
            <div className="admin-input-group">
              <label htmlFor="adminKey">
                <span>Security Access Key</span>
              </label>
              <div className="admin-input-wrapper">
                <KeyRound size={18} className="admin-input-icon" />
                <input
                  id="adminKey"
                  className="admin-input-field"
                  type={showAdminKey ? "text" : "password"}
                  value={adminKey}
                  onChange={(event) => setAdminKey(event.target.value)}
                  placeholder="Enter administrative key..."
                  required
                  autoFocus
                />
                <button
                  type="button"
                  className="admin-password-toggle"
                  onClick={() => setShowAdminKey((prev) => !prev)}
                  aria-label={showAdminKey ? "Hide admin key" : "Show admin key"}
                >
                  {showAdminKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="admin-submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={19} className="spin-icon" />
                  <span>Authenticating Gateway...</span>
                </>
              ) : (
                <>
                  <LogIn size={19} />
                  <span>Authorize Access</span>
                </>
              )}
            </button>

            {message && (
              <div className="admin-error-alert">
                <AlertCircle size={18} />
                <span>{message}</span>
              </div>
            )}
          </form>

          <div className="admin-login-footer">
            <span><Lock size={12} /> Encrypted Session</span>
            <span>•</span>
            <span>256-bit Security</span>
          </div>
        </section>

        {setCurrentPage && (
          <button
            type="button"
            className="admin-back-home"
            onClick={() => setCurrentPage("home")}
          >
            <ArrowLeft size={14} />
            <span>Return to Public Portal</span>
          </button>
        )}
      </div>
    </main>
  );
}
