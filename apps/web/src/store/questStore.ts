import { create } from 'zustand';
import type { QuestProgress } from '../types/quest';
import { getQuest } from '../lib/quests';

interface QuestState {
  /** questId -> progress; quests not in here are not yet started */
  progress: Record<string, QuestProgress>;
  startQuest: (questId: string) => void;
  /** next dialogue step -> next round -> completed */
  advanceQuest: (questId: string) => void;
  resetQuest: (questId: string) => void;
}

// Session-only quest tracking: state lives in memory and resets on reload.
export const useQuestStore = create<QuestState>()((set, get) => ({
  progress: {},

  startQuest: (questId) =>
    set((s) => ({
      progress: {
        ...s.progress,
        [questId]: { status: 'active', round: 1, step: 0 },
      },
    })),

  advanceQuest: (questId) => {
    const p = get().progress[questId];
    if (!p || p.status === 'completed') return;
    const quest = getQuest(questId);
    if (!quest) return;

    const round = p.round === 1 ? quest.round1 : quest.round2;
    if (p.step + 1 < round.dialogueFlow.length) {
      set((s) => ({
        progress: { ...s.progress, [questId]: { ...p, step: p.step + 1 } },
      }));
    } else if (p.round === 1) {
      set((s) => ({
        progress: { ...s.progress, [questId]: { status: 'active', round: 2, step: 0 } },
      }));
    } else {
      set((s) => ({
        progress: { ...s.progress, [questId]: { status: 'completed', round: 2, step: p.step } },
      }));
    }
  },

  resetQuest: (questId) =>
    set((s) => {
      const next = { ...s.progress };
      delete next[questId];
      return { progress: next };
    }),
}));
