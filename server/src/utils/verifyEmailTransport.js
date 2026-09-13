import "dotenv/config";
import { verifyEmailTransport } from "../services/emailService.js";

try {
  await verifyEmailTransport();
  console.log("Email transport verification passed.");
} catch (error) {
  console.error(
    "Email transport verification failed:",
    error?.code || error?.message || "unknown provider error"
  );
  process.exitCode = 1;
}
