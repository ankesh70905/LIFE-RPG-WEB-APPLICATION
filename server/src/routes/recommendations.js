import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
import { getRecommendations } from "../services/recommendationService.js";

const router = Router();

router.use(authRequired);

router.get("/", async (req, res, next) => {
  try {
    const result = await getRecommendations(req.user.id);
    return res.json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
});

export default router;
