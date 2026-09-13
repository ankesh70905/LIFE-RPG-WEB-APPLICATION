import { Resend } from "resend";
import { logger } from "../utils/logger.js";

let resendClient;
let resendApiKey;

function getResendConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();

  if (!apiKey || !from) {
    return null;
  }

  return { apiKey, from };
}

function getResendClient(apiKey) {
  if (!resendClient || resendApiKey !== apiKey) {
    resendClient = new Resend(apiKey);
    resendApiKey = apiKey;
  }

  return resendClient;
}

function emailConfigurationError() {
  const error = new Error("Resend email delivery is not configured");
  error.code = "EMAIL_NOT_CONFIGURED";
  return error;
}

export function isEmailConfigured() {
  return Boolean(getResendConfig());
}

export async function verifyEmailTransport() {
  const config = getResendConfig();

  if (!config) {
    throw emailConfigurationError();
  }

  return { verified: true, provider: "resend" };
}

export async function sendPasswordResetOtp({ to, otp }) {
  const config = getResendConfig();

  if (!config) {
    throw emailConfigurationError();
  }

  try {
    const { data, error } = await getResendClient(config.apiKey).emails.send({
      from: config.from,
      to: [to],
      subject: "Life RPG - Password Reset Code",
      text: [
        "Hello,",
        "",
        "We received a request to reset your Life RPG password.",
        "",
        `Your verification code is: ${otp}`,
        "",
        "This code expires in 10 minutes.",
        "Do not share this code with anyone.",
        "",
        "If you did not request this password reset, you can safely ignore this email.",
        "",
        "Life RPG Security"
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#17213a">
          <h2>Life RPG password reset</h2>
          <p>Hello,</p>
          <p>We received a request to reset your Life RPG password.</p>
          <p style="font-size:28px;font-weight:700;letter-spacing:8px">${otp}</p>
          <p>This code expires in <strong>10 minutes</strong>.</p>
          <p>Do not share this code with anyone.</p>
          <p>If you did not request this password reset, you can safely ignore this email.</p>
          <p>Life RPG Security</p>
        </div>
      `
    });

    if (error) {
      const deliveryError = new Error("Resend rejected the email");
      deliveryError.code = error.name || "RESEND_EMAIL_FAILED";
      deliveryError.statusCode = error.statusCode;
      throw deliveryError;
    }

    if (!data?.id) {
      const deliveryError = new Error("Resend did not return an email id");
      deliveryError.code = "RESEND_EMAIL_FAILED";
      throw deliveryError;
    }

    return { sent: true, id: data.id };
  } catch (error) {
    logger.error("Password reset email delivery failed", {
      errorCode: error?.code,
      statusCode: error?.statusCode
    });
    throw error;
  }
}

export function resetEmailTransportForTests() {
  resendClient = undefined;
  resendApiKey = undefined;
}
