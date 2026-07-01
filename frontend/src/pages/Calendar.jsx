import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";

function Calendar() {
  const savedUser = localStorage.getItem("user");
  const user = savedUser ? JSON.parse(savedUser) : null;
  const today = getToday();
  const [visibleDate, setVisibleDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const days = useMemo(() => buildMonthDays(visibleDate), [visibleDate]);
  const entries = user ? getEntriesForDate(user.id, selectedDate) : null;

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
          <CalendarEntries title="Food" entries={entries.food} emptyText="No meals logged." />
          <CalendarEntries title="Exercise" entries={entries.exercise} emptyText="No workouts logged." />
          <CalendarEntries title="Weight" entries={entries.weight} emptyText="No weight logged." />
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
          <div key={`${title}-${index}`}>
            <strong>{entry.title}</strong>
            <span>{entry.value}</span>
          </div>
        ))
      )}
    </div>
  );
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

function getEntriesForDate(userId, dateString) {
  const food = getJson(`cutsmart_food_log_${userId}_${dateString}`).map((entry) => ({
    title: entry.mealName,
    value: `${formatNumber(entry.calories)} kcal`,
  }));
  const exercise = getJson(`cutsmart_exercise_log_${userId}_${dateString}`).map((entry) => ({
    title: entry.exerciseName,
    value: `${formatNumber(entry.caloriesBurned)} kcal · ${formatNumber(entry.duration)} min`,
  }));
  const weight = getJson(`cutsmart_weight_entries_${userId}`)
    .filter((entry) => entry.logged_date === dateString)
    .map((entry) => ({
      title: "Weight",
      value: `${formatNumber(entry.weight_kg)} kg`,
    }));

  return { food, exercise, weight };
}

function getJson(key) {
  const raw = localStorage.getItem(key);

  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
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
