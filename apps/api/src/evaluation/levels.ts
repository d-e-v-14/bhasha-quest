import type { ExpectedSlot, Round } from "@learn-live/types";

export interface LevelData {
  id: string;
  city: string;
  language: string;
  rounds: Partial<Record<Round, { targetPhrase: string; expectedSlots: ExpectedSlot[] }>>;
}

export const levels: LevelData[] = [
  {
    id: "tiffin-order-01",
    city: "chennai",
    language: "ta-IN",
    rounds: {
      guided: {
        targetPhrase: "ஒரு வடை தரவும்",
        expectedSlots: [
          { key: "item", value: "வடை", aliases: ["வடை"] },
          { key: "quantity", value: "ஒரு", aliases: ["ஒன்று"] },
        ],
      },
      recall: {
        targetPhrase: "ஒரு வடை",
        expectedSlots: [
          { key: "item", value: "வடை", aliases: ["வடை"] },
          { key: "quantity", value: "ஒரு", aliases: ["ஒன்று"] },
        ],
      },
    },
  },
  {
    id: "auto-booking-01",
    city: "chennai",
    language: "ta-IN",
    rounds: {
      guided: {
        targetPhrase: "அண்ணா நகர் போக வேண்டும்",
        expectedSlots: [
          { key: "place", value: "அண்ணா நகர்", aliases: ["அண்ணா நகர்", "அண்ணாநகர்"] },
        ],
      },
      recall: {
        targetPhrase: "அண்ணா நகர்",
        expectedSlots: [{ key: "place", value: "அண்ணா நகர்", aliases: ["அண்ணா நகர்", "அண்ணாநகர்"] }],
      },
    },
  },
];

export function getLevel(id: string): LevelData | undefined {
  return levels.find((l) => l.id === id);
}
