import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
import { aiRateLimiter } from "../middleware/aiRateLimiter.js";
import { getQuestSuggestions } from "../services/questSuggestionService.js";
import { maximumGoalLength, normalizeGoal, planGoal } from "../services/goalPlanningService.js";
import { buildAIContext } from "../services/aiContextService.js";
import { getWeeklyAnalytics } from "../services/analyticsService.js";

const router = Router();

router.use(authRequired);
router.use(aiRateLimiter);

router.post("/suggest-quests", async (req, res, next) => {
  try {
    const result = await getQuestSuggestions(req.user.id);
    return res.json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
});

router.post("/plan-goal", async (req, res, next) => {
  const goal = normalizeGoal(req.body?.goal);

  if (!goal) {
    return res.status(400).json({
      success: false,
      message: `goal is required and must be ${maximumGoalLength} characters or fewer`
    });

    router.get("/coach", async (req, res, next) => {
      try {
        const result = await getQuestSuggestions(req.user.id);
        return res.json({ success: true, ...result, explanation: "Suggestions use your recent activity and character progression." });
      } catch (error) { return next(error); }
    });

    router.get("/priorities", async (req, res, next) => {
      try {
        const context = await buildAIContext(req.user.id, 30);
        const priorities = (context.recent_quests || [])
          .filter((task) => !task.completed)
          .sort((a, b) => (a.priority === "high" ? -1 : 1) - (b.priority === "high" ? -1 : 1))
          .slice(0, 5)
          .map((task, index) => ({ rank: index + 1, title: task.title, category: task.category, difficulty: task.difficulty }));
        return res.json({ success: true, source: "context", priorities, explanation: "Priorities are limited to your active quests and never include private account data." });
      } catch (error) { return next(error); }
    });

    router.post("/weekly-plan", async (req, res, next) => {
      const goal = normalizeGoal(req.body?.goal || "Make steady progress this week");
      if (!goal) return res.status(400).json({ success: false, message: `goal is required and must be ${maximumGoalLength} characters or fewer` });
      try {
        const result = await planGoal(goal, req.user.id);
        return res.json({
          success: true,
          ...result,
          explanation: result.source === "ai"
            ? "The plan was generated from bounded progression context and validated before return."
            : "AI was unavailable or returned invalid data, so a safe deterministic plan was used."
        });
      } catch (error) { return next(error); }
    });

    router.get("/weekly-summary", async (req, res, next) => {
      try {
        const summary = await getWeeklyAnalytics(req.user.id);
        return res.json({ success: true, summary });
      } catch (error) { return next(error); }
    });
  }

  try {
    const result = await planGoal(goal, req.user.id);
    return res.json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
});

export default router;
