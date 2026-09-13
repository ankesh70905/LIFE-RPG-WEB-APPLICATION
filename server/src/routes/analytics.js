import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
import {
  getOverviewAnalytics,
  getWeeklyAnalytics,
  getAttributeBalance
} from "../services/analyticsService.js";

const router = Router();
const allowedPeriods = new Set([7, 30, 90]);

router.use(authRequired);

function parsePeriod(value) {
  if (value === undefined) {
    return 30;
  }

  if (Array.isArray(value) || !/^\d+$/.test(value)) {
    return null;
  }

  const period = Number(value);
  return allowedPeriods.has(period) ? period : null;
}

router.get("/weekly", async (req, res, next) => {
  try {
    const analytics = await getWeeklyAnalytics(req.user.id);
    return res.json({
      success: true,
      analytics
    });
  } catch (error) {
    next(error);
  }
});

router.get("/weekly-summary", async (req, res, next) => {
  try {
    const summary = await getWeeklyAnalytics(req.user.id);
    return res.json({ success: true, summary });
  } catch (error) {
    next(error);
  }
});

router.get("/overview", async (req, res, next) => {
  const period = parsePeriod(req.query.days);

  if (!period) {
    return res.status(400).json({
      success: false,
      message: "days must be one of 7, 30, or 90"
    });
  }

  try {
    const data = await getOverviewAnalytics(req.user.id, period);
    return res.json({
      success: true,
      period,
      analytics: {
        quests_completed: data.current.quests_completed,
        xp_earned: data.current.xp_earned,
        gold_earned: data.current.gold_earned,
        daily_activity: data.daily_activity,
        category_distribution: data.category_distribution,
        difficulty_distribution: data.difficulty_distribution,
        average_quests_per_active_day: data.average_quests_per_active_day,
        active_days: data.active_days,
        current_streak: data.profile?.current_streak ?? 0,
        longest_streak: data.profile?.longest_streak ?? 0,
        most_productive_day: data.most_productive_day,
        top_category: data.top_category,
        trend: data.trend
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get("/insights", async (req, res, next) => {
  try {
    const data = await getOverviewAnalytics(req.user.id, 7);
    const insights = [];
    const balance = getAttributeBalance(data.profile?.attributes);

    if (data.most_productive_day) {
      insights.push({
        type: "productive_day",
        title: "Most productive day",
        message: `${data.most_productive_day} is your most productive day.`,
        value: data.most_productive_day
      });
    }

    if (data.top_category) {
      insights.push({
        type: "category_strength",
        title: "Category strength",
        message: `${data.top_category.charAt(0).toUpperCase() + data.top_category.slice(1)} quests are your most completed category.`,
        value: data.top_category
      });
    }

    insights.push({
      type: "consistency",
      title: "Activity consistency",
      message: `You were active on ${data.active_days} out of 7 days.`,
      value: data.active_days
    });

    if (!balance.balanced) {
      insights.push({
        type: "attribute_balance",
        title: "Attribute balance",
        message: `${balance.weakest.charAt(0).toUpperCase() + balance.weakest.slice(1)} has received less attention recently. A small quest there can help you grow.`,
        strongest: balance.strongest,
        weakest: balance.weakest
      });
    }

    if (data.trend.direction !== "insufficient_data") {
      insights.push({
        type: "progress_trend",
        title: "Progress trend",
        message:
          data.trend.direction === "improving"
            ? "Your recent progress is improving. Keep building momentum."
            : data.trend.direction === "decreasing"
              ? "Your recent activity is quieter than the previous period. A small quest can help restart momentum."
              : "Your recent activity is steady. Keep your rhythm going.",
        value: data.trend.direction
      });
    }

    return res.json({
      success: true,
      insights,
      trend: data.trend,
      attribute_balance: balance
    });
  } catch (error) {
    next(error);
  }
});

export default router;
