import { MONSTER_DEFINITIONS } from './EntityRegistry';

export const LOOSE_CREATURE_PATHS: Record<string, string> = {
  rabbit: 'assets/sprites/creatures/animals_peaceful/rabbit',
  bird: 'assets/sprites/creatures/animals_peaceful/bird',
  slime: 'assets/sprites/creatures/monsters/slime',
  wolf: 'assets/sprites/creatures/animals_aggressive/wolf',
  zombie: 'assets/sprites/creatures/undead/zombie',
  demon: 'assets/sprites/creatures/dark_entities/demon',
  skeleton: 'assets/sprites/creatures/undead/skeleton',
  ghost: 'assets/sprites/creatures/undead/ghost',
  shadow_wraith: 'assets/sprites/creatures/dark_entities/shadow_wraith',
  void_creature: 'assets/sprites/creatures/dark_entities/void_creature',
  dark_knight: 'assets/sprites/creatures/dark_entities/dark_knight',
  boar: 'assets/sprites/creatures/animals_aggressive/boar',
  bear: 'assets/sprites/creatures/animals_aggressive/bear',
  snake: 'assets/sprites/creatures/animals_aggressive/snake',
};

export function resolveLooseCreatureFrame(frame: string): { prefix: string; fileName: string; path: string } | null {
  const prefix = Object.keys(LOOSE_CREATURE_PATHS)
    .sort((a, b) => b.length - a.length)
    .find((candidate) => frame.startsWith(`${candidate}_`));

  if (!prefix) return null;

  const fileName = frame.slice(prefix.length + 1);
  if (!fileName) return null;

  return { prefix, fileName, path: `${LOOSE_CREATURE_PATHS[prefix]}/${fileName}.png` };
}

export function getLooseCreatureFrameLoads(): Array<{ key: string; path: string }> {
  const loads = new Map<string, string>();

  for (const def of Object.values(MONSTER_DEFINITIONS)) {
    for (const frame of Object.values(def.frames).flatMap((value) => Array.isArray(value) ? value : [value])) {
      const loose = resolveLooseCreatureFrame(frame);
      if (!loose) continue;
      loads.set(frame, loose.path);
    }
  }

  return [...loads.entries()].map(([key, path]) => ({ key, path }));
}
