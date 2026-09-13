import { beforeEach, describe, expect, it } from "vitest";
import {
  generateOtp,
  generateResetToken,
  hashOtp,
  hashResetToken,
  verifyOtp
} from "../src/utils/passwordReset.js";
import { sendPasswordResetOtp } from "../src/services/emailService.js";

describe("password reset crypto", () => {
  beforeEach(() => {
    process.env.RESET_OTP_HASH_SECRET = "unit-test-password-reset-secret";
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
  });

  it("generates six digit OTPs and verifies only the matching hash", () => {
    const otp = generateOtp();
    const hash = hashOtp(otp);

    expect(otp).toMatch(/^\d{6}$/);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(verifyOtp(otp, hash)).toBe(true);
    expect(verifyOtp("000000", hash)).toBe(otp === "000000");
    expect(hash).not.toContain(otp);
  });

  it("creates opaque reset tokens and one-way hashes", () => {
    const token = generateResetToken();
    const hash = hashResetToken(token);

    expect(token.length).toBeGreaterThanOrEqual(32);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hashResetToken(token)).toBe(hash);
    expect(hash).not.toContain(token);
  });

  it("fails safely without claiming delivery when email is unconfigured", async () => {
    await expect(
      sendPasswordResetOtp({ to: "hero@example.com", otp: "123456" })
    ).rejects.toMatchObject({ code: "EMAIL_NOT_CONFIGURED" });
  });
});
