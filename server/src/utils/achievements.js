const requirementValueByType = Object.freeze({
  quests_completed: (progress) => progress.questsCompleted,
  streak_days: (progress) => progress.currentStreak,
  level: (progress) => progress.level,
  gold: (progress) => Math.max(progress.gold, progress.goldEarned),
  attribute_intellect: (progress) => progress.attributes.intellect,
  attribute_strength: (progress) => progress.attributes.strength,
  attribute_discipline: (progress) => progress.attributes.discipline,
  attribute_creativity: (progress) => progress.attributes.creativity
});

function assertProgress(progress) {
  if (
    !progress ||
    !Number.isSafeInteger(progress.questsCompleted) ||
    !Number.isSafeInteger(progress.level) ||
    !Number.isSafeInteger(progress.gold) ||
    !Number.isSafeInteger(progress.goldEarned) ||
    !Number.isSafeInteger(progress.currentStreak) ||
    !progress.attributes
  ) {
    throw new RangeError("Achievement progress is incomplete");
  }
}

export async function checkAndUnlockAchievements(client, userId, progress) {
  assertProgress(progress);

  const [achievementResult, unlockedResult] = await Promise.all([
    client.query(
      `SELECT id, code, name, description, icon, category,
              requirement_type, requirement_value
       FROM achievements
       ORDER BY id ASC`
    ),
    client.query(
      `SELECT achievement_id
       FROM user_achievements
       WHERE user_id = $1`,
      [userId]
    )
  ]);

  const unlockedIds = new Set(
    unlockedResult.rows.map((row) => String(row.achievement_id))
  );
  const newlyUnlocked = [];

  for (const achievement of achievementResult.rows) {
    const getCurrentValue =
      requirementValueByType[achievement.requirement_type];
    const currentValue = getCurrentValue?.(progress);

    if (
      unlockedIds.has(String(achievement.id)) ||
      !Number.isSafeInteger(currentValue) ||
      currentValue < achievement.requirement_value
    ) {
      continue;
    }

    const insertResult = await client.query(
      `INSERT INTO user_achievements (user_id, achievement_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, achievement_id) DO NOTHING
       RETURNING unlocked_at`,
      [userId, achievement.id]
    );

    if (insertResult.rowCount) {
      newlyUnlocked.push({
        ...achievement,
        unlocked: true,
        unlocked_at: insertResult.rows[0].unlocked_at
      });
    }
  }

  return newlyUnlocked;
}
