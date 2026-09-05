import { useQuestStore } from '../store/questStore';
import { getQuest } from '../lib/quests';
import type { Quest, QuestProgress } from '../types/quest';

export function useQuestProgress(questId: string): QuestProgress | undefined {
  return useQuestStore((s) => s.progress[questId]);
}

/** The currently active (started, not completed) quest, if any. */
export function useActiveQuest(): { quest: Quest; progress: QuestProgress } | null {
  const progress = useQuestStore((s) => s.progress);
  const activeId = Object.keys(progress).find((id) => progress[id]?.status === 'active');
  if (!activeId) return null;
  const quest = getQuest(activeId);
  if (!quest) return null;
  return { quest, progress: progress[activeId] };
}

export interface CurrentStep {
  round: Quest['round1'];
  step: Quest['round1']['dialogueFlow'][number];
  isLastStep: boolean;
  isFinal: boolean;
}

/** Resolve the dialogue step a quest is currently on, from its progress. */
export function getCurrentStep(quest: Quest, progress: QuestProgress): CurrentStep {
  const round = progress.round === 1 ? quest.round1 : quest.round2;
  const idx = Math.min(progress.step, round.dialogueFlow.length - 1);
  return {
    round,
    step: round.dialogueFlow[idx],
    isLastStep: progress.step === round.dialogueFlow.length - 1,
    isFinal: progress.status === 'completed',
  };
}
