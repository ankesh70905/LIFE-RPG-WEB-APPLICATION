-- Idempotent Phase 11 achievement seed data.

INSERT INTO achievements (
  code,
  name,
  description,
  icon,
  category,
  requirement_type,
  requirement_value
)
VALUES
  ('FIRST_QUEST', 'First Quest', 'Complete your first quest.', '🔥', 'quests', 'quests_completed', 1),
  ('QUEST_MASTER', 'Quest Master', 'Complete 10 quests.', '⚔️', 'quests', 'quests_completed', 10),
  ('QUEST_LEGEND', 'Quest Legend', 'Complete 100 quests.', '🏆', 'quests', 'quests_completed', 100),
  ('STREAK_7', 'Dedicated', 'Reach a 7-day streak.', '🔥', 'streaks', 'streak_days', 7),
  ('STREAK_30', 'Unstoppable', 'Reach a 30-day streak.', '🚀', 'streaks', 'streak_days', 30),
  ('LEVEL_5', 'Level Up', 'Reach level 5.', '⭐', 'progression', 'level', 5),
  ('LEVEL_10', 'Elite Adventurer', 'Reach level 10.', '🌟', 'progression', 'level', 10),
  ('GOLD_100', 'Gold Collector', 'Reach 100 gold.', '💰', 'economy', 'gold', 100),
  ('GOLD_1000', 'Gold Hoard', 'Reach 1000 gold.', '💎', 'economy', 'gold', 1000),
  ('INTELLECT_10', 'Intellect Master', 'Reach 10 Intellect.', '🧠', 'attributes', 'attribute_intellect', 10),
  ('STRENGTH_10', 'Strength Master', 'Reach 10 Strength.', '💪', 'attributes', 'attribute_strength', 10),
  ('DISCIPLINE_10', 'Discipline Master', 'Reach 10 Discipline.', '🔥', 'attributes', 'attribute_discipline', 10),
  ('CREATIVITY_10', 'Creativity Master', 'Reach 10 Creativity.', '🎨', 'attributes', 'attribute_creativity', 10)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category,
  requirement_type = EXCLUDED.requirement_type,
  requirement_value = EXCLUDED.requirement_value;
