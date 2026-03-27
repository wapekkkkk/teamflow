import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import { supabase } from "../lib/supabaseClient";

function ProfilePage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [userProfile, setUserProfile] = useState({
    full_name: "",
    email: "",
    role: "Workspace Member",
    department: "Software Engineering",
    timezone: "Kuala Lumpur (GMT+8)",
    created_at: "",
  });

  const [stats, setStats] = useState({
    projects: 0,
    tasksCompleted: 0,
    inProgress: 0,
    productivity: 0,
  });

  useEffect(() => {
    loadProfilePage();
  }, []);

  const loadProfilePage = async () => {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      navigate("/login");
      return;
    }

    await Promise.all([loadUserProfile(user), loadUserStats(user.id)]);

    setLoading(false);
  };

  const loadUserProfile = async (user) => {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, email, created_at")
      .eq("id", user.id)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      setMessage("Failed to load profile.");
      return;
    }

    setUserProfile({
      full_name: profile?.full_name || user.user_metadata?.full_name || "User",
      email: profile?.email || user.email || "",
      role: "Workspace Member",
      department: "Software Engineering",
      timezone: "Kuala Lumpur (GMT+8)",
      created_at: profile?.created_at || user.created_at || "",
    });
  };

  const loadUserStats = async (userId) => {
    try {
      const [
        ownedProjectsRes,
        memberProjectsRes,
        allAssignedTasksRes,
        completedTasksRes,
        inProgressTasksRes,
      ] = await Promise.all([
        supabase.from("projects").select("id").eq("owner_id", userId),

        supabase
          .from("project_members")
          .select("project_id")
          .eq("user_id", userId),

        supabase.from("tasks").select("id, status").eq("assigned_to", userId),

        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("assigned_to", userId)
          .eq("status", "Done"),

        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("assigned_to", userId)
          .eq("status", "In Progress"),
      ]);

      const ownedProjects = ownedProjectsRes.data || [];
      const memberProjects = memberProjectsRes.data || [];
      const allAssignedTasks = allAssignedTasksRes.data || [];

      const uniqueProjectIds = new Set([
        ...ownedProjects.map((project) => project.id),
        ...memberProjects.map((member) => member.project_id),
      ]);

      const totalAssignedTasks = allAssignedTasks.length;
      const completedCount = completedTasksRes.count || 0;
      const inProgressCount = inProgressTasksRes.count || 0;

      const productivity =
        totalAssignedTasks > 0
          ? Math.round((completedCount / totalAssignedTasks) * 100)
          : 0;

      setStats({
        projects: uniqueProjectIds.size,
        tasksCompleted: completedCount,
        inProgress: inProgressCount,
        productivity,
      });
    } catch (error) {
      console.error("Failed to load profile stats:", error);
      setMessage("Some profile stats could not be loaded.");
    }
  };

  const initial = useMemo(() => {
    return (userProfile.full_name || "U").charAt(0).toUpperCase();
  }, [userProfile.full_name]);

  const joinedDate = useMemo(() => {
    if (!userProfile.created_at) return "—";

    return new Date(userProfile.created_at).toLocaleDateString("en-MY", {
      month: "long",
      year: "numeric",
    });
  }, [userProfile.created_at]);

  if (loading) {
    return (
      <AppLayout>
        <div className="app-page">
          <div className="app-shell profile-shell">
            <div className="card placeholder-card profile-fade-up">
              <h2>Profile</h2>
              <p className="muted">Loading your profile...</p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="app-page">
        <div className="app-shell profile-shell">
          <div className="profile-page">
            {message ? (
              <div className="card placeholder-card profile-fade-up">
                <h2>Profile</h2>
                <p className="muted">{message}</p>
              </div>
            ) : null}

            <section className="card profile-hero-card profile-fade-up">
              <div className="profile-hero-main">
                <div className="profile-avatar-wrap">
                  <div className="profile-avatar">{initial}</div>
                  <span className="profile-status-dot"></span>
                </div>

                <div className="profile-hero-copy">
                  <p className="profile-eyebrow">Personal Profile</p>
                  <h1 className="profile-name">{userProfile.full_name}</h1>
                  <p className="profile-role muted">
                    {userProfile.department} • {userProfile.role}
                  </p>
                  <p className="profile-bio">
                    Manage your personal info, workspace preferences, and quick
                    overview of your activity in one place.
                  </p>
                </div>
              </div>

              <div className="profile-hero-actions">
                <button className="btn">Edit Profile</button>
                <button className="btn btn-secondary">Change Photo</button>
              </div>
            </section>

            <section className="profile-stats-grid">
              <div className="card profile-stat-card profile-fade-up profile-delay-1">
                <p className="profile-stat-label">Projects</p>
                <h3 className="profile-stat-value">{stats.projects}</h3>
                <p className="profile-stat-meta muted">
                  Owned or joined projects
                </p>
              </div>

              <div className="card profile-stat-card profile-fade-up profile-delay-2">
                <p className="profile-stat-label">Tasks Completed</p>
                <h3 className="profile-stat-value">{stats.tasksCompleted}</h3>
                <p className="profile-stat-meta muted">
                  Assigned tasks marked done
                </p>
              </div>

              <div className="card profile-stat-card profile-fade-up profile-delay-3">
                <p className="profile-stat-label">In Progress</p>
                <h3 className="profile-stat-value">{stats.inProgress}</h3>
                <p className="profile-stat-meta muted">
                  Assigned tasks currently active
                </p>
              </div>

              <div className="card profile-stat-card profile-fade-up profile-delay-4">
                <p className="profile-stat-label">Productivity</p>
                <h3 className="profile-stat-value">{stats.productivity}%</h3>
                <p className="profile-stat-meta muted">
                  Based on completed assigned tasks
                </p>
              </div>
            </section>

            <section className="profile-grid">
              <div className="card profile-section-card profile-fade-up profile-delay-1">
                <div className="profile-section-header">
                  <div>
                    <h2>Personal Information</h2>
                    <p className="muted">
                      Your main account details and contact information.
                    </p>
                  </div>
                </div>

                <div className="profile-info-grid">
                  <div className="profile-info-item">
                    <span className="profile-info-label">Full Name</span>
                    <span className="profile-info-value">
                      {userProfile.full_name}
                    </span>
                  </div>

                  <div className="profile-info-item">
                    <span className="profile-info-label">Email</span>
                    <span className="profile-info-value">
                      {userProfile.email || "—"}
                    </span>
                  </div>

                  <div className="profile-info-item">
                    <span className="profile-info-label">Role</span>
                    <span className="profile-info-value">{userProfile.role}</span>
                  </div>

                  <div className="profile-info-item">
                    <span className="profile-info-label">Department</span>
                    <span className="profile-info-value">
                      {userProfile.department}
                    </span>
                  </div>

                  <div className="profile-info-item">
                    <span className="profile-info-label">Timezone</span>
                    <span className="profile-info-value">
                      {userProfile.timezone}
                    </span>
                  </div>

                  <div className="profile-info-item">
                    <span className="profile-info-label">Joined</span>
                    <span className="profile-info-value">{joinedDate}</span>
                  </div>
                </div>
              </div>

              <div className="profile-side-stack">
                <div className="card profile-section-card profile-fade-up profile-delay-2">
                  <div className="profile-section-header">
                    <div>
                      <h2>Preferences</h2>
                      <p className="muted">
                        Quick summary of your current app setup.
                      </p>
                    </div>
                  </div>

                  <div className="profile-preference-list">
                    <div className="profile-preference-item">
                      <span>Theme</span>
                      <strong>Dark Mode</strong>
                    </div>
                    <div className="profile-preference-item">
                      <span>Notifications</span>
                      <strong>Enabled</strong>
                    </div>
                    <div className="profile-preference-item">
                      <span>Language</span>
                      <strong>English</strong>
                    </div>
                    <div className="profile-preference-item">
                      <span>Default View</span>
                      <strong>Dashboard</strong>
                    </div>
                  </div>
                </div>

                <div className="card profile-section-card profile-fade-up profile-delay-3">
                  <div className="profile-section-header">
                    <div>
                      <h2>Recent Activity</h2>
                      <p className="muted">
                        Snapshot of your latest TeamFlow actions.
                      </p>
                    </div>
                  </div>

                  <div className="profile-activity-list">
                    <div className="profile-activity-item">
                      <div className="profile-activity-dot"></div>
                      <div>
                        <p>Completed task “Finalize dashboard layout”</p>
                        <span className="muted">2 hours ago</span>
                      </div>
                    </div>

                    <div className="profile-activity-item">
                      <div className="profile-activity-dot"></div>
                      <div>
                        <p>Joined project “TeamFlow Redesign”</p>
                        <span className="muted">Yesterday</span>
                      </div>
                    </div>

                    <div className="profile-activity-item">
                      <div className="profile-activity-dot"></div>
                      <div>
                        <p>Updated workspace settings</p>
                        <span className="muted">3 days ago</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default ProfilePage;