import { describe, expect, it } from 'vitest';
import { AssetManager } from '../src/engine/AssetManager';

describe('AssetManager', () => {
  it('parses atlas sprite rects and resolves by id', () => {
    const manager = new AssetManager();
    const rects = manager.parseAtlas({
      sprites: {
        tile_grass: { x: 0, y: 0, w: 32, h: 32 },
      },
    });
    expect(rects.tile_grass).toEqual({ x: 0, y: 0, w: 32, h: 32 });
  });

  it('returns null for missing sprite', () => {
    const manager = new AssetManager();
    expect(manager.getSpriteRect('missing')).toBeNull();
  });
});
