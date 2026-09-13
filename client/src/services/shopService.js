import { apiRequest } from "./api.js";

export async function getShopItems() {
  return apiRequest("/shop/items");
}

export async function purchaseItem(itemId) {
  return apiRequest(`/shop/purchase/${itemId}`, {
    method: "POST"
  });
}
