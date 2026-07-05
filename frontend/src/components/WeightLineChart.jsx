import { useId } from "react";

function WeightLineChart({
  entries,
  compact = false,
  sampleWhenEmpty = true,
  emptyText = "Add two entries to see your own graph.",
  lineColor = "#d275ff",
  markerColor = "#c66bff",
  glowColor = "#c66bff",
}) {
  const chartId = useId().replace(/:/g, "");
  const chartEntries = entries.length > 0 ? entries : sampleWhenEmpty ? getSampleEntries() : [];

  if (chartEntries.length === 0) {
    return (
      <div className={compact ? "weight-chart-wrap weight-chart-compact-wrap" : "weight-chart-wrap"}>
        <div className="weight-chart-empty-state">{emptyText}</div>
      </div>
    );
  }

  const values = chartEntries.map((entry) => Number(entry.weight_kg));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const chartWidth = 720;
  const chartHeight = compact ? 190 : 300;
  const padding = compact
    ? { left: 32, right: 24, top: 24, bottom: 28 }
    : { left: 50, right: 30, top: 30, bottom: 45 };
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
  const points = pointList.map((point) => `${point.x},${point.y}`).join(" ");
  const gridLines = [padding.top, padding.top + innerHeight / 2, padding.top + innerHeight];
  const hasRealEntries = entries.length > 0;

  return (
    <div
      className={compact ? "weight-chart-wrap weight-chart-compact-wrap" : "weight-chart-wrap"}
      style={{
        "--weight-line-color": lineColor,
        "--weight-marker-color": markerColor,
        "--weight-marker-glow-color": glowColor,
      }}
    >
      {!hasRealEntries && sampleWhenEmpty && (
        <p className="weight-chart-empty-note">
          Sample trend shown. Add entries to see your own graph.
        </p>
      )}
      {!compact && (
        <div className="weight-chart-y-axis">
          <span>{formatNumber(max)} kg</span>
          <span>{formatNumber((max + min) / 2)} kg</span>
          <span>{formatNumber(min)} kg</span>
        </div>
      )}
      <svg
        className="weight-line-chart"
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        preserveAspectRatio="xMidYMid meet"
        aria-label="Weight trend line graph"
      >
        <defs>
          <filter id={`${chartId}-marker-glow`} x="-80%" y="-80%" width="260%" height="260%">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor={glowColor} floodOpacity="0.75" />
          </filter>
          <clipPath id={`${chartId}-chart-clip`}>
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
        <g clipPath={`url(#${chartId}-chart-clip)`}>
          {pointList.length > 1 && <polyline points={points} />}
        </g>
        <g className="weight-chart-markers">
          {pointList.map((point) => (
            <g
              className="weight-chart-marker"
              key={`${point.entry.logged_date}-${point.value}`}
              tabIndex="0"
              style={{ "--marker-glow": `url(#${chartId}-marker-glow)` }}
            >
              <circle cx={point.x} cy={point.y} r={compact ? "6" : "7"} />
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
      {!compact && (
        <div className="weight-chart-x-axis">
          {chartEntries.map((entry) => (
            <span key={entry.logged_date}>{formatShortDate(entry.logged_date)}</span>
          ))}
        </div>
      )}
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

function formatShortDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatNumber(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: 1,
  });
}

export default WeightLineChart;
