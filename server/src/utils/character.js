const attributeOrder = Object.freeze([
  "intellect",
  "strength",
  "discipline",
  "creativity"
]);

function normalizeAttributes(attributes) {
  return attributeOrder.reduce((normalized, name) => {
    const value = attributes?.[name];

    if (!Number.isSafeInteger(value) || value < 0) {
      throw new RangeError(`${name} must be a non-negative safe integer`);
    }

    normalized[name] = value;
    return normalized;
  }, {});
}

export function calculateTotalAttributes(attributes) {
  return Object.values(normalizeAttributes(attributes)).reduce(
    (total, value) => total + value,
    0
  );
}

export function getStrongestAttributes(attributes) {
  const normalized = normalizeAttributes(attributes);
  const highestValue = Math.max(...Object.values(normalized));

  return attributeOrder.filter((name) => normalized[name] === highestValue);
}

export function rankAttributes(attributes) {
  const normalized = normalizeAttributes(attributes);

  // Ties retain the documented deterministic order: intellect, strength,
  // discipline, then creativity.
  return attributeOrder
    .map((name) => ({
      name,
      value: normalized[name]
    }))
    .sort((first, second) => second.value - first.value);
}

export function getAttributeSummary(attributes) {
  const normalized = normalizeAttributes(attributes);

  return {
    ...normalized,
    total_attributes: calculateTotalAttributes(normalized),
    strongest_attributes: getStrongestAttributes(normalized)
  };
}
