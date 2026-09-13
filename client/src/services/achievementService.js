import { apiRequest } from "./api.js";

export async function getAchievements() {
  const response = await apiRequest("/achievements");
  return response.achievements;
}

export async function getUnlockedAchievements() {
  const response = await apiRequest("/achievements/unlocked");
  return response.achievements;
}
