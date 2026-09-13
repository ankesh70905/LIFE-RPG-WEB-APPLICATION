import { calculateLevel } from "../utils/rpg.js";
import { createNotification } from "../utils/notifications.js";

const definitions = Object.freeze([
  {
    key: `daily_quests`,
    cadence: `daily`,
    metric: `quest_count`,
    title: `Daily Quest Sprint`,
    description: `Complete 2 quests today.`,
    target: 2,
    xp: 15,
    gold: 4
  },
  {
    key: `daily_habit`,
    cadence: `daily`,
    metric: `habit_count`,
    title: `Daily Ritual`,
    description: `Complete one habit today.`,
    target: 1,
    xp: 8,
    gold: 2
  },
  {
    key: `weekly_quests`,
    cadence: `weekly`,
    metric: `quest_count`,
    title: `Weekly Adventurer`,
    description: `Complete 8 quests this week.`,
    target: 8,
    xp: 50,
    gold: 15
  }
]);

function getUtcDate() {
  return new Date().toISOString().slice(0, 10);
}

function addUtcDays(value, days) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function mondayFor(value) {
  const date = new Date(`${value}T00:00:00Z`);
  const weekday = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - weekday + 1);
  return date.toISOString().slice(0, 10);
}

function periodFor(cadence, today) {
  if (cadence === `daily`) {
    return { starts_on: today, ends_on: today };
  }

  const starts_on = mondayFor(today);
  return { starts_on, ends_on: addUtcDays(starts_on, 6) };
}

export async function ensureCurrentChallenges(client, userId, today = getUtcDate()) {
  for (const definition of definitions) {
    const period = periodFor(definition.cadence, today);

    await client.query(
      `INSERT INTO user_challenges (
         user_id, challenge_key, cadence, metric, title, description, target,
         xp_reward, gold_reward, starts_on, ends_on
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (user_id, challenge_key, starts_on) DO NOTHING`,
      [
        userId,
        definition.key,
        definition.cadence,
        definition.metric,
        definition.title,
        definition.description,
        definition.target,
        definition.xp,
        definition.gold,
        period.starts_on,
        period.ends_on
      ]
    );
  }
}

export async function getCurrentChallenges(client, userId, today = getUtcDate()) {
  await ensureCurrentChallenges(client, userId, today);
  const result = await client.query(
    `SELECT id, challenge_key, cadence, metric, title, description, target, progress,
            xp_reward, gold_reward, starts_on::text, ends_on::text, completed_at,
            rewarded_at
     FROM user_challenges
     WHERE user_id = $1
       AND starts_on <= $2::date
       AND ends_on >= $2::date
     ORDER BY cadence, id`,
    [userId, today]
  );

  return result.rows;
}

export async function advanceChallenges(client, userId, increments, today = getUtcDate()) {
  await ensureCurrentChallenges(client, userId, today);
  const active = await client.query(
    `SELECT id, metric, target, progress, xp_reward, gold_reward, title,
            completed_at, rewarded_at
     FROM user_challenges
     WHERE user_id = $1
       AND starts_on <= $2::date
       AND ends_on >= $2::date
     FOR UPDATE`,
    [userId, today]
  );
  const completed = [];
  let xp = 0;
  let gold = 0;

  for (const challenge of active.rows) {
    const increment = Number(increments?.[challenge.metric] || 0);

    if (!increment || challenge.completed_at) {
      continue;
    }

    const progress = Math.min(challenge.target, challenge.progress + increment);
    const isComplete = progress >= challenge.target;
    const update = await client.query(
      `UPDATE user_challenges
       SET progress = $1,
           completed_at = CASE WHEN $2 THEN COALESCE(completed_at, CURRENT_TIMESTAMP) ELSE completed_at END,
           rewarded_at = CASE WHEN $2 THEN COALESCE(rewarded_at, CURRENT_TIMESTAMP) ELSE rewarded_at END
       WHERE id = $3
       RETURNING rewarded_at`,
      [progress, isComplete, challenge.id]
    );

    if (isComplete && !challenge.rewarded_at && update.rows[0].rewarded_at) {
      xp += challenge.xp_reward;
      gold += challenge.gold_reward;
      completed.push({
        id: challenge.id,
        title: challenge.title,
        xp: challenge.xp_reward,
        gold: challenge.gold_reward
      });
    }
  }

  return { xp, gold, completed };
}

export async function awardChallengeRewards(client, user, challengeResult) {
  if (!challengeResult.xp && !challengeResult.gold) {
    return {
      total_xp: user.total_xp,
      total_gold: user.gold,
      level: user.level
    };
  }

  const total_xp = user.total_xp + challengeResult.xp;
  const total_gold = user.gold + challengeResult.gold;
  const level = calculateLevel(total_xp);

  await client.query(
    `UPDATE users SET total_xp = $1, gold = $2, level = $3 WHERE id = $4`,
    [total_xp, total_gold, level, user.id]
  );

  for (const challenge of challengeResult.completed) {
    await createNotification(client, {
      userId: user.id,
      type: `system`,
      title: `Challenge Complete!`,
      message: `${challenge.title}: +${challenge.xp} XP and +${challenge.gold} gold.`
    });
  }

  return { total_xp, total_gold, level };
}
