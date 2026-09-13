import {
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual
} from "node:crypto";

export const PASSWORD_RESET_OTP_TTL_MS = 10 * 60 * 1000;
export const PASSWORD_RESET_OTP_MAX_ATTEMPTS = 5;
export const PASSWORD_RESET_RESEND_COOLDOWN_MS = 60 * 1000;
export const PASSWORD_RESET_OTP_LENGTH = 6;

function getHashSecret() {
  const secret =
    process.env.RESET_OTP_HASH_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim();

  if (!secret) {
    const error = new Error("RESET_OTP_HASH_SECRET is not configured");
    error.code = "OTP_HASH_SECRET_MISSING";
    throw error;
  }

  return secret;
}

function hashValue(value) {
  return createHmac("sha256", getHashSecret())
    .update(value, "utf8")
    .digest("hex");
}

export function generateOtp() {
  return String(randomInt(0, 1_000_000)).padStart(PASSWORD_RESET_OTP_LENGTH, "0");
}

export function hashOtp(otp) {
  if (!/^\d{6}$/.test(otp)) {
    throw new TypeError("OTP must be a six digit string");
  }

  return hashValue(otp);
}

export function verifyOtp(otp, expectedHash) {
  if (!/^\d{6}$/.test(otp) || typeof expectedHash !== "string") {
    return false;
  }

  const actual = Buffer.from(hashOtp(otp), "utf8");
  const expected = Buffer.from(expectedHash, "utf8");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function generateResetToken() {
  return randomBytes(32).toString("base64url");
}

export function hashResetToken(token) {
  if (typeof token !== "string" || token.length < 32) {
    throw new TypeError("Reset token is invalid");
  }

  return hashValue(token);
}

