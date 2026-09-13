import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { pool } from "./db.js";
import authRoutes from "./routes/auth.js";
import activityRoutes from "./routes/activity.js";
import achievementsRoutes from "./routes/achievements.js";
import characterRoutes from "./routes/character.js";
import { errorHandler } from "./middleware/errorHandler.js";
import healthRoutes from "./routes/health.js";
import inventoryRoutes from "./routes/inventory.js";
import shopRoutes from "./routes/shop.js";
import streakRoutes from "./routes/streak.js";
import taskRoutes from "./routes/tasks.js";
import notificationsRoutes from "./routes/notifications.js";
import aiRoutes from "./routes/ai.js";
import recommendationsRoutes from "./routes/recommendations.js";
import analyticsRoutes from "./routes/analytics.js";
import goalsRoutes from "./routes/goals.js";
import habitsRoutes from "./routes/habits.js";
import plannerRoutes from "./routes/planner.js";
import remindersRoutes from "./routes/reminders.js";
import challengesRoutes from "./routes/challenges.js";
import friendsRoutes from "./routes/friends.js";
import preferencesRoutes from "./routes/preferences.js";
import { logger } from "./utils/logger.js";

const app = express();
const port = Number(process.env.PORT) || 5010;
const defaultClientUrls =
  process.env.NODE_ENV === "production"
    ? []
    : [
        "http://localhost:5173",
        "http://localhost:4173",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:4173"
      ];
const configuredOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = [...new Set([...configuredOrigins, ...defaultClientUrls])];

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin is not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);
app.use(express.json({ limit: "10kb" }));

app.use("/api/health", healthRoutes);
// Keep the existing versioned endpoint and support platform probes that
// conventionally call the unprefixed health path.
app.use("/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/achievements", achievementsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/character", characterRoutes);
app.use("/api/shop", shopRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/streak", streakRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/recommendations", recommendationsRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/goals", goalsRoutes);
app.use("/api/habits", habitsRoutes);
app.use("/api/planner", plannerRoutes);
app.use("/api/reminders", remindersRoutes);
app.use("/api/challenges", challengesRoutes);
app.use("/api/friends", friendsRoutes);
app.use("/api/preferences", preferencesRoutes);
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});
app.use(errorHandler);

export function startServer() {
  const server = app.listen(port, () => {
    logger.info("Life RPG API started", {
      port,
      environment: process.env.NODE_ENV || "development"
    });
  });

  let shuttingDown = false;

  async function shutdown(signal) {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    logger.info("Graceful shutdown started", { signal });

    server.close(async (serverError) => {
      if (serverError) {
        logger.error("HTTP server failed to close cleanly", {
          error: serverError
        });
        process.exitCode = 1;
      }

      try {
        await pool.end();
        logger.info("Database pool closed");
      } catch (error) {
        logger.error("Database pool failed to close cleanly", { error });
        process.exitCode = 1;
      }
    });
  }

  process.once("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
  process.once("SIGINT", () => {
    void shutdown("SIGINT");
  });

  return server;
}

export { app };

if (process.env.NODE_ENV !== "test") {
  startServer();
}
