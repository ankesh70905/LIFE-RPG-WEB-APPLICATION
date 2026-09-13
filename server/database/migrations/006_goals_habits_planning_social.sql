-- Phase 15+ foundation: goals, habits, planning, reminders, challenges, and privacy-first friends.

CREATE TABLE IF NOT EXISTS goals (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(20) NOT NULL DEFAULT 'discipline',
  status VARCHAR(12) NOT NULL DEFAULT 'active',
  target_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT goals_title_not_empty CHECK (btrim(title) <> ''),
  CONSTRAINT goals_category_valid CHECK (
    category IN ('intellect', 'strength', 'discipline', 'creativity')
  ),
  CONSTRAINT goals_status_valid CHECK (
    status IN ('active', 'completed', 'paused', 'archived')
  )
);

CREATE TABLE IF NOT EXISTS goal_milestones (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  goal_id BIGINT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  status VARCHAR(12) NOT NULL DEFAULT 'pending',
  position INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT goal_milestones_title_not_empty CHECK (btrim(title) <> ''),
  CONSTRAINT goal_milestones_status_valid CHECK (
    status IN ('pending', 'completed')
  ),
  CONSTRAINT goal_milestones_position_valid CHECK (position >= 0),
  CONSTRAINT goal_milestones_completion_consistent CHECK (
    (status = 'pending' AND completed_at IS NULL)
    OR (status = 'completed' AND completed_at IS NOT NULL)
  )
);

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS goal_id BIGINT REFERENCES goals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scheduled_date DATE,
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS scheduled_time TIME,
  ADD COLUMN IF NOT EXISTS priority VARCHAR(10) NOT NULL DEFAULT 'medium';

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_priority_valid;
ALTER TABLE tasks
  ADD CONSTRAINT tasks_priority_valid
  CHECK (priority IN ('low', 'medium', 'high'));

CREATE TABLE IF NOT EXISTS habits (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(20) NOT NULL DEFAULT 'discipline',
  frequency VARCHAR(10) NOT NULL DEFAULT 'daily',
  weekly_target INTEGER NOT NULL DEFAULT 1,
  custom_days SMALLINT[] NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  xp_reward INTEGER NOT NULL DEFAULT 5,
  gold_reward INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT habits_title_not_empty CHECK (btrim(title) <> ''),
  CONSTRAINT habits_category_valid CHECK (
    category IN ('intellect', 'strength', 'discipline', 'creativity')
  ),
  CONSTRAINT habits_frequency_valid CHECK (
    frequency IN ('daily', 'weekly', 'custom')
  ),
  CONSTRAINT habits_weekly_target_valid CHECK (weekly_target BETWEEN 1 AND 7),
  CONSTRAINT habits_xp_reward_valid CHECK (xp_reward BETWEEN 0 AND 25),
  CONSTRAINT habits_gold_reward_valid CHECK (gold_reward BETWEEN 0 AND 10),
  CONSTRAINT habits_custom_days_valid CHECK (
    custom_days <@ ARRAY[1, 2, 3, 4, 5, 6, 7]::SMALLINT[]
  )
);

CREATE TABLE IF NOT EXISTS habit_completions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  habit_id BIGINT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  completion_date DATE NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  gold_earned INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT habit_completions_once_per_day UNIQUE (habit_id, completion_date)
);

CREATE TABLE IF NOT EXISTS reminders (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reminder_type VARCHAR(20) NOT NULL,
  reference_id BIGINT,
  reminder_key VARCHAR(120) NOT NULL,
  title VARCHAR(160) NOT NULL,
  message TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  delivered_at TIMESTAMPTZ,
  notification_id BIGINT REFERENCES notifications(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT reminders_type_valid CHECK (
    reminder_type IN ('quest', 'habit', 'goal', 'challenge', 'system')
  ),
  CONSTRAINT reminders_title_not_empty CHECK (btrim(title) <> ''),
  CONSTRAINT reminders_message_not_empty CHECK (btrim(message) <> ''),
  CONSTRAINT reminders_user_key_unique UNIQUE (user_id, reminder_key)
);

CREATE TABLE IF NOT EXISTS user_challenges (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_key VARCHAR(80) NOT NULL,
  cadence VARCHAR(10) NOT NULL,
  metric VARCHAR(20) NOT NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  target INTEGER NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  xp_reward INTEGER NOT NULL DEFAULT 0,
  gold_reward INTEGER NOT NULL DEFAULT 0,
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  completed_at TIMESTAMPTZ,
  rewarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_challenges_cadence_valid CHECK (
    cadence IN ('daily', 'weekly')
  ),
  CONSTRAINT user_challenges_metric_valid CHECK (
    metric IN ('quest_count', 'habit_count')
  ),
  CONSTRAINT user_challenges_target_valid CHECK (target > 0),
  CONSTRAINT user_challenges_progress_valid CHECK (progress >= 0),
  CONSTRAINT user_challenges_rewards_valid CHECK (
    xp_reward >= 0 AND gold_reward >= 0
  ),
  CONSTRAINT user_challenges_period_valid CHECK (ends_on >= starts_on),
  CONSTRAINT user_challenges_period_unique UNIQUE (
    user_id, challenge_key, starts_on
  )
);

CREATE TABLE IF NOT EXISTS friend_requests (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  requester_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(12) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMPTZ,
  CONSTRAINT friend_requests_distinct_users CHECK (requester_id <> recipient_id),
  CONSTRAINT friend_requests_status_valid CHECK (
    status IN ('pending', 'accepted', 'declined', 'cancelled')
  )
);

CREATE TABLE IF NOT EXISTS friendships (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_one_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_two_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT friendships_distinct_users CHECK (user_one_id < user_two_id),
  CONSTRAINT friendships_pair_unique UNIQUE (user_one_id, user_two_id)
);

CREATE TABLE IF NOT EXISTS privacy_settings (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  share_display_name BOOLEAN NOT NULL DEFAULT FALSE,
  share_level BOOLEAN NOT NULL DEFAULT FALSE,
  share_streak BOOLEAN NOT NULL DEFAULT FALSE,
  share_achievements BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS goals_user_status_idx
  ON goals (user_id, status, target_date);
CREATE INDEX IF NOT EXISTS goal_milestones_goal_position_idx
  ON goal_milestones (goal_id, position, id);
CREATE INDEX IF NOT EXISTS tasks_user_schedule_idx
  ON tasks (user_id, scheduled_date, due_date);
CREATE INDEX IF NOT EXISTS tasks_goal_id_idx ON tasks (goal_id);
CREATE INDEX IF NOT EXISTS habits_user_active_idx ON habits (user_id, active);
CREATE INDEX IF NOT EXISTS habit_completions_habit_date_idx
  ON habit_completions (habit_id, completion_date DESC);
CREATE INDEX IF NOT EXISTS reminders_user_scheduled_idx
  ON reminders (user_id, enabled, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS user_challenges_user_period_idx
  ON user_challenges (user_id, cadence, starts_on DESC);
CREATE INDEX IF NOT EXISTS friend_requests_recipient_status_idx
  ON friend_requests (recipient_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS friendships_user_one_idx ON friendships (user_one_id);
CREATE INDEX IF NOT EXISTS friendships_user_two_idx ON friendships (user_two_id);

DROP TRIGGER IF EXISTS goals_set_updated_at ON goals;
CREATE TRIGGER goals_set_updated_at
BEFORE UPDATE ON goals
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS goal_milestones_set_updated_at ON goal_milestones;
CREATE TRIGGER goal_milestones_set_updated_at
BEFORE UPDATE ON goal_milestones
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS habits_set_updated_at ON habits;
CREATE TRIGGER habits_set_updated_at
BEFORE UPDATE ON habits
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS privacy_settings_set_updated_at ON privacy_settings;
CREATE TRIGGER privacy_settings_set_updated_at
BEFORE UPDATE ON privacy_settings
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
