import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";

const API_BASE_URL = "http://127.0.0.1:5000";

function ExerciseLog() {
  const savedUser = localStorage.getItem("user");
  const user = savedUser ? JSON.parse(savedUser) : null;
  const latestPlan = getStoredLatestPlan(user);
  const today = getToday();
  const [entries, setEntries] = useState([]);
  const [exerciseName, setExerciseName] = useState("");
  const [duration, setDuration] = useState("");
  const [caloriesBurned, setCaloriesBurned] = useState("");
  const [category, setCategory] = useState("cardio");
  const [loggedDate, setLoggedDate] = useState(today);
  const [loggedTime, setLoggedTime] = useState(getCurrentTime());
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(Boolean(user?.id));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    let isCurrent = true;

    async function loadExercises() {
      setIsLoading(true);
      setError("");

      try {
        const nextEntries = await fetchExercisesByDate(user.id, loggedDate);

        if (isCurrent) {
          setEntries(nextEntries);
        }
      } catch (requestError) {
        if (isCurrent) {
          setEntries([]);
          setError(requestError.message || "Could not load exercise logs.");
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    loadExercises();

    return () => {
      isCurrent = false;
    };
  }, [user?.id, loggedDate]);

  const totalBurned = useMemo(
    () => entries.reduce((total, entry) => total + Number(entry.calories_burned || 0), 0),
    [entries]
  );
  const exerciseTarget = Number(latestPlan?.exercise_deficit) || 0;
  const remainingBurn = Math.max(exerciseTarget - totalBurned, 0);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSaving(true);
    setError("");

    try {
      await createExerciseEntry(user.id, {
        exercise_name: exerciseName,
        duration_minutes: Number(duration),
        calories_burned: Number(caloriesBurned),
        logged_date: loggedDate,
        logged_time: loggedTime,
        category,
        notes: notes.trim() || null,
      });

      const nextEntries = await fetchExercisesByDate(user.id, loggedDate);
      setEntries(nextEntries);
      resetForm();
    } catch (requestError) {
      setError(requestError.message || "Could not save your exercise.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(entryId) {
    setError("");

    try {
      await deleteExerciseEntry(entryId, user.id);
      const nextEntries = await fetchExercisesByDate(user.id, loggedDate);
      setEntries(nextEntries);
    } catch (requestError) {
      setError(requestError.message || "Could not delete this exercise.");
    }
  }

  function resetForm() {
    setExerciseName("");
    setDuration("");
    setCaloriesBurned("");
    setCategory("cardio");
    setLoggedTime(getCurrentTime());
    setNotes("");
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
            icon="Energy"
            label="Burn target"
            value={`${formatNumber(exerciseTarget)} kcal`}
            detail="Daily goal"
            progress={exerciseTarget ? Math.min((totalBurned / exerciseTarget) * 100, 100) : 0}
            tone="purple"
          />
          <TrackerMetric
            icon="Burn"
            label="Burned"
            value={`${formatNumber(totalBurned)} kcal`}
            detail={loggedDate}
            tone="green"
          />
          <TrackerMetric
            icon="Left"
            label="Remaining"
            value={`${formatNumber(remainingBurn)} kcal`}
            detail="Left to burn"
            tone="yellow"
          />
          <TrackerMetric
            icon="Time"
            label="Active minutes"
            value={`${formatNumber(getTotalDuration(entries))} min`}
            detail="Selected date"
            tone="blue"
          />
        </div>

        {error && <p className="app-log-empty" role="alert">{error}</p>}
        {isLoading && <p className="app-log-empty">Loading exercise logs...</p>}

        <section className="app-log-grid">
          <form className="tracker-form app-log-form" onSubmit={handleSubmit}>
            <div className="app-log-card-heading">
              <span className="app-log-icon tone-purple" aria-hidden="true">Move</span>
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
            <div className="app-form-row">
              <label>
                Date
                <input
                  type="date"
                  value={loggedDate}
                  onChange={(event) => setLoggedDate(event.target.value)}
                  required
                />
              </label>
              <label>
                Time
                <input
                  type="time"
                  value={loggedTime}
                  onChange={(event) => setLoggedTime(event.target.value)}
                  required
                />
              </label>
            </div>
            <label>
              Notes
              <input
                type="text"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional note"
              />
            </label>
            <button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Add Exercise"}</button>
          </form>

          <TrackerList
            title="Exercises"
            total={`${formatNumber(totalBurned)} kcal`}
            emptyText="No workouts logged for this date."
            entries={entries}
            onDelete={handleDelete}
          />
        </section>

        <WeeklyOverview entries={entries} exerciseTarget={exerciseTarget} />
      </section>
    </main>
  );
}

const exerciseCategories = {
  cardio: { label: "Cardio", icon: "Cardio", tone: "purple" },
  strength: { label: "Strength", icon: "Lift", tone: "yellow" },
  cycling: { label: "Cycling", icon: "Bike", tone: "green" },
  flexibility: { label: "Flexibility", icon: "Yoga", tone: "purple" },
  sports: { label: "Sports", icon: "Sport", tone: "blue" },
  recovery: { label: "Recovery", icon: "Rest", tone: "green" },
  other: { label: "Other", icon: "Other", tone: "blue" },
};

function TrackerHeader({ title, subtitle }) {
  return (
    <header className="tracker-header app-log-header">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <Link to="/dashboard"><span aria-hidden="true">Dash</span>Dashboard</Link>
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

function TrackerList({ title, total, entries, emptyText, onDelete }) {
  return (
    <section className="tracker-list app-log-list">
      <div className="app-log-list-header">
        <h2>{title}</h2>
        <span>Total: {total}</span>
      </div>
      {entries.length === 0 ? (
        <p className="app-log-empty">{emptyText}</p>
      ) : (
        entries.map((entry) => {
          const entryCategory = getExerciseCategory(entry);

          return (
            <article className="app-log-entry" key={entry.id}>
              <span className={`app-log-entry-icon tone-${exerciseCategories[entryCategory].tone}`} aria-hidden="true">
                {exerciseCategories[entryCategory].icon}
              </span>
              <div>
                <strong>{entry.exercise_name}</strong>
                <small>{formatNumber(entry.duration_minutes)} min · {entry.logged_time} · {exerciseCategories[entryCategory].label}</small>
                {stripCategoryFromNotes(entry.notes) && <small>{stripCategoryFromNotes(entry.notes)}</small>}
              </div>
              <span>{formatNumber(entry.calories_burned)} kcal</span>
              <button type="button" onClick={() => onDelete(entry.id)} aria-label={`Delete ${entry.exercise_name}`}>
                Delete
              </button>
            </article>
          );
        })
      )}
    </section>
  );
}

function WeeklyOverview({ entries, exerciseTarget }) {
  const totalBurned = entries.reduce((total, entry) => total + Number(entry.calories_burned || 0), 0);
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
        <TrackerMetric icon="Burn" label="Calories burned" value={`${formatNumber(totalBurned)} kcal`} detail="Selected date" tone="purple" />
        <TrackerMetric icon="Time" label="Active minutes" value={`${formatNumber(totalDuration)} min`} detail="Selected date" tone="blue" />
        <TrackerMetric icon="Goal" label="Goal progress" value={`${formatNumber(progress)}%`} detail="Daily target" tone="green" />
      </div>
    </section>
  );
}


function stripCategoryFromNotes(notes = "") {
  return notes.replace(/^\[category:[^\]]+\]\s*/, "");
}

function getExerciseCategory(entry) {
  if (entry.category && exerciseCategories[entry.category]) {
    return entry.category;
  }
  const categoryMatch = entry.notes?.match(/^\[category:([^\]]+)\]/);

  if (categoryMatch?.[1] && exerciseCategories[categoryMatch[1]]) {
    return categoryMatch[1];
  }

  const name = entry.exercise_name?.toLowerCase() || "";

  if (name.includes("cycle") || name.includes("bike")) return "cycling";
  if (name.includes("stretch") || name.includes("yoga")) return "flexibility";
  if (name.includes("push") || name.includes("lift") || name.includes("strength")) return "strength";
  if (name.includes("ball") || name.includes("tennis") || name.includes("sport")) return "sports";
  if (name.includes("walk") || name.includes("run") || name.includes("jog")) return "cardio";
  if (name.includes("rest") || name.includes("recover")) return "recovery";

  return "other";
}

function getTotalDuration(entries) {
  return entries.reduce((total, entry) => total + Number(entry.duration_minutes || 0), 0);
}

async function fetchExercisesByDate(userId, loggedDate) {
  const response = await fetch(`${API_BASE_URL}/api/exercises/${userId}?date=${loggedDate}`);
  const data = await response.json().catch(() => ({
    success: false,
    message: `Exercise API returned status ${response.status}.`,
  }));

  if (!response.ok || data.success === false) {
    throw new Error(data.message || "Could not load exercise logs.");
  }

  return Array.isArray(data.exercises) ? data.exercises : [];
}

async function createExerciseEntry(userId, exerciseData) {
  const response = await fetch(`${API_BASE_URL}/api/exercises`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: userId,
      ...exerciseData,
    }),
  });
  const data = await response.json().catch(() => ({
    success: false,
    message: `Create exercise API returned status ${response.status}.`,
  }));

  if (!response.ok || data.success === false) {
    throw new Error(data.message || "Could not save your exercise.");
  }

  return data.exercise;
}

async function deleteExerciseEntry(exerciseId, userId) {
  const response = await fetch(`${API_BASE_URL}/api/exercises/${exerciseId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ user_id: userId }),
  });
  const data = await response.json().catch(() => ({
    success: false,
    message: `Delete exercise API returned status ${response.status}.`,
  }));

  if (!response.ok || data.success === false) {
    throw new Error(data.message || "Could not delete this exercise.");
  }

  return data;
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

function getCurrentTime() {
  return new Date().toTimeString().slice(0, 5);
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 1,
  });
}

export default ExerciseLog;