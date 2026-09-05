import { HAWA, SHOPFRONTS } from '../entities/cityData';

/**
 * Registry of world objects the player can interact with by walking up to
 * them and pressing E. Positions are derived from cityData so the prompts
 * always sit on the objects' road-facing fronts. Later, each entry will also
 * carry the scenario/NPC id that starts a conversation.
 */
export interface Interactable {
  id: string;
  label: string;
  /** world x/z of the interaction point (in front of the object) */
  x: number;
  z: number;
  /** world-space height at which the floating prompt is shown */
  labelHeight: number;
  /** how close (x/z distance) the player must be to interact */
  radius: number;
  /** quest started by interacting (see packages/game-content/quests.json) */
  questId?: string;
}

const SHOP_LABELS = ['Chai Stall', 'Textile Shop', 'Sweet Shop'];

export const INTERACTABLES: Interactable[] = [
  ...SHOPFRONTS.map((spec, i) => ({
    id: `shop-${i}`,
    label: SHOP_LABELS[i] ?? 'Shop',
    x: spec.x - spec.depth / 2,
    z: spec.z,
    labelHeight: spec.height + 2,
    radius: 4.5,
    questId: i === 0 ? 'tiffin_stall_02' : undefined,
  })),
  {
    id: 'hawa-mahal',
    label: 'Hawa Mahal',
    x: HAWA.frontX + 1.5,
    z: HAWA.zCenter,
    labelHeight: 10,
    radius: 5,
  },
  {
    id: 'auto-stand',
    label: 'Auto Stand',
    x: 7.8,
    z: -10,
    labelHeight: 3.2,
    radius: 5,
    questId: 'auto_hawa_mahal_01',
  },
  {
    id: 'city-palace-gate',
    label: 'City Palace',
    x: 7.8,
    z: -46,
    labelHeight: 5.5,
    radius: 5,
    questId: 'ask_directions_03',
  },
];
