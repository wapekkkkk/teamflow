import AppLayout from "../components/AppLayout";

function AllTasksPage() {
  return (
    <AppLayout>
      <div className="app-page">
        <div className="app-shell">
          <div className="card placeholder-card">
            <h2>All Tasks</h2>
            <p className="muted">
              This page will show all tasks across all projects.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default AllTasksPage;