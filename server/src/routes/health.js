import { Router } from "express";
import { pool } from "../db.js";
import { logger } from "../utils/logger.js";

const router = Router();
const startedAt = Date.now();

router.get("/", async (_req, res) => {
  try {
    await pool.query("SELECT NOW()");

    res.json({
      success: true,
      status: "ok",
      message: "Life RPG API and database are running",
      database: "connected",
      environment: process.env.NODE_ENV || "development",
      uptime_seconds: Math.floor((Date.now() - startedAt) / 1000)
    });
  } catch (error) {
    logger.error("Database health check failed", { error });

    res.status(503).json({
      success: false,
      status: "degraded",
      message: "Database connection failed",
      database: "disconnected",
      uptime_seconds: Math.floor((Date.now() - startedAt) / 1000)
    });
  }
});

export default router;
