import { useCallback, useEffect, useState } from "react";
import AchievementCard from "../components/AchievementCard.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import Loading from "../components/Loading.jsx";
import { getAchievements } from "../services/achievementService.js";

export default function Achievements() {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAchievements = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      setAchievements(await getAchievements());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAchievements();
  }, [loadAchievements]);

  if (loading) {
    return <Loading label="Reviewing your achievements..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadAchievements} />;
  }

  const unlocked = achievements.filter((achievement) => achievement.unlocked);
  const locked = achievements.filter((achievement) => !achievement.unlocked);

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <span className="section-kicker">MILESTONES & MASTERY</span>
          <h1>Achievements</h1>
          <p>Every meaningful habit is another mark in your legend.</p>
        </div>
        <div className="achievement-counter">
          <strong>{unlocked.length}</strong>
          <span>of {achievements.length} unlocked</span>
        </div>
      </section>

      {unlocked.length ? (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">YOUR TROPHIES</span>
              <h2>Unlocked achievements</h2>
            </div>
          </div>
          <div className="achievement-grid">
            {unlocked.map((achievement) => (
              <AchievementCard key={achievement.id} achievement={achievement} />
            ))}
          </div>
        </section>
      ) : (
        <section className="panel">
          <EmptyState
            title="Your legend starts here"
            message="Complete a quest to unlock your first achievement."
          />
        </section>
      )}

      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">NEXT MILESTONES</span>
            <h2>Locked achievements</h2>
          </div>
          <span className="panel-count">{locked.length}</span>
        </div>
        <div className="achievement-grid">
          {locked.map((achievement) => (
            <AchievementCard key={achievement.id} achievement={achievement} />
          ))}
        </div>
      </section>
    </div>
  );
}
