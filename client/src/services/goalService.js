import { apiRequest } from "./api.js";

export async function getGoals() {
  return (await apiRequest("/goals")).goals;
}

export async function createGoal(values) {
  return (await apiRequest("/goals", { method: "POST", body: values })).goal;
}

export async function updateGoal(id, values) {
  return (await apiRequest("/goals/" + id, { method: "PUT", body: values })).goal;
}

export async function deleteGoal(id) {
  return apiRequest("/goals/" + id, { method: "DELETE" });
}

export async function getMilestones(goalId) {
  return (await apiRequest("/goals/" + goalId + "/milestones")).milestones;
}

export async function createMilestone(goalId, values) {
  return (
    await apiRequest("/goals/" + goalId + "/milestones", {
      method: "POST",
      body: values
    })
  ).milestone;
}

export async function updateMilestone(goalId, milestoneId, values) {
  return (
    await apiRequest("/goals/" + goalId + "/milestones/" + milestoneId, {
      method: "PUT",
      body: values
    })
  ).milestone;
}
