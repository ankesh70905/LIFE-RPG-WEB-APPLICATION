import { useCallback, useEffect, useRef, useState } from "react";
import NotificationPanel from "./NotificationPanel.jsx";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from "../services/notificationService.js";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const containerRef = useRef(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getNotifications();
      setNotifications(response.notifications);
      setUnreadCount(response.unread_count);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    function closeOnOutsideClick(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  async function handleRead(notification) {
    if (notification.is_read) {
      return;
    }

    try {
      const updated = await markNotificationRead(notification.id);
      setNotifications((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
      setUnreadCount((current) => Math.max(0, current - 1));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleReadAll() {
    try {
      await markAllNotificationsRead();
      setNotifications((current) =>
        current.map((notification) => ({ ...notification, is_read: true }))
      );
      setUnreadCount(0);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function handleToggle() {
    const willOpen = !open;
    setOpen(willOpen);

    if (willOpen) {
      loadNotifications();
    }
  }

  return (
    <div className="notification-bell-wrap" ref={containerRef}>
      <button
        className="notification-bell"
        type="button"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        onClick={handleToggle}
      >
        <span aria-hidden="true">🔔</span>
        {unreadCount ? <span className="notification-count">{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
      </button>
      {open ? (
        <NotificationPanel
          notifications={notifications}
          loading={loading}
          error={error}
          onRead={handleRead}
          onReadAll={handleReadAll}
        />
      ) : null}
    </div>
  );
}
