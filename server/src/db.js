import "dotenv/config";
import pg from "pg";
import { logger } from "./utils/logger.js";

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  logger.warn(
    "DATABASE_URL is not configured; database health checks will remain unavailable."
  );
}

export const pool = new Pool({
  ...(databaseUrl ? { connectionString: databaseUrl } : {}),
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000
});

pool.on("error", (error) => {
  logger.error("Unexpected PostgreSQL pool error", { error });
});
