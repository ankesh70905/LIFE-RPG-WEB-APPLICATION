import { apiRequest } from "./api.js";

export async function getStreak() {
  const response = await apiRequest("/streak");
  return response.streak;
}
