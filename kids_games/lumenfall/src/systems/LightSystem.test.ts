import { describe, expect, it } from 'vitest';
import { EventBus } from '../app/EventBus';
import { StateStore } from '../state/StateStore';
import { MapSystem } from './MapSystem';
import { LightSystem } from './LightSystem';

const setup = () => {
  const store = new StateStore();
  const mapSystem = new MapSystem();
  const bus = new EventBus();
  const lightSystem = new LightSystem({ mapSystem, bus });
  const tx = store.beginTx('light_init');
  lightSystem.initialize(store.get(), tx);
  store.commitTx(tx);
  return { store, lightSystem };
};

describe('LightSystem', () => {
  it('detects safe zones by radius', () => {
    const { store, lightSystem } = setup();
    const state = store.get();

    expect(lightSystem.isInSafeZone(state, 15, 10)).toBe(true);
    expect(lightSystem.isInSafeZone(state, 10, 10)).toBe(false);
  });

  it('applies base light + ambient shift boundaries', () => {
    const { store, lightSystem } = setup();
    const tx = store.beginTx('ambient_night');
    lightSystem.onTimePhaseChanged('NIGHT', tx);
    store.commitTx(tx);

    const state = store.get();
    expect(lightSystem.getTileLightLevel(state, 0, 0)).toBe('DARK');
  });

  it('applies static source contribution in radius', () => {
    const { store, lightSystem } = setup();
    const tx = store.beginTx('ambient_night_for_source');
    lightSystem.onTimePhaseChanged('NIGHT', tx);
    store.commitTx(tx);

    const state = store.get();
    expect(lightSystem.getTileLightLevel(state, 15, 10)).toBe('BRIGHT');
    expect(lightSystem.getTileLightLevel(state, 2, 2)).toBe('DARK');
  });

  it('increases player lantern radius when lantern_oil is active', () => {
    const { store, lightSystem } = setup();
    const phaseTx = store.beginTx('ambient_night_for_player');
    lightSystem.onTimePhaseChanged('NIGHT', phaseTx);
    store.commitTx(phaseTx);

    const moveTx = store.beginTx('player_move_for_lantern_test');
    moveTx.touchRuntimePlayer();
    moveTx.draftState.runtime.player.x = 3;
    moveTx.draftState.runtime.player.y = 3;
    store.commitTx(moveTx);

    let state = store.get();
    expect(lightSystem.getTileLightLevel(state, state.runtime.player.x + 3, state.runtime.player.y)).toBe('DARK');

    const tx = store.beginTx('oil_on');
    tx.touchRuntimePlayer();
    tx.draftState.runtime.player.status.lantern_oil = true;
    store.commitTx(tx);
    state = store.get();

    expect(lightSystem.getTileLightLevel(state, state.runtime.player.x + 3, state.runtime.player.y)).toBe('DIM');
  });

  it('reuses cached chunk data for multiple tiles in same chunk', () => {
    const { store, lightSystem } = setup();
    const state = store.get();

    const before = lightSystem.getDebugRecomputeCount();
    lightSystem.getTileLightNumeric(state, 1, 1);
    lightSystem.getTileLightNumeric(state, 2, 2);
    const after = lightSystem.getDebugRecomputeCount();

    expect(after - before).toBe(1);
  });
});
