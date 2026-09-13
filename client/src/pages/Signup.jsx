import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { MotionCard, MotionButton } from "../components/Motion.jsx";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (values.password !== values.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      await signup({
        name: values.name,
        email: values.email,
        password: values.password
      });
      navigate("/dashboard", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <MotionCard as="section" className="auth-card" aria-labelledby="signup-title">
        <div className="auth-brand">
          <span className="brand-mark" aria-hidden="true">
            ✦
          </span>
          <span>Life RPG</span>
        </div>
        <span className="section-kicker">BEGIN YOUR ADVENTURE</span>
        <h1 id="signup-title">Create your character</h1>
        <p className="auth-subtitle">Turn your real life into an adventure.</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Character name
            <input
              name="name"
              value={values.name}
              onChange={handleChange}
              autoComplete="name"
              placeholder="What should we call you?"
              required
            />
          </label>
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
              autoComplete="new-password"
              minLength="8"
              placeholder="At least 8 characters"
              required
            />
          </label>
          <label>
            Confirm password
            <input
              name="confirmPassword"
              type="password"
              value={values.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
              minLength="8"
              placeholder="Repeat your password"
              required
            />
          </label>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <MotionButton className="button button-primary button-wide" type="submit" disabled={submitting}>
            {submitting ? "Creating..." : "Start the adventure"}
          </MotionButton>
        </form>
        <p className="auth-switch">
          Already have a character? <Link to="/login">Log in</Link>
        </p>
      </MotionCard>
    </main>
  );
}
