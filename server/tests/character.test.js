import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { app } from "../src/server.js";
import {
  deleteTestUsers,
  describeWithDatabase
} from "./helpers/testDb.js";
import { createTestUser } from "./helpers/testUser.js";

describeWithDatabase("character API", () => {
  const emails = [];

  afterEach(async () => {
    await deleteTestUsers(emails.splice(0));
  });

  it("returns progression, attributes, streaks, and deterministic ranking", async () => {
    const user = await createTestUser(app, "character");
    emails.push(user.email);

    for (const category of ["intellect", "strength"]) {
      const task = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          title: `${category} quest`,
          category,
          difficulty: "normal"
        });
      await request(app)
        .post(`/api/tasks/${task.body.task.id}/complete`)
        .set("Authorization", `Bearer ${user.token}`);
    }

    const character = await request(app)
      .get("/api/character")
      .set("Authorization", `Bearer ${user.token}`);
    expect(character.status).toBe(200);
    // The second quest completes the daily quest challenge (+15 XP).
    expect(character.body.character.progression.total_xp).toBe(55);
    expect(character.body.character.attributes.total_attributes).toBe(2);
    expect(character.body.character.attributes.strongest_attributes).toEqual([
      "intellect",
      "strength"
    ]);
    expect(character.body.character.attribute_ranking.map((item) => item.name)).toEqual([
      "intellect",
      "strength",
      "discipline",
      "creativity"
    ]);

    const attributes = await request(app)
      .get("/api/character/attributes")
      .set("Authorization", `Bearer ${user.token}`);
    const stats = await request(app)
      .get("/api/character/stats")
      .set("Authorization", `Bearer ${user.token}`);
    expect(attributes.status).toBe(200);
    // The daily quest challenge also awards +4 gold.
    expect(stats.body.stats.gold).toBe(14);
    expect(stats.body.stats.current_streak).toBe(1);
  });
});
