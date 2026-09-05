import { Html } from '@react-three/drei';
import type { Interactable } from '../data/interactables';
import { useInteraction } from '../hooks/useInteraction';

/**
 * Floating "[E] <label>" prompt above an interactable, visible only while it
 * is the player's nearest in-range target. Rendered per interactable inside
 * the scene; the parent group supplies the world x/z.
 */
export default function InteractionPrompt({ interactable }: { interactable: Interactable }) {
  const { active } = useInteraction();

  if (active?.id !== interactable.id) return null;

  return (
    <Html
      position={[0, interactable.labelHeight, 0]}
      center
      distanceFactor={12}
      zIndexRange={[40, 0]}
      style={{ pointerEvents: 'none' }}
    >
      <div className="interaction-label">
        <span className="interaction-key">E</span>
        {interactable.label}
      </div>
    </Html>
  );
}
