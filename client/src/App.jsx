import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import ProjectsPage from "./pages/ProjectsPage";
import CreateProjectPage from "./pages/CreateProjectPage";
import ProjectDetailsPage from "./pages/ProjectDetailsPage";
import CreateTaskPage from "./pages/CreateTaskPage";
import AllTasksPage from "./pages/AllTasksPage";
import TaskDetailsPage from "./pages/TaskDetailsPage";
import CalendarPage from "./pages/CalendarPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import MembersPage from "./pages/MembersPage";
import EditProjectPage from "./pages/EditProjectPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/new" element={<CreateProjectPage />} />
        <Route path="/projects/:projectId/edit" element={<EditProjectPage />} />
        <Route path="/projects/:projectId" element={<ProjectDetailsPage />} />
        <Route
          path="/projects/:projectId/tasks/new"
          element={<CreateTaskPage />}
        />
        <Route path="/members" element={<MembersPage />} />
        <Route path="/tasks" element={<AllTasksPage />} />
        <Route path="/tasks/:taskId" element={<TaskDetailsPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
         
      </Routes>
    </BrowserRouter>
  );
}

export default App;