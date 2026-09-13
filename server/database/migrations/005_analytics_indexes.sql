-- Phase 13/14: indexes used by completed-quest analytics.

CREATE INDEX IF NOT EXISTS tasks_user_completed_at_idx
  ON tasks (user_id, completed_at DESC)
  WHERE completed = TRUE AND completed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS tasks_user_category_completed_idx
  ON tasks (user_id, category)
  WHERE completed = TRUE;
