import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { app } from "../src/server.js";
import { describeWithDatabase } from "./helpers/testDb.js";
import { createTestUser, deleteTestUser } from "./helpers/testUser.js";

describe("AI routes", () => {
  it("requires authentication", async () => {
    const response = await request(app)
      .post("/api/ai/suggest-quests")
      .send();

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});

describeWithDatabase("AI fallback routes", () => {
  let email;

  afterEach(async () => {
    if (email) {
      await deleteTestUser(email);
      email = null;
    }
  });

  it("returns validated fallback suggestions when AI is optional", async () => {
    const testUser = await createTestUser(app, "ai");
    email = testUser.email;

    const response = await request(app)
      .post("/api/ai/suggest-quests")
      .set("Authorization", `Bearer ${testUser.token}`)
      .send();

    expect(response.status).toBe(200);
    expect(response.body.source).toBe("fallback");
    expect(response.body.suggestions.length).toBeGreaterThan(0);
    expect(response.body.suggestions[0]).toMatchObject({
      category: expect.any(String),
      difficulty: expect.any(String),
      reason: expect.any(String)
    });
  });

  it("validates goals and returns a fallback plan without creating quests", async () => {
    const testUser = await createTestUser(app, "goal");
    email = testUser.email;

    const response = await request(app)
      .post("/api/ai/plan-goal")
      .set("Authorization", `Bearer ${testUser.token}`)
      .send({ goal: "Learn Python" });

    expect(response.status).toBe(200);
    expect(response.body.source).toBe("fallback");
    expect(response.body.plan).toHaveLength(3);

    const emptyResponse = await request(app)
      .post("/api/ai/plan-goal")
      .set("Authorization", `Bearer ${testUser.token}`)
      .send({ goal: " " });

    expect(emptyResponse.status).toBe(400);
  });
});
