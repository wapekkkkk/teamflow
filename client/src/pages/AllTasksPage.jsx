import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import AppLayout from "../components/AppLayout";

const STATUS_TABS = ["All", "To Do", "In Progress", "Done"];

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

    await Promise.all([fetchTasks(), fetchMembers()]);
    setLoading(false);
  };

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select(
        `
        *,
        projects (
          id,
          name,
          color
        )
      `
      )
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
      .select(
        `
        id,
        project_id,
        role,
        user_id,
        profiles (
          id,
          full_name,
          email
        )
      `
      );

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
          <div className="top-bar">
            <div>
              <h1 className="page-title">All Tasks</h1>
              <p className="page-subtitle">
                View all tasks across your projects in one place.
              </p>
            </div>
          </div>

          <div className="card section-card" style={{ marginBottom: "20px" }}>
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

              <div className="all-tasks-tabs">
                {STATUS_TABS.map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={`filter-tab ${
                      activeStatus === status ? "active" : ""
                    }`}
                    onClick={() => setActiveStatus(status)}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {message && <p className="message">{message}</p>}

          {loading ? (
            <div className="card section-card">
              <p className="muted">Loading tasks...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="card section-card">
              <p className="muted">No tasks found.</p>
            </div>
          ) : (
            <div className="task-list">
              {filteredTasks.map((task) => {
                const projectColor = task.projects?.color || "purple";
                const statusAction = getNextStatusAction(task.status);

                return (
                  <div
                    key={task.id}
                    className={`project-task-card task-theme-${projectColor}`}
                  >
                    <div className="task-color-bar"></div>

                    <div className="project-task-content">
                      <div className="project-task-header">
                        <div
                          className="project-task-main"
                          onClick={() => handleOpenProject(task_id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              handleOpenProject(task_id);
                            }
                          }}
                        >
                          <h3>{task.title}</h3>
                          <p className="project-task-description muted">
                            {task.description || "No description"}
                          </p>
                        </div>
                      </div>

                      <div className="project-task-badges">
                        <span className="task-status-badge">{task.status}</span>

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

                        <span className="task-project-badge">
                          Project: {task.projects?.name || "Unknown Project"}
                        </span>
                      </div>

                      <div className="project-task-actions project-task-actions-row">
                        <button
                          type="button"
                          className="project-status-btn active"
                          onClick={() => handleOpenProject(task.project_id)}
                        >
                          View Project
                        </button>

                        <button
                          type="button"
                          className={statusAction.className}
                          onClick={() =>
                            updateTaskStatus(task.id, statusAction.status)
                          }
                        >
                          {statusAction.label}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default AllTasksPage;