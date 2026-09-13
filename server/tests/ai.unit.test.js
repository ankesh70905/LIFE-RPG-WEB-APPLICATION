import { afterEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import {
  getAIValidationLimits,
  requestAIJson,
  validateGoalPlan,
  validateRecommendations,
  validateSuggestions
} from "../src/services/aiService.js";
import {
  fallbackPlan,
  normalizeGoal
} from "../src/services/goalPlanningService.js";
import { buildFallbackSuggestions } from "../src/services/questSuggestionService.js";
import { createAiRateLimiter } from "../src/middleware/aiRateLimiter.js";

describe("AI validation and fallbacks", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    vi.restoreAllMocks();
    global.fetch = originalFetch;
    delete process.env.AI_PROVIDER;
    delete process.env.AI_API_KEY;
    delete process.env.AI_MODEL;
    delete process.env.AI_API_URL;
  });

  it("accepts valid suggestions and rejects unsafe output", () => {
    const suggestions = validateSuggestions({
      suggestions: [
        {
          title: "Practice Python",
          description: "Review one small programming concept.",
          category: "intellect",
          difficulty: "easy",
          reason: "Learning quests support your current goal."
        }
      ]
    });

    expect(suggestions).toHaveLength(1);
    expect(
      validateSuggestions({
        suggestions: [
          {
            title: "Unsafe category",
            description: "Description",
            category: "passwords",
            difficulty: "easy"
          }
        ]
      })
    ).toBeNull();
  });

  it("validates plans and recommendations within their limits", () => {
    const plan = validateGoalPlan({
      plan: [
        {
          step: 1,
          title: "Learn the basics",
          description: "Build a foundation.",
          suggested_quests: [
            {
              title: "Read a guide",
              description: "Read for 20 minutes.",
              category: "intellect",
              difficulty: "easy"
            }
          ]
        }
      ]
    });

    expect(plan[0].suggested_quests[0].category).toBe("intellect");
    expect(
      validateGoalPlan({
        plan: [
          {
            step: 1,
            title: "First step",
            description: "Start here.",
            suggested_quests: []
          },
          {
            step: 1,
            title: "Repeated step",
            description: "This number is not unique.",
            suggested_quests: []
          }
        ]
      })
    ).toBeNull();
    expect(
      validateRecommendations({
        recommendations: [
          {
            type: "streak",
            priority: "high",
            title: "Protect your streak",
            message: "Complete one easy quest today.",
            action: "create_quest"
          }
        ]
      })
    ).toHaveLength(1);
    expect(getAIValidationLimits().maximumPlanSteps).toBe(5);
  });

  it("creates a clear rule-based goal plan", () => {
    expect(normalizeGoal("  Learn Python  ")).toBe("Learn Python");
    expect(normalizeGoal("")).toBeNull();
    expect(fallbackPlan("Learn Python")).toHaveLength(3);
  });

  it("creates fallback quest suggestions from user context", () => {
    const suggestions = buildFallbackSuggestions({
      profile: {
        current_streak: 0,
        attributes: {
          intellect: 4,
          strength: 0,
          discipline: 2,
          creativity: 1
        }
      },
      task_summary: { active_quests: 0 },
      analytics: {
        category_distribution: {
          intellect: 3,
          strength: 0,
          discipline: 1,
          creativity: 0
        }
      }
    });

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.every((suggestion) => suggestion.reason)).toBe(true);
    expect(suggestions.some((suggestion) => suggestion.category === "strength")).toBe(
      true
    );
  });

  it("parses a provider JSON response without exposing credentials", async () => {
    process.env.AI_PROVIDER = "openai-compatible";
    process.env.AI_API_KEY = "test-only-key";
    process.env.AI_API_URL = "https://example.test/chat";
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: '{"suggestions":[]}'
            }
          }
        ]
      })
    });

    await expect(
      requestAIJson({
        systemPrompt: "Return JSON.",
        userPrompt: "Use safe test data."
      })
    ).resolves.toEqual({ suggestions: [] });
    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.test/chat",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-only-key"
        })
      })
    );
  });

  it("limits requests by authenticated user", async () => {
    const app = express();
    app.use((req, _res, next) => {
      req.user = { id: "rate-limit-user" };
      next();
    });
    app.use(createAiRateLimiter({ limit: 2, windowMs: 60000 }));
    app.get("/", (_req, res) => res.json({ success: true }));

    expect((await request(app).get("/")).status).toBe(200);
    expect((await request(app).get("/")).status).toBe(200);
    const limitedResponse = await request(app).get("/");

    expect(limitedResponse.status).toBe(429);
    expect(limitedResponse.body.message).toContain("Too many AI requests");
  });
});
