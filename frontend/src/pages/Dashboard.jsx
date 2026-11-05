import { apiFetch, API_BASE_URL } from "../utils/api";
import { addDays, getToday, getWeekDates } from "../utils/dateUtils";
import { calculateStreak, fetchDailyActivity, formatDayCount } from "../utils/activityUtils";
import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import HeroMascot from "../components/HeroMascot";
import WeightLineChart from "../components/WeightLineChart";
import dashboardMascot from "../assets/companions/dashboard_mascot.png";
import { getJourneyTheme } from "../data/journeyThemes";
import { getWeightStats } from "../utils/weightUtils";

function Dashboard() {
  const navigate = useNavigate();
  const savedUser = localStorage.getItem("user");
  const user = savedUser ? JSON.parse(savedUser) : null;
  const userId = user?.id;
  const [latestPlan, setLatestPlan] = useState(() => getStoredLatestPlan(user));
  const [isCheckingPlan, setIsCheckingPlan] = useState(Boolean(userId));
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isPlanDetailsOpen, setIsPlanDetailsOpen] = useState(false);
  const [isStartJourneyConfirmOpen, setIsStartJourneyConfirmOpen] = useState(false);
  const [weightHistory, setWeightHistory] = useState([]);
  const [caloriesEaten, setCaloriesEaten] = useState(0);
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  const [activityDays, setActivityDays] = useState([]);
  const profileMenuRef = useRef(null);
  const today = getToday();
  const strategy = latestPlan?.strategy || "balanced";
  const theme = getJourneyTheme(strategy);
  const weightStats = getWeightStats({ weights: weightHistory, plan: latestPlan });
  const streak = calculateStreak(activityDays, today);
  const week = getWeekSummary(activityDays, today, latestPlan);

  useEffect(() => {
    if (!userId) {
      return;
    }

    let isCurrent = true;

    async function fetchDashboardData() {
      try {
        const [planData, weightData, foodData, exerciseData, activity] = await Promise.all([
          fetchLatestPlan(userId),
          fetchOptionalJson(`${API_BASE_URL}/api/weights/history/${userId}`),
          fetchOptionalJson(`${API_BASE_URL}/api/foods/${userId}?date=${today}`),
          fetchOptionalJson(`${API_BASE_URL}/api/exercises/${userId}?date=${today}`),
          // A year of history is enough to count any realistic streak.
          fetchDailyActivity(userId, addDays(today, -365), today).catch(() => []),
        ]);

        if (!isCurrent) {
          return;
        }

        if (planData?.plan) {
          localStorage.setItem(getLatestPlanKey({ id: userId }), JSON.stringify(planData.plan));
          setLatestPlan(planData.plan);
        } else if (planData?.missing) {
          // The server has no plan, so a cached one is stale.
          localStorage.removeItem(getLatestPlanKey({ id: userId }));
          setLatestPlan(null);
        }

        setWeightHistory(Array.isArray(weightData?.history) ? weightData.history : []);
        setCaloriesEaten(Number(foodData?.summary?.total_calories || 0));
        setCaloriesBurned(Number(exerciseData?.summary?.total_calories_burned || 0));
        setActivityDays(activity);
      } catch {
        // Keep the cached plan only. Active journey logs should not fall back to old localStorage data.
        if (isCurrent) {
          setWeightHistory([]);
          setCaloriesEaten(0);
          setCaloriesBurned(0);
        }
      } finally {
        if (isCurrent) {
          setIsCheckingPlan(false);
        }
      }
    }

    fetchDashboardData();

    return () => {
      isCurrent = false;
    };
  }, [userId, today]);

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

  async function handleLogout() {
    try {
      const response = await apiFetch("/api/logout", { method: "POST" });
      if (!response.ok) throw new Error("Logout failed");
    } catch {
      window.alert("Could not log out. Please check your connection and retry.");
      return;
    }
    localStorage.removeItem("user");
    navigate("/login");
  }

  function handleModifyPlan() {
    navigate("/plan", { state: { planIntent: "modify" } });
  }

  function handleStartNewJourney() {
    setIsStartJourneyConfirmOpen(false);
    navigate("/plan", { state: { planIntent: "new" } });
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
            <h2>{weightStats.latestWeight ? `${formatNumber(weightStats.latestWeight)} kg` : "--"}</h2>
            <WeightPreview history={weightHistory} plan={latestPlan} />
            <Link to="/weight-track">Open Weight Track</Link>
          </article>

          <article className="dashboard-feature-card quick-actions-card">
            <h2>Quick actions</h2>
            <div className="quick-action-grid">
              <Link className="quick-calendar" to="/calendar"><span className="quick-action-icon" aria-hidden="true">▣</span><span>Calendar</span></Link>
              <a className="quick-streak" href="#streak" onClick={(event) => event.preventDefault()}><span className="quick-action-icon" aria-hidden="true">🔥</span><span>Streak</span><small>{formatDayCount(streak)}</small></a>
              <a className="quick-reports" href="#reports" onClick={(event) => event.preventDefault()}><span className="quick-action-icon" aria-hidden="true">▥</span><span>Reports</span></a>
              <Link className="quick-weight" to="/weight-track"><span className="quick-action-icon" aria-hidden="true">＋</span><span>Add Weight</span></Link>
            </div>
          </article>
        </section>

        <section className="dashboard-lower-grid">
          <article className="dashboard-feature-card weekly-overview-card">
            <h2>This week overview</h2>
            <div className="week-pill-row">
              {week.days.map((day) => (
                <span
                  key={day.date}
                  className={[day.isActive ? "done" : "", day.date === today ? "today" : ""].join(" ").trim()}
                  title={day.isActive ? `${day.date}: logged` : day.date}
                >
                  {day.label}
                </span>
              ))}
            </div>
            <div className="weekly-stats">
              <MacroPill
                label="Calories avg"
                value={week.averageEaten === null ? "--" : `${formatNumber(week.averageEaten)} kcal`}
              />
              <MacroPill
                label="Deficit avg"
                value={week.averageDeficit === null ? "--" : `${formatNumber(week.averageDeficit)} kcal`}
              />
              <MacroPill
                label="Goal progress"
                value={`${formatNumber(weightStats.progressPercent || 0)}%`}
              />
            </div>
            <p className="weekly-note">Averages use days with food logged this week. Deficit is estimated from your plan's maintenance calories.</p>
          </article>

          <article id="streak" className="dashboard-feature-card streak-card">
            <span className="streak-watermark" aria-hidden="true">🔥</span>
            <span className="daily-dashboard-eyebrow">Your streak</span>
            <h2>{formatDayCount(streak)}</h2>
            <div className="streak-dot-row">
              {week.days.map((day) => (
                <span key={day.date} className={day.isActive ? "active" : ""}>{day.label.charAt(0)}</span>
              ))}
            </div>
            <p>Current streak</p>
            <strong>{getStreakMessage(streak, activityDays, today)}</strong>
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
            <button type="button" onClick={() => setIsPlanDetailsOpen(true)}>View Plan</button>
            <button type="button" onClick={() => setIsStartJourneyConfirmOpen(true)}>Start New Journey</button>
          </div>
        </section>

        {isPlanDetailsOpen && (
          <PlanDetailsModal
            plan={latestPlan}
            onClose={() => setIsPlanDetailsOpen(false)}
            onModify={handleModifyPlan}
          />
        )}

        {isStartJourneyConfirmOpen && (
          <ConfirmStartJourneyModal
            onCancel={() => setIsStartJourneyConfirmOpen(false)}
            onConfirm={handleStartNewJourney}
          />
        )}

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

function PlanDetailsModal({ plan, onClose, onModify }) {
  return (
    <div className="dashboard-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="dashboard-plan-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-plan-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="dashboard-modal-header">
          <div>
            <span className="daily-dashboard-eyebrow">Current plan</span>
            <h2 id="dashboard-plan-modal-title">View Plan</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close plan details">×</button>
        </div>

        {plan ? (
          <>
            <div className="dashboard-plan-detail-grid">
              <PlanDetail label="Strategy" value={formatLabel(plan.strategy)} />
              <PlanDetail label="Maintenance calories" value={formatKcal(plan.maintenance_calories)} />
              <PlanDetail label="Target calories" value={formatKcal(plan.target_calories)} />
              <PlanDetail label="Daily deficit" value={formatKcal(plan.daily_deficit)} />
              <PlanDetail label="Diet deficit" value={formatKcal(plan.diet_deficit)} />
              <PlanDetail label="Exercise deficit" value={formatKcal(plan.exercise_deficit)} />
              <PlanDetail label="Current BMI" value={formatBmi(plan.current_bmi, plan.current_bmi_category)} />
              <PlanDetail label="Target BMI" value={formatBmi(plan.target_bmi, plan.target_bmi_category)} />
              <PlanDetail label="Protein" value={formatGram(plan.protein_g)} />
              <PlanDetail label="Carbs" value={formatGram(plan.carbs_g)} />
              <PlanDetail label="Fat" value={formatGram(plan.fat_g)} />
              <PlanDetail label="Recommended timeline" value={formatWeeks(plan.recommended_timeline_weeks)} />
              <PlanDetail label="Timeline status" value={formatLabel(plan.timeline_status)} />
            </div>

            {plan.warning && (
              <div className="dashboard-plan-note">
                <strong>Warning</strong>
                <p>{plan.warning}</p>
              </div>
            )}

            {plan.alternative_plan && (
              <div className="dashboard-plan-note">
                <strong>Alternative plan</strong>
                <p>{formatAlternativePlan(plan.alternative_plan)}</p>
              </div>
            )}
          </>
        ) : (
          <div className="dashboard-plan-note">
            <strong>No plan found</strong>
            <p>Create a plan to see details here.</p>
          </div>
        )}

        <div className="dashboard-modal-actions">
          <button type="button" onClick={onClose}>Close</button>
          <button type="button" onClick={onModify}>Modify Plan</button>
        </div>
      </section>
    </div>
  );
}

function ConfirmStartJourneyModal({ onCancel, onConfirm }) {
  return (
    <div className="dashboard-modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <section
        className="dashboard-plan-modal dashboard-confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="start-journey-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="dashboard-modal-header">
          <div>
            <span className="daily-dashboard-eyebrow">New journey</span>
            <h2 id="start-journey-title">Start New Journey?</h2>
          </div>
          <button type="button" onClick={onCancel} aria-label="Close confirmation">×</button>
        </div>

        <p className="dashboard-confirm-copy">
          This will reset dashboard progress, streak, and calendar tracking for the new journey.
          Your previous journeys will remain available in Journey History.
        </p>

        <div className="dashboard-modal-actions">
          <button type="button" onClick={onCancel}>Cancel</button>
          <button type="button" onClick={onConfirm}>Start Journey</button>
        </div>
      </section>
    </div>
  );
}

function PlanDetail({ label, value }) {
  return (
    <div className="dashboard-plan-detail">
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
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
  const stats = getWeightStats({ weights: history, plan });

  return (
    <div className="weight-preview">
      <WeightLineChart
        entries={stats.chartData}
        compact
        sampleWhenEmpty={false}
        emptyText="Add weight entries to see your trend."
      />
      <div className="weight-preview-stats">
        <MacroPill label="Latest" value={stats.latestWeight ? `${formatNumber(stats.latestWeight)} kg` : "--"} />
        <MacroPill label="Start" value={stats.startWeight ? `${formatNumber(stats.startWeight)} kg` : "--"} />
        <MacroPill label="Target" value={stats.targetWeight ? `${formatNumber(stats.targetWeight)} kg` : "--"} />
      </div>
    </div>
  );
}

function getWeekSummary(activityDays, today, plan) {
  const byDate = new Map(activityDays.map((day) => [day.date, day]));
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const days = getWeekDates(today).map((date, index) => ({
    date,
    label: labels[index],
    isActive: byDate.has(date),
  }));
  const foodDays = days
    .map((day) => byDate.get(day.date))
    .filter((day) => day && day.food_entries > 0 && day.date <= today);
  const maintenance = Number(plan?.maintenance_calories);

  if (foodDays.length === 0) {
    return { days, averageEaten: null, averageDeficit: null };
  }

  const average = (values) => values.reduce((total, value) => total + value, 0) / values.length;

  return {
    days,
    averageEaten: average(foodDays.map((day) => day.calories_eaten)),
    averageDeficit: maintenance
      ? average(foodDays.map((day) => maintenance + day.calories_burned - day.calories_eaten))
      : null,
  };
}

function getStreakMessage(streak, activityDays, today) {
  const loggedToday = activityDays.some((day) => day.date === today);

  if (streak === 0) {
    return "Log a meal, workout or weight today to start a streak.";
  }

  return loggedToday ? "Nice! Today is logged. Keep it going tomorrow." : "Log something today to keep your streak alive.";
}

// Returns { plan }, { missing: true } when the server has none, or null when unreachable.
async function fetchLatestPlan(userId) {
  try {
    const response = await apiFetch(`${API_BASE_URL}/api/plans/latest/${userId}`);

    if (response.status === 404) {
      return { missing: true };
    }

    const data = await response.json();
    return response.ok && data.plan ? { plan: data.plan } : null;
  } catch {
    return null;
  }
}

async function fetchOptionalJson(url) {
  try {
    const response = await apiFetch(url);
    const data = await response.json();

    if (!response.ok || data.success === false) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
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

function formatKcal(value) {
  return value === null || value === undefined || value === "" ? "—" : `${formatNumber(value)} kcal`;
}

function formatGram(value) {
  return value === null || value === undefined || value === "" ? "—" : `${formatNumber(value)} g`;
}

function formatWeeks(value) {
  return value === null || value === undefined || value === "" ? "—" : `${formatNumber(value)} weeks`;
}

function formatBmi(value, category) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return category ? `${formatNumber(value)} (${category})` : formatNumber(value);
}

function formatAlternativePlan(alternativePlan) {
  if (!alternativePlan || typeof alternativePlan !== "object") {
    return "—";
  }

  const dailyDeficit = formatKcal(alternativePlan.daily_deficit);
  const timeline = formatWeeks(alternativePlan.recommended_timeline_weeks);

  return `${dailyDeficit} daily deficit · ${timeline}`;
}

export default Dashboard;
