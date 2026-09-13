import { useCallback, useEffect, useState } from "react";
import AttributeCard from "../components/AttributeCard.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import Loading from "../components/Loading.jsx";
import XPProgressBar from "../components/XPProgressBar.jsx";
import { getCharacter } from "../services/characterService.js";

export default function Character() {
  const [character, setCharacter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCharacter = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      setCharacter(await getCharacter());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCharacter();
  }, [loadCharacter]);

  if (loading) {
    return <Loading label="Inspecting your character..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadCharacter} />;
  }

  const attributes = character.attributes;
  const strongest = attributes.strongest_attributes || [];

  return (
    <div className="page-stack">
      <section className="character-hero">
        <div className="character-avatar" aria-hidden="true">
          {character.user.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <span className="section-kicker">CHARACTER PROFILE</span>
          <h1>{character.user.name}</h1>
          <p>{character.user.email}</p>
        </div>
        <div className="character-level">
          <span>LEVEL</span>
          <strong>{character.progression.level}</strong>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">YOUR JOURNEY</span>
            <h2>Experience progression</h2>
          </div>
          <span className="total-xp">{character.progression.total_xp} total XP</span>
        </div>
        <XPProgressBar progression={character.progression} />
      </section>

      <div className="character-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">CORE ATTRIBUTES</span>
              <h2>Power profile</h2>
            </div>
            <strong className="attribute-total">{attributes.total_attributes} total</strong>
          </div>
          <div className="attribute-grid attribute-grid-large">
            {["intellect", "strength", "discipline", "creativity"].map((name) => (
              <AttributeCard key={name} name={name} value={attributes[name]} />
            ))}
          </div>
          <p className="strongest-note">
            Strongest {strongest.length > 1 ? "attributes" : "attribute"}:{" "}
            <strong>{strongest.join(", ")}</strong>
          </p>
        </section>

        <section className="panel" id="streak">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">DAILY MOMENTUM</span>
              <h2>Streak power</h2>
            </div>
            <span className="streak-flame" aria-hidden="true">🔥</span>
          </div>
          <div className="streak-big-number">
            {character.streak.current_streak}
            <small>days</small>
          </div>
          <p className="muted-text">
            Personal best: <strong>{character.streak.longest_streak} days</strong>
          </p>
          <p className="muted-text">
            Last activity: {character.streak.last_activity_date || "No quests completed yet"}
          </p>
        </section>
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">RANKING</span>
            <h2>Attribute leaderboard</h2>
          </div>
        </div>
        <div className="ranking-list">
          {character.attribute_ranking.map((attribute, index) => (
            <div className="ranking-row" key={attribute.name}>
              <span className="ranking-position">0{index + 1}</span>
              <span className="ranking-name">{attribute.name}</span>
              <span className="ranking-bar">
                <span
                  style={{
                    width: `${attributes.total_attributes ? (attribute.value / Math.max(...character.attribute_ranking.map((item) => item.value), 1)) * 100 : 0}%`
                  }}
                />
              </span>
              <strong>{attribute.value}</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
