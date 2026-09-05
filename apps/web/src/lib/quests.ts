import questsRaw from '@game-content/quests.json?raw';
import type { Quest } from '../types/quest';

const data = JSON.parse(questsRaw) as { quests: Quest[] };

/** All quests loaded from packages/game-content (single source of truth). */
export const QUESTS: Quest[] = data.quests;

export function getQuest(questId: string): Quest | undefined {
  return QUESTS.find((q) => q.questId === questId);
}
