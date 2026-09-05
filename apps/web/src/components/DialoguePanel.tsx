import type { ReactNode } from 'react';
import { closePanel } from '../store/interactionStore';
import { useQuestStore } from '../store/questStore';
import { useInteraction, useInteractionKeys } from '../hooks/useInteraction';
import { getCurrentStep } from '../hooks/useQuest';
import { getQuest } from '../lib/quests';

/**
 * Dialogue card shown when the player presses E near an interactable.
 * If the interactable maps to a quest, the card shows the current NPC line
 * (round indicator + hint) and E / Continue advances the quest; otherwise it
 * falls back to a placeholder line. This is the seam where the future NPC
 * conversation UI (speech, transcript, evaluation) will plug in.
 */
export default function DialoguePanel() {
  useInteractionKeys();
  const { panelOpen, active } = useInteraction();
  const progress = useQuestStore((s) =>
    active?.questId ? s.progress[active.questId] : undefined,
  );
  const advanceQuest = useQuestStore((s) => s.advanceQuest);

  if (!panelOpen || !active) return null;

  const quest = active.questId ? getQuest(active.questId) : undefined;

  let body: ReactNode;
  let showContinue = false;

  if (quest && progress) {
    const { round, step, isFinal } = getCurrentStep(quest, progress);

    if (isFinal) {
      body = (
        <>
          <div className="dialogue-tag">Quest complete</div>
          <p className="dialogue-npc">You finished “{quest.title}”! Well done.</p>
        </>
      );
    } else {
      showContinue = true;
      body = (
        <>
          <div className="dialogue-tag">
            Round {round.round} · {round.hintsEnabled ? 'Guided' : 'Recall'}
          </div>
          <p className="dialogue-npc">{step.npcText}</p>
          {step.transliteration && <p className="dialogue-translit">{step.transliteration}</p>}
          {round.hintsEnabled && step.suggestedPlayerText && (
            <p className="dialogue-hint">Try saying: {step.suggestedPlayerText}</p>
          )}
        </>
      );
    }
  } else if (quest) {
    body = (
      <>
        <div className="dialogue-tag">New quest</div>
        <p className="dialogue-text">{quest.title} — {quest.location}</p>
      </>
    );
  } else {
    body = (
      <p className="dialogue-text">
        You approach the {active.label.toLowerCase()}. Conversation coming soon.
      </p>
    );
  }

  return (
    <div className="dialogue-panel">
      <div className="dialogue-card">
        <div className="dialogue-title">{active.label}</div>
        {body}
        <div className="dialogue-actions">
          {showContinue && (
            <button className="dialogue-continue" onClick={() => advanceQuest(quest!.questId)}>
              Continue <span className="interaction-key">E</span>
            </button>
          )}
          <button className="dialogue-close" onClick={closePanel}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
