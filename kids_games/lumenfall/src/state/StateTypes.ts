import type { Mode } from '../app/ModeMachine';

interface MapTransition {
  toMapId: string;
  toX: number;
  toY: number;
  phase: 'fadeOut' | 'swap' | 'fadeIn';
  t: number;
}

export interface GameState {
  saveVersion: number;
  global: {
    player: {
      maxHP: number;
      maxSP: number;
      permanentTools: Record<string, boolean>;
      upgrades: Record<string, number>;
    };
    inventory: Record<string, number>;
  };
  story: {
    activeStoryId: string;
    stage: Record<string, string>;
    flags: Record<string, boolean>;
    npc: {
      townFear: number;
      trust: Record<string, number>;
    };
    storyInventory: Record<string, number>;
    storyShadow: {
      byId: Record<string, unknown>;
    };
  };
  runtime: {
    mode: Mode;
    time: {
      phase: string;
      secondsIntoCycle: number;
      dayCount: number;
      paused: boolean;
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
      status: Record<string, boolean>;
    };
    ui: {
      messages: string[];
    };
    checkpoint: {
      lastCheckpointId: string | null;
      snapshot: unknown;
      dirty: boolean;
    };
    save: {
      dirty: boolean;
    };
  };
}

export const createInitialState = (): GameState => ({
  saveVersion: 1,
  global: {
    player: {
      maxHP: 6,
      maxSP: 4,
      permanentTools: {},
      upgrades: {},
    },
    inventory: {},
  },
  story: {
    activeStoryId: 'story01',
    stage: {},
    flags: {},
    npc: {
      townFear: 0,
      trust: {},
    },
    storyInventory: {},
    storyShadow: {
      byId: {},
    },
  },
  runtime: {
    mode: 'EXPLORE',
    time: {
      phase: 'day',
      secondsIntoCycle: 0,
      dayCount: 1,
      paused: false,
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
    checkpoint: {
      lastCheckpointId: null,
      snapshot: null,
      dirty: false,
    },
    save: {
      dirty: false,
    },
  },
});
