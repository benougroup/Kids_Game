import { MONSTER_DEFINITIONS } from './EntityRegistry';

const LOOSE_CREATURE_PATHS: Record<string, string> = {
  rabbit: 'assets/sprites/creatures/animals_peaceful/rabbit',
  bird: 'assets/sprites/creatures/animals_peaceful/bird',
  slime: 'assets/sprites/creatures/monsters/slime',
};

export function getLooseCreatureFrameLoads(): Array<{ key: string; path: string }> {
  const loads = new Map<string, string>();

  for (const def of Object.values(MONSTER_DEFINITIONS)) {
    for (const frame of Object.values(def.frames).flatMap((value) => Array.isArray(value) ? value : [value])) {
      const [prefix, ...nameParts] = frame.split('_');
      const basePath = LOOSE_CREATURE_PATHS[prefix];
      const fileName = nameParts.join('_');
      if (!basePath || !fileName) continue;
      loads.set(frame, `${basePath}/${fileName}.png`);
    }
  }

  return [...loads.entries()].map(([key, path]) => ({ key, path }));
}
