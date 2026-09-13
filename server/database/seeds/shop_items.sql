-- Idempotent default shop seed data.

INSERT INTO shop_items (name, description, price, icon, item_type)
VALUES
  ('Focus Badge', 'A badge for dedicated adventurers.', 100, '🎯', 'badge'),
  ('Golden Frame', 'A golden frame for your adventurer profile.', 250, '👑', 'cosmetic'),
  ('Night Theme', 'Unlock a special midnight interface theme.', 150, '🌙', 'theme'),
  ('Energy Potion', 'A collectible virtual reward for your inventory.', 75, '🧪', 'reward')
ON CONFLICT (name) DO NOTHING;
