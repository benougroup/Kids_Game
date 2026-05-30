import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MONSTER_DEFINITIONS, NPC_DEFINITIONS } from '../src/phaser/systems/EntityRegistry';
import { getLooseCreatureFrameLoads, resolveLooseCreatureFrame } from '../src/phaser/systems/CreatureAssets';

const atlasFrameSets = new Map<string, Set<string>>();
for (const atlas of ['characters']) {
  const data = JSON.parse(readFileSync(join(process.cwd(), 'public/assets', `${atlas}.json`), 'utf8')) as { frames: Record<string, unknown> };
  atlasFrameSets.set(atlas, new Set(Object.keys(data.frames)));
}


function frameList(frames: Record<string, string | string[]>): string[] {
  return Object.values(frames).flatMap((frame) => Array.isArray(frame) ? frame : [frame]);
}

describe('Phaser entity assets', () => {
  it('references atlas frames or loose creature images that exist at startup', () => {
    const missing: string[] = [];
    const definitions = { ...NPC_DEFINITIONS, ...MONSTER_DEFINITIONS };

    for (const [id, def] of Object.entries(definitions)) {
      const atlasFrames = atlasFrameSets.get(def.atlas);
      for (const frame of frameList(def.frames)) {
        if (atlasFrames?.has(frame)) continue;

        if (frame.startsWith('dragon_')) continue; // Dragon frames are generated procedurally at runtime.

        const loose = resolveLooseCreatureFrame(frame);
        if (loose && existsSync(join(process.cwd(), 'public', loose.path))) continue;

        missing.push(`${id}: ${def.atlas}/${frame}`);
      }
    }

    expect(missing).toEqual([]);
  });

  it('preloads every loose creature frame referenced by startup entities', () => {
    const loadedKeys = new Set(getLooseCreatureFrameLoads().map((asset) => asset.key));
    const missingPreloads: string[] = [];

    for (const [id, def] of Object.entries(MONSTER_DEFINITIONS)) {
      for (const frame of frameList(def.frames)) {
        if (resolveLooseCreatureFrame(frame) && !loadedKeys.has(frame)) {
          missingPreloads.push(`${id}: ${frame}`);
        }
      }
    }

    expect(missingPreloads).toEqual([]);
  });
});
