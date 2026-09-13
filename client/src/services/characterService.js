import { apiRequest } from "./api.js";

export async function getCharacter() {
  const response = await apiRequest("/character");
  return response.character;
}

export async function getCharacterAttributes() {
  const response = await apiRequest("/character/attributes");
  return response;
}

export async function getCharacterStats() {
  const response = await apiRequest("/character/stats");
  return response.stats;
}
