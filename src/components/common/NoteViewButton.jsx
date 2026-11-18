import { useState, useEffect } from "react";
import { displayNote } from "../../utils/dashboardData";

export default function NoteViewButton({
  note,
  candidateName,
  authorName,
  editable = false,
  onSave,
  emptyLabel = "+ add note",
}) {
  const [open, setOpen] = useState(false);
  const [currentNote, setCurrentNote] = useState(note || "");
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setCurrentNote(note || "");
  }, [note]);

  const displayedNote = displayNote(currentNote);
  const hasExistingNote = displayedNote !== "-";

  if (!hasExistingNote && !editable) return "-";

  const handleOpen = () => {
    setEditText(currentNote || "");
    setIsEditing(!hasExistingNote); // auto-edit if empty
    setError("");
    setOpen(true);
  };

  const handleSave = async () => {
    if (!onSave) {
      setIsEditing(false);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(editText.trim());
      setCurrentNote(editText.trim());
      setIsEditing(false);
    } catch (err) {
      setError(err?.message || "Failed to save note.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="note-view-btn"
        style={!hasExistingNote && editable ? { color: "#2563eb", fontWeight: 600 } : undefined}
        onClick={handleOpen}
      >
        {hasExistingNote ? "view note" : emptyLabel}
      </button>

      {open ? (
        <div
          className="note-view-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            if (!saving) setOpen(false);
          }}
        >
          <div
            className="note-view-card"
            style={{ width: "min(100%, 460px)" }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="note-view-close"
              aria-label="Close note"
              disabled={saving}
              onClick={() => setOpen(false)}
            >
              x
            </button>
            <div className="note-view-body">
              <p className="note-view-label">Candidate</p>
              <h3>{displayNote(candidateName)}</h3>
              <p className="note-view-label">Mentioned by</p>
              <p className="note-view-author">{displayNote(authorName)}</p>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.85rem", marginBottom: "0.22rem" }}>
                <p className="note-view-label" style={{ margin: 0 }}>Note</p>
                {editable && !isEditing && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditText(currentNote || "");
                      setIsEditing(true);
                      setError("");
                    }}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "#2563eb",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                  >
                    Edit Note
                  </button>
                )}
              </div>

              {isEditing ? (
                <div style={{ marginTop: 6 }}>
                  <textarea
                    rows={4}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    placeholder="Enter or edit note..."
                    disabled={saving}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontFamily: "inherit",
                      fontSize: "0.95rem",
                      lineHeight: "1.4",
                      boxSizing: "border-box",
                      resize: "vertical",
                    }}
                  />
                  {error && (
                    <p style={{ color: "#dc2626", fontSize: "0.85rem", marginTop: 4, marginBottom: 4 }}>
                      {error}
                    </p>
                  )}
                  <div style={{ display: "flex", gap: "8px", marginTop: "8px", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => {
                        setIsEditing(false);
                        setEditText(currentNote || "");
                        setError("");
                      }}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        background: "#fff",
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: "0.85rem",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={handleSave}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "6px",
                        border: "none",
                        background: "#2563eb",
                        color: "#fff",
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: "0.85rem",
                      }}
                    >
                      {saving ? "Saving..." : "Save Note"}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="note-view-text">{displayedNote}</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
