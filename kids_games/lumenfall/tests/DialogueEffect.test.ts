import { describe, expect, it } from 'vitest';
import { EventBus } from '../src/app/EventBus';
import { CommandQueue } from '../src/app/Commands';
import { ModeMachine } from '../src/app/ModeMachine';
import { StateStore } from '../src/state/StateStore';
import { createInitialState } from '../src/state/StateTypes';
import { CheckpointSystem } from '../src/systems/CheckpointSystem';
import { DialogueSystem } from '../src/systems/DialogueSystem';
import { evaluateSceneConditions } from '../src/systems/DialogueSystemConditions';
import { EffectInterpreter } from '../src/systems/EffectInterpreter';
import { inventorySystem } from '../src/systems/InventorySystem';

const makeDeps = () => {
  const bus = new EventBus();
  const queue = new CommandQueue(bus);
  const checkpointSystem = new CheckpointSystem(bus);
  const modeMachine = new ModeMachine();
  return { bus, queue, checkpointSystem, modeMachine };
};

describe('Dialogue conditions', () => {
  it('evaluates flags/items/sp/timePhase', () => {
    const store = new StateStore(createInitialState());
    const tx = store.beginTx('conditions');
    tx.touchStoryFlags();
    tx.touchRuntimeTime();
    tx.draftState.story.flags.demo = true;
    tx.draftState.runtime.time.phase = 'DUSK';
    inventorySystem.addItem(tx, 'ingredient_sunleaf', 1, 'global');

    expect(
      evaluateSceneConditions(tx.draftState, {
        flags: { demo: true },
        hasItem: { scope: 'global', itemId: 'ingredient_sunleaf', qty: 1 },
        minSP: 2,
        timePhaseIn: ['DUSK'],
      }),
    ).toBe(true);
    expect(evaluateSceneConditions(tx.draftState, { notFlags: { demo: true } })).toBe(false);
  });
});

describe('Dialogue + effects', () => {
  it('routes missing node to error node', () => {
    const store = new StateStore(createInitialState());
    const { bus, queue, checkpointSystem, modeMachine } = makeDeps();
    const dialogue = new DialogueSystem({ commandQueue: queue, modeMachine, checkpointSystem, bus });
    const tx = store.beginTx('missing_node');
    dialogue.startScene(tx, 'demo', 'missing_node_id');
    dialogue.update(tx);
    expect(tx.draftState.runtime.dialogue.sceneId).toBe('__error__');
  });

  it('loop guard trips', () => {
    const store = new StateStore(createInitialState());
    const { bus, queue, checkpointSystem, modeMachine } = makeDeps();
    const dialogue = new DialogueSystem({ commandQueue: queue, modeMachine, checkpointSystem, bus });
    const tx = store.beginTx('loop_guard');
    dialogue.startScene(tx, 'demo', 'demo_fail');
    dialogue.update(tx);
    tx.touchRuntimePlayer();
    tx.draftState.runtime.player.sp = 0;

    for (let i = 0; i < 45; i += 1) {
      if (tx.draftState.runtime.dialogue.sceneId === '__error__') break;
      const idx = tx.draftState.runtime.dialogue.sceneId === 'demo_fail' ? 0 : 1;
      dialogue.choose(tx, idx);
      dialogue.update(tx);
    }

    expect(tx.draftState.runtime.dialogue.sceneId).toBe('__error__');
    expect(tx.draftState.runtime.dialogue.lastError).toContain('Loop guard');
  });

  it('effect interpreter is all-or-none for insufficient resources', () => {
    const store = new StateStore(createInitialState());
    const tx = store.beginTx('all_or_none');
    const interpreter = new EffectInterpreter(new EventBus());

    const beforeHp = tx.draftState.runtime.player.hp;
    const result = interpreter.applyEffects(tx, [
      { op: 'inventory.remove', itemId: 'ingredient_sunleaf', qty: 1, scope: 'global' },
      { op: 'hp.delta', value: -2 },
      { op: 'sp.delta', value: -99 },
    ]);

    expect(result.ok).toBe(false);
    expect(tx.draftState.runtime.player.hp).toBe(beforeHp);
    expect(inventorySystem.getQty(tx.draftState, 'ingredient_sunleaf', 'global')).toBe(0);
  });

  it('choosing applies effects then advances', () => {
    const store = new StateStore(createInitialState());
    const { bus, queue, checkpointSystem, modeMachine } = makeDeps();
    const dialogue = new DialogueSystem({ commandQueue: queue, modeMachine, checkpointSystem, bus });
    const tx = store.beginTx('choose_advances');
    dialogue.startScene(tx, 'demo', 'demo_start');
    dialogue.update(tx);
    tx.touchRuntimePlayer();
    tx.draftState.runtime.player.sp = 2;
    const beforeSp = tx.draftState.runtime.player.sp;
    dialogue.choose(tx, 0);
    dialogue.update(tx);

    expect(tx.draftState.runtime.dialogue.sceneId).toBe('demo_spend');
    expect(tx.draftState.runtime.player.sp).toBe(beforeSp + 1);
    expect(inventorySystem.getQty(tx.draftState, 'ingredient_sunleaf', 'global')).toBeGreaterThan(0);
  });
});
