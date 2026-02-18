import { describe, expect, it } from 'vitest';
import { inferTileMovementProfile } from '../src/phaser/systems/LayeredTileSystem';

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
