import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

function ProjectsPage() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    due_date: "",
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkUserAndFetchProjects();
  }, []);

  const checkUserAndFetchProjects = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      navigate("/login");
      return;
    }

    setUser(user);
    fetchProjects(user.id);
  };

  const fetchProjects = async (userId) => {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setProjects(data || []);
  };

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (!user) {
      setMessage("User not found.");
      setLoading(false);
      return;
    }

    const { name, description, due_date } = formData;

    const { error } = await supabase.from("projects").insert([
      {
        name,
        description,
        due_date: due_date || null,
        owner_id: user.id,
      },
    ]);

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setFormData({
      name: "",
      description: "",
      due_date: "",
    });

    setMessage("Project created successfully.");
    await fetchProjects(user.id);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <h1>Projects</h1>
        <div style={styles.topButtons}>
          <button onClick={() => navigate("/dashboard")} style={styles.smallButton}>
            Dashboard
          </button>
          <button onClick={handleLogout} style={styles.smallButton}>
            Logout
          </button>
        </div>
      </div>

      <div style={styles.container}>
        <div style={styles.formCard}>
          <h2>Create Project</h2>

          <form onSubmit={handleCreateProject} style={styles.form}>
            <input
              type="text"
              name="name"
              placeholder="Project Name"
              value={formData.name}
              onChange={handleChange}
              required
              style={styles.input}
            />

            <textarea
              name="description"
              placeholder="Project Description"
              value={formData.description}
              onChange={handleChange}
              style={styles.textarea}
            />

            <input
              type="date"
              name="due_date"
              value={formData.due_date}
              onChange={handleChange}
              style={styles.input}
            />

            <button type="submit" disabled={loading} style={styles.button}>
              {loading ? "Creating..." : "Create Project"}
            </button>
          </form>

          {message && <p>{message}</p>}
        </div>

        <div style={styles.listCard}>
          <h2>Your Projects</h2>

          {projects.length === 0 ? (
            <p>No projects yet.</p>
          ) : (
            <div style={styles.projectList}>
              {projects.map((project) => (
                <div
  key={project.id}
  style={styles.projectItem}
  onClick={() => navigate(`/projects/${project.id}`)}
>
                  <h3>{project.name}</h3>
                  <p>{project.description || "No description"}</p>
                  <p>
                    <strong>Due Date:</strong>{" "}
                    {project.due_date ? project.due_date : "No due date"}
                  </p>
                  <p>
                    <strong>Created:</strong>{" "}
                    {new Date(project.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
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
    marginBottom: "30px",
  },
  topButtons: {
    display: "flex",
    gap: "10px",
  },
  smallButton: {
    padding: "10px 16px",
    cursor: "pointer",
  },
  container: {
    display: "grid",
    gridTemplateColumns: "1fr 1.5fr",
    gap: "20px",
  },
  formCard: {
    backgroundColor: "#fff",
    padding: "24px",
    borderRadius: "10px",
    boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
  },
  listCard: {
    backgroundColor: "#fff",
    padding: "24px",
    borderRadius: "10px",
    boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
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
  projectList: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    marginTop: "16px",
  },
  projectItem: {
    border: "1px solid #ddd",
    borderRadius: "10px",
    padding: "16px",
    cursor: "pointer",
  },
};

export default ProjectsPage;