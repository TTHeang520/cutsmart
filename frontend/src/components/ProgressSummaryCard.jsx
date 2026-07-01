function ProgressSummaryCard({ label, value, caption, icon }) {
  return (
    <article className="progress-summary-card">
      <div className="progress-summary-icon" aria-hidden="true">
        {icon}
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
      {caption && <p>{caption}</p>}
    </article>
  );
}

export default ProgressSummaryCard;
