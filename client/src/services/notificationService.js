import { apiRequest } from "./api.js";

export async function getNotifications(limit = 20) {
  const response = await apiRequest(`/notifications?limit=${limit}`);
  return response;
}

export async function markNotificationRead(notificationId) {
  const response = await apiRequest(`/notifications/${notificationId}/read`, {
    method: "PATCH"
  });
  return response.notification;
}

export async function markAllNotificationsRead() {
  return apiRequest("/notifications/read-all", {
    method: "PATCH"
  });
}
