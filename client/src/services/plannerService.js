import { apiRequest } from "./api.js";

export async function getTodayPlan() {
  return apiRequest("/planner/today");
}

export async function getWeekPlan() {
  return apiRequest("/planner/week");
}

export async function refreshReminders() {
  return apiRequest("/reminders/refresh", { method: "POST" });
}
