import { Router } from "express";
import bcrypt from "bcrypt";
import { pool } from "../db.js";
import { authRequired } from "../middleware/auth.js";
import {
  authRateLimiter,
  passwordResetRequestRateLimiter,
  passwordResetVerifyRateLimiter
} from "../middleware/rateLimiter.js";
import {
  assertJwtConfiguration,
  createToken
} from "../utils/jwt.js";
import { logger } from "../utils/logger.js";
import {
  PASSWORD_RESET_OTP_MAX_ATTEMPTS,
  PASSWORD_RESET_OTP_TTL_MS,
  PASSWORD_RESET_RESEND_COOLDOWN_MS,
  generateOtp,
  generateResetToken,
  hashOtp,
  hashResetToken,
  verifyOtp
} from "../utils/passwordReset.js";
import { sendPasswordResetOtp } from "../services/emailService.js";

const router = Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordSaltRounds = 12;
const genericPasswordResetMessage =
  "If an account exists for that email, we sent a password reset code.";
const genericPasswordResetError = "Invalid or expired password reset request";

function errorResponse(res, statusCode, message) {
  return res.status(statusCode).json({
    success: false,
    message
  });
}

function isUniqueViolation(error) {
  return error?.code === "23505";
}

async function rollback(client) {
  try {
    await client.query("ROLLBACK");
  } catch (error) {
    logger.error("Failed to roll back authentication transaction", { error });
  }
}

router.post("/signup", authRateLimiter, async (req, res) => {
  const rawName = req.body?.name;
  const rawEmail = req.body?.email;
  const rawPassword = req.body?.password;

  if (typeof rawName !== "string" || !rawName.trim()) {
    return errorResponse(res, 400, "Name is required");
  }

  if (typeof rawEmail !== "string" || !rawEmail.trim()) {
    return errorResponse(res, 400, "Email is required");
  }

  if (typeof rawPassword !== "string" || !rawPassword) {
    return errorResponse(res, 400, "Password is required");
  }

  const name = rawName.trim();
  const email = rawEmail.trim().toLowerCase();

  if (name.length > 100) {
    return errorResponse(res, 400, "Name must be 100 characters or fewer");
  }

  if (email.length > 255) {
    return errorResponse(res, 400, "Email must be 255 characters or fewer");
  }

  if (!emailPattern.test(email)) {
    return errorResponse(res, 400, "Please provide a valid email address");
  }

  if (rawPassword.length < 8) {
    return errorResponse(
      res,
      400,
      "Password must be at least 8 characters long"
    );
  }

  if (Buffer.byteLength(rawPassword, "utf8") > 72) {
    return errorResponse(res, 400, "Password must be 72 bytes or fewer");
  }

  let client;

  try {
    assertJwtConfiguration();
    const passwordHash = await bcrypt.hash(rawPassword, passwordSaltRounds);

    client = await pool.connect();
    await client.query("BEGIN");

    const existingUser = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rowCount > 0) {
      await rollback(client);
      return errorResponse(res, 409, "Email is already registered");
    }

    const userResult = await client.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, level, total_xp, gold, token_version`,
      [name, email, passwordHash]
    );
    const user = userResult.rows[0];

    await client.query(
      "INSERT INTO character_attributes (user_id) VALUES ($1)",
      [user.id]
    );

    const token = createToken(user);
    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user
    });
  } catch (error) {
    if (client) {
      await rollback(client);
    }

    if (error?.code === "JWT_SECRET_MISSING") {
      logger.error("Signup failed because JWT_SECRET is not configured");
      return errorResponse(
        res,
        500,
        "Authentication service is not configured"
      );
    }

    if (isUniqueViolation(error)) {
      return errorResponse(res, 409, "Email is already registered");
    }

    logger.error("Signup failed", { error });
    return errorResponse(res, 500, "Unable to register user");
  } finally {
    client?.release();
  }
});

router.post("/login", authRateLimiter, async (req, res) => {
  const rawEmail = req.body?.email;
  const rawPassword = req.body?.password;

  if (typeof rawEmail !== "string" || !rawEmail.trim()) {
    return errorResponse(res, 400, "Email is required");
  }

  if (typeof rawPassword !== "string" || !rawPassword) {
    return errorResponse(res, 400, "Password is required");
  }

  const email = rawEmail.trim().toLowerCase();

  if (email.length > 255) {
    return errorResponse(res, 400, "Email must be 255 characters or fewer");
  }

  if (!emailPattern.test(email)) {
    return errorResponse(res, 400, "Please provide a valid email address");
  }

  try {
    assertJwtConfiguration();

    const result = await pool.query(
      `SELECT id, name, email, password_hash, level, total_xp, gold, token_version
       FROM users
       WHERE email = $1`,
      [email]
    );
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(rawPassword, user.password_hash))) {
      return errorResponse(res, 401, "Invalid email or password");
    }

    return res.json({
      success: true,
      message: "Login successful",
      token: createToken(user),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        level: user.level,
        total_xp: user.total_xp,
        gold: user.gold
      }
    });
  } catch (error) {
    if (error?.code === "JWT_SECRET_MISSING") {
      logger.error("Login failed because JWT_SECRET is not configured");
      return errorResponse(
        res,
        500,
        "Authentication service is not configured"
      );
    }

    logger.error("Login failed", { error });
    return errorResponse(res, 500, "Unable to log in");
  }
});

async function requestPasswordReset(req, res) {
  res.set("Cache-Control", "no-store");
  const rawEmail = req.body?.email;

  if (typeof rawEmail !== "string" || !rawEmail.trim()) {
    return errorResponse(res, 400, "Email is required");
  }

  const email = rawEmail.trim().toLowerCase();
  if (email.length > 255 || !emailPattern.test(email)) {
    return errorResponse(res, 400, "Please provide a valid email address");
  }

  let client;

  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const userResult = await client.query(
      "SELECT id, email FROM users WHERE email = $1 FOR UPDATE",
      [email]
    );

    if (!userResult.rowCount) {
      await client.query("COMMIT");
      return res.status(202).json({
        success: true,
        message: genericPasswordResetMessage
      });
    }

    const user = userResult.rows[0];
    const recentResult = await client.query(
      `SELECT created_at
       FROM password_reset_otps
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [user.id]
    );
    const lastSentAt = recentResult.rows[0]?.created_at
      ? new Date(recentResult.rows[0].created_at).getTime()
      : 0;

    if (
      lastSentAt &&
      Date.now() - lastSentAt < PASSWORD_RESET_RESEND_COOLDOWN_MS
    ) {
      await client.query("COMMIT");
      return res.status(202).json({
        success: true,
        message: genericPasswordResetMessage
      });
    }

    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_OTP_TTL_MS);

    await client.query(
      `UPDATE password_reset_otps
       SET consumed_at = COALESCE(consumed_at, CURRENT_TIMESTAMP),
           reset_token_used_at = COALESCE(reset_token_used_at, CURRENT_TIMESTAMP)
       WHERE user_id = $1
         AND (consumed_at IS NULL OR reset_token_hash IS NOT NULL)`,
      [user.id]
    );
    await client.query(
      `INSERT INTO password_reset_otps (user_id, otp_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, otpHash, expiresAt]
    );
    await client.query("COMMIT");

    try {
      await sendPasswordResetOtp({ to: user.email, otp });
    } catch (error) {
      await pool.query(
        `UPDATE password_reset_otps
         SET consumed_at = CURRENT_TIMESTAMP
         WHERE user_id = $1
           AND otp_hash = $2
           AND consumed_at IS NULL`,
        [user.id, otpHash]
      );
      logger.error("Password reset email was not delivered", {
        errorCode: error?.code,
        responseCode: error?.responseCode,
        providerMessage: error?.message
      });
      return errorResponse(
        res,
        503,
        "We couldn't send the recovery email. Please try again."
      );
    }

    return res.status(202).json({
      success: true,
      message: genericPasswordResetMessage
    });
  } catch (error) {
    if (client) {
      await rollback(client);
    }

    if (error?.code === "23503" || error?.code === "42P01") {
      logger.error("Password reset storage is not configured", { error });
      return res.status(202).json({
        success: true,
        message: genericPasswordResetMessage
      });
    }

    logger.error("Password reset request failed", { error });
    return errorResponse(res, 500, "Unable to process password reset request");
  } finally {
    client?.release();
  }
}

async function verifyPasswordResetOtp(req, res) {
  res.set("Cache-Control", "no-store");
  const rawEmail = req.body?.email;
  const rawOtp = req.body?.otp;

  if (
    typeof rawEmail !== "string" ||
    !rawEmail.trim() ||
    typeof rawOtp !== "string" ||
    !/^\d{6}$/.test(rawOtp)
  ) {
    return errorResponse(res, 400, genericPasswordResetError);
  }

  const email = rawEmail.trim().toLowerCase();
  let client;

  try {
    client = await pool.connect();
    await client.query("BEGIN");
    const resetResult = await client.query(
      `SELECT reset.id, reset.otp_hash, reset.attempts, reset.expires_at
       FROM password_reset_otps reset
       JOIN users ON users.id = reset.user_id
       WHERE users.email = $1
         AND reset.consumed_at IS NULL
       ORDER BY reset.created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [email]
    );
    const reset = resetResult.rows[0];

    if (
      !reset ||
      new Date(reset.expires_at).getTime() <= Date.now() ||
      reset.attempts >= PASSWORD_RESET_OTP_MAX_ATTEMPTS
    ) {
      await rollback(client);
      return errorResponse(res, 400, genericPasswordResetError);
    }

    if (!verifyOtp(rawOtp, reset.otp_hash)) {
      await client.query(
        `UPDATE password_reset_otps
         SET attempts = attempts + 1
         WHERE id = $1`,
        [reset.id]
      );
      await client.query("COMMIT");
      return errorResponse(res, 400, genericPasswordResetError);
    }

    const resetToken = generateResetToken();
    await client.query(
      `UPDATE password_reset_otps
       SET consumed_at = CURRENT_TIMESTAMP,
           reset_token_hash = $2,
           reset_token_expires_at = $3
       WHERE id = $1`,
      [
        reset.id,
        hashResetToken(resetToken),
        new Date(Date.now() + PASSWORD_RESET_OTP_TTL_MS)
      ]
    );
    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Code verified. Choose a new password.",
      resetToken
    });
  } catch (error) {
    if (client) {
      await rollback(client);
    }

    logger.error("Password reset OTP verification failed", { error });
    return errorResponse(res, 400, genericPasswordResetError);
  } finally {
    client?.release();
  }
}

async function resetPassword(req, res) {
  res.set("Cache-Control", "no-store");
  const resetToken = req.body?.resetToken;
  const rawPassword = req.body?.password ?? req.body?.newPassword;

  if (
    typeof resetToken !== "string" ||
    typeof rawPassword !== "string" ||
    rawPassword.length < 8 ||
    Buffer.byteLength(rawPassword, "utf8") > 72
  ) {
    return errorResponse(res, 400, "Please provide a valid reset token and password");
  }

  let client;

  try {
    const passwordHash = await bcrypt.hash(rawPassword, passwordSaltRounds);
    const resetTokenHash = hashResetToken(resetToken);
    client = await pool.connect();
    await client.query("BEGIN");

    const resetResult = await client.query(
      `SELECT id, user_id
       FROM password_reset_otps
       WHERE reset_token_hash = $1
         AND reset_token_used_at IS NULL
         AND reset_token_expires_at > CURRENT_TIMESTAMP
       FOR UPDATE`,
      [resetTokenHash]
    );
    const reset = resetResult.rows[0];

    if (!reset) {
      await rollback(client);
      return errorResponse(res, 400, genericPasswordResetError);
    }

    const updatedUser = await client.query(
      `UPDATE users
       SET password_hash = $2,
           token_version = token_version + 1
       WHERE id = $1`,
      [reset.user_id, passwordHash]
    );
    if (!updatedUser.rowCount) {
      await rollback(client);
      return errorResponse(res, 400, genericPasswordResetError);
    }
    await client.query(
      `UPDATE password_reset_otps
       SET reset_token_used_at = CURRENT_TIMESTAMP,
           consumed_at = COALESCE(consumed_at, CURRENT_TIMESTAMP)
       WHERE id = $1`,
      [reset.id]
    );
    await client.query(
      `UPDATE password_reset_otps
       SET consumed_at = COALESCE(consumed_at, CURRENT_TIMESTAMP)
       WHERE user_id = $1 AND id <> $2 AND consumed_at IS NULL`,
      [reset.user_id, reset.id]
    );
    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Password reset successfully. Please log in with your new password."
    });
  } catch (error) {
    if (client) {
      await rollback(client);
    }

    logger.error("Password reset failed", { error });
    return errorResponse(res, 400, genericPasswordResetError);
  } finally {
    client?.release();
  }
}

router.post(
  [
    "/forgot-password",
    "/resend-reset-otp",
    "/forgot-password/resend",
    "/request-password-reset"
  ],
  passwordResetRequestRateLimiter,
  requestPasswordReset
);
router.post(
  [
    "/verify-reset-otp",
    "/verify-password-reset",
    "/forgot-password/verify",
    "/forgot-password/verify-otp"
  ],
  passwordResetVerifyRateLimiter,
  verifyPasswordResetOtp
);
router.post(
  ["/reset-password", "/complete-password-reset", "/forgot-password/reset"],
  passwordResetVerifyRateLimiter,
  resetPassword
);

router.get("/me", authRequired, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, level, total_xp, gold,
              current_streak, longest_streak
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );
    const user = result.rows[0];

    if (!user) {
      return errorResponse(res, 404, "User not found");
    }

    return res.json({
      success: true,
      user
    });
  } catch (error) {
    logger.error("Fetching current user failed", { error });
    return errorResponse(res, 500, "Unable to fetch current user");
  }
});

export default router;
