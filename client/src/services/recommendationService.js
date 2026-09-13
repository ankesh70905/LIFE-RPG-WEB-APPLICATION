import { apiRequest } from "./api.js";

export async function getRecommendations() {
  const response = await apiRequest("/recommendations");
  return response;
}
