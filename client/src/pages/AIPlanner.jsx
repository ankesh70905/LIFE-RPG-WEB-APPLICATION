import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import EmptyState from "../components/EmptyState.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import Loading from "../components/Loading.jsx";
import { getQuestSuggestions, planGoal } from "../services/aiService.js";
import { getRecommendations } from "../services/recommendationService.js";

const categoryIcons = {
  intellect: "🧠",
  strength: "💪",
  discipline: "🔥",
  creativity: "🎨"
};

function formatLabel(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
}

function getSafePlannerError(error, fallback) {
  return error?.status === 400 && error.message ? error.message : fallback;
}

function SourceNotice({ source }) {
  if (source !== "fallback") {
    return null;
  }

  return (
    <p className="fallback-notice" role="status">
      AI is currently unavailable. These suggestions are based on your activity.
    </p>
  );
}

function CreateQuestButton({ suggestion, onCreate }) {
  return (
    <button
      className="button button-secondary button-small"
      type="button"
      onClick={() => onCreate(suggestion)}
    >
      Create quest
    </button>
  );
}

export default function AIPlanner() {
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState("");
  const [goal, setGoal] = useState("");
  const [plan, setPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState("");
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationsError, setRecommendationsError] = useState("");

  const loadRecommendations = useCallback(async () => {
    setRecommendationsError("");

    try {
      const response = await getRecommendations();
      setRecommendations(response.recommendations || []);
    } catch (error) {
      setRecommendationsError(
        getSafePlannerError(error, "Recommendations are temporarily unavailable.")
      );
    }
  }, []);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  async function handleSuggestions() {
    setSuggestionsLoading(true);
    setSuggestionsError("");

    try {
      setSuggestions(await getQuestSuggestions());
    } catch (error) {
      setSuggestionsError(
        getSafePlannerError(error, "Quest suggestions are temporarily unavailable.")
      );
    } finally {
      setSuggestionsLoading(false);
    }
  }

  async function handlePlan(event) {
    event.preventDefault();
    setPlanLoading(true);
    setPlanError("");

    try {
      setPlan(await planGoal(goal));
    } catch (error) {
      setPlanError(
        getSafePlannerError(error, "Goal planning is temporarily unavailable.")
      );
    } finally {
      setPlanLoading(false);
    }
  }

  function createQuest(suggestion) {
    navigate("/tasks", {
      state: {
        prefill: {
          title: suggestion.title,
          description: suggestion.description || "",
          category: suggestion.category,
          difficulty: suggestion.difficulty
        }
      }
    });
  }

  return (
    <div className="page-stack">
      <section className="page-header ai-planner-header">
        <div>
          <span className="section-kicker">SMART QUEST DESIGN</span>
          <h1>Plan your next adventure.</h1>
          <p>Turn your goals and recent momentum into achievable quests.</p>
        </div>
        <span className="feature-hero-icon" aria-hidden="true">🤖</span>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">PERSONALIZED IDEAS</span>
            <h2>AI quest suggestions</h2>
          </div>
          <button
            className="button button-primary"
            type="button"
            onClick={handleSuggestions}
            disabled={suggestionsLoading}
          >
            {suggestionsLoading ? "Generating..." : "Generate quest suggestions"}
          </button>
        </div>
        {suggestionsError ? (
          <ErrorMessage message={suggestionsError} onRetry={handleSuggestions} />
        ) : null}
        {suggestionsLoading ? <Loading label="Generating suggestions..." /> : null}
        {!suggestionsLoading && suggestions ? (
          <>
            <SourceNotice source={suggestions.source} />
            <div className="suggestion-grid">
              {suggestions.suggestions.map((suggestion) => (
                <article className="suggestion-card" key={`${suggestion.title}-${suggestion.category}`}>
                  <div className="suggestion-card-heading">
                    <span className="suggestion-icon" aria-hidden="true">
                      {categoryIcons[suggestion.category]}
                    </span>
                    <div>
                      <h3>{suggestion.title}</h3>
                      <div className="task-tags">
                        <span className="tag">{formatLabel(suggestion.category)}</span>
                        <span className={`tag difficulty-${suggestion.difficulty}`}>
                          {formatLabel(suggestion.difficulty)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p>{suggestion.description}</p>
                  {suggestion.reason ? (
                    <small className="suggestion-reason">{suggestion.reason}</small>
                  ) : null}
                  <CreateQuestButton suggestion={suggestion} onCreate={createQuest} />
                </article>
              ))}
            </div>
          </>
        ) : null}
        {!suggestionsLoading && !suggestions && !suggestionsError ? (
          <EmptyState
            title="Ready for your next quest?"
            message="Generate suggestions based on your attributes, streak, and recent activity."
          />
        ) : null}
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">LONG-TERM PROGRESS</span>
            <h2>Smart goal planner</h2>
          </div>
        </div>
        <form className="goal-form" onSubmit={handlePlan}>
          <label htmlFor="goal">What do you want to achieve?</label>
          <div className="goal-input-row">
            <input
              id="goal"
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              placeholder="e.g. Learn Python"
              maxLength="120"
              required
            />
            <button className="button button-primary" type="submit" disabled={planLoading}>
              {planLoading ? "Planning..." : "Generate plan"}
            </button>
          </div>
        </form>
        {planError ? <ErrorMessage message={planError} /> : null}
        {planLoading ? <Loading label="Building your goal plan..." /> : null}
        {plan ? (
          <div className="goal-plan">
            <SourceNotice source={plan.source} />
            <p className="goal-plan-label">GOAL</p>
            <h3>{plan.goal}</h3>
            <div className="plan-step-list">
              {plan.plan.map((step) => (
                <article className="plan-step" key={step.step}>
                  <span className="plan-step-number">{step.step}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                    <div className="plan-quest-list">
                      {step.suggested_quests.map((quest) => (
                        <div className="plan-quest" key={`${step.step}-${quest.title}`}>
                          <div>
                            <strong>{quest.title}</strong>
                            <span>
                              {formatLabel(quest.category)} · {formatLabel(quest.difficulty)}
                            </span>
                          </div>
                          <CreateQuestButton suggestion={quest} onCreate={createQuest} />
                        </div>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">YOUR NEXT BEST MOVES</span>
            <h2>Personalized recommendations</h2>
          </div>
        </div>
        {recommendationsError ? (
          <p className="form-error" role="alert">{recommendationsError}</p>
        ) : null}
        {recommendations.length ? (
          <div className="recommendation-grid">
            {recommendations.map((recommendation, index) => (
              <article className="recommendation-card" key={`${recommendation.type}-${index}`}>
                <span className="recommendation-priority">{recommendation.priority}</span>
                <h3>{recommendation.title}</h3>
                <p>{recommendation.message}</p>
                {recommendation.action === "create_quest" ? (
                  <button
                    className="text-link text-button"
                    type="button"
                    onClick={() => navigate("/tasks")}
                  >
                    Create a quest →
                  </button>
                ) : recommendation.action === "view_analytics" ? (
                  <button
                    className="text-link text-button"
                    type="button"
                    onClick={() => navigate("/analytics")}
                  >
                    View analytics →
                  </button>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Your path is looking good"
            message="Keep completing quests and new recommendations will appear here."
          />
        )}
      </section>
    </div>
  );
}
