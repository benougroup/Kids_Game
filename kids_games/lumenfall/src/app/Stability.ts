import type { GameState } from '../state/StateTypes';

export const isStableForSave = (state: Readonly<GameState>): boolean => (
  state.runtime.mode === 'EXPLORE'
  && !state.runtime.map.transition
  && !state.runtime.fainting?.active
  && !state.runtime.dialogue.active
  && !state.runtime.crafting.open
  && !state.runtime.inventoryUI.open
);

export const isStableForNewMode = (state: Readonly<GameState>): boolean => (
  !state.runtime.map.transition
  && !state.runtime.fainting?.active
  && state.runtime.mode !== 'MAP_TRANSITION'
  && state.runtime.mode !== 'FAINTING'
);

export const shouldProcessTriggers = (state: Readonly<GameState>): boolean => (
  state.runtime.mode === 'EXPLORE' && isStableForNewMode(state)
);

export const shouldAdvanceTime = (state: Readonly<GameState>): boolean => (
  state.runtime.mode === 'EXPLORE'
  && !state.runtime.time.paused
  && !state.runtime.map.transition
  && !state.runtime.fainting?.active
);
