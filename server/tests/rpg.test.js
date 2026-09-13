import { describe, expect, it } from "vitest";
import {
  calculateLevel,
  getXpProgress,
  totalXpRequiredForLevel
} from "../src/utils/rpg.js";

describe("RPG progression calculations", () => {
  it("uses cumulative XP thresholds", () => {
    expect(totalXpRequiredForLevel(1)).toBe(0);
    expect(totalXpRequiredForLevel(2)).toBe(100);
    expect(totalXpRequiredForLevel(3)).toBe(500);
    expect(calculateLevel(499)).toBe(2);
    expect(calculateLevel(500)).toBe(3);
  });

  it("calculates current-level progress", () => {
    expect(getXpProgress(150)).toMatchObject({
      level: 2,
      currentLevelXp: 50,
      xpForNextLevel: 400,
      progress: 0.125
    });
  });

  it("handles a reward that crosses multiple levels", () => {
    expect(calculateLevel(100000)).toBeGreaterThan(1);
  });
});
