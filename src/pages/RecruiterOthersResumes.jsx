import { useCallback, useEffect, useState } from "react";
import { getAuthSession } from "../auth/session";
import { authFetch } from "../auth/authFetch";
import { API_BASE_URL } from "../config/api";
import { normalizeResumeData } from "../utils/dashboardData";
import SubmittedResumesPanel from "../components/common/SubmittedResumesPanel";
import PageBackButton from "../components/PageBackButton";
import logo from "../assets/Logo.png";
import "../styles/recruiter-login.css";
import "../styles/admin-panel.css";

export default function RecruiterOthersResumes({ setCurrentPage }) {
  const [resumes, setResumes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const authSession = getAuthSession();
  const recruiter = authSession?.user || null;

  const fetchOthersResumes = useCallback(async (rid) => {
    if (!rid) return;
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
      setErrorMessage(error.message || "Failed to fetch candidate resumes from other recruiters.");
      setResumes([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authSession?.token || !recruiter?.rid) {
      if (typeof setCurrentPage === "function") {
        setCurrentPage("recruiterlogin");
      }
      return;
    }
    fetchOthersResumes(recruiter.rid);
  }, [authSession?.token, recruiter?.rid, fetchOthersResumes, setCurrentPage]);

  if (!authSession?.token || !recruiter) {
    return null;
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
                <h1 style={{ margin: 0, textTransform: "capitalize", fontSize: "1.75rem", fontWeight: 700 }}>
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
                padding: "12px 16px",
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 8,
                color: "#dc2626",
                marginBottom: 16,
                fontSize: "0.9rem",
              }}
            >
              {errorMessage}
            </div>
          ) : null}

          <SubmittedResumesPanel
            resumes={resumes}
            title="Others Resume"
            subtitle="Candidate resumes submitted by other recruiters older than 15 days (excluding shortlisted, selected, joined, and billed)."
            isLoading={isLoading}
            headerActions={
              <button
                type="button"
                className="admin-refresh-btn"
                onClick={() => fetchOthersResumes(recruiter.rid)}
                disabled={isLoading}
              >
                {isLoading ? "Loading..." : "Refresh"}
              </button>
            }
            defaultRecruiterName="Other Recruiter"
            getResumeUrl={(resume) => {
              const token = getAuthSession()?.token;
              if (!token || !resume?.resId || !recruiter?.rid) return "";
              return `${API_BASE_URL}/api/recruiters/${encodeURIComponent(recruiter.rid)}/resumes/${encodeURIComponent(resume.resId)}/file?token=${encodeURIComponent(token)}`;
            }}
          />
        </div>
      </section>
    </main>
  );
}

