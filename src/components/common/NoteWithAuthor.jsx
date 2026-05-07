import { displayNote } from "../../utils/dashboardData";

export default function NoteWithAuthor({ note, author }) {
  const displayedNote = displayNote(note);
  const authorName = String(author || "").trim();

  if (displayedNote === "-" || !authorName) {
    return displayedNote;
  }

  return (
    <>
      {displayedNote}, <strong>{authorName}</strong>
    </>
  );
}
