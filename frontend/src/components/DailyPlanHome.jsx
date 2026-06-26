function DailyPlanHome({ plan, theme, onCreateAnotherPlan, onOpenExerciseTrack }) {
  return (
    <section className={`daily-home daily-theme-${plan.strategy}`}>
      <div className="daily-hero">
        <div>
          <span className="daily-eyebrow">Today Hub</span>
          <h2>Daily Plan Home</h2>
          <p>
            Your plan is ready. Now CutSmart turns it into small daily actions.
          </p>
        </div>
        <div className="daily-island" aria-hidden="true">
          <span>{theme.icon}</span>
        </div>
      </div>

      <div className="daily-summary-grid">
        <DailyMetric label="Daily target" value={`${formatNumber(plan.target_calories)} kcal`} />
        <DailyMetric label="Diet deficit" value={`${formatNumber(plan.diet_deficit)} kcal`} />
        <DailyMetric label="Exercise deficit" value={`${formatNumber(plan.exercise_deficit)} kcal`} />
        <DailyMetric label="Strategy" value={formatLabel(plan.strategy)} />
        <DailyMetric
          label="Timeline"
          value={`${formatNumber(plan.recommended_timeline_weeks)} weeks`}
        />
        <DailyMetric label="Today’s streak" value="0 days" />
      </div>

      <div className="daily-action-grid">
        <DailyActionCard
          icon="🍱"
          title="Food Track"
          caption="Log what you ate and see how much room is left today."
          buttonText="Coming soon"
          disabled
        />
        <DailyActionCard
          icon="🏃"
          title="Exercise Track"
          caption="Choose a workout and chip away at today’s movement goal."
          buttonText="Open Exercise Track"
          onClick={onOpenExerciseTrack}
        />
        <DailyActionCard
          icon="⚖️"
          title="Weekly Weight Check"
          caption="Update your weight once a week so CutSmart can follow your progress."
          buttonText="Coming soon"
          disabled
        />
      </div>

      <div className="reward-card">
        <div>
          <span className="daily-eyebrow">Streak and reward</span>
          <h3>Current streak: 0 days</h3>
          <p>Today’s reward is waiting for your first check-in.</p>
        </div>
        <div className="reward-list">
          <span>80% complete: 🌸</span>
          <span>100% complete: 👑</span>
          <span>Missed 3 days: 😟</span>
          <span>Missed 5 days: 😠</span>
          <span>Missed 7 days: 😭</span>
        </div>
      </div>

      <div className="daily-footer-actions">
        <button type="button" className="secondary-button" onClick={onCreateAnotherPlan}>
          Create another plan
        </button>
      </div>
    </section>
  );
}

function DailyActionCard({ icon, title, caption, buttonText, disabled, onClick }) {
  return (
    <article className={disabled ? "daily-action-card disabled" : "daily-action-card"}>
      <div className="daily-action-icon" aria-hidden="true">{icon}</div>
      <h3>{title}</h3>
      <p>{caption}</p>
      <button type="button" disabled={disabled} onClick={onClick}>
        {buttonText}
      </button>
    </article>
  );
}

function DailyMetric({ label, value }) {
  return (
    <div className="daily-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatLabel(value) {
  if (!value) {
    return "-";
  }

  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatNumber(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: 1,
  });
}

export default DailyPlanHome;
