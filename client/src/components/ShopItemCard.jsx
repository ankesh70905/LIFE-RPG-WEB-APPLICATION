import { MotionCard, MotionButton } from "./Motion.jsx";

export default function ShopItemCard({
  item,
  owned,
  currentGold,
  purchasing,
  onPurchase
}) {
  const canAfford = currentGold >= item.price;

  return (
    <MotionCard className="shop-card">
      <div className="shop-item-icon" aria-hidden="true">
        {item.icon || "✦"}
      </div>
      <div className="shop-card-content">
        <div className="shop-card-heading">
          <div>
            <h3>{item.name}</h3>
            <span className="tag">{item.item_type}</span>
          </div>
          <strong className="shop-price">💰 {item.price}</strong>
        </div>
        <p>{item.description}</p>
        {owned ? (
          <span className="owned-badge">✓ Owned</span>
        ) : (
          <MotionButton
            className="button button-primary button-small"
            type="button"
            onClick={() => onPurchase(item)}
            disabled={purchasing || !canAfford}
            title={!canAfford ? "Complete quests to earn more gold" : undefined}
          >
            {purchasing ? "Purchasing..." : canAfford ? "Purchase" : "Not enough gold"}
          </MotionButton>
        )}
      </div>
    </MotionCard>
  );
}
