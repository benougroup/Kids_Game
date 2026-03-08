import brightHollowMap from '../data/maps/bright_hollow.json';
import lightHallMap from '../data/maps/light_hall.json';
import forestEdgeDemoMap from '../data/maps/forest_edge_demo.json';
import shrineDemoMap from '../data/maps/shrine_demo.json';
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

export type TerrainMovementType = 'normal' | 'shallowWater' | 'deepWater' | 'mud' | 'ice' | 'sand' | 'blocked';

export interface TerrainTileMetadata {
  terrainLevel?: number;
  movementType?: TerrainMovementType;
  moveCostMultiplier?: number;
}

export interface NpcInteractionVariant {
  defaultSceneId: string;
  conditions?: {
    timePhase?: Array<'DAY' | 'DUSK' | 'NIGHT' | 'DAWN'>;
    flags?: Record<string, boolean>;
    trustMin?: number;
  };
}

export interface NpcDefinition {
  id: string;
  name: string;
  mapId: string;
  x: number;
  y: number;
  spriteId: string;
  interaction: {
    storyId: string;
    defaultSceneId: string;
    variants?: NpcInteractionVariant[];
  };
  collision?: boolean;
  facing?: 'up' | 'down' | 'left' | 'right';
}

export interface MapObject {
  id: string;
  objectType: 'building' | 'prop' | 'wall' | 'tree' | 'lightPost' | 'pickup' | 'door' | 'npcSpawn';
  assetId: string;
  x: number;
  y: number;
  wTiles: number;
  hTiles: number;
  collision: boolean;
  interaction?: {
    type: 'door' | 'pickup';
    toMapId?: string;
    toX?: number;
    toY?: number;
    itemId?: string;
  };
  renderOffsetPx?: { x: number; y: number };
  zOrder?: number;
  terrainLevel?: number;
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
  tilePalette: Record<string, { name: string; color: string; spriteId?: string }>;
  terrainMetaByTileId?: Record<string, TerrainTileMetadata>;
  tileDefs?: Record<string, { baseLight?: 'BRIGHT' | 'DIM' | 'DARK' }>;
  safeZones?: Array<{ id: string; x: number; y: number; radius: number }>;
  embeddedLightSources?: Array<Omit<LightSourceRuntime, 'falloff'> & { falloff?: 'hard' | 'gradient' }>;
  shadowSpawn?: ShadowSpawnConfig;
  npcs?: NpcDefinition[];
  objects?: MapObject[];
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
  [forestEdgeDemoMap.id]: forestEdgeDemoMap as TileMap,
  [shrineDemoMap.id]: shrineDemoMap as TileMap,
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
    const map = this.getMap(mapId);
    const hasObjectCollision = (map.objects ?? []).some((obj) => {
      if (!obj.collision) return false;
      return x >= obj.x && y >= obj.y && x < obj.x + obj.wTiles && y < obj.y + obj.hTiles;
    });
    if (hasObjectCollision) return true;

    const terrain = this.getTerrainAt(mapId, x, y);
    if (terrain.terrainLevel <= -1) {
      return true;
    }
    return this.getTileId(mapId, 'collision', x, y) === 1;
  }

  getTerrainAt(mapId: string, x: number, y: number): Required<TerrainTileMetadata> {
    const tileId = this.getTileId(mapId, 'ground', x, y);
    const map = this.getMap(mapId);
    const meta = map.terrainMetaByTileId?.[String(tileId)] ?? {};
    const terrainLevel = meta.terrainLevel ?? 0;
    const movementType = meta.movementType ?? (terrainLevel <= -1 ? 'blocked' : terrainLevel < 0 ? 'shallowWater' : 'normal');
    return {
      terrainLevel,
      movementType,
      moveCostMultiplier: meta.moveCostMultiplier ?? 1,
    };
  }

  findNearbyNpc(state: Readonly<GameState>): NpcDefinition | undefined {
    const map = this.getCurrentMap(state);
    const npcs = map.npcs ?? [];
    const player = state.runtime.player;
    const facing = player.facing;

    const candidates = npcs
      .map((npc) => {
        const distance = Math.abs(npc.x - player.x) + Math.abs(npc.y - player.y);
        const inFront =
          (facing === 'up' && npc.x === player.x && npc.y === player.y - 1)
          || (facing === 'down' && npc.x === player.x && npc.y === player.y + 1)
          || (facing === 'left' && npc.x === player.x - 1 && npc.y === player.y)
          || (facing === 'right' && npc.x === player.x + 1 && npc.y === player.y);
        return { npc, distance, inFront };
      })
      .filter((entry) => entry.distance <= 1)
      .sort((a, b) => Number(b.inFront) - Number(a.inFront) || a.distance - b.distance);

    return candidates[0]?.npc;
  }

  resolveNpcSceneId(state: Readonly<GameState>, npc: NpcDefinition): { storyId: string; sceneId: string } {
    const interaction = npc.interaction;
    for (const variant of interaction.variants ?? []) {
      const c = variant.conditions;
      if (!c) return { storyId: interaction.storyId, sceneId: variant.defaultSceneId };
      if (c.timePhase && !c.timePhase.includes(state.runtime.time.phase)) continue;
      if (c.flags) {
        const flagsOk = Object.entries(c.flags).every(([k, v]) => Boolean(state.story.flags[k]) === v);
        if (!flagsOk) continue;
      }
      if (typeof c.trustMin === 'number') {
        const trust = state.story.npc.trust[npc.id] ?? 0;
        if (trust < c.trustMin) continue;
      }
      return { storyId: interaction.storyId, sceneId: variant.defaultSceneId };
    }
    return { storyId: interaction.storyId, sceneId: interaction.defaultSceneId };
  }

  getObjects(mapId: string): MapObject[] {
    return this.getMap(mapId).objects ?? [];
  }


  findInteractableNear(state: Readonly<GameState>): Interactable | undefined {
    const map = this.getCurrentMap(state);
    const player = state.runtime.player;
    return map.interactables.find((i) => Math.abs(i.x - player.x) + Math.abs(i.y - player.y) <= 1);
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
