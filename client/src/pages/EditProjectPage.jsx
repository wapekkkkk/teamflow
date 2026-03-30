import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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

function EditProjectPage() {
  const navigate = useNavigate();
  const { projectId } = useParams();

  const [user, setUser] = useState(null);
  const [project, setProject] = useState(null);
  const [availableMembers, setAvailableMembers] = useState([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    due_date: "",
    color: "purple",
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

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

    setUser(user);

    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectError || !projectData) {
      setMessage("Project not found.");
      setPageLoading(false);
      return;
    }

    if (projectData.owner_id !== user.id) {
      setMessage("Only the project owner can edit this project.");
      setPageLoading(false);
      return;
    }

    setProject(projectData);
    setFormData({
      name: projectData.name || "",
      description: projectData.description || "",
      due_date: projectData.due_date || "",
      color: projectData.color || "purple",
    });

    await fetchAcceptedConnections(user.id);
    await fetchCurrentProjectMembers();

    setPageLoading(false);
  };

  const fetchAcceptedConnections = async (userId) => {
    const { data, error } = await supabase
      .from("member_requests")
      .select(`
        id,
        sender_id,
        receiver_id,
        status,
        sender:profiles!member_requests_sender_id_fkey (
          id,
          full_name,
          email
        ),
        receiver:profiles!member_requests_receiver_id_fkey (
          id,
          full_name,
          email
        )
      `)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq("status", "accepted");

    if (error) {
      setMessage(error.message);
      return;
    }

    const normalizedMembers = (data || []).map((request) => {
      const isSender = request.sender_id === userId;
      return isSender ? request.receiver : request.sender;
    });

    setAvailableMembers(normalizedMembers);
  };

  const fetchCurrentProjectMembers = async () => {
    const { data, error } = await supabase
      .from("project_members")
      .select("user_id, role")
      .eq("project_id", projectId);

    if (error) {
      setMessage(error.message);
      return;
    }

    const nonOwnerMemberIds = (data || [])
      .filter((member) => member.role !== "owner")
      .map((member) => member.user_id);

    setSelectedMemberIds(nonOwnerMemberIds);
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

  const handleMemberToggle = (memberId) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (!user || !project) {
      setMessage("Project data not found.");
      setLoading(false);
      return;
    }

    const { name, description, due_date, color } = formData;

    const { error: updateError } = await supabase
      .from("projects")
      .update({
        name,
        description,
        due_date: due_date || null,
        color,
      })
      .eq("id", projectId);

    if (updateError) {
      setMessage(updateError.message);
      setLoading(false);
      return;
    }

    const { error: deleteMembersError } = await supabase
      .from("project_members")
      .delete()
      .eq("project_id", projectId)
      .neq("user_id", user.id);

    if (deleteMembersError) {
      setMessage(deleteMembersError.message);
      setLoading(false);
      return;
    }

    if (selectedMemberIds.length > 0) {
      const memberRows = selectedMemberIds.map((memberId) => ({
        project_id: projectId,
        user_id: memberId,
        role: "member",
      }));

      const { error: insertMembersError } = await supabase
        .from("project_members")
        .insert(memberRows);

      if (insertMembersError) {
        setMessage(insertMembersError.message);
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    navigate(`/projects/${projectId}`);
  };
  const handleDeleteProject = async () => {
    if (!user || !project) {
      setMessage("Project data not found.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${project.name}"?\n\nThis will permanently remove the project, its tasks, and its members.`
    );

    if (!confirmed) return;

    setLoading(true);
    setMessage("");

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId)
      .eq("owner_id", user.id);

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    navigate("/projects");
  };

  if (pageLoading) {
    return (
      <AppLayout>
        <div className="app-page">
          <div className="app-shell app-shell-narrow">
            <p className="muted">Loading project...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!project || (project && project.owner_id !== user?.id)) {
    return (
      <AppLayout>
        <div className="app-page">
          <div className="app-shell app-shell-narrow">
            <div className="top-bar">
              <div>
                <h1 className="page-title">Edit Project</h1>
              </div>

              <button
                className="btn btn-secondary"
                onClick={() => navigate(`/projects/${projectId}`)}
              >
                Back to Project
              </button>
            </div>

            {message && <p className="message">{message}</p>}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="app-page">
        <div className="app-shell app-shell-narrow">
          <div className="top-bar">
            <div>
              <h1 className="page-title">Edit Project</h1>
              <p className="page-subtitle">
                Update your project details and team members.
              </p>
            </div>

            <button
              className="btn btn-secondary"
              onClick={() => navigate(`/projects/${projectId}`)}
            >
              Back to Project
            </button>
          </div>

          <div className="card section-card create-project-card">
            <form onSubmit={handleUpdateProject} className="form">
              <div>
                <label className="field-label">Project Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="input"
                  placeholder="Enter project name"
                />
              </div>

              <div>
                <label className="field-label">Project Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="textarea"
                  placeholder="Enter project description"
                />
              </div>

              <div>
                <label className="field-label">Target Date</label>
                <input
                  type="date"
                  name="due_date"
                  value={formData.due_date}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              <div className="member-select-group">
                <label className="field-label">Team Members</label>

                {availableMembers.length === 0 ? (
                  <p className="muted">
                    No accepted members yet. Send and accept member requests first.
                  </p>
                ) : (
                  <div className="member-checkbox-list">
                    {availableMembers.map((member) => (
                      <label key={member.id} className="member-checkbox-item">
                        <input
                          type="checkbox"
                          checked={selectedMemberIds.includes(member.id)}
                          onChange={() => handleMemberToggle(member.id)}
                        />
                        <span>
                          {member.full_name || member.email}{" "}
                          <span className="muted">({member.email})</span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="color-picker-group">
                <p className="color-picker-label">Choose Color</p>
                <div className="color-picker">
                  {PROJECT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`color-circle color-${color} ${formData.color === color ? "selected" : ""
                        }`}
                      onClick={() => handleColorSelect(color)}
                      aria-label={`Choose ${color} color`}
                    />
                  ))}
                </div>
              </div>

              <div className="create-project-actions">
                <button type="submit" disabled={loading} className="btn">
                  {loading ? "Saving..." : "Save Project Changes"}
                </button>

                <button
                  type="button"
                  disabled={loading}
                  className="btn btn-danger"
                  onClick={handleDeleteProject}
                >
                  {loading ? "Processing..." : "Delete Project"}
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

export default EditProjectPage;