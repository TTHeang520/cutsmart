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
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="tracker-page">
      <section className="tracker-shell">
        <TrackerHeader title="Exercise Log" user={user} />

        <div className="tracker-summary-grid">
          <TrackerMetric label="Burn target" value={`${formatNumber(exerciseTarget)} kcal`} />
          <TrackerMetric label="Burned today" value={`${formatNumber(totalBurned)} kcal`} />
          <TrackerMetric label="Remaining" value={`${formatNumber(remainingBurn)} kcal`} />
        </div>

        <form className="tracker-form" onSubmit={handleSubmit}>
          <label>
            Exercise name
            <input
              type="text"
              value={exerciseName}
              onChange={(event) => setExerciseName(event.target.value)}
              placeholder="Brisk walking"
              required
            />
          </label>
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
            <span>minutes</span>
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
          <button type="submit">Add Exercise</button>
        </form>

        <TrackerList
          emptyText="No workouts logged today."
          entries={entries.map((entry) => ({
            title: entry.exerciseName,
            value: `${formatNumber(entry.caloriesBurned)} kcal · ${formatNumber(entry.duration)} min`,
          }))}
        />
      </section>
    </main>
  );
}

function TrackerHeader({ title, user }) {
  return (
    <header className="tracker-header">
      <div>
        <p className="daily-dashboard-eyebrow">CutSmart</p>
        <h1>{title}</h1>
        <p>Hi, {user.username}. Track the effort, not perfection.</p>
      </div>
      <Link to="/dashboard">Dashboard</Link>
    </header>
  );
}

function TrackerMetric({ label, value }) {
  return (
    <article className="tracker-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function TrackerList({ entries, emptyText }) {
  return (
    <section className="tracker-list">
      {entries.length === 0 ? (
        <p>{emptyText}</p>
      ) : (
        entries.map((entry, index) => (
          <div key={`${entry.title}-${index}`}>
            <strong>{entry.title}</strong>
            <span>{entry.value}</span>
          </div>
        ))
      )}
    </section>
  );
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
