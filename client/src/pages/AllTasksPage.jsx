import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import AppLayout from "../components/AppLayout";

const STATUS_TABS = ["All", "To Do", "In Progress", "Done"];

const fadeDown = {
  hidden: { opacity: 0, y: -14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: "easeOut" },
  },
};

const fadeRight = {
  hidden: { opacity: 0, x: 24 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.32, ease: "easeOut" },
  },
};

const staggerTabs = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.04,
    },
  },
};

const staggerList = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};

function AllTasksPage() {
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeStatus, setActiveStatus] = useState("All");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

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

    await Promise.all([fetchTasks(user.id), fetchMembers()]);
    setLoading(false);
  };

  const fetchTasks = async (currentUserId) => {
    const { data, error } = await supabase
      .from("tasks")
      .select(`
        *,
        projects (
          id,
          name,
          color
        )
      `)
      .or(`assigned_to.eq.${currentUserId},assigned_to.is.null`)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setTasks(data || []);
  };

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from("project_members")
      .select(`
        id,
        project_id,
        role,
        user_id,
        profiles (
          id,
          full_name,
          email
        )
      `);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMembers(data || []);
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    const previousTasks = [...tasks];

    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, status: newStatus } : task
      )
    );

    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", taskId);

    if (error) {
      setTasks(previousTasks);
      setMessage(error.message);
      return;
    }
  };

  const getAssignedMemberLabel = (task) => {
    if (!task.assigned_to) return "Unassigned";

    const foundMember = members.find(
      (member) =>
        member.project_id === task.project_id &&
        member.user_id === task.assigned_to
    );

    if (!foundMember) return "Unknown member";

    return (
      foundMember.profiles?.full_name ||
      foundMember.profiles?.email ||
      "Unnamed member"
    );
  };

  const getPriorityClass = (priority) => {
    if (priority === "High") return "priority-high";
    if (priority === "Low") return "priority-low";
    return "priority-medium";
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

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesStatus =
        activeStatus === "All" ? true : task.status === activeStatus;

      const keyword = searchTerm.trim().toLowerCase();

      const matchesSearch =
        keyword === ""
          ? true
          : task.title?.toLowerCase().includes(keyword) ||
            task.description?.toLowerCase().includes(keyword) ||
            task.priority?.toLowerCase().includes(keyword) ||
            task.status?.toLowerCase().includes(keyword) ||
            task.projects?.name?.toLowerCase().includes(keyword) ||
            getAssignedMemberLabel(task).toLowerCase().includes(keyword);

      return matchesStatus && matchesSearch;
    });
  }, [tasks, activeStatus, searchTerm, members]);

  const handleOpenProject = (projectId) => {
    navigate(`/projects/${projectId}`);
  };

  const handleOpenTask = (taskId) => {
    navigate(`/tasks/${taskId}`);
  };

  return (
    <AppLayout>
      <div className="app-page">
        <div className="app-shell">
          <motion.div
            className="top-bar"
            variants={fadeDown}
            initial="hidden"
            animate="show"
          >
            <div>
              <h1 className="page-title">All Tasks</h1>
              <p className="page-subtitle">
                View all tasks across your projects in one place.
              </p>
            </div>
          </motion.div>

          <motion.div
            className="card section-card"
            style={{ marginBottom: "20px" }}
            variants={fadeUp}
            initial="hidden"
            animate="show"
          >
            <div className="all-tasks-toolbar">
              <div className="all-tasks-search-wrap">
                <input
                  type="text"
                  placeholder="Search by task, project, member, priority..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input"
                />
              </div>

              <motion.div
                className="all-tasks-tabs"
                variants={staggerTabs}
                initial="hidden"
                animate="show"
              >
                {STATUS_TABS.map((status) => (
                  <motion.button
                    key={status}
                    type="button"
                    className={`filter-tab ${
                      activeStatus === status ? "active" : ""
                    }`}
                    onClick={() => setActiveStatus(status)}
                    variants={fadeRight}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {status}
                  </motion.button>
                ))}
              </motion.div>
            </div>
          </motion.div>

          {message && <p className="message">{message}</p>}

          {loading ? (
            <motion.div
              className="card section-card"
              variants={fadeUp}
              initial="hidden"
              animate="show"
            >
              <p className="muted">Loading tasks...</p>
            </motion.div>
          ) : filteredTasks.length === 0 ? (
            <motion.div
              className="card section-card"
              variants={fadeUp}
              initial="hidden"
              animate="show"
            >
              <p className="muted">No tasks found.</p>
            </motion.div>
          ) : (
            <motion.div
              className="task-list"
              variants={staggerList}
              initial="hidden"
              animate="show"
            >
              {filteredTasks.map((task) => {
                const projectColor = task.projects?.color || "purple";
                const statusAction = getNextStatusAction(task.status);

                return (
                  <motion.div
                    key={task.id}
                    className={`all-tasks-card task-theme-${projectColor}`}
                    variants={fadeRight}
                    whileHover={{ y: -3, scale: 1.005 }}
                  >
                    <div className="task-color-bar"></div>

                    <div className="project-task-content">
                      <div className="project-task-header">
                        <motion.div
                          className="project-task-main"
                          onClick={() => handleOpenTask(task.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              handleOpenTask(task.id);
                            }
                          }}
                          whileHover={{ x: 3 }}
                        >
                          <h3>{task.title}</h3>
                          <p className="project-task-description muted">
                            {task.description || "No description"}
                          </p>
                        </motion.div>
                      </div>

                      <div className="all-tasks-meta-row">
                        <div className="project-task-badges">
                          <span className="task-status-badge">
                            {task.status}
                          </span>

                          <span
                            className={`task-priority-badge ${getPriorityClass(
                              task.priority
                            )}`}
                          >
                            {task.priority} Priority
                          </span>

                          <span className="task-date-badge">
                            Due: {task.due_date || "No due date"}
                          </span>

                          <span className="task-member-badge">
                            {getAssignedMemberLabel(task)}
                          </span>

                          <button
                            type="button"
                            className="task-project-badge task-project-badge-button"
                            onClick={() => handleOpenProject(task.project_id)}
                          >
                            Project: {task.projects?.name || "Unknown Project"}
                          </button>
                        </div>

                        <motion.button
                          type="button"
                          className={statusAction.className}
                          onClick={() =>
                            updateTaskStatus(task.id, statusAction.status)
                          }
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                        >
                          {statusAction.label}
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default AllTasksPage;