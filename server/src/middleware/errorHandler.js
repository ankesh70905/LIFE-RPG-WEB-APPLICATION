import { logger } from "../utils/logger.js";

export function errorHandler(error, _req, res, next) {
  logger.error("Unhandled server error", { error });

  if (res.headersSent) {
    next(error);
    return;
  }

  const isMalformedJson =
    error instanceof SyntaxError &&
    error.status === 400 &&
    Object.prototype.hasOwnProperty.call(error, "body");
  const statusCode = isMalformedJson
    ? 400
    : Number.isInteger(error?.statusCode) &&
        error.statusCode >= 400 &&
        error.statusCode < 600
      ? error.statusCode
      : 500;

  res.status(statusCode).json({
    success: false,
    message: isMalformedJson ? "Request body must contain valid JSON" : "Something went wrong"
  });
}
