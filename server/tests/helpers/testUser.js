import request from "supertest";
import { pool } from "../../src/db.js";

let sequence = 0;

export async function createTestUser(app, prefix = "user") {
  sequence += 1;
  const email = `phase12-${prefix}-${Date.now()}-${sequence}@example.com`;
  const response = await request(app)
    .post("/api/auth/signup")
    .send({
      name: `Phase 12 ${prefix}`,
      email,
      password: "phase12-password"
    });

  if (response.status !== 201) {
    throw new Error(`Could not create test user: ${JSON.stringify(response.body)}`);
  }

  return {
    email,
    token: response.body.token,
    user: response.body.user
  };
}

export async function deleteTestUser(email) {
  await pool.query("DELETE FROM users WHERE email = $1", [email]);
}
