/**
 * Entity Registry
 * Defines all NPC and monster types with their properties,
 * movement flags, and sprite information.
 * 
 * All frame names verified against actual atlas JSON files.
 * characters.json frames: hero_idle, hero_walk_1/2/3, hero_side_1, hero_walk_back_1/2,
 *   hero_lantern, hero_lantern_idle, hero_lantern_walk_1/2/3,
 *   guard_idle, guard_walk_1/2/3, guard_side_1/2, guard_back_1/2,
 *   apprentice_idle, apprentice_walk_1/2, apprentice_side_1, apprentice_back_1,
 *   scholar_idle, scholar_walk_1/2, scholar_side_1,
 *   merchant_idle, merchant_walk_1/2, merchant_side_1,
 *   elder_idle, elder_walk_1/2, elder_side_1,
 *   child_idle, child_walk_1/2, child_side_1
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

// ===================== VISUAL TINTS =====================
// Tint colors for different monster types (applied to sprites)
export const MONSTER_TINTS: Record<string, number> = {
  shadow_small: 0x000000,
  shadow_stalker: 0x000033,
  shadow_boss: 0x110011,
  goblin: 0x44aa44,
  wolf: 0x886644,
  skeleton: 0xddddcc,
  ghost: 0xaaddff,
  slime: 0x44ff88,
};

// Alpha values for different monster types
export const MONSTER_ALPHA: Record<string, number> = {
  shadow_small: 0.75,
  shadow_stalker: 0.80,
  shadow_boss: 0.90,
  goblin: 1.0,
  wolf: 1.0,
  skeleton: 1.0,
  ghost: 0.65,
  slime: 0.85,
};

// ===================== NPC DEFINITIONS =====================

export const NPC_DEFINITIONS: Record<string, EntityDefinition> = {
  guard: {
    id: 'guard',
    name: 'Guard Aldric',
    type: 'npc',
    atlas: 'characters',
    frames: {
      idle: 'guard_idle',
      walk: ['guard_walk_1', 'guard_walk_2', 'guard_walk_3'],
      run: ['guard_walk_1', 'guard_walk_2', 'guard_walk_3'],
      attack: 'guard_idle',
      dead: 'guard_idle',       // Fallback - no dead frame yet
      fainted: 'guard_idle',    // Fallback
      frozen: 'guard_idle',     // Fallback
      alert: 'guard_side_1',
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
      walk: ['guard_walk_1', 'guard_walk_2', 'guard_walk_3'],
      run: ['guard_walk_1', 'guard_walk_2', 'guard_walk_3'],
      attack: 'guard_idle',
      dead: 'guard_idle',
      fainted: 'guard_idle',
      frozen: 'guard_idle',
      alert: 'guard_side_2',
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
      dead: 'apprentice_idle',
      fainted: 'apprentice_idle',
      frozen: 'apprentice_idle',
      alert: 'apprentice_side_1',
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
      dead: 'merchant_idle',
      fainted: 'merchant_idle',
      frozen: 'merchant_idle',
      alert: 'merchant_side_1',
    },
    movementFlags: DEFAULT_FLAGS,
    hp: 60,
    speed: 60,
    dialogueKey: 'merchant',
    canWander: false,
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
      dead: 'elder_idle',
      fainted: 'elder_idle',
      frozen: 'elder_idle',
      alert: 'elder_side_1',
    },
    movementFlags: DEFAULT_FLAGS,
    hp: 40,
    speed: 50,
    dialogueKey: 'elder',
    canWander: false,
  },

  scholar: {
    id: 'scholar',
    name: 'Scholar Vera',
    type: 'npc',
    atlas: 'characters',
    frames: {
      idle: 'scholar_idle',
      walk: ['scholar_walk_1', 'scholar_walk_2'],
      run: ['scholar_walk_1', 'scholar_walk_2'],
      attack: 'scholar_idle',
      dead: 'scholar_idle',
      fainted: 'scholar_idle',
      frozen: 'scholar_idle',
      alert: 'scholar_side_1',
    },
    movementFlags: DEFAULT_FLAGS,
    hp: 50,
    speed: 60,
    dialogueKey: 'scholar',
    canWander: false,
    mathDifficulty: 1,
  },

  child: {
    id: 'child',
    name: 'Young Pip',
    type: 'npc',
    atlas: 'characters',
    frames: {
      idle: 'child_idle',
      walk: ['child_walk_1', 'child_walk_2'],
      run: ['child_walk_1', 'child_walk_2'],
      attack: 'child_idle',
      dead: 'child_idle',
      fainted: 'child_idle',
      frozen: 'child_idle',
      alert: 'child_side_1',
    },
    movementFlags: DEFAULT_FLAGS,
    hp: 30,
    speed: 120,
    dialogueKey: 'child',
    canWander: true,
    wanderRadius: 4,
  },

  blacksmith: {
    id: 'blacksmith',
    name: 'Blacksmith Gorrin',
    type: 'npc',
    atlas: 'characters',
    frames: {
      idle: 'guard_idle',       // Use guard as placeholder
      walk: ['guard_walk_1', 'guard_walk_2'],
      run: ['guard_walk_1', 'guard_walk_2'],
      attack: 'guard_idle',
      dead: 'guard_idle',
      fainted: 'guard_idle',
      frozen: 'guard_idle',
      alert: 'guard_side_1',
    },
    movementFlags: DEFAULT_FLAGS,
    hp: 80,
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
      idle: 'merchant_idle',    // Use merchant as placeholder
      walk: ['merchant_walk_1', 'merchant_walk_2'],
      run: ['merchant_walk_1', 'merchant_walk_2'],
      attack: 'merchant_idle',
      dead: 'merchant_idle',
      fainted: 'merchant_idle',
      frozen: 'merchant_idle',
      alert: 'merchant_side_1',
    },
    movementFlags: DEFAULT_FLAGS,
    hp: 60,
    speed: 60,
    dialogueKey: 'innkeeper',
    canWander: false,
  },

  ranger: {
    id: 'ranger',
    name: 'Ranger Sylva',
    type: 'npc',
    atlas: 'characters',
    frames: {
      idle: 'apprentice_idle',
      walk: ['apprentice_walk_1', 'apprentice_walk_2'],
      run: ['apprentice_walk_1', 'apprentice_walk_2'],
      attack: 'apprentice_side_1',
      dead: 'apprentice_idle',
      fainted: 'apprentice_idle',
      frozen: 'apprentice_idle',
      alert: 'apprentice_side_1',
    },
    movementFlags: DEFAULT_FLAGS,
    hp: 80,
    speed: 100,
    dialogueKey: 'ranger',
    canWander: true,
    wanderRadius: 3,
  },

  hermit: {
    id: 'hermit',
    name: 'Old Hermit',
    type: 'npc',
    atlas: 'characters',
    frames: {
      idle: 'elder_idle',
      walk: ['elder_walk_1', 'elder_walk_2'],
      run: ['elder_walk_1', 'elder_walk_2'],
      attack: 'elder_idle',
      dead: 'elder_idle',
      fainted: 'elder_idle',
      frozen: 'elder_idle',
      alert: 'elder_side_1',
    },
    movementFlags: DEFAULT_FLAGS,
    hp: 30,
    speed: 40,
    dialogueKey: 'hermit',
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
      idle: 'hero_idle',        // Will be tinted black
      walk: ['hero_walk_1', 'hero_walk_2'],
      run: ['hero_walk_1', 'hero_walk_2'],
      attack: 'hero_idle',
      dead: 'hero_idle',
      fainted: 'hero_idle',
      frozen: 'hero_idle',
      alert: 'hero_side_1',
    },
    movementFlags: SHADOW_FLAGS,
    hp: 30,
    speed: 60,
    damage: 1,
    isHostile: false,
    sightRange: 5,
    fleeFromLight: true,
    displaySize: 32,            // Smaller than player (1 tile)
  },

  shadow_stalker: {
    id: 'shadow_stalker',
    name: 'Shadow Stalker',
    type: 'monster',
    atlas: 'characters',
    frames: {
      idle: 'hero_idle',
      walk: ['hero_walk_1', 'hero_walk_2', 'hero_walk_3'],
      run: ['hero_walk_1', 'hero_walk_2', 'hero_walk_3'],
      attack: 'hero_side_1',
      dead: 'hero_idle',
      fainted: 'hero_idle',
      frozen: 'hero_idle',
      alert: 'hero_side_1',
    },
    movementFlags: SHADOW_FLAGS,
    hp: 60,
    speed: 90,
    damage: 2,
    isHostile: true,
    sightRange: 6,
    fleeFromLight: true,
    displaySize: 40,
  },

  shadow_boss: {
    id: 'shadow_boss',
    name: 'Shadow Lord',
    type: 'boss',
    atlas: 'characters',
    frames: {
      idle: 'hero_idle',
      walk: ['hero_walk_1', 'hero_walk_2', 'hero_walk_3'],
      run: ['hero_walk_1', 'hero_walk_2', 'hero_walk_3'],
      attack: 'hero_side_1',
      dead: 'hero_idle',
      fainted: 'hero_idle',
      frozen: 'hero_idle',
      alert: 'hero_side_1',
    },
    movementFlags: SHADOW_FLAGS,
    hp: 200,
    speed: 70,
    damage: 5,
    isHostile: true,
    sightRange: 8,
    fleeFromLight: false,       // Boss doesn't flee!
    displaySize: 56,
  },

  goblin: {
    id: 'goblin',
    name: 'Forest Goblin',
    type: 'monster',
    atlas: 'characters',
    frames: {
      idle: 'child_idle',       // Child sprite as goblin placeholder
      walk: ['child_walk_1', 'child_walk_2'],
      run: ['child_walk_1', 'child_walk_2'],
      attack: 'child_side_1',
      dead: 'child_idle',
      fainted: 'child_idle',
      frozen: 'child_idle',
      alert: 'child_side_1',
    },
    movementFlags: DEFAULT_FLAGS,
    hp: 40,
    speed: 80,
    damage: 1,
    isHostile: true,
    sightRange: 4,
    displaySize: 36,
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
      attack: 'child_side_1',
      dead: 'child_idle',
      fainted: 'child_idle',
      frozen: 'child_idle',
      alert: 'child_side_1',
    },
    movementFlags: DEFAULT_FLAGS,
    hp: 50,
    speed: 110,
    damage: 2,
    isHostile: true,
    sightRange: 5,
    displaySize: 40,
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
      attack: 'guard_side_1',
      dead: 'guard_idle',
      fainted: 'guard_idle',
      frozen: 'guard_idle',
      alert: 'guard_side_1',
    },
    movementFlags: DEFAULT_FLAGS,
    hp: 45,
    speed: 65,
    damage: 2,
    isHostile: true,
    sightRange: 5,
    displaySize: 44,
  },

  ghost: {
    id: 'ghost',
    name: 'Restless Ghost',
    type: 'monster',
    atlas: 'characters',
    frames: {
      idle: 'apprentice_idle',
      walk: ['apprentice_walk_1', 'apprentice_walk_2'],
      run: ['apprentice_walk_1', 'apprentice_walk_2'],
      attack: 'apprentice_side_1',
      dead: 'apprentice_idle',
      fainted: 'apprentice_idle',
      frozen: 'apprentice_idle',
      alert: 'apprentice_side_1',
    },
    movementFlags: GHOST_FLAGS,
    hp: 35,
    speed: 70,
    damage: 1,
    isHostile: false,
    sightRange: 4,
    displaySize: 40,
  },

  slime: {
    id: 'slime',
    name: 'Slime',
    type: 'monster',
    atlas: 'characters',
    frames: {
      idle: 'child_idle',
      walk: ['child_walk_1', 'child_walk_2'],
      run: ['child_walk_1', 'child_walk_2'],
      attack: 'child_idle',
      dead: 'child_idle',
      fainted: 'child_idle',
      frozen: 'child_idle',
      alert: 'child_idle',
    },
    movementFlags: { ...DEFAULT_FLAGS, canSwim: true },
    hp: 25,
    speed: 40,
    damage: 1,
    isHostile: false,
    sightRange: 3,
    displaySize: 32,
  },
};
