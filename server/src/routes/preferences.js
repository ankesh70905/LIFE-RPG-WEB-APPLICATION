import { Router } from "express";
import { pool } from "../db.js";
import { authRequired } from "../middleware/auth.js";

const router = Router();
router.use(authRequired);

const fields = ["ai_coach_enabled", "ai_personalization_enabled", "reminders_enabled", "timezone"];

async function read(userId) {
  const result = await pool.query(
    `INSERT INTO user_preferences (user_id) VALUES ($1)
     ON CONFLICT (user_id) DO NOTHING
     RETURNING user_id, ai_coach_enabled, ai_personalization_enabled, reminders_enabled, timezone`,
    [userId]
  );
  if (result.rowCount) return result.rows[0];
  return (await pool.query(
    `SELECT user_id, ai_coach_enabled, ai_personalization_enabled, reminders_enabled, timezone
     FROM user_preferences WHERE user_id = $1`, [userId]
  )).rows[0];
}

router.get("/", async (req, res, next) => {
  try { return res.json({ success: true, preferences: await read(req.user.id) }); }
  catch (error) { return next(error); }
});

router.patch("/", async (req, res, next) => {
  const updates = [];
  const values = [req.user.id];
  for (const field of fields) {
    if (!Object.hasOwn(req.body || {}, field)) continue;
    const value = req.body[field];
    if (field === "timezone" ? (typeof value !== "string" || !/^[A-Za-z0-9_+\/.-]{1,64}$/.test(value)) : typeof value !== "boolean") {
      return res.status(400).json({ success: false, message: `Invalid ${field}` });
    }
    values.push(value);
    updates.push(`${field} = $${values.length}`);
  }
  if (!updates.length) return res.status(400).json({ success: false, message: "No valid preferences supplied" });
  try {
    await read(req.user.id);
    const result = await pool.query(
      `UPDATE user_preferences SET ${updates.join(", ")} WHERE user_id = $1
       RETURNING user_id, ai_coach_enabled, ai_personalization_enabled, reminders_enabled, timezone`,
      values
    );
    return res.json({ success: true, preferences: result.rows[0] });
  } catch (error) { return next(error); }
});

export default router;
