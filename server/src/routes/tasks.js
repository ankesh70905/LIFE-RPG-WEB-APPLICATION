import { Router } from "express";
import { pool } from "../db.js";
import { authRequired } from "../middleware/auth.js";
import { checkAndUnlockAchievements } from "../utils/achievements.js";
import { createNotification } from "../utils/notifications.js";
import { getRewardsForDifficulty } from "../utils/rewards.js";
import { calculateLevel } from "../utils/rpg.js";
import { getUtcDateString, updateStreak } from "../utils/streak.js";
import { logger } from "../utils/logger.js";
import {
  advanceChallenges,
  awardChallengeRewards
} from "../services/challengeService.js";

const router = Router();

const allowedCategories = new Set([
  "intellect",
  "strength",
  "discipline",
  "creativity"
]);
const allowedDifficulties = new Set(["easy", "normal", "hard", "epic"]);
const attributeByCategory = Object.freeze({
  intellect: "intellect",
  strength: "strength",
  discipline: "discipline",
  creativity: "creativity"
});
const taskColumns = `
  id,
  title,
  description,
  category,
  difficulty,
  xp_reward,
  gold_reward,
  goal_id,
  scheduled_date::text AS scheduled_date,
  due_date::text AS due_date,
  scheduled_time::text AS scheduled_time,
  priority,
  completed,
  completed_at,
  created_at,
  updated_at
`;

router.use(authRequired);

function errorResponse(res, statusCode, message) {
  return res.status(statusCode).json({
    success: false,
    message
  });
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseTaskId(rawId) {
  if (!/^[1-9]\d*$/.test(rawId) || rawId.length > 19) {
    return null;
  }

  const taskId = BigInt(rawId);

  if (taskId > 9223372036854775807n) {
    return null;
  }

  return taskId.toString();
}

function normalizeEnum(value, allowedValues, fieldName) {
  if (typeof value !== "string") {
    return {
      error: `${fieldName} must be a string`
    };
  }

  const normalizedValue = value.trim().toLowerCase();

  if (!allowedValues.has(normalizedValue)) {
    return {
      error: `Invalid task ${fieldName.toLowerCase()}`
    };
  }

  return {
    value: normalizedValue
  };
}

function validateTitle(value) {
  if (typeof value !== "string") {
    return { error: "Title must be a string" };
  }

  const title = value.trim();

  if (!title) {
    return { error: "Title cannot be empty" };
  }

  if (title.length > 200) {
    return { error: "Title must be 200 characters or fewer" };
  }

  return { value: title };
}

function validateDescription(value) {
  if (typeof value !== "string") {
    return { error: "Description must be a string" };
  }

  const description = value.trim();

  if (description.length > 1000) {
    return { error: "Description must be 1000 characters or fewer" };
  }

  return { value: description };
}

function validateDate(value, fieldName) {
  if (value === null || value === "") {
    return { value: null };
  }

  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number.isNaN(new Date(`${value}T00:00:00Z`).getTime())
  ) {
    return { error: `${fieldName} must be YYYY-MM-DD or null` };
  }

  return { value };
}

function validatePlanningFields(body, existing = {}) {
  const value = {
    goal_id: existing.goal_id ?? null,
    scheduled_date: existing.scheduled_date ?? null,
    due_date: existing.due_date ?? null,
    scheduled_time: existing.scheduled_time
      ? String(existing.scheduled_time).slice(0, 5)
      : null,
    priority: existing.priority || "medium"
  };

  if (Object.prototype.hasOwnProperty.call(body, "goal_id")) {
    if (body.goal_id === null || body.goal_id === "") {
      value.goal_id = null;
    } else {
      const goalId = parseTaskId(String(body.goal_id));
      if (!goalId) return { error: "goal_id must be a valid goal ID or null" };
      value.goal_id = goalId;
    }
  }

  for (const field of ["scheduled_date", "due_date"]) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      const date = validateDate(body[field], field);
      if (date.error) return date;
      value[field] = date.value;
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, "scheduled_time")) {
    if (body.scheduled_time === null || body.scheduled_time === "") {
      value.scheduled_time = null;
    } else if (
      typeof body.scheduled_time !== "string" ||
      !/^\d{2}:\d{2}$/.test(body.scheduled_time)
    ) {
      return { error: "scheduled_time must be HH:MM or null" };
    } else {
      value.scheduled_time = body.scheduled_time;
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, "priority")) {
    const priority =
      typeof body.priority === "string" ? body.priority.trim().toLowerCase() : "";
    if (!["low", "medium", "high"].includes(priority)) {
      return { error: "priority must be low, medium, or high" };
    }
    value.priority = priority;
  }

  return { value };
}

function validateCreateInput(body) {
  if (!isObject(body)) {
    return {
      error: "Request body must be a JSON object"
    };
  }

  if (typeof body.title !== "string" || !body.title.trim()) {
    return { error: "Title is required" };
  }

  if (typeof body.category !== "string" || !body.category.trim()) {
    return { error: "Category is required" };
  }

  if (typeof body.difficulty !== "string" || !body.difficulty.trim()) {
    return { error: "Difficulty is required" };
  }

  const title = validateTitle(body.title);
  if (title.error) {
    return title;
  }

  const category = normalizeEnum(
    body.category,
    allowedCategories,
    "Category"
  );
  if (category.error) {
    return category;
  }

  const difficulty = normalizeEnum(
    body.difficulty,
    allowedDifficulties,
    "Difficulty"
  );
  if (difficulty.error) {
    return difficulty;
  }

  let description = null;
  if (body.description !== undefined) {
    const validatedDescription = validateDescription(body.description);
    if (validatedDescription.error) {
      return validatedDescription;
    }
    description = validatedDescription.value;
  }

  const planning = validatePlanningFields(body);
  if (planning.error) return planning;

  return {
    value: {
      title: title.value,
      description,
      category: category.value,
      difficulty: difficulty.value,
      ...planning.value
    }
  };
}

function validateUpdateInput(body, existingTask) {
  if (!isObject(body)) {
    return {
      error: "Request body must be a JSON object"
    };
  }

  const hasEditableField = [
    "title",
    "description",
    "category",
    "difficulty",
    "goal_id",
    "scheduled_date",
    "due_date",
    "scheduled_time",
    "priority"
  ]
    .some((field) => Object.prototype.hasOwnProperty.call(body, field));

  if (!hasEditableField) {
    return {
      error: "At least one editable quest field is required"
    };
  }

  const value = {
    title: existingTask.title,
    description: existingTask.description,
    category: existingTask.category,
    difficulty: existingTask.difficulty
  };

  if (Object.prototype.hasOwnProperty.call(body, "title")) {
    const title = validateTitle(body.title);
    if (title.error) {
      return title;
    }
    value.title = title.value;
  }

  if (Object.prototype.hasOwnProperty.call(body, "description")) {
    const description = validateDescription(body.description);
    if (description.error) {
      return description;
    }
    value.description = description.value;
  }

  if (Object.prototype.hasOwnProperty.call(body, "category")) {
    const category = normalizeEnum(
      body.category,
      allowedCategories,
      "Category"
    );
    if (category.error) {
      return category;
    }
    value.category = category.value;
  }

  if (Object.prototype.hasOwnProperty.call(body, "difficulty")) {
    const difficulty = normalizeEnum(
      body.difficulty,
      allowedDifficulties,
      "Difficulty"
    );
    if (difficulty.error) {
      return difficulty;
    }
    value.difficulty = difficulty.value;
  }

  const planning = validatePlanningFields(body, existingTask);
  if (planning.error) return planning;
  return { value: { ...value, ...planning.value } };
}

async function validateGoalOwnership(goalId, userId) {
  if (!goalId) return true;
  const result = await pool.query(
    "SELECT id FROM goals WHERE id = $1 AND user_id = $2",
    [goalId, userId]
  );
  return Boolean(result.rowCount);
}

async function findTask(taskId, userId) {
  const result = await pool.query(
    `SELECT ${taskColumns}
     FROM tasks
     WHERE id = $1 AND user_id = $2`,
    [taskId, userId]
  );

  return result.rows[0] ?? null;
}

async function rollback(client) {
  try {
    await client.query("ROLLBACK");
  } catch (error) {
    logger.error("Failed to roll back quest completion", { error });
  }
}

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${taskColumns}
       FROM tasks
       WHERE user_id = $1
       ORDER BY completed ASC, created_at DESC`,
      [req.user.id]
    );

    return res.json({
      success: true,
      tasks: result.rows
    });
  } catch (error) {
    logger.error("Fetching quests failed", { error });
    return errorResponse(res, 500, "Unable to fetch quests");
  }
});

router.post("/:id/complete", async (req, res) => {
  const taskId = parseTaskId(req.params.id);

  if (!taskId) {
    return errorResponse(res, 400, "Invalid quest ID");
  }

  let client;
  let transactionActive = false;

  try {
    client = await pool.connect();
    await client.query("BEGIN");
    transactionActive = true;

    const taskResult = await client.query(
      `SELECT id, user_id, category, xp_reward, gold_reward, completed
       FROM tasks
       WHERE id = $1 AND user_id = $2
       FOR UPDATE`,
      [taskId, req.user.id]
    );
    const task = taskResult.rows[0];

    if (!task) {
      await rollback(client);
      transactionActive = false;
      return errorResponse(res, 404, "Quest not found");
    }

    if (task.completed) {
      await rollback(client);
      transactionActive = false;
      return errorResponse(res, 409, "Quest has already been completed");
    }

    const userResult = await client.query(
      `SELECT id, total_xp, level, gold,
              current_streak, longest_streak,
              last_activity_date::text AS last_activity_date
       FROM users
       WHERE id = $1
       FOR UPDATE`,
      [req.user.id]
    );
    const user = userResult.rows[0];

    if (!user) {
      await rollback(client);
      transactionActive = false;
      return errorResponse(res, 404, "User not found");
    }

    const characterResult = await client.query(
      `SELECT id
       FROM character_attributes
       WHERE user_id = $1
       FOR UPDATE`,
      [req.user.id]
    );

    if (!characterResult.rowCount) {
      await rollback(client);
      transactionActive = false;
      return errorResponse(res, 404, "Character profile not found");
    }

    const attributeColumn = attributeByCategory[task.category];

    if (!attributeColumn) {
      throw new Error("Quest category has no configured attribute mapping");
    }

    const newTotalXp = user.total_xp + task.xp_reward;
    const newLevel = calculateLevel(newTotalXp);
    const newTotalGold = user.gold + task.gold_reward;
    const levelsGained = newLevel - user.level;
    const streak = updateStreak({
      currentStreak: user.current_streak,
      longestStreak: user.longest_streak,
      lastActivityDate: user.last_activity_date,
      today: getUtcDateString()
    });

    const completedTaskResult = await client.query(
      `UPDATE tasks
       SET completed = TRUE,
           completed_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2 AND completed = FALSE
       RETURNING id, completed, completed_at`,
      [taskId, req.user.id]
    );

    if (!completedTaskResult.rowCount) {
      throw new Error("Quest completion state changed unexpectedly");
    }

    const updatedUserResult = await client.query(
      `UPDATE users
       SET total_xp = $1,
           level = $2,
           gold = $3,
           current_streak = $4,
           longest_streak = $5,
           last_activity_date = $6
       WHERE id = $7
       RETURNING total_xp, level, gold, current_streak, longest_streak,
                 last_activity_date`,
      [
        newTotalXp,
        newLevel,
        newTotalGold,
        streak.currentStreak,
        streak.longestStreak,
        streak.lastActivityDate,
        req.user.id
      ]
    );

    if (!updatedUserResult.rowCount) {
      throw new Error("User disappeared during quest completion");
    }

    const attributeResult = await client.query(
      `UPDATE character_attributes
       SET ${attributeColumn} = ${attributeColumn} + 1
       WHERE user_id = $1
       RETURNING intellect, strength, discipline, creativity`,
      [req.user.id]
    );

    if (!attributeResult.rowCount) {
      throw new Error("Character profile disappeared during quest completion");
    }

    await client.query(
      `INSERT INTO user_daily_activity (
         user_id, activity_date, quests_completed, xp_earned, gold_earned
       )
       VALUES ($1, $2, 1, $3, $4)
       ON CONFLICT (user_id, activity_date)
       DO UPDATE SET
         quests_completed = user_daily_activity.quests_completed + 1,
         xp_earned = user_daily_activity.xp_earned + EXCLUDED.xp_earned,
         gold_earned = user_daily_activity.gold_earned + EXCLUDED.gold_earned`,
      [req.user.id, getUtcDateString(), task.xp_reward, task.gold_reward]
    );

    const challengeResult = await advanceChallenges(client, req.user.id, {
      quest_count: 1
    });
    const finalProgression = await awardChallengeRewards(
      client,
      {
        ...user,
        total_xp: newTotalXp,
        gold: newTotalGold,
        level: newLevel
      },
      challengeResult
    );

    const completedQuestCountResult = await client.query(
      `SELECT COUNT(*)::int AS completed_quests,
              COALESCE(SUM(gold_reward), 0)::int AS gold_earned
       FROM tasks
       WHERE user_id = $1 AND completed = TRUE`,
      [req.user.id]
    );

    const newlyUnlockedAchievements = await checkAndUnlockAchievements(
      client,
      req.user.id,
      {
        questsCompleted: completedQuestCountResult.rows[0].completed_quests,
        level: finalProgression.level,
        gold: finalProgression.total_gold,
        goldEarned: completedQuestCountResult.rows[0].gold_earned,
        currentStreak: streak.currentStreak,
        attributes: attributeResult.rows[0]
      }
    );

    for (const achievement of newlyUnlockedAchievements) {
      await createNotification(client, {
        userId: req.user.id,
        type: "achievement",
        title: "Achievement Unlocked!",
        message: `${achievement.name}: ${achievement.description}`
      });
    }

    if (finalProgression.level > user.level) {
      await createNotification(client, {
        userId: req.user.id,
        type: "level_up",
        title: "Level Up!",
        message: `You reached level ${finalProgression.level}. Keep adventuring!`
      });
    }

    for (const milestone of [7, 30]) {
      if (
        user.current_streak < milestone &&
        streak.currentStreak >= milestone
      ) {
        await createNotification(client, {
          userId: req.user.id,
          type: "streak",
          title: "Streak Milestone!",
          message: `You reached a ${milestone}-day streak.`
        });
      }
    }

    await client.query("COMMIT");
    transactionActive = false;

    const completedTask = completedTaskResult.rows[0];

    return res.json({
      success: true,
      message: "Quest completed successfully",
      rewards: {
        xp: task.xp_reward,
        gold: task.gold_reward,
        attribute: {
          name: attributeColumn,
          increase: 1
        },
        challenge_xp: challengeResult.xp,
        challenge_gold: challengeResult.gold
      },
      progression: {
        previous_level: user.level,
        current_level: finalProgression.level,
        leveled_up: finalProgression.level > user.level,
        levels_gained: finalProgression.level - user.level,
        total_xp: finalProgression.total_xp,
        total_gold: finalProgression.total_gold
      },
      streak: {
        current_streak: streak.currentStreak,
        longest_streak: streak.longestStreak,
        last_activity_date: streak.lastActivityDate,
        updated: streak.updated
      },
      achievements: newlyUnlockedAchievements,
      challenges: challengeResult.completed,
      task: completedTask
    });
  } catch (error) {
    if (client && transactionActive) {
      await rollback(client);
    }

    logger.error("Completing quest failed", { error });
    return errorResponse(res, 500, "Unable to complete quest");
  } finally {
    client?.release();
  }
});

router.get("/:id", async (req, res) => {
  const taskId = parseTaskId(req.params.id);

  if (!taskId) {
    return errorResponse(res, 400, "Invalid quest ID");
  }

  try {
    const task = await findTask(taskId, req.user.id);

    if (!task) {
      return errorResponse(res, 404, "Quest not found");
    }

    return res.json({
      success: true,
      task
    });
  } catch (error) {
    logger.error("Fetching quest failed", { error });
    return errorResponse(res, 500, "Unable to fetch quest");
  }
});

router.post("/", async (req, res) => {
  const validated = validateCreateInput(req.body);

  if (validated.error) {
    return errorResponse(res, 400, validated.error);
  }

  const {
    title,
    description,
    category,
    difficulty,
    goal_id,
    scheduled_date,
    due_date,
    scheduled_time,
    priority
  } = validated.value;
  const rewards = getRewardsForDifficulty(difficulty);

  try {
    if (!(await validateGoalOwnership(goal_id, req.user.id))) {
      return errorResponse(res, 400, "Goal not found");
    }

    const result = await pool.query(
      `INSERT INTO tasks (
         user_id,
         title,
         description,
         category,
         difficulty,
         xp_reward,
         gold_reward,
         goal_id,
         scheduled_date,
         due_date,
         scheduled_time,
         priority,
         completed,
         completed_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, FALSE, NULL)
       RETURNING ${taskColumns}`,
      [
        req.user.id,
        title,
        description,
        category,
        difficulty,
        rewards.xp,
        rewards.gold,
        goal_id,
        scheduled_date,
        due_date,
        scheduled_time,
        priority
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Quest created successfully",
      task: result.rows[0]
    });
  } catch (error) {
    logger.error("Creating quest failed", { error });
    return errorResponse(res, 500, "Unable to create quest");
  }
});

router.put("/:id", async (req, res) => {
  const taskId = parseTaskId(req.params.id);

  if (!taskId) {
    return errorResponse(res, 400, "Invalid quest ID");
  }

  try {
    const existingTask = await findTask(taskId, req.user.id);

    if (!existingTask) {
      return errorResponse(res, 404, "Quest not found");
    }

    if (existingTask.completed) {
      return errorResponse(res, 409, "Completed quests cannot be edited");
    }

    const validated = validateUpdateInput(req.body, existingTask);

    if (validated.error) {
      return errorResponse(res, 400, validated.error);
    }

    const {
      title,
      description,
      category,
      difficulty,
      goal_id,
      scheduled_date,
      due_date,
      scheduled_time,
      priority
    } = validated.value;
    const rewards = getRewardsForDifficulty(difficulty);
    if (!(await validateGoalOwnership(goal_id, req.user.id))) {
      return errorResponse(res, 400, "Goal not found");
    }
    const result = await pool.query(
      `UPDATE tasks
       SET title = $1,
           description = $2,
           category = $3,
           difficulty = $4,
           xp_reward = $5,
           gold_reward = $6,
           goal_id = $7,
           scheduled_date = $8,
           due_date = $9,
           scheduled_time = $10,
           priority = $11
       WHERE id = $12 AND user_id = $13 AND completed = FALSE
       RETURNING ${taskColumns}`,
      [
        title,
        description,
        category,
        difficulty,
        rewards.xp,
        rewards.gold,
        goal_id,
        scheduled_date,
        due_date,
        scheduled_time,
        priority,
        taskId,
        req.user.id
      ]
    );

    if (!result.rowCount) {
      return errorResponse(res, 409, "Completed quests cannot be edited");
    }

    return res.json({
      success: true,
      message: "Quest updated successfully",
      task: result.rows[0]
    });
  } catch (error) {
    logger.error("Updating quest failed", { error });
    return errorResponse(res, 500, "Unable to update quest");
  }
});

router.delete("/:id", async (req, res) => {
  const taskId = parseTaskId(req.params.id);

  if (!taskId) {
    return errorResponse(res, 400, "Invalid quest ID");
  }

  try {
    const result = await pool.query(
      `DELETE FROM tasks
       WHERE id = $1 AND user_id = $2 AND completed = FALSE
       RETURNING id`,
      [taskId, req.user.id]
    );

    if (result.rowCount) {
      return res.json({
        success: true,
        message: "Quest deleted successfully"
      });
    }

    const existingTask = await pool.query(
      `SELECT completed
       FROM tasks
       WHERE id = $1 AND user_id = $2`,
      [taskId, req.user.id]
    );

    if (!existingTask.rowCount) {
      return errorResponse(res, 404, "Quest not found");
    }

    return errorResponse(res, 409, "Completed quests cannot be deleted");
  } catch (error) {
    logger.error("Deleting quest failed", { error });
    return errorResponse(res, 500, "Unable to delete quest");
  }
});

export default router;
