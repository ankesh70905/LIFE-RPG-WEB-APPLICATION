import { Router } from "express";
import { pool } from "../db.js";
import { authRequired } from "../middleware/auth.js";
import { logger } from "../utils/logger.js";

const router = Router();
const maximumPostgresBigInt = 9223372036854775807n;

router.use(authRequired);

function errorResponse(res, statusCode, message) {
  return res.status(statusCode).json({
    success: false,
    message
  });
}

function parseNotificationId(rawId) {
  if (!/^[1-9]\d*$/.test(rawId) || rawId.length > 19) {
    return null;
  }

  const notificationId = BigInt(rawId);

  return notificationId <= maximumPostgresBigInt
    ? notificationId.toString()
    : null;
}

function parseLimit(rawLimit) {
  if (rawLimit === undefined) {
    return 20;
  }

  if (Array.isArray(rawLimit) || !/^\d+$/.test(rawLimit)) {
    return null;
  }

  const limit = Number(rawLimit);
  return Number.isInteger(limit) && limit >= 1 && limit <= 50 ? limit : null;
}

router.get("/", async (req, res) => {
  const limit = parseLimit(req.query.limit);

  if (!limit) {
    return errorResponse(res, 400, "limit must be an integer from 1 to 50");
  }

  try {
    const [notificationResult, unreadResult] = await Promise.all([
      pool.query(
        `SELECT id, type, title, message, is_read, created_at
         FROM notifications
         WHERE user_id = $1
         ORDER BY created_at DESC, id DESC
         LIMIT $2`,
        [req.user.id, limit]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS unread_count
         FROM notifications
         WHERE user_id = $1 AND is_read = FALSE`,
        [req.user.id]
      )
    ]);

    return res.json({
      success: true,
      notifications: notificationResult.rows,
      unread_count: unreadResult.rows[0].unread_count
    });
  } catch (error) {
    logger.error("Fetching notifications failed", { error });
    return errorResponse(res, 500, "Unable to fetch notifications");
  }
});

router.patch("/read-all", async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE user_id = $1 AND is_read = FALSE`,
      [req.user.id]
    );

    return res.json({
      success: true,
      updated_count: result.rowCount
    });
  } catch (error) {
    logger.error("Marking notifications as read failed", { error });
    return errorResponse(res, 500, "Unable to mark notifications as read");
  }
});

router.patch("/:id/read", async (req, res) => {
  const notificationId = parseNotificationId(req.params.id);

  if (!notificationId) {
    return errorResponse(res, 400, "Invalid notification ID");
  }

  try {
    const result = await pool.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE id = $1 AND user_id = $2
       RETURNING id, type, title, message, is_read, created_at`,
      [notificationId, req.user.id]
    );

    if (!result.rowCount) {
      return errorResponse(res, 404, "Notification not found");
    }

    return res.json({
      success: true,
      notification: result.rows[0]
    });
  } catch (error) {
    logger.error("Marking notification as read failed", { error });
    return errorResponse(res, 500, "Unable to mark notification as read");
  }
});

export default router;
