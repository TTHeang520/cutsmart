import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import WeightLineChart from "../components/WeightLineChart";

function WeightTrack() {
  const savedUser = localStorage.getItem("user");
  const user = savedUser ? JSON.parse(savedUser) : null;
  const latestPlan = getStoredLatestPlan(user);
  const storageKey = user ? `cutsmart_weight_entries_${user.id}` : "";
  const [weight, setWeight] = useState("");
  const [loggedDate, setLoggedDate] = useState(getToday());
  const [note, setNote] = useState("");
  const [activeRange, setActiveRange] = useState("W");
  const [history, setHistory] = useState(() => getStoredWeightEntries(storageKey));

  const sortedHistory = useMemo(
    () => [...history].sort((a, b) => a.logged_date.localeCompare(b.logged_date)),
    [history]
  );
  const startingWeight = latestPlan?.current_weight_kg || sortedHistory[0]?.weight_kg;
  const latestWeight = sortedHistory[sortedHistory.length - 1]?.weight_kg || startingWeight;
  const targetWeight = latestPlan?.target_weight_kg;
  const change = latestWeight && startingWeight ? latestWeight - startingWeight : null;
  const goalProgress = getGoalProgress(startingWeight, latestWeight, targetWeight);
  const averageWeight = sortedHistory.length
    ? sortedHistory.reduce((total, entry) => total + Number(entry.weight_kg), 0) / sortedHistory.length
    : null;
  const lowestEntry = sortedHistory.reduce(
    (lowest, entry) => (!lowest || Number(entry.weight_kg) < Number(lowest.weight_kg) ? entry : lowest),
    null
  );
  const highestEntry = sortedHistory.reduce(
    (highest, entry) => (!highest || Number(entry.weight_kg) > Number(highest.weight_kg) ? entry : highest),
    null
  );

  function handleSubmit(event) {
    event.preventDefault();

    const nextEntry = {
      id: `${loggedDate}-${Date.now()}`,
      logged_date: loggedDate,
      weight_kg: Number(weight),
      note,
    };
    const withoutSameDate = history.filter((entry) => entry.logged_date !== loggedDate);
    const nextHistory = [...withoutSameDate, nextEntry].sort((a, b) =>
      b.logged_date.localeCompare(a.logged_date)
    );

    setHistory(nextHistory);
    localStorage.setItem(storageKey, JSON.stringify(nextHistory));
    setWeight("");
    setNote("");
  }

  function handleEdit(entry) {
    setLoggedDate(entry.logged_date);
    setWeight(String(entry.weight_kg));
    setNote(entry.note || "");
    saveHistory(history.filter((item) => item.id !== entry.id));
  }

  function handleDelete(entryId) {
    saveHistory(history.filter((entry) => entry.id !== entryId));
  }

  function saveHistory(nextHistory) {
    setHistory(nextHistory);
    localStorage.setItem(storageKey, JSON.stringify(nextHistory));
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="tracker-page weight-track-page">
      <section className="tracker-shell weight-track-shell">
        <header className="tracker-header weight-track-header app-log-header">
          <div>
            <h1>Weight Track</h1>
            <p>Track your weight trend and stay on course.</p>
          </div>
          <div className="weight-header-actions">
            <Link to="/dashboard"><span aria-hidden="true">▦</span>Dashboard</Link>
          </div>
        </header>

        <div className="tracker-summary-grid weight-stat-grid">
          <TrackerMetric
            icon="▣"
            label="Average"
            value={averageWeight ? `${formatNumber(averageWeight)} kg` : "--"}
            detail={getDateRange(sortedHistory)}
          />
          <TrackerMetric
            icon="↓"
            label="Change"
            value={formatSignedWeight(change)}
            detail="vs starting weight"
            tone="purple"
          />
          <TrackerMetric
            icon="⌁"
            label="Lowest"
            value={lowestEntry ? `${formatNumber(lowestEntry.weight_kg)} kg` : "--"}
            detail={lowestEntry?.logged_date || "No data yet"}
            tone="green"
          />
          <TrackerMetric
            icon="⌁"
            label="Highest"
            value={highestEntry ? `${formatNumber(highestEntry.weight_kg)} kg` : "--"}
            detail={highestEntry?.logged_date || "No data yet"}
            tone="red"
          />
        </div>

        <section className="weight-chart-card">
          <div className="weight-range-tabs">
            {["D", "W", "M", "6M", "Y"].map((range) => (
              <button
                type="button"
                key={range}
                className={activeRange === range ? "active" : ""}
                onClick={() => setActiveRange(range)}
              >
                {range}
              </button>
            ))}
          </div>
          <WeightLineChart entries={sortedHistory} />
        </section>

        <div className="weight-track-grid">
          <section className="about-weight-card">
            <h2>About you</h2>
            <WeightFact label="Starting weight" value={startingWeight ? `${formatNumber(startingWeight)} kg` : "--"} />
            <WeightFact label="Current weight" value={latestWeight ? `${formatNumber(latestWeight)} kg` : "--"} highlight />
            <WeightFact label="Goal weight" value={targetWeight ? `${formatNumber(targetWeight)} kg` : "--"} />
            <WeightFact
              label="Total progress"
              value={formatSignedWeight(change)}
              highlight
            />
            <div className="weight-goal-progress">
              <div>
                <span>Progress to goal</span>
                <strong>{formatNumber(goalProgress)}%</strong>
              </div>
              <div className="weight-goal-bar">
                <span style={{ width: `${goalProgress}%` }} />
              </div>
            </div>
          </section>

          <form className="tracker-form weight-entry-form" onSubmit={handleSubmit}>
            <h2>Add new entry</h2>
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
              Weight
              <input
                type="number"
                min="1"
                step="0.1"
                value={weight}
                onChange={(event) => setWeight(event.target.value)}
                placeholder="77.9"
                required
              />
              <span>kg</span>
            </label>
            <label>
              Note
              <input
                type="text"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Optional"
              />
            </label>
            <button type="submit">Save Entry</button>
          </form>
        </div>

        <section className="tracker-list weight-history-list">
          <h2>Weight history</h2>
          {sortedHistory.length === 0 ? (
            <p>No weight entries yet.</p>
          ) : (
            [...sortedHistory].reverse().map((entry, index, entries) => (
              <div key={entry.id || entry.logged_date}>
                <div>
                  <strong>{entry.logged_date}</strong>
                  <small>{entry.note || "No note"}</small>
                </div>
                <span>{formatNumber(entry.weight_kg)} kg</span>
                <span className="weight-diff-pill">
                  {formatWeightDifference(entry, entries[index + 1])}
                </span>
                <button type="button" onClick={() => handleEdit(entry)} aria-label="Edit weight entry">
                  Edit
                </button>
                <button type="button" onClick={() => handleDelete(entry.id)} aria-label="Delete weight entry">
                  Delete
                </button>
              </div>
            ))
          )}
        </section>
      </section>
    </main>
  );
}

function WeightFact({ label, value, highlight }) {
  return (
    <div className={highlight ? "weight-fact highlight" : "weight-fact"}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TrackerMetric({ icon, label, value, detail, tone = "default" }) {
  return (
    <article className={`tracker-metric weight-stat-card tone-${tone}`}>
      <i aria-hidden="true">{icon}</i>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </article>
  );
}

function getGoalProgress(startingWeight, latestWeight, targetWeight) {
  if (!startingWeight || !latestWeight || !targetWeight || startingWeight === targetWeight) {
    return 0;
  }

  const totalNeeded = Math.abs(startingWeight - targetWeight);
  const completed = Math.abs(startingWeight - latestWeight);

  return Math.min(Math.max((completed / totalNeeded) * 100, 0), 100);
}

function formatWeightDifference(entry, previousEntry) {
  if (!previousEntry) {
    return "Start";
  }

  const difference = Number(entry.weight_kg) - Number(previousEntry.weight_kg);
  return formatSignedWeight(difference);
}

function formatSignedWeight(value) {
  if (value === null || value === undefined || value === "") {
    return "--";
  }

  const numericValue = Number(value);

  if (numericValue < 0) {
    return `- ${formatNumber(Math.abs(numericValue))} kg`;
  }

  if (numericValue > 0) {
    return `+ ${formatNumber(numericValue)} kg`;
  }

  return "0 kg";
}

function getDateRange(entries) {
  if (entries.length === 0) {
    return "No data yet";
  }

  return `${entries[0].logged_date} - ${entries[entries.length - 1].logged_date}`;
}

function getStoredWeightEntries(storageKey) {
  if (!storageKey) {
    return [];
  }

  const rawEntries = localStorage.getItem(storageKey);

  if (!rawEntries) {
    return [];
  }

  try {
    return JSON.parse(rawEntries);
  } catch {
    return [];
  }
}

function getStoredLatestPlan(user) {
  const rawPlan = localStorage.getItem(
    user?.id ? `cutsmart_latest_plan_${user.id}` : "cutsmart_latest_plan_guest"
  );

  if (!rawPlan) {
    return null;
  }

  try {
    return JSON.parse(rawPlan);
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

export default WeightTrack;
