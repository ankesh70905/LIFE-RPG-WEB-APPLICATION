import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

export default function RewardModal({ result, onClose }) {
  const reducedMotion = useReducedMotion();
  const rewards = result?.rewards;
  const progression = result?.progression;
  const streak = result?.streak;

  return (
    <AnimatePresence>
      {result ? <motion.div
        className="modal-backdrop"
        role="presentation"
        onClick={onClose}
        initial={reducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
      <motion.section
        className="reward-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reward-title"
        onClick={(event) => event.stopPropagation()}
        initial={reducedMotion ? false : { opacity: 0, y: 18, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 25 }}
      >
        <button className="modal-close" type="button" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <span className="reward-celebration" aria-hidden="true">
          ✨
        </span>
        <span className="section-kicker">QUEST COMPLETE</span>
        <h2 id="reward-title">Adventure advanced!</h2>
        <div className="reward-summary">
          <span>+{rewards?.xp ?? 0} XP</span>
          <span>+{rewards?.gold ?? 0} Gold</span>
          <span>+1 {rewards?.attribute?.name || "attribute"}</span>
        </div>
        <p className="modal-streak">🔥 Streak: {streak?.current_streak ?? 0}</p>
        {result.achievements?.length ? (
          <div className="modal-achievements">
            <strong>🏆 New achievement</strong>
            {result.achievements.map((achievement) => (
              <span key={achievement.code}>{achievement.name}</span>
            ))}
          </div>
        ) : null}
        {progression?.leveled_up ? (
          <div className="level-up-callout">
            <strong>🎉 LEVEL UP!</strong>
            <span>
              Level {progression.previous_level} → Level {progression.current_level}
            </span>
          </div>
        ) : null}
        <button className="button button-primary" type="button" onClick={onClose}>
          Continue adventure
        </button>
      </motion.section>
      </motion.div> : null}
    </AnimatePresence>
  );
}
