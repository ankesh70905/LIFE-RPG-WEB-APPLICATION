import { apiRequest } from "./api.js";

export async function getQuestSuggestions() {
  const response = await apiRequest("/ai/suggest-quests", {
    method: "POST"
  });
  return response;
}

export async function planGoal(goal) {
  const response = await apiRequest("/ai/plan-goal", {
    method: "POST",
    body: { goal }
  });
  return response;
}
