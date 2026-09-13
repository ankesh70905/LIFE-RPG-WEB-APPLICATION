import { Router } from "express";
import { pool } from "../db.js";
import { authRequired } from "../middleware/auth.js";
import { getCurrentChallenges } from "../services/challengeService.js";
import { logger } from "../utils/logger.js";

const router = Router();
router.use(authRequired);

function error(res, status, message) {
  return res.status(status).json({ success: false, message });
}

async function list(req, res, cadence) {
  try {
    const challenges = await getCurrentChallenges(pool, req.user.id);
    return res.json({
      success: true,
      challenges: challenges.filter((challenge) => challenge.cadence === cadence)
    });
  } catch (cause) {
    logger.error(`Fetching challenges failed`, { error: cause });
    return error(res, 500, `Unable to fetch challenges`);
  }
}

router.get(`/daily`, (req, res) => list(req, res, `daily`));
router.get(`/weekly`, (req, res) => list(req, res, `weekly`));

router.get(`/`, async (req, res) => {
  try {
    return res.json({ success: true, challenges: await getCurrentChallenges(pool, req.user.id) });
  } catch (cause) {
    logger.error(`Fetching challenges failed`, { error: cause });
    return error(res, 500, `Unable to fetch challenges`);
  }
});

router.post(`/:id/complete`, (_req, res) =>
  error(res, 409, `Challenges progress automatically from quest and habit completion`)
);

export default router;
