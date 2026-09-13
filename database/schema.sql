-- Life RPG database schema
-- PostgreSQL

CREATE TABLE users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  total_xp INTEGER NOT NULL DEFAULT 0 CHECK (total_xp >= 0),
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
  gold INTEGER NOT NULL DEFAULT 0 CHECK (gold >= 0),
  token_version INTEGER NOT NULL DEFAULT 0 CHECK (token_version >= 0),
  current_streak INTEGER NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
  longest_streak INTEGER NOT NULL DEFAULT 0 CHECK (longest_streak >= 0),
  last_activity_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT users_name_not_empty CHECK (btrim(name) <> ''),
  CONSTRAINT users_email_not_empty CHECK (btrim(email) <> ''),
  CONSTRAINT users_password_hash_not_empty CHECK (btrim(password_hash) <> ''),
  CONSTRAINT users_streak_order CHECK (longest_streak >= current_streak)
);

CREATE TABLE character_attributes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  intellect INTEGER NOT NULL DEFAULT 0 CHECK (intellect >= 0),
  strength INTEGER NOT NULL DEFAULT 0 CHECK (strength >= 0),
  discipline INTEGER NOT NULL DEFAULT 0 CHECK (discipline >= 0),
  creativity INTEGER NOT NULL DEFAULT 0 CHECK (creativity >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tasks (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(20) NOT NULL,
  difficulty VARCHAR(10) NOT NULL,
  xp_reward INTEGER NOT NULL DEFAULT 0 CHECK (xp_reward >= 0),
  gold_reward INTEGER NOT NULL DEFAULT 0 CHECK (gold_reward >= 0),
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT tasks_title_not_empty CHECK (btrim(title) <> ''),
  CONSTRAINT tasks_category_valid CHECK (
    category IN ('intellect', 'strength', 'discipline', 'creativity')
  ),
  CONSTRAINT tasks_difficulty_valid CHECK (
    difficulty IN ('easy', 'normal', 'hard', 'epic')
  ),
  CONSTRAINT tasks_completion_consistent CHECK (
    (completed = FALSE AND completed_at IS NULL)
    OR (completed = TRUE AND completed_at IS NOT NULL)
  )
);

CREATE TABLE shop_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price >= 0),
  icon VARCHAR(20),
  item_type VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT shop_items_name_not_empty CHECK (btrim(name) <> ''),
  CONSTRAINT shop_items_description_not_empty CHECK (btrim(description) <> ''),
  CONSTRAINT shop_items_type_valid CHECK (
    item_type IN ('theme', 'badge', 'cosmetic', 'reward')
  )
);

CREATE TABLE user_inventory (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id BIGINT NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_inventory_unique_item UNIQUE (user_id, item_id)
);

CREATE INDEX tasks_user_id_idx ON tasks (user_id);
CREATE INDEX tasks_completed_idx ON tasks (completed);
CREATE INDEX user_inventory_user_id_idx ON user_inventory (user_id);

CREATE TABLE password_reset_otps (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  otp_hash CHAR(64) NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0 AND attempts <= 5),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  reset_token_hash CHAR(64),
  reset_token_expires_at TIMESTAMPTZ,
  reset_token_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX password_reset_otps_user_created_idx
  ON password_reset_otps (user_id, created_at DESC);

CREATE INDEX password_reset_otps_token_idx
  ON password_reset_otps (reset_token_hash)
  WHERE reset_token_hash IS NOT NULL AND reset_token_used_at IS NULL;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS character_attributes_set_updated_at ON character_attributes;
CREATE TRIGGER character_attributes_set_updated_at
BEFORE UPDATE ON character_attributes
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS tasks_set_updated_at ON tasks;
CREATE TRIGGER tasks_set_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

INSERT INTO shop_items (name, description, price, icon, item_type)
VALUES
  ('Focus Badge', 'A badge for dedicated adventurers.', 100, '🎯', 'badge'),
  ('Golden Frame', 'A golden frame for your adventurer profile.', 250, '👑', 'cosmetic'),
  ('Night Theme', 'Unlock a special midnight interface theme.', 150, '🌙', 'theme'),
  ('Energy Potion', 'A collectible virtual reward for your inventory.', 75, '🧪', 'reward')
ON CONFLICT (name) DO NOTHING;
