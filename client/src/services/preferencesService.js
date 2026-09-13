import { apiRequest } from "./api.js";

// Keep these defaults usable while the authenticated preferences request is loading.
export const defaultPreferences = {
  ai_coach_enabled: true,
  ai_personalization_enabled: true,
  reminders_enabled: true,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
};

function normalizePreferences(response) {
  return { ...defaultPreferences, ...(response?.preferences || response || {}) };
}

export async function getPreferences() {
  return normalizePreferences(await apiRequest("/preferences"));
}

export async function updatePreferences(preferences) {
  return normalizePreferences(
    await apiRequest("/preferences", { method: "PATCH", body: preferences })
  );
}
