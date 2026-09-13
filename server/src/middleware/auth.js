import { verifyToken } from "../utils/jwt.js";
import { logger } from "../utils/logger.js";
import { pool } from "../db.js";

export async function authRequired(req, res, next) {
  const authorization = req.get("authorization")?.trim();

  if (!authorization) {
    res.status(401).json({
      success: false,
      message: "Authentication required"
    });
    return;
  }

  const [scheme, token, ...extraParts] = authorization.split(/\s+/);

  if (scheme !== "Bearer" || !token || extraParts.length > 0) {
    res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
    return;
  }

  try {
    const payload = verifyToken(token);
    const hasValidId =
      typeof payload !== "string" &&
      ((typeof payload.id === "string" && payload.id.trim() !== "") ||
        (typeof payload.id === "number" &&
          Number.isInteger(payload.id) &&
          payload.id > 0));

    if (
      typeof payload === "string" ||
      !hasValidId ||
      typeof payload.email !== "string"
    ) {
      throw new Error("Invalid JWT payload");
    }

    if (
      !Number.isInteger(payload.tokenVersion) ||
      payload.tokenVersion < 0
    ) {
      throw new Error("Invalid JWT token version");
    }

    const currentUser = await pool.query(
      "SELECT token_version FROM users WHERE id = $1",
      [payload.id]
    );

    if (!currentUser.rowCount) {
      throw new Error("User no longer exists");
    }

    if (Number(currentUser.rows[0].token_version) !== payload.tokenVersion) {
      throw new Error("JWT token has been invalidated");
    }

    req.user = {
      id: payload.id,
      email: payload.email
    };
    next();
  } catch (error) {
    logger.warn("JWT verification failed", {
      reason: error?.name || "unknown"
    });

    if (error?.code === "JWT_SECRET_MISSING") {
      res.status(500).json({
        success: false,
        message: "Authentication service is not configured"
      });
      return;
    }

    res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }
}
