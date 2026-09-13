import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/server.js";
import { describeWithDatabase } from "./helpers/testDb.js";

describeWithDatabase("health API", () => {
  it.each(["/api/health", "/health"])(
    "reports application and database health without credentials at %s",
    async (path) => {
      const response = await request(app).get(path);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        status: "ok",
        database: "connected"
      });
      expect(response.body).not.toHaveProperty("database_url");
      expect(response.body).not.toHaveProperty("jwt_secret");
      expect(response.body.uptime_seconds).toEqual(expect.any(Number));
    }
  );
});
