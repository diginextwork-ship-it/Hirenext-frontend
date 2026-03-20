import { useState } from "react";
import AdminLayout from "./AdminLayout";
import { API_BASE_URL, getAdminHeaders, readJsonResponse } from "./adminApi";
import "../../styles/admin-panel.css";

export default function AdminBilling({ setCurrentPage }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleProcessBilling = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/billing/process`,
        {
          method: "POST",
          headers: getAdminHeaders({ "Content-Type": "application/json" }),
        },
      );
      const json = await readJsonResponse(
        response,
        "Failed to process billing.",
      );
      if (!response.ok) {
        throw new Error(
          json?.message || json?.error || "Failed to process billing.",
        );
      }
      setResult(json);
    } catch (err) {
      setError(err.message || "Failed to process billing.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout
      title="Process Billing"
      subtitle="Manually trigger the billing job to move eligible joined candidates (90+ days) to billed status."
      setCurrentPage={setCurrentPage}
    >
      <div className="perf-section">
        <p style={{ marginBottom: 16, color: "#374151" }}>
          This action will scan all candidates in <strong>joined</strong> status
          who have been joined for 90 or more days and automatically transition
          them to <strong>billed</strong> status.
        </p>

        <button
          type="button"
          className="process-billing-btn"
          onClick={handleProcessBilling}
          disabled={loading}
        >
          {loading ? "Processing..." : "Run Billing Job"}
        </button>

        {error ? (
          <div
            className="admin-alert admin-alert-error"
            style={{ marginTop: 16 }}
          >
            {error}
          </div>
        ) : null}

        {result ? (
          <div style={{ marginTop: 16 }}>
            <div className="job-message job-message-success">
              Billing job completed successfully.
            </div>
            <div className="perf-summary-grid" style={{ marginTop: 12 }}>
              <div className="perf-stat-card">
                <span className="perf-stat-label">Candidates Transitioned</span>
                <span className="perf-stat-value">
                  {result.transitioned ?? result.count ?? 0}
                </span>
              </div>
              {result.message ? (
                <div className="perf-stat-card">
                  <span className="perf-stat-label">Message</span>
                  <span
                    className="perf-stat-value"
                    style={{ fontSize: "0.9rem" }}
                  >
                    {result.message}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </AdminLayout>
  );
}
