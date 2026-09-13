import { describe, expect, it } from "vitest";
import {
  getAttributeBalance,
  getWeakestAttribute
} from "../src/services/analyticsService.js";

describe("analytics helpers", () => {
  it("identifies strongest, weakest, and balanced attributes", () => {
    expect(
      getAttributeBalance({
        intellect: 4,
        strength: 2,
        discipline: 4,
        creativity: 1
      })
    ).toEqual({
      strongest: "intellect",
      weakest: "creativity",
      spread: 3,
      balanced: false
    });
    expect(getWeakestAttribute({ intellect: 3, strength: 1, discipline: 2, creativity: 1 })).toBe(
      "strength"
    );
    expect(
      getAttributeBalance({
        intellect: 1,
        strength: 1,
        discipline: 1,
        creativity: 1
      }).balanced
    ).toBe(true);
  });
});
