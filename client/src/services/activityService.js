import { apiRequest } from "./api.js";

export async function getActivity(days = 7) {
  const response = await apiRequest(`/activity?days=${days}`);
  return response.activity;
}
