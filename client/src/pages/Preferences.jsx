import { useCallback, useEffect, useState } from "react";
import ErrorMessage from "../components/ErrorMessage.jsx";
import Loading from "../components/Loading.jsx";
import { defaultPreferences, getPreferences, updatePreferences } from "../services/preferencesService.js";

const options = [
  ["ai_coach_enabled", "AI coach", "Show personalized coaching and next-best-move suggestions."],
  ["ai_personalization_enabled", "Personalized AI", "Use your progress to tailor AI-generated plans."],
  ["reminders_enabled", "Quest reminders", "Keep your momentum with a gentle daily prompt."]
];

export default function Preferences() {
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const loadPreferences = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setPreferences(await getPreferences());
    } catch (requestError) {
      setError(requestError.message || "Preferences are temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  function update(key) {
    setPreferences((current) => ({ ...current, [key]: !current[key] }));
    setSaved(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      setPreferences(await updatePreferences(preferences));
      setSaved(true);
    } catch (requestError) {
      setError(requestError.message || "Preferences could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <span className="section-kicker">YOUR EXPERIENCE</span>
          <h1>Preferences</h1>
          <p>Shape Life RPG around the way you plan, focus, and celebrate.</p>
        </div>
        <span className="feature-hero-icon" aria-hidden="true">⚙️</span>
      </section>
      {error ? <ErrorMessage message={error} onRetry={loadPreferences} /> : null}
      {loading ? <Loading label="Loading your preferences..." /> : (
        <form className="panel preferences-form" onSubmit={handleSubmit}>
          <div className="panel-heading">
            <div><span className="section-kicker">SETTINGS</span><h2>Personalize your adventure</h2></div>
          </div>
          <div className="privacy-list">
            {options.map(([key, title, description]) => (
              <label className="privacy-row preference-row" key={key}>
                <span><strong>{title}</strong><small>{description}</small></span>
                <input type="checkbox" checked={Boolean(preferences[key])} onChange={() => update(key)} aria-label={title} disabled={saving} />
              </label>
            ))}
          </div>
          <label className="preference-row timezone-field">
            <span><strong>Timezone</strong><small>Used to schedule reminders at the right local time.</small></span>
            <input value={preferences.timezone} maxLength={64} onChange={(event) => setPreferences((current) => ({ ...current, timezone: event.target.value }))} aria-label="Timezone" disabled={saving} />
          </label>
          <div className="preference-actions">
            <button className="button button-primary" type="submit" disabled={saving}>{saving ? "Saving..." : "Save preferences"}</button>
            {saved ? <span className="form-success" role="status">Preferences saved.</span> : null}
          </div>
        </form>
      )}
    </div>
  );
}
