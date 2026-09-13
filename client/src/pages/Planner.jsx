import { useEffect, useState } from "react";
import Loading from "../components/Loading.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import { getTodayPlan, getWeekPlan } from "../services/plannerService.js";

export default function Planner() {
  const [today, setToday] = useState(null); const [week, setWeek] = useState(null); const [mode, setMode] = useState("today"); const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  const load = () => { setLoading(true); Promise.all([getTodayPlan(), getWeekPlan()]).then(([a, b]) => { setToday(a); setWeek(b); }).catch((e) => setError(e.message)).finally(() => setLoading(false)); };
  useEffect(load, []);
  if (loading) return <Loading label="Planning your adventure..." />; if (error) return <ErrorMessage message={error} onRetry={load} />;
  const plan = mode === "today" ? today : week;
  return <div className="page-stack"><section className="page-header"><div><span className="section-kicker">YOUR ROUTE</span><h1>Plan with purpose.</h1><p>See quests, habits, milestones, and challenges in one calm view.</p></div><div className="quick-actions"><button className={`button button-small ${mode === "today" ? "button-primary" : "button-secondary"}`} onClick={() => setMode("today")}>Today</button><button className={`button button-small ${mode === "week" ? "button-primary" : "button-secondary"}`} onClick={() => setMode("week")}>This week</button></div></section>
    {mode === "today" ? <section className="panel"><div className="panel-heading"><h2>Today’s progress</h2><strong>{today.completed_items} complete · {today.remaining_items} remaining</strong></div><PlanList title="Quests" items={today.quests} /><PlanList title="Habits" items={today.habits} /></section> : <section className="planner-week">{week.days.map((day) => <article className="panel" key={day.date}><span className="section-kicker">{new Date(`${day.date}T00:00:00Z`).toLocaleDateString(undefined, { weekday: "long" })}</span><h2>{day.date}</h2><PlanList title="Quests" items={day.quests} /><PlanList title="Habits" items={day.habits} /></article>)}</section>}
    <section className="panel"><span className="section-kicker">NEXT MILESTONES</span>{(plan.milestones || []).length ? plan.milestones.map((item) => <p key={item.id}>○ {item.title} <span className="analytics-muted">· {item.goal_title}</span></p>) : <p className="analytics-muted">Your next milestone will appear here.</p>}</section>
  </div>;
}
function PlanList({ title, items = [] }) { return <div className="plan-list"><h3>{title}</h3>{items.length ? items.map((item) => <div className="plan-row" key={item.id}><span aria-hidden="true">{item.completed ? "✓" : "○"}</span><span>{item.title}</span>{item.is_due_today ? <small>Due today</small> : null}</div>) : <p className="analytics-muted">Nothing scheduled.</p>}</div>; }
