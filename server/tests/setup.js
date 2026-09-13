import dotenv from "dotenv";
import { afterAll } from "vitest";

dotenv.config();
dotenv.config({ path: ".env.test", override: false });
process.env.NODE_ENV = "test";

if (process.env.DATABASE_URL_TEST?.trim()) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST.trim();
}

if (!process.env.JWT_SECRET?.trim()) {
  process.env.JWT_SECRET = "phase12-test-secret";
}

const { pool } = await import("../src/db.js");

afterAll(async () => {
  await pool.end();
});
