const oneDayMs = 24 * 60 * 60 * 1000;

function asUtcDay(value) {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatUtcDay(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

export function getIsoWeekStart(value) {
  const date = asUtcDay(value);

  if (!date) {
    return null;
  }

  const day = date.getUTCDay() || 7;
  return formatUtcDay(addDays(date, 1 - day));
}

export function isHabitDueOnDate(habit, value) {
  const date = asUtcDay(value);

  if (!date || !habit?.active) {
    return false;
  }

  if (habit.frequency === `daily` || habit.frequency === `weekly`) {
    return true;
  }

  if (habit.frequency !== `custom`) {
    return false;
  }

  const day = date.getUTCDay() || 7;
  return (habit.custom_days || []).map(Number).includes(day);
}

function longestConsecutive(keys) {
  const sorted = [...new Set(keys)].sort();
  let longest = 0;
  let current = 0;
  let previous = null;

  for (const key of sorted) {
    const currentDate = asUtcDay(key);
    const previousDate = previous ? asUtcDay(previous) : null;
    const consecutive =
      currentDate &&
      previousDate &&
      Math.round((currentDate - previousDate) / oneDayMs) === 1;

    current = consecutive ? current + 1 : 1;
    longest = Math.max(longest, current);
    previous = key;
  }

  return longest;
}

function streakForDaily(completions, today) {
  const dates = new Set(completions);
  const todayDate = asUtcDay(today);
  let current = 0;
  let cursor = todayDate;

  while (cursor && dates.has(formatUtcDay(cursor))) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  return {
    current_streak: current,
    longest_streak: longestConsecutive(completions)
  };
}

function completedWeeks(habit, completions) {
  const counts = new Map();

  for (const completion of completions) {
    const week = getIsoWeekStart(completion);
    if (!week) {
      continue;
    }

    const dates = counts.get(week) || new Set();
    dates.add(completion);
    counts.set(week, dates);
  }

  const required =
    habit.frequency === `custom`
      ? new Set((habit.custom_days || []).map(Number)).size
      : Number(habit.weekly_target) || 1;

  return [...counts.entries()]
    .filter(([, dates]) => dates.size >= required)
    .map(([week]) => week);
}

function streakForWeeklySchedule(habit, completions, today) {
  const weeks = completedWeeks(habit, completions);
  const completed = new Set(weeks);
  let cursor = getIsoWeekStart(today);
  let current = 0;

  while (cursor && completed.has(cursor)) {
    current += 1;
    cursor = formatUtcDay(addDays(asUtcDay(cursor), -7));
  }

  return {
    current_streak: current,
    longest_streak: longestConsecutive(weeks)
  };
}

export function calculateHabitStreak(habit, completionDates, today) {
  const completions = [...new Set(completionDates || [])].filter(asUtcDay);

  if (habit?.frequency === `daily`) {
    return streakForDaily(completions, today);
  }

  return streakForWeeklySchedule(habit, completions, today);
}
