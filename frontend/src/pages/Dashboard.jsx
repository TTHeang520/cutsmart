import { Link, Navigate, useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();
  const savedUser = localStorage.getItem("user");
  const user = savedUser ? JSON.parse(savedUser) : null;

  function handleLogout() {
    localStorage.removeItem("user");
    navigate("/login");
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="dashboard-page">
      <section className="dashboard-panel">
        <p className="brand-name">CutSmart</p>
        <h1>Welcome, {user.username}</h1>
        <p className="page-copy">You are logged in to your dashboard.</p>

        <div className="dashboard-actions">
          <Link to="/plan">Create Plan</Link>
          <button type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </section>
    </main>
  );
}

export default Dashboard;
