import { Router } from "express";
import { pool } from "../db.js";
import { authRequired } from "../middleware/auth.js";
import { refreshSmartReminders } from "../services/reminderService.js";
import { logger } from "../utils/logger.js";

const router = Router();
const types = new Set([`quest`, `habit`, `goal`, `challenge`, `system`]);
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

router.post(`/refresh`, async (req, res) => {
  try {
    const notifications = await refreshSmartReminders(pool, req.user.id);
    return res.json({ success: true, created: notifications.length, notifications });
  } catch (cause) {
    logger.error(`Refreshing reminders failed`, { error: cause });
    return error(res, 500, `Unable to refresh reminders`);
  }
});

router.get(`/`, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, reminder_type, reference_id, title, message, scheduled_at,
              enabled, delivered_at, created_at
       FROM reminders WHERE user_id = $1 ORDER BY scheduled_at DESC, id DESC LIMIT 50`,
      [req.user.id]
    );
    return res.json({ success: true, reminders: result.rows });
  } catch (cause) {
    logger.error(`Fetching reminders failed`, { error: cause });
    return error(res, 500, `Unable to fetch reminders`);
  }
});

router.patch(`/:id`, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id || typeof req.body?.enabled !== `boolean`) return error(res, 400, `A valid reminder ID and enabled boolean are required`);
  try {
    const result = await pool.query(
      `UPDATE reminders SET enabled = $1 WHERE id = $2 AND user_id = $3
       RETURNING id, reminder_type, reference_id, title, message, scheduled_at, enabled, delivered_at`,
      [req.body.enabled, id, req.user.id]
    );
    if (!result.rowCount) return error(res, 404, `Reminder not found`);
    return res.json({ success: true, reminder: result.rows[0] });
  } catch (cause) {
    logger.error(`Updating reminder failed`, { error: cause });
    return error(res, 500, `Unable to update reminder`);
  }
});

router.post(`/`, async (req, res) => {
  const { reminder_type, reference_id = null, title, message, scheduled_at } = req.body || {};
  if (typeof reminder_type !== `string` || !types.has(reminder_type)) return error(res, 400, `Invalid reminder type`);
  if (typeof title !== `string` || !title.trim() || title.trim().length > 160) return error(res, 400, `Invalid reminder title`);
  if (typeof message !== `string` || !message.trim() || message.trim().length > 1000) return error(res, 400, `Invalid reminder message`);
  const date = new Date(scheduled_at);
  if (Number.isNaN(date.getTime())) return error(res, 400, `scheduled_at must be a valid date-time`);
  const referenceId = reference_id === null ? null : parseId(String(reference_id));
  if (reference_id !== null && !referenceId) return error(res, 400, `Invalid reference ID`);
  try {
    const result = await pool.query(
      `INSERT INTO reminders (
         user_id, reminder_type, reference_id, reminder_key, title, message, scheduled_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, reminder_type, reference_id, title, message, scheduled_at, enabled, delivered_at`,
      [
        req.user.id,
        reminder_type,
        referenceId,
        `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title.trim(),
        message.trim(),
        date.toISOString()
      ]
    );
    return res.status(201).json({ success: true, reminder: result.rows[0] });
  } catch (cause) {
    logger.error(`Creating reminder failed`, { error: cause });
    return error(res, 500, `Unable to create reminder`);
  }
});

export default router;
