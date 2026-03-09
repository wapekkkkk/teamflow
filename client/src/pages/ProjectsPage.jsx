import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import AppLayout from "../components/AppLayout";

const PROJECT_COLORS = [
  "purple",
  "blue",
  "red",
  "green",
  "orange",
  "pink",
  "teal",
  "yellow",
];

function ProjectsPage() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    due_date: "",
    color: "purple",
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

  const handleColorSelect = (color) => {
    setFormData((prev) => ({
      ...prev,
      color,
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

    const { name, description, due_date, color } = formData;

    const { error } = await supabase.from("projects").insert([
      {
        name,
        description,
        due_date: due_date || null,
        color,
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
      color: "purple",
    });

    setMessage("Project created successfully.");
    await fetchProjects(user.id);
    setLoading(false);
  };

  return (
    <AppLayout>
      <div className="app-page">
        <div className="app-shell">
          <div className="top-bar">
            <div>
              <h1 className="page-title">Projects</h1>
              <p className="page-subtitle">Manage and organize your work.</p>
            </div>
          </div>

          <div className="two-col-grid">
            <div className="card section-card">
              <h2>Create Project</h2>

              <form onSubmit={handleCreateProject} className="form">
                <input
                  type="text"
                  name="name"
                  placeholder="Project Name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="input"
                />

                <textarea
                  name="description"
                  placeholder="Project Description"
                  value={formData.description}
                  onChange={handleChange}
                  className="textarea"
                />

                <input
                  type="date"
                  name="due_date"
                  value={formData.due_date}
                  onChange={handleChange}
                  className="input"
                />

                <div className="color-picker-group">
                  <p className="color-picker-label">Project Color</p>
                  <div className="color-picker">
                    {PROJECT_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`color-circle color-${color} ${
                          formData.color === color ? "selected" : ""
                        }`}
                        onClick={() => handleColorSelect(color)}
                        aria-label={`Choose ${color} color`}
                      />
                    ))}
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn">
                  {loading ? "Creating..." : "Create Project"}
                </button>
              </form>

              {message && <p className="message">{message}</p>}
            </div>

            <div className="card section-card">
              <h2>Your Projects</h2>

              {projects.length === 0 ? (
                <p className="muted">No projects yet.</p>
              ) : (
                <div className="project-list">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      className={`project-item project-item-${project.color || "purple"}`}
                      onClick={() => navigate(`/projects/${project.id}`)}
                    >
                      <div className="project-item-header">
                        <span
                          className={`project-color-dot color-${project.color || "purple"}`}
                        ></span>
                        <h3>{project.name}</h3>
                      </div>

                      <p className="muted">
                        {project.description || "No description"}
                      </p>

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
      </div>
    </AppLayout>
  );
}

export default ProjectsPage;