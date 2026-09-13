import { apiRequest } from "./api.js";

export async function getChallenges() {
  return (await apiRequest("/challenges")).challenges;
}
