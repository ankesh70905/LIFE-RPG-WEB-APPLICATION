function getUtcDateString() {
  return new Date().toISOString().slice(0, 10);
}

function formatActivityDate(date) {
  if (date === getUtcDateString()) {
    return "Today";
  }

  const parsedDate = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsedDate.getTime())
    ? date
    : parsedDate.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        timeZone: "UTC"
      });
}

export default function ActivitySummary({ activity = [] }) {
  const today = activity.find((item) => item.date === getUtcDateString());

  return (
    <section className="panel activity-panel">
      <div className="panel-heading">
        <div>
          <span className="section-kicker">RECENT MOMENTUM</span>
          <h2>Daily activity</h2>
        </div>
        <span className="activity-calendar" aria-hidden="true">📅</span>
      </div>
      <div className="today-progress">
        <span className="today-progress-title">Today's progress</span>
        <div className="today-stat-grid">
          <div><strong>{today?.quests_completed ?? 0}</strong><span>quests</span></div>
          <div><strong>+{today?.xp_earned ?? 0}</strong><span>XP earned</span></div>
          <div><strong>+{today?.gold_earned ?? 0}</strong><span>gold earned</span></div>
        </div>
      </div>
      {activity.length ? (
        <div className="activity-list">
          {activity.slice(0, 7).map((item) => (
            <div className="activity-row" key={item.date}>
              <span>{formatActivityDate(item.date)}</span>
              <strong>{item.quests_completed} quests</strong>
              <span>+{item.xp_earned} XP</span>
              <span>+{item.gold_earned} gold</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="activity-empty">Complete a quest to begin your activity history.</p>
      )}
    </section>
  );
}
