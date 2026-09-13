import { Router } from "express";
import { pool } from "../db.js";
import { authRequired } from "../middleware/auth.js";
import { logger } from "../utils/logger.js";

const router = Router();
const categories = new Set([`intellect`, `strength`, `discipline`, `creativity`]);
const statuses = new Set([`active`, `completed`, `paused`, `archived`]);
const milestoneStatuses = new Set([`pending`, `completed`]);
const maximumId = 9223372036854775807n;

router.use(authRequired);

function error(res, status, message) {
  return res.status(status).json({ success: false, message });
}

function parseId(raw) {
  if (!/^[1-9]\d*$/.test(raw || ``) || raw.length > 19) return null;
  const id = BigInt(raw);
  return id <= maximumId ? id.toString() : null;
}

function validDate(value) {
  if (value === null || value === undefined || value === ``) return null;
  if (typeof value !== `string` || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
    ? undefined
    : value;
}

function goalInput(body, existing = {}) {
  if (!body || typeof body !== `object` || Array.isArray(body)) {
    return { error: `Request body must be an object` };
  }

  const value = {
    title: existing.title,
    description: existing.description ?? null,
    category: existing.category || `discipline`,
    status: existing.status || `active`,
    target_date: existing.target_date ?? null
  };
  const fields = [`title`, `description`, `category`, `status`, `target_date`];

  if (existing.id && !fields.some((field) => Object.hasOwn(body, field))) {
    return { error: `At least one editable goal field is required` };
  }

  if (Object.hasOwn(body, `title`)) {
    if (typeof body.title !== `string` || !body.title.trim() || body.title.trim().length > 200) {
      return { error: `title is required and must be 200 characters or fewer` };
    }
    value.title = body.title.trim();
  }

  if (!existing.id && (typeof value.title !== `string` || !value.title)) {
    return { error: `title is required` };
  }

  if (Object.hasOwn(body, `description`)) {
    if (typeof body.description !== `string` || body.description.trim().length > 2000) {
      return { error: `description must be 2,000 characters or fewer` };
    }
    value.description = body.description.trim() || null;
  }

  if (Object.hasOwn(body, `category`)) {
    if (typeof body.category !== `string` || !categories.has(body.category.trim().toLowerCase())) {
      return { error: `Invalid goal category` };
    }
    value.category = body.category.trim().toLowerCase();
  }

  if (Object.hasOwn(body, `status`)) {
    if (typeof body.status !== `string` || !statuses.has(body.status.trim().toLowerCase())) {
      return { error: `Invalid goal status` };
    }
    value.status = body.status.trim().toLowerCase();
  }

  if (Object.hasOwn(body, `target_date`)) {
    const date = validDate(body.target_date);
    if (date === undefined) return { error: `target_date must be YYYY-MM-DD or null` };
    value.target_date = date;
  }

  return { value };
}

async function ownedGoal(client, id, userId) {
  const result = await client.query(
    `SELECT id, user_id, title, description, category, status, target_date::text,
            created_at, updated_at
     FROM goals
     WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return result.rows[0] || null;
}

async function goalWithProgress(client, goal) {
  const milestones = await client.query(
    `SELECT COUNT(*)::int AS total_milestones,
            COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_milestones
     FROM goal_milestones
     WHERE goal_id = $1`,
    [goal.id]
  );
  const progress = milestones.rows[0];
  const total = progress.total_milestones;
  const completed = progress.completed_milestones;
  return {
    ...goal,
    total_milestones: total,
    completed_milestones: completed,
    progress_percentage: total ? Math.round((completed / total) * 100) : 0
  };
}

router.get(`/`, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT g.id, g.title, g.description, g.category, g.status,
              g.target_date::text, g.created_at, g.updated_at,
              COUNT(m.id)::int AS total_milestones,
              COUNT(m.id) FILTER (WHERE m.status = 'completed')::int AS completed_milestones
       FROM goals g
       LEFT JOIN goal_milestones m ON m.goal_id = g.id
       WHERE g.user_id = $1
       GROUP BY g.id
       ORDER BY CASE g.status WHEN 'active' THEN 0 WHEN 'paused' THEN 1 ELSE 2 END,
                g.target_date NULLS LAST, g.created_at DESC`,
      [req.user.id]
    );
    const goals = result.rows.map((goal) => ({
      ...goal,
      progress_percentage: goal.total_milestones
        ? Math.round((goal.completed_milestones / goal.total_milestones) * 100)
        : 0
    }));
    return res.json({ success: true, goals });
  } catch (cause) {
    logger.error(`Fetching goals failed`, { error: cause });
    return error(res, 500, `Unable to fetch goals`);
  }
});

router.post(`/`, async (req, res) => {
  const validated = goalInput(req.body);
  if (validated.error) return error(res, 400, validated.error);

  try {
    const goal = await pool.query(
      `INSERT INTO goals (user_id, title, description, category, status, target_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, title, description, category, status, target_date::text, created_at, updated_at`,
      [
        req.user.id,
        validated.value.title,
        validated.value.description,
        validated.value.category,
        validated.value.status,
        validated.value.target_date
      ]
    );
    return res.status(201).json({
      success: true,
      message: `Goal created`,
      goal: { ...goal.rows[0], total_milestones: 0, completed_milestones: 0, progress_percentage: 0 }
    });
  } catch (cause) {
    logger.error(`Creating goal failed`, { error: cause });
    return error(res, 500, `Unable to create goal`);
  }
});

router.get(`/:id`, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return error(res, 400, `Invalid goal ID`);

  try {
    const goal = await ownedGoal(pool, id, req.user.id);
    if (!goal) return error(res, 404, `Goal not found`);
    return res.json({ success: true, goal: await goalWithProgress(pool, goal) });
  } catch (cause) {
    logger.error(`Fetching goal failed`, { error: cause });
    return error(res, 500, `Unable to fetch goal`);
  }
});

router.put(`/:id`, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return error(res, 400, `Invalid goal ID`);

  try {
    const existing = await ownedGoal(pool, id, req.user.id);
    if (!existing) return error(res, 404, `Goal not found`);
    const validated = goalInput(req.body, existing);
    if (validated.error) return error(res, 400, validated.error);
    const value = validated.value;
    const result = await pool.query(
      `UPDATE goals
       SET title = $1, description = $2, category = $3, status = $4, target_date = $5
       WHERE id = $6 AND user_id = $7
       RETURNING id, title, description, category, status, target_date::text, created_at, updated_at`,
      [value.title, value.description, value.category, value.status, value.target_date, id, req.user.id]
    );
    return res.json({ success: true, goal: await goalWithProgress(pool, result.rows[0]) });
  } catch (cause) {
    logger.error(`Updating goal failed`, { error: cause });
    return error(res, 500, `Unable to update goal`);
  }
});

router.delete(`/:id`, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return error(res, 400, `Invalid goal ID`);

  try {
    const result = await pool.query(
      `DELETE FROM goals WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, req.user.id]
    );
    if (!result.rowCount) return error(res, 404, `Goal not found`);
    return res.json({ success: true, message: `Goal deleted` });
  } catch (cause) {
    logger.error(`Deleting goal failed`, { error: cause });
    return error(res, 500, `Unable to delete goal`);
  }
});

function milestoneInput(body, existing = {}) {
  if (!body || typeof body !== `object` || Array.isArray(body)) return { error: `Request body must be an object` };
  const value = {
    title: existing.title,
    description: existing.description ?? null,
    status: existing.status || `pending`,
    position: existing.position
  };
  if (existing.id && ![`title`, `description`, `status`, `position`].some((field) => Object.hasOwn(body, field))) {
    return { error: `At least one editable milestone field is required` };
  }
  if (Object.hasOwn(body, `title`)) {
    if (typeof body.title !== `string` || !body.title.trim() || body.title.trim().length > 200) {
      return { error: `title is required and must be 200 characters or fewer` };
    }
    value.title = body.title.trim();
  }
  if (!existing.id && !value.title) return { error: `title is required` };
  if (Object.hasOwn(body, `description`)) {
    if (typeof body.description !== `string` || body.description.trim().length > 2000) return { error: `description must be 2,000 characters or fewer` };
    value.description = body.description.trim() || null;
  }
  if (Object.hasOwn(body, `status`)) {
    if (typeof body.status !== `string` || !milestoneStatuses.has(body.status.trim().toLowerCase())) return { error: `Invalid milestone status` };
    value.status = body.status.trim().toLowerCase();
  }
  if (Object.hasOwn(body, `position`)) {
    if (!Number.isInteger(body.position) || body.position < 0) return { error: `position must be a non-negative integer` };
    value.position = body.position;
  }
  return { value };
}

async function requireGoal(res, client, rawId, userId) {
  const id = parseId(rawId);
  if (!id) {
    error(res, 400, `Invalid goal ID`);
    return null;
  }
  const goal = await ownedGoal(client, id, userId);
  if (!goal) {
    error(res, 404, `Goal not found`);
    return null;
  }
  return goal;
}

router.get(`/:goalId/milestones`, async (req, res) => {
  try {
    const goal = await requireGoal(res, pool, req.params.goalId, req.user.id);
    if (!goal) return;
    const result = await pool.query(
      `SELECT id, goal_id, title, description, status, position, completed_at, created_at, updated_at
       FROM goal_milestones WHERE goal_id = $1 ORDER BY position, id`,
      [goal.id]
    );
    return res.json({ success: true, milestones: result.rows });
  } catch (cause) {
    logger.error(`Fetching milestones failed`, { error: cause });
    return error(res, 500, `Unable to fetch milestones`);
  }
});

router.post(`/:goalId/milestones`, async (req, res) => {
  const validated = milestoneInput(req.body);
  if (validated.error) return error(res, 400, validated.error);
  try {
    const goal = await requireGoal(res, pool, req.params.goalId, req.user.id);
    if (!goal) return;
    const value = validated.value;
    const result = await pool.query(
      `INSERT INTO goal_milestones (goal_id, title, description, status, position, completed_at)
       VALUES (
         $1, $2, $3, $4,
         COALESCE($5, (SELECT COALESCE(MAX(position) + 1, 0) FROM goal_milestones WHERE goal_id = $1)),
         CASE WHEN $4 = 'completed' THEN CURRENT_TIMESTAMP ELSE NULL END
       )
       RETURNING id, goal_id, title, description, status, position, completed_at, created_at, updated_at`,
      [goal.id, value.title, value.description, value.status, value.position ?? null]
    );
    return res.status(201).json({ success: true, milestone: result.rows[0] });
  } catch (cause) {
    logger.error(`Creating milestone failed`, { error: cause });
    return error(res, 500, `Unable to create milestone`);
  }
});

router.put(`/:goalId/milestones/:milestoneId`, async (req, res) => {
  const milestoneId = parseId(req.params.milestoneId);
  if (!milestoneId) return error(res, 400, `Invalid milestone ID`);
  try {
    const goal = await requireGoal(res, pool, req.params.goalId, req.user.id);
    if (!goal) return;
    const existing = await pool.query(
      `SELECT id, title, description, status, position
       FROM goal_milestones WHERE id = $1 AND goal_id = $2`,
      [milestoneId, goal.id]
    );
    if (!existing.rowCount) return error(res, 404, `Milestone not found`);
    const validated = milestoneInput(req.body, existing.rows[0]);
    if (validated.error) return error(res, 400, validated.error);
    const value = validated.value;
    const result = await pool.query(
      `UPDATE goal_milestones
       SET title = $1, description = $2, status = $3, position = $4,
           completed_at = CASE WHEN $3 = 'completed' THEN COALESCE(completed_at, CURRENT_TIMESTAMP) ELSE NULL END
       WHERE id = $5 AND goal_id = $6
       RETURNING id, goal_id, title, description, status, position, completed_at, created_at, updated_at`,
      [value.title, value.description, value.status, value.position, milestoneId, goal.id]
    );
    await pool.query(`UPDATE goals SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [goal.id]);
    return res.json({ success: true, milestone: result.rows[0] });
  } catch (cause) {
    logger.error(`Updating milestone failed`, { error: cause });
    return error(res, 500, `Unable to update milestone`);
  }
});

router.delete(`/:goalId/milestones/:milestoneId`, async (req, res) => {
  const milestoneId = parseId(req.params.milestoneId);
  if (!milestoneId) return error(res, 400, `Invalid milestone ID`);
  try {
    const goal = await requireGoal(res, pool, req.params.goalId, req.user.id);
    if (!goal) return;
    const result = await pool.query(
      `DELETE FROM goal_milestones WHERE id = $1 AND goal_id = $2 RETURNING id`,
      [milestoneId, goal.id]
    );
    if (!result.rowCount) return error(res, 404, `Milestone not found`);
    await pool.query(`UPDATE goals SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [goal.id]);
    return res.json({ success: true, message: `Milestone deleted` });
  } catch (cause) {
    logger.error(`Deleting milestone failed`, { error: cause });
    return error(res, 500, `Unable to delete milestone`);
  }
});

export default router;
