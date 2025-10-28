export function getXpToLevel(level){
    const baseXp = 1000;
    const tier = Math.floor((level -1)/5)
    const multiplier = 1.5 ** tier
    return Math.floor(baseXp * multiplier * level)
}
export function addXp(user, amount) {
  user.xp += amount;
  let leveledUp = false;

  while (user.xp >= getXpToLevel(user.level)) {
    user.xp -= getXpToLevel(user.level);
    user.level++;
    leveledUp = true;
  }

  return leveledUp;
}
export function getTier(level) {
  return Math.floor((level - 1) / 5);
}