export default function InventoryItemCard({ item }) {
  return (
    <article className="inventory-card">
      <div className="shop-item-icon" aria-hidden="true">
        {item.icon || "✦"}
      </div>
      <div>
        <div className="inventory-card-heading">
          <h3>{item.name}</h3>
          <span className="tag">{item.item_type}</span>
        </div>
        <p>{item.description}</p>
        <small>
          Acquired{" "}
          {item.purchased_at
            ? new Date(item.purchased_at).toLocaleDateString()
            : "recently"}
        </small>
      </div>
    </article>
  );
}
