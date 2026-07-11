import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";

function ExerciseLog() {
  const savedUser = localStorage.getItem("user");
  const user = savedUser ? JSON.parse(savedUser) : null;
  const latestPlan = getStoredLatestPlan(user);
  const today = getToday();
  const storageKey = user ? `cutsmart_exercise_log_${user.id}_${today}` : "";
  const [entries, setEntries] = useState(() => getStoredEntries(storageKey));
  const [exerciseName, setExerciseName] = useState("");
  const [duration, setDuration] = useState("");
  const [caloriesBurned, setCaloriesBurned] = useState("");
  const [category, setCategory] = useState("cardio");

  const totalBurned = useMemo(
    () => entries.reduce((total, entry) => total + Number(entry.caloriesBurned || 0), 0),
    [entries]
  );
  const exerciseTarget = Number(latestPlan?.exercise_deficit) || 0;
  const remainingBurn = Math.max(exerciseTarget - totalBurned, 0);

  function handleSubmit(event) {
    event.preventDefault();

    const nextEntries = [
      ...entries,
      {
        id: Date.now(),
        exerciseName,
        category,
        duration: Number(duration),
        caloriesBurned: Number(caloriesBurned),
        createdAt: new Date().toISOString(),
      },
    ];

    setEntries(nextEntries);
    localStorage.setItem(storageKey, JSON.stringify(nextEntries));
    setExerciseName("");
    setDuration("");
    setCaloriesBurned("");
    setCategory("cardio");
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="tracker-page exercise-log-page">
      <section className="tracker-shell app-log-shell">
        <TrackerHeader
          title="Exercise Log"
          subtitle="Track your workouts and stay active."
        />

        <div className="tracker-summary-grid app-log-metrics exercise-metrics">
          <TrackerMetric
            icon="⚡"
            label="Burn target"
            value={`${formatNumber(exerciseTarget)} kcal`}
            detail="Daily goal"
            progress={exerciseTarget ? Math.min((totalBurned / exerciseTarget) * 100, 100) : 0}
            tone="purple"
          />
          <TrackerMetric
            icon="🔥"
            label="Burned today"
            value={`${formatNumber(totalBurned)} kcal`}
            detail="Total burned"
            tone="green"
          />
          <TrackerMetric
            icon="◔"
            label="Remaining"
            value={`${formatNumber(remainingBurn)} kcal`}
            detail="Left to burn"
            tone="yellow"
          />
          <TrackerMetric
            icon="👟"
            label="Active minutes"
            value={`${formatNumber(getTotalDuration(entries))} min`}
            detail="Today"
            tone="blue"
          />
        </div>

        <section className="app-log-grid">
          <form className="tracker-form app-log-form" onSubmit={handleSubmit}>
            <div className="app-log-card-heading">
              <span className="app-log-icon tone-purple" aria-hidden="true">🏋</span>
              <div>
                <h2>Add Exercise</h2>
                <p>What did you do today?</p>
              </div>
            </div>

            <label>
              Exercise name
              <input
                type="text"
                value={exerciseName}
                onChange={(event) => setExerciseName(event.target.value)}
                placeholder="e.g. Running, Push ups, Cycling"
                required
              />
            </label>
            <label>
              Category
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                {Object.keys(exerciseCategories).map((categoryKey) => (
                  <option key={categoryKey} value={categoryKey}>
                    {exerciseCategories[categoryKey].label}
                  </option>
                ))}
              </select>
            </label>
            <div className="app-form-row">
              <label>
                Duration
                <input
                  type="number"
                  min="1"
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                  placeholder="30"
                  required
                />
              </label>
              <label>
                Calories burned
                <input
                  type="number"
                  min="1"
                  value={caloriesBurned}
                  onChange={(event) => setCaloriesBurned(event.target.value)}
                  placeholder="180"
                  required
                />
              </label>
            </div>
            <button type="submit">Add Exercise</button>
          </form>

          <TrackerList
            title="Today's exercises"
            total={`${formatNumber(totalBurned)} kcal`}
            emptyText="No workouts logged today."
            entries={entries.map((entry) => {
              const entryCategory = getExerciseCategory(entry);

              return {
                title: entry.exerciseName,
                value: `${formatNumber(entry.caloriesBurned)} kcal`,
                meta: `${formatNumber(entry.duration)} min`,
                category: entryCategory,
                icon: exerciseCategories[entryCategory].icon,
                tone: exerciseCategories[entryCategory].tone,
                label: exerciseCategories[entryCategory].label,
              };
            })}
          />
        </section>

        <WeeklyOverview entries={entries} exerciseTarget={exerciseTarget} />
      </section>
    </main>
  );
}

const exerciseCategories = {
  cardio: { label: "Cardio", icon: "🚶", tone: "purple" },
  strength: { label: "Strength", icon: "🏋", tone: "yellow" },
  cycling: { label: "Cycling", icon: "🚴", tone: "green" },
  flexibility: { label: "Flexibility", icon: "🧘", tone: "purple" },
  sports: { label: "Sports", icon: "🏀", tone: "blue" },
  recovery: { label: "Recovery", icon: "🫧", tone: "green" },
  other: { label: "Other", icon: "✦", tone: "blue" },
};

function TrackerHeader({ title, subtitle }) {
  return (
    <header className="tracker-header app-log-header">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <Link to="/dashboard"><span aria-hidden="true">▦</span>Dashboard</Link>
    </header>
  );
}

function TrackerMetric({ icon, label, value, detail, progress, tone = "green" }) {
  return (
    <article className={`tracker-metric app-log-metric tone-${tone}`}>
      <i aria-hidden="true">{icon}</i>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
      {progress !== undefined && (
        <div className="app-log-progress">
          <b style={{ width: `${progress}%` }} />
          <em>{formatNumber(progress)}%</em>
        </div>
      )}
    </article>
  );
}

function TrackerList({ title, total, entries, emptyText }) {
  return (
    <section className="tracker-list app-log-list">
      <div className="app-log-list-header">
        <h2>{title}</h2>
        <span>Total: {total}</span>
      </div>
      {entries.length === 0 ? (
        <p className="app-log-empty">{emptyText}</p>
      ) : (
        entries.map((entry, index) => (
          <article className="app-log-entry" key={`${entry.title}-${index}`}>
            <span className={`app-log-entry-icon tone-${entry.tone}`} aria-hidden="true">{entry.icon}</span>
            <div>
              <strong>{entry.title}</strong>
              <small>{entry.meta} · {entry.label}</small>
            </div>
            <span>{entry.value}</span>
          </article>
        ))
      )}
    </section>
  );
}

function WeeklyOverview({ entries, exerciseTarget }) {
  const totalBurned = entries.reduce((total, entry) => total + Number(entry.caloriesBurned || 0), 0);
  const totalDuration = getTotalDuration(entries);
  const progress = exerciseTarget ? Math.min((totalBurned / exerciseTarget) * 100, 100) : 0;

  return (
    <section className="app-log-weekly-card">
      <h2>This week overview</h2>
      <div className="app-log-weekdays">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <span key={day} className={day === new Date().toLocaleDateString(undefined, { weekday: "short" }) ? "active" : ""}>
            {day}
          </span>
        ))}
      </div>
      <div className="app-log-weekly-stats">
        <TrackerMetric icon="🔥" label="Calories burned" value={`${formatNumber(totalBurned)} kcal`} detail="Today" tone="purple" />
        <TrackerMetric icon="◷" label="Active minutes" value={`${formatNumber(totalDuration)} min`} detail="Today" tone="blue" />
        <TrackerMetric icon="◎" label="Goal progress" value={`${formatNumber(progress)}%`} detail="Daily target" tone="green" />
      </div>
    </section>
  );
}

function getExerciseCategory(entry) {
  if (entry.category && exerciseCategories[entry.category]) {
    return entry.category;
  }

  const name = entry.exerciseName.toLowerCase();

  if (name.includes("cycle") || name.includes("bike")) return "cycling";
  if (name.includes("stretch") || name.includes("yoga")) return "flexibility";
  if (name.includes("push") || name.includes("lift") || name.includes("strength")) return "strength";
  if (name.includes("ball") || name.includes("tennis") || name.includes("sport")) return "sports";
  if (name.includes("walk") || name.includes("run") || name.includes("jog")) return "cardio";
  if (name.includes("rest") || name.includes("recover")) return "recovery";

  return "other";
}

function getTotalDuration(entries) {
  return entries.reduce((total, entry) => total + Number(entry.duration || 0), 0);
}

function getStoredEntries(storageKey) {
  if (!storageKey) {
    return [];
  }

  const savedEntries = localStorage.getItem(storageKey);

  if (!savedEntries) {
    return [];
  }

  try {
    return JSON.parse(savedEntries);
  } catch {
    return [];
  }
}

function getStoredLatestPlan(user) {
  const savedPlan = localStorage.getItem(
    user?.id ? `cutsmart_latest_plan_${user.id}` : "cutsmart_latest_plan_guest"
  );

  if (!savedPlan) {
    return null;
  }

  try {
    return JSON.parse(savedPlan);
  } catch {
    return null;
  }
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 1,
  });
}

export default ExerciseLog;
