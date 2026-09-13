import { Router } from "express";
import { pool } from "../db.js";
import { authRequired } from "../middleware/auth.js";
import { logger } from "../utils/logger.js";

const router = Router();

router.use(authRequired);

function errorResponse(res, statusCode, message) {
  return res.status(statusCode).json({
    success: false,
    message
  });
}

function parseDays(rawDays) {
  if (rawDays === undefined) {
    return 30;
  }

  if (Array.isArray(rawDays) || !/^\d+$/.test(rawDays)) {
    return null;
  }

  const days = Number(rawDays);
  return Number.isInteger(days) && days >= 1 && days <= 90 ? days : null;
}

router.get("/", async (req, res) => {
  const days = parseDays(req.query.days);

  if (!days) {
    return errorResponse(res, 400, "days must be an integer from 1 to 90");
  }

  try {
    const result = await pool.query(
      `SELECT uda.activity_date::text AS date,
              uda.quests_completed,
              uda.xp_earned,
              uda.gold_earned
       FROM user_daily_activity uda
       JOIN users u ON u.id = uda.user_id
       WHERE uda.user_id = $1
         AND uda.activity_date >= CURRENT_DATE - ($2::integer - 1)
       ORDER BY uda.activity_date DESC`,
      [req.user.id, days]
    );

    return res.json({
      success: true,
      activity: result.rows
    });
  } catch (error) {
    logger.error("Fetching daily activity failed", { error });
    return errorResponse(res, 500, "Unable to fetch daily activity");
  }
});

export default router;
