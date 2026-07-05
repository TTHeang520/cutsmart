import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import WeightLineChart from "../components/WeightLineChart";

const API_BASE_URL = "http://127.0.0.1:5000";

function JourneyOverview() {
  const navigate = useNavigate();
  const { journeyId } = useParams();
  const savedUser = localStorage.getItem("user");
  const user = savedUser ? JSON.parse(savedUser) : null;
  const localWeightStorageKey = user ? `cutsmart_weight_entries_${user.id}` : "";
  const [overview, setOverview] = useState({
    plans: [],
    weights: [],
    foods: [],
    exercises: [],
    journey: null,
  });
  const [isLoading, setIsLoading] = useState(Boolean(user?.id));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.id || !journeyId) {
      return;
    }

    let isCurrent = true;

    async function fetchJourneyOverview() {
      setIsLoading(true);
      setError("");

      try {
        const [plansData, weightsData, foodsData, exercisesData] = await Promise.all([
          fetchJourneyData(user.id, journeyId, "plans"),
          fetchOptionalJourneyData(user.id, journeyId, "weights"),
          fetchOptionalJourneyData(user.id, journeyId, "foods"),
          fetchOptionalJourneyData(user.id, journeyId, "exercises"),
        ]);

        if (!isCurrent) {
          return;
        }

        setOverview({
          plans: Array.isArray(plansData.plans) ? plansData.plans : [],
          weights: Array.isArray(weightsData.weights) ? weightsData.weights : [],
          foods: Array.isArray(foodsData.foods) ? foodsData.foods : [],
          exercises: Array.isArray(exercisesData.exercises) ? exercisesData.exercises : [],
          journey: weightsData.journey || foodsData.journey || exercisesData.journey || null,
        });
      } catch (requestError) {
        if (isCurrent) {
          setError(requestError.message || "Could not load journey overview.");
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    fetchJourneyOverview();

    return () => {
      isCurrent = false;
    };
  }, [journeyId, user?.id]);

  const sortedWeights = useMemo(
    () => [...overview.weights].sort((a, b) => a.logged_date.localeCompare(b.logged_date)),
    [overview.weights]
  );
  const localWeightHistory = useMemo(
    () => getStoredWeightEntries(localWeightStorageKey).sort((a, b) => a.logged_date.localeCompare(b.logged_date)),
    [localWeightStorageKey]
  );
  const journeySnapshot = useMemo(
    () => getStoredJourneySnapshot(user, journeyId),
    [journeyId, user?.id]
  );
  const snapshotWeights = useMemo(
    () => [...(journeySnapshot?.weights || [])].sort((a, b) => a.logged_date.localeCompare(b.logged_date)),
    [journeySnapshot]
  );
  const latestPlan = overview.plans[0] || journeySnapshot?.plan || null;
  const journey = overview.journey;
  const status = journey?.status || "not available";
  const isArchivedJourney = status === "archived";
  const chartWeights = isArchivedJourney
    ? getArchivedWeightHistory(sortedWeights, snapshotWeights, localWeightHistory)
    : localWeightHistory;
  const journeyFoods = isArchivedJourney && journeySnapshot?.foods?.length
    ? journeySnapshot.foods
    : overview.foods;
  const journeyExercises = isArchivedJourney && journeySnapshot?.exercises?.length
    ? journeySnapshot.exercises
    : overview.exercises;
  const startWeight = isArchivedJourney
    ? journey?.initial_weight_kg || latestPlan?.current_weight_kg || chartWeights[0]?.weight_kg
    : latestPlan?.current_weight_kg || chartWeights[0]?.weight_kg || journey?.initial_weight_kg;
  const currentWeight = chartWeights[chartWeights.length - 1]?.weight_kg || startWeight;
  const targetWeight = isArchivedJourney
    ? journey?.target_weight_kg || latestPlan?.target_weight_kg
    : latestPlan?.target_weight_kg || journey?.target_weight_kg;
  const progress = getGoalProgress(startWeight, currentWeight, targetWeight);
  const canShowProgress = progress !== null;
  const title = latestPlan?.strategy ? `${formatLabel(latestPlan.strategy)} Strategy` : "Journey";
  const chartColors = isArchivedJourney
    ? { lineColor: "#d8b4fe", markerColor: "#d8b4fe", glowColor: "#a855f7" }
    : { lineColor: "#7cff6b", markerColor: "#7cff6b", glowColor: "#7cff6b" };
  const totalFoodCalories = sumBy(journeyFoods, "calories");
  const totalExerciseCalories = sumBy(journeyExercises, "calories_burned");
  const trackedDays = countUniqueDates([
    ...chartWeights.map((entry) => entry.logged_date),
    ...journeyFoods.map((entry) => entry.logged_date),
    ...journeyExercises.map((entry) => entry.logged_date),
  ]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className={`tracker-page journey-overview-page ${isArchivedJourney ? "is-archived" : "is-current"}`}>
      <section className="tracker-shell journey-overview-shell">
        <header className="journey-overview-header">
          <button type="button" onClick={() => navigate("/journey-history")} aria-label="Back to Journey History">
            ←
          </button>
          <div>
            <h1>Journey Overview</h1>
            <p>Review your plan, progress and milestones.</p>
          </div>
          <button type="button" aria-label="Share journey overview">
            ···
          </button>
        </header>

        {isLoading && <JourneyEmptyState title="Loading journey" text="We are gathering this journey's details." />}

        {!isLoading && error && (
          <JourneyEmptyState title="Could not load journey" text={error} tone="error" />
        )}

        {!isLoading && !error && (
          <>
            <section className="journey-hero-card">
              <div className="journey-overview-icon" aria-hidden="true">◎</div>
              <div className="journey-hero-copy">
                <div>
                  <h2>{title}</h2>
                  <span className={`journey-status-pill ${status === "active" ? "is-current" : "is-archived"}`}>
                    {formatLabel(status)}
                  </span>
                </div>
                <p>Stay consistent. Small steps, big change.</p>
                <dl>
                  <JourneyFact label="Started" value={formatDate(journey?.started_at || latestPlan?.created_at)} />
                  <JourneyFact label="Goal timeline" value={formatTimelineWeeks(latestPlan)} />
                  <JourneyFact label="Current status" value={formatLabel(status)} />
                </dl>
              </div>
              <div className="journey-progress-ring" style={{ "--progress": `${canShowProgress ? progress : 0}%` }}>
                <div className="journey-ring-content">
                  {canShowProgress ? (
                    <>
                      <strong>{formatNumber(progress)}%</strong>
                      <span>Progress</span>
                    </>
                  ) : (
                    <span>Progress unavailable</span>
                  )}
                </div>
              </div>
            </section>

            <section className="journey-overview-card">
              <div className="journey-overview-section-title">
                <h2>Plan Summary</h2>
                {status === "active" ? (
                  <Link to="/plan">View Plan Details <span aria-hidden="true">›</span></Link>
                ) : (
                  <button type="button" disabled>Coming Soon</button>
                )}
              </div>
              {latestPlan ? (
                <div className="journey-summary-grid">
                  <SummaryMetric icon="◉" label="Daily Calories" value={formatKcal(latestPlan.target_calories)} />
                  <SummaryMetric icon="◒" label="Protein" value={formatGram(latestPlan.protein_g)} />
                  <SummaryMetric icon="▥" label="Carbs" value={formatGram(latestPlan.carbs_g)} />
                  <SummaryMetric icon="◍" label="Fat" value={formatGram(latestPlan.fat_g)} />
                  <SummaryMetric icon="▦" label="Maintenance" value={formatKcal(latestPlan.maintenance_calories)} />
                  <SummaryMetric icon="⌁" label="Daily Deficit" value={formatKcal(latestPlan.daily_deficit)} />
                </div>
              ) : (
                <JourneyEmptyState title="Plan information unavailable" text="No saved plan details were returned for this journey." />
              )}
            </section>

            <section className="journey-overview-card journey-chart-card">
              <div className="journey-overview-section-title">
                <h2>Weight Progress</h2>
                <span>All Time</span>
              </div>
              {chartWeights.length > 0 ? (
                <div className="journey-weight-grid">
                  <WeightLineChart
                    entries={chartWeights}
                    sampleWhenEmpty={false}
                    lineColor={chartColors.lineColor}
                    markerColor={chartColors.markerColor}
                    glowColor={chartColors.glowColor}
                  />
                  <div className="journey-weight-facts">
                    <JourneyFact label="Start weight" value={formatKg(startWeight)} />
                    <JourneyFact label="Current weight" value={formatKg(currentWeight)} highlight />
                    <JourneyFact label="Goal weight" value={formatKg(targetWeight)} />
                    <JourneyFact label="Remaining" value={formatRemainingWeight(currentWeight, targetWeight)} highlight />
                  </div>
                </div>
              ) : (
                <JourneyEmptyState title="No weight records for this journey." text="Weight progress will appear after entries are logged." />
              )}
            </section>

            <div className="journey-overview-two-column">
              <SummaryPanel
                title="Food Summary"
                items={[
                  ["Total meals", journeyFoods.length],
                  ["Average calories", journeyFoods.length ? formatKcal(totalFoodCalories / journeyFoods.length) : "—"],
                  ["Total logged", journeyFoods.length ? formatKcal(totalFoodCalories) : "—"],
                ]}
                emptyTitle="No food records available."
                emptyText="Meals logged for this journey will appear here."
                hasData={journeyFoods.length > 0}
              />
              <SummaryPanel
                title="Exercise Summary"
                items={[
                  ["Total workouts", journeyExercises.length],
                  ["Calories burned", journeyExercises.length ? formatKcal(totalExerciseCalories) : "—"],
                  ["Categories", journeyExercises.length ? countExerciseCategories(journeyExercises) : "—"],
                ]}
                emptyTitle="No workouts recorded for this journey."
                emptyText="Exercise records for this journey will appear here."
                hasData={journeyExercises.length > 0}
              />
            </div>

            <section className="journey-overview-card">
              <h2>Journey Highlights</h2>
              <div className="journey-highlights-grid">
                <HighlightCard icon="▢" label="Weight Lost" value={formatWeightLost(startWeight, currentWeight)} />
                <HighlightCard icon="◌" label="Total Calories Logged" value={journeyFoods.length ? formatNumber(totalFoodCalories) : "—"} />
                <HighlightCard icon="✦" label="Total Workouts" value={journeyExercises.length ? journeyExercises.length : "—"} />
                <HighlightCard icon="▦" label="Days Tracked" value={trackedDays || "—"} />
              </div>
            </section>

            <section className="journey-info-card">
              <span aria-hidden="true">↗</span>
              <div>
                <h2>Journey Insight</h2>
                <p>{getJourneyInsight(canShowProgress, progress)}</p>
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  );
}

async function fetchJourneyData(userId, journeyId, resource) {
  const response = await fetch(`${API_BASE_URL}/api/users/${userId}/journeys/${journeyId}/${resource}`);
  const data = await response.json();

  if (!response.ok || data.success === false) {
    throw new Error(data.message || `Could not load journey ${resource}.`);
  }

  return data;
}

async function fetchOptionalJourneyData(userId, journeyId, resource) {
  try {
    return await fetchJourneyData(userId, journeyId, resource);
  } catch {
    return {};
  }
}

function JourneyFact({ label, value, highlight = false }) {
  return (
    <div className={highlight ? "journey-overview-fact is-highlight" : "journey-overview-fact"}>
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}

function SummaryMetric({ icon, label, value }) {
  return (
    <article className="journey-summary-card">
      <span aria-hidden="true">{icon}</span>
      <strong>{value || "—"}</strong>
      <p>{label}</p>
    </article>
  );
}

function SummaryPanel({ title, items, hasData, emptyTitle, emptyText }) {
  return (
    <section className="journey-overview-card journey-summary-panel">
      <div className="journey-overview-section-title">
        <h2>{title}</h2>
        <span>All Time</span>
      </div>
      {hasData ? (
        <div className="journey-panel-list">
          {items.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      ) : (
        <JourneyEmptyState title={emptyTitle} text={emptyText} />
      )}
    </section>
  );
}

function HighlightCard({ icon, label, value }) {
  return (
    <article className="journey-highlight-card">
      <span aria-hidden="true">{icon}</span>
      <strong>{value}</strong>
      <p>{label}</p>
    </article>
  );
}

function JourneyEmptyState({ title, text, tone = "default" }) {
  return (
    <section className={`journey-overview-empty-state tone-${tone}`}>
      <span aria-hidden="true">□</span>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </section>
  );
}

function getGoalProgress(startingWeight, latestWeight, targetWeight) {
  if (!startingWeight || !latestWeight || !targetWeight || startingWeight === targetWeight) {
    return null;
  }

  const totalNeeded = Math.abs(startingWeight - targetWeight);
  const completed = Math.abs(startingWeight - latestWeight);

  return Math.min(Math.max((completed / totalNeeded) * 100, 0), 100);
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

function getStoredJourneySnapshot(user, journeyId) {
  if (!user?.id || !journeyId) {
    return null;
  }

  const rawSnapshot = localStorage.getItem(`cutsmart_journey_snapshot_${user.id}_${journeyId}`);

  if (!rawSnapshot) {
    return null;
  }

  try {
    return JSON.parse(rawSnapshot);
  } catch {
    return null;
  }
}

function getArchivedWeightHistory(backendWeights, snapshotWeights, localWeights) {
  if (snapshotWeights.length > 0) {
    return snapshotWeights;
  }

  if (backendWeights.length > 1) {
    return backendWeights;
  }

  if (localWeights.length > backendWeights.length) {
    return localWeights;
  }

  return backendWeights;
}

function getJourneyInsight(canShowProgress, progress) {
  if (!canShowProgress) {
    return "Stay consistent and keep building healthy habits.";
  }

  return progress >= 100
    ? "This journey has reached its target progress."
    : "Your logged progress is moving toward the target.";
}

function formatTimelineWeeks(plan) {
  const weeks = plan?.recommended_timeline_weeks || plan?.desired_timeline_weeks;

  if (!weeks) {
    return "Not Available";
  }

  return `${formatNumber(weeks)} ${Number(weeks) === 1 ? "week" : "weeks"}`;
}

function formatWeightLost(startWeight, currentWeight) {
  if (!startWeight || !currentWeight) {
    return "—";
  }

  return `${formatNumber(Math.max(Number(startWeight) - Number(currentWeight), 0))} kg`;
}

function formatRemainingWeight(currentWeight, targetWeight) {
  if (!currentWeight || !targetWeight) {
    return "—";
  }

  return `${formatNumber(Math.abs(Number(currentWeight) - Number(targetWeight)))} kg`;
}

function countExerciseCategories(exercises) {
  const categories = new Set(
    exercises.map((exercise) => exercise.category || exercise.exercise_type || "other")
  );

  return categories.size;
}

function countUniqueDates(dates) {
  return new Set(dates.filter(Boolean)).size;
}

function sumBy(items, field) {
  return items.reduce((total, item) => total + Number(item[field] || 0), 0);
}

function formatKcal(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return `${formatNumber(value)} kcal`;
}

function formatGram(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return `${formatNumber(value)} g`;
}

function formatKg(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return `${formatNumber(value)} kg`;
}

function formatDate(value) {
  if (!value) {
    return "Not Available";
  }

  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatLabel(value) {
  if (!value) {
    return "Not Available";
  }

  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 1,
  });
}

export default JourneyOverview;
