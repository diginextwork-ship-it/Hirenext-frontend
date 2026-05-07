import { useState } from "react";
import { displayNote } from "../../utils/dashboardData";

export default function NoteViewButton({ note, candidateName, authorName }) {
  const [open, setOpen] = useState(false);
  const displayedNote = displayNote(note);

  if (displayedNote === "-") return "-";

  return (
    <>
      <button
        type="button"
        className="note-view-btn"
        onClick={() => setOpen(true)}
      >
        view note
      </button>
      {open ? (
        <div
          className="note-view-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <div
            className="note-view-card"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="note-view-close"
              aria-label="Close note"
              onClick={() => setOpen(false)}
            >
              x
            </button>
            <div className="note-view-body">
              <p className="note-view-label">Candidate</p>
              <h3>{displayNote(candidateName)}</h3>
              <p className="note-view-label">Mentioned by</p>
              <p className="note-view-author">{displayNote(authorName)}</p>
              <p className="note-view-label">Note</p>
              <p className="note-view-text">{displayedNote}</p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
