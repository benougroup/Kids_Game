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
  elevation: number; // Terrain elevation level (0 = flat ground)
  walkable: boolean;
}

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
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.layers = new Map();
    this.tiles = new Map();
    this.collisionTiles = new Set();
    this.elevationMap = new Map();
    this.walkableMap = new Map();
    
    // Create layer containers
    for (let i = 0; i <= 4; i++) {
      const container = scene.add.container(0, 0);
      container.setDepth(i * 100);
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
   * Place an object (tree, rock, bush) with collision (layer 2)
   */
  public placeObject(x: number, y: number, objectType: string, collision: boolean = true): void {
    this.placeTile(x, y, 2, objectType, collision, this.getElevationAtTile(x, y), !collision);
  }
  
  /**
   * Place a structure (building, bridge) (layer 3)
   */
  public placeStructure(x: number, y: number, structureType: string, height: number = 0): void {
    this.placeTile(x, y, 3, structureType, true, height, false);
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
    let atlasKey = 'tiles_new';
    if (frame.includes('road') || frame.includes('bridge')) {
      atlasKey = 'roads_new';
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

      // Anchor multi-cell objects to the tile's ground contact point.
      // This keeps trees/buildings rooted to the intended cell instead of drifting down.
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
    const tileData: TileData = {
      frame: resolvedFrame,
      x,
      y,
      layer,
      collision,
      elevation,
      walkable
    };
    this.tiles.set(key, tileData);

    const tileKey = `${x},${y}`;
    if (layer === 0 || layer === 1) {
      this.elevationMap.set(tileKey, elevation);
      this.walkableMap.set(tileKey, walkable && !collision);
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

  private resolveFrame(atlasKey: string, frame: string): string {
    const texture = this.scene.textures.get(atlasKey);
    if (texture && texture.has(frame)) {
      return frame;
    }

    if (atlasKey === 'objects_new') return 'sign';
    if (atlasKey === 'roads_new') return 'dirt_road_horizontal';
    return 'grass_plain';
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
