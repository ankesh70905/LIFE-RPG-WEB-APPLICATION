import { Router } from "express";
import { pool } from "../db.js";
import { authRequired } from "../middleware/auth.js";
import { logger } from "../utils/logger.js";

const router = Router();

router.use(authRequired);

router.get("/unlocked", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.id, a.code, a.name, a.description, a.icon, a.category,
              a.requirement_type, a.requirement_value, ua.unlocked_at
       FROM user_achievements ua
       JOIN achievements a ON a.id = ua.achievement_id
       WHERE ua.user_id = $1
       ORDER BY ua.unlocked_at DESC, ua.id DESC`,
      [req.user.id]
    );

    return res.json({
      success: true,
      achievements: result.rows
    });
  } catch (error) {
    logger.error("Fetching unlocked achievements failed", { error });
    return res.status(500).json({
      success: false,
      message: "Unable to fetch unlocked achievements"
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.id, a.code, a.name, a.description, a.icon, a.category,
              a.requirement_type, a.requirement_value,
              (ua.id IS NOT NULL) AS unlocked,
              ua.unlocked_at
       FROM achievements a
       LEFT JOIN user_achievements ua
         ON ua.achievement_id = a.id AND ua.user_id = $1
       ORDER BY a.category ASC, a.requirement_value ASC, a.id ASC`,
      [req.user.id]
    );

    return res.json({
      success: true,
      achievements: result.rows
    });
  } catch (error) {
    logger.error("Fetching achievements failed", { error });
    return res.status(500).json({
      success: false,
      message: "Unable to fetch achievements"
    });
  }
});

export default router;
