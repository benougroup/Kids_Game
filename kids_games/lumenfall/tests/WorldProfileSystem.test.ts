import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/state/StateTypes';
import { MapSystem, type NpcDefinition } from '../src/systems/MapSystem';
import { WorldProfileSystem } from '../src/systems/WorldProfileSystem';

describe('WorldProfileSystem', () => {
  it('enforces depth movement rule from profile', () => {
    const system = new WorldProfileSystem();
    expect(system.canStepDepth(0, -1)).toBe(false);
    expect(system.canStepDepth(0, -0.5)).toBe(true);
    expect(system.canStepDepth(0, 1)).toBe(false);
  });

  it('combines shadow spawn multipliers for phase and weather', () => {
    const system = new WorldProfileSystem();
    expect(system.getShadowSpawnMultiplier('DAY', 'CLEAR')).toBe(0);
    expect(system.getShadowSpawnMultiplier('NIGHT', 'FOG')).toBe(1.35);
  });

  it('resolves npc status using behavior profile and panic boosts', () => {
    const system = new WorldProfileSystem();
    expect(
      system.resolveNpcStatus({
        behaviorProfileId: 'commoner',
        basePanic: 50,
        phase: 'NIGHT',
        weather: 'FOG',
      }),
    ).toBe('panic');
  });
});

describe('MapSystem npc runtime status', () => {
  it('delegates to world profile behavior rules', () => {
    const mapSystem = new MapSystem();
    const state = createInitialState();
    state.runtime.time.phase = 'DUSK';
    state.story.npc.townFear = 20;

    const npc: NpcDefinition = {
      id: 'test_commoner',
      name: 'Test Commoner',
      mapId: state.runtime.map.currentMapId,
      x: state.runtime.player.x,
      y: state.runtime.player.y,
      spriteId: 'npc_test',
      behaviorProfileId: 'commoner',
      interaction: {
        storyId: 'demo',
        defaultSceneId: 'demo_start',
      },
    };

    const status = mapSystem.resolveNpcRuntimeStatus(state, npc, 'FOG');
    expect(status).toBe('talking');
  });
});
