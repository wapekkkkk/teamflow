import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import AppLayout from "../components/AppLayout";

function TaskDetailsPage() {
  const navigate = useNavigate();
  const { taskId } = useParams();

  const [task, setTask] = useState(null);
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
          description,
          due_date,
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

    setMessage("Task updated successfully.");
    await fetchTaskDetails();
    setSaving(false);
  };

  const handleDeleteTask = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this task?"
    );

    if (!confirmed) return;

    setDeleting(true);
    setMessage("");

    const { error } = await supabase.from("tasks").delete().eq("id", taskId);

    if (error) {
      setMessage(error.message);
      setDeleting(false);
      return;
    }

    navigate(`/projects/${task.project_id}`);
  };

  return (
    <AppLayout>
      <div className="app-page">
        <div className="app-shell">
          <div className="top-bar">
            <div>
              <h1 className="page-title">Task Details</h1>
              <p className="page-subtitle">
                View and update this task information.
              </p>
            </div>

            <div className="top-bar-actions">
              {task && (
                <button
                  onClick={() => navigate(`/projects/${task.project_id}`)}
                  className="btn"
                >
                  Back to Project
                </button>
              )}
              <button onClick={() => navigate("/tasks")} className="btn btn-secondary">
                All Tasks
              </button>
            </div>
          </div>

          {loading ? (
            <div className="card section-card">
              <p className="muted">Loading task details...</p>
            </div>
          ) : !task ? (
            <div className="card section-card">
              <p className="muted">Task not found.</p>
            </div>
          ) : (
            <>
              <div
                className={`card section-card project-details-hero project-theme-${project?.color || "purple"}`}
                style={{ marginBottom: "20px" }}
              >
                <h2>{task.title}</h2>
                <p className="muted">
                  {task.description || "No description"}
                </p>
                <p>
                  <strong>Project:</strong> {project?.name || "Unknown Project"}
                </p>
                <p>
                  <strong>Created:</strong>{" "}
                  {new Date(task.created_at).toLocaleString()}
                </p>
              </div>

              <div className="task-details-grid">
                <div className="card section-card">
                  <h2>Edit Task</h2>

                  <form onSubmit={handleUpdateTask} className="form">
                    <input
                      type="text"
                      name="title"
                      placeholder="Task Title"
                      value={taskForm.title}
                      onChange={handleChange}
                      className="input"
                      required
                    />

                    <textarea
                      name="description"
                      placeholder="Task Description"
                      value={taskForm.description}
                      onChange={handleChange}
                      className="textarea"
                    />

                    <input
                      type="date"
                      name="due_date"
                      value={taskForm.due_date}
                      onChange={handleChange}
                      className="input"
                    />

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

                    <div className="task-details-actions">
                      <button type="submit" className="btn" disabled={saving}>
                        {saving ? "Saving..." : "Save Changes"}
                      </button>

                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={handleDeleteTask}
                        disabled={deleting}
                      >
                        {deleting ? "Deleting..." : "Delete Task"}
                      </button>
                    </div>
                  </form>

                  {message && <p className="message">{message}</p>}
                </div>

                <div className="card section-card">
                  <h2>Task Summary</h2>

                  <div className="task-summary-list">
                    <div className="task-summary-item">
                      <span className="task-summary-label">Title</span>
                      <span>{task.title}</span>
                    </div>

                    <div className="task-summary-item">
                      <span className="task-summary-label">Project</span>
                      <span>{project?.name || "Unknown Project"}</span>
                    </div>

                    <div className="task-summary-item">
                      <span className="task-summary-label">Status</span>
                      <span>{task.status}</span>
                    </div>

                    <div className="task-summary-item">
                      <span className="task-summary-label">Priority</span>
                      <span>{task.priority}</span>
                    </div>

                    <div className="task-summary-item">
                      <span className="task-summary-label">Due Date</span>
                      <span>{task.due_date || "No due date"}</span>
                    </div>

                    <div className="task-summary-item">
                      <span className="task-summary-label">Assigned To</span>
                      <span>
                        {members.find((member) => member.user_id === task.assigned_to)
                          ?.profiles?.full_name ||
                          members.find((member) => member.user_id === task.assigned_to)
                            ?.profiles?.email ||
                          "Unassigned"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default TaskDetailsPage;