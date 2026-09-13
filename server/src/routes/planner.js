import { Router } from "express";
import { pool } from "../db.js";
import { authRequired } from "../middleware/auth.js";
import { logger } from "../utils/logger.js";
import { isHabitDueOnDate } from "../utils/habitStreak.js";
import { getCurrentChallenges } from "../services/challengeService.js";

const router = Router();
router.use(authRequired);

function error(res, status, message) {
  return res.status(status).json({ success: false, message });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(value, days) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function monday(value) {
  const date = new Date(`${value}T00:00:00Z`);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date.toISOString().slice(0, 10);
}

async function plannerData(userId, start, end) {
  const [tasks, habits, completions, milestones, challenges] = await Promise.all([
    pool.query(
      `SELECT id, title, category, difficulty, priority, goal_id,
              scheduled_date::text, due_date::text, scheduled_time::text, completed
       FROM tasks
       WHERE user_id = $1
         AND (
           scheduled_date BETWEEN $2::date AND $3::date
           OR due_date BETWEEN $2::date AND $3::date
         )
       ORDER BY priority DESC, scheduled_time NULLS LAST, id`,
      [userId, start, end]
    ),
    pool.query(
      `SELECT id, title, category, frequency, weekly_target, custom_days, active
       FROM habits WHERE user_id = $1 AND active = TRUE ORDER BY id`,
      [userId]
    ),
    pool.query(
      `SELECT habit_id, completion_date::text
       FROM habit_completions
       WHERE user_id = $1 AND completion_date BETWEEN $2::date AND $3::date`,
      [userId, start, end]
    ),
    pool.query(
      `SELECT gm.id, gm.title, gm.status, gm.goal_id, g.title AS goal_title
       FROM goal_milestones gm
       JOIN goals g ON g.id = gm.goal_id
       WHERE g.user_id = $1 AND g.status = 'active' AND gm.status = 'pending'
       ORDER BY g.target_date NULLS LAST, gm.position, gm.id
       LIMIT 12`,
      [userId]
    ),
    getCurrentChallenges(pool, userId)
  ]);

  const completed = new Set(completions.rows.map((item) => `${item.habit_id}:${item.completion_date}`));
  return {
    tasks: tasks.rows,
    habits: habits.rows.map((habit) => ({
      ...habit,
      custom_days: (habit.custom_days || []).map(Number),
      completed_dates: [...completed]
        .filter((key) => key.startsWith(`${habit.id}:`))
        .map((key) => key.split(`:`)[1])
    })),
    milestones: milestones.rows,
    challenges
  };
}

router.get(`/today`, async (req, res) => {
  const date = today();
  try {
    const data = await plannerData(req.user.id, date, date);
    const habits = data.habits
      .filter((habit) => isHabitDueOnDate(habit, date))
      .map((habit) => ({ ...habit, completed: habit.completed_dates.includes(date) }));
    const quests = data.tasks.map((task) => ({
      ...task,
      is_due_today: task.due_date === date || task.scheduled_date === date
    }));
    const completedItems =
      quests.filter((task) => task.completed).length +
      habits.filter((habit) => habit.completed).length;
    const totalItems = quests.length + habits.length;
    return res.json({
      success: true,
      date,
      quests,
      habits,
      milestones: data.milestones,
      challenges: data.challenges,
      completed_items: completedItems,
      remaining_items: totalItems - completedItems
    });
  } catch (cause) {
    logger.error(`Fetching daily planner failed`, { error: cause });
    return error(res, 500, `Unable to fetch daily planner`);
  }
});

router.get(`/week`, async (req, res) => {
  const start = monday(today());
  const end = addDays(start, 6);
  try {
    const data = await plannerData(req.user.id, start, end);
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = addDays(start, index);
      return {
        date,
        quests: data.tasks.filter(
          (task) => task.scheduled_date === date || task.due_date === date
        ),
        habits: data.habits
          .filter((habit) => isHabitDueOnDate(habit, date))
          .map((habit) => ({ ...habit, completed: habit.completed_dates.includes(date) }))
      };
    });
    return res.json({
      success: true,
      starts_on: start,
      ends_on: end,
      days,
      milestones: data.milestones,
      challenges: data.challenges.filter((challenge) => challenge.cadence === `weekly`)
    });
  } catch (cause) {
    logger.error(`Fetching weekly planner failed`, { error: cause });
    return error(res, 500, `Unable to fetch weekly planner`);
  }
});

export default router;
