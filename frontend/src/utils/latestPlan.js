import { useEffect, useState } from "react";
import { apiFetch } from "./api";

// The browser keeps a copy of the latest plan so pages render instantly; the server is the source of truth.
function getLatestPlanKey(userId) {
  return `cutsmart_latest_plan_${userId}`;
}

export function readCachedPlan(userId) {
  if (!userId) {
    return null;
  }

  try {
    return JSON.parse(localStorage.getItem(getLatestPlanKey(userId))) || null;
  } catch {
    return null;
  }
}

export function cachePlan(userId, plan) {
  if (!userId) {
    return;
  }

  if (plan) {
    localStorage.setItem(getLatestPlanKey(userId), JSON.stringify(plan));
  } else {
    localStorage.removeItem(getLatestPlanKey(userId));
  }
}

// Returns { plan }, { missing: true } when the server has none, or null when it is unreachable.
export async function fetchLatestPlan(userId) {
  try {
    const response = await apiFetch(`/api/plans/latest/${userId}`);

    if (response.status === 404) {
      return { missing: true };
    }

    const data = await response.json();
    return response.ok && data.plan ? { plan: data.plan } : null;
  } catch {
    return null;
  }
}

// Starts from the cached plan, then replaces it with the server's copy (or clears it if there is none).
export function useLatestPlan(userId) {
  const [plan, setPlan] = useState(() => readCachedPlan(userId));
  const [isChecking, setIsChecking] = useState(Boolean(userId));

  useEffect(() => {
    if (!userId) {
      return;
    }

    let isCurrent = true;

    fetchLatestPlan(userId).then((result) => {
      if (!isCurrent) {
        return;
      }

      if (result?.plan) {
        cachePlan(userId, result.plan);
        setPlan(result.plan);
      } else if (result?.missing) {
        cachePlan(userId, null);
        setPlan(null);
      }

      setIsChecking(false);
    });

    return () => {
      isCurrent = false;
    };
  }, [userId]);

  return { plan, isChecking };
}
