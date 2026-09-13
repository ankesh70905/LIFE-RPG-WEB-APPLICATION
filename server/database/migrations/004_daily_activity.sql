-- Phase 11: UTC daily activity summaries.

CREATE TABLE IF NOT EXISTS user_daily_activity (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  quests_completed INTEGER NOT NULL DEFAULT 0 CHECK (quests_completed >= 0),
  xp_earned INTEGER NOT NULL DEFAULT 0 CHECK (xp_earned >= 0),
  gold_earned INTEGER NOT NULL DEFAULT 0 CHECK (gold_earned >= 0),
  CONSTRAINT user_daily_activity_unique_date UNIQUE (user_id, activity_date)
);

CREATE INDEX IF NOT EXISTS user_daily_activity_user_date_idx
  ON user_daily_activity (user_id, activity_date DESC);
