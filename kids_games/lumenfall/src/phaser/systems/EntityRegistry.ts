/**
 * Entity Registry
 * Defines all NPC and monster types with their properties,
 * movement flags, and sprite information.
 */

import { EntityMovementFlags, DEFAULT_FLAGS, SHADOW_FLAGS, GHOST_FLAGS } from './TileSystem';

export type EntityState = 'idle' | 'walk' | 'run' | 'attack' | 'dead' | 'fainted' | 'frozen' | 'alert';

export interface EntityDefinition {
  id: string;
  name: string;
  type: 'npc' | 'monster' | 'boss';
  atlas: string;
  frames: Record<EntityState, string | string[]>;  // frame name(s) per state
  movementFlags: EntityMovementFlags;
  hp: number;
  speed: number;
  damage?: number;           // Damage dealt to player on contact
  dialogueKey?: string;      // Key in StorySystem dialogues
  canWander?: boolean;       // Does this NPC wander around?
  wanderRadius?: number;     // How far from home position to wander (tiles)
  isHostile?: boolean;       // Attacks player on sight
  sightRange?: number;       // How many tiles away to detect player
  fleeFromLight?: boolean;   // Shadow monsters flee from light
  displaySize?: number;      // Override display size (default 48)
  tileWidth?: number;        // How many tiles wide (default 1)
  tileHeight?: number;       // How many tiles tall (default 1)
  mathDifficulty?: number;   // If set, triggers math challenge (1-5)
}

// ===================== NPC DEFINITIONS =====================

export const NPC_DEFINITIONS: Record<string, EntityDefinition> = {
  guard: {
    id: 'guard',
    name: 'Guard Aldric',
    type: 'npc',
    atlas: 'characters',
    frames: {
      idle: 'guard_idle',
      walk: ['guard_walk_1', 'guard_walk_2'],
      run: ['guard_walk_1', 'guard_walk_2'],
      attack: 'guard_alert',
      dead: 'guard_dead',
      fainted: 'guard_fainted',
      frozen: 'guard_frozen',
      alert: 'guard_alert',
    },
    movementFlags: DEFAULT_FLAGS,
    hp: 100,
    speed: 80,
    dialogueKey: 'guard',
    canWander: false,
  },

  guard2: {
    id: 'guard2',
    name: 'Guard Berin',
    type: 'npc',
    atlas: 'characters',
    frames: {
      idle: 'guard_idle',
      walk: ['guard_walk_1', 'guard_walk_2'],
      run: ['guard_walk_1', 'guard_walk_2'],
      attack: 'guard_alert',
      dead: 'guard_dead',
      fainted: 'guard_fainted',
      frozen: 'guard_frozen',
      alert: 'guard_alert',
    },
    movementFlags: DEFAULT_FLAGS,
    hp: 100,
    speed: 80,
    dialogueKey: 'guard',
    canWander: true,
    wanderRadius: 2,
  },

  apprentice: {
    id: 'apprentice',
    name: 'Mira the Apprentice',
    type: 'npc',
    atlas: 'characters',
    frames: {
      idle: 'apprentice_idle',
      walk: ['apprentice_walk_1', 'apprentice_walk_2'],
      run: ['apprentice_walk_1', 'apprentice_walk_2'],
      attack: 'apprentice_idle',
      dead: 'apprentice_dead',
      fainted: 'apprentice_fainted',
      frozen: 'apprentice_frozen',
      alert: 'apprentice_idle',
    },
    movementFlags: DEFAULT_FLAGS,
    hp: 60,
    speed: 100,
    dialogueKey: 'apprentice',
    canWander: true,
    wanderRadius: 3,
  },

  merchant: {
    id: 'merchant',
    name: 'Trader Brom',
    type: 'npc',
    atlas: 'characters',
    frames: {
      idle: 'merchant_idle',
      walk: ['merchant_walk_1', 'merchant_walk_2'],
      run: ['merchant_walk_1', 'merchant_walk_2'],
      attack: 'merchant_idle',
      dead: 'merchant_dead',
      fainted: 'merchant_fainted',
      frozen: 'merchant_frozen',
      alert: 'merchant_idle',
    },
    movementFlags: DEFAULT_FLAGS,
    hp: 60,
    speed: 70,
    dialogueKey: 'merchant',
    canWander: true,
    wanderRadius: 2,
  },

  elder: {
    id: 'elder',
    name: 'Elder Theron',
    type: 'npc',
    atlas: 'characters',
    frames: {
      idle: 'elder_idle',
      walk: ['elder_walk_1', 'elder_walk_2'],
      run: ['elder_walk_1', 'elder_walk_2'],
      attack: 'elder_idle',
      dead: 'elder_dead',
      fainted: 'elder_fainted',
      frozen: 'elder_frozen',
      alert: 'elder_idle',
    },
    movementFlags: DEFAULT_FLAGS,
    hp: 80,
    speed: 50,
    dialogueKey: 'elder',
    canWander: false,
  },

  blacksmith: {
    id: 'blacksmith',
    name: 'Blacksmith Gordo',
    type: 'npc',
    atlas: 'characters',
    frames: {
      idle: 'guard_idle',
      walk: ['guard_walk_1', 'guard_walk_2'],
      run: ['guard_walk_1', 'guard_walk_2'],
      attack: 'guard_alert',
      dead: 'guard_dead',
      fainted: 'guard_fainted',
      frozen: 'guard_frozen',
      alert: 'guard_alert',
    },
    movementFlags: DEFAULT_FLAGS,
    hp: 120,
    speed: 60,
    dialogueKey: 'blacksmith',
    canWander: false,
  },

  innkeeper: {
    id: 'innkeeper',
    name: 'Innkeeper Marta',
    type: 'npc',
    atlas: 'characters',
    frames: {
      idle: 'merchant_idle',
      walk: ['merchant_walk_1', 'merchant_walk_2'],
      run: ['merchant_walk_1', 'merchant_walk_2'],
      attack: 'merchant_idle',
      dead: 'merchant_dead',
      fainted: 'merchant_fainted',
      frozen: 'merchant_frozen',
      alert: 'merchant_idle',
    },
    movementFlags: DEFAULT_FLAGS,
    hp: 60,
    speed: 60,
    dialogueKey: 'innkeeper',
    canWander: false,
  },

  villager: {
    id: 'villager',
    name: 'Villager',
    type: 'npc',
    atlas: 'characters',
    frames: {
      idle: 'villager_idle',
      walk: ['villager_walk_1', 'villager_walk_2'],
      run: ['villager_walk_1', 'villager_walk_2'],
      attack: 'villager_idle',
      dead: 'villager_dead',
      fainted: 'villager_fainted',
      frozen: 'villager_frozen',
      alert: 'villager_idle',
    },
    movementFlags: DEFAULT_FLAGS,
    hp: 40,
    speed: 80,
    dialogueKey: 'villager',
    canWander: true,
    wanderRadius: 4,
  },

  child: {
    id: 'child',
    name: 'Child',
    type: 'npc',
    atlas: 'characters',
    frames: {
      idle: 'child_idle',
      walk: ['child_walk_1', 'child_walk_2'],
      run: ['child_walk_1', 'child_walk_2'],
      attack: 'child_idle',
      dead: 'child_dead',
      fainted: 'child_fainted',
      frozen: 'child_frozen',
      alert: 'child_idle',
    },
    movementFlags: DEFAULT_FLAGS,
    hp: 30,
    speed: 120,
    dialogueKey: 'child',
    canWander: true,
    wanderRadius: 5,
    displaySize: 36,  // Children are smaller
  },

  mage: {
    id: 'mage',
    name: 'Court Mage',
    type: 'npc',
    atlas: 'characters',
    frames: {
      idle: 'mage_idle',
      walk: ['mage_walk_1', 'mage_walk_1'],
      run: ['mage_walk_1', 'mage_walk_1'],
      attack: 'mage_idle',
      dead: 'mage_dead',
      fainted: 'mage_fainted',
      frozen: 'mage_frozen',
      alert: 'mage_idle',
    },
    movementFlags: DEFAULT_FLAGS,
    hp: 70,
    speed: 70,
    dialogueKey: 'mage',
    canWander: false,
  },

  math_teacher: {
    id: 'math_teacher',
    name: 'Scholar Vera',
    type: 'npc',
    atlas: 'characters',
    frames: {
      idle: 'mage_idle',
      walk: ['mage_walk_1', 'mage_walk_1'],
      run: ['mage_walk_1', 'mage_walk_1'],
      attack: 'mage_idle',
      dead: 'mage_dead',
      fainted: 'mage_fainted',
      frozen: 'mage_frozen',
      alert: 'mage_idle',
    },
    movementFlags: DEFAULT_FLAGS,
    hp: 70,
    speed: 60,
    dialogueKey: 'math_teacher',
    canWander: false,
  },
};

// ===================== MONSTER DEFINITIONS =====================

export const MONSTER_DEFINITIONS: Record<string, EntityDefinition> = {
  shadow_small: {
    id: 'shadow_small',
    name: 'Shadow Wisp',
    type: 'monster',
    atlas: 'characters',
    frames: {
      idle: 'hero_idle_front',
      walk: ['hero_walk_front_1', 'hero_walk_front_2'],
      run: ['hero_walk_front_1', 'hero_walk_front_2'],
      attack: 'hero_idle_front',
      dead: 'hero_idle_front',
      fainted: 'hero_idle_front',
      frozen: 'hero_idle_front',
      alert: 'hero_idle_front',
    },
    movementFlags: SHADOW_FLAGS,
    hp: 30,
    speed: 60,
    damage: 1,
    isHostile: true,
    sightRange: 5,
    fleeFromLight: true,
    displaySize: 32,
  },

  shadow_large: {
    id: 'shadow_large',
    name: 'Shadow Stalker',
    type: 'monster',
    atlas: 'characters',
    frames: {
      idle: 'guard_idle',
      walk: ['guard_walk_1', 'guard_walk_2'],
      run: ['guard_walk_1', 'guard_walk_2'],
      attack: 'guard_alert',
      dead: 'guard_idle',
      fainted: 'guard_idle',
      frozen: 'guard_idle',
      alert: 'guard_alert',
    },
    movementFlags: SHADOW_FLAGS,
    hp: 60,
    speed: 80,
    damage: 2,
    isHostile: true,
    sightRange: 7,
    fleeFromLight: true,
    displaySize: 48,
  },

  shadow_boss: {
    id: 'shadow_boss',
    name: 'Shadow King',
    type: 'boss',
    atlas: 'characters',
    frames: {
      idle: 'mage_idle',
      walk: ['mage_walk_1', 'mage_walk_1'],
      run: ['mage_walk_1', 'mage_walk_1'],
      attack: 'mage_idle',
      dead: 'mage_idle',
      fainted: 'mage_idle',
      frozen: 'mage_idle',
      alert: 'mage_idle',
    },
    movementFlags: GHOST_FLAGS,
    hp: 200,
    speed: 50,
    damage: 5,
    isHostile: true,
    sightRange: 10,
    fleeFromLight: false,  // Boss doesn't flee!
    displaySize: 64,
    tileWidth: 2,
    tileHeight: 2,
  },

  goblin: {
    id: 'goblin',
    name: 'Goblin Scout',
    type: 'monster',
    atlas: 'characters',
    frames: {
      idle: 'child_idle',
      walk: ['child_walk_1', 'child_walk_2'],
      run: ['child_walk_1', 'child_walk_2'],
      attack: 'child_idle',
      dead: 'child_dead',
      fainted: 'child_fainted',
      frozen: 'child_frozen',
      alert: 'child_idle',
    },
    movementFlags: DEFAULT_FLAGS,
    hp: 25,
    speed: 90,
    damage: 1,
    isHostile: true,
    sightRange: 4,
    displaySize: 36,
  },

  orc: {
    id: 'orc',
    name: 'Orc Warrior',
    type: 'monster',
    atlas: 'characters',
    frames: {
      idle: 'guard_idle',
      walk: ['guard_walk_1', 'guard_walk_2'],
      run: ['guard_walk_1', 'guard_walk_2'],
      attack: 'guard_alert',
      dead: 'guard_dead',
      fainted: 'guard_fainted',
      frozen: 'guard_frozen',
      alert: 'guard_alert',
    },
    movementFlags: DEFAULT_FLAGS,
    hp: 80,
    speed: 70,
    damage: 3,
    isHostile: true,
    sightRange: 5,
    displaySize: 52,
  },

  skeleton: {
    id: 'skeleton',
    name: 'Skeleton',
    type: 'monster',
    atlas: 'characters',
    frames: {
      idle: 'guard_idle',
      walk: ['guard_walk_1', 'guard_walk_2'],
      run: ['guard_walk_1', 'guard_walk_2'],
      attack: 'guard_alert',
      dead: 'guard_dead',
      fainted: 'guard_fainted',
      frozen: 'guard_frozen',
      alert: 'guard_alert',
    },
    movementFlags: DEFAULT_FLAGS,
    hp: 40,
    speed: 65,
    damage: 2,
    isHostile: true,
    sightRange: 4,
    displaySize: 44,
  },

  ghost: {
    id: 'ghost',
    name: 'Wandering Ghost',
    type: 'monster',
    atlas: 'characters',
    frames: {
      idle: 'mage_idle',
      walk: ['mage_walk_1', 'mage_walk_1'],
      run: ['mage_walk_1', 'mage_walk_1'],
      attack: 'mage_idle',
      dead: 'mage_idle',
      fainted: 'mage_idle',
      frozen: 'mage_idle',
      alert: 'mage_idle',
    },
    movementFlags: GHOST_FLAGS,
    hp: 35,
    speed: 55,
    damage: 1,
    isHostile: false,  // Ghosts wander, don't attack
    sightRange: 3,
    fleeFromLight: true,
    displaySize: 44,
  },

  wolf: {
    id: 'wolf',
    name: 'Forest Wolf',
    type: 'monster',
    atlas: 'characters',
    frames: {
      idle: 'child_idle',
      walk: ['child_walk_1', 'child_walk_2'],
      run: ['child_walk_1', 'child_walk_2'],
      attack: 'child_idle',
      dead: 'child_dead',
      fainted: 'child_fainted',
      frozen: 'child_frozen',
      alert: 'child_idle',
    },
    movementFlags: DEFAULT_FLAGS,
    hp: 45,
    speed: 110,
    damage: 2,
    isHostile: true,
    sightRange: 6,
    displaySize: 40,
  },

  slime: {
    id: 'slime',
    name: 'Green Slime',
    type: 'monster',
    atlas: 'characters',
    frames: {
      idle: 'child_idle',
      walk: ['child_walk_1', 'child_walk_2'],
      run: ['child_walk_1', 'child_walk_2'],
      attack: 'child_idle',
      dead: 'child_dead',
      fainted: 'child_fainted',
      frozen: 'child_frozen',
      alert: 'child_idle',
    },
    movementFlags: { ...DEFAULT_FLAGS, canSwim: true },
    hp: 20,
    speed: 40,
    damage: 1,
    isHostile: true,
    sightRange: 3,
    displaySize: 32,
  },
};

// Color tints for monsters (to differentiate from NPCs)
export const MONSTER_TINTS: Record<string, number> = {
  shadow_small: 0x000000,   // Pure black
  shadow_large: 0x111111,   // Very dark
  shadow_boss:  0x220022,   // Dark purple-black
  goblin:       0x44aa44,   // Green tint
  orc:          0x228822,   // Darker green
  skeleton:     0xddddaa,   // Bone white
  ghost:        0xaaaaff,   // Blue-white
  wolf:         0x886644,   // Brown
  slime:        0x44ff44,   // Bright green
};

// Alpha values for monsters
export const MONSTER_ALPHA: Record<string, number> = {
  shadow_small: 0.7,
  shadow_large: 0.8,
  shadow_boss:  0.9,
  ghost:        0.6,
};

export function getEntityDefinition(id: string): EntityDefinition | null {
  return NPC_DEFINITIONS[id] || MONSTER_DEFINITIONS[id] || null;
}
