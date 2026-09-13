import { apiRequest } from "./api.js";

export async function getInventory() {
  const response = await apiRequest("/inventory");
  return response.inventory;
}
