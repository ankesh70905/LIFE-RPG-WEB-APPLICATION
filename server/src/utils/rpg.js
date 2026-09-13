const XP_BASE = 100;

function assertPositiveInteger(value, name) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(`${name} must be a positive safe integer`);
  }
}

function normalizeTotalXp(totalXp) {
  if (!Number.isSafeInteger(totalXp) || totalXp < 0) {
    throw new RangeError("totalXp must be a non-negative safe integer");
  }

  return totalXp;
}

// This is the XP needed to advance from the supplied level to the next level.
export function xpRequiredForLevel(level) {
  assertPositiveInteger(level, "level");
  return XP_BASE * level ** 2;
}

// Lifetime XP thresholds are cumulative: reaching level N requires all
// previous level thresholds, so level 1 starts at 0 XP.
export function totalXpRequiredForLevel(level) {
  assertPositiveInteger(level, "level");

  const previousLevel = level - 1;
  return (
    (XP_BASE * previousLevel * level * (2 * previousLevel + 1)) / 6
  );
}

export function calculateLevel(totalXp) {
  const normalizedTotalXp = normalizeTotalXp(totalXp);
  let lowerLevel = 1;
  let upperLevel = 2;

  // Find a range containing the answer, then binary-search it. This remains
  // efficient even when a single reward crosses several levels.
  while (totalXpRequiredForLevel(upperLevel) <= normalizedTotalXp) {
    lowerLevel = upperLevel;
    upperLevel *= 2;
  }

  while (lowerLevel + 1 < upperLevel) {
    const midpoint = Math.floor((lowerLevel + upperLevel) / 2);

    if (totalXpRequiredForLevel(midpoint) <= normalizedTotalXp) {
      lowerLevel = midpoint;
    } else {
      upperLevel = midpoint;
    }
  }

  return lowerLevel;
}

export function getXpProgress(totalXp) {
  const normalizedTotalXp = normalizeTotalXp(totalXp);
  const level = calculateLevel(normalizedTotalXp);
  const currentLevelThreshold = totalXpRequiredForLevel(level);
  const xpForNextLevel = xpRequiredForLevel(level);
  const currentLevelXp = normalizedTotalXp - currentLevelThreshold;

  return {
    level,
    totalXp: normalizedTotalXp,
    currentLevelXp,
    xpForNextLevel,
    progress: currentLevelXp / xpForNextLevel
  };
}

export const getProgress = getXpProgress;
