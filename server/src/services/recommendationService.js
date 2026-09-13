import {
  getOverviewAnalytics,
  getAttributeBalance,
  getWeakestAttribute
} from "./analyticsService.js";
import {
  isAIConfigured,
  requestAIJson,
  validateRecommendations
} from "./aiService.js";

function formatAttribute(attribute) {
  return attribute.charAt(0).toUpperCase() + attribute.slice(1);
}

function buildRuleRecommendations(profile, analytics) {
  const recommendations = [];
  const today = new Date().toISOString().slice(0, 10);
  const hasActivityToday = profile?.last_activity_date === today;
  const weakestAttribute = getWeakestAttribute(profile?.attributes);
  const balance = getAttributeBalance(profile?.attributes);

  if (!analytics.current.quests_completed && !analytics.active_days) {
    recommendations.push({
      type: "consistency",
      priority: "high",
      title: "Start Your Adventure",
      message: "Create a small quest today to begin building momentum.",
      action: "create_quest"
    });
  }

  if (!hasActivityToday) {
    recommendations.push({
      type: "streak",
      priority: profile?.current_streak ? "high" : "medium",
      title: profile?.current_streak ? "Protect Your Streak" : "Begin a New Streak",
      message: profile?.current_streak
        ? "Complete one easy quest today to maintain your consistency."
        : "Complete one achievable quest today to start a new streak.",
      action: "create_quest"
    });
  }

  if (!balance.balanced) {
    recommendations.push({
      type: "attribute",
      priority: "medium",
      title: `Grow Your ${formatAttribute(weakestAttribute)}`,
      message: `${formatAttribute(
        weakestAttribute
      )} is ready for more attention. Try a quest in this attribute.`,
      action: "create_quest"
    });
  }

  const leastActiveCategory = Object.entries(analytics.category_distribution)
    .sort(([, first], [, second]) => first - second)[0]?.[0];
  if (leastActiveCategory && leastActiveCategory !== weakestAttribute) {
    recommendations.push({
      type: "category",
      priority: "low",
      title: "Balance Your Quest Board",
      message: `Try an ${formatAttribute(
        leastActiveCategory
      )} quest to explore a less-used category.`,
      action: "create_quest"
    });
  }

  if (analytics.active_days < 4) {
    recommendations.push({
      type: "consistency",
      priority: "medium",
      title: "Build a Daily Rhythm",
      message: `You were active on ${analytics.active_days} of the last 7 days. A small daily quest can rebuild consistency.`,
      action: "create_quest"
    });
  }

  if (analytics.trend.direction === "improving") {
    recommendations.push({
      type: "progress",
      priority: "low",
      title: "Keep Your Momentum",
      message: "You completed more progress than in the previous period. Keep building on it.",
      action: "view_analytics"
    });
  }

  return recommendations.slice(0, 5);
}

export async function getRecommendations(userId) {
  const analytics = await getOverviewAnalytics(userId, 7);
  const recommendations = buildRuleRecommendations(analytics.profile, analytics);

  if (!isAIConfigured()) {
    return {
      source: "rules",
      recommendations
    };
  }

  const aiOutput = await requestAIJson({
    systemPrompt:
      "Return JSON with a recommendations array. Each item must have type, priority, title, message, and action. Use only types streak, attribute, category, consistency, progress; priorities high, medium, low; actions create_quest, view_analytics, view_character. Keep recommendations concise and based only on the supplied data.",
    userPrompt: JSON.stringify({
      profile: analytics.profile,
      analytics: {
        current: analytics.current,
        active_days: analytics.active_days,
        category_distribution: analytics.category_distribution,
        trend: analytics.trend
      }
    })
  });
  const aiRecommendations = validateRecommendations(aiOutput);

  return {
    source: aiRecommendations ? "ai" : "rules",
    recommendations: [
      ...recommendations,
      ...(aiRecommendations || [])
    ].slice(0, 5)
  };
}

export { buildRuleRecommendations };
