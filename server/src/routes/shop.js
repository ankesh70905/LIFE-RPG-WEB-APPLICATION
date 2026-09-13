import { Router } from "express";
import { pool } from "../db.js";
import { authRequired } from "../middleware/auth.js";
import { logger } from "../utils/logger.js";
import { createNotification } from "../utils/notifications.js";

const router = Router();
const maximumPostgresBigInt = 9223372036854775807n;

router.use(authRequired);

function errorResponse(res, statusCode, message) {
  return res.status(statusCode).json({
    success: false,
    message
  });
}

function parseItemId(rawId) {
  if (!/^[1-9]\d*$/.test(rawId) || rawId.length > 19) {
    return null;
  }

  const itemId = BigInt(rawId);

  if (itemId > maximumPostgresBigInt) {
    return null;
  }

  return itemId.toString();
}

function isUniqueViolation(error) {
  return error?.code === "23505";
}

async function rollback(client) {
  try {
    await client.query("ROLLBACK");
  } catch (error) {
    logger.error("Failed to roll back shop purchase", { error });
  }
}

router.get("/items", async (req, res) => {
  try {
    const userResult = await pool.query(
      "SELECT gold FROM users WHERE id = $1",
      [req.user.id]
    );
    const user = userResult.rows[0];

    if (!user) {
      return errorResponse(res, 404, "User not found");
    }

    const itemsResult = await pool.query(
      `SELECT id, name, description, price, icon, item_type
       FROM shop_items
       ORDER BY price ASC, name ASC`
    );

    return res.json({
      success: true,
      gold: user.gold,
      items: itemsResult.rows
    });
  } catch (error) {
    logger.error("Fetching shop items failed", { error });
    return errorResponse(res, 500, "Unable to fetch shop items");
  }
});

router.post("/purchase/:itemId", async (req, res) => {
  const itemId = parseItemId(req.params.itemId);

  if (!itemId) {
    return errorResponse(res, 400, "Invalid shop item ID");
  }

  let client;
  let transactionActive = false;

  try {
    client = await pool.connect();
    await client.query("BEGIN");
    transactionActive = true;

    const userResult = await client.query(
      `SELECT id, gold
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

    const itemResult = await client.query(
      `SELECT id, name, description, price, icon, item_type
       FROM shop_items
       WHERE id = $1`,
      [itemId]
    );
    const item = itemResult.rows[0];

    if (!item) {
      await rollback(client);
      transactionActive = false;
      return errorResponse(res, 404, "Shop item not found");
    }

    const ownershipResult = await client.query(
      `SELECT 1
       FROM user_inventory
       WHERE user_id = $1 AND item_id = $2
       LIMIT 1`,
      [req.user.id, item.id]
    );

    if (ownershipResult.rowCount > 0) {
      await rollback(client);
      transactionActive = false;
      return errorResponse(res, 409, "You already own this item");
    }

    if (user.gold < item.price) {
      await rollback(client);
      transactionActive = false;
      return errorResponse(res, 400, "Not enough gold");
    }

    const updatedUserResult = await client.query(
      `UPDATE users
       SET gold = gold - $1
       WHERE id = $2 AND gold >= $1
       RETURNING gold`,
      [item.price, req.user.id]
    );

    if (updatedUserResult.rowCount !== 1) {
      throw new Error("User gold changed unexpectedly during purchase");
    }

    const inventoryResult = await client.query(
      `INSERT INTO user_inventory (user_id, item_id)
       VALUES ($1, $2)
       RETURNING purchased_at`,
      [req.user.id, item.id]
    );

    await createNotification(client, {
      userId: req.user.id,
      type: "purchase",
      title: "Item Purchased!",
      message: `${item.name} was added to your inventory.`
    });

    await client.query("COMMIT");
    transactionActive = false;

    return res.status(201).json({
      success: true,
      message: "Item purchased successfully",
      purchase: {
        item,
        remaining_gold: updatedUserResult.rows[0].gold,
        purchased_at: inventoryResult.rows[0].purchased_at
      }
    });
  } catch (error) {
    if (client && transactionActive) {
      await rollback(client);
    }

    if (isUniqueViolation(error)) {
      return errorResponse(res, 409, "You already own this item");
    }

    logger.error("Purchasing shop item failed", { error });
    return errorResponse(res, 500, "Unable to purchase shop item");
  } finally {
    client?.release();
  }
});

export default router;
