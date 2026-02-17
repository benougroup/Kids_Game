import { describe, expect, it } from 'vitest';
import { StateStore } from '../src/state/StateStore';
import { createInitialState } from '../src/state/StateTypes';
import { canSpendSP, damage, heal, restoreSP, spendSP } from '../src/systems/StatsSystem';
import { CommandQueue } from '../src/app/Commands';
import { EventBus } from '../src/app/EventBus';
import { CheckpointSystem } from '../src/systems/CheckpointSystem';
import { ModeMachine } from '../src/app/ModeMachine';

const setup = () => {
  const bus = new EventBus();
  const store = new StateStore(createInitialState());
  const queue = new CommandQueue(bus);
  const checkpointSystem = new CheckpointSystem(bus);
  return { store, queue, checkpointSystem };
};

describe('StatsSystem', () => {
  it('prevents one-shot from full HP', () => {
    const { store, queue } = setup();
    const tx = store.beginTx('one_shot_rule');
    damage(tx, 999, 'test', { commandQueue: queue });
    store.commitTx(tx);

    expect(store.get().runtime.player.hp).toBe(1);
    expect(queue.drain()).toHaveLength(0);
  });

  it('clamps hp/sp under multiple deltas', () => {
    const { store } = setup();
    const tx = store.beginTx('clamp_values');

    expect(canSpendSP(tx.draftState, 3)).toBe(true);
    expect(spendSP(tx, 3, 'spell')).toBe(true);
    expect(spendSP(tx, 9, 'spell')).toBe(false);
    restoreSP(tx, 99);

    damage(tx, 2, 'chip');
    heal(tx, 99);
    damage(tx, 99, 'huge');
    damage(tx, 1, 'last');

    store.commitTx(tx);

    expect(store.get().runtime.player.sp).toBe(4);
    expect(store.get().runtime.player.hp).toBe(0);
  });
});

describe('CheckpointSystem restore', () => {
  it('resets mode-sensitive runtime fields', () => {
    const { store, checkpointSystem } = setup();
    const tx = store.beginTx('snapshot');
    checkpointSystem.setCheckpoint(tx, 'cp_1');
    const snapshot = checkpointSystem.snapshot(tx);

    tx.touchRuntimeDialogue();
    tx.touchRuntimeCrafting();
    tx.touchRuntimeMap();
    tx.touchRuntimeUi();
    tx.draftState.runtime.dialogue = { active: true, nodeId: 'abc' };
    tx.draftState.runtime.crafting = { active: true, recipeId: 'r1' };
    tx.draftState.runtime.map.transition = { toMapId: 'light_hall', toX: 1, toY: 1, phase: 'fadeOut', t: 0.5 };
    tx.draftState.runtime.ui.messages = ['old'];

    checkpointSystem.restoreFromSnapshot(tx, snapshot);
    store.commitTx(tx);

    const state = store.get();
    expect(state.runtime.dialogue.active).toBe(false);
    expect(state.runtime.crafting.active).toBe(false);
    expect(state.runtime.map.transition).toBeUndefined();
    expect(state.runtime.ui.messages).toEqual(['Your lantern dims...']);
  });

  it('round-trips story flags/stage and inventory', () => {
    const { store, checkpointSystem } = setup();
    const tx = store.beginTx('roundtrip');
    tx.touchStory();
    tx.draftState.story.flags['met_npc'] = true;
    tx.draftState.story.stage['story01'] = 's2';
    tx.draftState.story.storyInventory['lantern_oil'] = 3;
    tx.draftState.story.storyShadow.byId['x'] = { note: 'shadow' };

    checkpointSystem.setCheckpoint(tx, 'cp_story');
    const snapshot = checkpointSystem.snapshot(tx);

    tx.draftState.story.flags['met_npc'] = false;
    tx.draftState.story.stage['story01'] = 'other';
    tx.draftState.story.storyInventory['lantern_oil'] = 0;

    checkpointSystem.restoreFromSnapshot(tx, snapshot);
    store.commitTx(tx);

    const story = store.get().story;
    expect(story.flags['met_npc']).toBe(true);
    expect(story.stage['story01']).toBe('s2');
    expect(story.storyInventory['lantern_oil']).toBe(3);
    expect(story.storyShadow.byId['x']).toEqual({ note: 'shadow' });
  });
});

describe('Faint flow integration', () => {
  it('switches to FAINTING then restores to EXPLORE with checkpoint data', () => {
    const { store, queue, checkpointSystem } = setup();
    const modeMachine = new ModeMachine();

    const tx = store.beginTx('faint_flow');
    checkpointSystem.setCheckpoint(tx, 'cp_faint');
    checkpointSystem.snapshot(tx);
    tx.touchRuntimeMap();
    tx.touchRuntimePlayer();
    tx.draftState.runtime.map.currentMapId = 'light_hall';
    tx.draftState.runtime.player.x = 9;
    tx.draftState.runtime.player.y = 9;
    tx.draftState.runtime.player.hp = 1;

    damage(tx, 1, 'hazard', { commandQueue: queue });
    const faintCmd = queue.drain()[0];
    expect(faintCmd.kind).toBe('TriggerFaint');

    tx.touchRuntime();
    tx.touchRuntimeFainting();
    tx.draftState.runtime.mode = modeMachine.forceMode('FAINTING');
    tx.draftState.runtime.fainting = { active: true, phase: 'restore', t: 0, restoreDone: false };

    checkpointSystem.restoreFromSnapshot(tx, tx.draftState.runtime.checkpoint.snapshot!);
    tx.draftState.runtime.fainting = undefined;
    tx.draftState.runtime.mode = modeMachine.forceMode('EXPLORE');

    store.commitTx(tx);

    const state = store.get();
    expect(state.runtime.mode).toBe('EXPLORE');
    expect(state.runtime.map.currentMapId).toBe('bright_hollow');
    expect(state.runtime.player.x).toBe(14);
    expect(state.runtime.player.y).toBe(10);
    expect(state.runtime.player.hp).toBe(6);
    expect(state.runtime.player.sp).toBe(0);
  });
});
