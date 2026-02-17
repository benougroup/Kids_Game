import type { GameState } from './StateTypes';

export const CURRENT_SAVE_VERSION = 1;

export const LUMENFALL_SAVE_TEMP = 'lumenfall_save_temp';
export const LUMENFALL_SAVE_MAIN = 'lumenfall_save_main';
export const LUMENFALL_SAVE_BACKUP = 'lumenfall_save_backup';

export type SaveFile = {
  saveVersion: number;
  createdAtMs: number;
  updatedAtMs: number;
  global: GameState['global'];
  story: GameState['story'];
  runtime: {
    time: GameState['runtime']['time'];
    map: {
      currentMapId: string;
      mapsVisited: Record<string, { lastX: number; lastY: number }>;
    };
    player: {
      x: number;
      y: number;
      facing: GameState['runtime']['player']['facing'];
      hp: number;
      sp: number;
      status: Record<string, { expiresAtMs: number }>;
    };
    checkpoint: GameState['runtime']['checkpoint'];
  };
};

export const isSaveFileLike = (value: unknown): value is SaveFile => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<SaveFile>;
  return typeof candidate.saveVersion === 'number' && !!candidate.global && !!candidate.story && !!candidate.runtime;
};
