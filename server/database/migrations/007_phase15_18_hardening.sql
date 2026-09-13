-- Phase 15-18 hardening: enforce request idempotency and keep private
-- progression data scoped to its owner at the database boundary.

-- The application rejects duplicate pending requests, but this constraint also
-- closes the race between two simultaneous requests.
CREATE UNIQUE INDEX IF NOT EXISTS friend_requests_pending_pair_idx
  ON friend_requests (LEAST(requester_id, recipient_id), GREATEST(requester_id, recipient_id))
  WHERE status = 'pending';

-- These indexes support the owner-scoped lookups used by the planner,
-- completion and authorization paths.
CREATE INDEX IF NOT EXISTS habit_completions_user_date_idx
  ON habit_completions (user_id, completion_date DESC);

CREATE INDEX IF NOT EXISTS friend_requests_requester_status_idx
  ON friend_requests (requester_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS privacy_settings_user_id_idx
  ON privacy_settings (user_id);
