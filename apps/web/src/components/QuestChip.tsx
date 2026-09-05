import { useActiveQuest } from '../hooks/useQuest';

/**
 * Minimal HUD chip showing the active quest title and current round.
 * Hidden while no quest is in progress.
 */
export default function QuestChip() {
  const active = useActiveQuest();
  if (!active) return null;

  return (
    <div className="quest-chip">
      <span className="quest-dot" />
      <span className="quest-title">{active.quest.title}</span>
      <span className="quest-round">Round {active.progress.round}</span>
    </div>
  );
}
