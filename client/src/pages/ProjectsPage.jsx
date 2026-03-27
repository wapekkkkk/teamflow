import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import AppLayout from "../components/AppLayout";

const pageHeaderVariants = {
  hidden: { opacity: 0, y: -16 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: "easeOut",
    },
  },
};

const listVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.08,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, x: 30 },
  show: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.35,
      ease: "easeOut",
    },
  },
};

const fadeVariants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
};

function ProjectsPage() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

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

    await fetchProjects(user.id);
    setLoading(false);
  };

  const fetchProjects = async (userId) => {
    const { data: ownedProjects, error: ownedError } = await supabase
      .from("projects")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });

    if (ownedError) {
      setMessage(ownedError.message);
      return;
    }

    const { data: memberships, error: membershipError } = await supabase
      .from("project_members")
      .select("project_id")
      .eq("user_id", userId);

    if (membershipError) {
      setMessage(membershipError.message);
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
        setMessage(error.message);
        return;
      }

      memberProjects = data || [];
    }

    const mergedMap = new Map();

    [...(ownedProjects || []), ...memberProjects].forEach((project) => {
      mergedMap.set(project.id, project);
    });

    const mergedProjects = Array.from(mergedMap.values());

    if (mergedProjects.length === 0) {
      setProjects([]);
      return;
    }

    const projectIds = mergedProjects.map((project) => project.id);

    const { data: allProjectMembers, error: membersError } = await supabase
      .from("project_members")
      .select("project_id")
      .in("project_id", projectIds);

    if (membersError) {
      setMessage(membersError.message);
      return;
    }

    const { data: allTasks, error: tasksError } = await supabase
      .from("tasks")
      .select("project_id, status")
      .in("project_id", projectIds);

    if (tasksError) {
      setMessage(tasksError.message);
      return;
    }

    const enrichedProjects = mergedProjects.map((project) => {
      const memberCount = (allProjectMembers || []).filter(
        (member) => member.project_id === project.id
      ).length;

      const projectTasks = (allTasks || []).filter(
        (task) => task.project_id === project.id
      );

      const taskCount = projectTasks.length;

      const doneCount = projectTasks.filter(
        (task) => task.status === "Done"
      ).length;

      const progress = taskCount === 0 ? 0 : Math.round((doneCount / taskCount) * 100);

      return {
        ...project,
        memberCount,
        taskCount,
        progress,
      };
    });

    setProjects(enrichedProjects);
  };

  return (
    <AppLayout>
      <div className="app-page">
        <div className="app-shell">
          <motion.div
            className="top-bar"
            variants={pageHeaderVariants}
            initial="hidden"
            animate="show"
          >
            <div>
              <h1 className="page-title">My Projects</h1>
              <p className="page-subtitle">Manage and organize your work.</p>
            </div>

            <button
              className="btn"
              onClick={() => navigate("/projects/new")}
            >
              New Project
            </button>
          </motion.div>

          {message && <p className="message">{message}</p>}

          <div className="projects-page-list-wrap">
            {loading ? (
              <motion.p
                className="muted"
                variants={fadeVariants}
                initial="hidden"
                animate="show"
              >
                Loading projects...
              </motion.p>
            ) : projects.length === 0 ? (
              <motion.div
                className="empty-state"
                variants={fadeVariants}
                initial="hidden"
                animate="show"
              >
                <h3>No projects yet</h3>
                <p className="muted">
                  Start by creating your first project.
                </p>
                <button
                  className="btn"
                  onClick={() => navigate("/projects/new")}
                >
                  Create New Project
                </button>
              </motion.div>
            ) : (
              <motion.div
                className="project-list"
                variants={listVariants}
                initial="hidden"
                animate="show"
              >
                {projects.map((project) => (
                  <motion.div
                    key={project.id}
                    className={`project-overview-card project-theme-${project.color || "purple"}`}
                    onClick={() => navigate(`/projects/${project.id}`)}
                    variants={cardVariants}
                    whileHover={{ y: -4, scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="project-overview-top">
                      <div>
                        <h3 className="project-overview-title">{project.name}</h3>
                        <p className="project-overview-description">
                          {project.description || "No description"}
                        </p>
                      </div>

                      <button
                        type="button"
                        className="project-overview-menu"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        aria-label="Project options"
                      >
                        ⋮
                      </button>
                    </div>

                    <div className="project-overview-meta">
                      <p>{project.memberCount} members</p>
                      <p>{project.taskCount} tasks</p>
                    </div>

                    <div className="project-progress-bar">
                      <div
                        className="project-progress-fill"
                        style={{ width: `${project.progress}%` }}
                      ></div>
                    </div>

                    <p className="project-overview-progress-text">
                      {project.progress}% Completed
                    </p>
                  </motion.div>
                ))}
              </motion.div>

            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default ProjectsPage;