import type { Mode } from '../app/ModeMachine';

export type LightLevel = 'BRIGHT' | 'DIM' | 'DARK';

export interface LightSourceRuntime {
  id: string;
  type: 'post' | 'lighthouse' | 'shrine' | 'player' | 'temp';
  x: number;
  y: number;
  radius: number;
  intensity: Extract<LightLevel, 'BRIGHT' | 'DIM'>;
  active: boolean;
  falloff: 'hard' | 'gradient';
  expiresAtSeconds?: number;
}

interface MapTransition {
  toMapId: string;
  toX: number;
  toY: number;
  phase: 'fadeOut' | 'swap' | 'fadeIn';
  t: number;
}

export interface InventoryState {
  items: Record<string, { qty: number }>;
  nonStack: Record<string, boolean>;
}

export type SnapshotFacing = 'N' | 'S' | 'E' | 'W';

export interface CheckpointSnapshot {
  checkpointId: string;
  mapId: string;
  player: {
    x: number;
    y: number;
    facing: SnapshotFacing;
    hp: number;
    sp: number;
  };
  story: {
    activeStoryId: string;
    flags: Record<string, boolean>;
    stage: Record<string, string>;
    npc: {
      townFear: number;
      trust: Record<string, number>;
      npcFlags: Record<string, unknown>;
    };
    storyInventory: InventoryState;
    storyShadowById: Record<string, unknown>;
  };
  time: {
    phase: string;
    secondsIntoCycle: number;
    dayCount: number;
  };
  createdAtMs: number;
}

export type DialogueRuntimeState = {
  active: boolean;
  storyId: string;
  sceneId: string;
  returnMode: 'EXPLORE';
  visitCount: number;
  visited: Record<string, number>;
  lastError?: string;
};

export interface GameState {
  saveVersion: number;
  global: {
    player: {
      maxHP: number;
      maxSP: number;
      permanentTools: Record<string, boolean>;
      upgrades: Record<string, number>;
    };
    inventory: InventoryState;
  };
  story: {
    activeStoryId: string;
    stage: Record<string, string>;
    flags: Record<string, boolean>;
    npc: {
      townFear: number;
      trust: Record<string, number>;
    };
    storyInventory: InventoryState;
    storyShadow: {
      byId: Record<string, unknown>;
    };
  };
  runtime: {
    mode: Mode;
    time: {
      phase: 'DAY' | 'DUSK' | 'NIGHT' | 'DAWN';
      secondsIntoCycle: number;
      dayCount: number;
      lastTickAtSeconds: number;
      paused: boolean;
    };
    light: {
      ambient: number;
      sources: Record<string, LightSourceRuntime>;
      dirty: boolean;
      chunkSize: number;
    };
    map: {
      currentMapId: string;
      transition?: MapTransition;
      mapsVisited: Record<string, { lastX: number; lastY: number }>;
    };
    mapTriggerFlags: Record<string, Record<string, boolean>>;
    player: {
      x: number;
      y: number;
      px: number;
      py: number;
      facing: 'up' | 'down' | 'left' | 'right';
      hp: number;
      sp: number;
      status: Record<string, number | boolean>;
    };
    ui: {
      messages: string[];
    };
    dialogue: DialogueRuntimeState;
    inventoryUI: {
      open: boolean;
      category: 'all' | 'potions' | 'ingredients' | 'tools' | 'storyKeys';
      selectedItemId?: string;
    };
    crafting: {
      open: boolean;
      mixingTableId?: string;
      slotA?: string;
      slotB?: string;
      lastResult?: { ok: boolean; text: string };
    };
    checkpoint: {
      lastCheckpointId: string | null;
      snapshot: CheckpointSnapshot | null;
      dirty: boolean;
    };
    fainting?: {
      active: boolean;
      phase: 'fadeOut' | 'restore' | 'fadeIn';
      t: number;
      restoreDone?: boolean;
    };
    save: {
      dirty: boolean;
      blockedByFaint: boolean;
    };
  };
}

export const createEmptyInventory = (): InventoryState => ({ items: {}, nonStack: {} });

export const createInitialState = (): GameState => ({
  saveVersion: 1,
  global: {
    player: {
      maxHP: 6,
      maxSP: 4,
      permanentTools: {},
      upgrades: {},
    },
    inventory: createEmptyInventory(),
  },
  story: {
    activeStoryId: 'story01',
    stage: {},
    flags: {},
    npc: {
      townFear: 0,
      trust: {},
    },
    storyInventory: createEmptyInventory(),
    storyShadow: {
      byId: {},
    },
  },
  runtime: {
    mode: 'EXPLORE',
    time: {
      phase: 'DAY',
      secondsIntoCycle: 0,
      dayCount: 1,
      lastTickAtSeconds: 0,
      paused: false,
    },
    light: {
      ambient: 1,
      sources: {},
      dirty: true,
      chunkSize: 16,
    },
    map: {
      currentMapId: 'bright_hollow',
      mapsVisited: {
        bright_hollow: { lastX: 14, lastY: 10 },
      },
    },
    mapTriggerFlags: {},
    player: {
      x: 14,
      y: 10,
      px: 14 * 32,
      py: 10 * 32,
      facing: 'down',
      hp: 6,
      sp: 4,
      status: {},
    },
    ui: {
      messages: [],
    },
    dialogue: {
      active: false,
      storyId: '',
      sceneId: '',
      returnMode: 'EXPLORE',
      visitCount: 0,
      visited: {},
    },
    inventoryUI: {
      open: false,
      category: 'all',
    },
    crafting: {
      open: false,
    },
    checkpoint: {
      lastCheckpointId: null,
      snapshot: null,
      dirty: false,
    },
    save: {
      dirty: false,
      blockedByFaint: false,
    },
  },
});
