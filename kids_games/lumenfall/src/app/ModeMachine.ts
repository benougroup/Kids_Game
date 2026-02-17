import timeConfig from '../data/timeConfig.json';

export const GAME_MODES = [
  'LOADING',
  'EXPLORE',
  'DIALOGUE',
  'INVENTORY',
  'CRAFTING',
  'MAP_TRANSITION',
  'FAINTING',
  'MENU',
] as const;

export type Mode = (typeof GAME_MODES)[number];

const transitions: Readonly<Record<Mode, readonly Mode[]>> = {
  LOADING: ['EXPLORE', 'MENU'],
  EXPLORE: ['DIALOGUE', 'INVENTORY', 'CRAFTING', 'MAP_TRANSITION', 'FAINTING', 'MENU'],
  DIALOGUE: ['EXPLORE', 'MENU'],
  INVENTORY: ['EXPLORE', 'MENU'],
  CRAFTING: ['EXPLORE', 'MENU'],
  MAP_TRANSITION: ['EXPLORE', 'FAINTING', 'MENU'],
  FAINTING: ['MENU', 'EXPLORE'],
  MENU: ['EXPLORE'],
};

const pausedModes = new Set<Mode>(timeConfig.pauseTimeInModes as Mode[]);

export class ModeMachine {
  isValidMode(mode: string): mode is Mode {
    return (GAME_MODES as readonly string[]).includes(mode);
  }

  requestMode(currentMode: Mode, nextMode: Mode): Mode {
    if (currentMode === nextMode) {
      return currentMode;
    }

    if (transitions[currentMode].includes(nextMode)) {
      return nextMode;
    }

    return currentMode;
  }

  timePausedInMode(mode: Mode): boolean {
    return pausedModes.has(mode);
  }
}
