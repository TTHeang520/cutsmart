import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import CompanionMascot from "../components/CompanionMascot";

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
  const latestWeight = sortedHistory[sortedHistory.length - 1]?.weight_kg;
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
        <header className="tracker-header weight-track-header">
          <Link className="weight-back-button" to="/dashboard" aria-label="Back to dashboard">
            ←
          </Link>
          <div>
            <h1>Weight Track</h1>
            <p>Track your weight trend and stay on course.</p>
          </div>
          <div className="weight-header-actions">
            <CompanionMascot size="medium" />
            <button type="button" onClick={() => setLoggedDate(getToday())} aria-label="Add weight entry">
              +
            </button>
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
            value={change === null ? "--" : `${change > 0 ? "+" : ""}${formatNumber(change)} kg`}
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
          <WeightLineGraph entries={sortedHistory} />
        </section>

        <div className="weight-track-grid">
          <section className="about-weight-card">
            <h2>About you</h2>
            <WeightFact label="Starting weight" value={startingWeight ? `${formatNumber(startingWeight)} kg` : "--"} />
            <WeightFact label="Current weight" value={latestWeight ? `${formatNumber(latestWeight)} kg` : "--"} highlight />
            <WeightFact label="Goal weight" value={targetWeight ? `${formatNumber(targetWeight)} kg` : "--"} />
            <WeightFact
              label="Total progress"
              value={change === null ? "--" : `${change > 0 ? "+" : ""}${formatNumber(change)} kg`}
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

function WeightLineGraph({ entries }) {
  // Use a sample line only when the user has not added enough points yet.
  const chartEntries = entries.length >= 2 ? entries : getSampleEntries();
  const values = chartEntries.map((entry) => Number(entry.weight_kg));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const chartWidth = 720;
  const chartHeight = 300;
  const padding = { left: 50, right: 30, top: 30, bottom: 45 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;
  const pointList = values.map((value, index) => {
    const xRatio = values.length === 1 ? 0.5 : index / Math.max(values.length - 1, 1);
    const yRatio = (value - min) / range;
    const x = clamp(padding.left + xRatio * innerWidth, padding.left, chartWidth - padding.right);
    const y = clamp(
      padding.top + (1 - yRatio) * innerHeight,
      padding.top,
      chartHeight - padding.bottom
    );

    const tooltipX = clamp(x - 58, padding.left, chartWidth - padding.right - 116);
    const tooltipY = y < padding.top + 58 ? y + 18 : y - 58;

    return { x, y, tooltipX, tooltipY, value, entry: chartEntries[index] };
  });
  const points = pointList
    .map((point) => `${point.x},${point.y}`)
    .join(" ");
  const gridLines = [padding.top, padding.top + innerHeight / 2, padding.top + innerHeight];

  return (
    <div className="weight-chart-wrap">
      {entries.length < 2 && (
        <p className="weight-chart-empty-note">
          Sample trend shown. Add two entries to see your own graph.
        </p>
      )}
      <div className="weight-chart-y-axis">
        <span>{formatNumber(max)} kg</span>
        <span>{formatNumber((max + min) / 2)} kg</span>
        <span>{formatNumber(min)} kg</span>
      </div>
      <svg
        className="weight-line-chart"
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        preserveAspectRatio="xMidYMid meet"
        aria-label="Weight trend line graph"
      >
        <defs>
          <filter id="weight-marker-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#C66BFF" floodOpacity="0.75" />
          </filter>
          <clipPath id="weight-chart-clip">
            <rect
              x={padding.left}
              y={padding.top}
              width={innerWidth}
              height={innerHeight}
              rx="10"
            />
          </clipPath>
        </defs>
        <g className="chart-grid-lines">
          {gridLines.map((lineY) => (
            <line
              key={lineY}
              x1={padding.left}
              x2={chartWidth - padding.right}
              y1={lineY}
              y2={lineY}
            />
          ))}
        </g>
        <g clipPath="url(#weight-chart-clip)">
          <polyline points={points} />
        </g>
        <g className="weight-chart-markers">
          {pointList.map((point) => (
            <g
              className="weight-chart-marker"
              key={`${point.entry.logged_date}-${point.value}`}
              tabIndex="0"
            >
              <circle cx={point.x} cy={point.y} r="7" />
              <g className="weight-chart-tooltip" transform={`translate(${point.tooltipX} ${point.tooltipY})`}>
                <rect width="116" height="42" rx="12" />
                <text x="58" y="17">{formatNumber(point.value)} kg</text>
                <text x="58" y="32">{formatShortDate(point.entry.logged_date)}</text>
              </g>
              <title>{`${formatNumber(point.value)} kg on ${formatShortDate(point.entry.logged_date)}`}</title>
            </g>
          ))}
        </g>
      </svg>
      <div className="weight-chart-x-axis">
        {chartEntries.map((entry) => (
          <span key={entry.logged_date}>{formatShortDate(entry.logged_date)}</span>
        ))}
      </div>
    </div>
  );
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getSampleEntries() {
  return [
    { logged_date: "2026-06-27", weight_kg: 71.1 },
    { logged_date: "2026-06-28", weight_kg: 71 },
    { logged_date: "2026-06-29", weight_kg: 70.6 },
    { logged_date: "2026-06-30", weight_kg: 70.2 },
    { logged_date: "2026-07-01", weight_kg: 70.5 },
    { logged_date: "2026-07-02", weight_kg: 70.3 },
  ];
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
  return `${difference > 0 ? "+" : ""}${formatNumber(difference)} kg`;
}

function getDateRange(entries) {
  if (entries.length === 0) {
    return "No data yet";
  }

  return `${entries[0].logged_date} - ${entries[entries.length - 1].logged_date}`;
}

function formatShortDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
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
