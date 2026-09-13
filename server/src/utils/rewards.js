const rewardByDifficulty = Object.freeze({
  easy: Object.freeze({ xp: 10, gold: 2 }),
  normal: Object.freeze({ xp: 20, gold: 5 }),
  hard: Object.freeze({ xp: 40, gold: 10 }),
  epic: Object.freeze({ xp: 80, gold: 20 })
});

export function getRewardsForDifficulty(difficulty) {
  const rewards = rewardByDifficulty[difficulty];

  if (!rewards) {
    throw new Error(`Unsupported task difficulty: ${difficulty}`);
  }

  return rewards;
}
