/**
 * Tile System - Height-based passability rules
 * 
 * Height levels:
 *   -3 = Void/Chasm (impassable, fall damage)
 *   -2 = Deep water (impassable for most)
 *   -1 = Shallow water (impassable by default, some can pass)
 *    0 = Ground level (walkable by all)
 *    1 = Low obstacle (bushes, shallow steps - walkable with penalty)
 *    2 = Wall/Building (impassable for most)
 *    3 = High wall/Mountain (impassable for all)
 * 
 * Entity movement flags:
 *   canFly      - ignores all height restrictions (birds, fairies)
 *   canSwim     - can enter water tiles (height -2, -1)
 *   canPhase    - can pass through walls (shadows, ghosts)
 *   canClimb    - can scale height differences > 1
 *   isGhost     - can pass through height -1 to 2 (shadows)
 */

export interface TileData {
  frame: string;
  atlas: string;
  height: number;          // -3 to +3
  isWater: boolean;
  isExit?: boolean;
  exitDirection?: string;
  damage?: number;         // Damage per second while standing on tile (lava, poison)
  slowFactor?: number;     // Movement speed multiplier (0.5 = half speed in mud)
  label?: string;          // Debug label
}

export interface EntityMovementFlags {
  canFly?: boolean;        // Ignores all height restrictions
  canSwim?: boolean;       // Can enter water (height -2, -1)
  canPhase?: boolean;      // Can pass through walls (height 2, 3)
  canClimb?: boolean;      // Can scale height differences > 1
  isGhost?: boolean;       // Shadow-type: pass through -1 to 2, blocked by 3
  maxHeightStep?: number;  // Max height difference per step (default 1)
}

export const DEFAULT_FLAGS: EntityMovementFlags = {
  canFly: false,
  canSwim: false,
  canPhase: false,
  canClimb: false,
  isGhost: false,
  maxHeightStep: 1,
};

export const SHADOW_FLAGS: EntityMovementFlags = {
  canFly: false,
  canSwim: false,
  canPhase: true,   // Shadows pass through walls
  canClimb: true,
  isGhost: true,    // Ghost-type movement
  maxHeightStep: 3,
};

export const GHOST_FLAGS: EntityMovementFlags = {
  canFly: true,     // Ghosts float
  canSwim: true,
  canPhase: true,
  canClimb: true,
  isGhost: true,
  maxHeightStep: 10,
};

export const SWIM_FLAGS: EntityMovementFlags = {
  ...DEFAULT_FLAGS,
  canSwim: true,
  maxHeightStep: 1,
};

/**
 * Check if an entity with given flags can move from one tile to another
 */
export function canMoveTo(
  fromHeight: number,
  toHeight: number,
  flags: EntityMovementFlags = DEFAULT_FLAGS
): boolean {
  // Flying entities ignore everything
  if (flags.canFly) return true;

  // Ghost/shadow entities
  if (flags.isGhost) {
    // Ghosts can pass through most things but not void or very high walls
    return toHeight > -3 && toHeight < 3;
  }

  // Phasing entities pass through walls (height 2+)
  if (flags.canPhase && toHeight >= 2) return true;

  // Void/chasm - nobody can enter (except flying)
  if (toHeight <= -3) return false;

  // Deep water - only swimmers
  if (toHeight === -2) return flags.canSwim === true;

  // Shallow water - only swimmers
  if (toHeight === -1) return flags.canSwim === true;

  // Walls and buildings (height 2+) - impassable
  if (toHeight >= 2) return false;

  // Check height step (can't jump up cliffs)
  const heightDiff = toHeight - fromHeight;
  const maxStep = flags.maxHeightStep ?? 1;
  if (heightDiff > maxStep) return false;

  // Ground and low obstacles (height 0-1) - walkable
  return true;
}

/**
 * Get tile effect for entity standing on tile
 */
export function getTileEffect(tile: TileData): { damage: number; speedFactor: number } {
  return {
    damage: tile.damage ?? 0,
    speedFactor: tile.slowFactor ?? 1.0,
  };
}

/**
 * Predefined tile templates for common tile types
 */
export const TILE_TEMPLATES: Record<string, Partial<TileData>> = {
  // Ground level (height 0)
  grass:        { height: 0, isWater: false },
  dirt:         { height: 0, isWater: false },
  stone:        { height: 0, isWater: false },
  sand:         { height: 0, isWater: false },
  snow:         { height: 0, isWater: false, slowFactor: 0.7 },
  ice:          { height: 0, isWater: false, slowFactor: 0.5 },
  wood_floor:   { height: 0, isWater: false },
  
  // Low obstacles (height 1) - walkable with slow
  bush:         { height: 1, isWater: false, slowFactor: 0.6 },
  mud:          { height: 0, isWater: false, slowFactor: 0.4 },
  
  // Water (height -1 to -2)
  shallow_water: { height: -1, isWater: true, slowFactor: 0.5 },
  deep_water:    { height: -2, isWater: true },
  
  // Hazardous (height 0 with damage)
  lava:         { height: -1, isWater: false, damage: 5, label: 'lava' },
  poison_swamp: { height: -1, isWater: true, damage: 1, slowFactor: 0.3 },
  
  // Walls (height 2-3)
  wall:         { height: 2, isWater: false },
  cliff:        { height: 3, isWater: false },
  mountain:     { height: 3, isWater: false },
  
  // Void
  void:         { height: -3, isWater: false, damage: 999 },
};

/**
 * TileGrid - manages a 2D grid of tiles with height data
 */
export class TileGrid {
  private grid: TileData[][];
  private cols: number;
  private rows: number;
  private tileSize: number;

  constructor(cols: number, rows: number, tileSize: number) {
    this.cols = cols;
    this.rows = rows;
    this.tileSize = tileSize;
    
    // Initialize with default grass tiles
    this.grid = [];
    for (let y = 0; y < rows; y++) {
      this.grid[y] = [];
      for (let x = 0; x < cols; x++) {
        this.grid[y][x] = {
          frame: 'grass_plain_01',
          atlas: 'terrain_grassland',
          height: 0,
          isWater: false,
        };
      }
    }
  }

  setTile(tileX: number, tileY: number, data: TileData): void {
    if (tileX < 0 || tileX >= this.cols || tileY < 0 || tileY >= this.rows) return;
    this.grid[tileY][tileX] = data;
  }

  getTile(tileX: number, tileY: number): TileData | null {
    if (tileX < 0 || tileX >= this.cols || tileY < 0 || tileY >= this.rows) return null;
    return this.grid[tileY][tileX];
  }

  getTileAtWorld(worldX: number, worldY: number): TileData | null {
    const tileX = Math.floor(worldX / this.tileSize);
    const tileY = Math.floor(worldY / this.tileSize);
    return this.getTile(tileX, tileY);
  }

  canEntityMoveTo(
    worldX: number,
    worldY: number,
    fromWorldX: number,
    fromWorldY: number,
    flags: EntityMovementFlags = DEFAULT_FLAGS
  ): boolean {
    const toTile = this.getTileAtWorld(worldX, worldY);
    const fromTile = this.getTileAtWorld(fromWorldX, fromWorldY);
    
    if (!toTile) return false; // Out of bounds
    
    const fromHeight = fromTile?.height ?? 0;
    return canMoveTo(fromHeight, toTile.height, flags);
  }

  isWalkable(worldX: number, worldY: number, flags: EntityMovementFlags = DEFAULT_FLAGS): boolean {
    const tile = this.getTileAtWorld(worldX, worldY);
    if (!tile) return false;
    return canMoveTo(0, tile.height, flags);
  }

  getEffect(worldX: number, worldY: number): { damage: number; speedFactor: number } {
    const tile = this.getTileAtWorld(worldX, worldY);
    if (!tile) return { damage: 0, speedFactor: 1 };
    return getTileEffect(tile);
  }

  getCols(): number { return this.cols; }
  getRows(): number { return this.rows; }
  getTileSize(): number { return this.tileSize; }
  getWidth(): number { return this.cols * this.tileSize; }
  getHeight(): number { return this.rows * this.tileSize; }
}
