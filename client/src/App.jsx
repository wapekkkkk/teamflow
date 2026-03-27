import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

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

function PageWrapper({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      style={{ width: "100%" }}
    >
      {children}
    </motion.div>
  );
}

function AnimatedAppRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<PageWrapper><LoginPage /></PageWrapper>} />
        <Route path="/register" element={<PageWrapper><RegisterPage /></PageWrapper>} />
        <Route path="/dashboard" element={<PageWrapper><DashboardPage /></PageWrapper>} />
        <Route path="/projects" element={<PageWrapper><ProjectsPage /></PageWrapper>} />
        <Route path="/projects/new" element={<PageWrapper><CreateProjectPage /></PageWrapper>} />
        <Route path="/projects/:projectId/edit" element={<PageWrapper><EditProjectPage /></PageWrapper>} />
        <Route path="/projects/:projectId" element={<PageWrapper><ProjectDetailsPage /></PageWrapper>} />
        <Route path="/projects/:projectId/tasks/new" element={<PageWrapper><CreateTaskPage /></PageWrapper>} />
        <Route path="/members" element={<PageWrapper><MembersPage /></PageWrapper>} />
        <Route path="/tasks" element={<PageWrapper><AllTasksPage /></PageWrapper>} />
        <Route path="/tasks/:taskId" element={<PageWrapper><TaskDetailsPage /></PageWrapper>} />
        <Route path="/calendar" element={<PageWrapper><CalendarPage /></PageWrapper>} />
        <Route path="/settings" element={<PageWrapper><SettingsPage /></PageWrapper>} />
        <Route path="/profile" element={<PageWrapper><ProfilePage /></PageWrapper>} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AnimatedAppRoutes />
    </BrowserRouter>
  );
}

export default App;