/**
 * Story System for Lumenfall
 * Manages story progress, NPC dialogue, and quest states
 * Dialogue changes based on: story choice, stage, time of day
 */

export type StoryChoice = 'light_keeper' | 'shadow_walker' | null;
export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';

export interface DialogueLine {
  text: string;
  condition?: {
    story?: StoryChoice;
    stage?: number;
    timeOfDay?: TimeOfDay[];
    minStage?: number;
    maxStage?: number;
  };
}

export interface NPCDialogue {
  name: string;
  portrait: string;
  lines: DialogueLine[];
}

// Re-export dialog types for use in StorySystem
export type { QuizData, RiddleData, FillData, PuzzleData, ChoiceData } from '../ui/DialogManager';

// Story stages:
// 0 = Game start (no story chosen)
// 1 = Story chosen, beginning
// 2 = First quest complete
// 3 = Mid-story
// 4 = Final quest
// 5 = Story complete

const DIALOGUES: Record<string, NPCDialogue> = {
  guard: {
    name: 'Guard Aldric',
    portrait: 'guard',
    lines: [
      // Stage 0 - Before story
      {
        text: 'Welcome to Bright Hollow, traveler! These are troubled times. The shadows grow longer each night.',
        condition: { stage: 0 }
      },
      {
        text: 'At night, the shadows come alive. Stay close to the light!',
        condition: { stage: 0, timeOfDay: ['night', 'dusk'] }
      },
      // Stage 1 - Light Keeper path
      {
        text: 'So you\'ve chosen to be a Light Keeper! The Elder will be pleased. Seek out the ancient lanterns.',
        condition: { story: 'light_keeper', stage: 1 }
      },
      // Stage 1 - Shadow Walker path
      {
        text: 'A Shadow Walker... I\'ve heard of your kind. Tread carefully, the shadows are not always your friends.',
        condition: { story: 'shadow_walker', stage: 1 }
      },
      // Stage 2+
      {
        text: 'You\'re making progress! The shadows seem less bold since you started your quest.',
        condition: { minStage: 2, maxStage: 3 }
      },
      {
        text: 'The final battle approaches. Be ready, young hero!',
        condition: { minStage: 4 }
      },
      // Default
      {
        text: 'Keep your lantern lit and stay on the roads. The shadows avoid the light.'
      }
    ]
  },
  
  apprentice: {
    name: 'Mira the Apprentice',
    portrait: 'apprentice',
    lines: [
      {
        text: 'Oh! A visitor! I\'m studying light magic. Did you know shadows are actually afraid of even a small flame?',
        condition: { stage: 0 }
      },
      {
        text: 'The Elder has two paths for you - the Light Keeper or the Shadow Walker. Both can defeat the darkness!',
        condition: { stage: 0 }
      },
      {
        text: 'As a Light Keeper, you\'ll collect ancient lanterns to banish the shadows forever!',
        condition: { story: 'light_keeper', stage: 1 }
      },
      {
        text: 'Shadow Walkers are fascinating... you can walk through shadows without being hurt! But be careful.',
        condition: { story: 'shadow_walker', stage: 1 }
      },
      {
        text: 'I\'ve been reading about the Shadow Realm. It says the shadows feed on fear. Don\'t be afraid!',
        condition: { minStage: 2 }
      },
      {
        text: 'The stars are beautiful tonight, aren\'t they? Though I wish there were fewer shadows...',
        condition: { timeOfDay: ['night'] }
      },
      {
        text: 'Good morning! I\'ve been studying all night. Light magic is so exciting!'
      }
    ]
  },
  
  merchant: {
    name: 'Trader Brom',
    portrait: 'merchant',
    lines: [
      {
        text: 'Welcome! I sell potions, lanterns, and supplies. Everything a hero needs!',
        condition: { stage: 0 }
      },
      {
        text: 'Business has been slow... people are afraid to travel at night. Can\'t blame them!',
        condition: { timeOfDay: ['night', 'dusk'] }
      },
      {
        text: 'I heard you\'re on a quest! I have special lantern oil that makes your light twice as bright.',
        condition: { minStage: 1 }
      },
      {
        text: 'The forest to the north is dangerous at night. I wouldn\'t go there without a good lantern.',
        condition: { minStage: 1 }
      },
      {
        text: 'You\'re the hero who\'s been fighting the shadows! Take this potion, on the house!',
        condition: { minStage: 3 }
      },
      {
        text: 'Looking for supplies? I have the best prices in Bright Hollow!'
      }
    ]
  },
  
  elder: {
    name: 'Elder Theron',
    portrait: 'elder',
    lines: [
      {
        text: 'Ah, a young traveler. I have been waiting for someone like you. The shadows grow stronger each night.',
        condition: { stage: 0 }
      },
      {
        text: 'You must choose your path. The Light Keeper harnesses light to banish shadows. The Shadow Walker learns to walk between worlds.',
        condition: { stage: 0 }
      },
      {
        text: 'Your first task: find the three Ancient Lanterns hidden in the forest. They will give you power over shadows.',
        condition: { story: 'light_keeper', stage: 1 }
      },
      {
        text: 'Your first task: enter the Shadow Realm at midnight. You must learn to speak the language of shadows.',
        condition: { story: 'shadow_walker', stage: 1 }
      },
      {
        text: 'You have grown strong. The Shadow King stirs in his realm. Prepare yourself for the final battle.',
        condition: { minStage: 3 }
      },
      {
        text: 'The darkness has retreated! You have saved Bright Hollow. The light will shine again!',
        condition: { minStage: 5 }
      },
      {
        text: 'The night sky holds many secrets. Come speak to me when you are ready to begin your journey.'
      }
    ]
  },
  
  blacksmith: {
    name: 'Blacksmith Gordo',
    portrait: 'guard',
    lines: [
      {
        text: 'I forge weapons and armor. Nothing special for shadows though... they don\'t have bodies to hit!',
        condition: { stage: 0 }
      },
      {
        text: 'I heard you\'re fighting shadows. I made this lantern holder for your belt. Keeps your hands free!',
        condition: { minStage: 1 }
      },
      {
        text: 'The shadows haven\'t bothered my forge. Fire keeps them away, I think!'
      }
    ]
  },
  
  innkeeper: {
    name: 'Innkeeper Marta',
    portrait: 'merchant',
    lines: [
      {
        text: 'Welcome to the Bright Hollow Inn! We have warm beds and hot soup.',
        condition: { timeOfDay: ['day', 'dawn'] }
      },
      {
        text: 'It\'s late! You should rest. Shadows are more dangerous when you\'re tired.',
        condition: { timeOfDay: ['night', 'dusk'] }
      },
      {
        text: 'I\'ve heard stories of the Shadow King. They say he was once a Light Keeper who lost his lantern...',
        condition: { minStage: 2 }
      },
      {
        text: 'Rest well, hero. Tomorrow brings new adventures!'
      }
    ]
  }
};

export class StorySystem {
  private storyChoice: StoryChoice = null;
  private storyStage: number = 0;
  private completedQuests: Set<string> = new Set();
  
  constructor() {}
  
  public setStoryChoice(choice: StoryChoice): void {
    this.storyChoice = choice;
    this.storyStage = 1;
  }
  
  public getStoryChoice(): StoryChoice {
    return this.storyChoice;
  }
  
  public getStoryStage(): number {
    return this.storyStage;
  }
  
  public advanceStage(): void {
    this.storyStage++;
  }
  
  public completeQuest(questId: string): void {
    this.completedQuests.add(questId);
  }
  
  public hasCompletedQuest(questId: string): boolean {
    return this.completedQuests.has(questId);
  }
  
  public getTimeOfDay(timeValue: number): TimeOfDay {
    if (timeValue < 0.25) return 'dawn';
    if (timeValue < 0.55) return 'day';
    if (timeValue < 0.7) return 'dusk';
    return 'night';
  }
  
  public getDialogue(npcType: string, timeValue: number): { name: string; portrait: string; text: string } {
    const npcData = DIALOGUES[npcType];
    if (!npcData) {
      return { name: 'Villager', portrait: 'guard', text: 'Hello there!' };
    }
    
    const timeOfDay = this.getTimeOfDay(timeValue);
    
    // Find best matching dialogue line
    let bestLine: DialogueLine | null = null;
    
    for (const line of npcData.lines) {
      if (!line.condition) {
        // Default line - use as fallback
        if (!bestLine) bestLine = line;
        continue;
      }
      
      const cond = line.condition;
      
      // Check story choice
      if (cond.story && cond.story !== this.storyChoice) continue;
      
      // Check exact stage
      if (cond.stage !== undefined && cond.stage !== this.storyStage) continue;
      
      // Check min stage
      if (cond.minStage !== undefined && this.storyStage < cond.minStage) continue;
      
      // Check max stage
      if (cond.maxStage !== undefined && this.storyStage > cond.maxStage) continue;
      
      // Check time of day
      if (cond.timeOfDay && !cond.timeOfDay.includes(timeOfDay)) continue;
      
      // All conditions met - this is a good match
      bestLine = line;
      break;
    }
    
    return {
      name: npcData.name,
      portrait: npcData.portrait,
      text: bestLine?.text || 'Hello there!'
    };
  }

  public getQuizData(key: string): import('../ui/DialogManager').QuizData | null {
    return QUIZ_DATA[key] ?? null;
  }

  public getRiddleData(key: string): import('../ui/DialogManager').RiddleData | null {
    return RIDDLE_DATA[key] ?? null;
  }

  public getFillData(key: string): import('../ui/DialogManager').FillData | null {
    return FILL_DATA[key] ?? null;
  }

  public getPuzzleData(key: string): import('../ui/DialogManager').PuzzleData | null {
    return PUZZLE_DATA[key] ?? null;
  }

  public getChoiceData(key: string): import('../ui/DialogManager').ChoiceData | null {
    return CHOICE_DATA[key] ?? null;
  }
}

// ─── Learning Dialog Data ─────────────────────────────────────────────────────

const QUIZ_DATA: Record<string, import('../ui/DialogManager').QuizData> = {
  apprentice_quiz: {
    speaker: 'Mira the Apprentice',
    portrait: 'apprentice',
    question: 'What is 3 + 4?',
    options: ['5', '6', '7', '8'],
    correct: 2,
    hint: 'Count on your fingers!',
  },
  blacksmith_quiz: {
    speaker: 'Aldric the Blacksmith',
    portrait: 'blacksmith',
    question: 'Which material is the strongest for a sword?',
    options: ['Wood', 'Copper', 'Iron', 'Steel'],
    correct: 3,
    hint: 'It\'s made by mixing iron with carbon.',
  },
  scholar_quiz: {
    speaker: 'Scholar Tobias',
    portrait: 'scholar',
    question: 'How many sides does a hexagon have?',
    options: ['4', '5', '6', '8'],
    correct: 2,
    hint: 'Hex means six in Greek!',
  },
  child_quiz: {
    speaker: 'Pip the Child',
    portrait: 'child',
    question: 'What colour do you get when you mix blue and yellow?',
    options: ['Red', 'Green', 'Purple', 'Orange'],
    correct: 1,
  },
};

const RIDDLE_DATA: Record<string, import('../ui/DialogManager').RiddleData> = {
  elder_riddle: {
    speaker: 'Elder Bramwell',
    portrait: 'elder',
    riddle: 'I have hands but cannot clap. I have a face but no eyes. What am I?',
    answer: 'clock',
    hint: 'You check me to know the time.',
  },
  innkeeper_riddle: {
    speaker: 'Innkeeper Rosie',
    portrait: 'innkeeper',
    riddle: 'The more you take, the more you leave behind. What am I?',
    answer: 'footsteps',
    hint: 'Think about walking...',
  },
};

const FILL_DATA: Record<string, import('../ui/DialogManager').FillData> = {
  guard_fill: {
    speaker: 'Guard Aldric',
    portrait: 'guard',
    sentence: 'The sun rises in the ___',
    words: ['east', 'west', 'north', 'south'],
    correct: 0,
    hint: 'Think about the morning sky.',
  },
  merchant_fill: {
    speaker: 'Merchant Gilda',
    portrait: 'merchant',
    sentence: 'Water boils at ___ degrees Celsius',
    words: ['100', '50', '200', '75'],
    correct: 0,
    hint: 'It\'s the same as a century!',
  },
};

const PUZZLE_DATA: Record<string, import('../ui/DialogManager').PuzzleData> = {
  magician_puzzle: {
    speaker: 'Magician Zephyrus',
    portrait: 'magician',
    instruction: 'Put these words in the right order to make a sentence:',
    words: ['cat', 'the', 'sat', 'on', 'mat', 'the'],
    answer: 'the cat sat on the mat',
    hint: 'It\'s a classic rhyme!',
  },
  healer_puzzle: {
    speaker: 'Healer Lyra',
    portrait: 'healer',
    instruction: 'Order the seasons from spring to winter:',
    words: ['Autumn', 'Winter', 'Spring', 'Summer'],
    answer: 'Spring Summer Autumn Winter',
  },
};

const CHOICE_DATA: Record<string, import('../ui/DialogManager').ChoiceData> = {
  guard_choice: {
    speaker: 'Guard Aldric',
    portrait: 'guard',
    text: 'The forest path is dangerous at night. Which way will you go?',
    options: ['Take the forest path', 'Wait until morning', 'Ask the Elder for advice', 'Turn back to the inn'],
  },
  elder_choice: {
    speaker: 'Elder Bramwell',
    portrait: 'elder',
    text: 'The ancient prophecy speaks of two paths. Which do you choose?',
    options: ['Become a Light Keeper', 'Walk the Shadow Path'],
  },
};
