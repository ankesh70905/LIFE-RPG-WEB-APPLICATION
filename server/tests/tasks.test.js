import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { app } from "../src/server.js";
import { pool } from "../src/db.js";
import { expectSafeError } from "./helpers/assertions.js";
import {
  deleteTestUsers,
  describeWithDatabase
} from "./helpers/testDb.js";
import { createTestUser } from "./helpers/testUser.js";

describeWithDatabase("quest API", () => {
  const emails = [];

  afterEach(async () => {
    await deleteTestUsers(emails.splice(0));
  });

  it("supports scoped CRUD, server-controlled rewards, and validation", async () => {
    const owner = await createTestUser(app, "tasks-owner");
    const otherUser = await createTestUser(app, "tasks-other");
    emails.push(owner.email, otherUser.email);

    const invalid = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({
        title: "Bad quest",
        category: "invalid",
        difficulty: "normal"
      });
    expectSafeError(invalid, 400);
    expectSafeError(
      await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${owner.token}`)
        .send({
          title: "Bad difficulty",
          category: "intellect",
          difficulty: "impossible"
        }),
      400
    );
    expectSafeError(
      await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${owner.token}`)
        .send({ category: "intellect", difficulty: "normal" }),
      400
    );

    const created = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({
        title: "Read a chapter",
        description: "Read ten pages",
        category: "intellect",
        difficulty: "hard",
        xp_reward: 999999
      });

    expect(created.status).toBe(201);
    expect(created.body.task).toMatchObject({
      title: "Read a chapter",
      xp_reward: 40,
      gold_reward: 10,
      completed: false
    });
    const taskId = created.body.task.id;

    const list = await request(app)
      .get("/api/tasks")
      .set("Authorization", `Bearer ${owner.token}`);
    expect(list.body.tasks).toHaveLength(1);

    const forbidden = await request(app)
      .get(`/api/tasks/${taskId}`)
      .set("Authorization", `Bearer ${otherUser.token}`);
    expectSafeError(forbidden, 404);
    expectSafeError(
      await request(app)
        .put(`/api/tasks/${taskId}`)
        .set("Authorization", `Bearer ${otherUser.token}`)
        .send({ title: "Not yours" }),
      404
    );

    const updated = await request(app)
      .put(`/api/tasks/${taskId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ difficulty: "epic", category: "strength" });
    expect(updated.status).toBe(200);
    expect(updated.body.task).toMatchObject({
      difficulty: "epic",
      category: "strength",
      xp_reward: 80,
      gold_reward: 20
    });

    const completed = await request(app)
      .post(`/api/tasks/${taskId}/complete`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(completed.status).toBe(200);
    expect(completed.body).toMatchObject({
      success: true,
      rewards: { xp: 80, gold: 20 },
      task: { completed: true }
    });

    expectSafeError(
      await request(app)
        .post(`/api/tasks/${taskId}/complete`)
        .set("Authorization", `Bearer ${owner.token}`),
      409
    );
    expectSafeError(
      await request(app)
        .put(`/api/tasks/${taskId}`)
        .set("Authorization", `Bearer ${owner.token}`)
        .send({ title: "Should fail" }),
      409
    );
    expectSafeError(
      await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set("Authorization", `Bearer ${owner.token}`),
      409
    );
  });

  it("rolls back quest completion when the character profile is unavailable", async () => {
    const user = await createTestUser(app, "rollback");
    emails.push(user.email);

    const created = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${user.token}`)
      .send({
        title: "Rollback quest",
        category: "discipline",
        difficulty: "normal"
      });
    const taskId = created.body.task.id;

    await pool.query(
      "DELETE FROM character_attributes WHERE user_id = (SELECT id FROM users WHERE email = $1)",
      [user.email]
    );

    expectSafeError(
      await request(app)
        .post(`/api/tasks/${taskId}/complete`)
        .set("Authorization", `Bearer ${user.token}`),
      404
    );

    const state = await pool.query(
      `SELECT t.completed, u.total_xp, u.gold, u.current_streak
       FROM tasks t
       JOIN users u ON u.id = t.user_id
       WHERE t.id = $1`,
      [taskId]
    );
    expect(state.rows[0]).toMatchObject({
      completed: false,
      total_xp: 0,
      gold: 0,
      current_streak: 0
    });
  });
});
