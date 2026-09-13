import { pool } from "../db.js";

const categories = ["intellect", "strength", "discipline", "creativity"];
const difficulties = ["easy", "normal", "hard", "epic"];
const weekdays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];

function zeroDistribution(values) {
  return values.reduce((distribution, value) => {
    distribution[value] = 0;
    return distribution;
  }, {});
}

function toInteger(value) {
  return Number(value) || 0;
}

function getTopDistributionValue(distribution) {
  const entries = Object.entries(distribution).filter(([, value]) => value > 0);

  if (!entries.length) {
    return null;
  }

  return entries.sort(
    ([firstName, firstValue], [secondName, secondValue]) =>
      secondValue - firstValue ||
      categories.indexOf(firstName) - categories.indexOf(secondName)
  )[0][0];
}

function getMostProductiveDay(activity) {
  const counts = zeroDistribution(weekdays);

  for (const item of activity) {
    const date = new Date(`${item.date}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) {
      continue;
    }
    counts[weekdays[date.getUTCDay()]] += toInteger(item.quests_completed);
  }

  const entries = Object.entries(counts).filter(([, value]) => value > 0);
  if (!entries.length) {
    return null;
  }

  return entries.sort(
    ([firstDay, firstValue], [secondDay, secondValue]) =>
      secondValue - firstValue ||
      weekdays.indexOf(firstDay) - weekdays.indexOf(secondDay)
  )[0][0];
}

function calculateTrend(current, previous) {
  if (
    !previous ||
    (previous.quests_completed === 0 && previous.xp_earned === 0)
  ) {
    return {
      direction: "insufficient_data",
      quests_change: null,
      xp_change: null,
      previous_period_available: false
    };
  }

  const questsChange =
    previous.quests_completed === 0
      ? null
      : Number(
          (
            ((current.quests_completed - previous.quests_completed) /
              previous.quests_completed) *
            100
          ).toFixed(2)
        );
  const xpChange =
    previous.xp_earned === 0
      ? null
      : Number(
          (
            ((current.xp_earned - previous.xp_earned) / previous.xp_earned) *
            100
          ).toFixed(2)
        );
  const currentScore = current.quests_completed + current.xp_earned;
  const previousScore = previous.quests_completed + previous.xp_earned;
  const direction =
    currentScore > previousScore
      ? "improving"
      : currentScore < previousScore
        ? "decreasing"
        : "stable";

  return {
    direction,
    quests_change: questsChange,
    xp_change: xpChange,
    previous_period_available: true
  };
}

function normalizeTotals(row = {}) {
  return {
    quests_completed: toInteger(row.quests_completed),
    xp_earned: toInteger(row.xp_earned),
    gold_earned: toInteger(row.gold_earned)
  };
}

function normalizeProfile(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    level: toInteger(row.level),
    total_xp: toInteger(row.total_xp),
    gold: toInteger(row.gold),
    current_streak: toInteger(row.current_streak),
    longest_streak: toInteger(row.longest_streak),
    last_activity_date: row.last_activity_date,
    attributes: {
      intellect: toInteger(row.intellect),
      strength: toInteger(row.strength),
      discipline: toInteger(row.discipline),
      creativity: toInteger(row.creativity)
    }
  };
}

async function getUserProfile(userId) {
  const result = await pool.query(
    `SELECT u.id, u.name, u.level, u.total_xp, u.gold,
            u.current_streak, u.longest_streak,
            u.last_activity_date::text AS last_activity_date,
            ca.intellect, ca.strength, ca.discipline, ca.creativity
     FROM users u
     LEFT JOIN character_attributes ca ON ca.user_id = u.id
     WHERE u.id = $1`,
    [userId]
  );

  return normalizeProfile(result.rows[0]);
}

async function getRecentTasks(userId) {
  const result = await pool.query(
    `SELECT title, description, category, difficulty, completed,
            completed_at::text AS completed_at,
            created_at::text AS created_at
     FROM tasks
     WHERE user_id = $1
     ORDER BY COALESCE(completed_at, created_at) DESC
     LIMIT 50`,
    [userId]
  );

  return result.rows;
}

async function getTaskSummary(userId) {
  const result = await pool.query(
    `SELECT COUNT(*) FILTER (WHERE completed = FALSE)::int AS active_quests,
            COUNT(*) FILTER (WHERE completed = TRUE)::int AS completed_quests,
            COUNT(*)::int AS total_quests
     FROM tasks
     WHERE user_id = $1`,
    [userId]
  );

  return {
    active_quests: toInteger(result.rows[0]?.active_quests),
    completed_quests: toInteger(result.rows[0]?.completed_quests),
    total_quests: toInteger(result.rows[0]?.total_quests)
  };
}

async function queryPeriodData(userId, days) {
  const [totalsResult, activityResult, distributionResult] = await Promise.all([
    pool.query(
      `SELECT period,
              COUNT(*)::int AS quests_completed,
              COALESCE(SUM(xp_reward), 0)::int AS xp_earned,
              COALESCE(SUM(gold_reward), 0)::int AS gold_earned
       FROM (
         SELECT CASE
                  WHEN completed_at >= CURRENT_DATE - ($2::integer - 1)
                    THEN 'current'
                  ELSE 'previous'
                END AS period,
                xp_reward,
                gold_reward
         FROM tasks
         WHERE user_id = $1
           AND completed = TRUE
           AND completed_at IS NOT NULL
           AND completed_at >= CURRENT_DATE - (($2::integer * 2) - 1)
       ) period_tasks
       GROUP BY period`,
      [userId, days]
    ),
    pool.query(
      `SELECT dates.activity_date::date::text AS date,
              COALESCE(uda.quests_completed, 0)::int AS quests_completed,
              COALESCE(uda.xp_earned, 0)::int AS xp_earned,
              COALESCE(uda.gold_earned, 0)::int AS gold_earned
       FROM generate_series(
              CURRENT_DATE - ($2::integer - 1),
              CURRENT_DATE,
              INTERVAL '1 day'
            ) AS dates(activity_date)
       LEFT JOIN user_daily_activity uda
         ON uda.user_id = $1 AND uda.activity_date = dates.activity_date::date
       ORDER BY dates.activity_date ASC`,
      [userId, days]
    ),
    pool.query(
      `SELECT category, difficulty, COUNT(*)::int AS quests_completed
       FROM tasks
       WHERE user_id = $1
         AND completed = TRUE
         AND completed_at IS NOT NULL
         AND completed_at >= CURRENT_DATE - ($2::integer - 1)
       GROUP BY category, difficulty`,
      [userId, days]
    )
  ]);

  const totalsByPeriod = totalsResult.rows.reduce((periods, row) => {
    periods[row.period] = normalizeTotals(row);
    return periods;
  }, {});
  const dailyActivity = activityResult.rows.map((row) => ({
    date: row.date,
    quests_completed: toInteger(row.quests_completed),
    xp_earned: toInteger(row.xp_earned),
    gold_earned: toInteger(row.gold_earned)
  }));
  const categoryDistribution = zeroDistribution(categories);
  const difficultyDistribution = zeroDistribution(difficulties);

  for (const row of distributionResult.rows) {
    categoryDistribution[row.category] =
      (categoryDistribution[row.category] || 0) + toInteger(row.quests_completed);
    difficultyDistribution[row.difficulty] =
      (difficultyDistribution[row.difficulty] || 0) + toInteger(row.quests_completed);
  }

  return {
    current: totalsByPeriod.current || normalizeTotals(),
    previous: totalsByPeriod.previous || normalizeTotals(),
    dailyActivity,
    categoryDistribution,
    difficultyDistribution
  };
}

function buildOverviewAnalytics(profile, data) {
  const current = data.current;
  const activeDays = data.dailyActivity.filter(
    (item) => item.quests_completed > 0
  ).length;

  return {
    profile,
    current,
    previous: data.previous,
    daily_activity: data.dailyActivity,
    category_distribution: data.categoryDistribution,
    difficulty_distribution: data.difficultyDistribution,
    average_quests_per_active_day: activeDays
      ? Number((current.quests_completed / activeDays).toFixed(2))
      : 0,
    active_days: activeDays,
    most_productive_day: getMostProductiveDay(data.dailyActivity),
    top_category: getTopDistributionValue(data.categoryDistribution),
    trend: calculateTrend(current, data.previous)
  };
}

export async function getOverviewAnalytics(userId, days = 30) {
  const [profile, data] = await Promise.all([
    getUserProfile(userId),
    queryPeriodData(userId, days)
  ]);

  return buildOverviewAnalytics(profile, data);
}

export async function getWeeklyAnalytics(userId) {
  const overview = await getOverviewAnalytics(userId, 7);
  const weeklyChange = overview.trend.previous_period_available
    ? {
        quests: overview.trend.quests_change,
        xp: overview.trend.xp_change
      }
    : null;

  return {
    quests_completed: overview.current.quests_completed,
    xp_earned: overview.current.xp_earned,
    gold_earned: overview.current.gold_earned,
    most_active_day: overview.most_productive_day,
    top_category: overview.top_category,
    current_streak: overview.profile?.current_streak ?? 0,
    longest_streak: overview.profile?.longest_streak ?? 0,
    weekly_change: weeklyChange
  };
}

export async function getUserContext(userId, days = 30) {
  const [profile, recentQuests, taskSummary, data] = await Promise.all([
    getUserProfile(userId),
    getRecentTasks(userId),
    getTaskSummary(userId),
    queryPeriodData(userId, days)
  ]);
  const overview = buildOverviewAnalytics(profile, data);

  return {
    profile,
    recent_quests: recentQuests,
    task_summary: taskSummary,
    analytics: overview
  };
}

export function getWeakestAttribute(attributes = {}) {
  const normalized = categories.reduce((result, category) => {
    result[category] = toInteger(attributes?.[category]);
    return result;
  }, {});

  return categories.reduce((weakest, category) => {
    if (normalized[category] < normalized[weakest]) {
      return category;
    }
    return weakest;
  }, categories[0]);
}

export function getAttributeBalance(attributes = {}) {
  const values = categories.map((category) => toInteger(attributes?.[category]));
  const highest = Math.max(...values);
  const lowest = Math.min(...values);
  const spread = highest - lowest;

  return {
    strongest: categories[values.indexOf(highest)],
    weakest: categories[values.indexOf(lowest)],
    spread,
    balanced: spread <= 1
  };
}

export function getCategories() {
  return [...categories];
}

export function getDifficulties() {
  return [...difficulties];
}
