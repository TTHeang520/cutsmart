function JourneyNode({ milestone, isCurrent }) {
  const statusClass = `journey-node ${milestone.status}${isCurrent ? " is-current" : ""}`;
  const statusIcon = milestone.status === "complete" ? "✓" : milestone.status === "locked" ? "🔒" : "●";

  return (
    <div className={statusClass}>
      <div className="journey-node-orb" aria-hidden="true">
        {statusIcon}
      </div>
      <div className="journey-node-card">
        <span>{milestone.title}</span>
        <strong>{milestone.caption}</strong>
      </div>
    </div>
  );
}

export default JourneyNode;
