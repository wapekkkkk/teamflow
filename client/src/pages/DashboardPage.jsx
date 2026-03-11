import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import AppLayout from "../components/AppLayout";

function DashboardPage() {
  const navigate = useNavigate();

  const [userEmail, setUserEmail] = useState("");
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
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

  const filteredProjects = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    if (!keyword) return projects;

    return projects.filter((project) => {
      const nameMatch = project.name?.toLowerCase().includes(keyword);
      const descMatch = project.description?.toLowerCase().includes(keyword);
      return nameMatch || descMatch;
    });
  }, [projects, searchTerm]);

  const filteredTasks = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    let baseTasks = tasks;

    if (keyword) {
      baseTasks = tasks.filter((task) => {
        const project = getProjectById(task.project_id);
        const titleMatch = task.title?.toLowerCase().includes(keyword);
        const projectMatch = project?.name?.toLowerCase().includes(keyword);
        const descMatch = task.description?.toLowerCase().includes(keyword);
        return titleMatch || projectMatch || descMatch;
      });
    }

    return baseTasks.slice(0, 5);
  }, [tasks, projects, searchTerm]);

  const updateTaskStatus = async (taskId, newStatus) => {
    setUpdatingTaskId(taskId);

    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", taskId);

    if (!error) {
      await loadDashboardData();
    }

    setUpdatingTaskId(null);
  };

  const getNextStatusAction = (currentStatus) => {
    if (currentStatus === "Done") {
      return {
        label: "Mark as To Do",
        status: "To Do",
        className: "project-status-btn",
      };
    }

    return {
      label: "Mark as Done",
      status: "Done",
      className: "project-status-btn btn-success-soft",
    };
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

          <div className="dashboard-search-wrap">
            <input
              type="text"
              placeholder="Search projects or tasks..."
              className="input dashboard-search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
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
                <div className="section-header section-header-row">
                  <h2>Projects</h2>
                  <button
                    className="link-button"
                    onClick={() => navigate("/projects")}
                  >
                    View All
                  </button>
                </div>

                {filteredProjects.length === 0 ? (
                  <p className="muted">No matching projects found.</p>
                ) : (
                  <div className="dashboard-project-scroll">
                    {filteredProjects.map((project) => {
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
                <div className="section-header section-header-row">
                  <h2>Recent Tasks</h2>
                </div>

                {filteredTasks.length === 0 ? (
                  <p className="muted">No matching tasks found.</p>
                ) : (
                  <div className="dashboard-task-list">
                    {filteredTasks.map((task) => {
                      const project = getProjectById(task.project_id);
                      const projectColor = project?.color || "purple";
                      const statusAction = getNextStatusAction(task.status);

                      return (
                        <div
                          key={task.id}
                          className={`dashboard-task-card task-theme-${projectColor}`}
                        >
                          <div className="task-color-bar"></div>

                          <div className="dashboard-task-content">
                            <div className="dashboard-task-top">
                              <div>
                                <h3>{task.title}</h3>
                                <p className="dashboard-task-project">
                                  {project?.name || "Unknown Project"}
                                </p>
                              </div>
                            </div>

                            <div className="dashboard-task-meta">
                              <span className="task-status-badge">{task.status}</span>
                              <span className="task-date-badge">
                                Due: {task.due_date || "No due date"}
                              </span>
                            </div>

                            <div className="project-task-actions project-task-actions-row">
                              <button
                                type="button"
                                className="project-status-btn active"
                                onClick={() => navigate(`/projects/${task.project_id}`)}
                              >
                                View Project
                              </button>

                              <button
                                type="button"
                                className={statusAction.className}
                                onClick={() =>
                                  updateTaskStatus(task.id, statusAction.status)
                                }
                                disabled={updatingTaskId === task.id}
                              >
                                {updatingTaskId === task.id
                                  ? "Updating..."
                                  : statusAction.label}
                              </button>
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