import { useEffect, useMemo, useState } from "react";
import AdminLayout from "./AdminLayout";
import {
  API_BASE_URL,
  getAdminHeaders,
  readJsonResponse,
  adminUpdateRecruiterAccountStatus,
} from "./adminApi";
import "../../styles/admin-panel.css";

const toCurrency = (value) =>
  Number(value || 0).toLocaleString(undefined, {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });

const formatDateTime = (value) => {
  if (!value) return "Not marked";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString();
};

const getTodayValue = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
};

const STATUS_OPTIONS = [
  { value: "present", label: "Present" },
  { value: "half_day", label: "Half Day" },
  { value: "absent", label: "Absent" },
];

const HALF_DAY_HOUR_OPTIONS = Array.from({ length: 15 }, (_, index) => {
  const value = 1 + index * 0.5;
  return {
    value: value.toFixed(1),
    label: Number.isInteger(value) ? String(value) : value.toFixed(1),
  };
});

export default function AdminAttendance({ setCurrentPage }) {
  const [attendanceDate, setAttendanceDate] = useState(getTodayValue);
  const [staff, setStaff] = useState([]);
  const [summary, setSummary] = useState({
    totalStaff: 0,
    presentCount: 0,
    absentCount: 0,
    halfDayCount: 0,
    dailyExpense: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [savingRid, setSavingRid] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [halfDayTarget, setHalfDayTarget] = useState(null);
  const [halfDayHours, setHalfDayHours] = useState("1.0");
  const [disableTarget, setDisableTarget] = useState(null);
  const [disableSaving, setDisableSaving] = useState(false);
  const [disableError, setDisableError] = useState("");
  const [staffSearch, setStaffSearch] = useState("");

  const loadAttendance = async (selectedDate = attendanceDate) => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/attendance?date=${encodeURIComponent(selectedDate)}`,
        {
          headers: getAdminHeaders(),
        },
      );
      const data = await readJsonResponse(
        response,
        "Failed to parse attendance response.",
      );
      if (!response.ok) {
        throw new Error(data?.message || "Failed to fetch attendance.");
      }

      setStaff(Array.isArray(data.staff) ? data.staff : []);
      setSummary({
        totalStaff: Number(data?.summary?.totalStaff) || 0,
        presentCount: Number(data?.summary?.presentCount) || 0,
        absentCount: Number(data?.summary?.absentCount) || 0,
        halfDayCount: Number(data?.summary?.halfDayCount) || 0,
        dailyExpense: Number(data?.summary?.dailyExpense) || 0,
      });
    } catch (error) {
      setErrorMessage(error.message || "Failed to fetch attendance.");
      setStaff([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance(attendanceDate);
  }, [attendanceDate]);

  const openDisableStaffModal = (member) => {
    setDisableTarget(member);
    setDisableError("");
  };

  const closeDisableStaffModal = () => {
    if (disableSaving) return;
    setDisableTarget(null);
    setDisableError("");
  };

  const handleDisableStaff = async () => {
    if (!disableTarget?.rid) return;
    setDisableSaving(true);
    setDisableError("");
    try {
      await adminUpdateRecruiterAccountStatus(disableTarget.rid, "inactive");
      closeDisableStaffModal();
      await loadAttendance(attendanceDate);
    } catch (err) {
      setDisableError(err.message || "Failed to disable account.");
    } finally {
      setDisableSaving(false);
    }
  };

  const totals = useMemo(
    () => [
      { label: "Total Staff", value: summary.totalStaff, color: "#1f2937" },
      { label: "Present", value: summary.presentCount, color: "#166534" },
      { label: "Half Day", value: summary.halfDayCount, color: "#b45309" },
      { label: "Absent", value: summary.absentCount, color: "#b91c1c" },
      {
        label: "Salary Expense",
        value: toCurrency(summary.dailyExpense),
        color: "#1d4ed8",
      },
    ],
    [summary],
  );

  const filteredStaff = useMemo(() => {
    const searchTerm = staffSearch.trim().toLowerCase();
    if (!searchTerm) return staff;

    return staff.filter((member) =>
      [
        member.name,
        member.rid,
        member.role,
        member.salaryCreditTargetName,
        member.salaryCreditTargetRid,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(searchTerm)),
    );
  }, [staff, staffSearch]);

  const handleMarkAttendance = async (recruiterRid, status) => {
    if (status === "half_day") {
      const member = staff.find((item) => item.rid === recruiterRid) || null;
      setHalfDayTarget(member);
      setHalfDayHours(
        member?.hoursWorked
          ? Number(member.hoursWorked).toFixed(1)
          : HALF_DAY_HOUR_OPTIONS[0].value,
      );
      return;
    }
    setSavingRid(recruiterRid);
    setErrorMessage("");
    setStatusMessage("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/attendance`, {
        method: "PUT",
        headers: getAdminHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          recruiterRid,
          attendanceDate,
          status,
          hoursWorked: null,
          markedBy: "admin-panel",
        }),
      });
      const data = await readJsonResponse(
        response,
        "Failed to parse attendance update response.",
      );
      if (!response.ok) {
        throw new Error(data?.message || "Failed to update attendance.");
      }

      setStatusMessage(`Attendance updated for ${recruiterRid}.`);
      await loadAttendance(attendanceDate);
    } catch (error) {
      setErrorMessage(error.message || "Failed to update attendance.");
    } finally {
      setSavingRid("");
    }
  };

  const closeHalfDayModal = (force = false) => {
    if (!force && savingRid) return;
    setHalfDayTarget(null);
    setHalfDayHours(HALF_DAY_HOUR_OPTIONS[0].value);
  };

  const confirmHalfDay = async () => {
    if (!halfDayTarget?.rid) return;
    setSavingRid(halfDayTarget.rid);
    setErrorMessage("");
    setStatusMessage("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/attendance`, {
        method: "PUT",
        headers: getAdminHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          recruiterRid: halfDayTarget.rid,
          attendanceDate,
          status: "half_day",
          hoursWorked: Number(halfDayHours),
          markedBy: "admin-panel",
        }),
      });
      const data = await readJsonResponse(
        response,
        "Failed to parse attendance update response.",
      );
      if (!response.ok) {
        throw new Error(data?.message || "Failed to update attendance.");
      }
      setStatusMessage(`Attendance updated for ${halfDayTarget.rid}.`);
      closeHalfDayModal(true);
      await loadAttendance(attendanceDate);
    } catch (error) {
      setErrorMessage(error.message || "Failed to update attendance.");
    } finally {
      setSavingRid("");
    }
  };

  return (
    <AdminLayout
      title="Attendance system"
      subtitle="Mark recruiters and team leaders daily. Salary expense is synced into money_sum automatically."
      setCurrentPage={setCurrentPage}
      actions={
        <button
          type="button"
          className="admin-refresh-btn"
          onClick={() => loadAttendance(attendanceDate)}
          disabled={isLoading}
        >
          {isLoading ? "Refreshing..." : "Refresh"}
        </button>
      }
    >
      {errorMessage ? (
        <div className="admin-alert admin-alert-error">{errorMessage}</div>
      ) : null}
      {statusMessage ? (
        <div className="admin-alert">{statusMessage}</div>
      ) : null}

      <div className="admin-dashboard-card admin-card-large">
        <div className="admin-attendance-toolbar">
          <div>
            <label htmlFor="attendanceDate">Attendance date</label>
            <input
              id="attendanceDate"
              type="date"
              value={attendanceDate}
              onChange={(event) => setAttendanceDate(event.target.value)}
            />
          </div>
          <div className="admin-muted">
            Changing a status from `present` to `absent` removes that linked
            salary expense.
          </div>
        </div>
      </div>

      <div className="admin-attendance-summary-grid">
        {totals.map((item) => (
          <div key={item.label} className="admin-dashboard-card">
            <div className="admin-muted">{item.label}</div>
            <h3 style={{ margin: "8px 0 0", color: item.color }}>
              {item.value}
            </h3>
          </div>
        ))}
      </div>

      <div className="admin-dashboard-card admin-card-large">
        <div className="admin-attendance-list-head">
          <div>
            <h2 style={{ margin: 0 }}>Daily attendance</h2>
            <p className="admin-muted" style={{ margin: "0.35rem 0 0" }}>
              Showing {filteredStaff.length} of {staff.length}
            </p>
          </div>
          <div className="admin-attendance-search">
            <label htmlFor="attendanceStaffSearch">Search staff</label>
            <input
              id="attendanceStaffSearch"
              type="search"
              value={staffSearch}
              onChange={(event) => setStaffSearch(event.target.value)}
              placeholder="Recruiter or team leader name"
            />
          </div>
        </div>
        {staff.length === 0 ? (
          <p className="admin-chart-empty">
            No recruiters or team leaders found.
          </p>
        ) : filteredStaff.length === 0 ? (
          <p className="admin-chart-empty">
            No matching recruiter or team leader found.
          </p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table admin-table-wide">
              <thead>
                <tr>
                  <th>RID</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Daily Salary</th>
                  <th>Status</th>
                  <th>Expense Posted</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((member) => (
                  <tr key={member.rid}>
                    <td>{member.rid}</td>
                    <td>{member.name || "Unknown"}</td>
                    <td style={{ textTransform: "capitalize" }}>
                      {member.role}
                      {!member.salaryCreditOwner &&
                      Number(member.linkedAccountCount) > 1 ? (
                        <div className="admin-muted" style={{ marginTop: "4px" }}>
                          Salary to {member.salaryCreditTargetRid}
                          {member.salaryCreditTargetName
                            ? ` (${member.salaryCreditTargetName})`
                            : ""}
                        </div>
                      ) : null}
                    </td>
                    <td>{toCurrency(member.dailySalary)}</td>
                    <td>
                      <span
                        className={`admin-attendance-badge admin-attendance-${member.status}`}
                      >
                        {member.status === "half_day"
                          ? `Half Day${member.hoursWorked ? ` (${member.hoursWorked}h)` : ""}`
                          : member.status}
                      </span>
                    </td>
                    <td>{toCurrency(member.salaryAmount)}</td>
                    <td>
                      {formatDateTime(member.updatedAt || member.markedAt)}
                    </td>
                    <td>
                      <div className="admin-attendance-actions">
                        {STATUS_OPTIONS.map((option) => {
                          const isActive = member.status === option.value;
                          const isSaving = savingRid === member.rid;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              className={`admin-attendance-btn ${isActive ? "is-active" : ""}`}
                              onClick={() =>
                                handleMarkAttendance(member.rid, option.value)
                              }
                              disabled={
                                isSaving ||
                                (!member.salaryCreditOwner &&
                                  Number(member.linkedAccountCount) > 1)
                              }
                              title={
                                !member.salaryCreditOwner &&
                                Number(member.linkedAccountCount) > 1
                                  ? `Salary credits are posted on ${member.salaryCreditTargetRid}.`
                                  : ""
                              }
                            >
                              {isSaving && isActive
                                ? "Saving..."
                                : option.label}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          className="admin-back-btn"
                          style={{
                            backgroundColor: "#dc2626",
                            color: "#fff",
                            border: "none",
                            padding: "4px 10px",
                            fontSize: "12px",
                          }}
                          onClick={() => openDisableStaffModal(member)}
                        >
                          Disable
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {disableTarget ? (
        <div
          className="admin-modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={closeDisableStaffModal}
        >
          <div
            className="admin-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{ marginTop: 0, marginBottom: "10px", color: "#dc2626" }}
            >
              Disable{" "}
              {disableTarget.role === "team_leader"
                ? "Team Leader"
                : "Recruiter"}
            </h3>
            <p style={{ margin: "0 0 8px" }}>
              Disable login for{" "}
              <strong>{disableTarget.name || "Unknown"}</strong> (
              {disableTarget.rid})?
            </p>
            <p className="admin-muted" style={{ margin: "0 0 4px" }}>
              Role: {disableTarget.role || "N/A"}
            </p>
            <p
              style={{
                margin: "8px 0 12px",
                color: "#b91c1c",
                fontWeight: 600,
              }}
            >
              This account will not be able to log in and it will be removed
              from active staff lists.
            </p>
            {disableError ? (
              <div
                className="admin-alert admin-alert-error"
                style={{ marginBottom: "10px" }}
              >
                {disableError}
              </div>
            ) : null}
            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-back-btn"
                onClick={closeDisableStaffModal}
                disabled={disableSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-refresh-btn"
                style={{ backgroundColor: "#dc2626", border: "none" }}
                onClick={handleDisableStaff}
                disabled={disableSaving}
              >
                {disableSaving ? "Disabling..." : "Confirm Disable"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {halfDayTarget ? (
        <div
          className="admin-modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={closeHalfDayModal}
        >
          <div
            className="admin-modal-card"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: "10px" }}>Half day hours</h3>
            <p style={{ margin: "0 0 12px" }}>
              {halfDayTarget.name || "Unknown"} ({halfDayTarget.rid})
            </p>
            <label htmlFor="halfDayHours">Enter hours working</label>
            <select
              id="halfDayHours"
              value={halfDayHours}
              onChange={(event) => setHalfDayHours(event.target.value)}
              disabled={savingRid === halfDayTarget.rid}
            >
              {HALF_DAY_HOUR_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="admin-modal-actions" style={{ marginTop: "16px" }}>
              <button
                type="button"
                className="admin-back-btn"
                onClick={closeHalfDayModal}
                disabled={savingRid === halfDayTarget.rid}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-refresh-btn"
                onClick={confirmHalfDay}
                disabled={savingRid === halfDayTarget.rid}
              >
                {savingRid === halfDayTarget.rid ? "Saving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminLayout>
  );
}
