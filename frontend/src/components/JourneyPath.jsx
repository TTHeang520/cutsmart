import CompanionMascot from "./CompanionMascot";
import JourneyNode from "./JourneyNode";
import ThemeDecorations from "./ThemeDecorations";
import { buildJourneyMilestones } from "../data/journeyThemes";

function JourneyPath({ plan, theme, headline = "Your CutSmart journey", compact = false }) {
  const milestones = buildJourneyMilestones(plan);
  const currentIndex = Math.max(0, milestones.findIndex((milestone) => milestone.status === "current"));
  const currentMilestone = milestones[currentIndex] || milestones[0];
  const progressPercent = currentMilestone?.progress || 8;

  return (
    <section
      className={`journey-path ${compact ? "compact" : ""}`}
      style={{
        "--journey-primary": theme.colors.primary,
        "--journey-secondary": theme.colors.secondary,
        "--journey-accent": theme.colors.accent,
        "--journey-soft": theme.colors.soft,
        "--journey-glow": theme.colors.glow,
        "--journey-panel": theme.colors.panel,
        "--journey-hero": theme.colors.hero,
      }}
    >
      <ThemeDecorations decorations={theme.decorations} />
      <div className="journey-copy">
        <span className="journey-eyebrow">{theme.eyebrow}</span>
        <h2>{headline}</h2>
        <p>{theme.message}</p>
      </div>

      <div className="journey-map">
        <svg className="journey-line" viewBox="0 0 320 620" preserveAspectRatio="none" aria-hidden="true">
          <path
            className="journey-line-shadow"
            d="M158 594 C 48 488, 274 433, 166 330 C 74 242, 282 190, 154 34"
          />
          <path
            className="journey-line-glow"
            d="M158 594 C 48 488, 274 433, 166 330 C 74 242, 282 190, 154 34"
          />
        </svg>

        <div className="journey-node-list">
          {milestones.map((milestone) => (
            <JourneyNode
              key={milestone.id}
              milestone={milestone}
              isCurrent={milestone.id === currentMilestone.id}
            />
          ))}
        </div>

        <div className={`journey-companion-pin pin-${currentIndex}`}>
          <CompanionMascot
            companionKey={theme.companionKey}
            progressPercent={progressPercent}
            size={compact ? "medium" : "large"}
          />
        </div>
      </div>
    </section>
  );
}

export default JourneyPath;
