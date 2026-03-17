import { useState } from "react";

function DashboardNotesSidebar() {
  const [notes, setNotes] = useState([
    { id: 1, text: "Follow up on TeamFlow UI polish", pinned: false },
    { id: 2, text: "Check due soon tasks", pinned: true },
    { id: 3, text: "Prepare calendar page layout", pinned: true },
    { id: 4, text: "Review project card spacing", pinned: false },
  ]);
  const [newNote, setNewNote] = useState("");

  const addNote = () => {
    if (!newNote.trim()) return;

    setNotes((prev) => [
      {
        id: Date.now(),
        text: newNote.trim(),
        pinned: false,
      },
      ...prev,
    ]);
    setNewNote("");
  };

  const togglePinned = (id) => {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === id ? { ...note, pinned: !note.pinned } : note
      )
    );
  };

  return (
    <div className="notes-panel">
      <div className="notes-panel-header">
        <h3>Quick Notes</h3>
      </div>

      <div className="notes-input-wrap">
        <input
          type="text"
          className="input"
          placeholder="Write a quick note..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addNote();
          }}
        />
        <button className="btn" type="button" onClick={addNote}>
          Add
        </button>
      </div>

      <div className="notes-list">
        {notes.map((note) => (
          <div key={note.id} className="note-card">
            <p>{note.text}</p>
            <button
              type="button"
              className={`note-dot ${note.pinned ? "active" : ""}`}
              onClick={() => togglePinned(note.id)}
              aria-label="Toggle note status"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default DashboardNotesSidebar;