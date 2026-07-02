import { Link, Navigate } from "react-router-dom";

function Reports() {
  const savedUser = localStorage.getItem("user");
  const user = savedUser ? JSON.parse(savedUser) : null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="tracker-page">
      <section className="tracker-shell">
        <header className="tracker-header">
          <div>
            <p className="daily-dashboard-eyebrow">CutSmart</p>
            <h1>Reports</h1>
            <p>Progress reports will appear here as you log more activity.</p>
          </div>
          <Link to="/dashboard">Dashboard</Link>
        </header>

        <section className="tracker-list">
          <p>Coming soon: weekly calorie, workout, and weight insights.</p>
        </section>
      </section>
    </main>
  );
}

export default Reports;
