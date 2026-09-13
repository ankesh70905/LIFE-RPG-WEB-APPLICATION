import { getUserContext } from "./analyticsService.js";

// AI receives only bounded, non-sensitive progression data. In particular,
// credentials, email addresses, IDs and free-form private metadata are never
// forwarded to a provider.
export async function buildAIContext(userId, days = 30) {
  const context = await getUserContext(userId, Math.min(Math.max(Number(days) || 30, 1), 90));
  return {
    profile: {
      name: context.profile?.name || "Adventurer",
      level: Number(context.profile?.level) || 1,
      total_xp: Number(context.profile?.total_xp) || 0,
      current_streak: Number(context.profile?.current_streak) || 0,
      longest_streak: Number(context.profile?.longest_streak) || 0,
      attributes: context.profile?.attributes || {}
    },
    task_summary: context.task_summary,
    recent_quests: (context.recent_quests || []).slice(0, 30).map((task) => ({
      title: String(task.title || "").slice(0, 120),
      category: task.category,
      difficulty: task.difficulty,
      completed: Boolean(task.completed),
      created_at: task.created_at
    })),
    analytics: context.analytics
  };
}
