import { describe, expect, it } from 'vitest';
import { EventBus, type AppEvent } from '../src/app/EventBus';
import { ModeMachine } from '../src/app/ModeMachine';
import { TimeSystem } from '../src/systems/TimeSystem';
import { StateStore } from '../src/state/StateStore';

const setup = () => {
  const bus = new EventBus();
  const modeMachine = new ModeMachine();
  const timeSystem = new TimeSystem({ bus, modeMachine });
  const store = new StateStore();
  const events: AppEvent[] = [];

  bus.on('TIME_PHASE_CHANGED', (event) => events.push(event));
  bus.on('TIME_PHASE_START', (event) => events.push(event));
  bus.on('TIME_TICK', (event) => events.push(event));
  bus.on('DAY_START', (event) => events.push(event));

  return { timeSystem, store, events };
};

describe('TimeSystem', () => {
  it('advances in EXPLORE and pauses in MENU', () => {
    const { timeSystem, store } = setup();

    const tx1 = store.beginTx('advance');
    timeSystem.update(1000, tx1);
    store.commitTx(tx1);
    expect(store.get().runtime.time.secondsIntoCycle).toBeCloseTo(1, 5);

    const tx2 = store.beginTx('pause');
    tx2.touchRuntime();
    tx2.draftState.runtime.mode = 'MENU';
    timeSystem.update(1000, tx2);
    store.commitTx(tx2);

    expect(store.get().runtime.time.secondsIntoCycle).toBeCloseTo(1, 5);
    expect(store.get().runtime.time.paused).toBe(true);
  });

  it('emits phase transitions on exact boundaries', () => {
    const { timeSystem, store, events } = setup();

    const tx = store.beginTx('boundary');
    timeSystem.update(300_000, tx);
    store.commitTx(tx);

    const phaseChanges = events.filter((event) => event.type === 'TIME_PHASE_CHANGED');
    expect(phaseChanges).toHaveLength(1);
    expect(phaseChanges[0]).toMatchObject({ from: 'DAY', to: 'DUSK' });
    expect(store.get().runtime.time.phase).toBe('DUSK');
  });

  it('increments dayCount and emits DAY_START when cycle wraps', () => {
    const { timeSystem, store, events } = setup();

    const tx = store.beginTx('wrap');
    timeSystem.update(630_000, tx);
    store.commitTx(tx);

    const dayStart = events.find((event) => event.type === 'DAY_START');
    expect(dayStart).toBeDefined();
    expect(store.get().runtime.time.dayCount).toBe(2);
    expect(store.get().runtime.time.phase).toBe('DAY');
  });

  it('emits exact tick count only while advancing', () => {
    const { timeSystem, store, events } = setup();

    const tx1 = store.beginTx('ticks');
    timeSystem.update(3_400, tx1);
    store.commitTx(tx1);

    const tx2 = store.beginTx('ticks-paused');
    tx2.touchRuntime();
    tx2.draftState.runtime.mode = 'DIALOGUE';
    timeSystem.update(5_000, tx2);
    store.commitTx(tx2);

    const ticks = events.filter((event) => event.type === 'TIME_TICK');
    expect(ticks).toHaveLength(3);
    expect(store.get().runtime.time.lastTickAtSeconds).toBe(3);
  });

  it('does not skip phase events on large dt', () => {
    const { timeSystem, store, events } = setup();

    const tx = store.beginTx('large-dt');
    timeSystem.update(320_000, tx);
    store.commitTx(tx);

    const phaseChanges = events.filter((event) => event.type === 'TIME_PHASE_CHANGED');
    expect(phaseChanges).toHaveLength(2);
    expect(phaseChanges[0]).toMatchObject({ from: 'DAY', to: 'DUSK' });
    expect(phaseChanges[1]).toMatchObject({ from: 'DUSK', to: 'NIGHT' });
    expect(store.get().runtime.time.phase).toBe('NIGHT');
  });
});
