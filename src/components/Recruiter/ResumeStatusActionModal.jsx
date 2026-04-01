import { useState, useEffect } from "react";
import { authFetch } from "../../auth/authFetch";
import { API_BASE_URL } from "../../config/api";
import { useNotification } from "../../context/NotificationContext";
import {
  buildCandidatePayloadAliases,
  normalizeResumeData,
} from "../../utils/dashboardData";

export default function ResumeStatusActionModal({
  isOpen,
  onClose,
  resume,
  onSuccess,
  currentStatus,
}) {
  const [selectedAction, setSelectedAction] = useState(null);
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showJoiningConfirm, setShowJoiningConfirm] = useState(false);
  const [joiningDate, setJoiningDate] = useState("");
  const [joiningNote, setJoiningNote] = useState("");
  const { addNotification } = useNotification();

  useEffect(() => {
    if (!isOpen) {
      setSelectedAction(null);
      setAdditionalInfo("");
      setErrorMessage("");
      setSuccessMessage("");
      setShowJoiningConfirm(false);
      setJoiningDate("");
      setJoiningNote("");
    }
  }, [isOpen]);

  if (!isOpen || !resume) return null;
  const normalizedResume = normalizeResumeData(resume);

  const getAvailableActions = () => {
    const normalized = String(currentStatus || "")
      .trim()
      .toLowerCase();
    if (normalized === "verified") {
      return [
        { value: "walk_in", label: "Walk In", color: "success" },
        { value: "rejected", label: "Reject", color: "danger" },
      ];
    }
    // After walk_in, only admin can advance candidates further
    return [];
  };

  const getReasonFieldLabel = () => {
    if (selectedAction === "walk_in") return "Walk In Reason";
    if (selectedAction === "selected") return "Selection Reason";
    if (selectedAction === "joined") return "Joining Reason";
    if (selectedAction === "dropout") return "Dropout Reason";
    if (selectedAction === "rejected") return "Rejection Reason";
    if (selectedAction === "left") return "Reason for Leaving";
    return "Additional Information";
  };

  const handleSubmitAction = async () => {
    if (!selectedAction) {
      setErrorMessage("Please select an action.");
      return;
    }

    if (selectedAction === "joined" && !showJoiningConfirm) {
      setShowJoiningConfirm(true);
      setErrorMessage("");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await authFetch(
        `${API_BASE_URL}/api/recruiters/${encodeURIComponent(
          normalizedResume.recruiterRid || "",
        )}/resumes/${encodeURIComponent(resume.resId)}/advance-status`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: selectedAction,
            ...buildCandidatePayloadAliases(normalizedResume),
            ...(additionalInfo.trim()
              ? { reason: additionalInfo.trim() }
              : {}),
            ...(selectedAction === "joined" && joiningDate
              ? { joining_date: joiningDate }
              : {}),
            ...(selectedAction === "joined" && joiningNote.trim()
              ? {
                  joining_note: joiningNote.trim(),
                  joined_reason: joiningNote.trim(),
                }
              : {}),
          }),
        },
        "Failed to advance resume status.",
      );

      const statusLabel = selectedAction.replace(/_/g, " ");
      const candidateName = normalizedResume.candidateName || "Unknown";
      const jobId = normalizedResume.jobJid || "N/A";
      const notificationMessage = `Status updated to ${statusLabel} for ${candidateName} (Job ID: ${jobId})`;

      addNotification(notificationMessage, "success", 5000);
      setSuccessMessage(
        `Resume status updated to ${selectedAction.replace(/_/g, " ")}.`,
      );
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);
    } catch (error) {
      setErrorMessage(error.message || "Failed to update resume status.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableActions = getAvailableActions();

  return (
    <div className="modal-overlay" onClick={() => !isSubmitting && onClose()}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "500px" }}
      >
        <div className="modal-header">
          <h3>Resume Status Action</h3>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            disabled={isSubmitting}
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="resume-info-preview">
            <p>
              <strong>Candidate:</strong> {normalizedResume.candidateName || "N/A"}
            </p>
            <p>
              <strong>Phone:</strong>{" "}
              {normalizedResume.candidatePhone ? (
                <a href={`tel:${normalizedResume.candidatePhone}`}>
                  {normalizedResume.candidatePhone}
                </a>
              ) : (
                "N/A"
              )}
            </p>
            <p>
              <strong>Current Status:</strong>{" "}
              {String(currentStatus || "").replace(/_/g, " ")}
            </p>
            <p>
              <strong>Job ID:</strong> {normalizedResume.jobJid || "N/A"}
            </p>
          </div>

          {availableActions.length === 0 ? (
            <div className="job-message job-message-warning">
              No actions available for this status.
            </div>
          ) : (
            <>
              <div className="form-group">
                <label>Select Action</label>
                <div className="action-buttons-group">
                  {availableActions.map((action) => (
                    <button
                      key={action.value}
                      type="button"
                      className={`action-btn action-btn-${action.color} ${
                        selectedAction === action.value ? "active" : ""
                      }`}
                      onClick={() => {
                        setSelectedAction(action.value);
                        setAdditionalInfo("");
                        setErrorMessage("");
                        setShowJoiningConfirm(false);
                        setJoiningDate("");
                        setJoiningNote("");
                      }}
                      disabled={isSubmitting}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>

              {selectedAction && !showJoiningConfirm && (
                <div className="form-group">
                  <label htmlFor="reason-input">
                    {getReasonFieldLabel()} (optional)
                  </label>
                  <textarea
                    id="reason-input"
                    className="form-control"
                    rows="4"
                    placeholder={`Enter ${getReasonFieldLabel().toLowerCase()}...`}
                    value={additionalInfo}
                    onChange={(e) => setAdditionalInfo(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <small className="form-text-muted">
                    This information will be saved for reference.
                  </small>
                  {selectedAction === "walk_in" ? (
                    <small className="form-text-muted">
                      The walk-in date will be recorded automatically.
                    </small>
                  ) : null}
                </div>
              )}

              {showJoiningConfirm && (
                <div className="joining-confirm-section">
                  <h4 style={{ margin: "0 0 12px" }}>
                    Confirm Joining Details
                  </h4>
                  <div className="form-group">
                    <label htmlFor="joining-date-input">
                      Joining Date (optional)
                    </label>
                    <input
                      id="joining-date-input"
                      type="date"
                      className="form-control"
                      value={joiningDate}
                      onChange={(e) => setJoiningDate(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="joining-note-input">
                      Joining Note (optional)
                    </label>
                    <textarea
                      id="joining-note-input"
                      className="form-control"
                      rows="3"
                      placeholder="Enter any joining notes..."
                      value={joiningNote}
                      onChange={(e) => setJoiningNote(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="job-message job-message-error">
                  {errorMessage}
                </div>
              )}
              {successMessage && (
                <div className="job-message job-message-success">
                  {successMessage}
                </div>
              )}
            </>
          )}
        </div>

        {availableActions.length > 0 && (
          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            {selectedAction && showJoiningConfirm && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowJoiningConfirm(false)}
                disabled={isSubmitting}
              >
                Back
              </button>
            )}
            {selectedAction && (
              <button
                type="button"
                className="btn-primary"
                onClick={handleSubmitAction}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Updating..."
                  : showJoiningConfirm
                    ? "Confirm Joined"
                    : selectedAction === "joined"
                      ? "Next"
                      : "Confirm Action"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
