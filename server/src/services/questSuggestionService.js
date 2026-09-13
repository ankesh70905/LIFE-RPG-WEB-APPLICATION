import { getWeakestAttribute } from "./analyticsService.js";
import { buildAIContext } from "./aiContextService.js";
import {
  isAIConfigured,
  requestAIJson,
  validateSuggestions
} from "./aiService.js";

function formatAttribute(attribute) {
  return attribute.charAt(0).toUpperCase() + attribute.slice(1);
}

function buildFallbackSuggestions(context) {
  const { profile, task_summary: taskSummary, analytics } = context;
  const weakest = getWeakestAttribute(profile?.attributes);
  const leastActiveCategory =
    Object.entries(analytics.category_distribution).sort(
      ([, first], [, second]) => first - second
    )[0]?.[0] || weakest;
  const suggestions = [];

  if (!taskSummary.active_quests) {
    suggestions.push({
      title: "Create a small quest today",
      description: "Choose one achievable action to keep your adventure moving.",
      category: weakest,
      difficulty: "easy",
      reason: "You have no active quests, so a small next step can restart your momentum."
    });
  }

  if (!profile?.current_streak || profile.current_streak < 3) {
    suggestions.push({
      title: "Complete one easy daily habit",
      description: "Pick a quick, repeatable action you can finish today.",
      category: "discipline",
      difficulty: "easy",
      reason: "A small completion can help build consistency and a stronger streak."
    });
  }

  suggestions.push({
    title: `Strengthen your ${formatAttribute(weakest)}`,
    description: `Spend 20 minutes on a practical ${weakest} activity.`,
    category: weakest,
    difficulty: "easy",
    reason: `${formatAttribute(weakest)} is currently your least developed attribute.`
  });

  if (leastActiveCategory !== weakest) {
    suggestions.push({
      title: `Try a ${formatAttribute(leastActiveCategory)} quest`,
      description: `Explore a less frequently completed ${leastActiveCategory} activity.`,
      category: leastActiveCategory,
      difficulty: "normal",
      reason: "Balancing categories gives more areas of your character room to grow."
    });
  }

  return suggestions.slice(0, 5);
}

export async function getQuestSuggestions(userId) {
  const context = await buildAIContext(userId, 30);
  const fallback = buildFallbackSuggestions(context);

  if (!isAIConfigured()) {
    return {
      source: "fallback",
      suggestions: fallback
    };
  }

  const aiOutput = await requestAIJson({
    systemPrompt:
      "Return JSON with a suggestions array containing 1 to 5 quest suggestions. Every suggestion needs title, description, category, difficulty, and reason. Categories are intellect, strength, discipline, creativity. Difficulties are easy, normal, hard, epic. Do not include any private authentication or credential data.",
    userPrompt: JSON.stringify({
      character: context.profile,
      task_summary: context.task_summary,
      recent_quests: context.recent_quests,
      analytics: context.analytics
    })
  });
  const suggestions = validateSuggestions(aiOutput);

  return {
    source: suggestions ? "ai" : "fallback",
    suggestions: suggestions || fallback
  };
}

export { buildFallbackSuggestions };
