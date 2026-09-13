import { useCallback, useEffect, useState } from "react";
import { useToast } from "../context/ToastContext.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import Loading from "../components/Loading.jsx";
import ShopItemCard from "../components/ShopItemCard.jsx";
import { MotionList, MotionCard } from "../components/Motion.jsx";
import { getInventory } from "../services/inventoryService.js";
import { getShopItems, purchaseItem } from "../services/shopService.js";

export default function Shop() {
  const { showToast } = useToast();
  const [items, setItems] = useState([]);
  const [ownedIds, setOwnedIds] = useState(new Set());
  const [gold, setGold] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [purchasingId, setPurchasingId] = useState(null);
  const [notice, setNotice] = useState("");

  const loadShop = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [shop, inventory] = await Promise.all([getShopItems(), getInventory()]);
      setItems(shop.items);
      setGold(shop.gold);
      setOwnedIds(new Set(inventory.map((item) => String(item.item_id))));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadShop();
  }, [loadShop]);

  async function handlePurchase(item) {
    setPurchasingId(item.id);
    setError("");
    setNotice("");

    try {
      const result = await purchaseItem(item.id);
      setGold(result.purchase.remaining_gold);
      setOwnedIds((current) => new Set([...current, String(item.id)]));
      setNotice(`${item.name} added to your inventory.`);
      showToast(`${item.name} added to your inventory.`);
    } catch (requestError) {
      setError(requestError.message);
      showToast(requestError.message, "error");
    } finally {
      setPurchasingId(null);
    }
  }

  if (loading) {
    return <Loading label="Opening the merchant's shop..." />;
  }

  return (
    <MotionList className="page-stack">
      <MotionCard as="section" className="page-header shop-header">
        <div>
          <span className="section-kicker">REWARDS & COSMETICS</span>
          <h1>Spend your hard-earned gold.</h1>
          <p>Collect a few treasures to celebrate the quests you conquer.</p>
        </div>
        <div className="gold-wallet">
          <span aria-hidden="true">💰</span>
          <div>
            <small>YOUR BALANCE</small>
            <strong>{gold} gold</strong>
          </div>
        </div>
      </MotionCard>

      {error ? <ErrorMessage message={error} onRetry={loadShop} /> : null}
      {notice ? <p className="success-message" role="status">✓ {notice}</p> : null}

      {items.length ? (
        <MotionList className="shop-grid">
          {items.map((item) => (
            <ShopItemCard
              key={item.id}
              item={item}
              owned={ownedIds.has(String(item.id))}
              currentGold={gold}
              purchasing={purchasingId === item.id}
              onPurchase={handlePurchase}
            />
          ))}
        </MotionList>
      ) : (
        <EmptyState title="The shelves are empty" message="Check back after the next restock." />
      )}
    </MotionList>
  );
}
