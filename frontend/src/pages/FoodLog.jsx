import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";

function FoodLog() {
  const savedUser = localStorage.getItem("user");
  const user = savedUser ? JSON.parse(savedUser) : null;
  const latestPlan = getStoredLatestPlan(user);
  const today = getToday();
  const storageKey = user ? `cutsmart_food_log_${user.id}_${today}` : "";
  const [entries, setEntries] = useState(() => getStoredEntries(storageKey));
  const [mealName, setMealName] = useState("");
  const [calories, setCalories] = useState("");

  const totalCalories = useMemo(
    () => entries.reduce((total, entry) => total + Number(entry.calories || 0), 0),
    [entries]
  );
  const targetCalories = Number(latestPlan?.target_calories) || 0;
  const remainingCalories = targetCalories - totalCalories;

  function handleSubmit(event) {
    event.preventDefault();

    const nextEntries = [
      ...entries,
      {
        id: Date.now(),
        mealName,
        calories: Number(calories),
        createdAt: new Date().toISOString(),
      },
    ];

    setEntries(nextEntries);
    localStorage.setItem(storageKey, JSON.stringify(nextEntries));
    setMealName("");
    setCalories("");
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="tracker-page">
      <section className="tracker-shell">
        <TrackerHeader title="Food Log" user={user} />

        <div className="tracker-summary-grid">
          <TrackerMetric label="Daily target" value={`${formatNumber(targetCalories)} kcal`} />
          <TrackerMetric label="Eaten today" value={`${formatNumber(totalCalories)} kcal`} />
          <TrackerMetric
            label={remainingCalories >= 0 ? "Remaining" : "Exceeded"}
            value={`${formatNumber(Math.abs(remainingCalories))} kcal`}
          />
        </div>

        <form className="tracker-form" onSubmit={handleSubmit}>
          <label>
            Meal name
            <input
              type="text"
              value={mealName}
              onChange={(event) => setMealName(event.target.value)}
              placeholder="Chicken rice"
              required
            />
          </label>
          <label>
            Calorie intake
            <input
              type="number"
              min="1"
              value={calories}
              onChange={(event) => setCalories(event.target.value)}
              placeholder="520"
              required
            />
          </label>
          <label>
            Photo upload
            <input type="file" accept="image/*" disabled />
            <span>Photo calorie detection is coming later.</span>
          </label>
          <button type="submit">Add Meal</button>
        </form>

        <TrackerList
          emptyText="No meals logged today."
          entries={entries.map((entry) => ({
            title: entry.mealName,
            value: `${formatNumber(entry.calories)} kcal`,
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
        <p>Hi, {user.username}. Keep today simple and measurable.</p>
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

export default FoodLog;
