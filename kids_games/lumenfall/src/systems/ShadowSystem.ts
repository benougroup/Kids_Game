import type { CommandQueue } from '../app/Commands';
import { hashStringToSeed, RNG } from '../app/RNG';
import type { DraftTx } from '../state/StateStore';
import type { GameState, LightLevel, ShadowEntity, StoryShadowPersist } from '../state/StateTypes';
import type { LightSystem } from './LightSystem';
import type { MapSystem, ShadowSpawnZoneRect } from './MapSystem';

const DRIFT_MS = 500;

export class ShadowSystem {
  private driftElapsedMs = 0;
  private lastMapId = '';

  constructor(
    private readonly deps: { mapSystem: MapSystem; lightSystem: LightSystem; commandQueue: CommandQueue },
  ) {}

  handlePhaseStart(phase: 'DAY' | 'DUSK' | 'NIGHT' | 'DAWN', tx: DraftTx): void {
    if (phase === 'NIGHT') this.spawnEnvironmentalShadows(tx);
    if (phase === 'DAWN') {
      tx.touchRuntimeShadows();
      tx.draftState.runtime.shadows.env = [];
    }
  }

  update(tx: DraftTx, nowMs: number, dtMs: number): void {
    const state = tx.draftState;
    this.syncStoryShadows(tx);
    this.handleMapNightSpawn(tx);
    this.applyRuntimeActions(tx);

    if (state.runtime.mode !== 'EXPLORE') return;

    this.driftElapsedMs += dtMs;
    if (this.driftElapsedMs >= DRIFT_MS) {
      this.driftElapsedMs = 0;
      this.updateDrift(tx, nowMs);
    }

    this.applyContactDamage(tx);
    this.tryTriggerEncounter(tx, nowMs);
  }

  private syncStoryShadows(tx: DraftTx): void {
    const next: ShadowEntity[] = [];
    for (const persist of Object.values(tx.draftState.story.storyShadow.byId as Record<string, StoryShadowPersist>)) {
      if (!persist?.active || persist.resolved) continue;
      if (persist.requiredFlags && !Object.entries(persist.requiredFlags).every(([k, v]) => tx.draftState.story.flags[k] === v)) continue;
      if (persist.requiredStage && tx.draftState.story.stage[persist.requiredStage.key] !== persist.requiredStage.value) continue;
      next.push({
        id: persist.id,
        category: 'story',
        x: persist.x,
        y: persist.y,
        state: persist.state ?? 'calm',
        anchor: persist.anchor,
        cooldownUntilMs: 0,
      });
    }
    tx.touchRuntimeShadows();
    tx.draftState.runtime.shadows.story = next;
  }

  private handleMapNightSpawn(tx: DraftTx): void {
    const mapId = tx.draftState.runtime.map.currentMapId;
    if (mapId === this.lastMapId) return;
    this.lastMapId = mapId;
    if (tx.draftState.runtime.time.phase === 'NIGHT' && tx.draftState.runtime.shadows.env.length === 0) {
      this.spawnEnvironmentalShadows(tx);
    }
  }

  private spawnEnvironmentalShadows(tx: DraftTx): void {
    const state = tx.draftState;
    const mapId = state.runtime.map.currentMapId;
    const config = this.deps.mapSystem.getShadowSpawnConfig(mapId);
    tx.touchRuntimeShadows();
    state.runtime.shadows.env = [];
    if (!config || config.maxActive <= 0 || config.zones.length === 0) return;

    const seed = hashStringToSeed(`${state.story.activeStoryId}|${state.runtime.time.dayCount}|${mapId}`);
    const rng = new RNG(seed);
    let i = 0;
    while (state.runtime.shadows.env.length < config.maxActive && i < config.maxActive * 12) {
      const zone = config.zones[rng.nextInt(0, config.zones.length - 1)] as ShadowSpawnZoneRect;
      const centerX = rng.nextInt(zone.x, zone.x + zone.w - 1);
      const centerY = rng.nextInt(zone.y, zone.y + zone.h - 1);
      const clusterSize = rng.nextInt(config.clusterSizeMin, config.clusterSizeMax);
      for (let c = 0; c < clusterSize && state.runtime.shadows.env.length < config.maxActive; c += 1) {
        let placed = false;
        for (let attempt = 0; attempt < 8 && !placed; attempt += 1) {
          const x = centerX + rng.nextInt(-2, 2);
          const y = centerY + rng.nextInt(-2, 2);
          if (!this.validSpawnTile(state, x, y)) continue;
          state.runtime.shadows.env.push({
            id: `env_${state.runtime.time.dayCount}_${state.runtime.shadows.env.length}`,
            category: 'environmental',
            x,
            y,
            state: 'calm',
            cooldownUntilMs: 0,
          });
          placed = true;
        }
      }
      i += 1;
    }
  }

  private validSpawnTile(state: Readonly<GameState>, x: number, y: number): boolean {
    const mapId = state.runtime.map.currentMapId;
    if (!this.deps.mapSystem.inBounds(mapId, x, y)) return false;
    if (this.deps.mapSystem.isBlocked(mapId, x, y)) return false;
    if (this.deps.lightSystem.isInSafeZone(state, x, y)) return false;
    const light = this.deps.lightSystem.getTileLightLevel(state, x, y);
    if (light === 'BRIGHT') return false;
    const distFromPlayer = Math.abs(state.runtime.player.x - x) + Math.abs(state.runtime.player.y - y);
    return distFromPlayer > 2;
  }

  private updateDrift(tx: DraftTx, nowMs: number): void {
    tx.touchRuntimeShadows();
    for (const shadow of [...tx.draftState.runtime.shadows.env, ...tx.draftState.runtime.shadows.story]) {
      const moved = this.pickDriftTarget(tx.draftState, shadow, nowMs);
      shadow.x = moved.x;
      shadow.y = moved.y;
    }
  }

  private pickDriftTarget(state: Readonly<GameState>, shadow: ShadowEntity, nowMs: number): { x: number; y: number } {
    const dirs = [
      { dx: 0, dy: 0 },
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];
    let best = -9999;
    let bestPos = { x: shadow.x, y: shadow.y };
    for (const dir of dirs) {
      const nx = shadow.x + dir.dx;
      const ny = shadow.y + dir.dy;
      if (!this.validSpawnTile(state, nx, ny)) continue;
      const level = this.deps.lightSystem.getTileLightLevel(state, nx, ny);
      let score = level === 'DIM' ? 4 : 3;
      if (shadow.category === 'environmental' && this.adjacentToBright(state, nx, ny)) score += 2;
      const playerDist = Math.abs(state.runtime.player.x - nx) + Math.abs(state.runtime.player.y - ny);
      if (playerDist <= 1) score -= 2;
      const tiebreak = new RNG(hashStringToSeed(`${shadow.id}|${Math.floor(nowMs / DRIFT_MS)}|${nx}|${ny}`)).nextFloat();
      score += tiebreak;
      if (score > best) {
        best = score;
        bestPos = { x: nx, y: ny };
      }
    }
    return bestPos;
  }

  private adjacentToBright(state: Readonly<GameState>, x: number, y: number): boolean {
    return (
      this.deps.lightSystem.getTileLightLevel(state, x + 1, y) === 'BRIGHT' ||
      this.deps.lightSystem.getTileLightLevel(state, x - 1, y) === 'BRIGHT' ||
      this.deps.lightSystem.getTileLightLevel(state, x, y + 1) === 'BRIGHT' ||
      this.deps.lightSystem.getTileLightLevel(state, x, y - 1) === 'BRIGHT'
    );
  }

  private applyContactDamage(tx: DraftTx): void {
    const state = tx.draftState;
    const hit = [...state.runtime.shadows.env, ...state.runtime.shadows.story].find((s) => s.x === state.runtime.player.x && s.y === state.runtime.player.y);
    if (!hit) return;
    tx.touchRuntimePlayer();
    state.runtime.player.hp = Math.max(0, state.runtime.player.hp - 1);
    state.runtime.player.x = Math.max(0, state.runtime.player.x - 1);
    state.runtime.player.px = state.runtime.player.x * 32;
  }

  private tryTriggerEncounter(tx: DraftTx, nowMs: number): void {
    const state = tx.draftState;
    if (state.runtime.mode !== 'EXPLORE' || state.runtime.map.transition) return;
    if (nowMs <= state.runtime.shadows.lastEncounterAtMs + 300) return;

    const all = [...state.runtime.shadows.env, ...state.runtime.shadows.story];
    const shadow = all.find((candidate) => {
      const dist = Math.abs(candidate.x - state.runtime.player.x) + Math.abs(candidate.y - state.runtime.player.y);
      return dist <= 1 && nowMs >= candidate.cooldownUntilMs;
    });
    if (!shadow) return;
    const light = this.deps.lightSystem.getTileLightLevel(state, shadow.x, shadow.y);
    if (light === 'BRIGHT') return;

    const templateId = this.getTemplateId(shadow.category, light);
    shadow.cooldownUntilMs = nowMs + 2000;
    tx.touchRuntimeShadows();
    state.runtime.shadows.lastEncounterAtMs = nowMs;
    tx.touchRuntime();
    state.runtime.encounterContext = { shadowId: shadow.id, category: shadow.category, tileLight: light, mapId: state.runtime.map.currentMapId };
    this.deps.commandQueue.enqueue({ kind: 'StartEncounter', templateId });
  }

  private getTemplateId(category: ShadowEntity['category'], light: Exclude<LightLevel, 'BRIGHT'>): string {
    if (category === 'story') return light === 'DARK' ? 'enc_story_dark' : 'enc_story_dim';
    return light === 'DARK' ? 'enc_env_dark' : 'enc_env_dim';
  }

  private applyRuntimeActions(tx: DraftTx): void {
    const action = tx.draftState.runtime.runtimeFlags['runtime.shadowAction'] as { shadowId?: string; action?: string } | undefined;
    if (!action || action.action !== 'dissolve') return;
    const shadowId = action.shadowId ?? tx.draftState.runtime.encounterContext?.shadowId;
    if (!shadowId) return;
    tx.touchRuntimeShadows();
    tx.draftState.runtime.shadows.env = tx.draftState.runtime.shadows.env.filter((s) => s.id !== shadowId);
    tx.draftState.runtime.shadows.story = tx.draftState.runtime.shadows.story.filter((s) => s.id !== shadowId);
    tx.touchRuntimeFlags();
    delete tx.draftState.runtime.runtimeFlags['runtime.shadowAction'];
  }
}
