import { apiRequest } from "./api.js";

export async function getTasks() {
  const response = await apiRequest("/tasks");
  return response.tasks;
}

export async function createTask(task) {
  const response = await apiRequest("/tasks", {
    method: "POST",
    body: task
  });
  return response.task;
}

export async function updateTask(taskId, task) {
  const response = await apiRequest(`/tasks/${taskId}`, {
    method: "PUT",
    body: task
  });
  return response.task;
}

export async function deleteTask(taskId) {
  return apiRequest(`/tasks/${taskId}`, {
    method: "DELETE"
  });
}

export async function completeTask(taskId) {
  return apiRequest(`/tasks/${taskId}/complete`, {
    method: "POST"
  });
}
