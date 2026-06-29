/**
 * Layered Tile System
 * Manages multiple rendering layers similar to Ragnarok Online
 * 
 * Layers:
 * 0 - Ground: Base terrain (grass, dirt, stone, water, sand, snow)
 * 1 - Roads: Paths and roads with proper orientation
 * 2 - Objects: Trees, rocks, bushes (collision objects)
 * 3 - Structures: Buildings, bridges (elevated, can walk under)
 * 4 - Entities: Player, NPCs, monsters (dynamic)
 */

export interface TileData {
  frame: string;
  x: number;
  y: number;
  layer: number;
  collision: boolean;
  height?: number; // For elevation/bridges
}

export interface RoadTile {
  type: 'dirt' | 'stone' | 'bridge';
  orientation: 'horizontal' | 'vertical' | 'corner_ne' | 'corner_nw' | 'corner_se' | 'corner_sw' | 
                't_north' | 't_south' | 't_east' | 't_west' | 'cross' | 'end_n' | 'end_s' | 'end_e' | 'end_w';
}

/**
 * iPad-first logical grid defaults.
 * Uses 64px tiles and a landscape play-space tuned for 1024x768 style viewports.
 */
export const GRID_TILE_SIZE = 64;
export const GRID_COLS_IPAD = 32;
export const GRID_ROWS_IPAD = 24;

/**
 * Inferred terrain movement profile from sprite frame metadata.
 * This lets rendering art drive gameplay behavior in a deterministic way.
 */
export interface TileMovementProfile {
  walkable: boolean;
  terrainType: 'ground' | 'road' | 'water' | 'shallow_water' | 'bridge' | 'blocked';
  depthElevation: number;
}

/**
 * Default cutoff: any water with elevation lower than this is treated as deep/blocked.
 * Values are normalized world depth where 0 = ground, negative = lower than ground.
 */
export const DEEP_WATER_BLOCK_ELEVATION = -0.5;

/**
 * Infer gameplay movement semantics from tile frame names and layer.
 */
export function inferTileMovementProfile(frame: string, layer: number, depthElevation = 0): TileMovementProfile {
  const normalized = frame.toLowerCase();
  const isBridge = normalized.includes('bridge');
  const isWater = normalized.includes('water');
  const isShallow = normalized.includes('shallow');
  const isRoad = normalized.includes('road');
  const isBlockingLayer = layer >= 2 && !isBridge;

  if (isBridge) {
    return { walkable: true, terrainType: 'bridge', depthElevation };
  }

  if (isWater && isShallow) {
    return { walkable: true, terrainType: 'shallow_water', depthElevation };
  }

  if (isWater) {
    return { walkable: false, terrainType: 'water', depthElevation };
  }

  if (isRoad) {
    return { walkable: true, terrainType: 'road', depthElevation };
  }

  if (isBlockingLayer) {
    return { walkable: false, terrainType: 'blocked', depthElevation };
  }

  return { walkable: true, terrainType: 'ground', depthElevation };
}

/**
 * Deep/shallow walkability rule that supports per-texture thresholds.
 */
export function isDepthWalkable(
  depthElevation: number,
  terrainType: TileMovementProfile['terrainType'],
  deepWaterThreshold = DEEP_WATER_BLOCK_ELEVATION
): boolean {
  if (terrainType === 'bridge') return true;
  if (terrainType === 'water') return depthElevation >= deepWaterThreshold;
  if (terrainType === 'blocked') return false;
  return true;
}

/**
 * 4D-like sort key (x, y, layer, depth-elevation) collapsed into a single render depth.
 */
export function toRenderDepth(y: number, layer: number, depthElevation = 0): number {
  return y * 1000 + layer * 100 + Math.round(depthElevation * 10);
}

export class LayeredTileSystem {
  private scene: Phaser.Scene;
  private layers: Map<number, Phaser.GameObjects.Container>;
  private tileSize: number = GRID_TILE_SIZE;
  private tiles: Map<string, TileData>;
  private collisionTiles: Set<string>;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.layers = new Map();
    this.tiles = new Map();
    this.collisionTiles = new Set();
    
    // Create layer containers
    for (let i = 0; i <= 4; i++) {
      const container = scene.add.container(0, 0);
      container.setDepth(toRenderDepth(0, i));
      this.layers.set(i, container);
    }
  }
  
  /**
   * Place a ground tile (layer 0)
   */
  public placeGroundTile(x: number, y: number, tileType: string): void {
    this.placeTile(x, y, 0, tileType, false);
  }
  
  /**
   * Place a road tile with automatic orientation (layer 1)
   */
  public placeRoadTile(x: number, y: number, roadType: 'dirt' | 'stone' | 'bridge', orientation: string): void {
    const frame = `${roadType}_road_${orientation}`;
    this.placeTile(x, y, 1, frame, false);
  }
  
  /**
   * Place an object (tree, rock, bush) with collision (layer 2)
   */
  public placeObject(x: number, y: number, objectType: string, collision: boolean = true): void {
    this.placeTile(x, y, 2, objectType, collision);
  }
  
  /**
   * Place a structure (building, bridge) (layer 3)
   */
  public placeStructure(x: number, y: number, structureType: string, height: number = 0): void {
    const tile = this.placeTile(x, y, 3, structureType, false);
    if (tile) {
      tile.height = height;
    }
  }
  
  /**
   * Internal method to place any tile
   */
  private placeTile(x: number, y: number, layer: number, frame: string, collision: boolean): TileData | null {
    const key = `${x},${y},${layer}`;
    
    // Check which atlas this frame belongs to
    let atlasKey = 'tiles_new';
    if (frame.includes('road') || frame.includes('bridge')) {
      atlasKey = 'roads_new';
    } else if (frame.includes('tree') || frame.includes('rock') || frame.includes('house') || 
               frame.includes('bush') || frame.includes('flowers') || frame.includes('wall') ||
               frame.includes('fence') || frame.includes('door') || frame.includes('window') ||
               frame.includes('sign') || frame.includes('shop')) {
      atlasKey = 'objects_new';
    }
    
    // Create sprite
    const sprite = this.scene.add.sprite(x * this.tileSize, y * this.tileSize, atlasKey, frame);
    sprite.setOrigin(0, 0);
    
    // Scale down from atlas size (256px) to tile size (32px)
    if (atlasKey === 'tiles_new') {
      sprite.setDisplaySize(this.tileSize, this.tileSize);
    } else if (atlasKey === 'roads_new') {
      // Roads vary in size, scale proportionally
      // Roads vary in size, scale proportionally
      const scale = this.tileSize / 172; // Base road tile is 172px
      sprite.setScale(scale);
    } else if (atlasKey === 'objects_new') {
      // Objects keep their relative sizes
      const scale = this.tileSize / 96; // Base unit is 96px (1 tile)
      sprite.setScale(scale);
      
      // Adjust origin for objects to be bottom-center
      sprite.setOrigin(0.5, 1);
      sprite.x += this.tileSize / 2;
      sprite.y += sprite.displayHeight;
    }
    
    // Add to appropriate layer
    const container = this.layers.get(layer);
    if (container) {
      container.add(sprite);
    }
    
    // Store tile data
    const tileData: TileData = {
      frame,
      x,
      y,
      layer,
      collision
    };
    this.tiles.set(key, tileData);
    
    if (collision) {
      this.collisionTiles.add(`${x},${y}`);
    }
    
    return tileData;
  }
  
  /**
   * Check if a position has collision
   */
  public hasCollision(x: number, y: number): boolean {
    const tileX = Math.floor(x / this.tileSize);
    const tileY = Math.floor(y / this.tileSize);
    return this.collisionTiles.has(`${tileX},${tileY}`);
  }
  
  /**
   * Get tile at position and layer
   */
  public getTile(x: number, y: number, layer: number): TileData | undefined {
    return this.tiles.get(`${x},${y},${layer}`);
  }
  
  /**
   * Remove tile at position and layer
   */
  public removeTile(x: number, y: number, layer: number): void {
    const key = `${x},${y},${layer}`;
    const tile = this.tiles.get(key);
    if (tile) {
      this.tiles.delete(key);
      if (tile.collision) {
        this.collisionTiles.delete(`${x},${y}`);
      }
    }
  }
  
  /**
   * Clear all tiles
   */
  public clear(): void {
    this.tiles.clear();
    this.collisionTiles.clear();
    this.layers.forEach(container => container.removeAll(true));
  }
  
  /**
   * Get all tiles in a layer
   */
  public getTilesInLayer(layer: number): TileData[] {
    const result: TileData[] = [];
    this.tiles.forEach(tile => {
      if (tile.layer === layer) {
        result.push(tile);
      }
    });
    return result;
  }
}
