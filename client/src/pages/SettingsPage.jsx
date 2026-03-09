import AppLayout from "../components/AppLayout";

function SettingsPage() {
  return (
    <AppLayout>
      <div className="app-page">
        <div className="app-shell">
          <div className="card placeholder-card">
            <h2>Settings</h2>
            <p className="muted">
              This page will contain application settings later.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default SettingsPage;