import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import WeightLineChart from "../components/WeightLineChart";
import { getWeightStats } from "../utils/weightUtils";

const API_BASE_URL = "http://127.0.0.1:5000";

function WeightTrack() {
  const savedUser = localStorage.getItem("user");
  const user = savedUser ? JSON.parse(savedUser) : null;
  const latestPlan = getStoredLatestPlan(user);
  const [weight, setWeight] = useState("");
  const [loggedDate, setLoggedDate] = useState(getToday());
  const [note, setNote] = useState("");
  const [activeRange, setActiveRange] = useState("W");
  const [history, setHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(Boolean(user?.id));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    let isCurrent = true;

    async function loadWeightHistory() {
      setIsLoadingHistory(true);
      setError("");

      try {
        const nextHistory = await fetchWeightHistory(user.id);

        if (isCurrent) {
          setHistory(nextHistory);
        }
      } catch (requestError) {
        if (isCurrent) {
          setHistory([]);
          setError(requestError.message || "Could not load your weight history.");
        }
      } finally {
        if (isCurrent) {
          setIsLoadingHistory(false);
        }
      }
    }

    loadWeightHistory();

    return () => {
      isCurrent = false;
    };
  }, [user?.id]);

  const sortedHistory = useMemo(
    () => [...history].sort((a, b) => a.logged_date.localeCompare(b.logged_date)),
    [history]
  );
  const weightStats = getWeightStats({ weights: sortedHistory, plan: latestPlan });

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSaving(true);
    setError("");

    try {
      await saveWeightEntry(user.id, Number(weight), loggedDate);
      const nextHistory = await fetchWeightHistory(user.id);

      setHistory(nextHistory);
      setWeight("");
      setNote("");
    } catch (requestError) {
      setError(requestError.message || "Could not save your weight entry.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleEdit(entry) {
    setLoggedDate(entry.logged_date);
    setWeight(String(entry.weight_kg));
    setNote(entry.note || "");
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
            value={weightStats.averageWeight ? `${formatNumber(weightStats.averageWeight)} kg` : "--"}
            detail={getDateRange(weightStats.chartData)}
          />
          <TrackerMetric
            icon="↓"
            label="Change"
            value={formatSignedWeight(weightStats.weightChange)}
            detail="vs starting weight"
            tone="purple"
          />
          <TrackerMetric
            icon="⌁"
            label="Lowest"
            value={weightStats.lowestEntry ? `${formatNumber(weightStats.lowestEntry.weight_kg)} kg` : "--"}
            detail={weightStats.lowestEntry?.logged_date || "No data yet"}
            tone="green"
          />
          <TrackerMetric
            icon="⌁"
            label="Highest"
            value={weightStats.highestEntry ? `${formatNumber(weightStats.highestEntry.weight_kg)} kg` : "--"}
            detail={weightStats.highestEntry?.logged_date || "No data yet"}
            tone="red"
          />
        </div>

        {isLoadingHistory && <p className="app-log-empty">Loading weight history...</p>}
        {error && <p className="app-log-empty" role="alert">{error}</p>}

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
          <WeightLineChart entries={weightStats.chartData} />
        </section>

        <div className="weight-track-grid">
          <section className="about-weight-card">
            <h2>About you</h2>
            <WeightFact label="Starting weight" value={weightStats.startWeight ? `${formatNumber(weightStats.startWeight)} kg` : "--"} />
            <WeightFact label="Current weight" value={weightStats.latestWeight ? `${formatNumber(weightStats.latestWeight)} kg` : "--"} highlight />
            <WeightFact label="Goal weight" value={weightStats.targetWeight ? `${formatNumber(weightStats.targetWeight)} kg` : "--"} />
            <WeightFact
              label="Total progress"
              value={formatSignedWeight(weightStats.weightChange)}
              highlight
            />
            <div className="weight-goal-progress">
              <div>
                <span>Progress to goal</span>
                <strong>{formatNumber(weightStats.progressPercent)}%</strong>
              </div>
              <div className="weight-goal-bar">
                <span style={{ width: `${weightStats.progressPercent}%` }} />
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
            <button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Entry"}
            </button>
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

async function fetchWeightHistory(userId) {
  const response = await fetch(`${API_BASE_URL}/api/weights/history/${userId}`);
  const data = await response.json().catch(() => ({
    success: false,
    message: `Weight history API returned status ${response.status}.`,
  }));

  if (!response.ok || data.success === false) {
    throw new Error(data.message || "Could not load your weight history.");
  }

  return Array.isArray(data.history) ? data.history : [];
}

async function saveWeightEntry(userId, weightKg, loggedDate) {
  const response = await fetch(`${API_BASE_URL}/api/weights`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: userId,
      weight_kg: weightKg,
      logged_date: loggedDate,
    }),
  });

  const data = await response.json().catch(() => ({
    success: false,
    message: `Save weight API returned status ${response.status}.`,
  }));

  if (!response.ok || data.success === false) {
    throw new Error(data.message || "Could not save your weight entry.");
  }

  return data.weight;
}

export default WeightTrack;
