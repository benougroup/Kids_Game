import { describe, expect, it } from 'vitest';
import { AnimationPlayer, type Clip } from '../src/engine/Animation';

describe('AnimationPlayer', () => {
  it('advances frames deterministically with looping', () => {
    const clips: Record<string, Clip> = {
      idle: { frames: ['a', 'b'], frameDurationMs: 100, loop: true },
    };
    const player = new AnimationPlayer(clips, 'idle');

    expect(player.currentFrameSpriteId()).toBe('a');
    player.update(100);
    expect(player.currentFrameSpriteId()).toBe('b');
    player.update(100);
    expect(player.currentFrameSpriteId()).toBe('a');
  });
});
