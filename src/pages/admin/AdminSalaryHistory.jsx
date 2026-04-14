import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "./AdminLayout";
import {
  API_BASE_URL,
  fetchAdminSalaryHistoryDetail,
  getAdminHeaders,
  readJsonResponse,
  updateAdminSalaryHistory,
} from "./adminApi";
import "../../styles/admin-panel.css";

const formatCurrency = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    return "Not set";
  }

  return amount.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });
};

const formatDate = (value) => {
  if (!value) return "Not scheduled";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) return "Not recorded";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getTodayValue = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
};

const toRoleLabel = (value) =>
  String(value || "").trim().toLowerCase() === "team leader"
    ? "Team Leader"
    : "Recruiter";

export default function AdminSalaryHistory({ setCurrentPage }) {
  const [staff, setStaff] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [salaryDetail, setSalaryDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [salaryForm, setSalaryForm] = useState({
    monthlySalary: "",
    effectiveFrom: getTodayValue(),
  });

  const loadStaff = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/recruiters/list`, {
        headers: getAdminHeaders(),
      });
      const data = await readJsonResponse(
        response,
        "Failed to parse salary history response.",
      );

      if (!response.ok) {
        throw new Error(data?.message || "Failed to fetch salary history.");
      }

      setStaff(Array.isArray(data?.recruiters) ? data.recruiters : []);
    } catch (error) {
      setErrorMessage(error.message || "Failed to fetch salary history.");
      setStaff([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadSalaryDetail = useCallback(async (rid, options = {}) => {
    const { keepFormValues = false } = options;
    setDetailLoading(true);
    setDetailError("");

    try {
      const data = await fetchAdminSalaryHistoryDetail(rid);
      setSalaryDetail(data);
      if (!keepFormValues) {
        setSalaryForm({
          monthlySalary:
            data?.recruiter?.currentSalary === null ||
            data?.recruiter?.currentSalary === undefined
              ? ""
              : String(data.recruiter.currentSalary),
          effectiveFrom: getTodayValue(),
        });
      }
    } catch (error) {
      setSalaryDetail(null);
      setDetailError(error.message || "Failed to fetch salary details.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const filteredStaff = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return [...staff]
      .sort((left, right) => {
        const leftWeight =
          String(left.role || "").trim().toLowerCase() === "team leader" ? 0 : 1;
        const rightWeight =
          String(right.role || "").trim().toLowerCase() === "team leader"
            ? 0
            : 1;

        if (leftWeight !== rightWeight) {
          return leftWeight - rightWeight;
        }

        return String(left.name || "").localeCompare(String(right.name || ""));
      })
      .filter((member) =>
        normalizedSearch
          ? String(member.name || "").toLowerCase().includes(normalizedSearch)
          : true,
      );
  }, [searchTerm, staff]);

  const openSalaryCard = async (member) => {
    setSelectedStaff(member);
    setSalaryDetail(null);
    setFormMessage("");
    setFormError("");
    setSalaryForm({
      monthlySalary:
        member?.currentSalary === null || member?.currentSalary === undefined
          ? ""
          : String(member.currentSalary),
      effectiveFrom: getTodayValue(),
    });
    await loadSalaryDetail(member.rid);
  };

  const closeSalaryCard = () => {
    if (isSaving) return;
    setSelectedStaff(null);
    setSalaryDetail(null);
    setDetailError("");
    setFormMessage("");
    setFormError("");
    setSalaryForm({
      monthlySalary: "",
      effectiveFrom: getTodayValue(),
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedStaff?.rid) return;

    setIsSaving(true);
    setFormMessage("");
    setFormError("");

    try {
      await updateAdminSalaryHistory(selectedStaff.rid, {
        monthlySalary: salaryForm.monthlySalary,
        effectiveFrom: salaryForm.effectiveFrom,
        createdBy: "admin-panel",
      });
      setFormMessage("Salary modification saved.");
      await loadStaff();
      await loadSalaryDetail(selectedStaff.rid);
    } catch (error) {
      setFormError(error.message || "Failed to update salary.");
    } finally {
      setIsSaving(false);
    }
  };

  const recruiter = salaryDetail?.recruiter || selectedStaff;
  const modifications = Array.isArray(salaryDetail?.modifications)
    ? salaryDetail.modifications
    : [];

  return (
    <AdminLayout
      title="Salary history"
      subtitle="Search recruiters by name, open a salary card, review their modifications, and schedule a new salary from a chosen date."
      setCurrentPage={setCurrentPage}
      actions={
        <button
          type="button"
          className="admin-refresh-btn"
          onClick={loadStaff}
          disabled={isLoading}
        >
          {isLoading ? "Refreshing..." : "Refresh"}
        </button>
      }
    >
      {errorMessage ? (
        <div className="admin-alert admin-alert-error">{errorMessage}</div>
      ) : null}

      <div className="admin-dashboard-card admin-card-large">
        <div className="admin-salary-history-toolbar">
          <div className="admin-salary-history-search">
            <label htmlFor="salaryHistorySearch">Search recruiter by name</label>
            <input
              id="salaryHistorySearch"
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Type a recruiter or team leader name..."
            />
          </div>
          <div className="admin-muted">
            Click any recruiter or team leader row to open the salary card.
          </div>
        </div>
      </div>

      <div className="admin-dashboard-card admin-card-large">
        <div className="admin-salary-history-header">
          <span>Name</span>
          <span>Email</span>
          <span>Current Salary</span>
        </div>

        {isLoading ? (
          <p className="admin-chart-empty">Loading salary history...</p>
        ) : filteredStaff.length === 0 ? (
          <p className="admin-chart-empty">
            {searchTerm.trim()
              ? "No recruiter or team leader matches that name."
              : "No recruiters or team leaders found."}
          </p>
        ) : (
          <div className="admin-salary-history-list">
            {filteredStaff.map((member) => (
              <button
                key={member.rid}
                type="button"
                className="admin-salary-history-row admin-salary-history-row-btn"
                onClick={() => openSalaryCard(member)}
              >
                <div className="admin-salary-history-name">
                  <strong>{member.name || "Unknown"}</strong>
                  <span>{toRoleLabel(member.role)}</span>
                </div>
                <div className="admin-salary-history-email">
                  {member.email || "No email available"}
                </div>
                <div className="admin-salary-history-amount">
                  {formatCurrency(member.currentSalary)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedStaff ? (
        <div
          className="admin-modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={closeSalaryCard}
        >
          <div
            className="admin-modal-card admin-salary-modal-card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-salary-modal-head">
              <div>
                <p className="admin-salary-modal-kicker">Salary card</p>
                <h2>{recruiter?.name || "Unknown"}</h2>
                <p className="admin-muted" style={{ margin: "0.35rem 0 0" }}>
                  {toRoleLabel(recruiter?.role)}
                  {recruiter?.email ? ` | ${recruiter.email}` : ""}
                </p>
              </div>
              <button
                type="button"
                className="admin-back-btn"
                onClick={closeSalaryCard}
                disabled={isSaving}
              >
                Close
              </button>
            </div>

            {detailError ? (
              <div className="admin-alert admin-alert-error">{detailError}</div>
            ) : null}

            <div className="admin-salary-modal-summary">
              <div className="admin-salary-summary-card">
                <span className="admin-muted">Current salary</span>
                <strong>{formatCurrency(recruiter?.currentSalary)}</strong>
              </div>
              <div className="admin-salary-summary-card">
                <span className="admin-muted">Active from</span>
                <strong>{formatDate(recruiter?.currentSalaryEffectiveFrom)}</strong>
              </div>
            </div>

            <form className="admin-form admin-salary-form" onSubmit={handleSubmit}>
              <label htmlFor="salaryAmountInput">Modify current salary</label>
              <input
                id="salaryAmountInput"
                type="number"
                min="0"
                step="0.01"
                value={salaryForm.monthlySalary}
                onChange={(event) =>
                  setSalaryForm((current) => ({
                    ...current,
                    monthlySalary: event.target.value,
                  }))
                }
                placeholder="e.g. 30000"
                required
              />

              <label htmlFor="salaryEffectiveDate">Apply from date</label>
              <input
                id="salaryEffectiveDate"
                type="date"
                value={salaryForm.effectiveFrom}
                onChange={(event) =>
                  setSalaryForm((current) => ({
                    ...current,
                    effectiveFrom: event.target.value,
                  }))
                }
                required
              />

              {formMessage ? (
                <p className="admin-form-message admin-form-success">{formMessage}</p>
              ) : null}
              {formError ? (
                <p className="admin-form-message admin-form-error">{formError}</p>
              ) : null}

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="admin-back-btn"
                  onClick={() => loadSalaryDetail(selectedStaff.rid)}
                  disabled={detailLoading || isSaving}
                >
                  {detailLoading ? "Refreshing..." : "Refresh card"}
                </button>
                <button
                  type="submit"
                  className="admin-refresh-btn"
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save salary change"}
                </button>
              </div>
            </form>

            <div className="admin-salary-history-panel">
              <div className="admin-salary-history-panel-head">
                <h3>Salary modifications</h3>
                <span className="admin-muted">
                  Latest effective date and amount for this person.
                </span>
              </div>

              {detailLoading && !salaryDetail ? (
                <p className="admin-chart-empty">Loading salary details...</p>
              ) : modifications.length === 0 ? (
                <p className="admin-chart-empty">
                  No salary modifications have been recorded yet.
                </p>
              ) : (
                <div className="admin-salary-modification-list">
                  {modifications.map((item) => (
                    <div key={item.id} className="admin-salary-modification-item">
                      <div>
                        <strong>{formatCurrency(item.monthlySalary)}</strong>
                        <p className="admin-muted" style={{ margin: "0.35rem 0 0" }}>
                          Effective from {formatDate(item.effectiveFrom)}
                        </p>
                      </div>
                      <div className="admin-salary-modification-meta">
                        <span>Modified on {formatDateTime(item.createdAt)}</span>
                        <span>By {item.createdBy || "admin"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </AdminLayout>
  );
}
