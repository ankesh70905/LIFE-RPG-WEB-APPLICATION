import { describe, expect, it, vi } from "vitest";
import { checkAndUnlockAchievements } from "../src/utils/achievements.js";

const achievements = [
  ["FIRST_QUEST", "quests_completed", 1],
  ["QUEST_MASTER", "quests_completed", 10],
  ["STREAK_7", "streak_days", 7],
  ["LEVEL_5", "level", 5],
  ["GOLD_100", "gold", 100],
  ["INTELLECT_10", "attribute_intellect", 10],
  ["STRENGTH_10", "attribute_strength", 10],
  ["DISCIPLINE_10", "attribute_discipline", 10],
  ["CREATIVITY_10", "attribute_creativity", 10]
].map(([code, requirement_type, requirement_value], index) => ({
  id: index + 1,
  code,
  name: code,
  description: `${code} description`,
  icon: "✦",
  category: "quests",
  requirement_type,
  requirement_value
}));

describe("achievement evaluation", () => {
  it("evaluates quest, streak, level, gold, and attribute requirements", async () => {
    const client = {
      query: vi.fn((query) => {
        if (query.includes("FROM achievements")) {
          return Promise.resolve({ rows: achievements });
        }

        if (query.includes("FROM user_achievements")) {
          return Promise.resolve({ rows: [] });
        }

        return Promise.resolve({
          rowCount: 1,
          rows: [{ unlocked_at: "2026-09-12T00:00:00.000Z" }]
        });
      })
    };

    const unlocked = await checkAndUnlockAchievements(client, "1", {
      questsCompleted: 10,
      level: 5,
      gold: 100,
      goldEarned: 100,
      currentStreak: 7,
      attributes: {
        intellect: 10,
        strength: 10,
        discipline: 10,
        creativity: 10
      }
    });

    expect(unlocked.map((achievement) => achievement.code)).toEqual(
      achievements.map((achievement) => achievement.code)
    );
    expect(client.query).toHaveBeenCalledTimes(11);
  });

  it("does not insert achievements that are already unlocked", async () => {
    const client = {
      query: vi.fn((query) => {
        if (query.includes("FROM achievements")) {
          return Promise.resolve({ rows: achievements.slice(0, 1) });
        }

        if (query.includes("FROM user_achievements")) {
          return Promise.resolve({ rows: [{ achievement_id: 1 }] });
        }

        throw new Error("Unexpected insert");
      })
    };

    const unlocked = await checkAndUnlockAchievements(client, "1", {
      questsCompleted: 10,
      level: 5,
      gold: 100,
      goldEarned: 100,
      currentStreak: 7,
      attributes: {
        intellect: 10,
        strength: 10,
        discipline: 10,
        creativity: 10
      }
    });

    expect(unlocked).toEqual([]);
    expect(client.query).toHaveBeenCalledTimes(2);
  });
});
