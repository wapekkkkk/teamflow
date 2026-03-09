import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import AppLayout from "../components/AppLayout";

function DashboardPage() {
  const navigate = useNavigate();

  const [userEmail, setUserEmail] = useState("");
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      navigate("/login");
      return;
    }

    setUserEmail(user.email);

    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select("id")
      .eq("owner_id", user.id);

    if (projectsError) {
      setLoading(false);
      return;
    }

    const totalProjects = projects?.length || 0;

    if (totalProjects === 0) {
      setStats({
        totalProjects: 0,
        totalTasks: 0,
        completedTasks: 0,
        overdueTasks: 0,
      });
      setLoading(false);
      return;
    }

    const projectIds = projects.map((project) => project.id);

    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("*")
      .in("project_id", projectIds);

    if (tasksError) {
      setLoading(false);
      return;
    }

    const totalTasks = tasks?.length || 0;
    const completedTasks =
      tasks?.filter((task) => task.status === "Done").length || 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueTasks =
      tasks?.filter((task) => {
        if (!task.due_date || task.status === "Done") return false;
        const dueDate = new Date(task.due_date);
        return dueDate < today;
      }).length || 0;

    setStats({
      totalProjects,
      totalTasks,
      completedTasks,
      overdueTasks,
    });

    setLoading(false);
  };

  return (
    <AppLayout>
      <div className="app-page">
        <div className="app-shell">
          <div className="top-bar">
            <div>
              <h1 className="page-title">Dashboard</h1>
              <p className="page-subtitle">Welcome, {userEmail}</p>
            </div>
          </div>

          {loading ? (
            <p className="muted">Loading dashboard...</p>
          ) : (
            <div className="stats-grid">
              <div className="card stat-card">
                <h2 className="stat-number">{stats.totalProjects}</h2>
                <p className="stat-label">Total Projects</p>
              </div>

              <div className="card stat-card">
                <h2 className="stat-number">{stats.totalTasks}</h2>
                <p className="stat-label">Total Tasks</p>
              </div>

              <div className="card stat-card">
                <h2 className="stat-number">{stats.completedTasks}</h2>
                <p className="stat-label">Completed Tasks</p>
              </div>

              <div className="card stat-card">
                <h2 className="stat-number">{stats.overdueTasks}</h2>
                <p className="stat-label">Overdue Tasks</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default DashboardPage;