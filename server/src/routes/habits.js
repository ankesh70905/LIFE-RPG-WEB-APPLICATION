import { Router } from "express";
import { pool } from "../db.js";
import { authRequired } from "../middleware/auth.js";
import { logger } from "../utils/logger.js";
import { calculateLevel } from "../utils/rpg.js";
import { createNotification } from "../utils/notifications.js";
import {
  calculateHabitStreak,
  getIsoWeekStart,
  isHabitDueOnDate
} from "../utils/habitStreak.js";
import {
  advanceChallenges,
  awardChallengeRewards
} from "../services/challengeService.js";

const router = Router();
const categories = new Set([`intellect`, `strength`, `discipline`, `creativity`]);
const frequencies = new Set([`daily`, `weekly`, `custom`]);
const maximumId = 9223372036854775807n;

router.use(authRequired);

function error(res, status, message) {
  return res.status(status).json({ success: false, message });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function parseId(raw) {
  if (!/^[1-9]\d*$/.test(raw || ``) || raw.length > 19) return null;
  const id = BigInt(raw);
  return id <= maximumId ? id.toString() : null;
}

function normalizeDays(value) {
  if (!Array.isArray(value)) return null;
  const days = [...new Set(value.map(Number))].sort((a, b) => a - b);
  return days.length && days.every((day) => Number.isInteger(day) && day >= 1 && day <= 7)
    ? days
    : null;
}

function habitInput(body, existing = {}) {
  if (!body || typeof body !== `object` || Array.isArray(body)) return { error: `Request body must be an object` };
  const value = {
    title: existing.title,
    description: existing.description ?? null,
    category: existing.category || `discipline`,
    frequency: existing.frequency || `daily`,
    weekly_target: Number(existing.weekly_target) || 1,
    custom_days: (existing.custom_days || []).map(Number),
    active: existing.active ?? true,
    xp_reward: Number(existing.xp_reward) || 5,
    gold_reward: Number(existing.gold_reward) || 1
  };
  const fields = [`title`, `description`, `category`, `frequency`, `weekly_target`, `custom_days`, `active`, `xp_reward`, `gold_reward`];
  if (existing.id && !fields.some((field) => Object.hasOwn(body, field))) {
    return { error: `At least one editable habit field is required` };
  }
  if (Object.hasOwn(body, `title`)) {
    if (typeof body.title !== `string` || !body.title.trim() || body.title.trim().length > 200) return { error: `title is required and must be 200 characters or fewer` };
    value.title = body.title.trim();
  }
  if (!existing.id && !value.title) return { error: `title is required` };
  if (Object.hasOwn(body, `description`)) {
    if (typeof body.description !== `string` || body.description.trim().length > 2000) return { error: `description must be 2,000 characters or fewer` };
    value.description = body.description.trim() || null;
  }
  if (Object.hasOwn(body, `category`)) {
    if (typeof body.category !== `string` || !categories.has(body.category.trim().toLowerCase())) return { error: `Invalid habit category` };
    value.category = body.category.trim().toLowerCase();
  }
  if (Object.hasOwn(body, `frequency`)) {
    if (typeof body.frequency !== `string` || !frequencies.has(body.frequency.trim().toLowerCase())) return { error: `Invalid habit frequency` };
    value.frequency = body.frequency.trim().toLowerCase();
  }
  if (Object.hasOwn(body, `weekly_target`)) {
    if (!Number.isInteger(body.weekly_target) || body.weekly_target < 1 || body.weekly_target > 7) return { error: `weekly_target must be an integer from 1 to 7` };
    value.weekly_target = body.weekly_target;
  }
  if (Object.hasOwn(body, `custom_days`)) {
    const days = normalizeDays(body.custom_days);
    if (!days) return { error: `custom_days must contain unique ISO weekdays from 1 to 7` };
    value.custom_days = days;
  }
  if (Object.hasOwn(body, `active`)) {
    if (typeof body.active !== `boolean`) return { error: `active must be true or false` };
    value.active = body.active;
  }
  for (const key of [`xp_reward`, `gold_reward`]) {
    if (Object.hasOwn(body, key)) {
      const maximum = key === `xp_reward` ? 25 : 10;
      if (!Number.isInteger(body[key]) || body[key] < 0 || body[key] > maximum) {
        return { error: `${key} must be an integer from 0 to ${maximum}` };
      }
      value[key] = body[key];
    }
  }
  if (value.frequency === `custom` && !value.custom_days.length) {
    return { error: `custom habits require at least one scheduled weekday` };
  }
  return { value };
}

const columns = `id, title, description, category, frequency, weekly_target,
  custom_days, active, xp_reward, gold_reward, created_at, updated_at`;

async function ownedHabit(client, id, userId, lock = false) {
  const result = await client.query(
    `SELECT id, user_id, ${columns} FROM habits WHERE id = $1 AND user_id = $2${lock ? ' FOR UPDATE' : ''}`,
    [id, userId]
  );
  return result.rows[0] || null;
}

async function withStreak(client, habit, userId) {
  const completions = await client.query(
    `SELECT completion_date::text FROM habit_completions
     WHERE habit_id = $1 AND user_id = $2 ORDER BY completion_date DESC`,
    [habit.id, userId]
  );
  return {
    ...habit,
    custom_days: (habit.custom_days || []).map(Number),
    streak: calculateHabitStreak(
      habit,
      completions.rows.map((entry) => entry.completion_date),
      today()
    )
  };
}

router.get(`/`, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${columns} FROM habits WHERE user_id = $1 ORDER BY active DESC, created_at DESC`,
      [req.user.id]
    );
    const habits = await Promise.all(result.rows.map((habit) => withStreak(pool, habit, req.user.id)));
    return res.json({ success: true, habits });
  } catch (cause) {
    logger.error(`Fetching habits failed`, { error: cause });
    return error(res, 500, `Unable to fetch habits`);
  }
});

router.get(`/:id`, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return error(res, 400, `Invalid habit ID`);
  try {
    const habit = await ownedHabit(pool, id, req.user.id);
    if (!habit) return error(res, 404, `Habit not found`);
    return res.json({ success: true, habit: await withStreak(pool, habit, req.user.id) });
  } catch (cause) {
    logger.error(`Fetching habit failed`, { error: cause });
    return error(res, 500, `Unable to fetch habit`);
  }
});

router.post(`/`, async (req, res) => {
  const validated = habitInput(req.body);
  if (validated.error) return error(res, 400, validated.error);
  const value = validated.value;
  try {
    const result = await pool.query(
      `INSERT INTO habits (
         user_id, title, description, category, frequency, weekly_target, custom_days,
         active, xp_reward, gold_reward
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7::smallint[], $8, $9, $10)
       RETURNING ${columns}`,
      [req.user.id, value.title, value.description, value.category, value.frequency,
        value.weekly_target, value.custom_days, value.active, value.xp_reward, value.gold_reward]
    );
    return res.status(201).json({ success: true, message: `Habit created`, habit: await withStreak(pool, result.rows[0], req.user.id) });
  } catch (cause) {
    logger.error(`Creating habit failed`, { error: cause });
    return error(res, 500, `Unable to create habit`);
  }
});

router.put(`/:id`, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return error(res, 400, `Invalid habit ID`);
  try {
    const existing = await ownedHabit(pool, id, req.user.id);
    if (!existing) return error(res, 404, `Habit not found`);
    const validated = habitInput(req.body, existing);
    if (validated.error) return error(res, 400, validated.error);
    const value = validated.value;
    const result = await pool.query(
      `UPDATE habits
       SET title = $1, description = $2, category = $3, frequency = $4,
           weekly_target = $5, custom_days = $6::smallint[], active = $7,
           xp_reward = $8, gold_reward = $9
       WHERE id = $10 AND user_id = $11
       RETURNING ${columns}`,
      [value.title, value.description, value.category, value.frequency, value.weekly_target,
        value.custom_days, value.active, value.xp_reward, value.gold_reward, id, req.user.id]
    );
    return res.json({ success: true, habit: await withStreak(pool, result.rows[0], req.user.id) });
  } catch (cause) {
    logger.error(`Updating habit failed`, { error: cause });
    return error(res, 500, `Unable to update habit`);
  }
});

router.delete(`/:id`, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return error(res, 400, `Invalid habit ID`);
  try {
    const result = await pool.query(
      `DELETE FROM habits WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, req.user.id]
    );
    if (!result.rowCount) return error(res, 404, `Habit not found`);
    return res.json({ success: true, message: `Habit deleted` });
  } catch (cause) {
    logger.error(`Deleting habit failed`, { error: cause });
    return error(res, 500, `Unable to delete habit`);
  }
});

router.post(`/:id/complete`, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return error(res, 400, `Invalid habit ID`);
  let client;
  let active = false;
  try {
    client = await pool.connect();
    await client.query(`BEGIN`);
    active = true;
    const habit = await ownedHabit(client, id, req.user.id, true);
    if (!habit) {
      await client.query(`ROLLBACK`);
      active = false;
      return error(res, 404, `Habit not found`);
    }
    const completionDate = today();
    if (!habit.active || !isHabitDueOnDate(habit, completionDate)) {
      await client.query(`ROLLBACK`);
      active = false;
      return error(res, 409, `This habit is not scheduled for today`);
    }
    if (habit.frequency === `weekly`) {
      const count = await client.query(
        `SELECT COUNT(*)::int AS count FROM habit_completions
         WHERE habit_id = $1 AND completion_date >= $2::date AND completion_date < $2::date + INTERVAL '7 days'`,
        [habit.id, getIsoWeekStart(completionDate)]
      );
      if (count.rows[0].count >= habit.weekly_target) {
        await client.query(`ROLLBACK`);
        active = false;
        return error(res, 409, `This weekly habit already reached its target`);
      }
    }
    const userResult = await client.query(
      `SELECT id, total_xp, level, gold FROM users WHERE id = $1 FOR UPDATE`,
      [req.user.id]
    );
    const user = userResult.rows[0];
    const character = await client.query(
      `SELECT id FROM character_attributes WHERE user_id = $1 FOR UPDATE`,
      [req.user.id]
    );
    if (!user || !character.rowCount) throw new Error(`Habit completion profile is missing`);
    const inserted = await client.query(
      `INSERT INTO habit_completions (
         habit_id, user_id, completion_date, xp_earned, gold_earned
       )
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, completion_date::text, completed_at`,
      [habit.id, req.user.id, completionDate, habit.xp_reward, habit.gold_reward]
    );
    const challengeResult = await advanceChallenges(client, req.user.id, { habit_count: 1 }, completionDate);
    const baseXp = user.total_xp + habit.xp_reward;
    const baseGold = user.gold + habit.gold_reward;
    const baseLevel = calculateLevel(baseXp);
    await client.query(
      `UPDATE users SET total_xp = $1, gold = $2, level = $3 WHERE id = $4`,
      [baseXp, baseGold, baseLevel, user.id]
    );
    const finalProgression = await awardChallengeRewards(
      client,
      { ...user, total_xp: baseXp, gold: baseGold, level: baseLevel },
      challengeResult
    );
    await client.query(
      `UPDATE character_attributes SET ${habit.category} = ${habit.category} + 1 WHERE user_id = $1`,
      [req.user.id]
    );
    if (finalProgression.level > user.level) {
      await createNotification(client, {
        userId: req.user.id,
        type: `level_up`,
        title: `Level Up!`,
        message: `You reached level ${finalProgression.level}. Keep your rhythm going!`
      });
    }
    const completionDates = await client.query(
      `SELECT completion_date::text FROM habit_completions WHERE habit_id = $1 ORDER BY completion_date DESC`,
      [habit.id]
    );
    const streak = calculateHabitStreak(
      habit,
      completionDates.rows.map((entry) => entry.completion_date),
      completionDate
    );
    await client.query(`COMMIT`);
    active = false;
    return res.json({
      success: true,
      message: `Habit completed`,
      completion: inserted.rows[0],
      streak,
      rewards: {
        xp: habit.xp_reward,
        gold: habit.gold_reward,
        attribute: habit.category,
        challenge_xp: challengeResult.xp,
        challenge_gold: challengeResult.gold
      },
      challenges: challengeResult.completed,
      progression: finalProgression
    });
  } catch (cause) {
    if (active) await client.query(`ROLLBACK`);
    if (cause?.code === `23505`) return error(res, 409, `Habit has already been completed today`);
    logger.error(`Completing habit failed`, { error: cause });
    return error(res, 500, `Unable to complete habit`);
  } finally {
    client?.release();
  }
});

export default router;
