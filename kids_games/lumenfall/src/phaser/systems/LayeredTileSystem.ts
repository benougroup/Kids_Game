/**
 * Layered Tile System
 * Manages multiple rendering layers similar to Ragnarok Online
 * 
 * Layers:
 * 0 - Background tiles: base terrain (grass, dirt, stone)
 * 1 - Environment overlays: roads + water overlays
 * 2 - Buildings: houses/shops/static structures (blocking)
 * 3 - Large objects: trees/rocks/signs (blocking)
 * 4 - Dynamic actors: entities rendered above map layers
 */

export interface TileData {
  frame: string;
  x: number;
  y: number;
  layer: number;
  collision: boolean;
  elevation: number; // Terrain elevation level (0 = flat ground)
  walkable: boolean;
  movementCost: number;
  terrainType: 'ground' | 'water' | 'road' | 'bridge' | 'object' | 'structure' | 'shallow_water';
}

export interface TileMovementProfile {
  walkable: boolean;
  movementCost: number;
  terrainType: TileData['terrainType'];
}

// Terrain below this elevation is considered deep water and blocks movement,
// unless a bridge tile explicitly overrides traversal.
export const DEEP_WATER_BLOCK_ELEVATION = -0.5;

export const isDepthWalkable = (
  elevation: number,
  terrainType: TileData['terrainType'],
  minWalkableElevation: number = DEEP_WATER_BLOCK_ELEVATION
): boolean => {
  if (terrainType === 'bridge') return true;
  return elevation >= minWalkableElevation;
};

/**
 * Derive movement behavior from tile art frame names.
 *
 * This keeps tile behavior data-driven without hand-coding every map cell.
 */
export const inferTileMovementProfile = (frame: string, layer: number): TileMovementProfile => {
  const id = frame.toLowerCase();

  if (layer === 2) {
    return { walkable: false, movementCost: Infinity, terrainType: 'structure' };
  }

  if (layer === 3) {
    return { walkable: false, movementCost: 2, terrainType: 'object' };
  }

  if (id.includes('water_shallow')) {
    return { walkable: true, movementCost: 1.4, terrainType: 'shallow_water' };
  }

  if (id.includes('water')) {
    return { walkable: false, movementCost: Infinity, terrainType: 'water' };
  }

  if (id.includes('bridge')) {
    return { walkable: true, movementCost: 1, terrainType: 'bridge' };
  }

  if (id.includes('road')) {
    return { walkable: true, movementCost: 0.85, terrainType: 'road' };
  }

  return { walkable: true, movementCost: 1, terrainType: 'ground' };
};

export interface RoadTile {
  type: 'dirt' | 'stone' | 'bridge';
  orientation: 'horizontal' | 'vertical' | 'corner_ne' | 'corner_nw' | 'corner_se' | 'corner_sw' | 
                't_north' | 't_south' | 't_east' | 't_west' | 'cross' | 'end_n' | 'end_s' | 'end_e' | 'end_w';
}

export class LayeredTileSystem {
  private scene: Phaser.Scene;
  private layers: Map<number, Phaser.GameObjects.Container>;
  private tileSize: number = 32;
  private tiles: Map<string, TileData>;
  private collisionTiles: Set<string>;
  private elevationMap: Map<string, number>;
  private walkableMap: Map<string, boolean>;
  private frameMinWalkableElevation: Map<string, number>;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.layers = new Map();
    this.tiles = new Map();
    this.collisionTiles = new Set();
    this.elevationMap = new Map();
    this.walkableMap = new Map();
    this.frameMinWalkableElevation = new Map();
    
    // Create layer containers
    const layerDepthByIndex = [0, 100, 200, 300, 650];
    for (let i = 0; i <= 4; i++) {
      const container = scene.add.container(0, 0);
      container.setDepth(layerDepthByIndex[i]);
      this.layers.set(i, container);
    }
  }
  
  /**
   * Place a ground tile (layer 0)
   */
  public placeGroundTile(x: number, y: number, tileType: string, elevation: number = 0, walkable: boolean = true): void {
    this.placeTile(x, y, 0, tileType, false, elevation, walkable);
  }
  
  /**
   * Place a road tile with automatic orientation (layer 1)
   */
  public placeRoadTile(x: number, y: number, roadType: 'dirt' | 'stone' | 'bridge', orientation: string, elevation: number = 0): void {
    const frame = `${roadType}_road_${orientation}`;
    this.placeTile(x, y, 1, frame, false, elevation, true);
  }
  
  /**
   * Place a large object (tree, rock, bush) with collision (layer 3)
   */
  public placeObject(x: number, y: number, objectType: string, collision: boolean = true): void {
    this.placeTile(x, y, 3, objectType, collision, -1, !collision);
  }
  
  /**
   * Place a structure (building) (layer 2)
   */
  public placeStructure(x: number, y: number, structureType: string, height: number = 0): void {
    if (structureType.includes('bridge')) {
      this.placeTile(x, y, 1, structureType, false, height, true);
      return;
    }

    this.placeTile(x, y, 2, structureType, true, height > 0 ? height : -1, false);
  }
  
  /**
   * Internal method to place any tile
   */
  private placeTile(
    x: number,
    y: number,
    layer: number,
    frame: string,
    collision: boolean,
    elevation: number = 0,
    walkable: boolean = true
  ): TileData | null {
    const key = `${x},${y},${layer}`;
    
    // Check which atlas this frame belongs to
    let atlasKey = 'tiles';
    if (frame.includes('road') || frame.includes('bridge')) {
      atlasKey = 'tiles';
    } else if (frame.includes('tree') || frame.includes('rock') || frame.includes('house') || 
               frame.includes('bush') || frame.includes('flowers') || frame.includes('wall') ||
               frame.includes('fence') || frame.includes('door') || frame.includes('window') ||
               frame.includes('sign') || frame.includes('shop')) {
      atlasKey = 'objects_new';
    }
    
    const resolvedFrame = this.resolveFrame(atlasKey, frame);

    // Create sprite
    const baseX = x * this.tileSize;
    const baseY = y * this.tileSize;
    const sprite = this.scene.add.sprite(baseX, baseY, atlasKey, frame);
    sprite.setFrame(resolvedFrame);
    sprite.setOrigin(0, 0);
    
    // Scale down from atlas size (256px) to tile size (32px)
    if (atlasKey === 'tiles') {
      sprite.setDisplaySize(this.tileSize, this.tileSize);
    } else if (atlasKey === 'objects_new') {
      // New object atlas uses ~96px as one world tile of width.
      const scale = this.tileSize / 96;
      sprite.setScale(scale);

      // Root objects to the tile base so trees/rocks line up with their cell.
      sprite.setOrigin(0.5, 1);
      sprite.x = baseX + this.tileSize / 2;
      sprite.y = baseY + this.tileSize;
    }
    
    // Add to appropriate layer
    const container = this.layers.get(layer);
    if (container) {
      container.add(sprite);
    }
    
    // Store tile data
    const movementProfile = inferTileMovementProfile(resolvedFrame, layer);
    const tileData: TileData = {
      frame: resolvedFrame,
      x,
      y,
      layer,
      collision,
      elevation,
      walkable: walkable && movementProfile.walkable,
      movementCost: movementProfile.movementCost,
      terrainType: movementProfile.terrainType,
    };
    this.tiles.set(key, tileData);

    const tileKey = `${x},${y}`;
    if (layer === 0 || layer === 1) {
      this.elevationMap.set(tileKey, elevation);

      // Layer 0 (ground) always sets the base terrain rules.
      // Layer 1 (roads/bridges) can override only when explicitly walkable,
      // so plain roads won't accidentally make water traversable.
      const minWalkableElevation = this.getFrameMinWalkableElevation(atlasKey, resolvedFrame);
      const nextWalkable = tileData.walkable && !collision && isDepthWalkable(elevation, tileData.terrainType, minWalkableElevation);
      if (layer === 0) {
        this.walkableMap.set(tileKey, nextWalkable);
      } else if (nextWalkable) {
        this.walkableMap.set(tileKey, true);
      }
    }
    
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

  public isWalkableAtWorld(worldX: number, worldY: number, fromWorldX: number, fromWorldY: number): boolean {
    const toX = Math.floor(worldX / this.tileSize);
    const toY = Math.floor(worldY / this.tileSize);
    const fromX = Math.floor(fromWorldX / this.tileSize);
    const fromY = Math.floor(fromWorldY / this.tileSize);

    if (this.collisionTiles.has(`${toX},${toY}`)) return false;
    if (this.walkableMap.get(`${toX},${toY}`) === false) return false;

    const fromElevation = this.getElevationAtTile(fromX, fromY);
    const toElevation = this.getElevationAtTile(toX, toY);

    // Prevent stepping over cliffs higher than one level.
    return Math.abs(toElevation - fromElevation) <= 1;
  }

  public getElevationAtWorld(worldX: number, worldY: number): number {
    const tileX = Math.floor(worldX / this.tileSize);
    const tileY = Math.floor(worldY / this.tileSize);
    return this.getElevationAtTile(tileX, tileY);
  }

  private getElevationAtTile(tileX: number, tileY: number): number {
    return this.elevationMap.get(`${tileX},${tileY}`) ?? 0;
  }



  private getFrameMinWalkableElevation(atlasKey: string, frame: string): number {
    if (this.frameMinWalkableElevation.size === 0) {
      this.loadFrameMovementMetadata();
    }

    return this.frameMinWalkableElevation.get(`${atlasKey}:${frame}`) ?? DEEP_WATER_BLOCK_ELEVATION;
  }

  private loadFrameMovementMetadata(): void {
    const atlasKeys = ['tiles', 'objects_new'];

    for (const atlasKey of atlasKeys) {
      const atlasData = this.scene.cache.json.get(atlasKey) as {
        frames?: Record<string, { movement?: { minWalkableElevation?: number } }>
      } | undefined;

      if (!atlasData?.frames) continue;

      for (const [frameName, frameData] of Object.entries(atlasData.frames)) {
        const minWalkableElevation = frameData?.movement?.minWalkableElevation;
        if (typeof minWalkableElevation === 'number') {
          this.frameMinWalkableElevation.set(`${atlasKey}:${frameName}`, minWalkableElevation);
        }
      }
    }
  }

  private resolveFrame(atlasKey: string, frame: string): string {
    const texture = this.scene.textures.get(atlasKey);
    if (texture && texture.has(frame)) {
      return frame;
    }

    const frameAliases: Record<string, string> = {
      // Ground / water
      grass_plain: 'grass',
      grass_flowers_yellow: 'grass_flowers',
      grass_flowers_blue: 'forest_grass',
      grass_flowers_red: 'grass_flowers',
      grass_rocks: 'mossy_stone',
      dirt_plain: 'dirt',
      stone_plain: 'stone',
      water_plain: 'water',
      water_shallow: 'water',
      // Roads
      dirt_road_vertical: 'dirt',
      dirt_road_horizontal: 'dirt',
      dirt_road_cross: 'dirt',
      stone_road_vertical: 'cobblestone',
      stone_road_horizontal: 'cobblestone',
      stone_road_cross: 'cobblestone',
      // Objects/structures in objects_new atlas already match names.
    };

    const mappedFrame = frameAliases[frame] ?? frame;
    if (texture && texture.has(mappedFrame)) {
      return mappedFrame;
    }

    if (atlasKey === 'objects_new') return 'sign';
    return 'grass';
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
    this.elevationMap.clear();
    this.walkableMap.clear();
    this.frameMinWalkableElevation.clear();
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
