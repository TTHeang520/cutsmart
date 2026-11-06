// Shown before any action that archives the current journey and starts a new one.
function ConfirmStartJourneyModal({ onCancel, onConfirm }) {
  return (
    <div className="dashboard-modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <section
        className="dashboard-plan-modal dashboard-confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="start-journey-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="dashboard-modal-header">
          <div>
            <span className="daily-dashboard-eyebrow">New journey</span>
            <h2 id="start-journey-title">Start New Journey?</h2>
          </div>
          <button type="button" onClick={onCancel} aria-label="Close confirmation">×</button>
        </div>

        <p className="dashboard-confirm-copy">
          Your current journey will be archived and a new one started. Previous journeys stay in
          Journey History, and your calendar and streak keep your past logs.
        </p>

        <div className="dashboard-modal-actions">
          <button type="button" onClick={onCancel}>Cancel</button>
          <button type="button" onClick={onConfirm}>Start Journey</button>
        </div>
      </section>
    </div>
  );
}

export default ConfirmStartJourneyModal;
