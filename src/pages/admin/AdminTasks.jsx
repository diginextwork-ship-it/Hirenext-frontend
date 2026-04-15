import { useEffect, useMemo, useState } from "react";
import AdminLayout from "./AdminLayout";
import useDailyRefresh from "../../hooks/useDailyRefresh";
import {
  assignAdminTask,
  createAdminTask,
  fetchAdminAssignableRecruiters,
  fetchAdminTasks,
} from "../../services/taskService";
import "../../styles/admin-panel.css";

const STATUS_LABELS = {
  pending: "Pending",
  completed: "Completed",
  rejected: "Rejected",
  timed_out: "Timed out",
};

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString();
};

const formatDateOnly = (value) => {
  if (!value) return "N/A";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString();
};

export default function AdminTasks({ setCurrentPage }) {
  const [tasks, setTasks] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [assignSearchTerm, setAssignSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    heading: "",
    description: "",
    recruiterRid: "",
  });
  const [assignRecruiterRid, setAssignRecruiterRid] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [taskFilter, setTaskFilter] = useState("");

  const loadData = async ({ silent = false } = {}) => {
    if (!silent) setIsLoading(true);
    setErrorMessage("");
    try {
      const [tasksResult, recruitersResult] = await Promise.all([
        fetchAdminTasks(),
        fetchAdminAssignableRecruiters(),
      ]);
      setTasks(Array.isArray(tasksResult?.tasks) ? tasksResult.tasks : []);
      setRecruiters(
        Array.isArray(recruitersResult?.recruiters)
          ? recruitersResult.recruiters.filter(
              (item) => {
                const normalizedRole = String(item.role || "")
                  .trim()
                  .toLowerCase();
                return (
                  normalizedRole === "recruiter" ||
                  normalizedRole === "team leader"
                );
              },
            )
          : [],
      );
    } catch (error) {
      setErrorMessage(error.message || "Failed to load tasks.");
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useDailyRefresh(() => {
    loadData({ silent: true });
  });

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) || null,
    [tasks, selectedTaskId],
  );

  const summary = useMemo(
    () =>
      tasks.reduce(
        (accumulator, task) => ({
          totalTasks: accumulator.totalTasks + 1,
          totalAssignments:
            accumulator.totalAssignments + (task.totalAssignments || 0),
          pending: accumulator.pending + (task.pendingCount || 0),
          completed: accumulator.completed + (task.completedCount || 0),
          rejected: accumulator.rejected + (task.rejectedCount || 0),
          timedOut: accumulator.timedOut + (task.timedOutCount || 0),
        }),
        {
          totalTasks: 0,
          totalAssignments: 0,
          pending: 0,
          completed: 0,
          rejected: 0,
          timedOut: 0,
        },
      ),
    [tasks],
  );

  const filteredTasks = useMemo(() => {
    const normalizedFilter = taskFilter.trim().toLowerCase();
    if (!normalizedFilter) return tasks;
    return tasks.filter((task) =>
      [task.heading, task.description].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(normalizedFilter),
      ),
    );
  }, [taskFilter, tasks]);

  const filteredRecruiters = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return recruiters;
    return recruiters.filter((recruiter) =>
      [recruiter.name, recruiter.email, recruiter.rid].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(normalizedSearch),
      ),
    );
  }, [recruiters, searchTerm]);

  const filteredAssignRecruiters = useMemo(() => {
    const normalizedSearch = assignSearchTerm.trim().toLowerCase();
    if (!normalizedSearch) return recruiters;
    return recruiters.filter((recruiter) =>
      [recruiter.name, recruiter.email, recruiter.rid].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(normalizedSearch),
      ),
    );
  }, [recruiters, assignSearchTerm]);

  const handleRefresh = async () => {
    await loadData();
  };

  const handleCreateTask = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    setMessageType("");
    setErrorMessage("");
    try {
      await createAdminTask(formData);
      setMessageType("success");
      setMessage("Task created and assigned successfully.");
      setFormData({ heading: "", description: "", recruiterRid: "" });
      setSearchTerm("");
      setIsModalOpen(false);
      await loadData({ silent: true });
    } catch (error) {
      setMessageType("error");
      setMessage(error.message || "Failed to create task.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignRecruiter = async () => {
    if (!selectedTask?.id || !assignRecruiterRid) return;
    setIsAssigning(true);
    setMessage("");
    setMessageType("");
    setErrorMessage("");
    try {
      await assignAdminTask(selectedTask.id, { recruiterRid: assignRecruiterRid });
      setMessageType("success");
      setMessage("Task assigned successfully.");
      setAssignRecruiterRid("");
      setAssignSearchTerm("");
      await loadData({ silent: true });
    } catch (error) {
      setMessageType("error");
      setMessage(error.message || "Failed to assign team member.");
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <AdminLayout
      title="Tasks and assignments"
      subtitle="Create task headings, assign them to recruiters or team leaders, and track completed, rejected, timed out, or pending updates."
      setCurrentPage={setCurrentPage}
      actions={
        <>
          <button
            type="button"
            className="admin-refresh-btn"
            onClick={() => setIsModalOpen(true)}
          >
            Create task
          </button>
          <button
            type="button"
            className="admin-back-btn"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
        </>
      }
    >
      {errorMessage ? (
        <div className="admin-alert admin-alert-error">{errorMessage}</div>
      ) : null}
      {message ? (
        <div
          className={`admin-alert ${
            messageType === "error" ? "admin-alert-error" : ""
          }`}
        >
          {message}
        </div>
      ) : null}

      <div className="task-admin-grid">
        <section className="admin-dashboard-card admin-card-large task-list-card">
          <div className="task-section-head">
            <div>
              <p className="task-section-kicker">Overview</p>
              <h2 style={{ margin: 0 }}>Created tasks</h2>
            </div>
            <span className="admin-muted">{tasks.length} total</span>
          </div>
          <div className="task-summary-grid">
            <article className="task-summary-card">
              <span>Total tasks</span>
              <strong>{summary.totalTasks}</strong>
            </article>
            <article className="task-summary-card">
              <span>Assignments</span>
              <strong>{summary.totalAssignments}</strong>
            </article>
            <article className="task-summary-card">
              <span>Pending</span>
              <strong>{summary.pending}</strong>
            </article>
            <article className="task-summary-card">
              <span>Timed out</span>
              <strong>{summary.timedOut}</strong>
            </article>
          </div>
          <div className="task-search-row">
            <input
              type="text"
              value={taskFilter}
              onChange={(event) => setTaskFilter(event.target.value)}
              placeholder="Search task heading or description"
            />
          </div>

          {isLoading ? (
            <p className="admin-chart-empty">Loading tasks...</p>
          ) : tasks.length === 0 ? (
            <p className="admin-chart-empty">
              No tasks created yet. Use Create task to assign the first one.
            </p>
          ) : filteredTasks.length === 0 ? (
            <p className="admin-chart-empty">
              No tasks match the current search.
            </p>
          ) : (
            <div className="task-admin-list">
              {filteredTasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  className={`task-admin-list-item ${
                    selectedTaskId === task.id ? "is-active" : ""
                  }`}
                  onClick={() => setSelectedTaskId(task.id)}
                >
                  <div className="task-admin-list-head">
                    <div className="task-title-stack">
                      <strong>{task.heading}</strong>
                      <span className="admin-muted">
                        Updated {formatDateTime(task.updatedAt)}
                      </span>
                    </div>
                    <span className="task-count-pill">
                      {task.totalAssignments || 0} assigned
                    </span>
                  </div>
                  <p>{task.description || "No description added."}</p>
                  <div className="task-admin-summary-row">
                    <span>Pending: {task.pendingCount || 0}</span>
                    <span>Completed: {task.completedCount || 0}</span>
                    <span>Rejected: {task.rejectedCount || 0}</span>
                    <span>Timed out: {task.timedOutCount || 0}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="admin-dashboard-card admin-card-large task-detail-card">
          {!selectedTask ? (
            <p className="admin-chart-empty">
              Select a task heading to view assigned team members and statuses.
            </p>
          ) : (
            <>
              <div className="task-detail-hero">
                <div>
                  <p className="task-section-kicker">Task detail</p>
                  <h2 style={{ margin: 0 }}>{selectedTask.heading}</h2>
                  <p className="admin-page-subtitle">
                    {selectedTask.description || "No description added."}
                  </p>
                </div>
                <div className="task-meta-stack">
                  <span>Created: {formatDateTime(selectedTask.createdAt)}</span>
                  <span>
                    Last updated: {formatDateTime(selectedTask.updatedAt)}
                  </span>
                </div>
              </div>
              <div className="task-summary-grid task-summary-grid-detail">
                <article className="task-summary-card">
                  <span>Assigned</span>
                  <strong>{selectedTask.totalAssignments || 0}</strong>
                </article>
                <article className="task-summary-card">
                  <span>Completed</span>
                  <strong>{selectedTask.completedCount || 0}</strong>
                </article>
                <article className="task-summary-card">
                  <span>Rejected</span>
                  <strong>{selectedTask.rejectedCount || 0}</strong>
                </article>
                <article className="task-summary-card">
                  <span>Pending</span>
                  <strong>{selectedTask.pendingCount || 0}</strong>
                </article>
              </div>

              <div className="task-assign-box">
                <div className="task-assign-box-head">
                  <div>
                    <h3 style={{ margin: 0 }}>
                      Assign this task to another team member
                    </h3>
                    <p className="admin-muted" style={{ margin: "0.35rem 0 0" }}>
                      Use the searchable picker below to add another recruiter or
                      team leader to this same task heading.
                    </p>
                  </div>
                </div>
                <div className="task-assign-form-grid">
                  <input
                    type="text"
                    value={assignSearchTerm}
                    onChange={(event) => setAssignSearchTerm(event.target.value)}
                    placeholder="Search recruiter or team leader by name, email, or RID"
                  />
                  <select
                    value={assignRecruiterRid}
                    onChange={(event) => setAssignRecruiterRid(event.target.value)}
                  >
                    <option value="">Select team member</option>
                    {filteredAssignRecruiters.map((recruiter) => (
                      <option key={recruiter.rid} value={recruiter.rid}>
                        {recruiter.name || recruiter.rid}
                        {recruiter.role ? ` (${recruiter.role})` : ""}
                        {recruiter.email ? ` - ${recruiter.email}` : ""}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="admin-create-btn"
                    onClick={handleAssignRecruiter}
                    disabled={isAssigning || !assignRecruiterRid}
                  >
                    {isAssigning ? "Assigning..." : "Assign task"}
                  </button>
                </div>
              </div>

              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Assignee</th>
                      <th>Role</th>
                      <th>RID</th>
                      <th>Assigned day</th>
                      <th>Status</th>
                      <th>Rescheduled</th>
                      <th>Assigned at</th>
                      <th>Action time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedTask.assignments || []).map((assignment) => (
                      <tr key={assignment.assignmentId}>
                        <td>
                          <div className="admin-cell-stack">
                            <strong>
                              {assignment.recruiterName || assignment.recruiterRid}
                            </strong>
                            <span className="admin-muted">
                              {assignment.recruiterEmail || "Email not available"}
                            </span>
                          </div>
                        </td>
                        <td>{assignment.recruiterRole || "Recruiter"}</td>
                        <td>{assignment.recruiterRid}</td>
                        <td>{formatDateOnly(assignment.assignmentDate)}</td>
                        <td>
                          <span
                            className={`task-status-pill is-${assignment.status}`}
                          >
                            {STATUS_LABELS[assignment.status] || assignment.status}
                          </span>
                          {assignment.isScheduledForFuture ? (
                            <div className="admin-muted" style={{ marginTop: "0.35rem" }}>
                              Action unlocks on{" "}
                              {formatDateOnly(assignment.assignmentDate)}
                            </div>
                          ) : null}
                        </td>
                        <td>
                          {assignment.rescheduledAt ? (
                            <div className="admin-cell-stack">
                              <span>
                                {assignment.rescheduledFromDate
                                  ? `${formatDateOnly(
                                      assignment.rescheduledFromDate,
                                    )} to ${formatDateOnly(
                                      assignment.assignmentDate,
                                    )}`
                                  : formatDateOnly(assignment.assignmentDate)}
                              </span>
                              <span className="admin-muted">
                                {assignment.rescheduledByName ||
                                  assignment.rescheduledByRid ||
                                  "Updated"}{" "}
                                on {formatDateTime(assignment.rescheduledAt)}
                              </span>
                            </div>
                          ) : (
                            <span className="admin-muted">Not rescheduled</span>
                          )}
                        </td>
                        <td>{formatDateTime(assignment.assignedAt)}</td>
                        <td>{formatDateTime(assignment.actedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>

      {isModalOpen ? (
        <div
          className="admin-modal-overlay"
          onClick={() => !isSubmitting && setIsModalOpen(false)}
        >
          <div
            className="admin-modal-card task-create-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 style={{ marginTop: 0 }}>Create task</h2>
            <form onSubmit={handleCreateTask} className="admin-form">
              <label htmlFor="taskHeading">Task heading</label>
              <input
                id="taskHeading"
                value={formData.heading}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    heading: event.target.value,
                  }))
                }
                placeholder="Enter task heading"
                required
              />

              <label htmlFor="taskDescription">Task description (optional)</label>
              <textarea
                id="taskDescription"
                rows={3}
                value={formData.description}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                placeholder="Add a short description if needed"
              />

              <label htmlFor="taskRecruiterSearch">Search team member</label>
              <input
                id="taskRecruiterSearch"
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search recruiter or team leader by name, email, or RID"
              />

              <label htmlFor="taskRecruiter">Assign to team member</label>
              <select
                id="taskRecruiter"
                value={formData.recruiterRid}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    recruiterRid: event.target.value,
                  }))
                }
                required
              >
                <option value="">Select team member</option>
                {filteredRecruiters.map((recruiter) => (
                  <option key={recruiter.rid} value={recruiter.rid}>
                    {recruiter.name || recruiter.rid}
                    {recruiter.role ? ` (${recruiter.role})` : ""}
                    {recruiter.email ? ` - ${recruiter.email}` : ""}
                  </option>
                ))}
              </select>

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="admin-back-btn"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-create-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Assigning..." : "Create and assign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </AdminLayout>
  );
}
