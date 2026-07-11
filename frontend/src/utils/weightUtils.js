export function getStartWeight({ weights = [], plan = null, journey = null } = {}) {
  return toNumber(journey?.initial_weight_kg ?? plan?.current_weight_kg ?? getChartData(weights)[0]?.weight_kg);
}

export function getLatestWeight(weights = []) {
  const chartData = getChartData(weights);
  return chartData.length ? toNumber(chartData[chartData.length - 1].weight_kg) : null;
}

export function getHighestWeight(weights = []) {
  const chartData = getChartData(weights);

  if (chartData.length === 0) {
    return null;
  }

  return chartData.reduce((highest, entry) =>
    toNumber(entry.weight_kg) > toNumber(highest.weight_kg) ? entry : highest
  );
}

export function getLowestWeight(weights = []) {
  const chartData = getChartData(weights);

  if (chartData.length === 0) {
    return null;
  }

  return chartData.reduce((lowest, entry) =>
    toNumber(entry.weight_kg) < toNumber(lowest.weight_kg) ? entry : lowest
  );
}

export function getAverageWeight(weights = []) {
  const chartData = getChartData(weights);

  if (chartData.length === 0) {
    return null;
  }

  const total = chartData.reduce((sum, entry) => sum + toNumber(entry.weight_kg), 0);
  return total / chartData.length;
}

export function getWeightLost(startWeight, currentWeight) {
  const start = toNumber(startWeight);
  const current = toNumber(currentWeight);

  if (!isValidNumber(start) || !isValidNumber(current)) {
    return null;
  }

  return Math.max(start - current, 0);
}

export function getRemainingWeight(currentWeight, targetWeight) {
  const current = toNumber(currentWeight);
  const target = toNumber(targetWeight);

  if (!isValidNumber(current) || !isValidNumber(target)) {
    return null;
  }

  return Math.max(current - target, 0);
}

export function getProgressPercent(startWeight, currentWeight, targetWeight) {
  const start = toNumber(startWeight);
  const current = toNumber(currentWeight);
  const target = toNumber(targetWeight);

  if (!isValidNumber(start) || !isValidNumber(current) || !isValidNumber(target) || start === target) {
    return 0;
  }

  const progress = ((start - current) / (start - target)) * 100;
  return clamp(progress, 0, 100);
}

export function getWeightChange(startWeight, currentWeight) {
  const start = toNumber(startWeight);
  const current = toNumber(currentWeight);

  if (!isValidNumber(start) || !isValidNumber(current)) {
    return null;
  }

  return current - start;
}

export function getChartData(weights = []) {
  return [...weights]
    .filter((entry) => isValidNumber(toNumber(entry?.weight_kg)) && entry?.logged_date)
    .sort((a, b) => {
      const dateOrder = a.logged_date.localeCompare(b.logged_date);

      if (dateOrder !== 0) {
        return dateOrder;
      }

      return Number(b.is_initial || 0) - Number(a.is_initial || 0);
    });
}

export function getWeightStats({ weights = [], plan = null, journey = null } = {}) {
  const chartData = getChartData(weights);
  const startWeight = getStartWeight({ weights: chartData, plan, journey });
  const latestWeight = getLatestWeight(chartData) ?? startWeight;
  const targetWeight = toNumber(journey?.target_weight_kg ?? plan?.target_weight_kg);
  const highestEntry = getHighestWeight(chartData);
  const lowestEntry = getLowestWeight(chartData);

  return {
    chartData,
    startWeight,
    latestWeight,
    targetWeight,
    highestEntry,
    lowestEntry,
    highestWeight: highestEntry ? toNumber(highestEntry.weight_kg) : null,
    lowestWeight: lowestEntry ? toNumber(lowestEntry.weight_kg) : null,
    averageWeight: getAverageWeight(chartData),
    weightLost: getWeightLost(startWeight, latestWeight),
    remainingWeight: getRemainingWeight(latestWeight, targetWeight),
    progressPercent: getProgressPercent(startWeight, latestWeight, targetWeight),
    weightChange: getWeightChange(startWeight, latestWeight),
  };
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function isValidNumber(value) {
  return value !== null && value !== undefined && Number.isFinite(Number(value));
}

function clamp(value, min, max) {
  return Math.min(Math.max(Number(value) || 0, min), max);
}
