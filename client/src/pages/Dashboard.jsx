import { Link } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import AchievementCard from "../components/AchievementCard.jsx";
import ActivitySummary from "../components/ActivitySummary.jsx";
import AttributeCard from "../components/AttributeCard.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import Loading from "../components/Loading.jsx";
import TaskCard from "../components/TaskCard.jsx";
import XPProgressBar from "../components/XPProgressBar.jsx";
import { MotionCard, MotionList } from "../components/Motion.jsx";
import { getAchievements } from "../services/achievementService.js";
import { getActivity } from "../services/activityService.js";
import { getCharacter } from "../services/characterService.js";
import { getTasks } from "../services/taskService.js";
import { getWeeklyAnalytics } from "../services/analyticsService.js";
import { getRecommendations } from "../services/recommendationService.js";

export default function Dashboard() {
  const { user } = useAuth();
  const [character, setCharacter] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [activity, setActivity] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [weeklyAnalytics, setWeeklyAnalytics] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [characterData, taskData, activityData, achievementData] = await Promise.all([
        getCharacter(),
        getTasks(),
        getActivity(7),
        getAchievements()
      ]);
      const [weeklyResult, recommendationResult] = await Promise.allSettled([
        getWeeklyAnalytics(),
        getRecommendations()
      ]);
      setCharacter(characterData);
      setTasks(taskData);
      setActivity(activityData);
      setAchievements(achievementData);
      setWeeklyAnalytics(
        weeklyResult.status === "fulfilled" ? weeklyResult.value : null
      );
      setRecommendations(
        recommendationResult.status === "fulfilled"
          ? recommendationResult.value.recommendations || []
          : []
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return <Loading label="Loading your dashboard..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadDashboard} />;
  }

  const progression = character?.progression;
  const attributes = character?.attributes || {};
  const openTasks = tasks.filter((task) => !task.completed);
  const completedTasks = tasks.filter((task) => task.completed);
  const unlockedAchievements = achievements.filter(
    (achievement) => achievement.unlocked
  );
  const achievementPreview = [
    ...unlockedAchievements.slice(0, 2),
    ...achievements
      .filter((achievement) => !achievement.unlocked)
      .slice(0, Math.max(0, 3 - unlockedAchievements.slice(0, 2).length))
  ];
  const displayName = character?.user?.name || user?.name || "Adventurer";

  return (
    <MotionList className="page-stack">
      <MotionCard as="section" className="welcome-banner">
        <div>
          <span className="section-kicker">YOUR ADVENTURE, AT A GLANCE</span>
          <h1>Welcome back, {displayName}.</h1>
          <p>Small quests become legendary progress. What will you conquer today?</p>
        </div>
        <span className="welcome-symbol" aria-hidden="true">
          ✨
        </span>
      </MotionCard>

      <section className="stat-grid" aria-label="Character summary">
        <MotionCard as="div" className="stat-card">
          <span className="stat-icon" aria-hidden="true">⭐</span>
          <span className="stat-label">Current level</span>
          <strong>{progression?.level ?? 1}</strong>
        </MotionCard>
        <MotionCard as="div" className="stat-card stat-card-gold">
          <span className="stat-icon" aria-hidden="true">💰</span>
          <span className="stat-label">Gold</span>
          <strong>{character?.resources?.gold ?? 0}</strong>
        </MotionCard>
        <MotionCard as="div" className="stat-card stat-card-streak">
          <span className="stat-icon" aria-hidden="true">🔥</span>
          <span className="stat-label">Current streak</span>
          <strong>{character?.streak?.current_streak ?? 0} days</strong>
        </MotionCard>
        <MotionCard as="div" className="stat-card">
          <span className="stat-icon" aria-hidden="true">📜</span>
          <span className="stat-label">Open quests</span>
          <strong>{openTasks.length}</strong>
        </MotionCard>
      </section>

      <div className="dashboard-grid">
        <MotionCard as="section" className="panel dashboard-progress">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">LEVEL {progression?.level ?? 1}</span>
              <h2>Level progression</h2>
            </div>
            <Link className="text-link" to="/character">View character →</Link>
          </div>
          <XPProgressBar progression={progression} />
          <div className="mini-stat-row">
            <span><strong>{completedTasks.length}</strong> quests completed</span>
            <span><strong>{character?.attributes?.total_attributes ?? 0}</strong> attribute points</span>
          </div>
        </MotionCard>

        <MotionCard as="section" className="panel streak-panel" id="streak">
          <span className="streak-flame" aria-hidden="true">🔥</span>
          <span className="section-kicker">CONSISTENCY BUILDS POWER</span>
          <h2>{character?.streak?.current_streak ?? 0} day streak</h2>
          <p>
            Best streak: <strong>{character?.streak?.longest_streak ?? 0} days</strong>
          </p>
          <Link className="button button-secondary button-small" to="/tasks">
            Keep it going
          </Link>
        </MotionCard>
      </div>

      <div className="insights-grid">
        <ActivitySummary activity={activity} />
        <MotionCard as="section" className="panel achievement-preview-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">MILESTONES</span>
              <h2>Achievement progress</h2>
            </div>

            <div className="dashboard-smart-grid">
              <MotionCard as="section" className="panel smart-insight-panel">
                <div className="panel-heading">
                  <div>
                    <span className="section-kicker">SMART INSIGHT</span>
                    <h2>Your next best move</h2>
                  </div>
                  <span aria-hidden="true">💡</span>
                </div>
                <p>
                  {recommendations[0]?.message ||
                    "Complete a quest today and your personalized insight will appear here."}
                </p>
                <div className="quick-actions">
                  <Link className="button button-secondary button-small" to="/ai-planner">
                    🤖 AI suggestions
                  </Link>
                  <Link className="button button-secondary button-small" to="/analytics">
                    📊 Analytics
                  </Link>
                </div>
              </MotionCard>
              <MotionCard as="section" className="panel weekly-progress-panel">
                <div className="panel-heading">
                  <div>
                    <span className="section-kicker">THIS WEEK</span>
                    <h2>Weekly progress</h2>
                  </div>
                  <Link className="text-link" to="/analytics">Details →</Link>
                </div>
                <div className="weekly-stat-row">
                  <div><strong>{weeklyAnalytics?.quests_completed ?? 0}</strong><span>quests</span></div>
                  <div><strong>{weeklyAnalytics?.xp_earned ?? 0}</strong><span>XP earned</span></div>
                  <div><strong>{weeklyAnalytics?.weekly_change?.quests == null ? "—" : `${weeklyAnalytics.weekly_change.quests}%`}</strong><span>change</span></div>
                </div>
                <p className="analytics-muted">
                  {weeklyAnalytics?.top_category
                    ? `Most active: ${weeklyAnalytics.top_category}.`
                    : "Complete a quest to start your weekly summary."}
                </p>
              </MotionCard>
            </div>
            <Link className="text-link" to="/achievements">View all →</Link>
          </div>
          {achievementPreview.length ? (
            <div className="achievement-preview-list">
              {achievementPreview.map((achievement) => (
                <AchievementCard key={achievement.id} achievement={achievement} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No achievements yet"
              message="Complete your first quest to begin your legend."
              action={<Link className="text-link" to="/achievements">Explore milestones →</Link>}
            />
          )}
        </MotionCard>
      </div>

      <MotionCard as="section" className="panel">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">YOUR CORE STATS</span>
            <h2>Character attributes</h2>
          </div>
          <Link className="text-link" to="/character">See details →</Link>
        </div>
        <div className="attribute-grid">
          {["intellect", "strength", "discipline", "creativity"].map((name) => (
            <AttributeCard key={name} name={name} value={attributes[name] ?? 0} />
          ))}
        </div>
      </MotionCard>

      <MotionCard as="section" className="panel">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">NEXT OBJECTIVES</span>
            <h2>Active quests</h2>
          </div>
          <Link className="button button-primary button-small" to="/tasks">Manage quests</Link>
        </div>
        {openTasks.length ? (
          <MotionList className="task-list">
            {openTasks.slice(0, 3).map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onComplete={() => {}}
                onEdit={() => {}}
                onDelete={() => {}}
                readOnly
              />
            ))}
          </MotionList>
        ) : (
          <EmptyState
            title="Your quest board is clear"
            message="Create a quest to turn your next goal into progress."
            action={<Link className="button button-primary button-small" to="/tasks">Create a quest</Link>}
          />
        )}
      </MotionCard>
    </MotionList>
  );
}
