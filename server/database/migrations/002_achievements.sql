-- Phase 11: achievement catalog and per-user unlocks.

CREATE TABLE IF NOT EXISTS achievements (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  icon VARCHAR(20),
  category VARCHAR(30) NOT NULL,
  requirement_type VARCHAR(40) NOT NULL,
  requirement_value INTEGER NOT NULL CHECK (requirement_value > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT achievements_code_not_empty CHECK (btrim(code) <> ''),
  CONSTRAINT achievements_name_not_empty CHECK (btrim(name) <> ''),
  CONSTRAINT achievements_description_not_empty CHECK (btrim(description) <> ''),
  CONSTRAINT achievements_category_valid CHECK (
    category IN ('quests', 'streaks', 'progression', 'economy', 'attributes')
  ),
  CONSTRAINT achievements_requirement_valid CHECK (
    requirement_type IN (
      'quests_completed',
      'streak_days',
      'level',
      'gold',
      'attribute_intellect',
      'attribute_strength',
      'attribute_discipline',
      'attribute_creativity'
    )
  )
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id BIGINT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_achievements_unique_unlock UNIQUE (user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS user_achievements_user_unlocked_idx
  ON user_achievements (user_id, unlocked_at DESC);
