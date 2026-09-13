import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { app } from "../src/server.js";
import { pool } from "../src/db.js";
import { describeWithDatabase } from "./helpers/testDb.js";
import { createTestUser, deleteTestUser } from "./helpers/testUser.js";

describeWithDatabase("analytics routes", () => {
  let email;
  let userId;

  afterEach(async () => {
    if (email) {
      await deleteTestUser(email);
      email = null;
      userId = null;
    }
  });

  async function seedCompletedQuest(offsetDays, title, xp, gold, category = "discipline") {
    await pool.query(
      `INSERT INTO tasks (
         user_id, title, description, category, difficulty,
         xp_reward, gold_reward, completed, completed_at
       )
       VALUES (
         $1, $2, 'analytics test quest', $3, 'easy',
         $4, $5, TRUE, CURRENT_DATE - ($6::integer * INTERVAL '1 day')
       )`,
      [userId, title, category, xp, gold, offsetDays]
    );
    await pool.query(
      `INSERT INTO user_daily_activity (
         user_id, activity_date, quests_completed, xp_earned, gold_earned
       )
       VALUES (
         $1, CURRENT_DATE - ($2::integer * INTERVAL '1 day'), 1, $3, $4
       )
       ON CONFLICT (user_id, activity_date)
       DO UPDATE SET
         quests_completed = user_daily_activity.quests_completed + EXCLUDED.quests_completed,
         xp_earned = user_daily_activity.xp_earned + EXCLUDED.xp_earned,
         gold_earned = user_daily_activity.gold_earned + EXCLUDED.gold_earned`,
      [userId, offsetDays, xp, gold]
    );
  }

  it("returns weekly and overview analytics with real totals", async () => {
    const testUser = await createTestUser(app, "analytics");
    email = testUser.email;
    userId = testUser.user.id;
    await seedCompletedQuest(0, "Current quest", 20, 5, "intellect");
    await seedCompletedQuest(8, "Previous quest", 10, 2, "strength");

    const weeklyResponse = await request(app)
      .get("/api/analytics/weekly")
      .set("Authorization", `Bearer ${testUser.token}`);

    expect(weeklyResponse.status).toBe(200);
    expect(weeklyResponse.body.analytics).toMatchObject({
      quests_completed: 1,
      xp_earned: 20,
      gold_earned: 5,
      weekly_change: { quests: 0, xp: 100 }
    });

    const overviewResponse = await request(app)
      .get("/api/analytics/overview?days=30")
      .set("Authorization", `Bearer ${testUser.token}`);

    expect(overviewResponse.status).toBe(200);
    expect(overviewResponse.body.analytics).toMatchObject({
      quests_completed: 2,
      xp_earned: 30,
      gold_earned: 7,
      top_category: "intellect"
    });
    expect(overviewResponse.body.analytics.daily_activity).toHaveLength(30);
    expect(overviewResponse.body.analytics.trend.direction).toBe(
      "insufficient_data"
    );
  });

  it("rejects unsupported overview periods", async () => {
    const testUser = await createTestUser(app, "analytics-period");
    email = testUser.email;

    const response = await request(app)
      .get("/api/analytics/overview?days=14")
      .set("Authorization", `Bearer ${testUser.token}`);

    expect(response.status).toBe(400);
    expect(response.body.message).toContain("7, 30, or 90");
  });

  it("returns private recommendations and data-backed insights", async () => {
    const firstUser = await createTestUser(app, "recommendations");
    email = firstUser.email;
    userId = firstUser.user.id;
    await seedCompletedQuest(0, "Insight quest", 20, 5, "intellect");

    const recommendationsResponse = await request(app)
      .get("/api/recommendations")
      .set("Authorization", `Bearer ${firstUser.token}`);
    const insightsResponse = await request(app)
      .get("/api/analytics/insights")
      .set("Authorization", `Bearer ${firstUser.token}`);

    expect(recommendationsResponse.status).toBe(200);
    expect(recommendationsResponse.body.source).toBe("rules");
    expect(recommendationsResponse.body.recommendations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "create_quest" })
      ])
    );
    expect(insightsResponse.status).toBe(200);
    expect(insightsResponse.body.insights).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "productive_day" }),
        expect.objectContaining({ type: "consistency" })
      ])
    );
  });
});
