export const journeyThemes = {
  exercise: {
    key: "exercise",
    label: "Exercise focused",
    icon: "⚡",
    eyebrow: "ENERGY PATH",
    mood: "Build momentum one session at a time.",
    message: "Keep moving, you are getting stronger.",
    colors: {
      primary: "#2563eb",
      secondary: "#7c3aed",
      accent: "#a3e635",
      soft: "#eaf2ff",
      glow: "rgba(37, 99, 235, 0.28)",
      panel: "linear-gradient(135deg, #eff6ff 0%, #f5f3ff 52%, #ecfccb 100%)",
      hero: "linear-gradient(140deg, #13235f 0%, #2746e8 48%, #9be83c 100%)",
    },
    decorations: ["🏋️", "👟", "🏀", "⏱️"],
    toneWords: ["Action", "Power", "Focus"],
    companionKey: "fireSpirit",
  },
  diet: {
    key: "diet",
    label: "Diet focused",
    icon: "🥗",
    eyebrow: "FRESH PATH",
    mood: "Small clean choices are stacking up.",
    message: "Keep it fresh, you are getting closer.",
    colors: {
      primary: "#0f9f6e",
      secondary: "#22c55e",
      accent: "#fde68a",
      soft: "#e7f8f4",
      glow: "rgba(15, 159, 110, 0.24)",
      panel: "linear-gradient(135deg, #ecfdf5 0%, #ccfbf1 54%, #fef9c3 100%)",
      hero: "linear-gradient(140deg, #064e3b 0%, #10b981 54%, #f6d365 100%)",
    },
    decorations: ["🥗", "🍋", "🍓", "🌿"],
    toneWords: ["Fresh", "Clean", "Steady"],
    companionKey: "plantBuddy",
  },
  balanced: {
    key: "balanced",
    label: "Balanced",
    icon: "⚖️",
    eyebrow: "BALANCED PATH",
    mood: "Food and movement are working together.",
    message: "Keep going, you are getting closer.",
    colors: {
      primary: "#0ea5e9",
      secondary: "#22c55e",
      accent: "#fb7185",
      soft: "#eef8ff",
      glow: "rgba(14, 165, 233, 0.24)",
      panel: "linear-gradient(135deg, #ecfeff 0%, #f0fdf4 42%, #fff7ed 72%, #fdf2f8 100%)",
      hero: "linear-gradient(140deg, #075985 0%, #10b981 38%, #fb7185 72%, #f97316 100%)",
    },
    decorations: ["🥗", "🏃", "🍊", "💧"],
    toneWords: ["Balanced", "Bright", "Consistent"],
    companionKey: "cloudBuddy",
  },
};

// Mascots use emoji placeholders today. Keep these keys stable when you later
// replace each stage with image assets so existing theme links keep working.
export const companions = {
  plantBuddy: {
    name: "Plant Buddy",
    imageAlt: "Plant Buddy companion",
    stages: [
      { label: "Sprout", icon: "🌱", scale: 0.86 },
      { label: "Bloom", icon: "🌿", scale: 1 },
      { label: "Strong Bloom", icon: "🪴", scale: 1.12 },
      { label: "Evolved Bloom", icon: "🌳", scale: 1.24 },
    ],
  },
  fireSpirit: {
    name: "Fire Spirit",
    imageAlt: "Fire Spirit companion",
    stages: [
      { label: "Spark", icon: "✨", scale: 0.86 },
      { label: "Flame", icon: "🔥", scale: 1 },
      { label: "Power Flame", icon: "⚡", scale: 1.12 },
      { label: "Evolved Flame", icon: "🏆", scale: 1.24 },
    ],
  },
  cloudBuddy: {
    name: "Cloud Buddy",
    imageAlt: "Cloud Buddy companion",
    stages: [
      { label: "Mist", icon: "☁️", scale: 0.86 },
      { label: "Bright Cloud", icon: "💧", scale: 1 },
      { label: "Glow Cloud", icon: "🌈", scale: 1.12 },
      { label: "Evolved Cloud", icon: "⭐", scale: 1.24 },
    ],
  },
  waterDrop: {
    name: "Water Drop",
    imageAlt: "Water Drop companion",
    stages: [
      { label: "Drop", icon: "💧", scale: 0.86 },
      { label: "Splash", icon: "💦", scale: 1 },
      { label: "Wave", icon: "🌊", scale: 1.12 },
      { label: "Evolved Wave", icon: "🫧", scale: 1.24 },
    ],
  },
  animalBuddy: {
    name: "Animal Buddy",
    imageAlt: "Animal Buddy companion",
    stages: [
      { label: "Cub", icon: "🐾", scale: 0.86 },
      { label: "Active Cub", icon: "🐻", scale: 1 },
      { label: "Trail Mate", icon: "🦊", scale: 1.12 },
      { label: "Evolved Mate", icon: "🦁", scale: 1.24 },
    ],
  },
};

export function getJourneyTheme(strategy) {
  return journeyThemes[strategy] || journeyThemes.balanced;
}

export function getProgressStage(progressPercent) {
  if (progressPercent >= 82) {
    return 4;
  }

  if (progressPercent >= 56) {
    return 3;
  }

  if (progressPercent >= 28) {
    return 2;
  }

  return 1;
}

export function buildJourneyMilestones(plan) {
  const totalWeeks = Math.max(12, Math.ceil(Number(plan?.recommended_timeline_weeks) || 12));
  const currentWeek = getCurrentJourneyWeek(plan, totalWeeks);
  const rawWeeks = [1, 3, 6, 9, 12].map((week) => Math.min(week, totalWeeks));
  const weeks = [...new Set(rawWeeks)];

  if (!weeks.includes(totalWeeks)) {
    weeks[weeks.length - 1] = totalWeeks;
  }

  return weeks.map((week, index) => {
    let status = "locked";

    if (week < currentWeek) {
      status = "complete";
    } else if (week === currentWeek || index === getClosestMilestoneIndex(weeks, currentWeek)) {
      status = "current";
    }

    return {
      id: `week-${week}`,
      title: week === totalWeeks ? "Goal" : `Week ${week}`,
      caption: getMilestoneCaption(index, week === totalWeeks),
      week,
      status,
      progress: Math.round((week / totalWeeks) * 100),
    };
  });
}

function getCurrentJourneyWeek(plan, totalWeeks) {
  const timelineStatus = plan?.timeline_status;

  if (timelineStatus === "accepted") {
    return Math.min(6, totalWeeks);
  }

  if (timelineStatus === "adjusted") {
    return Math.min(3, totalWeeks);
  }

  return Math.min(1, totalWeeks);
}

function getClosestMilestoneIndex(weeks, currentWeek) {
  return weeks.reduce((closestIndex, week, index) => {
    const closestDistance = Math.abs(weeks[closestIndex] - currentWeek);
    const distance = Math.abs(week - currentWeek);
    return distance < closestDistance ? index : closestIndex;
  }, 0);
}

function getMilestoneCaption(index, isGoal) {
  if (isGoal) {
    return "Target reached";
  }

  const captions = [
    "Start line",
    "Routine forming",
    "Momentum lift",
    "Visible progress",
    "Final stretch",
  ];

  return captions[index] || "Next milestone";
}
