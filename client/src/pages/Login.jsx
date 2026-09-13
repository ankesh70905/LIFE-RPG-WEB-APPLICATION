import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { MotionCard, MotionButton } from "../components/Motion.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login(values);
      const destination = location.state?.from?.pathname || "/dashboard";
      navigate(destination, { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <MotionCard as="section" className="auth-card" aria-labelledby="login-title">
        <div className="auth-brand">
          <span className="brand-mark" aria-hidden="true">
            ✦
          </span>
          <span>Life RPG</span>
        </div>
        <span className="section-kicker">WELCOME BACK, ADVENTURER</span>
        <h1 id="login-title">Continue your quest</h1>
        <p className="auth-subtitle">Your next achievement is waiting.</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              name="email"
              type="email"
              value={values.email}
              onChange={handleChange}
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              value={values.password}
              onChange={handleChange}
              autoComplete="current-password"
              placeholder="Your password"
              required
            />
          </label>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <MotionButton className="button button-primary button-wide" type="submit" disabled={submitting}>
            {submitting ? "Logging in..." : "Login"}
          </MotionButton>
        </form>
        <p className="auth-switch">
          <Link to="/forgot-password">Forgot your password?</Link>
        </p>
        <p className="auth-switch">
          New to Life RPG? <Link to="/signup">Create your character</Link>
        </p>
      </MotionCard>
    </main>
  );
}
