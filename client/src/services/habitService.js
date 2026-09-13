import { apiRequest } from "./api.js";

export async function getHabits() {
  return (await apiRequest("/habits")).habits;
}

export async function createHabit(values) {
  return (await apiRequest("/habits", { method: "POST", body: values })).habit;
}

export async function updateHabit(id, values) {
  return (await apiRequest("/habits/" + id, { method: "PUT", body: values })).habit;
}

export async function deleteHabit(id) {
  return apiRequest("/habits/" + id, { method: "DELETE" });
}

export async function completeHabit(id) {
  return apiRequest("/habits/" + id + "/complete", { method: "POST" });
}
