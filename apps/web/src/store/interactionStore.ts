import type { Interactable } from '../data/interactables';

export interface InteractionState {
  active: Interactable | null;
  panelOpen: boolean;
}

let state: InteractionState = { active: null, panelOpen: false };
const listeners = new Set<() => void>();

function emit(next: InteractionState) {
  state = next;
  listeners.forEach((l) => l());
}

export function getInteractionState(): InteractionState {
  return state;
}

export function subscribeInteraction(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setActive(active: Interactable | null) {
  if (state.active === active) return;
  emit({ ...state, active });
}

export function openPanel() {
  if (state.panelOpen) return;
  emit({ ...state, panelOpen: true });
}

export function closePanel() {
  if (!state.panelOpen) return;
  emit({ ...state, panelOpen: false });
}
