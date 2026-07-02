import { Link, Navigate } from "react-router-dom";

function Settings() {
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
            <h1>Settings</h1>
            <p>Manage app preferences and account options.</p>
          </div>
          <Link to="/dashboard">Dashboard</Link>
        </header>

        <section className="tracker-list">
          <p>Coming soon: profile, notification, and privacy settings.</p>
        </section>
      </section>
    </main>
  );
}

export default Settings;
