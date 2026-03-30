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
  const [deleting, setDeleting] = useState(false);

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

  const assignedMember = members.find(
    (member) => member.user_id === task?.assigned_to
  );

  return (
    <AppLayout>
      <div className="app-page">
        <div className="app-shell">
          <div className="top-bar">
            <div>
              <h1 className="page-title">Task Details</h1>
              <p className="page-subtitle">
                View this task information and manage it.
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

              <button
                onClick={() => navigate("/tasks")}
                className="btn btn-secondary"
              >
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
                className={`card section-card project-details-hero project-theme-${
                  project?.color || "purple"
                }`}
                style={{ marginBottom: "20px" }}
              >
                <h2>{task.title}</h2>
                <p className="muted">{task.description || "No description"}</p>
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
                  <div className="task-details-card-header">
                    <h2>Task Overview</h2>

                    <div className="task-details-actions">
                      <button
                        type="button"
                        className="btn"
                        onClick={() => navigate(`/tasks/${taskId}/edit`)}
                      >
                        Edit Task
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
                  </div>

                  <div className="task-summary-list">
                    <div className="task-summary-item">
                      <span className="task-summary-label">Title</span>
                      <span>{task.title}</span>
                    </div>

                    <div className="task-summary-item">
                      <span className="task-summary-label">Description</span>
                      <span>{task.description || "No description"}</span>
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
                        {assignedMember?.profiles?.full_name ||
                          assignedMember?.profiles?.email ||
                          "Unassigned"}
                      </span>
                    </div>
                  </div>

                  {message && <p className="message">{message}</p>}
                </div>

                <div className="card section-card">
                  <h2>Project Info</h2>

                  <div className="task-summary-list">
                    <div className="task-summary-item">
                      <span className="task-summary-label">Project Name</span>
                      <span>{project?.name || "Unknown Project"}</span>
                    </div>

                    <div className="task-summary-item">
                      <span className="task-summary-label">Project Due Date</span>
                      <span>{project?.due_date || "No due date"}</span>
                    </div>

                    <div className="task-summary-item">
                      <span className="task-summary-label">Members</span>
                      <span>{members.length || 0}</span>
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