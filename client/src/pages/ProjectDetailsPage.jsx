import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

function ProjectDetailsPage() {
  const navigate = useNavigate();
  const { projectId } = useParams();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    due_date: "",
    priority: "Medium",
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

    await fetchProject(user.id);
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

    const { title, description, due_date, priority } = taskForm;

    const { error } = await supabase.from("tasks").insert([
      {
        project_id: projectId,
        title,
        description,
        due_date: due_date || null,
        priority,
        status: "To Do",
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
    });

    setMessage("Task created successfully.");
    await fetchTasks();
    setLoading(false);
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

  const todoTasks = tasks.filter((task) => task.status === "To Do");
  const inProgressTasks = tasks.filter((task) => task.status === "In Progress");
  const doneTasks = tasks.filter((task) => task.status === "Done");

  const renderTaskCard = (task) => (
    <div key={task.id} style={styles.taskCard}>
      <h3 style={styles.taskTitle}>{task.title}</h3>
      <p>{task.description || "No description"}</p>
      <p>
        <strong>Priority:</strong> {task.priority}
      </p>
      <p>
        <strong>Due Date:</strong> {task.due_date || "No due date"}
      </p>

      <div style={styles.statusButtons}>
        <button onClick={() => updateTaskStatus(task.id, "To Do")} style={styles.statusButton}>
          To Do
        </button>
        <button onClick={() => updateTaskStatus(task.id, "In Progress")} style={styles.statusButton}>
          In Progress
        </button>
        <button onClick={() => updateTaskStatus(task.id, "Done")} style={styles.statusButton}>
          Done
        </button>
      </div>
    </div>
  );

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <h1>Project Details</h1>
        <div style={styles.topButtons}>
          <button onClick={() => navigate("/projects")} style={styles.smallButton}>
            Back to Projects
          </button>
          <button onClick={handleLogout} style={styles.smallButton}>
            Logout
          </button>
        </div>
      </div>

      {project && (
        <div style={styles.projectCard}>
          <h2>{project.name}</h2>
          <p>{project.description || "No description"}</p>
          <p>
            <strong>Due Date:</strong> {project.due_date || "No due date"}
          </p>
          <p>
            <strong>Created:</strong> {new Date(project.created_at).toLocaleString()}
          </p>
        </div>
      )}

      <div style={styles.formCard}>
        <h2>Create Task</h2>

        <form onSubmit={handleCreateTask} style={styles.form}>
          <input
            type="text"
            name="title"
            placeholder="Task Title"
            value={taskForm.title}
            onChange={handleChange}
            required
            style={styles.input}
          />

          <textarea
            name="description"
            placeholder="Task Description"
            value={taskForm.description}
            onChange={handleChange}
            style={styles.textarea}
          />

          <input
            type="date"
            name="due_date"
            value={taskForm.due_date}
            onChange={handleChange}
            style={styles.input}
          />

          <select
            name="priority"
            value={taskForm.priority}
            onChange={handleChange}
            style={styles.input}
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? "Creating..." : "Create Task"}
          </button>
        </form>

        {message && <p>{message}</p>}
      </div>

      <div style={styles.board}>
        <div style={styles.column}>
          <h2>To Do</h2>
          {todoTasks.length === 0 ? <p>No tasks</p> : todoTasks.map(renderTaskCard)}
        </div>

        <div style={styles.column}>
          <h2>In Progress</h2>
          {inProgressTasks.length === 0 ? <p>No tasks</p> : inProgressTasks.map(renderTaskCard)}
        </div>

        <div style={styles.column}>
          <h2>Done</h2>
          {doneTasks.length === 0 ? <p>No tasks</p> : doneTasks.map(renderTaskCard)}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f4f4f4",
    padding: "30px",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  topButtons: {
    display: "flex",
    gap: "10px",
  },
  smallButton: {
    padding: "10px 16px",
    cursor: "pointer",
  },
  projectCard: {
    backgroundColor: "#fff",
    padding: "24px",
    borderRadius: "10px",
    boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
    marginBottom: "20px",
  },
  formCard: {
    backgroundColor: "#fff",
    padding: "24px",
    borderRadius: "10px",
    boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
    marginBottom: "20px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  input: {
    padding: "12px",
    fontSize: "14px",
  },
  textarea: {
    padding: "12px",
    fontSize: "14px",
    minHeight: "100px",
    resize: "vertical",
  },
  button: {
    padding: "12px",
    cursor: "pointer",
  },
  board: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "20px",
    alignItems: "start",
  },
  column: {
    backgroundColor: "#fff",
    padding: "20px",
    borderRadius: "10px",
    boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
    minHeight: "300px",
  },
  taskCard: {
    border: "1px solid #ddd",
    borderRadius: "10px",
    padding: "14px",
    marginBottom: "14px",
    backgroundColor: "#fafafa",
  },
  taskTitle: {
    marginTop: 0,
  },
  statusButtons: {
    display: "flex",
    gap: "8px",
    marginTop: "12px",
    flexWrap: "wrap",
  },
  statusButton: {
    padding: "8px 12px",
    cursor: "pointer",
  },
};

export default ProjectDetailsPage;