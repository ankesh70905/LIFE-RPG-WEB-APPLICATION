const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const API_URL = (
  configuredApiUrl || (import.meta.env.DEV ? "http://localhost:5010/api" : "")
).replace(/\/$/, "");
const TOKEN_KEY = "life_rpg_token";
const REQUEST_TIMEOUT_MS = 15000;

let unauthorizedHandler = null;

export class ApiError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (typeof token !== "string" || !token.trim()) {
    throw new Error("A valid authentication token is required");
  }

  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

async function parseResponse(response) {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";
  const responseText = await response.text();

  if (!responseText) {
    return null;
  }

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(responseText);
    } catch {
      throw new ApiError("The server returned an invalid response", 502);
    }
  }

  return responseText;
}

export async function apiRequest(path, options = {}) {
  if (!API_URL) {
    throw new ApiError(
      "VITE_API_URL must be configured for the production frontend.",
      0
    );
  }

  const headers = new Headers(options.headers);
  const token = getToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let body = options.body;

  if (
    body !== undefined &&
    body !== null &&
    typeof body === "object" &&
    !(body instanceof FormData)
  ) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(body);
  }

  let response;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      body,
      signal: controller.signal
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new ApiError(
        "The Life RPG API took too long to respond. Please try again.",
        408
      );
    }

    throw new ApiError(
      "Unable to reach the Life RPG API. Check that the backend is running.",
      0
    );
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (response.status === 401) {
    removeToken();
    unauthorizedHandler?.();
  }

  const data = await parseResponse(response);

  if (!response.ok) {
    const message =
      data &&
      typeof data === "object" &&
      typeof data.message === "string"
        ? data.message
        : "The request could not be completed";

    throw new ApiError(message, response.status);
  }

  return data;
}
