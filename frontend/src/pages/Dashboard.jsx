import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import HeroMascot from "../components/HeroMascot";
import WeightLineChart from "../components/WeightLineChart";
import dashboardMascot from "../assets/companions/dashboard_mascot.png";
import { getJourneyTheme } from "../data/journeyThemes";

function Dashboard() {
  const navigate = useNavigate();
  const savedUser = localStorage.getItem("user");
  const user = savedUser ? JSON.parse(savedUser) : null;
  const userId = user?.id;
  const [latestPlan, setLatestPlan] = useState(() => getStoredLatestPlan(user));
  const [isCheckingPlan, setIsCheckingPlan] = useState(Boolean(userId));
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);
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

  useEffect(() => {
    if (!isProfileMenuOpen) {
      return;
    }

    function handleOutsideClick(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isProfileMenuOpen]);

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
        <div className="sidebar-motivation-card">
          <span aria-hidden="true">🔥</span>
          <strong>Keep going!</strong>
          <p>You’re building a better you.</p>
        </div>
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
            <h1>Daily Dashboard</h1>
            <p>Here’s your progress for today. Let’s make it count.</p>
          </div>
          <div className="dashboard-hero-visual">
            <HeroMascot
              src={dashboardMascot}
              size="large"
              message="You’re doing amazing! Every choice matters."
            />
            <div className="dashboard-profile-area" ref={profileMenuRef}>
              <button
                type="button"
                className="dashboard-profile-pill"
                onClick={() => setIsProfileMenuOpen((isOpen) => !isOpen)}
                aria-label="Open profile menu"
                aria-expanded={isProfileMenuOpen}
              >
                <span>{user.username?.charAt(0).toUpperCase() || "U"}</span>
                <i aria-hidden="true">⌄</i>
              </button>

              {isProfileMenuOpen && (
                <div className="dashboard-profile-menu">
                  <div className="dashboard-profile-menu-user">
                    <strong>{user.username || "CutSmart user"}</strong>
                    <span>{user.email || "No email saved"}</span>
                  </div>

                  <Link to="/profile" onClick={() => setIsProfileMenuOpen(false)}>
                    Profile
                  </Link>
                  <Link to="/plan" onClick={() => setIsProfileMenuOpen(false)}>
                    Current Journey
                  </Link>
                  <Link to="/journey-history" onClick={() => setIsProfileMenuOpen(false)}>
                    Journey History
                  </Link>
                  <Link to="/activity-history" onClick={() => setIsProfileMenuOpen(false)}>
                    Activity History
                  </Link>
                  <button type="button" className="logout-menu-item" onClick={handleLogout}>
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="premium-summary-grid">
          <DashboardMetric
            icon="🎯"
            title="Daily target calories"
            value={latestPlan ? `${formatNumber(latestPlan.target_calories)} kcal` : "Not set"}
            description="Planned intake for today"
            progress={latestPlan ? Math.min((caloriesEaten / latestPlan.target_calories) * 100, 100) : 0}
          />
          <DashboardMetric
            icon="〽"
            title="Daily deficit"
            value={latestPlan ? `${formatNumber(latestPlan.daily_deficit)} kcal` : "Not set"}
            description="Total estimated deficit"
            accent="purple"
          />
          <DashboardMetric
            icon="🥗"
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
              <Link className="quick-calendar" to="/calendar"><span className="quick-action-icon" aria-hidden="true">▣</span><span>Calendar</span></Link>
              <a className="quick-streak" href="#streak" onClick={(event) => event.preventDefault()}><span className="quick-action-icon" aria-hidden="true">🔥</span><span>Streak</span><small>0 days</small></a>
              <a className="quick-reports" href="#reports" onClick={(event) => event.preventDefault()}><span className="quick-action-icon" aria-hidden="true">▥</span><span>Reports</span></a>
              <Link className="quick-weight" to="/weight-track"><span className="quick-action-icon" aria-hidden="true">＋</span><span>Add Weight</span></Link>
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

          <article id="streak" className="dashboard-feature-card streak-card">
            <span className="streak-watermark" aria-hidden="true">🔥</span>
            <span className="daily-dashboard-eyebrow">Your streak</span>
            <h2>0 days</h2>
            <div className="streak-dot-row">
              {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
                <span key={`${day}-${index}`} className={index === 0 ? "active" : ""}>{day}</span>
              ))}
            </div>
            <p>Current streak</p>
            <strong>Stay consistent and build your streak!</strong>
            <Link to="/calendar">View Calendar <span aria-hidden="true">→</span></Link>
          </article>
        </section>

        <section className="dashboard-feature-card dashboard-tip-card">
          <span className="tip-icon" aria-hidden="true">💡</span>
          <div>
            <strong>Tip of the day</strong>
            <span>Drink more water and stay active. Small steps lead to big changes!</span>
          </div>
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
      <WeightLineChart
        entries={sortedHistory}
        compact
        sampleWhenEmpty={false}
        emptyText="Add weight entries to see your trend."
      />
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
