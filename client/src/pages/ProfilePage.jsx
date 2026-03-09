import AppLayout from "../components/AppLayout";

function ProfilePage() {
  return (
    <AppLayout>
      <div className="app-page">
        <div className="app-shell">
          <div className="card placeholder-card">
            <h2>Profile</h2>
            <p className="muted">
              This page will show the user profile information later.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default ProfilePage;