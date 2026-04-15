import { authFetch } from "../auth/authFetch";
import { API_BASE_URL } from "../config/api";

export const fetchAdminTasks = () =>
  authFetch(`${API_BASE_URL}/api/admin/tasks`, {}, "Failed to fetch tasks.");

export const fetchAdminAssignableRecruiters = () =>
  authFetch(
    `${API_BASE_URL}/api/admin/recruiters/list`,
    {},
    "Failed to fetch recruiters list.",
  );

export const createAdminTask = (payload) =>
  authFetch(
    `${API_BASE_URL}/api/admin/tasks`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    "Failed to create task.",
  );

export const assignAdminTask = (taskId, payload) =>
  authFetch(
    `${API_BASE_URL}/api/admin/tasks/${encodeURIComponent(taskId)}/assign`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    "Failed to assign task.",
  );

export const fetchRecruiterTasks = (rid) =>
  authFetch(
    `${API_BASE_URL}/api/recruiters/${encodeURIComponent(rid)}/tasks`,
    {},
    "Failed to fetch recruiter tasks.",
  );

export const updateRecruiterTaskStatus = (rid, assignmentId, status) =>
  authFetch(
    `${API_BASE_URL}/api/recruiters/${encodeURIComponent(rid)}/tasks/${encodeURIComponent(assignmentId)}/status`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    },
    "Failed to update task status.",
  );

export const rescheduleRecruiterTask = (rid, assignmentId, assignmentDate) =>
  authFetch(
    `${API_BASE_URL}/api/recruiters/${encodeURIComponent(rid)}/tasks/${encodeURIComponent(assignmentId)}/reschedule`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignmentDate }),
    },
    "Failed to reschedule task.",
  );
