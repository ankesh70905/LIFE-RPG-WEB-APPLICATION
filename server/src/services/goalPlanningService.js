import { buildAIContext } from "./aiContextService.js";
import {
  isAIConfigured,
  requestAIJson,
  validateGoalPlan
} from "./aiService.js";

export const maximumGoalLength = 120;

export function normalizeGoal(value) {
  if (typeof value !== "string") {
    return null;
  }

  const goal = value.trim();
  return goal && goal.length <= maximumGoalLength ? goal : null;
}

function fallbackPlan(goal) {
  return [
    {
      step: 1,
      title: "Learn the basics",
      description: `Build a foundation for ${goal} with a few focused learning sessions.`,
      suggested_quests: [
        {
          title: `Learn the basics of ${goal}`,
          description: `Spend 20 minutes learning the key concepts behind ${goal}.`,
          category: "intellect",
          difficulty: "easy"
        }
      ]
    },
    {
      step: 2,
      title: "Practice regularly",
      description: `Turn ${goal} into a repeatable habit with small, consistent practice.`,
      suggested_quests: [
        {
          title: `Practice ${goal}`,
          description: `Complete one focused practice session for ${goal}.`,
          category: "discipline",
          difficulty: "normal"
        }
      ]
    },
    {
      step: 3,
      title: "Build a small project",
      description: `Apply what you learned about ${goal} in a tangible, encouraging challenge.`,
      suggested_quests: [
        {
          title: `Create a small ${goal} project`,
          description: `Use your new skills to make a simple result related to ${goal}.`,
          category: "creativity",
          difficulty: "normal"
        }
      ]
    }
  ];
}

export async function planGoal(goal, userId) {
  const context = await buildAIContext(userId, 30);

  if (!isAIConfigured()) {
    return {
      source: "fallback",
      goal,
      plan: fallbackPlan(goal)
    };
  }

  const aiOutput = await requestAIJson({
    systemPrompt:
      "Return JSON with a plan array containing 1 to 5 steps. Each step must have step, title, description, and suggested_quests. Each suggested quest must have title, description, category, and difficulty. Categories are intellect, strength, discipline, creativity. Difficulties are easy, normal, hard, epic. Never create or claim to create quests.",
    userPrompt: JSON.stringify({
      goal,
      character: context.profile,
      recent_quests: context.recent_quests,
      analytics: context.analytics
    })
  });
  const plan = validateGoalPlan(aiOutput);

  return {
    source: plan ? "ai" : "fallback",
    goal,
    plan: plan || fallbackPlan(goal)
  };
}

export { fallbackPlan };
