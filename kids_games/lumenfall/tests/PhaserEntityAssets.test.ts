import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MONSTER_DEFINITIONS, NPC_DEFINITIONS } from '../src/phaser/systems/EntityRegistry';
import { getLooseCreatureFrameLoads } from '../src/phaser/systems/CreatureAssets';

const atlasFrameSets = new Map<string, Set<string>>();
for (const atlas of ['characters']) {
  const data = JSON.parse(readFileSync(join(process.cwd(), 'public/assets', `${atlas}.json`), 'utf8')) as { frames: Record<string, unknown> };
  atlasFrameSets.set(atlas, new Set(Object.keys(data.frames)));
}

const looseTexturePaths: Record<string, string> = {
  rabbit: 'public/assets/sprites/creatures/animals_peaceful/rabbit',
  bird: 'public/assets/sprites/creatures/animals_peaceful/bird',
  slime: 'public/assets/sprites/creatures/monsters/slime',
};

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

        const [prefix, ...nameParts] = frame.split('_');
        const looseDir = looseTexturePaths[prefix];
        const looseName = nameParts.join('_');
        if (looseDir && looseName && existsSync(join(process.cwd(), looseDir, `${looseName}.png`))) continue;

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
        const [prefix] = frame.split('_');
        if (looseTexturePaths[prefix] && !loadedKeys.has(frame)) {
          missingPreloads.push(`${id}: ${frame}`);
        }
      }
    }

    expect(missingPreloads).toEqual([]);
  });
});
