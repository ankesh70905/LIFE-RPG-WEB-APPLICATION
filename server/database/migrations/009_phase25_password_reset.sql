-- Phase 25: single-use, expiring password reset OTPs.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS password_reset_otps (
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

CREATE INDEX IF NOT EXISTS password_reset_otps_user_created_idx
  ON password_reset_otps (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS password_reset_otps_token_idx
  ON password_reset_otps (reset_token_hash)
  WHERE reset_token_hash IS NOT NULL AND reset_token_used_at IS NULL;

