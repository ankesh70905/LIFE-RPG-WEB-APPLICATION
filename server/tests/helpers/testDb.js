import { pool } from "../../src/db.js";
import { describe } from "vitest";

export const hasTestDatabase = Boolean(process.env.DATABASE_URL_TEST?.trim());
export const describeWithDatabase = hasTestDatabase ? describe : describe.skip;

export async function deleteTestUsers(emails) {
  if (!hasTestDatabase || !emails.length) {
    return;
  }

  await pool.query("DELETE FROM users WHERE email = ANY($1::text[])", [emails]);
}

export async function closeTestDatabase() {
  if (hasTestDatabase) {
    await pool.end();
  }
}
