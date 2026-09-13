import { Router } from "express";
import { pool } from "../db.js";
import { authRequired } from "../middleware/auth.js";
import { logger } from "../utils/logger.js";

const router = Router();

router.use(authRequired);

router.get("/", async (req, res) => {
  try {
    const userResult = await pool.query(
      "SELECT id FROM users WHERE id = $1",
      [req.user.id]
    );

    if (!userResult.rowCount) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const inventoryResult = await pool.query(
      `SELECT ui.id AS inventory_id,
              ui.item_id,
              si.name,
              si.description,
              si.icon,
              si.item_type,
              si.price,
              ui.purchased_at
       FROM user_inventory ui
       JOIN shop_items si ON si.id = ui.item_id
       WHERE ui.user_id = $1
       ORDER BY ui.purchased_at DESC, ui.id DESC`,
      [req.user.id]
    );

    return res.json({
      success: true,
      inventory: inventoryResult.rows
    });
  } catch (error) {
    logger.error("Fetching inventory failed", { error });
    return res.status(500).json({
      success: false,
      message: "Unable to fetch inventory"
    });
  }
});

export default router;
