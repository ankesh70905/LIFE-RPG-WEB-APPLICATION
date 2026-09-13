export default function AchievementCard({ achievement }) {
  const unlocked = Boolean(achievement.unlocked);

  return (
    <article className={`achievement-card${unlocked ? " achievement-unlocked" : ""}`}>
      <div className="achievement-icon" aria-hidden="true">
        {achievement.icon || "🏆"}
      </div>
      <div className="achievement-content">
        <div className="achievement-heading">
          <div>
            <h3>{achievement.name}</h3>
            <span className="tag">{achievement.category}</span>
          </div>
          {unlocked ? <span className="achievement-check">✓</span> : null}
        </div>
        <p>{achievement.description}</p>
        {unlocked ? (
          <small>
            Unlocked{" "}
            {achievement.unlocked_at
              ? new Date(achievement.unlocked_at).toLocaleDateString()
              : "recently"}
          </small>
        ) : (
          <small className="locked-label">Locked achievement</small>
        )}
      </div>
    </article>
  );
}
