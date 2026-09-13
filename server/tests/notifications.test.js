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

describeWithDatabase("notification API", () => {
  const emails = [];

  afterEach(async () => {
    await deleteTestUsers(emails.splice(0));
  });

  it("lists private notifications and supports read state changes", async () => {
    const owner = await createTestUser(app, "notifications-owner");
    const otherUser = await createTestUser(app, "notifications-other");
    emails.push(owner.email, otherUser.email);

    const userId = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [owner.email]
    );
    const inserted = await pool.query(
      `INSERT INTO notifications (user_id, type, title, message)
       VALUES ($1, 'system', 'Test update', 'A private update')
       RETURNING id`,
      [userId.rows[0].id]
    );
    const notificationId = inserted.rows[0].id;

    const listed = await request(app)
      .get("/api/notifications?limit=1")
      .set("Authorization", `Bearer ${owner.token}`);
    expect(listed.status).toBe(200);
    expect(listed.body.unread_count).toBe(1);
    expect(listed.body.notifications[0].title).toBe("Test update");

    const forbidden = await request(app)
      .patch(`/api/notifications/${notificationId}/read`)
      .set("Authorization", `Bearer ${otherUser.token}`);
    expectSafeError(forbidden, 404);

    const marked = await request(app)
      .patch(`/api/notifications/${notificationId}/read`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(marked.body.notification.is_read).toBe(true);

    const second = await pool.query(
      `INSERT INTO notifications (user_id, type, title, message)
       VALUES ($1, 'system', 'Second update', 'Another private update')`,
      [userId.rows[0].id]
    );
    expect(second.rowCount).toBe(1);
    const allRead = await request(app)
      .patch("/api/notifications/read-all")
      .set("Authorization", `Bearer ${owner.token}`);
    expect(allRead.body.updated_count).toBe(1);
  });
});
