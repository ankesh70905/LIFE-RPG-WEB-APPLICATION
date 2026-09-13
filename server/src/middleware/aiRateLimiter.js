import rateLimit from "express-rate-limit";

function readPositiveInteger(name, fallback, maximum) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 && value <= maximum
    ? value
    : fallback;
}

export function createAiRateLimiter(options = {}) {
  const windowMs =
    options.windowMs ||
    readPositiveInteger("AI_RATE_LIMIT_WINDOW_MS", 60 * 60 * 1000, 24 * 60 * 60 * 1000);
  const limit =
    options.limit ||
    readPositiveInteger("AI_RATE_LIMIT_MAX", 10, 1000);

  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: (req) => `user:${req.user.id}`,
    message: {
      success: false,
      message: "Too many AI requests. Please try again later."
    }
  });
}

export const aiRateLimiter = createAiRateLimiter();
