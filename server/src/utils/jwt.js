import "dotenv/config";
import jwt from "jsonwebtoken";

const defaultTokenExpiration = "7d";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET?.trim();

  if (!secret) {
    const error = new Error("JWT_SECRET is not configured");
    error.code = "JWT_SECRET_MISSING";
    throw error;
  }

  return secret;
}

export function assertJwtConfiguration() {
  getJwtSecret();
}

export function createToken(user) {
  const tokenVersion = Number.isInteger(Number(user.token_version))
    ? Number(user.token_version)
    : 0;

  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      tokenVersion
    },
    getJwtSecret(),
    {
      expiresIn: process.env.JWT_EXPIRES_IN?.trim() || defaultTokenExpiration
    }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, getJwtSecret());
}
