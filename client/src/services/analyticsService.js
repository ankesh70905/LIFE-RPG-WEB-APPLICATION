import { apiRequest } from "./api.js";

export async function getWeeklyAnalytics() {
  const response = await apiRequest("/analytics/weekly");
  return response.analytics;
}

export async function getWeeklySummary() {
  const response = await apiRequest("/analytics/weekly-summary");
  return response.summary;
}

export async function getAnalyticsOverview(days = 30) {
  const response = await apiRequest(`/analytics/overview?days=${days}`);
  return {
    period: response.period,
    analytics: response.analytics
  };
}

export async function getAnalyticsInsights() {
  const response = await apiRequest("/analytics/insights");
  return response;
}
