import { TILE_SIZE } from '../app/Config';
import { MapSystem } from './MapSystem';
import type { GameState } from '../state/StateTypes';

export class PlayerSystem {
  constructor(private readonly mapSystem: MapSystem) {}

  applyMovementIntent(state: GameState, dx: number, dy: number): { movedTile: boolean; fromX: number; fromY: number } {
    const fromX = state.runtime.player.x;
    const fromY = state.runtime.player.y;

    if (dx === 0 && dy === 0) {
      return { movedTile: false, fromX, fromY };
    }

    const mapId = state.runtime.map.currentMapId;
    const nextX = fromX + dx;
    const nextY = fromY + dy;

    if (!this.mapSystem.isBlocked(mapId, nextX, nextY)) {
      state.runtime.player.x = nextX;
      state.runtime.player.y = nextY;
    }

    if (dx > 0) state.runtime.player.facing = 'right';
    if (dx < 0) state.runtime.player.facing = 'left';
    if (dy > 0) state.runtime.player.facing = 'down';
    if (dy < 0) state.runtime.player.facing = 'up';

    return {
      movedTile: state.runtime.player.x !== fromX || state.runtime.player.y !== fromY,
      fromX,
      fromY,
    };
  }

  smoothPixels(state: GameState, dtMs: number): void {
    const lerp = Math.min(1, (dtMs / 1000) * 14);
    const targetPx = state.runtime.player.x * TILE_SIZE;
    const targetPy = state.runtime.player.y * TILE_SIZE;

    state.runtime.player.px += (targetPx - state.runtime.player.px) * lerp;
    state.runtime.player.py += (targetPy - state.runtime.player.py) * lerp;
  }
}
