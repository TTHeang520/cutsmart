import { useLatestPlan } from "../utils/latestPlan";
import { Link, Navigate } from "react-router-dom";
import CompanionMascot from "../components/CompanionMascot";

function Welcome() {
  const savedUser = localStorage.getItem("user");
  const user = savedUser ? JSON.parse(savedUser) : null;
  const userId = user?.id;
  const { plan: latestPlan } = useLatestPlan(userId);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="welcome-page">
      <section className="welcome-card">
        <CompanionMascot size="medium" caption="Your CutSmart companion" />

        <div className="welcome-copy">
          <p className="daily-dashboard-eyebrow">CutSmart</p>
          <h1>Welcome to CutSmart</h1>
          <p>We’ll build your personal calorie and habit plan.</p>
        </div>

        <div className="welcome-step-list">
          <WelcomeStep number="01" text="Calculate your daily calorie target" />
          <WelcomeStep number="02" text="Split diet and exercise deficit" />
          <WelcomeStep number="03" text="Help you log food, workouts, and weight" />
          <WelcomeStep number="04" text="Track progress over time" />
        </div>

        <div className="welcome-actions">
          <Link to="/plan">Create My Plan</Link>
          {latestPlan && <Link to="/dashboard">Go to Dashboard</Link>}
        </div>
      </section>
    </main>
  );
}

function WelcomeStep({ number, text }) {
  return (
    <div className="welcome-step">
      <span>{number}</span>
      <strong>{text}</strong>
    </div>
  );
}

export default Welcome;
