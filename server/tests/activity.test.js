import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { app } from "../src/server.js";
import { expectSafeError } from "./helpers/assertions.js";
import {
  deleteTestUsers,
  describeWithDatabase
} from "./helpers/testDb.js";
import { createTestUser } from "./helpers/testUser.js";

describeWithDatabase("daily activity API", () => {
  const emails = [];

  afterEach(async () => {
    await deleteTestUsers(emails.splice(0));
  });

  it("aggregates completed quests and validates the date window", async () => {
    const user = await createTestUser(app, "activity");
    emails.push(user.email);

    for (const category of ["intellect", "discipline"]) {
      const task = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          title: `${category} activity`,
          category,
          difficulty: "normal"
        });
      await request(app)
        .post(`/api/tasks/${task.body.task.id}/complete`)
        .set("Authorization", `Bearer ${user.token}`);
    }

    const activity = await request(app)
      .get("/api/activity?days=1")
      .set("Authorization", `Bearer ${user.token}`);
    expect(activity.status).toBe(200);
    expect(activity.body.activity[0]).toMatchObject({
      quests_completed: 2,
      xp_earned: 40,
      gold_earned: 10
    });

    expect(
      (await request(app)
        .get("/api/activity?days=90")
        .set("Authorization", `Bearer ${user.token}`)).status
    ).toBe(200);
    expectSafeError(
      await request(app)
        .get("/api/activity?days=0")
        .set("Authorization", `Bearer ${user.token}`),
      400
    );
    expectSafeError(
      await request(app)
        .get("/api/activity?days=91")
        .set("Authorization", `Bearer ${user.token}`),
      400
    );
  });
});
