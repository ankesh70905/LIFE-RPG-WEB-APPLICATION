import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  requestPasswordReset,
  resendPasswordReset,
  resetPassword,
  verifyPasswordResetOtp
} from "../services/authService.js";
import { MotionCard, MotionButton } from "../components/Motion.jsx";

const GENERIC_MESSAGE =
  "If an account exists for that email, we sent a password reset code.";

export default function ForgotPassword() {
  const [step, setStep] = useState("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (!resendSeconds) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setResendSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  function clearFeedback() {
    setError("");
    setMessage("");
  }

  async function handleRequest(event) {
    event.preventDefault();
    clearFeedback();
    setSubmitting(true);
    try {
      await requestPasswordReset(email);
      setMessage(GENERIC_MESSAGE);
      setStep("verify");
      setResendSeconds(60);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    clearFeedback();
    setSubmitting(true);
    try {
      await resendPasswordReset(email);
      setMessage(GENERIC_MESSAGE);
      setResendSeconds(60);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify(event) {
    event.preventDefault();
    clearFeedback();
    setSubmitting(true);
    try {
      const response = await verifyPasswordResetOtp(email, otp);
      setResetToken(response.resetToken);
      setStep("reset");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReset(event) {
    event.preventDefault();
    clearFeedback();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(resetToken, password);
      setStep("complete");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <MotionCard as="section" className="auth-card" aria-labelledby="forgot-password-title">
        <div className="auth-brand">
          <span className="brand-mark" aria-hidden="true">
            ✦
          </span>
          <span>Life RPG</span>
        </div>
        <span className="section-kicker">ACCOUNT RECOVERY</span>
        <h1 id="forgot-password-title">
          {step === "complete" ? "Password updated" : "Reset your password"}
        </h1>
        {step === "request" ? (
          <>
            <p className="auth-subtitle">
              Enter your email and we&apos;ll send a one-time recovery code.
            </p>
            <form className="auth-form" onSubmit={handleRequest}>
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </label>
              <MotionButton className="button button-primary button-wide" disabled={submitting}>
                {submitting ? "Sending..." : "Send recovery code"}
              </MotionButton>
            </form>
          </>
        ) : null}
        {step === "verify" ? (
          <>
            <p className="auth-subtitle">
              Enter the six-digit code from your email. Codes expire in 10 minutes.
            </p>
            <form className="auth-form" onSubmit={handleVerify}>
              <label>
                Recovery code
                <input
                  name="otp"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength="6"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
                  autoComplete="one-time-code"
                  required
                />
              </label>
              <MotionButton className="button button-primary button-wide" disabled={submitting}>
                {submitting ? "Checking..." : "Verify code"}
              </MotionButton>
            </form>
            <button
              className="text-button"
              type="button"
              onClick={handleResend}
              disabled={submitting || resendSeconds > 0}
            >
              {resendSeconds
                ? `Resend code in ${resendSeconds}s`
                : "Resend code"}
            </button>
          </>
        ) : null}
        {step === "reset" ? (
          <>
            <p className="auth-subtitle">Choose a new password for your account.</p>
            <form className="auth-form" onSubmit={handleReset}>
              <label>
                New password
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength="8"
                  autoComplete="new-password"
                  required
                />
              </label>
              <label>
                Confirm new password
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength="8"
                  autoComplete="new-password"
                  required
                />
              </label>
              <MotionButton className="button button-primary button-wide" disabled={submitting}>
                {submitting ? "Updating..." : "Update password"}
              </MotionButton>
            </form>
          </>
        ) : null}
        {step === "complete" ? (
          <>
            <p className="auth-subtitle">
              Your password has been updated. Existing sessions were signed out.
            </p>
            <MotionCard as="span" className="auth-button-motion">
              <Link className="button button-primary button-wide" to="/login">
              Return to login
              </Link>
            </MotionCard>
          </>
        ) : null}
        {message ? <p className="form-success" role="status">{message}</p> : null}
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        {step !== "complete" ? (
          <p className="auth-switch">
            Remembered your password? <Link to="/login">Log in</Link>
          </p>
        ) : null}
      </MotionCard>
    </main>
  );
}
