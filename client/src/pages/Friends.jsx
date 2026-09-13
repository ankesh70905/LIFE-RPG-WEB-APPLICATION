import { useEffect, useState } from "react";
import EmptyState from "../components/EmptyState.jsx";
import Loading from "../components/Loading.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import { acceptFriendRequest, getFriendRequests, getFriends, getPrivacy, removeFriend, sendFriendRequest, updatePrivacy } from "../services/friendService.js";
import { useToast } from "../context/ToastContext.jsx";
const labels = { share_display_name: "Display name", share_level: "Level", share_streak: "Streak", share_achievements: "Achievements" };
export default function Friends() {
  const { showToast } = useToast(); const [friends, setFriends] = useState([]); const [requests, setRequests] = useState([]); const [privacy, setPrivacy] = useState(null); const [email, setEmail] = useState(""); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  async function load() { try { const [a, b, c] = await Promise.all([getFriends(), getFriendRequests(), getPrivacy()]); setFriends(a); setRequests(b); setPrivacy(c); setError(""); } catch (e) { setError(e.message); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  async function invite(e) { e.preventDefault(); try { await sendFriendRequest(email); setEmail(""); showToast("Friend request sent."); } catch (e) { showToast(e.message, "error"); } }
  async function toggle(key) { const previous = privacy; const next = { ...privacy, [key]: !privacy[key] }; setPrivacy(next); try { await updatePrivacy({ [key]: next[key] }); } catch (e) { setPrivacy(previous); showToast(e.message, "error"); } }
  async function accept(id) { try { await acceptFriendRequest(id); await load(); showToast("Friend added."); } catch (e) { showToast(e.message, "error"); } }
  async function remove(id) { try { await removeFriend(id); setFriends((items) => items.filter((item) => item.id !== id)); } catch (e) { showToast(e.message, "error"); } }
  if (loading) return <Loading label="Loading your community..." />; if (error) return <ErrorMessage message={error} onRetry={load} />;
  return <div className="page-stack"><section className="page-header"><div><span className="section-kicker">YOUR PARTY</span><h1>Friends, your way.</h1><p>Share only what feels right. Privacy controls are always yours.</p></div></section>
    <div className="dashboard-grid"><section className="panel"><div className="panel-heading"><div><span className="section-kicker">CONNECT</span><h2>Invite a friend</h2></div></div><form className="inline-form" onSubmit={invite}><input type="email" required placeholder="friend@example.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Friend email" /><button className="button button-primary">Send request</button></form>{requests.length ? <div className="friend-list">{requests.map((request) => <div className="plan-row" key={request.id}><span>{request.requester_name || request.requester_email}</span><button type="button" className="button button-small button-secondary" onClick={() => accept(request.id)}>Accept</button></div>)}</div> : <p className="analytics-muted">No pending requests.</p>}</section>
      <section className="panel"><span className="section-kicker">PRIVACY</span><h2>What friends can see</h2><div className="privacy-list">{Object.keys(labels).map((key) => <label className="privacy-row" key={key}><span>{labels[key]}</span><input type="checkbox" checked={Boolean(privacy[key])} onChange={() => toggle(key)} /></label>)}</div></section></div>
    <section className="panel"><div className="panel-heading"><h2>Friends</h2><span className="analytics-muted">{friends.length} connected</span></div>{friends.length ? <div className="friend-list">{friends.map((friend) => <div className="friend-row" key={friend.id}><div><strong>{friend.profile.display_name || "Private adventurer"}</strong><small>{friend.profile.level == null ? "Progress hidden" : `Level ${friend.profile.level}`} · {friend.profile.current_streak == null ? "Streak hidden" : `${friend.profile.current_streak} day streak`}</small></div><button type="button" className="text-button text-button-danger" onClick={() => remove(friend.id)}>Remove</button></div>)}</div> : <EmptyState title="Your party is waiting" message="Invite someone to celebrate progress together." />}</section>
  </div>;
}
