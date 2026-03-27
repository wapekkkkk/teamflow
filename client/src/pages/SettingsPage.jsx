import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import AppLayout from "../components/AppLayout";

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

function SettingsToggle({ label, description, checked, onChange }) {
  return (
    <motion.div
      className="settings-row"
      variants={fadeRight}
      whileHover={{ y: -2 }}
    >
      <div className="settings-row-copy">
        <h3>{label}</h3>
        <p className="muted">{description}</p>
      </div>

      <button
        type="button"
        className={`settings-switch ${checked ? "active" : ""}`}
        onClick={onChange}
      >
        <span className="settings-switch-thumb"></span>
      </button>
    </motion.div>
  );
}

function SettingsPage() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [taskReminders, setTaskReminders] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    return savedTheme ? savedTheme === "dark" : true;
  }); const [compactMode, setCompactMode] = useState(false);
  useEffect(() => {
    const theme = darkMode ? "dark" : "light";

    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [darkMode]);
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
              <h1 className="page-title">Settings</h1>
              <p className="page-subtitle">
                Manage your application preferences and account experience.
              </p>
            </div>
          </motion.div>

          <motion.div
            className="settings-grid"
            variants={staggerFast}
            initial="hidden"
            animate="show"
          >
            <motion.div
              className="card settings-card"
              variants={fadeUp}
              whileHover={{ y: -4, scale: 1.01 }}
            >
              <div className="section-header">
                <h2>Appearance</h2>
              </div>

              <div className="settings-stack">
                <SettingsToggle
                  label="Dark Mode"
                  description="Use the dark interface theme across the application."
                  checked={darkMode}
                  onChange={() => setDarkMode((prev) => !prev)}
                />

                <SettingsToggle
                  label="Compact Mode"
                  description="Reduce spacing to show more content on screen."
                  checked={compactMode}
                  onChange={() => setCompactMode((prev) => !prev)}
                />
              </div>
            </motion.div>

            <motion.div
              className="card settings-card"
              variants={fadeUp}
              whileHover={{ y: -4, scale: 1.01 }}
            >
              <div className="section-header">
                <h2>Notifications</h2>
              </div>

              <div className="settings-stack">
                <SettingsToggle
                  label="Email Notifications"
                  description="Receive updates when projects or tasks change."
                  checked={emailNotifications}
                  onChange={() => setEmailNotifications((prev) => !prev)}
                />

                <SettingsToggle
                  label="Task Reminders"
                  description="Get reminders for tasks that are due soon."
                  checked={taskReminders}
                  onChange={() => setTaskReminders((prev) => !prev)}
                />
              </div>
            </motion.div>

            <motion.div
              className="card settings-card settings-card-wide"
              variants={fadeUp}
              whileHover={{ y: -4, scale: 1.01 }}
            >
              <div className="section-header">
                <h2>Account Preferences</h2>
              </div>

              <div className="settings-form-grid">
                <div className="field">
                  <label className="label">Display Name</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Enter your display name"
                  />
                </div>

                <div className="field">
                  <label className="label">Email</label>
                  <input
                    type="email"
                    className="input"
                    placeholder="Enter your email"
                  />
                </div>

                <div className="field settings-field-full">
                  <label className="label">Workspace Preference</label>
                  <select className="input">
                    <option>Default Workspace</option>
                    <option>My Personal Workspace</option>
                    <option>Team Workspace</option>
                  </select>
                </div>
              </div>

              <div className="settings-actions">
                <button type="button" className="button secondary-button">
                  Reset
                </button>
                <button type="button" className="button primary-button">
                  Save Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}

export default SettingsPage;