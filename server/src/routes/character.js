import { Router } from "express";
import { pool } from "../db.js";
import { authRequired } from "../middleware/auth.js";
import {
  getAttributeSummary,
  rankAttributes
} from "../utils/character.js";
import { getXpProgress } from "../utils/rpg.js";
import { logger } from "../utils/logger.js";

const router = Router();

router.use(authRequired);

function errorResponse(res, statusCode, message) {
  return res.status(statusCode).json({
    success: false,
    message
  });
}

function getProgression(totalXp, storedLevel) {
  const progress = getXpProgress(totalXp);

  if (storedLevel !== progress.level) {
    throw new Error("Stored user level does not match total XP");
  }

  const xpRemaining = progress.xpForNextLevel - progress.currentLevelXp;

  return {
    level: progress.level,
    total_xp: progress.totalXp,
    xp_for_next_level: progress.xpForNextLevel,
    current_level_xp: progress.currentLevelXp,
    xp_remaining: xpRemaining,
    progress_percentage: Number((progress.progress * 100).toFixed(2))
  };
}

function getAttributes(row) {
  return {
    intellect: row.intellect,
    strength: row.strength,
    discipline: row.discipline,
    creativity: row.creativity
  };
}

async function findCharacter(userId) {
  const result = await pool.query(
    `SELECT u.id, u.name, u.email, u.level, u.total_xp, u.gold,
            u.current_streak, u.longest_streak,
            u.last_activity_date::text AS last_activity_date,
            ca.id AS character_profile_id,
            ca.intellect, ca.strength, ca.discipline, ca.creativity
     FROM users u
     LEFT JOIN character_attributes ca ON ca.user_id = u.id
     WHERE u.id = $1`,
    [userId]
  );

  return result.rows[0] ?? null;
}

async function findCharacterAttributes(userId) {
  const result = await pool.query(
    `SELECT ca.id AS character_profile_id,
            ca.intellect, ca.strength, ca.discipline, ca.creativity
     FROM users u
     LEFT JOIN character_attributes ca ON ca.user_id = u.id
     WHERE u.id = $1`,
    [userId]
  );

  return result.rows[0] ?? null;
}

async function findUserStats(userId) {
  const result = await pool.query(
    `SELECT id, level, total_xp, gold, current_streak, longest_streak,
            last_activity_date::text AS last_activity_date
     FROM users
     WHERE id = $1`,
    [userId]
  );

  return result.rows[0] ?? null;
}

function requireCharacterProfile(res, row) {
  if (!row) {
    errorResponse(res, 404, "User not found");
    return false;
  }

  if (!row.character_profile_id) {
    errorResponse(res, 404, "Character profile not found");
    return false;
  }

  return true;
}

router.get("/attributes", async (req, res) => {
  try {
    const character = await findCharacterAttributes(req.user.id);

    if (!requireCharacterProfile(res, character)) {
      return;
    }

    const baseAttributes = getAttributes(character);

    return res.json({
      success: true,
      attributes: getAttributeSummary(baseAttributes),
      attribute_ranking: rankAttributes(baseAttributes)
    });
  } catch (error) {
    logger.error("Fetching character attributes failed", { error });
    return errorResponse(res, 500, "Unable to fetch character attributes");
  }
});

router.get("/stats", async (req, res) => {
  try {
    const user = await findUserStats(req.user.id);

    if (!user) {
      return errorResponse(res, 404, "User not found");
    }

    const progression = getProgression(user.total_xp, user.level);

    return res.json({
      success: true,
      stats: {
        ...progression,
        gold: user.gold,
        current_streak: user.current_streak,
        longest_streak: user.longest_streak,
        last_activity_date: user.last_activity_date
      }
    });
  } catch (error) {
    logger.error("Fetching character stats failed", { error });
    return errorResponse(res, 500, "Unable to fetch character stats");
  }
});

router.get("/", async (req, res) => {
  try {
    const character = await findCharacter(req.user.id);

    if (!requireCharacterProfile(res, character)) {
      return;
    }

    const baseAttributes = getAttributes(character);
    const progression = getProgression(character.total_xp, character.level);

    return res.json({
      success: true,
      character: {
        user: {
          id: character.id,
          name: character.name,
          email: character.email
        },
        progression,
        resources: {
          gold: character.gold
        },
        streak: {
          current_streak: character.current_streak,
          longest_streak: character.longest_streak,
          last_activity_date: character.last_activity_date
        },
        attributes: getAttributeSummary(baseAttributes),
        attribute_ranking: rankAttributes(baseAttributes)
      }
    });
  } catch (error) {
    logger.error("Fetching character profile failed", { error });
    return errorResponse(res, 500, "Unable to fetch character profile");
  }
});

export default router;
