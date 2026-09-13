import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import NotificationBell from "./NotificationBell.jsx";

export default function Navbar({ onMenuClick }) {
  const { user } = useAuth();

  return (
    <header className="topbar">
      <button
        className="menu-button"
        type="button"
        aria-label="Open navigation"
        onClick={onMenuClick}
      >
        ☰
      </button>
      <div className="topbar-title">
        <span className="topbar-kicker">ADVENTURE LOG</span>
        <span className="topbar-page">Your progress, your quest</span>
      </div>
      <div className="topbar-actions">
        <NotificationBell />
        <Link className="profile-chip" to="/character">
          <span className="avatar-placeholder" aria-hidden="true">
            {user?.name?.charAt(0)?.toUpperCase() || "A"}
          </span>
          <span className="profile-chip-name">{user?.name || "Adventurer"}</span>
        </Link>
      </div>
    </header>
  );
}
