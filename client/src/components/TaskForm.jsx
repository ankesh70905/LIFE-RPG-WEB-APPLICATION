import { useEffect, useState } from "react";

const defaultValues = {
  title: "",
  description: "",
  category: "discipline",
  difficulty: "normal"
};

const estimatedRewards = {
  easy: { xp: 10, gold: 2 },
  normal: { xp: 20, gold: 5 },
  hard: { xp: 40, gold: 10 },
  epic: { xp: 80, gold: 20 }
};

export default function TaskForm({
  editingTask,
  initialValues,
  onSubmit,
  onCancel,
  submitting,
  error
}) {
  const [values, setValues] = useState(defaultValues);
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    if (editingTask) {
      setValues({
        title: editingTask.title,
        description: editingTask.description || "",
        category: editingTask.category,
        difficulty: editingTask.difficulty
      });
    } else if (initialValues) {
      setValues({
        title: initialValues.title || "",
        description: initialValues.description || "",
        category: initialValues.category || "discipline",
        difficulty: initialValues.difficulty || "normal"
      });
    } else {
      setValues(defaultValues);
    }
    setValidationError("");
  }, [editingTask, initialValues]);

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const title = values.title.trim();

    if (!title) {
      setValidationError("Give your quest a title.");
      return;
    }

    setValidationError("");
    await onSubmit({
      title,
      description: values.description.trim(),
      category: values.category,
      difficulty: values.difficulty
    });
  }

  const reward = estimatedRewards[values.difficulty];

  return (
    <form className="panel task-form" onSubmit={handleSubmit}>
      <div className="panel-heading">
        <div>
          <span className="section-kicker">
            {editingTask ? "REFINE YOUR QUEST" : "NEW ADVENTURE"}
          </span>
          <h2>{editingTask ? "Edit quest" : "Create a quest"}</h2>
        </div>
        {editingTask ? (
          <button className="icon-button" type="button" onClick={onCancel}>
            ✕<span className="sr-only">Cancel editing</span>
          </button>
        ) : null}
      </div>
      <label>
        Quest title
        <input
          name="title"
          value={values.title}
          onChange={handleChange}
          placeholder="e.g. Complete a 20-minute workout"
          maxLength="200"
          required
        />
      </label>
      <label>
        Description <span className="label-optional">Optional</span>
        <textarea
          name="description"
          value={values.description}
          onChange={handleChange}
          placeholder="What does success look like?"
          rows="3"
          maxLength="1000"
        />
      </label>
      <div className="form-grid">
        <label>
          Attribute
          <select name="category" value={values.category} onChange={handleChange}>
            <option value="intellect">🧠 Intellect</option>
            <option value="strength">💪 Strength</option>
            <option value="discipline">🔥 Discipline</option>
            <option value="creativity">🎨 Creativity</option>
          </select>
        </label>
        <label>
          Difficulty
          <select
            name="difficulty"
            value={values.difficulty}
            onChange={handleChange}
          >
            <option value="easy">Easy</option>
            <option value="normal">Normal</option>
            <option value="hard">Hard</option>
            <option value="epic">Epic</option>
          </select>
        </label>
      </div>
      <p className="reward-hint">
        Estimated reward: <strong>+{reward.xp} XP</strong> and{" "}
        <strong>+{reward.gold} gold</strong>. The server confirms the final reward.
      </p>
      {validationError || error ? (
        <p className="form-error" role="alert">
          {validationError || error}
        </p>
      ) : null}
      <div className="form-actions">
        {editingTask ? (
          <button className="button button-secondary" type="button" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
        <button className="button button-primary" type="submit" disabled={submitting}>
          {submitting ? "Saving..." : editingTask ? "Save changes" : "Create quest"}
        </button>
      </div>
    </form>
  );
}
