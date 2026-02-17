import type { GameState } from './StateTypes';

export const selectPlayerTile = (state: Readonly<GameState>): { x: number; y: number } => ({
  x: state.runtime.player.x,
  y: state.runtime.player.y,
});

export const selectPlayerPixel = (state: Readonly<GameState>): { px: number; py: number } => ({
  px: state.runtime.player.px,
  py: state.runtime.player.py,
});

export const selectMode = (state: Readonly<GameState>) => state.runtime.mode;
