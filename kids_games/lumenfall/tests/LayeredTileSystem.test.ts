import { describe, expect, it } from 'vitest';
import {
  DEEP_WATER_BLOCK_ELEVATION,
  inferTileMovementProfile,
  isDepthWalkable,
} from '../src/phaser/systems/LayeredTileSystem';

describe('inferTileMovementProfile', () => {
  it('marks water tiles as non-walkable', () => {
    const profile = inferTileMovementProfile('water_plain', 0);
    expect(profile.walkable).toBe(false);
    expect(profile.terrainType).toBe('water');
  });

  it('marks bridge tiles as walkable overrides', () => {
    const profile = inferTileMovementProfile('bridge_h', 1);
    expect(profile.walkable).toBe(true);
    expect(profile.terrainType).toBe('bridge');
  });

  it('marks regular road tiles as walkable but does not classify as water', () => {
    const profile = inferTileMovementProfile('dirt_road_horizontal', 1);
    expect(profile.walkable).toBe(true);
    expect(profile.terrainType).toBe('road');
  });
});

describe('isDepthWalkable', () => {
  it('allows shallow water at exactly the threshold', () => {
    expect(isDepthWalkable(DEEP_WATER_BLOCK_ELEVATION, 'water')).toBe(true);
  });

  it('blocks deeper water than the threshold', () => {
    expect(isDepthWalkable(-0.6, 'water')).toBe(false);
  });

  it('always allows bridges even over deep water', () => {
    expect(isDepthWalkable(-1, 'bridge')).toBe(true);
  });

  it('supports per-texture elevation thresholds from atlas metadata', () => {
    expect(isDepthWalkable(-0.75, 'water', -0.8)).toBe(true);
    expect(isDepthWalkable(-0.85, 'water', -0.8)).toBe(false);
  });
});
