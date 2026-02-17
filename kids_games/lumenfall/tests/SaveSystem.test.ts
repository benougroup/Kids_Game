import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '../src/app/EventBus';
import { ModeMachine } from '../src/app/ModeMachine';
import { SaveSystem } from '../src/systems/SaveSystem';
import { StateStore } from '../src/state/StateStore';
import { createInitialState } from '../src/state/StateTypes';
import { LUMENFALL_SAVE_BACKUP, LUMENFALL_SAVE_MAIN, LUMENFALL_SAVE_TEMP, type SaveFile } from '../src/state/SaveTypes';

class MemoryStorage {
  private readonly data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }
}

const setup = () => {
  const store = new StateStore(createInitialState());
  const bus = new EventBus();
  const storage = new MemoryStorage();
  const save = new SaveSystem({ store, bus, modeMachine: new ModeMachine(), storage, nowMs: () => 1000 });
  return { store, save, storage, bus };
};

describe('SaveSystem', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('saveNow writes temp and main and is parseable', () => {
    const { save, storage } = setup();
    save.markDirty('test');
    const result = save.saveNow('force:test');

    expect(result.ok).toBe(true);
    expect(storage.getItem(LUMENFALL_SAVE_TEMP)).toBeTruthy();
    expect(storage.getItem(LUMENFALL_SAVE_MAIN)).toBeTruthy();
    expect(() => JSON.parse(storage.getItem(LUMENFALL_SAVE_MAIN)!)).not.toThrow();
  });

  it('uses backup when main is corrupted', () => {
    const { save, storage, store } = setup();
    const file: SaveFile = {
      saveVersion: 1,
      createdAtMs: 1,
      updatedAtMs: 2,
      global: createInitialState().global,
      story: createInitialState().story,
      runtime: {
        time: createInitialState().runtime.time,
        map: { currentMapId: 'light_hall', mapsVisited: { light_hall: { lastX: 2, lastY: 3 } } },
        player: { x: 2, y: 3, facing: 'right', hp: 3, sp: 2, status: {} },
        checkpoint: createInitialState().runtime.checkpoint,
      },
    };

    storage.setItem(LUMENFALL_SAVE_MAIN, '{bad json');
    storage.setItem(LUMENFALL_SAVE_BACKUP, JSON.stringify(file));

    const result = save.loadNow();
    expect(result.ok).toBe(true);
    expect(store.get().runtime.map.currentMapId).toBe('light_hall');
    expect(store.get().runtime.player.x).toBe(2);
  });

  it('loadNow forces explore and clears transient runtime slices', () => {
    const { save, storage, store } = setup();
    const init = createInitialState();
    const file: SaveFile = {
      saveVersion: 1,
      createdAtMs: 1,
      updatedAtMs: 2,
      global: init.global,
      story: init.story,
      runtime: {
        time: init.runtime.time,
        map: { currentMapId: 'light_hall', mapsVisited: { light_hall: { lastX: 4, lastY: 5 } } },
        player: { x: 4, y: 5, facing: 'up', hp: 4, sp: 1, status: { poison: { expiresAtMs: 99 } } },
        checkpoint: init.runtime.checkpoint,
      },
    };
    storage.setItem(LUMENFALL_SAVE_MAIN, JSON.stringify(file));

    save.loadNow();
    const state = store.get();
    expect(state.runtime.mode).toBe('EXPLORE');
    expect(state.runtime.map.transition).toBeUndefined();
    expect(state.runtime.dialogue.active).toBe(false);
    expect(state.runtime.crafting.open).toBe(false);
    expect(state.runtime.shadows.env).toEqual([]);
  });

  it('newStory resets story but keeps global tools/inventory', () => {
    const { save, store } = setup();
    const tx = store.beginTx('seed_global');
    tx.touchGlobalPlayer();
    tx.touchInventoryGlobal();
    tx.draftState.global.player.permanentTools['rod'] = true;
    tx.draftState.global.inventory.items['ingredient_sunleaf'] = { qty: 5 };
    tx.touchStory();
    tx.draftState.story.flags['met_npc'] = true;
    store.commitTx(tx);

    save.newStory('alt_story');
    const state = store.get();

    expect(state.story.activeStoryId).toBe('alt_story');
    expect(state.story.flags).toEqual({});
    expect(state.global.player.permanentTools['rod']).toBe(true);
    expect(state.global.inventory.items['ingredient_sunleaf'].qty).toBe(5);
  });

  it('debounces autosave requests into a single saveNow', () => {
    vi.useFakeTimers();
    const { save } = setup();
    const spy = vi.spyOn(save, 'saveNow');

    save.requestAutosave('a');
    save.requestAutosave('b');
    save.requestAutosave('c');

    vi.advanceTimersByTime(500);

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
