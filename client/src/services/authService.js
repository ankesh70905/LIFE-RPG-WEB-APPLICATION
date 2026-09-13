import { apiRequest } from "./api.js";

export function login(credentials) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: credentials
  });
}

export function signup(credentials) {
  return apiRequest("/auth/signup", {
    method: "POST",
    body: credentials
  });
}

export function getCurrentUser() {
  return apiRequest("/auth/me");
}

export function requestPasswordReset(email) {
  return apiRequest("/auth/forgot-password", {
    method: "POST",
    body: { email }
  });
}

export function resendPasswordReset(email) {
  return apiRequest("/auth/resend-reset-otp", {
    method: "POST",
    body: { email }
  });
}

export function verifyPasswordResetOtp(email, otp) {
  return apiRequest("/auth/verify-reset-otp", {
    method: "POST",
    body: { email, otp }
  });
}

export function resetPassword(resetToken, password) {
  return apiRequest("/auth/reset-password", {
    method: "POST",
    body: { resetToken, password }
  });
}
