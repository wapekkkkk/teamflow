import AppLayout from "../components/AppLayout";

function CalendarPage() {
  return (
    <AppLayout>
      <div className="app-page">
        <div className="app-shell">
          <div className="card placeholder-card">
            <h2>Calendar</h2>
            <p className="muted">
              This page will show project and task deadlines in calendar view.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default CalendarPage;