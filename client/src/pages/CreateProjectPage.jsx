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

function CreateProjectPage() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
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

  useEffect(() => {
    checkUserAndLoadMembers();
  }, []);

  const checkUserAndLoadMembers = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      navigate("/login");
      return;
    }

    setUser(user);
    await fetchAcceptedConnections(user.id);
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

    const { data: insertedProject, error } = await supabase
      .from("projects")
      .insert([
        {
          name,
          description,
          due_date: due_date || null,
          color,
          owner_id: user.id,
        },
      ])
      .select()
      .single();

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    const uniqueMemberIds = Array.from(new Set([user.id, ...selectedMemberIds]));

    const projectMemberRows = uniqueMemberIds.map((memberId) => ({
      project_id: insertedProject.id,
      user_id: memberId,
      role: memberId === user.id ? "owner" : "member",
    }));

    const { error: memberError } = await supabase
      .from("project_members")
      .insert(projectMemberRows);

    if (memberError) {
      setMessage(memberError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    navigate("/projects");
  };

  return (
    <AppLayout>
      <div className="app-page">
        <div className="app-shell app-shell-narrow">
          <div className="top-bar">
            <div>
              <h1 className="page-title">Create New Project</h1>
              <p className="page-subtitle">
                Set up a project and invite your team members.
              </p>
            </div>

            <button
              className="btn btn-secondary"
              onClick={() => navigate("/projects")}
            >
              Back to Projects
            </button>
          </div>

          <div className="card section-card create-project-card">
            <form onSubmit={handleCreateProject} className="form">
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
                      className={`color-circle color-${color} ${
                        formData.color === color ? "selected" : ""
                      }`}
                      onClick={() => handleColorSelect(color)}
                      aria-label={`Choose ${color} color`}
                    />
                  ))}
                </div>
              </div>

              <div className="create-project-actions">
                <button type="submit" disabled={loading} className="btn">
                  {loading ? "Creating..." : "Create New Project"}
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

export default CreateProjectPage;