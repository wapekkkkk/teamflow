import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import AppLayout from "../components/AppLayout";

function EditTaskPage() {
  const navigate = useNavigate();
  const { taskId } = useParams();

  const [task, setTask] = useState(null);
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    due_date: "",
    priority: "Medium",
    status: "To Do",
    assigned_to: "",
  });

  useEffect(() => {
    checkUserAndLoadTask();
  }, []);

  const checkUserAndLoadTask = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      navigate("/login");
      return;
    }

    await fetchTaskDetails();
  };

  const fetchTaskDetails = async () => {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("tasks")
      .select(`
        *,
        projects (
          id,
          name,
          color,
          owner_id
        )
      `)
      .eq("id", taskId)
      .single();

    if (error || !data) {
      setMessage("Task not found.");
      setLoading(false);
      return;
    }

    setTask(data);
    setProject(data.projects || null);

    setTaskForm({
      title: data.title || "",
      description: data.description || "",
      due_date: data.due_date || "",
      priority: data.priority || "Medium",
      status: data.status || "To Do",
      assigned_to: data.assigned_to || "",
    });

    if (data.project_id) {
      await fetchMembers(data.project_id);
    }

    setLoading(false);
  };

  const fetchMembers = async (projectId) => {
    const { data, error } = await supabase
      .from("project_members")
      .select(`
        id,
        role,
        user_id,
        profiles (
          id,
          full_name,
          email
        )
      `)
      .eq("project_id", projectId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMembers(data || []);
  };

  const handleChange = (e) => {
    setTaskForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("tasks")
      .update({
        title: taskForm.title,
        description: taskForm.description,
        due_date: taskForm.due_date || null,
        priority: taskForm.priority,
        status: taskForm.status,
        assigned_to: taskForm.assigned_to || null,
      })
      .eq("id", taskId);

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    navigate(`/tasks/${taskId}`);
  };

  return (
    <AppLayout>
      <div className="app-page">
        <div className="app-shell app-shell-narrow">
          <div className="top-bar">
            <div>
              <h1 className="page-title">Edit Task</h1>
              <p className="page-subtitle">
                Update the task details and assignment.
              </p>
            </div>

            <div className="top-bar-actions">
              <button
                onClick={() => navigate(`/tasks/${taskId}`)}
                className="btn btn-secondary"
              >
                Back to Task
              </button>
            </div>
          </div>

          {loading ? (
            <div className="card section-card">
              <p className="muted">Loading task...</p>
            </div>
          ) : !task ? (
            <div className="card section-card">
              <p className="muted">Task not found.</p>
            </div>
          ) : (
            <div className="card section-card create-task-card">
              <form onSubmit={handleUpdateTask} className="form">
                <div>
                  <label className="field-label">Task Title</label>
                  <input
                    type="text"
                    name="title"
                    value={taskForm.title}
                    onChange={handleChange}
                    className="input"
                    required
                    placeholder="Enter task title"
                  />
                </div>

                <div>
                  <label className="field-label">Description</label>
                  <textarea
                    name="description"
                    value={taskForm.description}
                    onChange={handleChange}
                    className="textarea"
                    placeholder="Enter task description"
                  />
                </div>

                <div className="edit-task-grid">
                  <div>
                    <label className="field-label">Due Date</label>
                    <input
                      type="date"
                      name="due_date"
                      value={taskForm.due_date}
                      onChange={handleChange}
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="field-label">Priority</label>
                    <select
                      name="priority"
                      value={taskForm.priority}
                      onChange={handleChange}
                      className="select"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>

                  <div>
                    <label className="field-label">Status</label>
                    <select
                      name="status"
                      value={taskForm.status}
                      onChange={handleChange}
                      className="select"
                    >
                      <option value="To Do">To Do</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Done">Done</option>
                    </select>
                  </div>

                  <div>
                    <label className="field-label">Assigned To</label>
                    <select
                      name="assigned_to"
                      value={taskForm.assigned_to}
                      onChange={handleChange}
                      className="select"
                    >
                      <option value="">Unassigned</option>
                      {members.map((member) => (
                        <option key={member.user_id} value={member.user_id}>
                          {member.profiles?.full_name || member.profiles?.email}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="create-project-actions">
                  <button type="submit" className="btn" disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => navigate(`/tasks/${taskId}`)}
                  >
                    Cancel
                  </button>
                </div>
              </form>

              {message && <p className="message">{message}</p>}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default EditTaskPage;