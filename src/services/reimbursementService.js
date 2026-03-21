import { authFetch } from "../auth/authFetch";
import { API_BASE_URL } from "../config/api";

export const submitReimbursement = (amount, description) =>
  authFetch(
    `${API_BASE_URL}/api/reimbursements`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, description }),
    },
    "Failed to submit reimbursement.",
  );

export const fetchMyReimbursements = () =>
  authFetch(
    `${API_BASE_URL}/api/reimbursements/my`,
    {},
    "Failed to fetch reimbursements.",
  );

export const fetchAdminReimbursements = () =>
  authFetch(
    `${API_BASE_URL}/api/admin/reimbursements`,
    {},
    "Failed to fetch reimbursements.",
  );

export const decideReimbursement = (id, decision, adminNote = "") =>
  authFetch(
    `${API_BASE_URL}/api/admin/reimbursements/${encodeURIComponent(id)}/decision`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, adminNote }),
    },
    "Failed to update reimbursement.",
  );
