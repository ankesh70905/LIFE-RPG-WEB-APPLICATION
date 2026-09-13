import { apiRequest } from "./api.js";

export async function getFriends() {
  return (await apiRequest("/friends")).friends;
}

export async function getFriendRequests() {
  return (await apiRequest("/friends/requests")).requests;
}

export async function sendFriendRequest(email) {
  return apiRequest("/friends/request", { method: "POST", body: { email } });
}

export async function acceptFriendRequest(id) {
  return apiRequest("/friends/" + id + "/accept", { method: "POST" });
}

export async function removeFriend(id) {
  return apiRequest("/friends/" + id, { method: "DELETE" });
}

export async function getPrivacy() {
  return (await apiRequest("/friends/privacy")).privacy;
}

export async function updatePrivacy(values) {
  return (await apiRequest("/friends/privacy", { method: "PUT", body: values })).privacy;
}
