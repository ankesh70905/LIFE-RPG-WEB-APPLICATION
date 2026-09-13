import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ErrorMessage from "../components/ErrorMessage.jsx";
import Loading from "../components/Loading.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { getWeeklySummary } from "../services/analyticsService.js";

export default function WeeklySummary() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setSummary(await getWeeklySummary()); }
    catch (requestError) { setError(requestError.message || "Weekly summary is temporarily unavailable."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  if (loading) return <Loading label="Preparing your weekly summary..." />;
  if (error) return <ErrorMessage message={error} onRetry={load} />;
  const quests = summary?.quests_completed ?? 0;
  return (
    <div className="page-stack">
      <section className="page-header"><div><span className="section-kicker">LOOKING BACK, MOVING FORWARD</span><h1>Weekly summary</h1><p>Your progress from the last seven days.</p></div><span className="feature-hero-icon" aria-hidden="true">📈</span></section>
      {!summary || (quests === 0 && !summary.xp_earned) ? <EmptyState title="Your week is ready to begin" message="Complete a quest and your next weekly summary will appear here." action={<Link className="button button-primary" to="/tasks">View quests</Link>} /> : (
        <section className="panel">
          <div className="weekly-summary-grid">
            <div><span className="stat-label">Quests completed</span><strong>{quests}</strong></div>
            <div><span className="stat-label">XP earned</span><strong>{summary.xp_earned ?? 0}</strong></div>
            <div><span className="stat-label">Week-over-week</span><strong>{summary.weekly_change?.quests == null ? "—" : `${summary.weekly_change.quests}%`}</strong></div>
          </div>
          <p className="analytics-trend-message">{summary.top_category ? `Your strongest focus was ${summary.top_category}. Keep building that momentum next week.` : "Every completed quest moves your story forward."}</p>
          <Link className="text-link" to="/ai-planner">Plan next week with AI →</Link>
        </section>
      )}
    </div>
  );
}
