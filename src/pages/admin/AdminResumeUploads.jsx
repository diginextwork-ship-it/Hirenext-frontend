import AdminLayout from "./AdminLayout";
import useAdminDashboard from "./useAdminDashboard";
import { API_BASE_URL, getAdminHeaders, readJsonResponse } from "./adminApi";
import { useState } from "react";
import {
  formatResumeCompanyDisplay,
  normalizeResumeData,
} from "../../utils/dashboardData";
import { formatDateTimeInIndia } from "../../utils/dateTime";
import "../../styles/admin-panel.css";

const getResumeCompanyName = (item) =>
  formatResumeCompanyDisplay(item);
const getResumeCityName = (item) =>
  normalizeResumeData(item).city || "N/A";

export default function AdminResumeUploads({ setCurrentPage }) {
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState("");
  const [acceptingResId, setAcceptingResId] = useState("");
  const { dashboard, isLoadingDashboard, errorMessage, refreshDashboard } =
    useAdminDashboard();

  const handleAcceptResume = async (resId) => {
    setStatusMessage("");
    setStatusType("");
    setAcceptingResId(resId);

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/resumes/${resId}/accept`, {
        method: "POST",
        headers: getAdminHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ selected_by_admin: "admin-panel" }),
      });
      const data = await readJsonResponse(response, "Failed to parse accept response.");
      if (!response.ok) {
        throw new Error(data?.message || "Failed to accept resume.");
      }
      setStatusType("success");
      setStatusMessage(
        `Accepted ${resId}. Points added: ${Number(data?.pointsAdded || 0)} to ${data?.recruiterRid || "recruiter"}.`
      );
      await refreshDashboard();
    } catch (error) {
      setStatusType("error");
      setStatusMessage(error.message || "Failed to accept resume.");
    } finally {
      setAcceptingResId("");
    }
  };

  return (
    <AdminLayout
      title="Recruiter resume uploads"
      subtitle="Audit uploaded resumes and recruiter activity."
      setCurrentPage={setCurrentPage}
      actions={
        <button
          type="button"
          className="admin-refresh-btn"
          onClick={refreshDashboard}
          disabled={isLoadingDashboard}
        >
          {isLoadingDashboard ? "Refreshing..." : "Refresh"}
        </button>
      }
    >
      {errorMessage ? (
        <div className="admin-alert admin-alert-error">{errorMessage}</div>
      ) : null}
      {statusMessage ? (
        <div className={`admin-alert ${statusType === "error" ? "admin-alert-error" : ""}`}>
          {statusMessage}
        </div>
      ) : null}

      <div className="admin-dashboard-card admin-card-large">
        {dashboard.recruiterResumeUploads.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table admin-table-wide">
              <thead>
                <tr>
                  <th>Resume ID</th>
                  <th>Recruiter</th>
                  <th>Email</th>
                  <th>RID</th>
                  <th>Job</th>
                  <th>Filename</th>
                  <th>Type</th>
                  <th>Points / Joining</th>
                  <th>Status</th>
                  <th>Uploaded At</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.recruiterResumeUploads.map((rawItem) => {
                  const item = normalizeResumeData(rawItem);
                  return (
                  <tr key={item.resId}>
                    <td>{item.resId}</td>
                    <td>{item.recruiterName}</td>
                    <td>{item.recruiterEmail}</td>
                    <td>{item.rid}</td>
                    <td>
                      <div>{item.jobJid ? `#${item.jobJid}` : "N/A"}</div>
                      <div className="admin-muted">
                        {getResumeCompanyName(item)}
                      </div>
                      <div className="admin-muted">{getResumeCityName(item)}</div>
                    </td>
                    <td>{item.resumeFilename}</td>
                    <td>{String(item.resumeType || "").toUpperCase()}</td>
                    <td>{Number(item.pointsPerJoining) || 0}</td>
                    <td>{item.isAccepted ? "accepted" : "pending"}</td>
                    <td>
                      {formatDateTimeInIndia(item.uploadedAt)}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="admin-refresh-btn"
                        onClick={() => handleAcceptResume(item.resId)}
                        disabled={Boolean(item.isAccepted) || acceptingResId === item.resId}
                      >
                        {item.isAccepted
                          ? "Accepted"
                          : acceptingResId === item.resId
                          ? "Accepting..."
                          : "Accepted"}
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="admin-chart-empty">No resumes uploaded yet.</p>
        )}
      </div>
    </AdminLayout>
  );
}
