import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

function DashboardNotesSidebar({
  title = "Quick Notes",
  projectId = null,
  collapsed = false,
  onToggleCollapse,
}) {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotes();
  }, [projectId]);

  const loadNotes = async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    setUserId(user.id);

    let query = supabase
      .from("notes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (projectId) {
      query = query.eq("project_id", projectId);
    } else {
      query = query.is("project_id", null);
    }

    const { data, error } = await query;

    if (!error) {
      setNotes(data || []);
    }

    setLoading(false);
  };

  const addNote = async () => {
    if (!newNote.trim() || !userId) return;

    const notePayload = {
      user_id: userId,
      project_id: projectId || null,
      content: newNote.trim(),
      is_completed: false,
    };

    const { data, error } = await supabase
      .from("notes")
      .insert([notePayload])
      .select()
      .single();

    if (error) return;

    setNotes((prev) => [data, ...prev]);
    setNewNote("");
  };

  const toggleCompleted = async (id, currentValue) => {
    const { error } = await supabase
      .from("notes")
      .update({ is_completed: !currentValue })
      .eq("id", id);

    if (error) return;

    setNotes((prev) =>
      prev.map((note) =>
        note.id === id ? { ...note, is_completed: !currentValue } : note
      )
    );
  };

  const deleteNote = async (id) => {
    const { error } = await supabase.from("notes").delete().eq("id", id);

    if (error) return;

    setNotes((prev) => prev.filter((note) => note.id !== id));
  };

  return (
  <div className={`notes-panel-wrap ${collapsed ? "collapsed" : ""}`}>
    {collapsed ? (
      <div className="notes-panel-toggle-wrap">
        <button
          type="button"
          className="notes-collapse-btn"
          onClick={onToggleCollapse}
          aria-label="Expand notes panel"
          title="Expand notes panel"
        >
          ←
        </button>

        <div className="notes-collapsed-label">
          {projectId ? "Project" : "Notes"}
        </div>
      </div>
    ) : (
      <div className="notes-panel">
        <div className="notes-panel-header-block">
          <div className="notes-panel-header-top">
            <button
              type="button"
              className="notes-collapse-btn"
              onClick={onToggleCollapse}
              aria-label="Collapse notes panel"
              title="Collapse notes panel"
            >
              →
            </button>
          </div>

          <div className="notes-panel-header">
            <h3>{title}</h3>
          </div>
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

        {loading ? (
          <p className="muted">Loading notes...</p>
        ) : notes.length === 0 ? (
          <p className="muted">No notes yet.</p>
        ) : (
          <div className="notes-list">
            {notes.map((note) => (
              <div
                key={note.id}
                className={`note-card ${
                  note.is_completed ? "note-card-completed" : ""
                }`}
              >
                <button
                  type="button"
                  className={`note-dot ${note.is_completed ? "active" : ""}`}
                  onClick={() => toggleCompleted(note.id, note.is_completed)}
                  aria-label="Toggle note status"
                  title="Mark complete"
                >
                  {note.is_completed ? "✓" : ""}
                </button>

                <p className={note.is_completed ? "note-text-completed" : ""}>
                  {note.content}
                </p>

                <button
                  type="button"
                  className="note-delete-btn"
                  onClick={() => deleteNote(note.id)}
                  aria-label="Delete note"
                  title="Delete note"
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    )}
  </div>
);
}

export default DashboardNotesSidebar;