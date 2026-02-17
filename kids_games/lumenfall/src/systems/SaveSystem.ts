import type { EventBus } from '../app/EventBus';
import type { ModeMachine } from '../app/ModeMachine';
import { migrateSaveFile } from '../state/Migrations';
import { StateStore } from '../state/StateStore';
import { createEmptyInventory, createInitialState, type GameState } from '../state/StateTypes';
import {
  CURRENT_SAVE_VERSION,
  isSaveFileLike,
  LUMENFALL_SAVE_BACKUP,
  LUMENFALL_SAVE_MAIN,
  LUMENFALL_SAVE_TEMP,
  type SaveFile,
} from '../state/SaveTypes';

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface SaveSystemDeps {
  store: StateStore;
  bus: EventBus;
  modeMachine: ModeMachine;
  storage?: StorageLike;
  nowMs?: () => number;
}

const AUTOSAVE_DEBOUNCE_MS = 500;
const BACKUP_ROTATION_INTERVAL = 5;
const DISALLOWED_SAVE_MODES = new Set<GameState['runtime']['mode']>(['MAP_TRANSITION', 'FAINTING', 'LOADING']);

export class SaveSystem {
  private readonly store: StateStore;
  private readonly bus: EventBus;
  private readonly storage: StorageLike;
  private readonly nowMs: () => number;
  private dirty = false;
  private pendingAutosave = false;
  private isRestoring = false;
  private debounceHandle: ReturnType<typeof setTimeout> | null = null;
  private totalSaves = 0;

  constructor({ store, bus, modeMachine: _modeMachine, storage, nowMs }: SaveSystemDeps) {
    this.store = store;
    this.bus = bus;
    this.storage = storage ?? window.localStorage;
    this.nowMs = nowMs ?? (() => Date.now());

    bus.on('CHECKPOINT_CREATED', () => this.requestAutosave('checkpoint'));
    bus.on('CHECKPOINT_SNAPSHOT', () => this.requestAutosave('checkpoint'));
    bus.on('TIME_PHASE_CHANGED', (event) => {
      if (event.to === 'DAWN') {
        this.requestAutosave('dawn');
      }
    });
    bus.on('CRAFT_SUCCESS', () => this.requestAutosave('craft'));
    bus.on('STORY_FLAGS_CHANGED', () => this.requestAutosave('flags'));
    bus.on('MODE_CHANGED', () => {
      if (this.pendingAutosave && this.canSaveNow()) {
        this.requestAutosave('mode_unblocked');
      }
    });
  }

  markDirty(_reason: string): void {
    this.dirty = true;
    const tx = this.store.beginTx('save_dirty');
    tx.touchRuntimeSave();
    tx.draftState.runtime.save.dirty = true;
    this.store.commitTx(tx);
  }

  requestAutosave(reason: string): void {
    this.markDirty(reason);
    this.pendingAutosave = true;
    if (this.debounceHandle) {
      clearTimeout(this.debounceHandle);
    }
    this.debounceHandle = setTimeout(() => {
      if (!this.canSaveNow()) {
        this.pendingAutosave = true;
        return;
      }
      this.saveNow(`autosave:${reason}`);
      this.pendingAutosave = false;
    }, AUTOSAVE_DEBOUNCE_MS);
  }

  saveNow(reason: string): { ok: boolean; error?: string } {
    if (!this.dirty && !reason.startsWith('force')) {
      return { ok: true };
    }
    if (!this.canSaveNow()) {
      this.pendingAutosave = true;
      return { ok: false, error: 'Save blocked by current mode/restore state.' };
    }

    try {
      const state = this.store.get();
      const json = JSON.stringify(this.buildSaveFile(state));
      this.storage.setItem(LUMENFALL_SAVE_TEMP, json);

      const roundTrip = JSON.parse(this.storage.getItem(LUMENFALL_SAVE_TEMP) ?? 'null');
      if (!isSaveFileLike(roundTrip)) {
        throw new Error('Round-trip validation failed');
      }

      this.storage.setItem(LUMENFALL_SAVE_MAIN, json);
      this.totalSaves += 1;
      if (this.totalSaves % BACKUP_ROTATION_INTERVAL === 0) {
        this.storage.setItem(LUMENFALL_SAVE_BACKUP, json);
      }

      const tx = this.store.beginTx('save_clear_dirty');
      tx.touchRuntimeSave();
      tx.touchRuntimeCheckpoint();
      tx.draftState.runtime.save.dirty = false;
      tx.draftState.runtime.checkpoint.dirty = false;
      this.store.commitTx(tx);
      this.dirty = false;
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Save failed' };
    }
  }

  loadNow(): { ok: boolean; error?: string } {
    this.isRestoring = true;
    try {
      const loaded = this.tryLoadFromMainOrBackup();
      if (!loaded) {
        this.store.replaceState(createInitialState());
        this.bus.emit({ type: 'UI_MESSAGE', text: 'No save found. Started new game.' });
        return { ok: true };
      }

      const migrated = migrateSaveFile(loaded);
      this.store.replaceState(this.buildLoadedState(migrated));
      this.dirty = false;
      this.pendingAutosave = false;
      this.bus.emit({ type: 'UI_MESSAGE', text: 'Loaded.' });
      return { ok: true };
    } catch (error) {
      this.store.replaceState(createInitialState());
      return { ok: false, error: error instanceof Error ? error.message : 'Load failed' };
    } finally {
      this.isRestoring = false;
    }
  }

  newGame(): void {
    this.clearStorage();
    this.store.replaceState(createInitialState());
    this.dirty = false;
    this.pendingAutosave = false;
  }

  newStory(newStoryId: string): void {
    const current = this.store.get();
    const next = createInitialState();
    next.global = {
      player: {
        ...current.global.player,
        permanentTools: { ...current.global.player.permanentTools },
        upgrades: { ...current.global.player.upgrades },
      },
      inventory: {
        items: Object.fromEntries(Object.entries(current.global.inventory.items).map(([itemId, stack]) => [itemId, { ...stack }])),
        nonStack: { ...current.global.inventory.nonStack },
      },
    };
    next.story = {
      activeStoryId: newStoryId,
      stage: {},
      flags: {},
      npc: { townFear: 0, trust: {} },
      storyInventory: createEmptyInventory(),
      storyShadow: { byId: {} },
    };
    next.runtime.map.currentMapId = 'bright_hollow';
    next.runtime.player.x = 14;
    next.runtime.player.y = 10;
    next.runtime.player.px = 14 * 32;
    next.runtime.player.py = 10 * 32;
    next.runtime.map.mapsVisited = { bright_hollow: { lastX: 14, lastY: 10 } };

    this.store.replaceState(next);
    const tx = this.store.beginTx('new_story_checkpoint');
    tx.touchRuntimeCheckpoint();
    tx.draftState.runtime.checkpoint.lastCheckpointId = `story_start_${newStoryId}`;
    tx.draftState.runtime.checkpoint.snapshot = {
      checkpointId: `story_start_${newStoryId}`,
      mapId: 'bright_hollow',
      player: { x: 14, y: 10, facing: 'S', hp: next.runtime.player.hp, sp: next.runtime.player.sp },
      story: {
        activeStoryId: newStoryId,
        flags: {},
        stage: {},
        npc: { townFear: 0, trust: {}, npcFlags: {} },
        storyInventory: createEmptyInventory(),
        storyShadowById: {},
      },
      time: {
        phase: next.runtime.time.phase,
        secondsIntoCycle: next.runtime.time.secondsIntoCycle,
        dayCount: next.runtime.time.dayCount,
      },
      createdAtMs: this.nowMs(),
    };
    this.store.commitTx(tx);
    this.markDirty('new_story');
    this.saveNow('force:new_story');
  }

  private canSaveNow(): boolean {
    const state = this.store.get();
    const modeBlocked = DISALLOWED_SAVE_MODES.has(state.runtime.mode);
    const restoreBlocked = Boolean(state.runtime.fainting?.active && state.runtime.fainting.phase === 'restore');
    return !modeBlocked && !restoreBlocked && !this.isRestoring;
  }

  private buildSaveFile(state: Readonly<GameState>): SaveFile {
    const now = this.nowMs();
    const currentMain = this.tryParseSave(this.storage.getItem(LUMENFALL_SAVE_MAIN));
    return {
      saveVersion: CURRENT_SAVE_VERSION,
      createdAtMs: currentMain?.createdAtMs ?? now,
      updatedAtMs: now,
      global: structuredClone(state.global),
      story: structuredClone(state.story),
      runtime: {
        time: structuredClone(state.runtime.time),
        map: {
          currentMapId: state.runtime.map.currentMapId,
          mapsVisited: structuredClone(state.runtime.map.mapsVisited),
        },
        player: {
          x: state.runtime.player.x,
          y: state.runtime.player.y,
          facing: state.runtime.player.facing,
          hp: state.runtime.player.hp,
          sp: state.runtime.player.sp,
          status: Object.fromEntries(
            Object.entries(state.runtime.player.status)
              .filter(([, value]) => typeof value === 'number')
              .map(([key, value]) => [key, { expiresAtMs: value as number }]),
          ),
        },
        checkpoint: structuredClone(state.runtime.checkpoint),
      },
    };
  }

  private tryLoadFromMainOrBackup(): SaveFile | null {
    const main = this.tryParseSave(this.storage.getItem(LUMENFALL_SAVE_MAIN));
    if (main) return main;
    return this.tryParseSave(this.storage.getItem(LUMENFALL_SAVE_BACKUP));
  }

  private tryParseSave(raw: string | null): SaveFile | null {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return isSaveFileLike(parsed) ? (parsed as SaveFile) : null;
    } catch {
      return null;
    }
  }

  private buildLoadedState(save: SaveFile): GameState {
    const next = createInitialState();
    next.saveVersion = CURRENT_SAVE_VERSION;
    next.global = structuredClone(save.global);
    next.story = structuredClone(save.story);
    next.runtime.time = structuredClone(save.runtime.time);
    next.runtime.map.currentMapId = save.runtime.map.currentMapId;
    next.runtime.map.mapsVisited = structuredClone(save.runtime.map.mapsVisited);
    next.runtime.map.transition = undefined;
    next.runtime.mode = 'EXPLORE';
    next.runtime.player.x = save.runtime.player.x;
    next.runtime.player.y = save.runtime.player.y;
    next.runtime.player.px = save.runtime.player.x * 32;
    next.runtime.player.py = save.runtime.player.y * 32;
    next.runtime.player.facing = save.runtime.player.facing;
    next.runtime.player.hp = save.runtime.player.hp;
    next.runtime.player.sp = save.runtime.player.sp;
    next.runtime.player.status = Object.fromEntries(
      Object.entries(save.runtime.player.status).map(([key, value]) => [key, value.expiresAtMs]),
    );
    next.runtime.dialogue = { active: false, storyId: '', sceneId: '', returnMode: 'EXPLORE', visitCount: 0, visited: {} };
    next.runtime.inventoryUI = { open: false, category: 'all', selectedItemId: undefined };
    next.runtime.crafting = { open: false };
    next.runtime.runtimeFlags = {};
    next.runtime.encounterContext = undefined;
    next.runtime.shadows = { env: [], story: [], lastEncounterAtMs: 0 };
    next.runtime.checkpoint = structuredClone(save.runtime.checkpoint);
    next.runtime.save = { dirty: false, blockedByFaint: false };
    return next;
  }

  private clearStorage(): void {
    this.storage.removeItem(LUMENFALL_SAVE_TEMP);
    this.storage.removeItem(LUMENFALL_SAVE_MAIN);
    this.storage.removeItem(LUMENFALL_SAVE_BACKUP);
  }
}
