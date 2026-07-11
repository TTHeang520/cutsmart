import { Link, Navigate } from "react-router-dom";

function SimplePlaceholder({ title, subtitle }) {
  const savedUser = localStorage.getItem("user");
  const user = savedUser ? JSON.parse(savedUser) : null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="tracker-page placeholder-page">
      <section className="tracker-shell placeholder-shell">
        <span className="daily-dashboard-eyebrow">CutSmart</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
        <Link to="/dashboard">Back to Dashboard</Link>
      </section>
    </main>
  );
}

export default SimplePlaceholder;
