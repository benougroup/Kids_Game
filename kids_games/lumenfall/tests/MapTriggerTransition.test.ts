import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/state/StateTypes';
import { MapSystem, advanceMapTransition, applyTransitionSwap } from '../src/systems/MapSystem';
import { TriggerSystem } from '../src/systems/TriggerSystem';
import { EventBus } from '../src/app/EventBus';
import { CommandQueue } from '../src/app/Commands';

describe('MapSystem collisions', () => {
  it('isBlocked returns collision state', () => {
    const mapSystem = new MapSystem();
    expect(mapSystem.isBlocked('bright_hollow', 0, 0)).toBe(true);
    expect(mapSystem.isBlocked('bright_hollow', 15, 9)).toBe(false);
    expect(mapSystem.isBlocked('bright_hollow', -1, 5)).toBe(true);
  });
});

describe('TriggerSystem behavior', () => {
  it('once triggers fire only once', () => {
    const state = createInitialState();
    const mapSystem = new MapSystem();
    const triggerSystem = new TriggerSystem(mapSystem);
    const queue = new CommandQueue(new EventBus());

    state.runtime.player.x = 14;
    state.runtime.player.y = 8;

    triggerSystem.evaluate(state, queue, {
      movedTile: true,
      fromX: 12,
      fromY: 8,
      interactPressed: false,
      nowMs: 100,
    });
    const first = queue.drain();

    triggerSystem.evaluate(state, queue, {
      movedTile: true,
      fromX: 12,
      fromY: 8,
      interactPressed: false,
      nowMs: 200,
    });
    const second = queue.drain();

    expect(first.some((cmd) => cmd.kind === 'UiMessage')).toBe(true);
    expect(second.some((cmd) => cmd.kind === 'UiMessage')).toBe(false);
  });

  it('onEnterArea only fires on boundary crossing', () => {
    const state = createInitialState();
    const mapSystem = new MapSystem();
    const triggerSystem = new TriggerSystem(mapSystem);
    const queue = new CommandQueue(new EventBus());

    state.runtime.player.x = 14;
    state.runtime.player.y = 9;

    triggerSystem.evaluate(state, queue, {
      movedTile: true,
      fromX: 14,
      fromY: 8,
      interactPressed: false,
      nowMs: 100,
    });

    const first = queue.drain();

    triggerSystem.evaluate(state, queue, {
      movedTile: true,
      fromX: 12,
      fromY: 9,
      interactPressed: false,
      nowMs: 200,
    });

    const second = queue.drain();

    expect(first.length).toBe(0);
    expect(second.some((cmd) => cmd.kind === 'UiMessage')).toBe(true);
  });
});

describe('Map transition state machine', () => {
  it('reaches explore and updates map/player', () => {
    const state = createInitialState();
    let transition = {
      toMapId: 'light_hall',
      toX: 6,
      toY: 9,
      phase: 'fadeOut' as const,
      t: 0,
    };

    const first = advanceMapTransition(transition, 200);
    expect(first.shouldSwap).toBe(true);
    expect(first.transition?.phase).toBe('swap');
    applyTransitionSwap(state, transition);

    const second = advanceMapTransition(first.transition!, 16);
    expect(second.transition?.phase).toBe('fadeIn');

    const third = advanceMapTransition(second.transition!, 200);
    expect(third.transition).toBeNull();

    state.runtime.mode = 'MAP_TRANSITION';
    if (third.transition === null) {
      state.runtime.mode = 'EXPLORE';
      state.runtime.time.paused = false;
    }

    expect(state.runtime.mode).toBe('EXPLORE');
    expect(state.runtime.map.currentMapId).toBe('light_hall');
    expect(state.runtime.player.x).toBe(6);
    expect(state.runtime.player.y).toBe(9);
  });
});
