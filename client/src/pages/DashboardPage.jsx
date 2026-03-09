import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

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
      console.error("Projects fetch error:", projectsError.message);
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
      console.error("Tasks fetch error:", tasksError.message);
      setLoading(false);
      return;
    }

    const totalTasks = tasks?.length || 0;
    const completedTasks = tasks?.filter((task) => task.status === "Done").length || 0;

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <div>
          <h1 style={styles.title}>Dashboard</h1>
          <p style={styles.subtitle}>Welcome, {userEmail}</p>
        </div>

        <div style={styles.topButtons}>
          <button onClick={() => navigate("/projects")} style={styles.button}>
            Go to Projects
          </button>
          <button onClick={handleLogout} style={styles.button}>
            Logout
          </button>
        </div>
      </div>

      {loading ? (
        <p>Loading dashboard...</p>
      ) : (
        <div style={styles.statsGrid}>
          <div style={styles.card}>
            <h2>{stats.totalProjects}</h2>
            <p>Total Projects</p>
          </div>

          <div style={styles.card}>
            <h2>{stats.totalTasks}</h2>
            <p>Total Tasks</p>
          </div>

          <div style={styles.card}>
            <h2>{stats.completedTasks}</h2>
            <p>Completed Tasks</p>
          </div>

          <div style={styles.card}>
            <h2>{stats.overdueTasks}</h2>
            <p>Overdue Tasks</p>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f4f4f4",
    padding: "30px",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "30px",
    gap: "20px",
    flexWrap: "wrap",
  },
  title: {
    margin: 0,
  },
  subtitle: {
    marginTop: "8px",
    color: "#555",
  },
  topButtons: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },
  button: {
    padding: "12px 18px",
    cursor: "pointer",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "20px",
  },
  card: {
    backgroundColor: "#fff",
    padding: "24px",
    borderRadius: "12px",
    boxShadow: "0 4px 10px rgba(228, 40, 40, 0.1)",
    textAlign: "center",
  },
};

export default DashboardPage;