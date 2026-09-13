import { describe, expect, it } from "vitest";
import {
  getUtcDateString,
  isYesterday,
  updateStreak
} from "../src/utils/streak.js";

describe("UTC streak calculations", () => {
  it("starts a first activity at one day", () => {
    expect(
      updateStreak({
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: null,
        today: "2024-02-29"
      })
    ).toMatchObject({
      currentStreak: 1,
      longestStreak: 1,
      lastActivityDate: "2024-02-29"
    });
  });

  it("does not increase twice on the same UTC day", () => {
    expect(
      updateStreak({
        currentStreak: 3,
        longestStreak: 3,
        lastActivityDate: "2024-03-01",
        today: "2024-03-01"
      }).currentStreak
    ).toBe(3);
  });

  it("increments across month and year boundaries", () => {
    expect(isYesterday("2023-12-31", "2024-01-01")).toBe(true);
    expect(isYesterday("2024-02-28", "2024-02-29")).toBe(true);
    expect(isYesterday("2024-02-29", "2024-03-01")).toBe(true);
  });

  it("resets a broken streak while preserving the longest streak", () => {
    expect(
      updateStreak({
        currentStreak: 4,
        longestStreak: 7,
        lastActivityDate: "2024-01-01",
        today: "2024-01-04"
      })
    ).toMatchObject({
      currentStreak: 1,
      longestStreak: 7
    });
  });

  it("normalizes JavaScript dates to UTC calendar days", () => {
    expect(getUtcDateString(new Date("2024-06-01T23:59:59.000Z"))).toBe(
      "2024-06-01"
    );
  });
});
