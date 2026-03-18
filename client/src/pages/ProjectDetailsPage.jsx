import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import AppLayout from "../components/AppLayout";
import { DndContext, closestCorners, useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const COLUMN_CONFIG = [
  { id: "To Do", title: "To Do" },
  { id: "In Progress", title: "In Progress" },
  { id: "Done", title: "Done" },
];

function SortableTaskCard({
  task,
  projectColor,
  currentUserId,
  projectOwnerId,
  getAssignedMemberLabel,
  onOpenTask,
}) {
  const canDrag = canCurrentUserMoveTask(task, currentUserId, projectOwnerId);
  const ownershipState = getTaskOwnershipState(task, currentUserId);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled: !canDrag,
    data: {
      type: "task",
      task,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : 1,
  };

  const getPriorityClass = (priority) => {
    if (priority === "High") return "priority-high";
    if (priority === "Low") return "priority-low";
    return "priority-medium";
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`project-task-card task-theme-${projectColor} project-task-${ownershipState} ${
        isDragging ? "dragging-task" : ""
      } ${!canDrag ? "project-task-locked" : ""}`}
    >
      <div className="task-color-bar"></div>

      <div className="project-task-content">
        <div className="project-task-header">
          <div
            className="project-task-main"
            onClick={() => onOpenTask(task.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                onOpenTask(task.id);
              }
            }}
          >
            <h3>{task.title}</h3>
            <p className="project-task-description muted">
              {task.description || "No description"}
            </p>
          </div>

          <button
            type="button"
            className="drag-handle-btn"
            {...(canDrag ? attributes : {})}
            {...(canDrag ? listeners : {})}
            aria-label={
              canDrag ? `Drag task ${task.title}` : `Task ${task.title} is locked`
            }
            title={canDrag ? "Drag task" : "Locked task"}
            disabled={!canDrag}
          >
            {canDrag ? "⋮⋮" : "🔒"}
          </button>
        </div>

        <div className="project-task-badges">
          <span className="task-status-badge">{task.status}</span>
          <span className={`task-priority-badge ${getPriorityClass(task.priority)}`}>
            {task.priority}
          </span>
          <span className="task-date-badge">
            Due: {task.due_date || "No due date"}
          </span>
          <span className={`task-member-badge task-member-badge-${ownershipState}`}>
            {ownershipState === "mine"
              ? "Assigned to me"
              : ownershipState === "unassigned"
              ? "Unassigned"
              : `Assigned to ${getAssignedMemberLabel(task.assigned_to)}`}
          </span>
        </div>
      </div>
    </div>
  );
}

function DroppableColumn({ title, columnId, tasks, children, onCreateTask }) {
  const { setNodeRef, isOver } = useDroppable({
    id: columnId,
  });

  return (
    <div
      ref={setNodeRef}
      className={`card board-column ${isOver ? "board-column-active" : ""}`}
    >
      <div className="board-title-row">
        <h2 className="board-title">{title}</h2>
      </div>

      {tasks.length === 0 ? <p className="muted">No tasks</p> : children}

      {columnId === "To Do" && (
        <button
          type="button"
          className="btn btn-secondary board-create-task-btn"
          onClick={onCreateTask}
        >
          Create Task
        </button>
      )}
    </div>
  );
}

function canCurrentUserMoveTask(task, currentUserId, projectOwnerId) {
  const isOwner = currentUserId === projectOwnerId;
  const isMine = task.assigned_to === currentUserId;
  const isUnassigned = !task.assigned_to;

  if (isOwner) return true;
  if (isMine) return true;
  if (isUnassigned) return true;

  return false;
}

function getTaskOwnershipState(task, currentUserId) {
  if (!task.assigned_to) return "unassigned";
  if (task.assigned_to === currentUserId) return "mine";
  return "other";
}

function ProjectDetailsPage() {
  const navigate = useNavigate();
  const { projectId } = useParams();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [message, setMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");

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

    setCurrentUserId(user.id);

    const hasAccess = await fetchProject(user.id);

    if (!hasAccess) return;

    await fetchMembers();
    await fetchTasks();
  };

  const fetchProject = async (userId) => {
    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectError || !projectData) {
      setMessage("Project not found.");
      return false;
    }

    const isOwner = projectData.owner_id === userId;

    const { data: membership } = await supabase
      .from("project_members")
      .select("id")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .maybeSingle();

    const isMember = !!membership;

    if (!isOwner && !isMember) {
      setMessage("Project not found or access denied.");
      return false;
    }

    setProject(projectData);
    return true;
  };

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from("project_members")
      .select(`
        id,
        role,
        user_id,
        profiles (
          id,
          full_name,
          email
        )
      `)
      .eq("project_id", projectId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMembers(data || []);
  };

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setTasks(data || []);
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

    await fetchTasks();
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (!over || !project) return;

    const activeTaskId = active.id;
    let destinationStatus = over.id;

    const overTask = tasks.find((task) => task.id === over.id);
    if (overTask) {
      destinationStatus = overTask.status;
    }

    const draggedTask = tasks.find((task) => task.id === activeTaskId);

    if (!draggedTask || !destinationStatus || draggedTask.status === destinationStatus) {
      return;
    }

    const canMove = canCurrentUserMoveTask(
      draggedTask,
      currentUserId,
      project.owner_id
    );

    if (!canMove) {
      setMessage("You do not have permission to move this task.");
      return;
    }

    await updateTaskStatus(activeTaskId, destinationStatus);
  };

  const handleOpenTask = (taskId) => {
    navigate(`/tasks/${taskId}`);
  };

  const handleCreateTaskPage = () => {
    navigate(`/projects/${projectId}/tasks/new`);
  };

  const getAssignedMemberLabel = (assignedToId) => {
    if (!assignedToId) return "Unassigned";

    const foundMember = members.find((member) => member.user_id === assignedToId);

    if (!foundMember) return "Unknown member";

    return (
      foundMember.profiles?.full_name ||
      foundMember.profiles?.email ||
      "Unnamed member"
    );
  };

  const getProjectColor = () => {
    return project?.color || "purple";
  };

  const taskCount = tasks.length;
  const doneCount = tasks.filter((task) => task.status === "Done").length;
  const progress = taskCount === 0 ? 0 : Math.round((doneCount / taskCount) * 100);

  return (
    <AppLayout>
      <div className="app-page">
        <div className="app-shell">
          <div className="top-bar">
            <div>
              <h1 className="page-title">Project Details</h1>
            </div>

            <div className="top-bar-actions">
              <button onClick={handleCreateTaskPage} className="btn">
                New Task
              </button>
            </div>
          </div>

          {project && (
            <div
              className={`project-details-summary-card project-theme-${project.color || "purple"}`}
            >
              <div className="project-details-summary-top">
                <div>
                  <h2 className="project-details-summary-title">{project.name}</h2>
                  <p className="project-details-summary-description">
                    {project.description || "No description"}
                  </p>
                </div>

                <button
                  type="button"
                  className="project-overview-menu"
                  onClick={(e) => e.stopPropagation()}
                >
                  ⋮
                </button>
              </div>

              <div className="project-details-summary-meta">
                <p>{members.length} members</p>
                <p>{taskCount} tasks</p>
              </div>

              <div className="project-details-progress-bar">
                <div
                  className="project-details-progress-fill"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>

              <p className="project-details-progress-text">{progress}% Completed</p>
            </div>
          )}

          <div className="project-members-dropdown card section-card">
            <details>
              <summary className="project-members-summary">
                <span>View project members</span>
                <span className="project-members-summary-icon">⌄</span>
              </summary>

              <div className="member-list project-members-dropdown-list">
                {members.length === 0 ? (
                  <p className="muted">No members linked to this project.</p>
                ) : (
                  members.map((member) => (
                    <div key={member.id} className="member-item">
                      <p>
                        <strong>Name:</strong> {member.profiles?.full_name || "No name"}
                      </p>
                      <p>
                        <strong>Email:</strong> {member.profiles?.email}
                      </p>
                      <p>
                        <strong>Role:</strong> {member.role}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </details>
          </div>

          {message && <p className="message">{message}</p>}

          <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
            <div className="board">
              {COLUMN_CONFIG.map((column) => {
                const columnTasks = tasks.filter((task) => task.status === column.id);

                return (
                  <DroppableColumn
                    key={column.id}
                    title={column.title}
                    columnId={column.id}
                    tasks={columnTasks}
                    onCreateTask={handleCreateTaskPage}
                  >
                    <SortableContext
                      items={columnTasks.map((task) => task.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {columnTasks.map((task) => (
                        <SortableTaskCard
                          key={task.id}
                          task={task}
                          projectColor={getProjectColor()}
                          currentUserId={currentUserId}
                          projectOwnerId={project?.owner_id}
                          getAssignedMemberLabel={getAssignedMemberLabel}
                          onOpenTask={handleOpenTask}
                        />
                      ))}
                    </SortableContext>
                  </DroppableColumn>
                );
              })}
            </div>
          </DndContext>
        </div>
      </div>
    </AppLayout>
  );
}

export default ProjectDetailsPage;