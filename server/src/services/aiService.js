import { logger } from "../utils/logger.js";

const allowedCategories = new Set([
  "intellect",
  "strength",
  "discipline",
  "creativity"
]);
const allowedDifficulties = new Set(["easy", "normal", "hard", "epic"]);
const allowedRecommendationTypes = new Set([
  "streak",
  "attribute",
  "category",
  "consistency",
  "progress"
]);
const allowedActions = new Set(["create_quest", "view_analytics", "view_character"]);
const maximumSuggestions = 5;
const maximumPlanSteps = 5;
const maximumQuestsPerStep = 3;
const maximumTitleLength = 120;
const maximumDescriptionLength = 500;
const maximumReasonLength = 300;
const defaultTimeoutMs = 10000;

function getText(value, maximumLength, required = true) {
  if (typeof value !== "string") {
    return null;
  }

  const text = value.trim();

  if ((!text && required) || text.length > maximumLength) {
    return null;
  }

  return text;
}

function getProviderConfig() {
  const provider = process.env.AI_PROVIDER?.trim().toLowerCase() || "optional";
  const apiKey = process.env.AI_API_KEY?.trim() || "";
  const model = process.env.AI_MODEL?.trim() || "gpt-4o-mini";

  return {
    provider,
    apiKey,
    model,
    endpoint:
      process.env.AI_API_URL?.trim() ||
      "https://api.openai.com/v1/chat/completions"
  };
}

export function isAIConfigured() {
  const { provider, apiKey } = getProviderConfig();
  return provider !== "optional" && Boolean(apiKey);
}

function parseJsonContent(content) {
  if (typeof content !== "string") {
    return content;
  }

  const trimmed = content.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(withoutFence);
  } catch {
    return null;
  }
}

function getTimeoutMs() {
  const configured = Number(process.env.AI_TIMEOUT_MS);
  return Number.isInteger(configured) && configured >= 1000 && configured <= 30000
    ? configured
    : defaultTimeoutMs;
}

export async function requestAIJson({ systemPrompt, userPrompt }) {
  const config = getProviderConfig();

  if (config.provider === "optional" || !config.apiKey) {
    return null;
  }

  if (!["openai", "openai-compatible"].includes(config.provider)) {
    logger.warn("Unsupported AI provider configured; using fallback", {
      provider: config.provider
    });
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getTimeoutMs());

  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.7,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      logger.warn("AI provider request failed; using fallback", {
        provider: config.provider,
        status: response.status
      });
      return null;
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    return parseJsonContent(content);
  } catch (error) {
    logger.warn("AI provider unavailable; using fallback", {
      provider: config.provider,
      reason: error?.name === "AbortError" ? "timeout" : error?.name || "network"
    });
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function validateSuggestion(suggestion) {
  if (!suggestion || typeof suggestion !== "object" || Array.isArray(suggestion)) {
    return null;
  }

  const title = getText(suggestion.title, maximumTitleLength);
  const description = getText(suggestion.description, maximumDescriptionLength);
  const category = getText(suggestion.category, 20)?.toLowerCase();
  const difficulty = getText(suggestion.difficulty, 10)?.toLowerCase();
  const reason = getText(suggestion.reason, maximumReasonLength, false);

  if (
    !title ||
    !description ||
    !category ||
    !allowedCategories.has(category) ||
    !difficulty ||
    !allowedDifficulties.has(difficulty)
  ) {
    return null;
  }

  return {
    title,
    description,
    category,
    difficulty,
    ...(reason ? { reason } : {})
  };
}

export function validateSuggestions(payload) {
  const suggestions = Array.isArray(payload) ? payload : payload?.suggestions;

  if (
    !Array.isArray(suggestions) ||
    suggestions.length === 0 ||
    suggestions.length > maximumSuggestions
  ) {
    return null;
  }

  const validated = suggestions.map(validateSuggestion);
  return validated.every(Boolean) ? validated : null;
}

function validatePlannedQuest(quest) {
  if (!quest || typeof quest !== "object" || Array.isArray(quest)) {
    return null;
  }

  const title = getText(quest.title, maximumTitleLength);
  const description = getText(quest.description, maximumDescriptionLength, false);
  const category = getText(quest.category, 20)?.toLowerCase();
  const difficulty = getText(quest.difficulty, 10)?.toLowerCase();

  if (
    !title ||
    !category ||
    !allowedCategories.has(category) ||
    !difficulty ||
    !allowedDifficulties.has(difficulty)
  ) {
    return null;
  }

  return {
    title,
    ...(description ? { description } : {}),
    category,
    difficulty
  };
}

export function validateGoalPlan(payload) {
  const plan = payload?.plan;

  if (!Array.isArray(plan) || plan.length === 0 || plan.length > maximumPlanSteps) {
    return null;
  }

  const validated = plan.map((step, index) => {
    if (!step || typeof step !== "object" || Array.isArray(step)) {
      return null;
    }

    const title = getText(step.title, maximumTitleLength);
    const description = getText(step.description, maximumDescriptionLength);
    const suggestedQuests = step.suggested_quests;
    const stepNumber = step.step ?? index + 1;

    if (
      !Number.isInteger(stepNumber) ||
      stepNumber !== index + 1 ||
      !title ||
      !description ||
      !Array.isArray(suggestedQuests) ||
      suggestedQuests.length > maximumQuestsPerStep
    ) {
      return null;
    }

    const quests = suggestedQuests.map(validatePlannedQuest);
    if (!quests.every(Boolean)) {
      return null;
    }

    return {
      step: stepNumber,
      title,
      description,
      suggested_quests: quests
    };
  });

  return validated.every(Boolean) ? validated : null;
}

export function validateRecommendations(payload) {
  const recommendations = Array.isArray(payload)
    ? payload
    : payload?.recommendations;

  if (
    !Array.isArray(recommendations) ||
    recommendations.length === 0 ||
    recommendations.length > maximumSuggestions
  ) {
    return null;
  }

  const validated = recommendations.map((recommendation) => {
    if (
      !recommendation ||
      typeof recommendation !== "object" ||
      !allowedRecommendationTypes.has(recommendation.type) ||
      !["high", "medium", "low"].includes(recommendation.priority)
    ) {
      return null;
    }

    const title = getText(recommendation.title, maximumTitleLength);
    const message = getText(recommendation.message, maximumDescriptionLength);
    const action = getText(recommendation.action, 30)?.toLowerCase();

    if (!title || !message || !action || !allowedActions.has(action)) {
      return null;
    }

    return {
      type: recommendation.type,
      priority: recommendation.priority,
      title,
      message,
      action
    };
  });

  return validated.every(Boolean) ? validated : null;
}

export function getAIValidationLimits() {
  return {
    maximumSuggestions,
    maximumPlanSteps,
    maximumQuestsPerStep
  };
}
