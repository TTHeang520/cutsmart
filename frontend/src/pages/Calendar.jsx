import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";

const API_BASE_URL = "http://127.0.0.1:5000";
const EMPTY_ENTRIES = {
  food: [],
  exercise: [],
  weight: [],
};

function Calendar() {
  const savedUser = localStorage.getItem("user");
  const user = savedUser ? JSON.parse(savedUser) : null;
  const userId = user?.id;
  const today = getToday();
  const [visibleDate, setVisibleDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [entries, setEntries] = useState(EMPTY_ENTRIES);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [error, setError] = useState("");
  const days = useMemo(() => buildMonthDays(visibleDate), [visibleDate]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    let isCurrent = true;

    async function loadEntriesForDate() {
      setIsLoadingEntries(true);
      setError("");

      try {
        const nextEntries = await fetchEntriesForDate(userId, selectedDate);

        if (isCurrent) {
          setEntries(nextEntries);
        }
      } catch (requestError) {
        if (isCurrent) {
          setEntries(EMPTY_ENTRIES);
          setError(requestError.message || "Could not load calendar entries.");
        }
      } finally {
        if (isCurrent) {
          setIsLoadingEntries(false);
        }
      }
    }

    loadEntriesForDate();

    return () => {
      isCurrent = false;
    };
  }, [userId, selectedDate]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  function moveMonth(direction) {
    setVisibleDate(
      new Date(visibleDate.getFullYear(), visibleDate.getMonth() + direction, 1)
    );
  }

  return (
    <main className="tracker-page">
      <section className="tracker-shell calendar-shell">
        <header className="tracker-header">
          <div>
            <p className="daily-dashboard-eyebrow">CutSmart</p>
            <h1>Calendar</h1>
            <p>Review food, exercise, and weight entries by date.</p>
          </div>
          <Link to="/dashboard">Dashboard</Link>
        </header>

        <div className="calendar-toolbar">
          <button type="button" onClick={() => moveMonth(-1)}>Previous</button>
          <strong>
            {visibleDate.toLocaleString(undefined, { month: "long", year: "numeric" })}
          </strong>
          <button type="button" onClick={() => moveMonth(1)}>Next</button>
        </div>

        <div className="calendar-grid">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <span className="calendar-weekday" key={day}>{day}</span>
          ))}
          {days.map((day) => (
            <button
              type="button"
              key={day.key}
              className={[
                "calendar-day",
                day.isCurrentMonth ? "" : "muted",
                day.dateString === today ? "today" : "",
                day.dateString === selectedDate ? "selected" : "",
              ].join(" ")}
              onClick={() => setSelectedDate(day.dateString)}
            >
              {day.date.getDate()}
            </button>
          ))}
        </div>

        <section className="calendar-detail-card">
          <div>
            <span className="daily-dashboard-eyebrow">Selected date</span>
            <h2>{selectedDate}</h2>
          </div>

          {isLoadingEntries && <p>Loading entries...</p>}
          {error && <p>{error}</p>}

          {!isLoadingEntries && !error && (
            <>
              <CalendarEntries title="Food" entries={entries.food} emptyText="No meals logged." />
              <CalendarEntries title="Exercise" entries={entries.exercise} emptyText="No workouts logged." />
              <CalendarEntries title="Weight" entries={entries.weight} emptyText="No weight logged." />
            </>
          )}
        </section>
      </section>
    </main>
  );
}

function CalendarEntries({ title, entries, emptyText }) {
  return (
    <div className="calendar-entry-group">
      <h3>{title}</h3>
      {entries.length === 0 ? (
        <p>{emptyText}</p>
      ) : (
        entries.map((entry, index) => (
          <div key={`${title}-${entry.id || index}`}>
            <strong>{entry.title}</strong>
            <span>{entry.value}</span>
          </div>
        ))
      )}
    </div>
  );
}

async function fetchEntriesForDate(userId, dateString) {
  const [foodData, exerciseData, weightData] = await Promise.all([
    fetchCalendarJson(`${API_BASE_URL}/api/foods/${userId}?date=${dateString}`),
    fetchCalendarJson(`${API_BASE_URL}/api/exercises/${userId}?date=${dateString}`),
    fetchCalendarJson(`${API_BASE_URL}/api/weights/${userId}?date=${dateString}`),
  ]);

  return {
    food: Array.isArray(foodData?.foods)
      ? foodData.foods.map((entry) => ({
          id: entry.id,
          title: entry.food_name,
          value: `${formatNumber(entry.calories)} kcal${entry.meal_type ? ` - ${entry.meal_type}` : ""}`,
        }))
      : [],
    exercise: Array.isArray(exerciseData?.exercises)
      ? exerciseData.exercises.map((entry) => ({
          id: entry.id,
          title: entry.exercise_name,
          value: `${formatNumber(entry.calories_burned)} kcal - ${formatNumber(entry.duration_minutes)} min`,
        }))
      : [],
    weight: weightData?.weight
      ? [
          {
            id: weightData.weight.id,
            title: "Weight",
            value: `${formatNumber(weightData.weight.weight_kg)} kg`,
          },
        ]
      : [],
  };
}

async function fetchCalendarJson(url) {
  const response = await fetch(url);
  const data = await response.json().catch(() => null);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(data?.message || `Calendar API returned status ${response.status}.`);
  }

  return data;
}

function buildMonthDays(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const startDate = new Date(year, month, 1 - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const current = new Date(startDate);
    current.setDate(startDate.getDate() + index);
    const dateString = toDateString(current);

    return {
      key: `${dateString}-${index}`,
      date: current,
      dateString,
      isCurrentMonth: current.getMonth() === month,
    };
  });
}

function getToday() {
  return toDateString(new Date());
}

function toDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 1,
  });
}

export default Calendar;