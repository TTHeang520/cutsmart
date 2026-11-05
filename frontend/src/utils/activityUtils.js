import { apiFetch } from "./api";
import { addDays } from "./dateUtils";

export async function fetchDailyActivity(userId, startDate, endDate) {
  const response = await apiFetch(`/api/activity/${userId}?start=${startDate}&end=${endDate}`);
  const data = await response.json().catch(() => ({
    success: false,
    message: `Activity API returned status ${response.status}.`,
  }));

  if (!response.ok || data.success === false) {
    throw new Error(data.message || "Could not load your activity.");
  }

  return Array.isArray(data.days) ? data.days : [];
}

// Consecutive days with any log, ending today. Today does not break the streak until it is over.
export function calculateStreak(days, today) {
  const activeDates = new Set(days.map((day) => day.date));
  let cursor = activeDates.has(today) ? today : addDays(today, -1);
  let streak = 0;

  while (activeDates.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

export function formatDayCount(count) {
  return `${count} ${count === 1 ? "day" : "days"}`;
}
