import type { EventBus } from '../app/EventBus';
import type { DraftTx } from '../state/StateStore';
import type { GameState, LightLevel, LightSourceRuntime } from '../state/StateTypes';
import type { TimePhase } from './TimeSystem';
import { MapSystem } from './MapSystem';
import timeConfig from '../data/timeConfig.json';

const LIGHT_NUMERIC: Record<LightLevel, 0 | 1 | 2> = {
  DARK: 0,
  DIM: 1,
  BRIGHT: 2,
};

const NUMERIC_TO_LEVEL: Record<number, LightLevel> = {
  0: 'DARK',
  1: 'DIM',
  2: 'BRIGHT',
};

const PHASE_SHIFT: Record<TimePhase, number> = {
  DAY: 1,
  DUSK: 0,
  NIGHT: -1,
  DAWN: 0,
};

interface ChunkCacheEntry {
  values: Uint8Array;
}

interface LightSystemDeps {
  mapSystem: MapSystem;
  bus: EventBus;
}

const clampLight = (value: number): 0 | 1 | 2 => Math.max(0, Math.min(2, Math.round(value))) as 0 | 1 | 2;

export class LightSystem {
  private readonly chunkSize = 16;
  private ambientVersion = 0;
  private sourcesVersion = 0;
  private staticSources: Record<string, LightSourceRuntime> = {};
  private tempSources: Record<string, LightSourceRuntime> = {};
  private chunkCache = new Map<string, ChunkCacheEntry>();
  private mapChunkSourceIds = new Map<string, string[]>();
  private currentMapId = '';
  private recomputeCount = 0;
  private readonly totalCycleSeconds =
    timeConfig.cycle.daySeconds + timeConfig.cycle.duskSeconds + timeConfig.cycle.nightSeconds + timeConfig.cycle.dawnSeconds;

  constructor(private readonly deps: LightSystemDeps) {}

  initialize(state: Readonly<GameState>, tx: DraftTx): void {
    this.syncAmbient(state.runtime.time.phase, tx);
    this.loadMapSources(state.runtime.map.currentMapId, tx);
  }

  update(tx: DraftTx): void {
    const state = tx.draftState;

    if (state.runtime.map.currentMapId !== this.currentMapId) {
      this.loadMapSources(state.runtime.map.currentMapId, tx);
    }

    const expired: string[] = [];
    const absoluteSeconds = this.getAbsoluteSeconds(state);
    for (const source of Object.values(this.tempSources)) {
      if (source.expiresAtSeconds !== undefined && absoluteSeconds >= source.expiresAtSeconds) {
        expired.push(source.id);
      }
    }

    if (expired.length > 0) {
      for (const id of expired) {
        delete this.tempSources[id];
      }
      this.markSourcesDirty(tx);
    }

    const nextPlayerSource = this.buildPlayerLanternSource(state);
    const currentPlayerSource = state.runtime.light.sources.player_lantern;
    if (!currentPlayerSource || currentPlayerSource.x !== nextPlayerSource.x || currentPlayerSource.y !== nextPlayerSource.y || currentPlayerSource.radius !== nextPlayerSource.radius) {
      tx.touchRuntimeLight();
      state.runtime.light.sources.player_lantern = nextPlayerSource;
    }

    if (state.runtime.light.dirty) {
      tx.touchRuntimeLight();
      state.runtime.light.dirty = false;
    }
  }

  onTimePhaseChanged(phase: TimePhase, tx: DraftTx): void {
    this.syncAmbient(phase, tx);
  }

  getTileLightLevel(state: Readonly<GameState>, x: number, y: number): LightLevel {
    return NUMERIC_TO_LEVEL[this.getTileLightNumeric(state, x, y)];
  }

  getTileLightNumeric(state: Readonly<GameState>, x: number, y: number): 0 | 1 | 2 {
    const mapId = state.runtime.map.currentMapId;
    const base = this.getBaseLightNumeric(mapId, x, y);
    let numeric = clampLight(base + state.runtime.light.ambient);
    numeric = clampLight(Math.max(numeric, this.getStaticSourceContribution(mapId, x, y)));
    numeric = clampLight(Math.max(numeric, this.getDynamicContribution(state, x, y)));

    return clampLight(numeric);
  }

  getLightSourcesInRange(state: Readonly<GameState>, x: number, y: number, radius: number): LightSourceRuntime[] {
    const allSources = [
      ...Object.values(this.staticSources),
      ...Object.values(this.tempSources),
      this.buildPlayerLanternSource(state),
    ];
    const radiusSq = radius * radius;
    return allSources.filter((source) => {
      const dx = source.x - x;
      const dy = source.y - y;
      return dx * dx + dy * dy <= radiusSq;
    });
  }

  isInSafeZone(state: Readonly<GameState>, x: number, y: number): boolean {
    const zones = this.deps.mapSystem.getSafeZones(state.runtime.map.currentMapId);
    return zones.some((zone) => {
      const dx = x - zone.x;
      const dy = y - zone.y;
      return dx * dx + dy * dy <= zone.radius * zone.radius;
    });
  }

  applyTemporaryLightEffect(
    tx: DraftTx,
    effectId: string,
    x: number,
    y: number,
    radius: number,
    intensity: 'BRIGHT' | 'DIM',
    durationMs: number,
  ): void {
    const absoluteSeconds = this.getAbsoluteSeconds(tx.draftState);
    this.tempSources[effectId] = {
      id: effectId,
      type: 'temp',
      x,
      y,
      radius,
      intensity,
      active: true,
      falloff: 'hard',
      expiresAtSeconds: absoluteSeconds + durationMs / 1000,
    };
    this.markSourcesDirty(tx);
  }

  setDebugPlayerLantern(state: GameState): void {
    state.runtime.light.sources.player_lantern = this.buildPlayerLanternSource(state);
  }

  getDebugRecomputeCount(): number {
    return this.recomputeCount;
  }

  private syncAmbient(phase: TimePhase, tx: DraftTx): void {
    const ambientShift = PHASE_SHIFT[phase];
    tx.touchRuntimeLight();
    if (tx.draftState.runtime.light.ambient !== ambientShift) {
      tx.draftState.runtime.light.ambient = ambientShift;
      tx.draftState.runtime.light.dirty = true;
      this.ambientVersion += 1;
      this.deps.bus.emit({ type: 'LIGHT_AMBIENT_CHANGED', phase, ambientShift });
    }
  }

  private loadMapSources(mapId: string, tx: DraftTx): void {
    this.currentMapId = mapId;
    this.staticSources = {};
    for (const source of this.deps.mapSystem.getEmbeddedLightSources(mapId)) {
      this.staticSources[source.id] = { ...source, falloff: source.falloff ?? 'hard' };
    }
    this.rebuildChunkSourceIndex(mapId);
    this.markSourcesDirty(tx);
  }

  private markSourcesDirty(tx: DraftTx): void {
    tx.touchRuntimeLight();
    this.sourcesVersion += 1;
    this.chunkCache.clear();
    tx.draftState.runtime.light.dirty = true;
    tx.draftState.runtime.light.chunkSize = this.chunkSize;
    tx.draftState.runtime.light.sources = {
      ...this.staticSources,
      ...this.tempSources,
      player_lantern: this.buildPlayerLanternSource(tx.draftState),
    };
    this.deps.bus.emit({ type: 'LIGHT_SOURCES_CHANGED' });
  }

  private rebuildChunkSourceIndex(mapId: string): void {
    this.mapChunkSourceIds.clear();
    for (const source of Object.values(this.staticSources)) {
      if (!source.active) continue;
      const minCx = Math.floor((source.x - source.radius) / this.chunkSize);
      const maxCx = Math.floor((source.x + source.radius) / this.chunkSize);
      const minCy = Math.floor((source.y - source.radius) / this.chunkSize);
      const maxCy = Math.floor((source.y + source.radius) / this.chunkSize);
      for (let cy = minCy; cy <= maxCy; cy += 1) {
        for (let cx = minCx; cx <= maxCx; cx += 1) {
          const key = `${mapId}:${cx}:${cy}`;
          const bucket = this.mapChunkSourceIds.get(key) ?? [];
          bucket.push(source.id);
          this.mapChunkSourceIds.set(key, bucket);
        }
      }
    }
  }

  private getStaticSourceContribution(mapId: string, x: number, y: number): 0 | 1 | 2 {
    const cx = Math.floor(x / this.chunkSize);
    const cy = Math.floor(y / this.chunkSize);
    const cacheKey = `${mapId}:${cx}:${cy}:${this.ambientVersion}:${this.sourcesVersion}`;
    let entry = this.chunkCache.get(cacheKey);
    if (!entry) {
      entry = this.recomputeChunk(mapId, cx, cy);
      this.chunkCache.set(cacheKey, entry);
    }

    const localX = x - cx * this.chunkSize;
    const localY = y - cy * this.chunkSize;
    const idx = localY * this.chunkSize + localX;
    return (entry.values[idx] ?? 0) as 0 | 1 | 2;
  }

  private recomputeChunk(mapId: string, cx: number, cy: number): ChunkCacheEntry {
    this.recomputeCount += 1;
    const map = this.deps.mapSystem.getMap(mapId);
    const values = new Uint8Array(this.chunkSize * this.chunkSize);
    const sourceIds = this.mapChunkSourceIds.get(`${mapId}:${cx}:${cy}`) ?? [];

    for (let ly = 0; ly < this.chunkSize; ly += 1) {
      for (let lx = 0; lx < this.chunkSize; lx += 1) {
        const x = cx * this.chunkSize + lx;
        const y = cy * this.chunkSize + ly;
        if (x < 0 || y < 0 || x >= map.width || y >= map.height) {
          continue;
        }

        let best: 0 | 1 | 2 = 0;
        for (const sourceId of sourceIds) {
          const source = this.staticSources[sourceId];
          if (!source || !source.active) continue;
          const dx = x - source.x;
          const dy = y - source.y;
          if (dx * dx + dy * dy > source.radius * source.radius) continue;
          best = clampLight(Math.max(best, LIGHT_NUMERIC[source.intensity]));
        }
        values[ly * this.chunkSize + lx] = best;
      }
    }

    return { values };
  }

  private getDynamicContribution(state: Readonly<GameState>, x: number, y: number): 0 | 1 | 2 {
    let best: 0 | 1 | 2 = 0;
    const lantern = this.buildPlayerLanternSource(state);
    best = clampLight(Math.max(best, this.getSourceContributionAt(lantern, x, y)));

    for (const source of Object.values(this.tempSources)) {
      best = clampLight(Math.max(best, this.getSourceContributionAt(source, x, y)));
    }

    return best;
  }

  private getSourceContributionAt(source: LightSourceRuntime, x: number, y: number): 0 | 1 | 2 {
    if (!source.active) return 0;
    const dx = x - source.x;
    const dy = y - source.y;
    if (dx * dx + dy * dy > source.radius * source.radius) return 0;
    return LIGHT_NUMERIC[source.intensity];
  }

  private getBaseLightNumeric(mapId: string, x: number, y: number): 0 | 1 | 2 {
    const tileId = this.deps.mapSystem.getTileId(mapId, 'ground', x, y);
    const map = this.deps.mapSystem.getMap(mapId);
    const baseLight = map.tileDefs?.[String(tileId)]?.baseLight ?? 'DIM';
    return LIGHT_NUMERIC[baseLight];
  }

  private buildPlayerLanternSource(state: Readonly<GameState>): LightSourceRuntime {
    const hasLanternOil = Boolean(state.runtime.player.status.lantern_oil);
    return {
      id: 'player_lantern',
      type: 'player',
      x: state.runtime.player.x,
      y: state.runtime.player.y,
      radius: hasLanternOil ? 3 : 2,
      intensity: 'DIM',
      active: true,
      falloff: 'hard',
    };
  }

  private getAbsoluteSeconds(state: Readonly<GameState>): number {
    return (state.runtime.time.dayCount - 1) * this.totalCycleSeconds + state.runtime.time.secondsIntoCycle;
  }
}
