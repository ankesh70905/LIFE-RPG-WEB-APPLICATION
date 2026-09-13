import { useCallback, useEffect, useState } from "react";
import EmptyState from "../components/EmptyState.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import Loading from "../components/Loading.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { completeHabit, createHabit, deleteHabit, getHabits } from "../services/habitService.js";
import { MotionCard, MotionList, MotionButton } from "../components/Motion.jsx";

const initial = { title: "", description: "", category: "discipline", frequency: "daily", weekly_target: 1 };

export default function Habits() {
  const { showToast } = useToast();
  const [habits, setHabits] = useState([]); const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  const load = useCallback(async () => { setLoading(true); try { setHabits(await getHabits()); setError(""); } catch (e) { setError(e.message); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  async function submit(e) { e.preventDefault(); setSaving(true); try { const habit = await createHabit(form); setHabits((items) => [habit, ...items]); setForm(initial); showToast("Habit created."); } catch (e) { showToast(e.message, "error"); } finally { setSaving(false); } }
  async function complete(habit) { try { await completeHabit(habit.id); showToast("Habit completed!"); await load(); } catch (e) { showToast(e.message, "error"); } }
  async function remove(habit) { if (!window.confirm(`Delete ${habit.title}?`)) return; try { await deleteHabit(habit.id); setHabits((items) => items.filter((item) => item.id !== habit.id)); } catch (e) { showToast(e.message, "error"); } }
  if (loading) return <Loading label="Loading your habits..." />;
  return <MotionList className="page-stack"><section className="page-header"><div><span className="section-kicker">DAILY PRACTICE</span><h1>Build better habits.</h1><p>Small, repeatable actions earn lasting progress.</p></div></section>
    {error ? <ErrorMessage message={error} onRetry={load} /> : null}
    <MotionCard as="form" className="panel compact-form" onSubmit={submit}><div className="panel-heading"><div><span className="section-kicker">NEW HABIT</span><h2>Make it repeatable</h2></div></div>
      <div className="form-grid"><label>Habit title<input required maxLength="200" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label><label>Category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option value="discipline">🔥 Discipline</option><option value="intellect">🧠 Intellect</option><option value="strength">💪 Strength</option><option value="creativity">🎨 Creativity</option></select></label><label>Frequency<select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}><option value="daily">Every day</option><option value="weekly">Weekly target</option><option value="custom">Custom days</option></select></label><label>Weekly target<input type="number" min="1" max="7" value={form.weekly_target} onChange={(e) => setForm({ ...form, weekly_target: Number(e.target.value) })} /></label></div>
      <MotionButton className="button button-primary" disabled={saving}>{saving ? "Creating..." : "Create habit"}</MotionButton>
    </MotionCard>
    <MotionList className="feature-grid">{habits.length ? habits.map((habit) => <MotionCard as="article" className="panel feature-card" key={habit.id}><div className="panel-heading"><div><span className="section-kicker">{habit.category} · {habit.frequency}</span><h2>{habit.title}</h2></div><strong className="badge">{habit.streak || 0} day streak</strong></div><p>{habit.description || "Keep showing up and earn XP every time."}</p><div className="quick-actions"><MotionButton className="button button-primary button-small" type="button" onClick={() => complete(habit)}>✓ Complete today</MotionButton><button className="text-button text-button-danger" type="button" onClick={() => remove(habit)}>Delete</button></div></MotionCard>) : <EmptyState title="No habits yet" message="Create a practice you want to carry into your next level." />}</MotionList>
  </MotionList>;
}
