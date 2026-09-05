export interface DialogueStep {
  step: number;
  npcText: string;
  npcAudio: string;
  expectedIntent: string;
  targetConcepts: string[];
  suggestedPlayerText?: string;
  transliteration?: string;
  acceptableParaphrases?: string[];
}

export interface QuestRound {
  round: 1 | 2;
  npcId: string;
  hintsEnabled: boolean;
  scenarioVariation?: string;
  dialogueFlow: DialogueStep[];
}

export interface Quest {
  questId: string;
  title: string;
  location: string;
  anchorId: string;
  round1: QuestRound;
  round2: QuestRound;
}

export interface QuestProgress {
  status: 'active' | 'completed';
  round: 1 | 2;
  step: number;
}
