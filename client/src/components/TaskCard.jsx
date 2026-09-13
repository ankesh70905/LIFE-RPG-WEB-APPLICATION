import { MotionCard, MotionButton } from "./Motion.jsx";

const categoryIcons = {
  intellect: "🧠",
  strength: "💪",
  discipline: "🔥",
  creativity: "🎨"
};

export default function TaskCard({
  task,
  onComplete,
  onEdit,
  onDelete,
  completing,
  readOnly = false
}) {
  return (
    <MotionCard className={`task-card${task.completed ? " task-completed" : ""}`}>
      <div className="task-card-main">
        <div className="task-title-row">
          <span className="task-category-icon" aria-hidden="true">
            {categoryIcons[task.category]}
          </span>
          <div>
            <h3>{task.title}</h3>
            <div className="task-tags">
              <span className="tag">{task.category}</span>
              <span className={`tag difficulty-${task.difficulty}`}>
                {task.difficulty}
              </span>
            </div>
          </div>
        </div>
        {task.description ? <p className="task-description">{task.description}</p> : null}
      </div>
      <div className="task-card-side">
        <div className="reward-pills">
          <span>+{task.xp_reward} XP</span>
          <span>+{task.gold_reward} gold</span>
        </div>
        {task.completed ? (
          <span className="completed-badge">✓ Completed</span>
        ) : readOnly ? (
          <span className="preview-badge">Open quest</span>
        ) : (
          <div className="task-actions">
            <MotionButton
              className="button button-primary button-small"
              type="button"
              onClick={() => onComplete(task)}
              disabled={completing}
            >
              {completing ? "Completing..." : "Complete"}
            </MotionButton>
            <button
              className="text-button"
              type="button"
              onClick={() => onEdit(task)}
              disabled={completing}
            >
              Edit
            </button>
            <button
              className="text-button text-button-danger"
              type="button"
              onClick={() => onDelete(task)}
              disabled={completing}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </MotionCard>
  );
}
