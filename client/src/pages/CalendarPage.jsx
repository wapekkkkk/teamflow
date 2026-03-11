import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import AppLayout from "../components/AppLayout";

function CalendarPage() {
  const navigate = useNavigate();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserAndLoadTasks();
  }, []);

  const checkUserAndLoadTasks = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      navigate("/login");
      return;
    }

    await fetchTasks(user.id);
  };

  const fetchTasks = async (userId) => {
    setLoading(true);

    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("owner_id", userId);

    if (projectError) {
      setMessage(projectError.message);
      setLoading(false);
      return;
    }

    const projectIds = projectData?.map((project) => project.id) || [];

    if (projectIds.length === 0) {
      setTasks([]);
      setLoading(false);
      return;
    }

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
      .in("project_id", projectIds)
      .not("due_date", "is", null)
      .order("due_date", { ascending: true });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setTasks(data || []);
    setLoading(false);
  };

  const monthLabel = currentMonth.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  const startOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  );

  const endOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  );

  const startDay = startOfMonth.getDay();
  const totalDays = endOfMonth.getDate();

  const calendarDays = useMemo(() => {
    const cells = [];

    for (let i = 0; i < startDay; i += 1) {
      cells.push(null);
    }

    for (let day = 1; day <= totalDays; day += 1) {
      cells.push(
        new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
      );
    }

    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    return cells;
  }, [currentMonth, startDay, totalDays]);

  const formatDateKey = (date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const todayKey = formatDateKey(new Date());
  const selectedDateKey = formatDateKey(selectedDate);

  const tasksByDate = useMemo(() => {
    const grouped = {};

    tasks.forEach((task) => {
      if (!task.due_date) return;

      if (!grouped[task.due_date]) {
        grouped[task.due_date] = [];
      }

      grouped[task.due_date].push(task);
    });

    return grouped;
  }, [tasks]);

  const selectedDateTasks = tasksByDate[selectedDateKey] || [];

  const handlePreviousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  const getTaskChipClass = (task) => {
    return `calendar-task-chip task-theme-${task.projects?.color || "purple"}`;
  };

  return (
    <AppLayout>
      <div className="app-page">
        <div className="app-shell">
          <div className="top-bar">
            <div>
              <h1 className="page-title">Calendar</h1>
              <p className="page-subtitle">
                View task deadlines by month and date.
              </p>
            </div>
          </div>

          {message && <p className="message">{message}</p>}

          {loading ? (
            <div className="card section-card">
              <p className="muted">Loading calendar...</p>
            </div>
          ) : (
            <div className="calendar-layout">
              <div className="card section-card">
                <div className="calendar-header">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handlePreviousMonth}
                  >
                    Previous
                  </button>

                  <h2 className="calendar-month-title">{monthLabel}</h2>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleNextMonth}
                  >
                    Next
                  </button>
                </div>

                <div className="calendar-weekdays">
                  <div>Sun</div>
                  <div>Mon</div>
                  <div>Tue</div>
                  <div>Wed</div>
                  <div>Thu</div>
                  <div>Fri</div>
                  <div>Sat</div>
                </div>

                <div className="calendar-grid">
                  {calendarDays.map((date, index) => {
                    if (!date) {
                      return (
                        <div
                          key={`empty-${index}`}
                          className="calendar-cell calendar-cell-empty"
                        ></div>
                      );
                    }

                    const dateKey = formatDateKey(date);
                    const dayTasks = tasksByDate[dateKey] || [];
                    const isToday = dateKey === todayKey;
                    const isSelected = dateKey === selectedDateKey;

                    return (
                      <button
                        key={dateKey}
                        type="button"
                        className={`calendar-cell ${
                          isToday ? "calendar-cell-today" : ""
                        } ${isSelected ? "calendar-cell-selected" : ""}`}
                        onClick={() => setSelectedDate(date)}
                      >
                        <div className="calendar-day-number">{date.getDate()}</div>

                        <div className="calendar-cell-tasks">
                          {dayTasks.slice(0, 3).map((task) => (
                            <div
                              key={task.id}
                              className={getTaskChipClass(task)}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/tasks/${task.id}`);
                              }}
                            >
                              {task.title}
                            </div>
                          ))}

                          {dayTasks.length > 3 && (
                            <div className="calendar-more-tasks">
                              +{dayTasks.length - 3} more
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="card section-card">
                <h2 className="calendar-side-title">
                  Tasks on {selectedDate.toLocaleDateString()}
                </h2>

                {selectedDateTasks.length === 0 ? (
                  <p className="muted">No tasks due on this date.</p>
                ) : (
                  <div className="calendar-selected-task-list">
                    {selectedDateTasks.map((task) => (
                      <div
                        key={task.id}
                        className={`project-task-card task-theme-${task.projects?.color || "purple"}`}
                      >
                        <div className="task-color-bar"></div>

                        <div className="project-task-content">
                          <div className="project-task-header">
                            <div
                              className="project-task-main"
                              onClick={() => navigate(`/tasks/${task.id}`)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  navigate(`/tasks/${task.id}`);
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
                            <span className="task-date-badge">
                              Due: {task.due_date}
                            </span>
                            <span className="task-project-badge">
                              Project: {task.projects?.name || "Unknown Project"}
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
                              className="project-status-btn"
                              onClick={() => navigate(`/tasks/${task.id}`)}
                            >
                              Open Task
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default CalendarPage;