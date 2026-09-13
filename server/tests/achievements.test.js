import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { app } from "../src/server.js";
import {
  deleteTestUsers,
  describeWithDatabase
} from "./helpers/testDb.js";
import { createTestUser } from "./helpers/testUser.js";

describeWithDatabase("achievement API", () => {
  const emails = [];

  afterEach(async () => {
    await deleteTestUsers(emails.splice(0));
  });

  it("unlocks the first-quest achievement exactly once", async () => {
    const user = await createTestUser(app, "achievements");
    emails.push(user.email);

    const task = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${user.token}`)
      .send({
        title: "First achievement quest",
        category: "creativity",
        difficulty: "easy"
      });
    const completion = await request(app)
      .post(`/api/tasks/${task.body.task.id}/complete`)
      .set("Authorization", `Bearer ${user.token}`);

    expect(completion.body.achievements.map((item) => item.code)).toContain(
      "FIRST_QUEST"
    );

    const all = await request(app)
      .get("/api/achievements")
      .set("Authorization", `Bearer ${user.token}`);
    const unlocked = await request(app)
      .get("/api/achievements/unlocked")
      .set("Authorization", `Bearer ${user.token}`);
    expect(all.body.achievements).toHaveLength(13);
    expect(unlocked.body.achievements).toHaveLength(1);
    expect(unlocked.body.achievements.map((item) => item.code)).toContain(
      "FIRST_QUEST"
    );
  });
});
