import { useFrame } from '@react-three/fiber';
import { INTERACTABLES, type Interactable } from '../data/interactables';
import { playerPosition } from '../lib/playerState';
import { getInteractionState, setActive } from '../store/interactionStore';

/**
 * Per-frame proximity scan: finds the nearest interactable within its radius
 * and publishes it to the interaction store. Rendered inside the Canvas.
 */
export default function InteractionTracker() {
  useFrame(() => {
    let nearest: Interactable | null = null;
    let nearestDist = Infinity;

    for (const it of INTERACTABLES) {
      const d = Math.hypot(playerPosition.x - it.x, playerPosition.z - it.z);
      if (d <= it.radius && d < nearestDist) {
        nearest = it;
        nearestDist = d;
      }
    }

    if (nearest !== getInteractionState().active) {
      setActive(nearest);
    }
  });

  return null;
}
