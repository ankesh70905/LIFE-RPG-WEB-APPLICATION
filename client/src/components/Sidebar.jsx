import { NavLink } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { motionTransition } from "./Motion.jsx";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: "🏠" },
  { to: "/tasks", label: "Quests", icon: "📜" },
  { to: "/planner", label: "Planner", icon: "🗓️" },
  { to: "/goals", label: "Goals", icon: "🎯" },
  { to: "/habits", label: "Habits", icon: "🔁" },
  { to: "/challenges", label: "Challenges", icon: "⚔️" },
  { to: "/character", label: "Character", icon: "🧙" },
  { to: "/character#streak", label: "Streak", icon: "🔥" },
  { to: "/shop", label: "Shop", icon: "🛒" },
  { to: "/inventory", label: "Inventory", icon: "🎒" },
  { to: "/achievements", label: "Achievements", icon: "🏆" },
  { to: "/friends", label: "Friends", icon: "👥" },
  { to: "/ai-planner", label: "AI Planner", icon: "🤖" },
  { to: "/analytics", label: "Analytics", icon: "📊" },
  { to: "/weekly-summary", label: "Weekly summary", icon: "📈" },
  { to: "/preferences", label: "Preferences", icon: "⚙️" }
];

export default function Sidebar({ open, onClose, onLogout }) {
  const reducedMotion = useReducedMotion();

  return (
    <>
      <AnimatePresence>
        {open ? (
          <motion.button
            className="sidebar-backdrop"
            type="button"
            aria-label="Close navigation"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.2 }}
          />
        ) : null}
      </AnimatePresence>
      <motion.aside
        className={`sidebar${open ? " sidebar-open" : ""}`}
        initial={false}
        animate={{ x: open ? 0 : "var(--sidebar-closed-x)" }}
        transition={reducedMotion ? { duration: 0 } : motionTransition}
      >
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            ✦
          </span>
          <span>
            <strong>Life RPG</strong>
            <small>YOUR DAILY ADVENTURE</small>
          </span>
        </div>
        <nav className="side-nav" aria-label="Main navigation">
          {links.map((link, index) => (
            <motion.div
              key={link.to}
              initial={reducedMotion ? false : { opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={
                reducedMotion
                  ? { duration: 0 }
                  : { ...motionTransition, delay: index * 0.018 }
              }
            >
              <NavLink
                to={link.to}
                end={link.to === "/dashboard"}
                className={({ isActive }) =>
                  `side-nav-link${isActive ? " active" : ""}`
                }
                onClick={onClose}
              >
                <span aria-hidden="true">{link.icon}</span>
                {link.label}
              </NavLink>
            </motion.div>
          ))}
        </nav>
        <motion.button
          className="logout-link"
          type="button"
          onClick={onLogout}
          whileHover={reducedMotion ? undefined : { x: 3 }}
          whileTap={reducedMotion ? undefined : { scale: 0.98 }}
        >
          <span aria-hidden="true">🚪</span>
          Logout
        </motion.button>
      </motion.aside>
    </>
  );
}
