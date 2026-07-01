import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import CompanionMascot from "../components/CompanionMascot";
import { getJourneyTheme } from "../data/journeyThemes";

function Dashboard() {
  const navigate = useNavigate();
  const savedUser = localStorage.getItem("user");
  const user = savedUser ? JSON.parse(savedUser) : null;
  const userId = user?.id;
  const [latestPlan, setLatestPlan] = useState(() => getStoredLatestPlan(user));
  const [isCheckingPlan, setIsCheckingPlan] = useState(Boolean(userId));
  const weightHistory = getStoredWeightEntries(user);
  const today = getToday();
  const foodEntries = getStoredEntries(user ? `cutsmart_food_log_${user.id}_${today}` : "");
  const exerciseEntries = getStoredEntries(user ? `cutsmart_exercise_log_${user.id}_${today}` : "");
  const caloriesEaten = foodEntries.reduce((total, entry) => total + Number(entry.calories || 0), 0);
  const caloriesBurned = exerciseEntries.reduce((total, entry) => total + Number(entry.caloriesBurned || 0), 0);
  const strategy = latestPlan?.strategy || "balanced";
  const theme = getJourneyTheme(strategy);

  useEffect(() => {
    if (!userId) {
      return;
    }

    let isCurrent = true;

    async function fetchLatestPlan() {
      try {
        const response = await fetch(`/api/plans/latest/${userId}`);
        const data = await response.json();

        if (!isCurrent || !response.ok || data.success === false || !data.plan) {
          return;
        }

        localStorage.setItem(getLatestPlanKey({ id: userId }), JSON.stringify(data.plan));
        setLatestPlan(data.plan);
      } catch {
        // Keep the localStorage fallback if the saved-plan endpoint is unavailable.
      } finally {
        if (isCurrent) {
          setIsCheckingPlan(false);
        }
      }
    }

    fetchLatestPlan();

    return () => {
      isCurrent = false;
    };
  }, [userId]);

  function handleLogout() {
    localStorage.removeItem("user");
    navigate("/login");
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!latestPlan && !isCheckingPlan) {
    return (
      <main className="dashboard-page daily-dashboard-page">
        <section className="dashboard-panel daily-dashboard-shell dashboard-empty-state">
          <header className="daily-dashboard-topbar">
            <div>
              <p className="daily-dashboard-greeting">Hi, {user.username}</p>
              <h1>No plan yet</h1>
              <p>Create your first plan to unlock your dashboard.</p>
            </div>
            <div className="daily-dashboard-icons" aria-label="Dashboard actions">
              <button type="button" aria-label="Profile">
                <span aria-hidden="true">{user.username?.charAt(0).toUpperCase() || "U"}</span>
              </button>
            </div>
          </header>

          <div className="empty-plan-card">
            <div className="empty-plan-orb" aria-hidden="true">CS</div>
            <span className="daily-dashboard-eyebrow">Start here</span>
            <h2>Create your first plan to unlock your dashboard.</h2>
            <p>
              CutSmart will calculate your daily calorie target, split your diet
              and exercise deficit, and prepare your tracking workspace.
            </p>
            <Link to="/plan">Create My Plan</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard-page daily-dashboard-page premium-dashboard-page">
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <span>⌁</span>
          <strong>CutSmart</strong>
        </div>
        <nav>
          <Link className="active" to="/dashboard"><span aria-hidden="true">⌂</span>Dashboard</Link>
          <Link to="/plan"><span aria-hidden="true">□</span>My Plan</Link>
          <Link to="/food-log"><span aria-hidden="true">◌</span>Food Log</Link>
          <Link to="/exercise-log"><span aria-hidden="true">✦</span>Exercise Log</Link>
          <Link to="/weight-track"><span aria-hidden="true">▱</span>Weight Track</Link>
          <Link to="/calendar"><span aria-hidden="true">▦</span>Calendar</Link>
          <a href="#reports" onClick={(event) => event.preventDefault()}><span aria-hidden="true">▥</span>Reports</a>
          <a href="#settings" onClick={(event) => event.preventDefault()}><span aria-hidden="true">⚙</span>Settings</a>
        </nav>
        <button type="button" onClick={handleLogout}>Logout</button>
      </aside>

      <section
        className={`dashboard-panel daily-dashboard-shell daily-theme-${strategy}`}
        style={{
          "--daily-main": theme.colors.primary,
          "--daily-soft": theme.colors.soft,
          "--daily-panel": theme.colors.panel,
        }}
      >
        <header className="premium-dashboard-header">
          <div>
            <p className="daily-dashboard-greeting">Good morning, {user.username}</p>
            <h1>Daily dashboard</h1>
            <p>Here’s your progress for today. Let’s make it count.</p>
          </div>
          <div className="dashboard-profile-pill">
            <CompanionMascot size="small" />
            <span>{user.username?.charAt(0).toUpperCase() || "U"}</span>
          </div>
        </header>

        <section className="dashboard-companion-feature">
          <CompanionMascot size="medium" />
          <div>
            <span className="daily-dashboard-eyebrow">Cloud Buddy</span>
            <h2>Stage 2</h2>
            <p>You’re doing amazing. Every healthy choice helps us grow.</p>
          </div>
        </section>

        <div className="premium-summary-grid">
          <DashboardMetric
            icon="◎"
            title="Daily target calories"
            value={latestPlan ? `${formatNumber(latestPlan.target_calories)} kcal` : "Not set"}
            description="Planned intake for today"
            progress={latestPlan ? Math.min((caloriesEaten / latestPlan.target_calories) * 100, 100) : 0}
          />
          <DashboardMetric
            icon="↘"
            title="Daily deficit"
            value={latestPlan ? `${formatNumber(latestPlan.daily_deficit)} kcal` : "Not set"}
            description="Total estimated deficit"
            accent="purple"
          />
          <DashboardMetric
            icon="◉"
            title="Diet deficit"
            value={latestPlan ? `${formatNumber(latestPlan.diet_deficit)} kcal` : "Not set"}
            description="From food choices"
            accent="green"
          />
          <DashboardMetric
            icon="⚡"
            title="Exercise deficit"
            value={latestPlan ? `${formatNumber(latestPlan.exercise_deficit)} kcal` : "Not set"}
            description="From movement"
            accent="orange"
          />
        </div>

        <section className="dashboard-main-grid">
          <article className="dashboard-feature-card nutrition-dashboard-card">
            <h2>Nutrition split</h2>
            <div className="nutrition-ring-grid">
              <MacroRing label="Protein" value={latestPlan?.protein_g} color="#7cff6b" />
              <MacroRing label="Carbs" value={latestPlan?.carbs_g} color="#4f8cff" />
              <MacroRing label="Fat" value={latestPlan?.fat_g} color="#ffd84d" />
            </div>
            <div className="macro-bar">
              <span style={{ "--macro-color": "#7cff6b", flex: latestPlan?.protein_g || 1 }} />
              <span style={{ "--macro-color": "#4f8cff", flex: latestPlan?.carbs_g || 1 }} />
              <span style={{ "--macro-color": "#ffd84d", flex: latestPlan?.fat_g || 1 }} />
            </div>
          </article>

          <article className="dashboard-feature-card log-widget-card">
            <div>
              <span className="daily-dashboard-eyebrow">Food log</span>
              <h2>{formatNumber(caloriesEaten)} kcal</h2>
              <p>{latestPlan ? `${formatNumber(Math.max(latestPlan.target_calories - caloriesEaten, 0))} kcal remaining` : "Create a plan to set target"}</p>
            </div>
            <CircularProgress value={latestPlan ? (caloriesEaten / latestPlan.target_calories) * 100 : 0} />
            <Link to="/food-log">Open Food Log</Link>
          </article>

          <article className="dashboard-feature-card log-widget-card">
            <div>
              <span className="daily-dashboard-eyebrow">Exercise log</span>
              <h2>{formatNumber(caloriesBurned)} kcal</h2>
              <p>{latestPlan ? `${formatNumber(Math.max(latestPlan.exercise_deficit - caloriesBurned, 0))} kcal remaining` : "Create a plan to set target"}</p>
            </div>
            <CircularProgress value={latestPlan ? (caloriesBurned / latestPlan.exercise_deficit) * 100 : 0} color="#b56cff" />
            <Link to="/exercise-log">Open Exercise Log</Link>
          </article>

          <article className="dashboard-feature-card dashboard-weight-card">
            <span className="daily-dashboard-eyebrow">Weight</span>
            <h2>{getLatestWeight(weightHistory) ? `${formatNumber(getLatestWeight(weightHistory).weight_kg)} kg` : "--"}</h2>
            <WeightPreview history={weightHistory} plan={latestPlan} />
            <Link to="/weight-track">Open Weight Track</Link>
          </article>

          <article className="dashboard-feature-card quick-actions-card">
            <h2>Quick actions</h2>
            <div className="quick-action-grid">
              <Link to="/calendar"><span className="quick-action-icon" aria-hidden="true">▦</span><span>Calendar</span></Link>
              <a href="#reports" onClick={(event) => event.preventDefault()}><span className="quick-action-icon" aria-hidden="true">▥</span><span>Reports</span></a>
              <Link to="/weight-track"><span className="quick-action-icon" aria-hidden="true">＋</span><span>Add Weight</span></Link>
              <a href="#settings" onClick={(event) => event.preventDefault()}><span className="quick-action-icon" aria-hidden="true">⚙</span><span>Settings</span></a>
            </div>
          </article>
        </section>

        <section className="dashboard-lower-grid">
          <article className="dashboard-feature-card weekly-overview-card">
            <h2>This week overview</h2>
            <div className="week-pill-row">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => (
                <span key={day} className={index < 3 ? "done" : index === 3 ? "today" : ""}>
                  {day}
                </span>
              ))}
            </div>
            <div className="weekly-stats">
              <MacroPill label="Calories avg" value={`${formatNumber(caloriesEaten)} kcal`} />
              <MacroPill label="Deficit avg" value={latestPlan ? `${formatNumber(latestPlan.daily_deficit)} kcal` : "--"} />
              <MacroPill label="Goal progress" value="65%" />
            </div>
          </article>

          <article className="dashboard-feature-card streak-card">
            <span className="daily-dashboard-eyebrow">Your streak</span>
            <h2>0 days</h2>
            <p>Stay consistent and build your streak.</p>
            <div className="streak-dot-row">
              {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
                <span key={`${day}-${index}`} className={index === 0 ? "active" : ""}>{day}</span>
              ))}
            </div>
          </article>
        </section>

        <section className="dashboard-feature-card dashboard-tip-card">
          <strong>Tip of the day</strong>
          <span>Drink more water and stay active. Small steps lead to big changes.</span>
        </section>

        <section className="dashboard-feature-card bottom-plan-summary">
          <div>
            <span className="daily-dashboard-eyebrow">Plan summary</span>
            <h2>{formatLabel(strategy)} strategy</h2>
            <p>
              {latestPlan
                ? `${formatNumber(latestPlan.target_calories)} kcal · ${formatNumber(latestPlan.recommended_timeline_weeks)} week timeline`
                : "Create a plan to unlock your summary."}
            </p>
          </div>
          <div className="plan-summary-button-row">
            <Link to="/plan">View Plan Details</Link>
            <Link to="/plan">Create New Plan</Link>
          </div>
        </section>

        <nav className="daily-dashboard-bottom-nav" aria-label="Dashboard navigation placeholder">
          <Link className="active" to="/dashboard">Today</Link>
          <Link to="/plan">Plan</Link>
          <Link to="/food-log">Food</Link>
          <Link to="/exercise-log">Workout</Link>
          <Link to="/weight-track">Weight</Link>
        </nav>
      </section>
    </main>
  );
}

function DashboardMetric({ icon, title, value, description, progress, accent = "green" }) {
  return (
    <article className={`dashboard-metric-card accent-${accent}`}>
      <span className="metric-icon">{icon}</span>
      <p>{title}</p>
      <strong>{value}</strong>
      <span>{description}</span>
      {progress !== undefined && (
        <div className="metric-progress">
          <i style={{ width: `${Math.min(progress, 100)}%` }} />
          <small>{formatNumber(progress)}%</small>
        </div>
      )}
    </article>
  );
}

function MacroRing({ label, value, color }) {
  return (
    <div className="macro-ring" style={{ "--ring-color": color }}>
      <CircularProgress value={value ? 72 : 0} color={color} label={`${formatNumber(value)} g`} />
      <span>{label}</span>
    </div>
  );
}

function CircularProgress({ value = 0, color = "#7cff6b", label }) {
  const safeValue = Math.max(0, Math.min(Number(value) || 0, 100));
  return (
    <div
      className="circular-progress"
      style={{
        "--progress": `${safeValue * 3.6}deg`,
        "--progress-color": color,
      }}
    >
      <strong>{label || `${formatNumber(safeValue)}%`}</strong>
    </div>
  );
}

function MacroPill({ label, value }) {
  return (
    <div className="macro-pill">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function WeightPreview({ history, plan }) {
  const sortedHistory = [...history].sort((a, b) => a.logged_date.localeCompare(b.logged_date));
  const latest = sortedHistory[sortedHistory.length - 1];
  const starting = sortedHistory[0];

  return (
    <div className="weight-preview">
      <MiniLineChart entries={sortedHistory} />
      <div className="weight-preview-stats">
        <MacroPill label="Latest" value={latest ? `${formatNumber(latest.weight_kg)} kg` : "--"} />
        <MacroPill label="Start" value={starting ? `${formatNumber(starting.weight_kg)} kg` : "--"} />
        <MacroPill label="Target" value={plan ? `${formatNumber(plan.target_weight_kg)} kg` : "--"} />
      </div>
    </div>
  );
}

function getLatestWeight(history) {
  if (history.length === 0) {
    return null;
  }

  return [...history].sort((a, b) => a.logged_date.localeCompare(b.logged_date)).at(-1);
}

function MiniLineChart({ entries }) {
  if (entries.length < 2) {
    return (
      <div className="mini-line-empty">
        Add at least two weight entries to see your trend.
      </div>
    );
  }

  const values = entries.map((entry) => Number(entry.weight_kg));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const y = 80 - ((value - min) / range) * 60;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg className="mini-line-chart" viewBox="0 0 100 90" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={points} />
    </svg>
  );
}

function getStoredLatestPlan(user) {
  const savedPlan = localStorage.getItem(getLatestPlanKey(user));

  if (!savedPlan) {
    return null;
  }

  try {
    return JSON.parse(savedPlan);
  } catch {
    return null;
  }
}

function getLatestPlanKey(user) {
  return user?.id ? `cutsmart_latest_plan_${user.id}` : "cutsmart_latest_plan_guest";
}

function getStoredWeightEntries(user) {
  if (!user?.id) {
    return [];
  }

  const rawEntries = localStorage.getItem(`cutsmart_weight_entries_${user.id}`);

  if (!rawEntries) {
    return [];
  }

  try {
    return JSON.parse(rawEntries);
  } catch {
    return [];
  }
}

function getStoredEntries(storageKey) {
  if (!storageKey) {
    return [];
  }

  const rawEntries = localStorage.getItem(storageKey);

  if (!rawEntries) {
    return [];
  }

  try {
    return JSON.parse(rawEntries);
  } catch {
    return [];
  }
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function formatLabel(value) {
  if (!value) {
    return "-";
  }

  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatNumber(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: 1,
  });
}

export default Dashboard;
