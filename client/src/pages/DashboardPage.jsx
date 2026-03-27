import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import AppLayout from "../components/AppLayout";
import DashboardNotesSidebar from "../components/DashboardNotesSidebar";

const fadeDown = {
  hidden: { opacity: 0, y: -16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

const fadeRight = {
  hidden: { opacity: 0, x: 28 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

const staggerFast = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.05,
    },
  },
};

const staggerMedium = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.08,
    },
  },
};

function DashboardCompactTaskCard({ task, project, onOpenTask, onOpenProject }) {
  const projectColor = project?.color || "purple";

  return (
    <motion.div
      className={`dashboard-compact-task-card task-theme-${projectColor}`}
      initial={{ opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      whileHover={{ x: 4 }}
    >
      <div className="task-color-bar"></div>

      <div className="dashboard-compact-task-content">
        <button
          type="button"
          className="dashboard-compact-task-main"
          onClick={() => onOpenTask(task.id)}
        >
          <h3>{task.title}</h3>
          <p>{project?.name || "Unknown Project"}</p>
        </button>

        <div className="dashboard-compact-task-footer">
          <span className="task-date-badge">
            {task.due_date ? `Due: ${task.due_date}` : "No due date"}
          </span>

          <button
            type="button"
            className="dashboard-mini-link"
            onClick={() => onOpenProject(task.project_id)}
          >
            View
          </button>
        </div>
      </div>
    </motion.div>);
}

function DashboardPage() {
  const navigate = useNavigate();

  const [userEmail, setUserEmail] = useState("");
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
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

    const { data: ownedProjects, error: ownedProjectsError } = await supabase
      .from("projects")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    if (ownedProjectsError) {
      setLoading(false);
      return;
    }

    const { data: memberships, error: membershipError } = await supabase
      .from("project_members")
      .select("project_id")
      .eq("user_id", user.id);

    if (membershipError) {
      setLoading(false);
      return;
    }

    const memberProjectIds = (memberships || []).map((item) => item.project_id);

    let memberProjects = [];

    if (memberProjectIds.length > 0) {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .in("id", memberProjectIds)
        .order("created_at", { ascending: false });

      if (error) {
        setLoading(false);
        return;
      }

      memberProjects = data || [];
    }

    const projectMap = new Map();

    [...(ownedProjects || []), ...memberProjects].forEach((project) => {
      projectMap.set(project.id, project);
    });

    const allProjects = Array.from(projectMap.values());
    setProjects(allProjects);

    const totalProjects = allProjects.length;

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

    const accessibleProjectIds = allProjects.map((project) => project.id);

    const { data: taskData, error: tasksError } = await supabase
      .from("tasks")
      .select("*")
      .in("project_id", accessibleProjectIds)
      .order("created_at", { ascending: false });

    if (tasksError) {
      setLoading(false);
      return;
    }

    const visibleTasks = (taskData || []).filter(
      (task) => task.assigned_to === user.id || task.assigned_to === null
    );

    const totalTasks = visibleTasks.length;
    const completedTasks =
      visibleTasks.filter((task) => task.status === "Done").length || 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueTasks =
      visibleTasks.filter((task) => {
        if (!task.due_date || task.status === "Done") return false;
        const dueDate = new Date(task.due_date);
        return dueDate < today;
      }).length || 0;

    setTasks(visibleTasks);
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

    if (!keyword) return tasks;

    return tasks.filter((task) => {
      const project = getProjectById(task.project_id);
      const titleMatch = task.title?.toLowerCase().includes(keyword);
      const projectMatch = project?.name?.toLowerCase().includes(keyword);
      const descMatch = task.description?.toLowerCase().includes(keyword);
      return titleMatch || projectMatch || descMatch;
    });
  }, [tasks, projects, searchTerm]);

  const dueSoonTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return filteredTasks
      .filter((task) => {
        if (!task.due_date || task.status === "Done") return false;
        const dueDate = new Date(task.due_date);
        const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 7;
      })
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
      .slice(0, 4);
  }, [filteredTasks]);

  const todoPreviewTasks = useMemo(() => {
    return filteredTasks
      .filter((task) => task.status === "To Do")
      .slice(0, 4);
  }, [filteredTasks]);

  const inProgressPreviewTasks = useMemo(() => {
    return filteredTasks
      .filter((task) => task.status === "In Progress")
      .slice(0, 4);
  }, [filteredTasks]);



  return (
    <AppLayout rightSidebar={<DashboardNotesSidebar title="Quick Notes" />}
      defaultRightSidebarCollapsed={false}
    >
      <div className="app-page">
        <div className="app-shell">
          <motion.div
            className="top-bar"
            variants={fadeDown}
            initial="hidden"
            animate="show"
          >
            <div>
              <h1 className="page-title">Dashboard</h1>
              <p className="page-subtitle">Welcome, {userEmail}</p>
            </div>
          </motion.div>

          <motion.div
            className="dashboard-search-wrap"
            variants={fadeUp}
            initial="hidden"
            animate="show"
            transition={{ delay: 0.05 }}
          >
            <input
              type="text"
              placeholder="Search projects or tasks..."
              className="input dashboard-search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </motion.div>

          {loading ? (
            <motion.p
              className="muted"
              variants={fadeUp}
              initial="hidden"
              animate="show"
            >
              Loading dashboard...
            </motion.p>
          ) : (
            <>
              <motion.div
                className="stats-grid"
                variants={staggerFast}
                initial="hidden"
                animate="show"
              >
                <motion.div
                  className="card stat-card"
                  variants={fadeRight}
                  whileHover={{ y: -4, scale: 1.01 }}
                >                  <h2 className="stat-number">{stats.totalProjects}</h2>
                  <p className="stat-label">Total Projects</p>
                </motion.div>

                <motion.div
                  className="card stat-card"
                  variants={fadeRight}
                  whileHover={{ y: -4, scale: 1.01 }}
                >                  <h2 className="stat-number">{stats.totalTasks}</h2>
                  <p className="stat-label">Total Tasks</p>
                </motion.div>

                <motion.div
                  className="card stat-card"
                  variants={fadeRight}
                  whileHover={{ y: -4, scale: 1.01 }}
                >                  <h2 className="stat-number">{stats.completedTasks}</h2>
                  <p className="stat-label">Completed Tasks</p>
                </motion.div>

                <motion.div
                  className="card stat-card"
                  variants={fadeRight}
                  whileHover={{ y: -4, scale: 1.01 }}
                >                  <h2 className="stat-number">{stats.overdueTasks}</h2>
                  <p className="stat-label">Overdue Tasks</p>
                </motion.div></motion.div>
              <motion.div
                className="dashboard-section"
                variants={fadeUp}
                initial="hidden"
                animate="show"
                transition={{ delay: 0.08 }}
              >                <div className="section-header section-header-row">
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
                  <motion.div
                    className="dashboard-project-scroll"
                    variants={staggerMedium}
                    initial="hidden"
                    animate="show"
                  >                    {filteredProjects.map((project) => {
                    const progress = getProjectProgress(project.id);
                    const projectTaskCount = tasks.filter(
                      (task) => task.project_id === project.id
                    ).length;

                    return (
                      <motion.div
                        key={project.id}
                        className={`dashboard-project-card project-theme-${project.color || "purple"}`}
                        onClick={() => navigate(`/projects/${project.id}`)}
                        variants={fadeRight}
                        whileHover={{ y: -4, scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
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
                      </motion.div>);
                  })}
                  </motion.div>)}
              </motion.div>
              <div className="dashboard-section">
                <div className="section-header section-header-row">
                  <h2>My Tasks</h2>
                  <button
                    className="link-button"
                    onClick={() => navigate("/tasks")}
                  >
                    View All
                  </button>
                </div>

                {filteredTasks.length === 0 ? (
                  <p className="muted">No matching tasks found.</p>
                ) : (
                  <motion.div
                    className="dashboard-mini-board"
                    variants={staggerMedium}
                    initial="hidden"
                    animate="show"
                  >
                    <motion.div
                      className="dashboard-mini-column card"
                      variants={fadeUp}
                      whileHover={{ y: -3 }}
                    >                      <div className="dashboard-mini-column-header">
                        <h3>To Do</h3>
                        <span>{todoPreviewTasks.length}</span>
                      </div>

                      <div className="dashboard-mini-column-body">
                        {todoPreviewTasks.length === 0 ? (
                          <p className="muted">No tasks</p>
                        ) : (
                          todoPreviewTasks.map((task) => (
                            <DashboardCompactTaskCard
                              key={task.id}
                              task={task}
                              project={getProjectById(task.project_id)}
                              onOpenTask={(taskId) => navigate(`/tasks/${taskId}`)}
                              onOpenProject={(projectId) => navigate(`/projects/${projectId}`)}
                            />
                          ))
                        )}
                      </div>
                    </motion.div>
                    <motion.div
                      className="dashboard-mini-column card"
                      variants={fadeUp}
                      whileHover={{ y: -3 }}
                    >                      <div className="dashboard-mini-column-header">
                        <h3>In Progress</h3>
                        <span>{inProgressPreviewTasks.length}</span>
                      </div>

                      <div className="dashboard-mini-column-body">
                        {inProgressPreviewTasks.length === 0 ? (
                          <p className="muted">No tasks</p>
                        ) : (
                          inProgressPreviewTasks.map((task) => (
                            <DashboardCompactTaskCard
                              key={task.id}
                              task={task}
                              project={getProjectById(task.project_id)}
                              onOpenTask={(taskId) => navigate(`/tasks/${taskId}`)}
                              onOpenProject={(projectId) => navigate(`/projects/${projectId}`)}
                            />
                          ))
                        )}
                      </div>
                    </motion.div>
                    <motion.div
                      className="dashboard-mini-column card"
                      variants={fadeUp}
                      whileHover={{ y: -3 }}
                    >                      <div className="dashboard-mini-column-header">
                        <h3>Due Soon</h3>
                        <span>{dueSoonTasks.length}</span>
                      </div>

                      <div className="dashboard-mini-column-body">
                        {dueSoonTasks.length === 0 ? (
                          <p className="muted">No tasks</p>
                        ) : (
                          dueSoonTasks.map((task) => (
                            <DashboardCompactTaskCard
                              key={task.id}
                              task={task}
                              project={getProjectById(task.project_id)}
                              onOpenTask={(taskId) => navigate(`/tasks/${taskId}`)}
                              onOpenProject={(projectId) => navigate(`/projects/${projectId}`)}
                            />
                          ))
                        )}
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </div>
            </>
          )}
        </div >
      </div >
    </AppLayout >
  );
}

export default DashboardPage;