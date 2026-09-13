const millisecondsPerDay = 24 * 60 * 60 * 1000;
const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDateString(value) {
  const match = datePattern.exec(value);

  if (!match) {
    throw new RangeError("Calendar date must use YYYY-MM-DD format");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new RangeError("Calendar date is invalid");
  }

  return { year, month, day };
}

export function getUtcDateString(date = new Date()) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new RangeError("Date must be valid");
  }

  // Streak calendar boundaries are UTC midnight, independent of server locale.
  return date.toISOString().slice(0, 10);
}

function toCalendarDate(value) {
  if (value instanceof Date) {
    return getUtcDateString(value);
  }

  if (typeof value === "string") {
    parseDateString(value);
    return value;
  }

  throw new RangeError("Calendar date must be a Date or YYYY-MM-DD string");
}

function toDayNumber(value) {
  const calendarDate = toCalendarDate(value);
  const { year, month, day } = parseDateString(calendarDate);

  return Date.UTC(year, month - 1, day) / millisecondsPerDay;
}

export function isSameDay(firstDate, secondDate) {
  return toCalendarDate(firstDate) === toCalendarDate(secondDate);
}

export function isYesterday(date, referenceDate = getUtcDateString()) {
  return toDayNumber(referenceDate) - toDayNumber(date) === 1;
}

function assertNonNegativeInteger(value, name) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative safe integer`);
  }
}

export function updateStreak({
  currentStreak,
  longestStreak,
  lastActivityDate,
  today = getUtcDateString()
}) {
  assertNonNegativeInteger(currentStreak, "currentStreak");
  assertNonNegativeInteger(longestStreak, "longestStreak");

  const todayDate = toCalendarDate(today);
  let nextCurrentStreak = currentStreak;

  if (!lastActivityDate) {
    nextCurrentStreak = 1;
  } else if (isSameDay(lastActivityDate, todayDate)) {
    nextCurrentStreak = Math.max(currentStreak, 1);
  } else if (isYesterday(lastActivityDate, todayDate)) {
    nextCurrentStreak = currentStreak + 1;
  } else {
    nextCurrentStreak = 1;
  }

  const nextLongestStreak = Math.max(longestStreak, nextCurrentStreak);

  return {
    currentStreak: nextCurrentStreak,
    longestStreak: nextLongestStreak,
    lastActivityDate: todayDate,
    updated:
      nextCurrentStreak !== currentStreak ||
      nextLongestStreak !== longestStreak ||
      !lastActivityDate ||
      !isSameDay(lastActivityDate, todayDate)
  };
}
