import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import AppLayout from "../components/AppLayout";

function DashboardPage() {
  const navigate = useNavigate();

  const [userEmail, setUserEmail] = useState("");
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
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

    const { data: projectData, error: projectsError } = await supabase
      .from("projects")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    if (projectsError) {
      setLoading(false);
      return;
    }

    const totalProjects = projectData?.length || 0;
    setProjects(projectData || []);

    if (totalProjects === 0) {
      setStats({
        totalProjects: 0,
        totalTasks: 0,
        completedTasks: 0,
        overdueTasks: 0,
      });
      setTasks([]);
      setLoading(false);
      return;
    }

    const projectIds = projectData.map((project) => project.id);

    const { data: taskData, error: tasksError } = await supabase
      .from("tasks")
      .select("*")
      .in("project_id", projectIds)
      .order("created_at", { ascending: false });

    if (tasksError) {
      setLoading(false);
      return;
    }

    const totalTasks = taskData?.length || 0;
    const completedTasks =
      taskData?.filter((task) => task.status === "Done").length || 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueTasks =
      taskData?.filter((task) => {
        if (!task.due_date || task.status === "Done") return false;
        const dueDate = new Date(task.due_date);
        return dueDate < today;
      }).length || 0;

    setTasks(taskData || []);
    setStats({
      totalProjects,
      totalTasks,
      completedTasks,
      overdueTasks,
    });

    setLoading(false);
  };

  const getProjectById = (projectId) => {
    return projects.find((project) => project.id === projectId);
  };

  const getProjectProgress = (projectId) => {
    const projectTasks = tasks.filter((task) => task.project_id === projectId);

    if (projectTasks.length === 0) return 0;

    const doneCount = projectTasks.filter((task) => task.status === "Done").length;
    return Math.round((doneCount / projectTasks.length) * 100);
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
            <>
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

              <div className="dashboard-section">
                <div className="section-header">
                  <h2>Projects</h2>
                </div>

                {projects.length === 0 ? (
                  <p className="muted">No projects yet.</p>
                ) : (
                  <div className="dashboard-project-grid">
                    {projects.map((project) => {
                      const progress = getProjectProgress(project.id);
                      const projectTaskCount = tasks.filter(
                        (task) => task.project_id === project.id
                      ).length;

                      return (
                        <div
                          key={project.id}
                          className={`dashboard-project-card project-theme-${project.color || "purple"}`}
                          onClick={() => navigate(`/projects/${project.id}`)}
                        >
                          <div className="dashboard-project-top">
                            <h3>{project.name}</h3>
                            <span className="project-mini-dot"></span>
                          </div>

                          <p className="dashboard-project-description">
                            {project.description || "No description"}
                          </p>

                          <p className="dashboard-project-meta">
                            {projectTaskCount} tasks
                          </p>

                          <div className="project-progress-bar">
                            <div
                              className="project-progress-fill"
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>

                          <p className="dashboard-project-meta">{progress}% complete</p>
                          <p className="dashboard-project-meta">
                            Due: {project.due_date || "No due date"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="dashboard-section">
                <div className="section-header">
                  <h2>Tasks</h2>
                </div>

                {tasks.length === 0 ? (
                  <p className="muted">No tasks yet.</p>
                ) : (
                  <div className="dashboard-task-list">
                    {tasks.map((task) => {
                      const project = getProjectById(task.project_id);
                      const projectColor = project?.color || "purple";

                      return (
                        <div
                          key={task.id}
                          className={`dashboard-task-card task-theme-${projectColor}`}
                        >
                          <div className="task-color-bar"></div>

                          <div className="dashboard-task-content">
                            <h3>{task.title}</h3>
                            <p className="dashboard-task-project">
                              {project?.name || "Unknown Project"}
                            </p>

                            <div className="dashboard-task-meta">
                              <span className="task-status-badge">{task.status}</span>
                              <span className="task-date-badge">
                                Due: {task.due_date || "No due date"}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default DashboardPage;