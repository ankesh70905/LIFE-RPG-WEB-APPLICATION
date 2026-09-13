import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import EmptyState from "../components/EmptyState.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import Loading from "../components/Loading.jsx";
import {
  getAnalyticsInsights,
  getAnalyticsOverview
} from "../services/analyticsService.js";
import { MotionCard, MotionList } from "../components/Motion.jsx";

const periods = [
  { value: 7, label: "7 Days" },
  { value: 30, label: "30 Days" },
  { value: 90, label: "90 Days" }
];
const categoryLabels = {
  intellect: "Intellect",
  strength: "Strength",
  discipline: "Discipline",
  creativity: "Creativity"
};
const difficultyLabels = {
  easy: "Easy",
  normal: "Normal",
  hard: "Hard",
  epic: "Epic"
};

function shortDate(date) {
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
}

function formatLabel(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "Not enough data";
}

function Distribution({ title, distribution, labels }) {
  const entries = Object.entries(distribution || {});
  const total = entries.reduce((sum, [, value]) => sum + value, 0);

  return (
    <section className="analytics-distribution">
      <h3>{title}</h3>
      {total ? (
        <div className="distribution-list">
          {entries.map(([key, value]) => (
            <div className="distribution-row" key={key}>
              <div className="distribution-label">
                <span>{labels[key] || key}</span>
                <strong>{value}</strong>
              </div>
              <span className="distribution-track">
                <span style={{ width: `${(value / total) * 100}%` }} />
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="analytics-muted">Complete a quest to populate this chart.</p>
      )}
    </section>
  );
}

function TrendMessage({ trend }) {
  if (!trend || trend.direction === "insufficient_data") {
    return "Complete more quests to reveal a progress trend.";
  }

  if (trend.direction === "improving") {
    return "Your recent progress is improving.";
  }

  if (trend.direction === "decreasing") {
    return "A small quest can help rebuild your momentum.";
  }

  return "Your recent activity is steady.";
}

export default function Analytics() {
  const [period, setPeriod] = useState(30);
  const [overview, setOverview] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [overviewResponse, insightsResponse] = await Promise.all([
        getAnalyticsOverview(period),
        getAnalyticsInsights()
      ]);
      setOverview(overviewResponse);
      setInsights(insightsResponse);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const activityChart = useMemo(
    () =>
      (overview?.analytics?.daily_activity || []).map((item) => ({
        ...item,
        label: shortDate(item.date)
      })),
    [overview]
  );
  const hasActivity = activityChart.some((item) => item.quests_completed > 0);
  const analytics = overview?.analytics;

  if (loading) {
    return <Loading label="Reading your adventure data..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadAnalytics} />;
  }

  return (
    <MotionList className="page-stack">
      <section className="page-header analytics-header">
        <div>
          <span className="section-kicker">MEASURE YOUR MOMENTUM</span>
          <h1>Analytics</h1>
          <p>See where your effort is turning into real progress.</p>
        </div>
        <label className="period-selector">
          <span>View period</span>
          <select
            value={period}
            onChange={(event) => setPeriod(Number(event.target.value))}
            aria-label="Analytics period"
          >
            {periods.map((option) => (
              <option value={option.value} key={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </section>

      <MotionList className="stat-grid analytics-stat-grid" aria-label="Analytics summary">
        <MotionCard as="div" className="stat-card">
          <span className="stat-icon" aria-hidden="true">📜</span>
          <span className="stat-label">Quests completed</span>
          <strong>{analytics?.quests_completed ?? 0}</strong>
        </MotionCard>
        <MotionCard as="div" className="stat-card">
          <span className="stat-icon" aria-hidden="true">✨</span>
          <span className="stat-label">XP earned</span>
          <strong>{analytics?.xp_earned ?? 0}</strong>
        </MotionCard>
        <MotionCard as="div" className="stat-card stat-card-gold">
          <span className="stat-icon" aria-hidden="true">💰</span>
          <span className="stat-label">Gold earned</span>
          <strong>{analytics?.gold_earned ?? 0}</strong>
        </MotionCard>
        <MotionCard as="div" className="stat-card stat-card-streak">
          <span className="stat-icon" aria-hidden="true">🔥</span>
          <span className="stat-label">Current streak</span>
          <strong>{analytics?.current_streak ?? 0}</strong>
        </MotionCard>
      </MotionList>

      {!hasActivity ? (
        <MotionCard as="section" className="panel">
          <EmptyState
            title="Your charts are waiting"
            message={`Complete a quest in the selected ${period}-day period to see your activity patterns.`}
          />
        </MotionCard>
      ) : (
        <div className="analytics-chart-grid">
          <MotionCard as="section" className="panel analytics-chart-panel">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">DAILY QUESTS</span>
                <h2>Activity chart</h2>
              </div>
            </div>
            <div className="chart-frame" aria-label="Daily quests completed chart">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={activityChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#273653" />
                  <XAxis dataKey="label" stroke="#91a0bb" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} stroke="#91a0bb" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: "#11182b", border: "1px solid #334362" }}
                    labelStyle={{ color: "#f8fafc" }}
                  />
                  <Bar dataKey="quests_completed" name="Quests" fill="#8b7dff" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </MotionCard>

          <MotionCard as="section" className="panel analytics-chart-panel">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">XP MOMENTUM</span>
                <h2>XP progress chart</h2>
              </div>
            </div>
            <div className="chart-frame" aria-label="Daily XP earned chart">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={activityChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#273653" />
                  <XAxis dataKey="label" stroke="#91a0bb" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} stroke="#91a0bb" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: "#11182b", border: "1px solid #334362" }}
                    labelStyle={{ color: "#f8fafc" }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="xp_earned" name="XP earned" stroke="#6ed7a2" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </MotionCard>
        </div>
      )}

      <MotionList className="analytics-distribution-grid">
        <MotionCard as="section" className="panel">
          <Distribution
            title="Category distribution"
            distribution={analytics?.category_distribution}
            labels={categoryLabels}
          />
        </MotionCard>
        <MotionCard as="section" className="panel">
          <Distribution
            title="Difficulty distribution"
            distribution={analytics?.difficulty_distribution}
            labels={difficultyLabels}
          />
        </MotionCard>
      </MotionList>

      <MotionCard as="section" className="panel">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">WHAT THE DATA SAYS</span>
            <h2>Productivity insights</h2>
          </div>
        </div>
        <div className="analytics-summary-grid">
          <div className="analytics-summary-item">
            <span>Most productive day</span>
            <strong>{formatLabel(analytics?.most_productive_day)}</strong>
          </div>
          <div className="analytics-summary-item">
            <span>Top category</span>
            <strong>{formatLabel(analytics?.top_category)}</strong>
          </div>
          <div className="analytics-summary-item">
            <span>Active days</span>
            <strong>{analytics?.active_days ?? 0} / {overview?.period ?? period}</strong>
          </div>
          <div className="analytics-summary-item">
            <span>Progress trend</span>
            <strong>{formatLabel(analytics?.trend?.direction)}</strong>
          </div>
        </div>
        <p className="analytics-trend-message">
          <TrendMessage trend={analytics?.trend} />
        </p>
        {insights?.insights?.length ? (
          <div className="insight-list">
            {insights.insights.map((insight, index) => (
              <article className="insight-card" key={`${insight.type}-${index}`}>
                <span aria-hidden="true">✦</span>
                <div>
                  <strong>{insight.title}</strong>
                  <p>{insight.message}</p>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </MotionCard>
    </MotionList>
  );
}
