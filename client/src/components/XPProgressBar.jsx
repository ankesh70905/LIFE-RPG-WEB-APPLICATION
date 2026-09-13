export default function XPProgressBar({ progression, compact = false }) {
  const percentage = Math.min(
    100,
    Math.max(0, Number(progression?.progress_percentage) || 0)
  );

  return (
    <div className={`xp-progress${compact ? " xp-progress-compact" : ""}`}>
      <div className="progress-label">
        <span>XP Progress</span>
        <strong>{percentage}%</strong>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label="Experience progress"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={percentage}
      >
        <span className="progress-value" style={{ width: `${percentage}%` }} />
      </div>
      {!compact ? (
        <div className="progress-meta">
          <span>{progression?.current_level_xp ?? 0} XP earned this level</span>
          <span>{progression?.xp_remaining ?? 0} XP to next level</span>
        </div>
      ) : null}
    </div>
  );
}
