import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Shop from "../pages/Shop.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { getInventory } from "../services/inventoryService.js";
import { getShopItems, purchaseItem } from "../services/shopService.js";

vi.mock("../context/ToastContext.jsx", () => ({
  useToast: vi.fn()
}));
vi.mock("../services/inventoryService.js", () => ({
  getInventory: vi.fn()
}));
vi.mock("../services/shopService.js", () => ({
  getShopItems: vi.fn(),
  purchaseItem: vi.fn()
}));

describe("Shop page", () => {
  beforeEach(() => {
    useToast.mockReturnValue({ showToast: vi.fn() });
    getShopItems.mockResolvedValue({
      gold: 125,
      items: [
        {
          id: "1",
          name: "Focus Badge",
          description: "A badge for dedicated adventurers.",
          icon: "🎯",
          item_type: "badge",
          price: 100
        }
      ]
    });
    getInventory.mockResolvedValue([]);
    purchaseItem.mockResolvedValue({
      purchase: { remaining_gold: 25 }
    });
  });

  it("renders purchasable items and marks them owned after purchase", async () => {
    const user = userEvent.setup();
    render(<Shop />);

    expect(
      await screen.findByRole("heading", { name: "Focus Badge" })
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Purchase" }));

    await waitFor(() => expect(purchaseItem).toHaveBeenCalledWith("1"));
    expect(await screen.findByText("✓ Owned")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Focus Badge added to your inventory."
    );
  });

  it("disables purchases the user cannot afford", async () => {
    getShopItems.mockResolvedValue({
      gold: 0,
      items: [
        {
          id: "2",
          name: "Golden Frame",
          description: "A frame",
          icon: "👑",
          item_type: "cosmetic",
          price: 250
        }
      ]
    });
    render(<Shop />);

    const button = await screen.findByRole("button", {
      name: "Not enough gold"
    });
    expect(button).toBeDisabled();
    expect(purchaseItem).not.toHaveBeenCalled();
  });
});
