import { useEffect, useMemo, useState } from "react";
import useDailyRefresh from "../../hooks/useDailyRefresh";
import {
  fetchRecruiterTasks,
  updateRecruiterTaskStatus,
} from "../../services/taskService";

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

export default function RecruiterTasksPanel({ recruiterId }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  const loadTasks = async ({ silent = false } = {}) => {
    if (!recruiterId) return;
    if (!silent) setLoading(true);
    setErrorMessage("");
    try {
      const data = await fetchRecruiterTasks(recruiterId);
      const nextTasks = Array.isArray(data?.tasks) ? data.tasks : [];
      setTasks(nextTasks);
      setSelectedTaskId((prev) => {
        if (prev && nextTasks.some((task) => task.id === prev)) return prev;
        return nextTasks[0]?.id || null;
      });
    } catch (error) {
      setErrorMessage(error.message || "Failed to load tasks.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [recruiterId]);

  useDailyRefresh(() => {
    loadTasks({ silent: true });
  }, Boolean(recruiterId));

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) || null,
    [tasks, selectedTaskId],
  );

  const summary = useMemo(
    () =>
      tasks.reduce(
        (accumulator, task) => ({
          total: accumulator.total + 1,
          pending: accumulator.pending + (task.status === "pending" ? 1 : 0),
          completed:
            accumulator.completed + (task.status === "completed" ? 1 : 0),
          rejected: accumulator.rejected + (task.status === "rejected" ? 1 : 0),
          timedOut:
            accumulator.timedOut + (task.status === "timed_out" ? 1 : 0),
        }),
        {
          total: 0,
          pending: 0,
          completed: 0,
          rejected: 0,
          timedOut: 0,
        },
      ),
    [tasks],
  );

  const handleStatusUpdate = async (status) => {
    if (!selectedTask?.assignmentId) return;
    setBusyAction(status);
    setErrorMessage("");
    setStatusMessage("");
    try {
      await updateRecruiterTaskStatus(recruiterId, selectedTask.assignmentId, status);
      setStatusMessage(
        status === "completed"
          ? "Task marked as completed."
          : "Task marked as rejected.",
      );
      await loadTasks({ silent: true });
    } catch (error) {
      setErrorMessage(error.message || "Failed to update task status.");
    } finally {
      setBusyAction("");
    }
  };

  return (
    <section className="chart-card ui-mt-md recruiter-tasks-panel">
      <div className="ui-row-between ui-row-wrap">
        <h2>My Tasks</h2>
        <button
          type="button"
          className="click-here-btn"
          onClick={() => loadTasks()}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {errorMessage ? (
        <p className="job-message job-message-error">{errorMessage}</p>
      ) : null}
      {statusMessage ? (
        <p className="job-message job-message-success">{statusMessage}</p>
      ) : null}

      {loading ? (
        <p className="chart-empty">Loading tasks...</p>
      ) : tasks.length === 0 ? (
        <p className="chart-empty">No tasks have been assigned yet.</p>
      ) : (
        <>
          <div className="recruiter-task-summary-grid">
            <article className="recruiter-task-summary-card">
              <span>Total</span>
              <strong>{summary.total}</strong>
            </article>
            <article className="recruiter-task-summary-card">
              <span>Pending</span>
              <strong>{summary.pending}</strong>
            </article>
            <article className="recruiter-task-summary-card">
              <span>Completed</span>
              <strong>{summary.completed}</strong>
            </article>
            <article className="recruiter-task-summary-card">
              <span>Timed out</span>
              <strong>{summary.timedOut}</strong>
            </article>
          </div>
          <div className="recruiter-task-layout">
            <div className="recruiter-task-list">
            {tasks.map((task) => (
              <button
                key={`${task.id}-${task.assignmentId}`}
                type="button"
                className={`recruiter-task-list-item ${
                  selectedTaskId === task.id ? "is-active" : ""
                }`}
                onClick={() => setSelectedTaskId(task.id)}
              >
                <div className="recruiter-task-list-head">
                  <div className="recruiter-task-title">
                    <strong>{task.heading}</strong>
                    <span>Assigned {formatDateTime(task.assignedAt)}</span>
                  </div>
                  <span className={`task-status-pill is-${task.status}`}>
                    {STATUS_LABELS[task.status] || task.status}
                  </span>
                </div>
                <p>{task.description || "No description added."}</p>
              </button>
            ))}
          </div>

            <div className="recruiter-task-detail">
            {!selectedTask ? (
              <p className="chart-empty">Select a task to see the details.</p>
            ) : (
              <>
                <div className="recruiter-task-hero">
                  <div className="recruiter-task-heading">
                    <p className="task-section-kicker">Task details</p>
                    <h3>{selectedTask.heading}</h3>
                  </div>
                  <span className={`task-status-pill is-${selectedTask.status}`}>
                    {STATUS_LABELS[selectedTask.status] || selectedTask.status}
                  </span>
                </div>
                <p>{selectedTask.description || "No description provided."}</p>
                <div className="recruiter-task-info-grid">
                  <div>
                    <strong>Assigned at</strong>
                    <div>{formatDateTime(selectedTask.assignedAt)}</div>
                  </div>
                  <div>
                    <strong>Action time</strong>
                    <div>{formatDateTime(selectedTask.actedAt)}</div>
                  </div>
                </div>

                <div className="recruiter-task-members">
                  <h4>Other recruiters on this task</h4>
                  <ul className="recruiter-task-member-list">
                    {(selectedTask.recruiters || []).map((member) => (
                      <li key={`${selectedTask.id}-${member.recruiterRid}`}>
                        <strong>
                          {member.recruiterName || member.recruiterRid}
                          {member.isSelf ? " (You)" : ""}
                        </strong>
                        <span>{member.recruiterEmail || member.recruiterRid}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="recruiter-task-actions">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => handleStatusUpdate("completed")}
                    disabled={busyAction !== "" || selectedTask.status !== "pending"}
                  >
                    {busyAction === "completed" ? "Saving..." : "Completed"}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => handleStatusUpdate("rejected")}
                    disabled={busyAction !== "" || selectedTask.status !== "pending"}
                  >
                    {busyAction === "rejected" ? "Saving..." : "Reject Task"}
                  </button>
                </div>
                {selectedTask.status === "timed_out" ? (
                  <p className="admin-muted">
                    This task timed out because no action was taken by the end of
                    the assigned day.
                  </p>
                ) : null}
              </>
            )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
