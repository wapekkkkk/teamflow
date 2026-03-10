import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import AppLayout from "../components/AppLayout";

function ProjectDetailsPage() {
  const navigate = useNavigate();
  const { projectId } = useParams();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
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

  const [memberEmail, setMemberEmail] = useState("");

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

    await fetchProject(user.id);
    await fetchMembers();
    await fetchTasks();
  };

  const fetchProject = async (userId) => {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("owner_id", userId)
      .single();

    if (error) {
      setMessage("Project not found or access denied.");
      return;
    }

    setProject(data);
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

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setTasks(data || []);
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

    setTaskForm({
      title: "",
      description: "",
      due_date: "",
      priority: "Medium",
      assigned_to: "",
    });

    setMessage("Task created successfully.");
    await fetchTasks();
    setLoading(false);
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!memberEmail.trim()) {
      setMessage("Please enter an email.");
      return;
    }

    const { data: userProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("email", memberEmail.trim())
      .single();

    if (profileError || !userProfile) {
      setMessage("User not found. They must register first.");
      return;
    }

    const { error: memberError } = await supabase.from("project_members").insert([
      {
        project_id: projectId,
        user_id: userProfile.id,
        role: "member",
      },
    ]);

    if (memberError) {
      if (memberError.message.includes("duplicate")) {
        setMessage("This user is already a project member.");
      } else {
        setMessage(memberError.message);
      }
      return;
    }

    setMemberEmail("");
    setMessage("Member added successfully.");
    await fetchMembers();
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", taskId);

    if (error) {
      setMessage(error.message);
      return;
    }

    await fetchTasks();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const getAssignedMemberLabel = (assignedToId) => {
    if (!assignedToId) return "Unassigned";

    const foundMember = members.find((member) => member.user_id === assignedToId);

    if (!foundMember) return "Unknown member";

    return (
      foundMember.profiles?.full_name ||
      foundMember.profiles?.email ||
      "Unnamed member"
    );
  };

  const getPriorityClass = (priority) => {
    if (priority === "High") return "priority-high";
    if (priority === "Low") return "priority-low";
    return "priority-medium";
  };

  const getProjectColor = () => {
    return project?.color || "purple";
  };

  const todoTasks = tasks.filter((task) => task.status === "To Do");
  const inProgressTasks = tasks.filter((task) => task.status === "In Progress");
  const doneTasks = tasks.filter((task) => task.status === "Done");

  const renderTaskCard = (task) => (
    <div
      key={task.id}
      className={`project-task-card task-theme-${getProjectColor()}`}
    >
      <div className="task-color-bar"></div>

      <div className="project-task-content">
        <div className="project-task-header">
          <h3>{task.title}</h3>
        </div>

        <p className="project-task-description muted">
          {task.description || "No description"}
        </p>

        <div className="project-task-badges">
          <span className="task-status-badge">{task.status}</span>
          <span className={`task-priority-badge ${getPriorityClass(task.priority)}`}>
            {task.priority} Priority
          </span>
          <span className="task-date-badge">
            Due: {task.due_date || "No due date"}
          </span>
          <span className="task-member-badge">
            {getAssignedMemberLabel(task.assigned_to)}
          </span>
        </div>

        <div className="project-task-actions">
          <button
            onClick={() => updateTaskStatus(task.id, "To Do")}
            className={`project-status-btn ${
              task.status === "To Do" ? "active" : ""
            }`}
          >
            To Do
          </button>
          <button
            onClick={() => updateTaskStatus(task.id, "In Progress")}
            className={`project-status-btn ${
              task.status === "In Progress" ? "active" : ""
            }`}
          >
            In Progress
          </button>
          <button
            onClick={() => updateTaskStatus(task.id, "Done")}
            className={`project-status-btn ${
              task.status === "Done" ? "active" : ""
            }`}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <AppLayout>
      <div className="app-page">
        <div className="app-shell">
          <div className="top-bar">
            <div>
              <h1 className="page-title">Project Details</h1>
              <p className="page-subtitle">Manage tasks and members in one place.</p>
            </div>

            <div className="top-bar-actions">
              <button onClick={() => navigate("/projects")} className="btn">
                Back to Projects
              </button>
              <button onClick={handleLogout} className="btn btn-secondary">
                Logout
              </button>
            </div>
          </div>

          {project && (
            <div
              className={`card section-card project-details-hero project-theme-${project.color || "purple"}`}
              style={{ marginBottom: "20px" }}
            >
              <h2>{project.name}</h2>
              <p className="muted">{project.description || "No description"}</p>
              <p>
                <strong>Due Date:</strong> {project.due_date || "No due date"}
              </p>
              <p>
                <strong>Created:</strong> {new Date(project.created_at).toLocaleString()}
              </p>
            </div>
          )}

          <div className="project-top-grid">
            <div className="card section-card">
              <h2>Create Task</h2>

              <form onSubmit={handleCreateTask} className="form">
                <input
                  type="text"
                  name="title"
                  placeholder="Task Title"
                  value={taskForm.title}
                  onChange={handleChange}
                  required
                  className="input"
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

                <button type="submit" disabled={loading} className="btn">
                  {loading ? "Creating..." : "Create Task"}
                </button>
              </form>
            </div>

            <div className="card section-card">
              <h2>Project Members</h2>

              <form onSubmit={handleAddMember} className="form">
                <input
                  type="email"
                  placeholder="Enter member email"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  className="input"
                  required
                />
                <button type="submit" className="btn">
                  Add Member
                </button>
              </form>

              <div className="member-list">
                {members.length === 0 ? (
                  <p className="muted">No members yet.</p>
                ) : (
                  members.map((member) => (
                    <div key={member.id} className="member-item">
                      <p>
                        <strong>Name:</strong>{" "}
                        {member.profiles?.full_name || "No name"}
                      </p>
                      <p>
                        <strong>Email:</strong> {member.profiles?.email}
                      </p>
                      <p>
                        <strong>Role:</strong> {member.role}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {message && <p className="message">{message}</p>}

          <div className="board">
            <div className="card board-column">
              <h2 className="board-title">To Do</h2>
              {todoTasks.length === 0 ? (
                <p className="muted">No tasks</p>
              ) : (
                todoTasks.map(renderTaskCard)
              )}
            </div>

            <div className="card board-column">
              <h2 className="board-title">In Progress</h2>
              {inProgressTasks.length === 0 ? (
                <p className="muted">No tasks</p>
              ) : (
                inProgressTasks.map(renderTaskCard)
              )}
            </div>

            <div className="card board-column">
              <h2 className="board-title">Done</h2>
              {doneTasks.length === 0 ? (
                <p className="muted">No tasks</p>
              ) : (
                doneTasks.map(renderTaskCard)
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default ProjectDetailsPage;