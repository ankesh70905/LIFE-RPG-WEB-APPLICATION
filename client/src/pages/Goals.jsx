import { useCallback, useEffect, useState } from "react";
import EmptyState from "../components/EmptyState.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import Loading from "../components/Loading.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { MotionCard, MotionList, MotionButton } from "../components/Motion.jsx";
import {
  createGoal,
  createMilestone,
  deleteGoal,
  getGoals,
  getMilestones,
  updateGoal,
  updateMilestone
} from "../services/goalService.js";

const initialGoal = {
  title: "",
  description: "",
  category: "discipline",
  target_date: ""
};

export default function Goals() {
  const { showToast } = useToast();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(initialGoal);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [milestoneTitle, setMilestoneTitle] = useState("");

  const loadGoals = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setGoals(await getGoals());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  async function chooseGoal(goal) {
    setSelected(goal);
    setMilestoneTitle("");
    try {
      setMilestones(await getMilestones(goal.id));
    } catch (requestError) {
      showToast(requestError.message, "error");
    }
  }

  async function submitGoal(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const goal = await createGoal({
        ...form,
        target_date: form.target_date || null
      });
      setGoals((current) => [goal, ...current]);
      setForm(initialGoal);
      showToast("Long-term goal created.");
    } catch (requestError) {
      showToast(requestError.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function addMilestone(event) {
    event.preventDefault();
    if (!selected || !milestoneTitle.trim()) return;
    try {
      const milestone = await createMilestone(selected.id, { title: milestoneTitle.trim() });
      setMilestones((current) => [...current, milestone]);
      setMilestoneTitle("");
      await loadGoals();
    } catch (requestError) {
      showToast(requestError.message, "error");
    }
  }

  async function toggleMilestone(milestone) {
    try {
      const updated = await updateMilestone(selected.id, milestone.id, {
        status: milestone.status === "completed" ? "pending" : "completed"
      });
      setMilestones((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
      await loadGoals();
    } catch (requestError) {
      showToast(requestError.message, "error");
    }
  }

  async function changeStatus(goal, status) {
    try {
      const updated = await updateGoal(goal.id, { status });
      setGoals((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      if (selected?.id === updated.id) setSelected(updated);
    } catch (requestError) {
      showToast(requestError.message, "error");
    }
  }

  async function removeGoal(goal) {
    if (!window.confirm("Delete this goal and its milestones? Linked quests will remain, without the link.")) return;
    try {
      await deleteGoal(goal.id);
      setGoals((current) => current.filter((item) => item.id !== goal.id));
      if (selected?.id === goal.id) {
        setSelected(null);
        setMilestones([]);
      }
      showToast("Goal deleted.");
    } catch (requestError) {
      showToast(requestError.message, "error");
    }
  }

  if (loading) return <Loading label="Loading your long-term quests..." />;

  return (
    <MotionList className="page-stack">
      <section className="page-header">
        <div>
          <span className="section-kicker">LONG-TERM PROGRESSION</span>
          <h1>Build the next chapter.</h1>
          <p>Break meaningful ambitions into clear, finishable milestones.</p>
        </div>
      </section>
      {error ? <ErrorMessage message={error} onRetry={loadGoals} /> : null}
      <MotionCard as="form" className="panel compact-form" onSubmit={submitGoal}>
        <div className="panel-heading">
          <div><span className="section-kicker">NEW GOAL</span><h2>Set your direction</h2></div>
        </div>
        <div className="form-grid">
          <label>Goal title<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} maxLength="200" required /></label>
          <label>Target date <span className="label-optional">Optional</span><input className="goal-date-input" type="date" min={new Date().toISOString().slice(0, 10)} value={form.target_date} onChange={(event) => setForm({ ...form, target_date: event.target.value })} /></label>
          <label>Attribute<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option value="intellect">🧠 Intellect</option><option value="strength">💪 Strength</option><option value="discipline">🔥 Discipline</option><option value="creativity">🎨 Creativity</option></select></label>
          <label>Description <span className="label-optional">Optional</span><input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength="2000" /></label>
        </div>
        <MotionButton className="button button-primary" disabled={saving}>{saving ? "Creating..." : "Create goal"}</MotionButton>
      </MotionCard>
      <section className="goal-layout">
        <MotionList className="goal-list">
          {goals.length ? goals.map((goal) => (
            <MotionCard as="article" key={goal.id} className={"panel goal-card" + (selected?.id === goal.id ? " selected" : "")}>
              <button className="goal-select" type="button" onClick={() => chooseGoal(goal)}>
                <span className="section-kicker">{goal.status.toUpperCase()} · {goal.category}</span>
                <h2>{goal.title}</h2>
                <p>{goal.description || "No description yet."}</p>
                <div className="progress-label"><span>Milestones</span><strong>{goal.progress_percentage}%</strong></div>
                <span className="progress-track"><span className="progress-value" style={{ width: goal.progress_percentage + "%" }} /></span>
                <small>{goal.completed_milestones} of {goal.total_milestones} complete{goal.target_date ? " · Target " + goal.target_date : ""}</small>
              </button>
              <div className="goal-actions">
                <select aria-label={"Status for " + goal.title} value={goal.status} onChange={(event) => changeStatus(goal, event.target.value)}>
                  <option value="active">Active</option><option value="paused">Paused</option><option value="completed">Completed</option><option value="archived">Archived</option>
                </select>
                <button className="text-button text-button-danger" type="button" onClick={() => removeGoal(goal)}>Delete</button>
              </div>
            </MotionCard>
          )) : <EmptyState title="No long-term goals yet" message="Create one ambition, then turn it into milestones." />}
        </MotionList>
        <MotionCard as="aside" className="panel milestone-panel">
          {selected ? <>
            <span className="section-kicker">MILESTONES</span><h2>{selected.title}</h2>
            <form className="inline-form" onSubmit={addMilestone}>
              <input value={milestoneTitle} onChange={(event) => setMilestoneTitle(event.target.value)} placeholder="Add a milestone" maxLength="200" />
              <button className="button button-primary button-small">Add</button>
            </form>
            {milestones.length ? <div className="milestone-list">{milestones.map((milestone) => <button key={milestone.id} className={"milestone-row" + (milestone.status === "completed" ? " complete" : "")} type="button" onClick={() => toggleMilestone(milestone)}><span aria-hidden="true">{milestone.status === "completed" ? "✓" : "○"}</span><span>{milestone.title}</span></button>)}</div> : <p className="analytics-muted">Add the first step to make this goal actionable.</p>}
          </> : <EmptyState title="Choose a goal" message="Its milestones will appear here." />}
        </MotionCard>
      </section>
    </MotionList>
  );
}
