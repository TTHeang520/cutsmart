import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";

const API_BASE_URL = "http://127.0.0.1:5000";

function FoodLog() {
  const savedUser = localStorage.getItem("user");
  const user = savedUser ? JSON.parse(savedUser) : null;
  const latestPlan = getStoredLatestPlan(user);
  const today = getToday();
  const [entries, setEntries] = useState([]);
  const [mealName, setMealName] = useState("");
  const [calories, setCalories] = useState("");
  const [mealType, setMealType] = useState("lunch");
  const [loggedDate, setLoggedDate] = useState(today);
  const [loggedTime, setLoggedTime] = useState(getCurrentTime());
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(user?.id));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    let isCurrent = true;

    async function loadFoods() {
      setIsLoading(true);
      setError("");

      try {
        const nextEntries = await fetchFoodsByDate(user.id, loggedDate);

        if (isCurrent) {
          setEntries(nextEntries);
        }
      } catch (requestError) {
        if (isCurrent) {
          setEntries([]);
          setError(requestError.message || "Could not load food logs.");
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    loadFoods();

    return () => {
      isCurrent = false;
    };
  }, [user?.id, loggedDate]);

  const totalCalories = useMemo(
    () => entries.reduce((total, entry) => total + Number(entry.calories || 0), 0),
    [entries]
  );
  const targetCalories = Number(latestPlan?.target_calories) || 0;
  const remainingCalories = targetCalories - totalCalories;

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSaving(true);
    setError("");

    try {
      const savedFood = await createFoodEntry(user.id, {
        food_name: mealName,
        calories: Number(calories),
        meal_type: mealType,
        logged_date: loggedDate,
        logged_time: loggedTime,
        protein_g: protein,
        carbs_g: carbs,
        fat_g: fat,
        notes,
      });

      if (photo) {
        await uploadFoodPhoto(savedFood.id, user.id, photo);
      }

      const nextEntries = await fetchFoodsByDate(user.id, loggedDate);
      setEntries(nextEntries);
      resetForm();
    } catch (requestError) {
      setError(requestError.message || "Could not save your meal.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(entryId) {
    setError("");

    try {
      await deleteFoodEntry(entryId, user.id);
      const nextEntries = await fetchFoodsByDate(user.id, loggedDate);
      setEntries(nextEntries);
    } catch (requestError) {
      setError(requestError.message || "Could not delete this meal.");
    }
  }

  function resetForm() {
    setMealName("");
    setCalories("");
    setMealType("lunch");
    setLoggedTime(getCurrentTime());
    setProtein("");
    setCarbs("");
    setFat("");
    setNotes("");
    setPhoto(null);
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
            icon="Target"
            label="Daily target"
            value={`${formatNumber(targetCalories)} kcal`}
            detail="Selected date goal"
            progress={targetCalories ? Math.min((totalCalories / targetCalories) * 100, 100) : 0}
            tone="purple"
          />
          <TrackerMetric
            icon="Fire"
            label="Eaten"
            value={`${formatNumber(totalCalories)} kcal`}
            detail={loggedDate}
            tone="green"
          />
          <TrackerMetric
            icon="Left"
            label={remainingCalories >= 0 ? "Remaining" : "Exceeded"}
            value={`${formatNumber(Math.abs(remainingCalories))} kcal`}
            detail={remainingCalories >= 0 ? "Left for this date" : "Over target"}
            tone="yellow"
          />
        </div>

        {error && <p className="app-log-empty" role="alert">{error}</p>}
        {isLoading && <p className="app-log-empty">Loading food logs...</p>}

        <section className="app-log-grid">
          <form className="tracker-form app-log-form" onSubmit={handleSubmit}>
            <div className="app-log-card-heading">
              <span className="app-log-icon tone-green" aria-hidden="true">Food</span>
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
            <div className="app-form-row">
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
              <label>
                Meal type
                <select value={mealType} onChange={(event) => setMealType(event.target.value)}>
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snack</option>
                </select>
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
            <div className="app-form-row">
              <label>
                Protein (g)
                <input type="number" min="0" value={protein} onChange={(event) => setProtein(event.target.value)} placeholder="Optional" />
              </label>
              <label>
                Carbs (g)
                <input type="number" min="0" value={carbs} onChange={(event) => setCarbs(event.target.value)} placeholder="Optional" />
              </label>
              <label>
                Fat (g)
                <input type="number" min="0" value={fat} onChange={(event) => setFat(event.target.value)} placeholder="Optional" />
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
            <label className="app-upload-placeholder">
              Food photo
              <input type="file" accept="image/*" onChange={(event) => setPhoto(event.target.files?.[0] || null)} />
              <span>{photo ? photo.name : "Optional photo for this meal."}</span>
            </label>
            <button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Add Meal"}</button>
          </form>

          <TrackerList
            title="Meals"
            total={`${formatNumber(totalCalories)} kcal`}
            emptyText="No meals logged for this date."
            entries={entries}
            onDelete={handleDelete}
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
        entries.map((entry) => (
          <article className="app-log-entry" key={entry.id}>
            {entry.photo_path ? (
              <img className="app-log-entry-photo" src={getPhotoUrl(entry.photo_path)} alt={entry.food_name} />
            ) : (
              <span className="app-log-entry-icon" aria-hidden="true">{getMealIcon(entry.food_name)}</span>
            )}
            <div>
              <strong>{entry.food_name}</strong>
              <small>{formatMealMeta(entry)}</small>
              {entry.notes && <small>{entry.notes}</small>}
            </div>
            <span>{formatNumber(entry.calories)} kcal</span>
            <button type="button" onClick={() => onDelete(entry.id)} aria-label={`Delete ${entry.food_name}`}>
              Delete
            </button>
          </article>
        ))
      )}
    </section>
  );
}

function getMealIcon(mealName = "") {
  const name = mealName.toLowerCase();

  if (name.includes("coffee") || name.includes("tea") || name.includes("drink")) {
    return "Drink";
  }

  if (name.includes("fruit") || name.includes("banana") || name.includes("yogurt")) {
    return "Fruit";
  }

  return "Meal";
}

function formatMealMeta(entry) {
  const label = formatLabel(entry.meal_type);
  const time = entry.logged_time || "--:--";
  const macros = [
    entry.protein_g !== null && entry.protein_g !== undefined ? `${formatNumber(entry.protein_g)}g protein` : null,
    entry.carbs_g !== null && entry.carbs_g !== undefined ? `${formatNumber(entry.carbs_g)}g carbs` : null,
    entry.fat_g !== null && entry.fat_g !== undefined ? `${formatNumber(entry.fat_g)}g fat` : null,
  ].filter(Boolean);

  return [label, time, ...macros].join(" · ");
}

function getPhotoUrl(photoPath) {
  if (!photoPath) {
    return "";
  }

  return `${API_BASE_URL}/api/uploads/${photoPath}`;
}

async function fetchFoodsByDate(userId, loggedDate) {
  const response = await fetch(`${API_BASE_URL}/api/foods/${userId}?date=${loggedDate}`);
  const data = await response.json().catch(() => ({
    success: false,
    message: `Food API returned status ${response.status}.`,
  }));

  if (!response.ok || data.success === false) {
    throw new Error(data.message || "Could not load food logs.");
  }

  return Array.isArray(data.foods) ? data.foods : [];
}

async function createFoodEntry(userId, foodData) {
  const response = await fetch(`${API_BASE_URL}/api/foods`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: userId,
      ...foodData,
    }),
  });
  const data = await response.json().catch(() => ({
    success: false,
    message: `Create food API returned status ${response.status}.`,
  }));

  if (!response.ok || data.success === false) {
    throw new Error(data.message || "Could not save your meal.");
  }

  return data.food;
}

async function uploadFoodPhoto(foodId, userId, photo) {
  const formData = new FormData();
  formData.append("user_id", userId);
  formData.append("photo", photo);

  const response = await fetch(`${API_BASE_URL}/api/foods/${foodId}/photo`, {
    method: "POST",
    body: formData,
  });
  const data = await response.json().catch(() => ({
    success: false,
    message: `Photo upload API returned status ${response.status}.`,
  }));

  if (!response.ok || data.success === false) {
    throw new Error(data.message || "Could not upload the food photo.");
  }

  return data;
}

async function deleteFoodEntry(foodId, userId) {
  const response = await fetch(`${API_BASE_URL}/api/foods/${foodId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ user_id: userId }),
  });
  const data = await response.json().catch(() => ({
    success: false,
    message: `Delete food API returned status ${response.status}.`,
  }));

  if (!response.ok || data.success === false) {
    throw new Error(data.message || "Could not delete this meal.");
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

function formatLabel(value) {
  if (!value) {
    return "";
  }

  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 1,
  });
}

export default FoodLog;