import { describe, expect, it } from 'vitest';
import { resolveTileSpriteId } from '../src/engine/Renderer';

describe('Renderer sprite selection', () => {
  it('prefers tile spriteId when available', () => {
    expect(resolveTileSpriteId({ spriteId: 'tile_grass' })).toBe('tile_grass');
  });

  it('falls back when spriteId is missing', () => {
    expect(resolveTileSpriteId({})).toBeNull();
  });
});
