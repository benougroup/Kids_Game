import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '../src/app/EventBus';
import { ModeMachine } from '../src/app/ModeMachine';
import { CommandQueue } from '../src/app/Commands';
import { isStableForSave } from '../src/app/Stability';
import { createInitialState } from '../src/state/StateTypes';
import { StateStore } from '../src/state/StateStore';
import { MapSystem } from '../src/systems/MapSystem';
import { TriggerSystem } from '../src/systems/TriggerSystem';
import { CheckpointSystem } from '../src/systems/CheckpointSystem';
import { SaveSystem } from '../src/systems/SaveSystem';
import { DialogueSystem } from '../src/systems/DialogueSystem';

class MemoryStorage {
  private readonly data = new Map<string, string>();
  getItem(key: string): string | null { return this.data.get(key) ?? null; }
  setItem(key: string, value: string): void { this.data.set(key, value); }
  removeItem(key: string): void { this.data.delete(key); }
}

describe('Hardening stability rules', () => {
  it('triggers do not fire during map transition or fainting', () => {
    const store = new StateStore(createInitialState());
    const mapSystem = new MapSystem();
    const triggerSystem = new TriggerSystem(mapSystem, new CheckpointSystem(new EventBus()));
    const queue = new CommandQueue(new EventBus());

    const tx = store.beginTx('trigger_blocked');
    tx.touchRuntime();
    tx.touchRuntimePlayer();
    tx.draftState.runtime.player.x = 14;
    tx.draftState.runtime.player.y = 8;

    tx.draftState.runtime.mode = 'MAP_TRANSITION';
    triggerSystem.evaluate(tx, queue, { movedTile: true, interactPressed: true, nowMs: 100 });
    expect(queue.drain().length).toBe(0);

    tx.draftState.runtime.mode = 'FAINTING';
    tx.draftState.runtime.fainting = { active: true, phase: 'fadeOut', t: 0 };
    triggerSystem.evaluate(tx, queue, { movedTile: true, interactPressed: true, nowMs: 130 });
    expect(queue.drain().length).toBe(0);
  });

  it('autosave is deferred until state is stable', () => {
    vi.useFakeTimers();
    const store = new StateStore(createInitialState());
    const save = new SaveSystem({ store, bus: new EventBus(), modeMachine: new ModeMachine(), storage: new MemoryStorage() });
    const spy = vi.spyOn(save, 'saveNow');

    const tx = store.beginTx('unstable');
    tx.touchRuntime();
    tx.draftState.runtime.mode = 'MAP_TRANSITION';
    store.commitTx(tx);

    save.requestAutosave('test');
    vi.advanceTimersByTime(600);
    expect(spy).not.toHaveBeenCalled();

    const stableTx = store.beginTx('stable');
    stableTx.touchRuntime();
    stableTx.draftState.runtime.mode = 'EXPLORE';
    stableTx.draftState.runtime.map.transition = undefined;
    stableTx.draftState.runtime.dialogue.active = false;
    stableTx.draftState.runtime.inventoryUI.open = false;
    stableTx.draftState.runtime.crafting.open = false;
    store.commitTx(stableTx);

    save.onPostCommit(store.get());
    vi.runAllTimers();
    expect(spy).toHaveBeenCalled();
  });

  it('command queue prioritizes faint ahead of map transition', () => {
    const queue = new CommandQueue(new EventBus());
    queue.enqueue({ kind: 'RequestMapTransition', toMapId: 'light_hall', toX: 1, toY: 1 });
    queue.enqueue({ kind: 'TriggerFaint' });
    const drained = queue.drain();
    expect(drained[0].kind).toBe('TriggerFaint');
  });

  it('dialogue cannot start during transition state', () => {
    const store = new StateStore(createInitialState());
    const tx = store.beginTx('dialogue_guard');
    tx.touchRuntime();
    tx.draftState.runtime.mode = 'MAP_TRANSITION';
    tx.draftState.runtime.map.transition = { toMapId: 'light_hall', toX: 1, toY: 1, phase: 'fadeOut', t: 0 };

    const d = new DialogueSystem({ commandQueue: new CommandQueue(new EventBus()), modeMachine: new ModeMachine(), checkpointSystem: new CheckpointSystem(new EventBus()), bus: new EventBus() });
    d.startScene(tx, 'demo', 'demo_start');
    expect(tx.draftState.runtime.dialogue.active).toBe(false);
  });

  it('restore target state can be stable for save', () => {
    const state = createInitialState();
    state.runtime.mode = 'EXPLORE';
    state.runtime.map.transition = undefined;
    state.runtime.fainting = undefined;
    state.runtime.dialogue.active = false;
    state.runtime.crafting.open = false;
    state.runtime.inventoryUI.open = false;
    expect(isStableForSave(state)).toBe(true);
  });
});
