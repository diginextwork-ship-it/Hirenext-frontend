import { useCallback, useEffect, useMemo, useState } from "react";
import { getAuthSession } from "../auth/session";
import { authFetch } from "../auth/authFetch";
import { API_BASE_URL } from "../config/api";
import { normalizeResumeData } from "../utils/dashboardData";
import SubmittedResumesPanel from "../components/common/SubmittedResumesPanel";
import PageBackButton from "../components/PageBackButton";
import logo from "../assets/Logo.png";
import "../styles/recruiter-login.css";
import "../styles/admin-panel.css";

const decodeTokenPayload = (token) => {
  try {
    const parts = String(token || "").split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
};

export default function RecruiterOthersResumes({ setCurrentPage }) {
  const [resumes, setResumes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const recruiterInfo = useMemo(() => {
    const session = getAuthSession();
    if (!session?.token) return null;
    const payload = decodeTokenPayload(session.token);
    const rid =
      session.rid ||
      session.user?.rid ||
      payload?.rid ||
      "";
    const role =
      session.role ||
      session.user?.role ||
      payload?.role ||
      "recruiter";
    const name =
      session.name ||
      session.user?.name ||
      payload?.name ||
      "Recruiter";
    return { token: session.token, rid, role, name };
  }, []);

  const fetchOthersResumes = useCallback(async (rid) => {
    if (!rid) {
      setIsLoading(false);
      setHasFetched(true);
      return;
    }
    setIsLoading(true);
    setErrorMessage("");
    try {
      const data = await authFetch(
        `${API_BASE_URL}/api/recruiters/${encodeURIComponent(rid)}/resumes?scope=others`,
        {},
        "Failed to fetch others resumes.",
      );

      const normalizedList = Array.isArray(data?.resumes)
        ? data.resumes.map((item) => {
            const normalized = normalizeResumeData(item);
            const latestStatus =
              normalized.currentStatus ||
              normalized.workflowStatus ||
              normalized.workflow_status ||
              normalized.status ||
              item?.currentStatus ||
              item?.current_status ||
              item?.workflowStatus ||
              item?.workflow_status ||
              item?.status ||
              "submitted";

            return {
              ...normalized,
              rid: item.rid || null,
              _source: "others",
              _recruiterName:
                normalized.recruiterName || item.recruiterName || "Other Recruiter",
              recruiterName:
                normalized.recruiterName || item.recruiterName || "Other Recruiter",
              currentStatus: latestStatus,
              workflowStatus: latestStatus,
              status: latestStatus,
            };
          })
        : [];

      setResumes(normalizedList);
    } catch (error) {
      setErrorMessage(
        error.message || "Failed to fetch candidate resumes from other recruiters.",
      );
      setResumes([]);
    } finally {
      setIsLoading(false);
      setHasFetched(true);
    }
  }, []);

  useEffect(() => {
    if (recruiterInfo?.rid) {
      fetchOthersResumes(recruiterInfo.rid);
    } else {
      setIsLoading(false);
      setHasFetched(true);
    }
  }, [recruiterInfo?.rid, fetchOthersResumes]);

  // Handle unauthenticated state cleanly without crashing or blank screen
  if (!recruiterInfo?.token) {
    return (
      <main className="recruiter-login-page ui-page">
        <section
          className="recruiter-login-shell recruiter-job-shell ui-shell"
          style={{ maxWidth: 700, margin: "40px auto", padding: "16px" }}
        >
          <div
            className="recruiter-login-card"
            style={{
              textAlign: "center",
              padding: "48px 24px",
              background: "#fff",
              borderRadius: 16,
              boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
            }}
          >
            <div style={{ fontSize: "40px", marginBottom: 12 }}>🔒</div>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: 8, color: "#1e293b" }}>
              Authentication Required
            </h2>
            <p style={{ color: "#64748b", marginBottom: 24, fontSize: "0.95rem" }}>
              You must be logged in as a recruiter to view candidate resumes.
            </p>
            <button
              type="button"
              className="click-here-btn"
              onClick={() => setCurrentPage?.("recruiterlogin")}
            >
              Go to Recruiter Login
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="recruiter-login-page ui-page">
      <section
        className="recruiter-login-shell recruiter-job-shell ui-shell"
        style={{ maxWidth: 1400, margin: "0 auto", padding: "16px" }}
      >
        <div className="recruiter-login-card recruiter-job-card">
          <div
            className="recruiter-dashboard-header"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 16,
              marginBottom: 20,
            }}
          >
            <div className="recruiter-dashboard-header-copy">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  flexWrap: "wrap",
                }}
              >
                <PageBackButton
                  setCurrentPage={setCurrentPage}
                  fallbackPage="recruiterlogin"
                  label="Back to Dashboard"
                />
                <h1
                  style={{
                    margin: 0,
                    textTransform: "capitalize",
                    fontSize: "1.75rem",
                    fontWeight: 700,
                  }}
                >
                  Others Resume
                </h1>
              </div>
              <p
                style={{
                  margin: "8px 0 0",
                  color: "#64748b",
                  fontSize: "0.95rem",
                  lineHeight: 1.5,
                }}
              >
                Candidate resumes submitted by other recruiters older than 15 days (excluding shortlisted, selected, joined, and billed).
              </p>
            </div>
            <div className="recruiter-dashboard-header-actions">
              <img
                src={logo}
                alt="HireNext logo"
                className="recruiter-dashboard-logo"
                style={{ maxHeight: 42, width: "auto" }}
              />
            </div>
          </div>

          {errorMessage ? (
            <div
              style={{
                padding: "14px 18px",
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 8,
                color: "#dc2626",
                marginBottom: 20,
                fontSize: "0.95rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <span>{errorMessage}</span>
              <button
                type="button"
                className="admin-refresh-btn"
                onClick={() => fetchOthersResumes(recruiterInfo.rid)}
              >
                Retry
              </button>
            </div>
          ) : null}

          {isLoading ? (
            <div
              style={{
                textAlign: "center",
                padding: "60px 24px",
                background: "#fff",
                borderRadius: 16,
                border: "1px solid #e2e8f0",
                marginTop: 20,
              }}
            >
              <p style={{ fontSize: "1.1rem", fontWeight: 600, color: "#1e293b", margin: "0 0 8px" }}>
                Loading Candidate Resumes...
              </p>
              <p style={{ color: "#64748b", margin: 0, fontSize: "0.9rem" }}>
                Checking shared candidate pool older than 15 days.
              </p>
            </div>
          ) : hasFetched && resumes.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "54px 24px",
                background: "#ffffff",
                borderRadius: 16,
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
                marginTop: 20,
              }}
            >
              <div
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: "50%",
                  backgroundColor: "#fef3c7",
                  color: "#d97706",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                  fontSize: "30px",
                }}
              >
                📂
              </div>
              <h2
                style={{
                  fontSize: "1.35rem",
                  fontWeight: 700,
                  color: "#1e293b",
                  margin: "0 0 10px",
                }}
              >
                No Candidate Resumes Available
              </h2>
              <p
                style={{
                  color: "#64748b",
                  maxWidth: 600,
                  margin: "0 auto 24px",
                  fontSize: "0.95rem",
                  lineHeight: 1.6,
                }}
              >
                There are currently no candidate resumes submitted by other recruiters older than 15 days (excluding shortlisted, selected, joined, and billed candidates).
              </p>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  className="admin-refresh-btn"
                  style={{ padding: "8px 22px" }}
                  onClick={() => fetchOthersResumes(recruiterInfo.rid)}
                  disabled={isLoading}
                >
                  {isLoading ? "Refreshing..." : "Refresh"}
                </button>
                <button
                  type="button"
                  className="admin-back-btn"
                  style={{ padding: "8px 22px" }}
                  onClick={() => setCurrentPage?.("recruiterlogin")}
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          ) : (
            <SubmittedResumesPanel
              resumes={resumes}
              title="Others Resume"
              subtitle="Candidate resumes submitted by other recruiters older than 15 days (excluding shortlisted, selected, joined, and billed)."
              isLoading={isLoading}
              headerActions={
                <button
                  type="button"
                  className="admin-refresh-btn"
                  onClick={() => fetchOthersResumes(recruiterInfo.rid)}
                  disabled={isLoading}
                >
                  {isLoading ? "Loading..." : "Refresh"}
                </button>
              }
              defaultRecruiterName="Other Recruiter"
              getResumeUrl={(resume) => {
                const token = getAuthSession()?.token;
                if (!token || !resume?.resId || !recruiterInfo?.rid) return "";
                return `${API_BASE_URL}/api/recruiters/${encodeURIComponent(recruiterInfo.rid)}/resumes/${encodeURIComponent(resume.resId)}/file?token=${encodeURIComponent(token)}`;
              }}
            />
          )}
        </div>
      </section>
    </main>
  );
}
