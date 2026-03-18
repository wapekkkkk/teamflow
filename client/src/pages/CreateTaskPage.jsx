import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import AppLayout from "../components/AppLayout";

function CreateTaskPage() {
  const navigate = useNavigate();
  const { projectId } = useParams();

  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    due_date: "",
    priority: "Medium",
    assigned_to: "",
  });

  useEffect(() => {
    checkUserAndLoadData();
  }, []);

  const checkUserAndLoadData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      navigate("/login");
      return;
    }

    const hasAccess = await fetchProject(user.id);

    if (!hasAccess) return;

    await fetchMembers();
  };

  const fetchProject = async (userId) => {
    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectError || !projectData) {
      setMessage("Project not found.");
      return false;
    }

    const isOwner = projectData.owner_id === userId;

    const { data: membership } = await supabase
      .from("project_members")
      .select("id")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .maybeSingle();

    const isMember = !!membership;

    if (!isOwner && !isMember) {
      setMessage("Project not found or access denied.");
      return false;
    }

    setProject(projectData);
    return true;
  };

  const fetchMembers = async () => {
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

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { title, description, due_date, priority, assigned_to } = taskForm;

    const { error } = await supabase.from("tasks").insert([
      {
        project_id: projectId,
        title,
        description,
        due_date: due_date || null,
        priority,
        status: "To Do",
        assigned_to: assigned_to || null,
      },
    ]);

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    navigate(`/projects/${projectId}`);
  };

  return (
    <AppLayout>
      <div className="app-page">
        <div className="app-shell app-shell-narrow">
          <div className="top-bar">
            <div>
              <h1 className="page-title">Create New Task</h1>
              <p className="page-subtitle">
                {project ? `Project: ${project.name}` : "Add a task to this project."}
              </p>
            </div>

            <button
              className="btn btn-secondary"
              onClick={() => navigate(`/projects/${projectId}`)}
            >
              Back to Project
            </button>
          </div>

          <div className="card section-card create-task-card">
            <form onSubmit={handleCreateTask} className="form">
              <div>
                <label className="field-label">Task Title</label>
                <input
                  type="text"
                  name="title"
                  value={taskForm.title}
                  onChange={handleChange}
                  required
                  className="input"
                  placeholder="Enter task title"
                />
              </div>

              <div>
                <label className="field-label">Task Description</label>
                <textarea
                  name="description"
                  value={taskForm.description}
                  onChange={handleChange}
                  className="textarea"
                  placeholder="Enter task description"
                />
              </div>

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

              <div className="create-project-actions">
                <button type="submit" disabled={loading} className="btn">
                  {loading ? "Creating..." : "Create New Task"}
                </button>
              </div>
            </form>

            {message && <p className="message">{message}</p>}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default CreateTaskPage;