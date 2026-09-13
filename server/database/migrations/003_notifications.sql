-- Phase 11: user notifications.

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL,
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT notifications_type_valid CHECK (
    type IN ('achievement', 'level_up', 'streak', 'purchase', 'system')
  ),
  CONSTRAINT notifications_title_not_empty CHECK (btrim(title) <> ''),
  CONSTRAINT notifications_message_not_empty CHECK (btrim(message) <> '')
);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON notifications (user_id, created_at DESC);
