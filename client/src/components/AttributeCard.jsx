const attributeDetails = {
  intellect: { label: "Intellect", icon: "🧠" },
  strength: { label: "Strength", icon: "💪" },
  discipline: { label: "Discipline", icon: "🔥" },
  creativity: { label: "Creativity", icon: "🎨" }
};

export default function AttributeCard({ name, value }) {
  const detail = attributeDetails[name] || { label: name, icon: "✦" };

  return (
    <div className={`attribute-card attribute-${name}`}>
      <span className="attribute-icon" aria-hidden="true">
        {detail.icon}
      </span>
      <span className="attribute-label">{detail.label}</span>
      <strong className="attribute-value">{value}</strong>
    </div>
  );
}
