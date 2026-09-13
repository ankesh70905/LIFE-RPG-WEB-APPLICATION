import { Router } from "express";
import { pool } from "../db.js";
import { authRequired } from "../middleware/auth.js";
import { logger } from "../utils/logger.js";

const router = Router();
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

function normalizedPair(first, second) {
  return BigInt(first) < BigInt(second) ? [first, second] : [second, first];
}

async function privacyFor(client, userId) {
  await client.query(
    `INSERT INTO privacy_settings (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );
  const result = await client.query(
    `SELECT share_display_name, share_level, share_streak, share_achievements
     FROM privacy_settings WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0];
}

router.get(`/privacy`, async (req, res) => {
  try {
    return res.json({ success: true, privacy: await privacyFor(pool, req.user.id) });
  } catch (cause) {
    logger.error(`Fetching privacy failed`, { error: cause });
    return error(res, 500, `Unable to fetch privacy settings`);
  }
});

router.put(`/privacy`, async (req, res) => {
  const fields = [
    `share_display_name`,
    `share_level`,
    `share_streak`,
    `share_achievements`
  ];
  if (!req.body || !fields.some((field) => Object.hasOwn(req.body, field))) {
    return error(res, 400, `At least one privacy setting is required`);
  }
  if (fields.some((field) => Object.hasOwn(req.body, field) && typeof req.body[field] !== `boolean`)) {
    return error(res, 400, `Privacy settings must be true or false`);
  }
  try {
    const existing = await privacyFor(pool, req.user.id);
    const value = Object.fromEntries(fields.map((field) => [field, Object.hasOwn(req.body, field) ? req.body[field] : existing[field]]));
    const result = await pool.query(
      `UPDATE privacy_settings
       SET share_display_name = $1, share_level = $2, share_streak = $3, share_achievements = $4
       WHERE user_id = $5
       RETURNING share_display_name, share_level, share_streak, share_achievements`,
      [value.share_display_name, value.share_level, value.share_streak, value.share_achievements, req.user.id]
    );
    return res.json({ success: true, privacy: result.rows[0] });
  } catch (cause) {
    logger.error(`Updating privacy failed`, { error: cause });
    return error(res, 500, `Unable to update privacy settings`);
  }
});

router.get(`/requests`, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT fr.id, fr.created_at, u.name AS requester_name
       FROM friend_requests fr
       JOIN users u ON u.id = fr.requester_id
       WHERE fr.recipient_id = $1 AND fr.status = 'pending'
       ORDER BY fr.created_at DESC`,
      [req.user.id]
    );
    return res.json({ success: true, requests: result.rows });
  } catch (cause) {
    logger.error(`Fetching friend requests failed`, { error: cause });
    return error(res, 500, `Unable to fetch friend requests`);
  }
});

async function updateRequestStatus(req, res, status, ownerColumn, message) {
  const requestId = parseId(req.params.id);
  if (!requestId) return error(res, 400, `Invalid request ID`);

  try {
    const result = await pool.query(
      `UPDATE friend_requests
       SET status = $1, responded_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND ${ownerColumn} = $3 AND status = 'pending'
       RETURNING id, status, responded_at`,
      [status, requestId, req.user.id]
    );
    if (!result.rowCount) return error(res, 404, `Friend request not found`);
    return res.json({ success: true, request: result.rows[0], message });
  } catch (cause) {
    logger.error(`Updating friend request failed`, { error: cause });
    return error(res, 500, `Unable to update friend request`);
  }
}

router.post(`/requests/:id/decline`, (req, res) =>
  updateRequestStatus(req, res, `declined`, `recipient_id`, `Friend request declined`)
);

router.post(`/requests/:id/cancel`, (req, res) =>
  updateRequestStatus(req, res, `cancelled`, `requester_id`, `Friend request cancelled`)
);

// Keep request actions consistent with the existing /:id/accept endpoint.
router.post(`/:id/decline`, (req, res) =>
  updateRequestStatus(req, res, `declined`, `recipient_id`, `Friend request declined`)
);

router.post(`/:id/cancel`, (req, res) =>
  updateRequestStatus(req, res, `cancelled`, `requester_id`, `Friend request cancelled`)
);

router.post(`/request`, async (req, res) => {
  const email = typeof req.body?.email === `string` ? req.body.email.trim().toLowerCase() : ``;
  if (!email || email.length > 255) return error(res, 400, `A valid email is required`);
  try {
    const recipient = await pool.query(
      `SELECT id FROM users WHERE email = $1`,
      [email]
    );
    if (!recipient.rowCount || String(recipient.rows[0].id) === String(req.user.id)) {
      return error(res, 400, `Unable to send a friend request to this account`);
    }
    const recipientId = recipient.rows[0].id;
    const [userOne, userTwo] = normalizedPair(req.user.id, recipientId);
    const existingFriendship = await pool.query(
      `SELECT id FROM friendships WHERE user_one_id = $1 AND user_two_id = $2`,
      [userOne, userTwo]
    );
    if (existingFriendship.rowCount) return error(res, 409, `You are already friends`);
    const existingRequest = await pool.query(
      `SELECT id FROM friend_requests
       WHERE status = 'pending'
         AND ((requester_id = $1 AND recipient_id = $2) OR (requester_id = $2 AND recipient_id = $1))`,
      [req.user.id, recipientId]
    );
    if (existingRequest.rowCount) return error(res, 409, `A pending request already exists`);
    const created = await pool.query(
      `INSERT INTO friend_requests (requester_id, recipient_id)
       VALUES ($1, $2) RETURNING id, created_at`,
      [req.user.id, recipientId]
    );
    return res.status(201).json({ success: true, request: created.rows[0] });
  } catch (cause) {
    logger.error(`Sending friend request failed`, { error: cause });
    return error(res, 500, `Unable to send friend request`);
  }
});

router.post(`/:id/accept`, async (req, res) => {
  const requestId = parseId(req.params.id);
  if (!requestId) return error(res, 400, `Invalid request ID`);
  let client;
  try {
    client = await pool.connect();
    await client.query(`BEGIN`);
    const request = await client.query(
      `SELECT id, requester_id, recipient_id FROM friend_requests
       WHERE id = $1 AND recipient_id = $2 AND status = 'pending' FOR UPDATE`,
      [requestId, req.user.id]
    );
    if (!request.rowCount) {
      await client.query(`ROLLBACK`);
      return error(res, 404, `Friend request not found`);
    }
    const [userOne, userTwo] = normalizedPair(request.rows[0].requester_id, req.user.id);
    const friendship = await client.query(
      `INSERT INTO friendships (user_one_id, user_two_id) VALUES ($1, $2)
       ON CONFLICT (user_one_id, user_two_id) DO UPDATE SET user_one_id = EXCLUDED.user_one_id
       RETURNING id, created_at`,
      [userOne, userTwo]
    );
    await client.query(
      `UPDATE friend_requests SET status = 'accepted', responded_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [requestId]
    );
    await client.query(`COMMIT`);
    return res.json({ success: true, friendship: friendship.rows[0] });
  } catch (cause) {
    if (client) await client.query(`ROLLBACK`).catch(() => {});
    logger.error(`Accepting friend request failed`, { error: cause });
    return error(res, 500, `Unable to accept friend request`);
  } finally {
    client?.release();
  }
});

router.get(`/`, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT f.id,
              CASE WHEN f.user_one_id = $1 THEN f.user_two_id ELSE f.user_one_id END AS friend_id,
              f.created_at,
              u.name, u.level, u.current_streak,
              p.share_display_name, p.share_level, p.share_streak, p.share_achievements,
              COALESCE(a.achievement_count, 0)::int AS achievement_count
       FROM friendships f
       JOIN users u ON u.id = CASE WHEN f.user_one_id = $1 THEN f.user_two_id ELSE f.user_one_id END
       LEFT JOIN privacy_settings p ON p.user_id = u.id
       LEFT JOIN (
         SELECT user_id, COUNT(*)::int AS achievement_count
         FROM user_achievements GROUP BY user_id
       ) a ON a.user_id = u.id
       WHERE f.user_one_id = $1 OR f.user_two_id = $1
       ORDER BY f.created_at DESC`,
      [req.user.id]
    );
    const friends = result.rows.map((friend) => ({
      id: friend.id,
      created_at: friend.created_at,
      profile: {
        display_name: friend.share_display_name ? friend.name : null,
        level: friend.share_level ? friend.level : null,
        current_streak: friend.share_streak ? friend.current_streak : null,
        achievement_count: friend.share_achievements ? friend.achievement_count : null
      }
    }));
    return res.json({ success: true, friends });
  } catch (cause) {
    logger.error(`Fetching friends failed`, { error: cause });
    return error(res, 500, `Unable to fetch friends`);
  }
});

router.delete(`/:id`, async (req, res) => {
  const friendshipId = parseId(req.params.id);
  if (!friendshipId) return error(res, 400, `Invalid friendship ID`);
  try {
    const result = await pool.query(
      `DELETE FROM friendships
       WHERE id = $1 AND (user_one_id = $2 OR user_two_id = $2)
       RETURNING id`,
      [friendshipId, req.user.id]
    );
    if (!result.rowCount) return error(res, 404, `Friendship not found`);
    return res.json({ success: true, message: `Friend removed` });
  } catch (cause) {
    logger.error(`Removing friend failed`, { error: cause });
    return error(res, 500, `Unable to remove friend`);
  }
});

export default router;
