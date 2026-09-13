import { Router } from "express";
import { pool } from "../db.js";
import { authRequired } from "../middleware/auth.js";
import { logger } from "../utils/logger.js";

const router = Router();

router.use(authRequired);

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT current_streak, longest_streak,
              last_activity_date::text AS last_activity_date
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );
    const streak = result.rows[0];

    if (!streak) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    return res.json({
      success: true,
      streak
    });
  } catch (error) {
    logger.error("Fetching streak failed", { error });
    return res.status(500).json({
      success: false,
      message: "Unable to fetch streak"
    });
  }
});

export default router;
