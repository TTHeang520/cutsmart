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
    <main className="tracker-page food-log-page">
      <section className="tracker-shell app-log-shell">
        <TrackerHeader
          title="Food Log"
          subtitle="Log your meals and stay within your calorie target."
        />

        <div className="tracker-summary-grid app-log-metrics">
          <TrackerMetric
            icon="◎"
            label="Daily target"
            value={`${formatNumber(targetCalories)} kcal`}
            detail="Today's goal"
            progress={targetCalories ? Math.min((totalCalories / targetCalories) * 100, 100) : 0}
            tone="purple"
          />
          <TrackerMetric
            icon="🔥"
            label="Eaten today"
            value={`${formatNumber(totalCalories)} kcal`}
            detail="Total intake"
            tone="green"
          />
          <TrackerMetric
            icon="◔"
            label={remainingCalories >= 0 ? "Remaining" : "Exceeded"}
            value={`${formatNumber(Math.abs(remainingCalories))} kcal`}
            detail={remainingCalories >= 0 ? "Left for today" : "Over target"}
            tone="yellow"
          />
        </div>

        <section className="app-log-grid">
          <form className="tracker-form app-log-form" onSubmit={handleSubmit}>
            <div className="app-log-card-heading">
              <span className="app-log-icon tone-green" aria-hidden="true">🍴</span>
              <div>
                <h2>Add Meal</h2>
                <p>What did you eat?</p>
              </div>
            </div>

            <label>
              Meal name
              <input
                type="text"
                value={mealName}
                onChange={(event) => setMealName(event.target.value)}
                placeholder="e.g. Chicken rice, Salad, Protein shake"
                required
              />
            </label>
            <label>
              Calories (kcal)
              <input
                type="number"
                min="1"
                value={calories}
                onChange={(event) => setCalories(event.target.value)}
                placeholder="e.g. 520"
                required
              />
            </label>
            <label className="app-upload-placeholder">
              Photo upload
              <input type="file" accept="image/*" disabled />
              <span>Upload a photo of your meal. Photo calorie detection is coming later.</span>
            </label>
            <button type="submit">Add Meal</button>
          </form>

          <TrackerList
            title="Today's meals"
            total={`${formatNumber(totalCalories)} kcal`}
            emptyText="No meals logged today."
            entries={entries.map((entry) => ({
              title: entry.mealName,
              value: `${formatNumber(entry.calories)} kcal`,
              meta: formatTime(entry.createdAt),
              icon: getMealIcon(entry.mealName),
            }))}
          />
        </section>
      </section>
    </main>
  );
}

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
            <span className="app-log-entry-icon" aria-hidden="true">{entry.icon}</span>
            <div>
              <strong>{entry.title}</strong>
              <small>{entry.meta}</small>
            </div>
            <span>{entry.value}</span>
          </article>
        ))
      )}
    </section>
  );
}

function getMealIcon(mealName) {
  const name = mealName.toLowerCase();

  if (name.includes("coffee") || name.includes("tea") || name.includes("drink")) {
    return "☕";
  }

  if (name.includes("fruit") || name.includes("banana") || name.includes("yogurt")) {
    return "🍌";
  }

  return "🍽";
}

function formatTime(dateString) {
  if (!dateString) {
    return "Logged today";
  }

  return new Date(dateString).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
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
