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

const getInitials = (name) => {
  if (!name) return "R";
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return String(name).slice(0, 2).toUpperCase();
};

export default function RecruiterOthersResumes({ setCurrentPage }) {
  const [resumes, setResumes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedRecruiterKey, setSelectedRecruiterKey] = useState(null);
  const [searchRecruiterQuery, setSearchRecruiterQuery] = useState("");

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

  // Group resumes by recruiter
  const recruiterGroups = useMemo(() => {
    const map = new Map();

    resumes.forEach((resume) => {
      const rawName =
        resume.recruiterName ||
        resume._recruiterName ||
        "Other Recruiter";
      const cleanName = String(rawName).trim();
      const recRid = String(resume.rid || resume.recruiterRid || "").trim();
      const groupKey = recRid ? recRid.toLowerCase() : cleanName.toLowerCase();

      if (!map.has(groupKey)) {
        map.set(groupKey, {
          key: groupKey,
          rid: recRid || null,
          name: cleanName,
          resumes: [],
          companies: new Set(),
          latestUpload: resume.uploadedAt || resume.submittedAt || null,
        });
      }

      const group = map.get(groupKey);
      group.resumes.push(resume);

      const comp = resume.companyName || resume.job?.companyName;
      if (comp && comp !== "N/A" && comp !== "Unknown company") {
        group.companies.add(comp);
      }

      const uploadTime = resume.uploadedAt || resume.submittedAt;
      if (uploadTime && (!group.latestUpload || new Date(uploadTime) > new Date(group.latestUpload))) {
        group.latestUpload = uploadTime;
      }
    });

    return Array.from(map.values())
      .map((g) => ({
        ...g,
        count: g.resumes.length,
        companiesList: Array.from(g.companies).slice(0, 3).join(", "),
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [resumes]);

  // Filter recruiter cards by user search
  const filteredRecruiterGroups = useMemo(() => {
    const q = searchRecruiterQuery.trim().toLowerCase();
    if (!q) return recruiterGroups;
    return recruiterGroups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.rid && g.rid.toLowerCase().includes(q)) ||
        (g.companiesList && g.companiesList.toLowerCase().includes(q)),
    );
  }, [recruiterGroups, searchRecruiterQuery]);

  // Find currently selected recruiter
  const selectedRecruiter = useMemo(() => {
    if (!selectedRecruiterKey || selectedRecruiterKey === "__all__") return null;
    return recruiterGroups.find((g) => g.key === selectedRecruiterKey) || null;
  }, [selectedRecruiterKey, recruiterGroups]);

  // Active resumes to display in the table
  const displayedResumes = useMemo(() => {
    if (selectedRecruiterKey === "__all__") return resumes;
    if (selectedRecruiter) return selectedRecruiter.resumes;
    return [];
  }, [selectedRecruiterKey, selectedRecruiter, resumes]);

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
          {/* Top Bar Header */}
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
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                {selectedRecruiterKey ? (
                  <button
                    type="button"
                    className="admin-back-btn"
                    onClick={() => setSelectedRecruiterKey(null)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontWeight: 600,
                      padding: "6px 14px",
                    }}
                  >
                    ← Back to All Recruiters
                  </button>
                ) : (
                  <PageBackButton
                    setCurrentPage={setCurrentPage}
                    fallbackPage="recruiterlogin"
                    label="Back to Dashboard"
                  />
                )}
                <h1
                  style={{
                    margin: 0,
                    textTransform: "capitalize",
                    fontSize: "1.75rem",
                    fontWeight: 700,
                    color: "#0f172a",
                  }}
                >
                  {selectedRecruiter
                    ? `${selectedRecruiter.name}'s Resumes`
                    : selectedRecruiterKey === "__all__"
                      ? "All Others Candidate Resumes"
                      : "Others Resume"}
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
                {selectedRecruiter
                  ? `Showing candidate resumes submitted by ${selectedRecruiter.name} older than 15 days (excluding shortlisted, selected, joined, and billed).`
                  : "Candidate resumes submitted by other recruiters older than 15 days (excluding shortlisted, selected, joined, and billed)."}
              </p>
            </div>
            <div className="recruiter-dashboard-header-actions" style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                type="button"
                className="admin-refresh-btn"
                onClick={() => fetchOthersResumes(recruiterInfo.rid)}
                disabled={isLoading}
              >
                {isLoading ? "Refreshing..." : "Refresh"}
              </button>
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

          {/* Loading View */}
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
            /* Empty State */
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
          ) : selectedRecruiterKey ? (
            /* VIEW 2: Selected Recruiter's Resumes Detail View */
            <div style={{ marginTop: 12 }}>
              <SubmittedResumesPanel
                resumes={displayedResumes}
                subtitle={`Showing ${displayedResumes.length} candidate resume${displayedResumes.length === 1 ? "" : "s"} submitted by ${selectedRecruiter ? selectedRecruiter.name : "other recruiters"}.`}
                isLoading={isLoading}
                headerActions={
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <button
                      type="button"
                      className="admin-back-btn"
                      onClick={() => setSelectedRecruiterKey(null)}
                      style={{ padding: "6px 14px", fontWeight: 600 }}
                    >
                      ← Back to Recruiters List
                    </button>
                  </div>
                }
                defaultRecruiterName={selectedRecruiter ? selectedRecruiter.name : "Other Recruiter"}
                getResumeUrl={(resume) => {
                  const token = getAuthSession()?.token;
                  if (!token || !resume?.resId || !recruiterInfo?.rid) return "";
                  return `${API_BASE_URL}/api/recruiters/${encodeURIComponent(recruiterInfo.rid)}/resumes/${encodeURIComponent(resume.resId)}/file?token=${encodeURIComponent(token)}`;
                }}
              />
            </div>
          ) : (
            /* VIEW 1: All Recruiters List / Grid */
            <div style={{ marginTop: 12 }}>
              {/* Summary and Search Bar */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 16,
                  padding: "16px 20px",
                  background: "#f8fafc",
                  borderRadius: 14,
                  border: "1px solid #e2e8f0",
                  marginBottom: 24,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <span
                    style={{
                      background: "#b91c1c",
                      color: "#fff",
                      padding: "4px 12px",
                      borderRadius: 20,
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      letterSpacing: "0.3px",
                    }}
                  >
                    {recruiterGroups.length} Recruiters Available
                  </span>
                  <span
                    style={{
                      color: "#475569",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                    }}
                  >
                    Total Shared Resumes: <strong>{resumes.length.toLocaleString()}</strong>
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <input
                    type="text"
                    placeholder="Search recruiter name or company..."
                    value={searchRecruiterQuery}
                    onChange={(e) => setSearchRecruiterQuery(e.target.value)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      fontSize: "0.9rem",
                      minWidth: 260,
                      outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    className="click-here-btn"
                    onClick={() => setSelectedRecruiterKey("__all__")}
                    style={{
                      fontSize: "0.85rem",
                      padding: "8px 16px",
                      background: "#334155",
                    }}
                  >
                    View All ({resumes.length})
                  </button>
                </div>
              </div>

              {/* Grid of Recruiter Cards */}
              {filteredRecruiterGroups.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "48px 24px",
                    background: "#fff",
                    borderRadius: 12,
                    border: "1px dashed #cbd5e1",
                    color: "#64748b",
                  }}
                >
                  <p style={{ margin: 0, fontSize: "1rem" }}>
                    No recruiters found matching <strong>"{searchRecruiterQuery}"</strong>.
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                    gap: 18,
                  }}
                >
                  {filteredRecruiterGroups.map((group) => {
                    const initials = getInitials(group.name);
                    return (
                      <div
                        key={group.key}
                        onClick={() => setSelectedRecruiterKey(group.key)}
                        style={{
                          background: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: 14,
                          padding: "20px",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                          cursor: "pointer",
                          transition: "all 0.2s ease-in-out",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          position: "relative",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateY(-3px)";
                          e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)";
                          e.currentTarget.style.borderColor = "#cbd5e1";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.03)";
                          e.currentTarget.style.borderColor = "#e2e8f0";
                        }}
                      >
                        <div>
                          {/* Card Header with Avatar and Count Badge */}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              marginBottom: 14,
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <div
                                style={{
                                  width: 46,
                                  height: 46,
                                  borderRadius: "50%",
                                  background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
                                  color: "#ffffff",
                                  fontWeight: 700,
                                  fontSize: "1rem",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  letterSpacing: "0.5px",
                                }}
                              >
                                {initials}
                              </div>
                              <div>
                                <h3
                                  style={{
                                    margin: 0,
                                    fontSize: "1.1rem",
                                    fontWeight: 700,
                                    color: "#0f172a",
                                    lineHeight: 1.3,
                                  }}
                                >
                                  {group.name}
                                </h3>
                                {group.rid ? (
                                  <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
                                    ID: {group.rid}
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            <span
                              style={{
                                background: "#fef2f2",
                                color: "#b91c1c",
                                border: "1px solid #fecaca",
                                fontWeight: 700,
                                fontSize: "0.85rem",
                                padding: "4px 10px",
                                borderRadius: 16,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {group.count} Resumes
                            </span>
                          </div>

                          {/* Company Tags */}
                          {group.companiesList ? (
                            <p
                              style={{
                                margin: "0 0 16px",
                                fontSize: "0.85rem",
                                color: "#64748b",
                                lineHeight: 1.4,
                              }}
                            >
                              <strong style={{ color: "#475569" }}>Companies: </strong>
                              {group.companiesList}
                            </p>
                          ) : (
                            <p
                              style={{
                                margin: "0 0 16px",
                                fontSize: "0.85rem",
                                color: "#94a3b8",
                              }}
                            >
                              Candidate pool available
                            </p>
                          )}
                        </div>

                        {/* Card Action Button */}
                        <div
                          style={{
                            paddingTop: 12,
                            borderTop: "1px solid #f1f5f9",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <span style={{ fontSize: "0.82rem", color: "#94a3b8" }}>
                            Older than 15 days
                          </span>
                          <span
                            style={{
                              color: "#b91c1c",
                              fontSize: "0.9rem",
                              fontWeight: 700,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            View Resumes →
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
