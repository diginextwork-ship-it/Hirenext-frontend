import { useState } from "react";
import "../styles/password-change-modal.css";
import { API_BASE_URL } from "../config/api";
import { getAuthSession } from "../auth/session";
import { useNotification } from "../context/NotificationContext";

export default function PasswordChangeModal({
  isOpen,
  onClose,
  recruiterName,
  recruiterId,
  onPasswordChanged,
  isFirstLogin = false,
}) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const { addNotification } = useNotification();

  const validatePasswords = () => {
    if (!newPassword) {
      setMessageType("error");
      setMessage("Please enter a new password.");
      return false;
    }

    if (newPassword.length < 6) {
      setMessageType("error");
      setMessage("Password must be at least 6 characters long.");
      return false;
    }

    if (newPassword !== confirmPassword) {
      setMessageType("error");
      setMessage("Passwords do not match.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setMessageType("");

    if (!validatePasswords()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const session = getAuthSession();
      const token = session?.token || "";

      const response = await fetch(
        `${API_BASE_URL}/api/recruiters/${recruiterId}/change-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            newPassword,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Failed to change password");
      }

      setNewPassword("");
      setConfirmPassword("");
      setMessage("");
      setMessageType("");
      addNotification("Password changed successfully", "success", 4000);

      if (onPasswordChanged) {
        onPasswordChanged();
      }

      onClose();
    } catch (error) {
      setMessageType("error");
      setMessage(
        error.message || "Unable to change password. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="password-change-modal-overlay">
      <div className="password-change-modal">
        <div className="password-change-modal-header">
          <h2>Change Password</h2>
          <p className="password-change-modal-subtitle">
            Hello <strong>{recruiterName}</strong>, enter and confirm a new
            password for your account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="password-change-form">
          <div className="password-field-group">
            <label htmlFor="new-password">Enter Password</label>
            <div className="password-input-wrapper">
              <input
                id="new-password"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter password"
                disabled={isSubmitting}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isSubmitting}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <path
                      d="M3 3l18 18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <path
                      d="M10.58 10.58a2 2 0 1 0 2.83 2.83"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M9.88 5.08A10.9 10.9 0 0 1 12 4.9c5.25 0 8.85 3.97 10 7.1a12.64 12.64 0 0 1-3.12 4.49M6.6 6.6A13.4 13.4 0 0 0 2 12c1.15 3.13 4.75 7.1 10 7.1 1.87 0 3.5-.5 4.94-1.27"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <path
                      d="M2 12s3.6-7.1 10-7.1S22 12 22 12s-3.6 7.1-10 7.1S2 12 2 12z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="password-field-group">
            <label htmlFor="confirm-password">Re-enter Password</label>
            <div className="password-input-wrapper">
              <input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                disabled={isSubmitting}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isSubmitting}
                aria-label={
                  showConfirmPassword ? "Hide password" : "Show password"
                }
              >
                {showConfirmPassword ? (
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <path
                      d="M3 3l18 18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <path
                      d="M10.58 10.58a2 2 0 1 0 2.83 2.83"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M9.88 5.08A10.9 10.9 0 0 1 12 4.9c5.25 0 8.85 3.97 10 7.1a12.64 12.64 0 0 1-3.12 4.49M6.6 6.6A13.4 13.4 0 0 0 2 12c1.15 3.13 4.75 7.1 10 7.1 1.87 0 3.5-.5 4.94-1.27"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <path
                      d="M2 12s3.6-7.1 10-7.1S22 12 22 12s-3.6 7.1-10 7.1S2 12 2 12z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {message && (
            <div className={`password-change-message ${messageType}`}>
              {message}
            </div>
          )}

          <button
            type="submit"
            className="password-change-submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
        </form>

        <p className="password-change-modal-note">
          {isFirstLogin
            ? "This is required on your first login. Please remember your new password."
            : "Choose a password you can remember and keep your account secure."}
        </p>
      </div>
    </div>
  );
}
