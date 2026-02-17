import brightHollowMap from '../data/maps/bright_hollow.json';
import lightHallMap from '../data/maps/light_hall.json';
import { TILE_SIZE } from '../app/Config';
import type { GameState, LightSourceRuntime } from '../state/StateTypes';

export type LayerName = 'ground' | 'decor' | 'collision' | 'overlay';

export interface MapTriggerAction {
  type: 'ui.message' | 'checkpoint.set' | 'checkpoint.snapshot' | 'map.transition' | 'startScene';
  text?: string;
  checkpointId?: string;
  toMapId?: string;
  toX?: number;
  toY?: number;
  storyId?: string;
  sceneId?: string;
}

export interface MapTrigger {
  id: string;
  type: 'onStep' | 'onEnterArea' | 'onInteract';
  x?: number;
  y?: number;
  area?: { x: number; y: number; w: number; h: number };
  once?: boolean;
  cooldownMs?: number;
  actions: MapTriggerAction[];
}

export interface Interactable {
  id: string;
  type: 'door' | 'mixingTable';
  x: number;
  y: number;
  toMapId?: string;
  toX?: number;
  toY?: number;
}

export interface ShadowSpawnZoneRect {
  id: string;
  shape: 'rect';
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ShadowSpawnConfig {
  zones: ShadowSpawnZoneRect[];
  clusterSizeMin: number;
  clusterSizeMax: number;
  maxActive: number;
}

export interface TileMap {
  id: string;
  name: string;
  tileSize: number;
  width: number;
  height: number;
  layers: Record<LayerName, number[]>;
  tilePalette: Record<string, { name: string; color: string }>;
  tileDefs?: Record<string, { baseLight?: 'BRIGHT' | 'DIM' | 'DARK' }>;
  safeZones?: Array<{ id: string; x: number; y: number; radius: number }>;
  embeddedLightSources?: Array<Omit<LightSourceRuntime, 'falloff'> & { falloff?: 'hard' | 'gradient' }>;
  shadowSpawn?: ShadowSpawnConfig;
  interactables: Interactable[];
  triggers: MapTrigger[];
}

export interface TransitionState {
  toMapId: string;
  toX: number;
  toY: number;
  phase: 'fadeOut' | 'swap' | 'fadeIn';
  t: number;
}

const maps: Record<string, TileMap> = {
  [brightHollowMap.id]: brightHollowMap as TileMap,
  [lightHallMap.id]: lightHallMap as TileMap,
};

export const MAP_TRANSITION_MS = 200;

export class MapSystem {
  getMap(mapId: string): TileMap {
    const map = maps[mapId];
    if (!map) {
      throw new Error(`Unknown map id: ${mapId}`);
    }
    return map;
  }

  getCurrentMap(state: Readonly<GameState>): TileMap {
    return this.getMap(state.runtime.map.currentMapId);
  }

  inBounds(mapId: string, x: number, y: number): boolean {
    const map = this.getMap(mapId);
    return x >= 0 && y >= 0 && x < map.width && y < map.height;
  }

  getTileId(mapId: string, layerName: LayerName, x: number, y: number): number {
    const map = this.getMap(mapId);
    if (!this.inBounds(mapId, x, y)) {
      return 0;
    }
    return map.layers[layerName][y * map.width + x] ?? 0;
  }

  isBlocked(mapId: string, x: number, y: number): boolean {
    if (!this.inBounds(mapId, x, y)) {
      return true;
    }
    return this.getTileId(mapId, 'collision', x, y) === 1;
  }

  findInteractableAt(mapId: string, x: number, y: number): Interactable | undefined {
    return this.getMap(mapId).interactables.find((i) => i.x === x && i.y === y);
  }

  getTriggers(mapId: string): MapTrigger[] {
    return this.getMap(mapId).triggers;
  }

  getSafeZones(mapId: string): Array<{ id: string; x: number; y: number; radius: number }> {
    return this.getMap(mapId).safeZones ?? [];
  }

  getShadowSpawnConfig(mapId: string): ShadowSpawnConfig | undefined {
    return this.getMap(mapId).shadowSpawn;
  }

  getEmbeddedLightSources(mapId: string): LightSourceRuntime[] {
    return (this.getMap(mapId).embeddedLightSources ?? []).map((source) => ({
      ...source,
      falloff: source.falloff ?? 'hard',
    }));
  }

  hasTriggerFired(state: Readonly<GameState>, mapId: string, triggerId: string): boolean {
    return Boolean(state.runtime.mapTriggerFlags[mapId]?.[triggerId]);
  }

  markTriggerFired(state: GameState, mapId: string, triggerId: string): void {
    state.runtime.mapTriggerFlags[mapId] = state.runtime.mapTriggerFlags[mapId] ?? {};
    state.runtime.mapTriggerFlags[mapId][triggerId] = true;
  }
}

export const advanceMapTransition = (
  transition: TransitionState,
  dtMs: number,
): { transition: TransitionState | null; shouldSwap: boolean } => {
  const step = dtMs / MAP_TRANSITION_MS;

  if (transition.phase === 'fadeOut') {
    const t = Math.min(1, transition.t + step);
    if (t >= 1) {
      return {
        transition: { ...transition, phase: 'swap', t: 1 },
        shouldSwap: true,
      };
    }
    return { transition: { ...transition, t }, shouldSwap: false };
  }

  if (transition.phase === 'swap') {
    return {
      transition: { ...transition, phase: 'fadeIn', t: 1 },
      shouldSwap: false,
    };
  }

  const t = Math.max(0, transition.t - step);
  if (t <= 0) {
    return { transition: null, shouldSwap: false };
  }

  return { transition: { ...transition, t }, shouldSwap: false };
};


export const applyTransitionSwap = (state: GameState, transition: TransitionState): void => {
  state.runtime.map.currentMapId = transition.toMapId;
  state.runtime.player.x = transition.toX;
  state.runtime.player.y = transition.toY;
  state.runtime.player.px = tileToPixel(transition.toX);
  state.runtime.player.py = tileToPixel(transition.toY);
  state.runtime.map.mapsVisited[transition.toMapId] = { lastX: transition.toX, lastY: transition.toY };
};

export const getTransitionOverlayAlpha = (transition?: TransitionState): number => {
  if (!transition) return 0;
  if (transition.phase === 'fadeOut') return transition.t;
  if (transition.phase === 'swap') return 1;
  return transition.t;
};

export const tileToPixel = (tile: number): number => tile * TILE_SIZE;
