import { describe, expect, it } from 'vitest';
import { CommandQueue } from '../src/app/Commands';
import { EventBus } from '../src/app/EventBus';
import { StateStore } from '../src/state/StateStore';
import { ShadowSystem } from '../src/systems/ShadowSystem';

const make = () => {
  const store = new StateStore();
  const bus = new EventBus();
  const commandQueue = new CommandQueue(bus);
  const mapSystem = {
    inBounds: (_m: string, x: number, y: number) => x >= 0 && y >= 0 && x < 20 && y < 20,
    isBlocked: () => false,
    getShadowSpawnConfig: () => ({ zones: [{ id: 'z', shape: 'rect' as const, x: 0, y: 0, w: 20, h: 20 }], clusterSizeMin: 1, clusterSizeMax: 3, maxActive: 5 }),
  } as any;
  const lightSystem = {
    isInSafeZone: (_s: unknown, x: number, y: number) => x === 1 && y === 1,
    getTileLightLevel: (_s: unknown, x: number, y: number) => (x === 2 && y === 2 ? 'BRIGHT' : (x + y) % 2 ? 'DIM' : 'DARK'),
  } as any;
  const shadowSystem = new ShadowSystem({ mapSystem, lightSystem, commandQueue });
  return { store, shadowSystem, commandQueue };
};

describe('ShadowSystem', () => {
  it('spawns deterministically with same seed', () => {
    const a = make();
    const txA = a.store.beginTx('a');
    a.shadowSystem.handlePhaseStart('NIGHT', txA);
    a.store.commitTx(txA);

    const b = make();
    const txB = b.store.beginTx('b');
    b.shadowSystem.handlePhaseStart('NIGHT', txB);
    b.store.commitTx(txB);

    expect(a.store.get().runtime.shadows.env.map((s) => [s.x, s.y])).toEqual(b.store.get().runtime.shadows.env.map((s) => [s.x, s.y]));
  });

  it('never spawns in safe zone or BRIGHT tiles', () => {
    const { store, shadowSystem } = make();
    const tx = store.beginTx('spawn');
    shadowSystem.handlePhaseStart('NIGHT', tx);
    store.commitTx(tx);

    for (const shadow of store.get().runtime.shadows.env) {
      expect([shadow.x, shadow.y]).not.toEqual([1, 1]);
      expect([shadow.x, shadow.y]).not.toEqual([2, 2]);
    }
  });

  it('despawns at dawn', () => {
    const { store, shadowSystem } = make();
    const tx1 = store.beginTx('night');
    shadowSystem.handlePhaseStart('NIGHT', tx1);
    store.commitTx(tx1);
    const tx2 = store.beginTx('dawn');
    shadowSystem.handlePhaseStart('DAWN', tx2);
    store.commitTx(tx2);
    expect(store.get().runtime.shadows.env).toHaveLength(0);
  });

  it('triggers one encounter and respects cooldown', () => {
    const { store, shadowSystem, commandQueue } = make();
    const tx = store.beginTx('setup');
    tx.touchRuntimeShadows();
    tx.draftState.runtime.shadows.env = [{ id: 's1', category: 'environmental', x: 14, y: 11, state: 'calm', cooldownUntilMs: 0 }];
    store.commitTx(tx);

    const tx1 = store.beginTx('tick1');
    shadowSystem.update(tx1, 1000, 16);
    store.commitTx(tx1);
    expect(commandQueue.drain().filter((c) => c.kind === 'StartEncounter')).toHaveLength(1);

    const tx2 = store.beginTx('tick2');
    shadowSystem.update(tx2, 1100, 16);
    store.commitTx(tx2);
    expect(commandQueue.drain().filter((c) => c.kind === 'StartEncounter')).toHaveLength(0);
  });

  it('dissolve action removes shadow', () => {
    const { store, shadowSystem } = make();
    const tx = store.beginTx('setup');
    tx.touchRuntimeShadows();
    tx.touchRuntimeFlags();
    tx.touchRuntime();
    tx.draftState.runtime.encounterContext = { shadowId: 's1', category: 'environmental', tileLight: 'DARK', mapId: 'bright_hollow' };
    tx.draftState.runtime.shadows.env = [{ id: 's1', category: 'environmental', x: 14, y: 11, state: 'calm', cooldownUntilMs: 0 }];
    tx.draftState.runtime.runtimeFlags['runtime.shadowAction'] = { action: 'dissolve' };
    shadowSystem.update(tx, 2000, 16);
    store.commitTx(tx);

    expect(store.get().runtime.shadows.env).toHaveLength(0);
  });
});
