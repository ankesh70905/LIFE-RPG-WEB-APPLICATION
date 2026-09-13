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

describeWithDatabase("inventory API", () => {
  const emails = [];

  afterEach(async () => {
    await deleteTestUsers(emails.splice(0));
  });

  it("scopes empty and purchased inventory to the authenticated user", async () => {
    const owner = await createTestUser(app, "inventory-owner");
    const otherUser = await createTestUser(app, "inventory-other");
    emails.push(owner.email, otherUser.email);

    const empty = await request(app)
      .get("/api/inventory")
      .set("Authorization", `Bearer ${owner.token}`);
    expect(empty.status).toBe(200);
    expect(empty.body.inventory).toEqual([]);

    await pool.query(
      "UPDATE users SET gold = 200 WHERE email = $1",
      [owner.email]
    );
    const item = await pool.query(
      "SELECT id FROM shop_items WHERE name = 'Focus Badge'"
    );
    await request(app)
      .post(`/api/shop/purchase/${item.rows[0].id}`)
      .set("Authorization", `Bearer ${owner.token}`);

    const inventory = await request(app)
      .get("/api/inventory")
      .set("Authorization", `Bearer ${owner.token}`);
    expect(inventory.body.inventory).toHaveLength(1);
    expect(inventory.body.inventory[0].name).toBe("Focus Badge");

    const otherInventory = await request(app)
      .get("/api/inventory")
      .set("Authorization", `Bearer ${otherUser.token}`);
    expect(otherInventory.body.inventory).toEqual([]);
    expectSafeError(await request(app).get("/api/inventory"), 401);
  });
});
