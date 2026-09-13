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

describeWithDatabase("shop API", () => {
  const emails = [];

  afterEach(async () => {
    await deleteTestUsers(emails.splice(0));
  });

  it("lists items and atomically prevents unaffordable or duplicate purchases", async () => {
    const user = await createTestUser(app, "shop");
    emails.push(user.email);

    const items = await request(app)
      .get("/api/shop/items")
      .set("Authorization", `Bearer ${user.token}`);
    expect(items.status).toBe(200);
    const item = items.body.items.find((entry) => entry.name === "Focus Badge");
    expect(item).toBeDefined();

    expectSafeError(
      await request(app)
        .post(`/api/shop/purchase/${item.id}`)
        .set("Authorization", `Bearer ${user.token}`),
      400
    );

    await pool.query(
      "UPDATE users SET gold = 200 WHERE email = $1",
      [user.email]
    );

    const purchase = await request(app)
      .post(`/api/shop/purchase/${item.id}`)
      .set("Authorization", `Bearer ${user.token}`);
    expect(purchase.status).toBe(201);
    expect(purchase.body.purchase.remaining_gold).toBe(100);

    expectSafeError(
      await request(app)
        .post(`/api/shop/purchase/${item.id}`)
        .set("Authorization", `Bearer ${user.token}`),
      409
    );
    expectSafeError(
      await request(app)
        .post("/api/shop/purchase/not-an-id")
        .set("Authorization", `Bearer ${user.token}`),
      400
    );
    expectSafeError(
      await request(app)
        .post("/api/shop/purchase/999999999")
        .set("Authorization", `Bearer ${user.token}`),
      404
    );
  });
});
