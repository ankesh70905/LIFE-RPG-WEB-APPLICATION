function formatNotificationTime(value) {
  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return "Recently";
  }

  const differenceInMinutes = Math.round((timestamp - Date.now()) / 60000);

  if (Math.abs(differenceInMinutes) < 1) {
    return "Just now";
  }

  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  if (Math.abs(differenceInMinutes) < 60) {
    return formatter.format(differenceInMinutes, "minute");
  }

  return formatter.format(Math.round(differenceInMinutes / 60), "hour");
}

export default function NotificationPanel({
  notifications,
  loading,
  error,
  onRead,
  onReadAll
}) {
  return (
    <section className="notification-panel" aria-label="Notifications">
      <div className="notification-panel-heading">
        <div>
          <span className="section-kicker">ADVENTURE UPDATES</span>
          <h2>Notifications</h2>
        </div>
        {notifications.some((notification) => !notification.is_read) ? (
          <button className="text-button" type="button" onClick={onReadAll}>
            Mark all read
          </button>
        ) : null}
      </div>
      {loading ? <p className="notification-status">Loading updates...</p> : null}
      {error ? <p className="notification-error">{error}</p> : null}
      {!loading && !error && !notifications.length ? (
        <p className="notification-status">No notifications yet.</p>
      ) : null}
      <div className="notification-list">
        {notifications.map((notification) => (
          <button
            className={`notification-row${notification.is_read ? "" : " notification-unread"}`}
            key={notification.id}
            type="button"
            onClick={() => onRead(notification)}
          >
            <span className="notification-type-icon" aria-hidden="true">
              {notification.type === "achievement"
                ? "🏆"
                : notification.type === "level_up"
                  ? "🎉"
                  : notification.type === "streak"
                    ? "🔥"
                    : notification.type === "purchase"
                      ? "🛒"
                      : "✦"}
            </span>
            <span className="notification-copy">
              <strong>{notification.title}</strong>
              <span>{notification.message}</span>
              <small>{formatNotificationTime(notification.created_at)}</small>
            </span>
            {!notification.is_read ? <span className="notification-dot" /> : null}
          </button>
        ))}
      </div>
    </section>
  );
}
