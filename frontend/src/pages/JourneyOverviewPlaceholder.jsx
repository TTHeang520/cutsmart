import { Link, Navigate, useParams } from "react-router-dom";

function JourneyOverviewPlaceholder() {
  const savedUser = localStorage.getItem("user");
  const user = savedUser ? JSON.parse(savedUser) : null;
  const { journeyId } = useParams();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="tracker-page placeholder-page">
      <section className="tracker-shell placeholder-shell">
        <span className="daily-dashboard-eyebrow">Journey</span>
        <h1>Journey Overview Coming Soon</h1>
        <p>Journey ID: {journeyId}</p>
        <Link to="/journey-history">Back to Journey History</Link>
      </section>
    </main>
  );
}

export default JourneyOverviewPlaceholder;
