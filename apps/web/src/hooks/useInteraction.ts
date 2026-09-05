import { useEffect, useSyncExternalStore } from 'react';
import {
  closePanel,
  getInteractionState,
  openPanel,
  subscribeInteraction,
} from '../store/interactionStore';
import { useQuestStore } from '../store/questStore';

export interface InteractionState {
  active: ReturnType<typeof getInteractionState>['active'];
  panelOpen: boolean;
}

/**
 * Subscribe the UI to the interaction store (currently active interactable
 * and whether the dialogue panel is open).
 */
export function useInteraction(): InteractionState {
  return useSyncExternalStore(subscribeInteraction, getInteractionState);
}

let keysBound = false;

/**
 * Global E / Escape handling. E opens the panel for the active interactable
 * (starting its quest if any); while a quest is open, E advances to the next
 * dialogue step (or closes once the quest is complete). Escape always closes.
 * Bound once for the whole app.
 */
export function useInteractionKeys() {
  useEffect(() => {
    if (keysBound) return;
    keysBound = true;

    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const key = e.key.toLowerCase();
      if (key !== 'e' && key !== 'escape') return;

      const s = getInteractionState();
      const questState = useQuestStore.getState();

      if (s.panelOpen) {
        const questId = s.active?.questId;
        const progress = questId ? questState.progress[questId] : undefined;
        if (key === 'escape') {
          closePanel();
        } else if (questId && progress?.status === 'completed') {
          closePanel();
        } else if (questId && progress) {
          questState.advanceQuest(questId);
        } else {
          closePanel();
        }
      } else if (s.active) {
        const questId = s.active.questId;
        if (questId && !questState.progress[questId]) {
          questState.startQuest(questId);
        }
        document.exitPointerLock?.();
        openPanel();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      keysBound = false;
      window.removeEventListener('keydown', onKey);
    };
  }, []);
}
