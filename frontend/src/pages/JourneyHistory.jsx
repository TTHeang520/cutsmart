import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { getWeightStats } from "../utils/weightUtils";

const API_BASE_URL = "http://127.0.0.1:5000";

function JourneyHistory() {
  const navigate = useNavigate();
  const savedUser = localStorage.getItem("user");
  const user = savedUser ? JSON.parse(savedUser) : null;
  const latestPlan = getStoredLatestPlan(user);
  const [journeys, setJourneys] = useState([]);
  const [activeWeightHistory, setActiveWeightHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(Boolean(user?.id));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    let isCurrent = true;

    async function fetchJourneys() {
      setError("");
      setIsLoading(true);

      try {
        const [journeyData, weightData] = await Promise.all([
          fetchRequiredJson(`${API_BASE_URL}/api/journeys/history/${user.id}`),
          fetchOptionalJson(`${API_BASE_URL}/api/weights/history/${user.id}`),
        ]);

        if (!isCurrent) {
          return;
        }

        setJourneys(Array.isArray(journeyData.journeys) ? journeyData.journeys : []);
        setActiveWeightHistory(Array.isArray(weightData?.history) ? weightData.history : []);
      } catch (requestError) {
        if (isCurrent) {
          setError(requestError.message || "Could not connect to the server.");
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    fetchJourneys();

    return () => {
      isCurrent = false;
    };
  }, [user?.id]);

  const activeJourney = useMemo(
    () => journeys.find((journey) => journey.status === "active"),
    [journeys]
  );
  const archivedJourneys = useMemo(
    () => journeys.filter((journey) => journey.status !== "active"),
    [journeys]
  );

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="tracker-page journey-history-page">
      <section className="tracker-shell journey-history-shell">
        <header className="journey-history-header">
          <button type="button" onClick={() => navigate(-1)} aria-label="Go back">
            ‹
          </button>
          <div>
            <h1>Journey History</h1>
            <p>
              Review your active plan and revisit your <span>past progress.</span>
            </p>
          </div>
          <div className="journey-history-hero-icon" aria-hidden="true">
            ▤
          </div>
        </header>

        {isLoading && (
          <section className="journey-empty-state">
            <strong>Loading journeys</strong>
            <p>We are checking your saved CutSmart journeys.</p>
          </section>
        )}

        {!isLoading && error && (
          <section className="journey-empty-state is-error">
            <strong>Could not load journeys</strong>
            <p>{error}</p>
          </section>
        )}

        {!isLoading && !error && journeys.length === 0 && (
          <section className="journey-empty-state">
            <strong>No journeys yet</strong>
            <p>Create your first plan to start a CutSmart journey.</p>
            <Link to="/plan">Create Plan</Link>
          </section>
        )}

        {!isLoading && !error && activeJourney && (
          <CurrentJourneyCard
            journey={activeJourney}
            latestPlan={latestPlan}
            weightHistory={activeWeightHistory}
          />
        )}

        {!isLoading && !error && journeys.length > 0 && (
          <section className="journey-archive-section">
            <div className="journey-section-header">
              <div>
                <span className="journey-archive-icon" aria-hidden="true">▤</span>
                <div>
                  <h2>Your Journey Archive</h2>
                  <p>Past plans. Real progress.</p>
                </div>
              </div>
              <span>Newest First</span>
            </div>

            {archivedJourneys.length === 0 ? (
              <section className="journey-empty-state">
                <strong>No archived journeys yet</strong>
                <p>Your completed or replaced journeys will appear here.</p>
              </section>
            ) : (
              <div className="journey-card-list">
                {archivedJourneys.map((journey, index) => (
                  <ArchivedJourneyCard
                    key={journey.id}
                    journey={journey}
                    displayNumber={archivedJourneys.length - index}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {!isLoading && !error && (
          <section className="journey-bottom-note">
            <span aria-hidden="true">▱</span>
            <div>
              <strong>Keep going.</strong>
              <p>Your next milestone will appear here.</p>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

function CurrentJourneyCard({ journey, latestPlan, weightHistory }) {
  const stats = getWeightStats({ weights: weightHistory, plan: latestPlan, journey });

  return (
    <section className="journey-current-card">
      <div className="journey-card-topline">
        <span className="journey-status-pill is-current">Current Journey</span>
        <span className="journey-status-pill">Current</span>
      </div>

      <div className="journey-card-main">
        <div className="journey-card-icon" aria-hidden="true">↗</div>
        <div>
          <h2>Active Plan</h2>
          <p>Stay consistent. Small steps, big change.</p>
        </div>
      </div>

      <div className="journey-stat-grid">
        <JourneyStat label="Started" value={formatDate(journey.started_at)} icon="▦" />
        <JourneyStat
          label="Weight"
          value={
            <>
              {formatNumber(stats.startWeight)} kg
              <span className="journey-arrow">→</span>
              <span className="journey-target-value">{formatNumber(stats.targetWeight)} kg</span>
            </>
          }
        />
        <JourneyStat
          label="Progress"
          value={
            <span className="journey-progress-stat">
              <span>{formatNumber(stats.progressPercent)}%</span>
              <i aria-hidden="true"><b style={{ width: `${stats.progressPercent}%` }} /></i>
            </span>
          }
        />
        <JourneyStat
          label="Target"
          value={<span className="journey-target-value">{formatNumber(stats.targetWeight)} kg</span>}
          detail={formatActiveTimeline(journey.started_at)}
        />
      </div>

      <div className="journey-action-row">
        <Link to={`/journeys/${journey.id}`}>View Journey <span aria-hidden="true">›</span></Link>
      </div>
    </section>
  );
}

function ArchivedJourneyCard({ journey, displayNumber }) {
  return (
    <article className="journey-card">
      <div className="journey-card-icon is-archived" aria-hidden="true">◎</div>
      <div className="journey-card-content">
        <div className="journey-card-title-row">
          <div>
            <h3>Journey #{displayNumber || journey.id}</h3>
            <span className="journey-status-pill is-archived">Archived</span>
          </div>
          <Link to={`/journeys/${journey.id}`} aria-label={`View journey ${journey.id}`}>›</Link>
        </div>

        <div className="journey-stat-grid">
          <JourneyStat label="Started" value={formatDate(journey.started_at)} />
          <JourneyStat label="Ended" value={journey.ended_at ? formatDate(journey.ended_at) : "-"} />
          <JourneyStat
            label="Weight"
            value={`${formatNumber(journey.initial_weight_kg)} kg → ${formatNumber(journey.target_weight_kg)} kg`}
          />
          <JourneyStat label="Status" value={formatLabel(journey.status)} />
          <JourneyStat label="Timeline" value={formatTimeline(journey.started_at, journey.ended_at)} />
        </div>

        <div className="journey-action-row">
          <Link to={`/journeys/${journey.id}`}>View</Link>
        </div>
      </div>
    </article>
  );
}

function JourneyStat({ label, value, icon, detail }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{icon && <i aria-hidden="true">{icon}</i>}{value}</strong>
      {detail && <em>{detail}</em>}
    </div>
  );
}

async function fetchRequiredJson(url) {
  const response = await fetch(url);
  const data = await response.json().catch(() => ({
    success: false,
    message: `API returned status ${response.status}.`,
  }));

  if (!response.ok || data.success === false) {
    throw new Error(data.message || "Could not load journey history.");
  }

  return data;
}

async function fetchOptionalJson(url) {
  try {
    return await fetchRequiredJson(url);
  } catch {
    return null;
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

function formatActiveTimeline(startedAt) {
  if (!startedAt) {
    return "-";
  }

  const start = new Date(startedAt);
  const today = new Date();
  const days = Math.max(Math.ceil((today - start) / 86400000), 0);

  return `in ${days} ${days === 1 ? "day" : "days"}`;
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTimeline(startedAt, endedAt) {
  if (!startedAt || !endedAt) {
    return "-";
  }

  const start = new Date(startedAt);
  const end = new Date(endedAt);
  const days = Math.max(Math.ceil((end - start) / 86400000), 0);

  return `${days} ${days === 1 ? "day" : "days"}`;
}

function formatLabel(value) {
  if (!value) {
    return "-";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 1,
  });
}

export default JourneyHistory;
