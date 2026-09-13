import { Link } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import EmptyState from "../components/EmptyState.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import InventoryItemCard from "../components/InventoryItemCard.jsx";
import Loading from "../components/Loading.jsx";
import { getInventory } from "../services/inventoryService.js";

export default function Inventory() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadInventory = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      setInventory(await getInventory());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  if (loading) {
    return <Loading label="Opening your inventory..." />;
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <span className="section-kicker">YOUR COLLECTION</span>
          <h1>Inventory</h1>
          <p>Everything you have earned along the way.</p>
        </div>
        <span className="inventory-count">{inventory.length} items</span>
      </section>

      {error ? <ErrorMessage message={error} onRetry={loadInventory} /> : null}

      {inventory.length ? (
        <section className="inventory-grid">
          {inventory.map((item) => (
            <InventoryItemCard key={item.inventory_id} item={item} />
          ))}
        </section>
      ) : (
        <EmptyState
          title="Your inventory is waiting"
          message="Purchase your first reward from the shop after completing a few quests."
          action={<Link className="button button-primary button-small" to="/shop">Visit the shop</Link>}
        />
      )}
    </div>
  );
}
