import { apiFetch, API_BASE_URL } from "../utils/api";
import { getCurrentTime, getToday, getWeekDates } from "../utils/dateUtils";
import { fetchDailyActivity } from "../utils/activityUtils";
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  Activity,
  Bike,
  Clock,
  Dumbbell,
  Flame,
  Footprints,
  Hourglass,
  LayoutDashboard,
  Leaf,
  StretchHorizontal,
  Trophy,
  Volleyball,
  Zap,
} from "lucide-react";



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
  const [editingEntry, setEditingEntry] = useState(null);
  const [weekActivity, setWeekActivity] = useState([]);
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

  useEffect(() => {
    if (!user?.id || !loggedDate) {
      return;
    }

    let isCurrent = true;
    const weekDates = getWeekDates(loggedDate);

    fetchDailyActivity(user.id, weekDates[0], weekDates[6])
      .then((days) => {
        if (isCurrent) {
          setWeekActivity(days);
        }
      })
      .catch(() => {
        if (isCurrent) {
          setWeekActivity([]);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [user?.id, loggedDate, entries]);

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

    const exerciseData = {
      exercise_name: exerciseName,
      duration_minutes: Number(duration),
      calories_burned: Number(caloriesBurned),
      logged_date: loggedDate,
      logged_time: loggedTime,
      category,
      notes: notes.trim() || null,
    };

    try {
      if (editingEntry) {
        await updateExerciseEntry(editingEntry.id, user.id, exerciseData);
      } else {
        await createExerciseEntry(user.id, exerciseData);
      }

      const nextEntries = await fetchExercisesByDate(user.id, loggedDate);
      setEntries(nextEntries);
      resetForm();
    } catch (requestError) {
      setError(requestError.message || "Could not save your exercise.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleEdit(entry) {
    setError("");
    setEditingEntry(entry);
    setExerciseName(entry.exercise_name || "");
    setDuration(String(entry.duration_minutes ?? ""));
    setCaloriesBurned(String(entry.calories_burned ?? ""));
    setCategory(getExerciseCategory(entry));
    setLoggedDate(entry.logged_date);
    setLoggedTime(entry.logged_time || getCurrentTime());
    setNotes(stripCategoryFromNotes(entry.notes));
  }

  async function handleDelete(entryId) {
    if (!window.confirm("Delete this exercise?")) {
      return;
    }

    setError("");

    try {
      await deleteExerciseEntry(entryId, user.id);

      if (editingEntry?.id === entryId) {
        resetForm();
      }

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
    setEditingEntry(null);
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
            icon={<Zap size={26} />}
            label="Burn target"
            value={`${formatNumber(exerciseTarget)} kcal`}
            detail="Daily goal"
            progress={exerciseTarget ? Math.min((totalBurned / exerciseTarget) * 100, 100) : 0}
            tone="purple"
          />
          <TrackerMetric
            icon={<Flame size={26} />}
            label="Burned"
            value={`${formatNumber(totalBurned)} kcal`}
            detail={loggedDate}
            tone="green"
          />
          <TrackerMetric
            icon={<Hourglass size={26} />}
            label="Remaining"
            value={`${formatNumber(remainingBurn)} kcal`}
            detail="Left to burn"
            tone="yellow"
          />
          <TrackerMetric
            icon={<Clock size={26} />}
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
              <span className="app-log-icon tone-purple" aria-hidden="true"><Dumbbell size={26} /></span>
              <div>
                <h2>{editingEntry ? "Edit Exercise" : "Add Exercise"}</h2>
                <p>{editingEntry ? `Editing ${editingEntry.exercise_name}` : "What did you do today?"}</p>
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
            <div className="app-log-form-actions">
              <button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : editingEntry ? "Save Changes" : "Add Exercise"}
              </button>
              {editingEntry && (
                <button type="button" className="app-log-cancel" onClick={resetForm} disabled={isSaving}>
                  Cancel
                </button>
              )}
            </div>
          </form>

          <TrackerList
            title="Exercises"
            total={`${formatNumber(totalBurned)} kcal`}
            emptyText="No workouts logged for this date."
            entries={entries}
            editingId={editingEntry?.id}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </section>

        <WeeklyOverview
          weekDates={getWeekDates(loggedDate)}
          activity={weekActivity}
          today={today}
          exerciseTarget={exerciseTarget}
        />
      </section>
    </main>
  );
}

const exerciseCategories = {
  cardio: { label: "Cardio", icon: <Footprints size={24} />, tone: "purple" },
  strength: { label: "Strength", icon: <Dumbbell size={24} />, tone: "yellow" },
  cycling: { label: "Cycling", icon: <Bike size={24} />, tone: "green" },
  flexibility: { label: "Flexibility", icon: <StretchHorizontal size={24} />, tone: "purple" },
  sports: { label: "Sports", icon: <Volleyball size={24} />, tone: "blue" },
  recovery: { label: "Recovery", icon: <Leaf size={24} />, tone: "green" },
  other: { label: "Other", icon: <Activity size={24} />, tone: "blue" },
};

function TrackerHeader({ title, subtitle }) {
  return (
    <header className="tracker-header app-log-header">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <Link to="/dashboard"><LayoutDashboard size={18} aria-hidden="true" />Dashboard</Link>
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

function TrackerList({ title, total, entries, emptyText, editingId, onEdit, onDelete }) {
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
            <article className={`app-log-entry${entry.id === editingId ? " is-editing" : ""}`} key={entry.id}>
              <span className={`app-log-entry-icon tone-${exerciseCategories[entryCategory].tone}`} aria-hidden="true">
                {exerciseCategories[entryCategory].icon}
              </span>
              <div>
                <strong>{entry.exercise_name}</strong>
                <small>{formatNumber(entry.duration_minutes)} min · {entry.logged_time} · {exerciseCategories[entryCategory].label}</small>
                {stripCategoryFromNotes(entry.notes) && <small>{stripCategoryFromNotes(entry.notes)}</small>}
              </div>
              <span>{formatNumber(entry.calories_burned)} kcal</span>
              <div className="app-log-entry-actions">
                <button type="button" onClick={() => onEdit(entry)} aria-label={`Edit ${entry.exercise_name}`}>
                  Edit
                </button>
                <button type="button" onClick={() => onDelete(entry.id)} aria-label={`Delete ${entry.exercise_name}`}>
                  Delete
                </button>
              </div>
            </article>
          );
        })
      )}
    </section>
  );
}

function WeeklyOverview({ weekDates, activity, today, exerciseTarget }) {
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const byDate = new Map(activity.map((day) => [day.date, day]));
  const weekDays = weekDates.map((date) => byDate.get(date)).filter(Boolean);
  const totalBurned = weekDays.reduce((total, day) => total + Number(day.calories_burned || 0), 0);
  const totalMinutes = weekDays.reduce((total, day) => total + Number(day.active_minutes || 0), 0);
  const weeklyTarget = exerciseTarget * 7;
  const progress = weeklyTarget ? Math.min((totalBurned / weeklyTarget) * 100, 100) : 0;

  return (
    <section className="app-log-weekly-card">
      <h2>This week overview</h2>
      <div className="app-log-weekdays">
        {weekDates.map((date, index) => {
          const workedOut = Number(byDate.get(date)?.exercise_entries || 0) > 0;
          const classes = [workedOut ? "has-workout" : "", date === today ? "active" : ""].join(" ").trim();

          return (
            <span key={date} className={classes} title={workedOut ? `${date}: workout logged` : date}>
              {labels[index]}
            </span>
          );
        })}
      </div>
      <div className="app-log-weekly-stats">
        <TrackerMetric icon={<Flame size={26} />} label="Calories burned" value={`${formatNumber(totalBurned)} kcal`} detail="This week" tone="purple" />
        <TrackerMetric icon={<Clock size={26} />} label="Active minutes" value={`${formatNumber(totalMinutes)} min`} detail="This week" tone="blue" />
        <TrackerMetric icon={<Trophy size={26} />} label="Goal progress" value={`${formatNumber(progress)}%`} detail="Weekly burn target" tone="green" />
      </div>
    </section>
  );
}

function stripCategoryFromNotes(notes) {
  // Notes are null when none were entered; default parameters only cover undefined.
  return (notes || "").replace(/^\[category:[^\]]+\]\s*/, "");
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
  const response = await apiFetch(`${API_BASE_URL}/api/exercises/${userId}?date=${loggedDate}`);
  const data = await response.json().catch(() => ({
    success: false,
    message: `Exercise API returned status ${response.status}.`,
  }));

  if (!response.ok || data.success === false) {
    throw new Error(data.message || "Could not load exercise logs.");
  }

  return Array.isArray(data.exercises) ? data.exercises : [];
}

async function updateExerciseEntry(exerciseId, userId, exerciseData) {
  const response = await apiFetch(`${API_BASE_URL}/api/exercises/${exerciseId}`, {
    method: "PUT",
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
    message: `Update exercise API returned status ${response.status}.`,
  }));

  if (!response.ok || data.success === false) {
    throw new Error(data.message || "Could not update your exercise.");
  }

  return data.exercise;
}

async function createExerciseEntry(userId, exerciseData) {
  const response = await apiFetch(`${API_BASE_URL}/api/exercises`, {
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
  const response = await apiFetch(`${API_BASE_URL}/api/exercises/${exerciseId}`, {
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

function formatNumber(value) {
  return Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 1,
  });
}

export default ExerciseLog;