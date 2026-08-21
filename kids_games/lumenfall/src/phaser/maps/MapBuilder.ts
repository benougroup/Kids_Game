/**
 * MapBuilder - Reusable map construction system
 * 
 * Maps are defined as JSON data files with:
 * - Ground layer (terrain tiles)
 * - Object layer (trees, rocks, props)
 * - Structure layer (buildings)
 * - Entity layer (NPCs, monsters)
 * - Exit definitions (N/E/S/W portals)
 * 
 * Each tile has a height property for passability.
 * 
 * Usage:
 *   const builder = new MapBuilder(scene, 'town');
 *   builder.build(mapData);
 */

import Phaser from 'phaser';
import { TileGrid, TileData, EntityMovementFlags, DEFAULT_FLAGS } from '../systems/TileSystem';
import { Entity } from '../entities/Entity';
import { NPC_DEFINITIONS, MONSTER_DEFINITIONS, EntityDefinition } from '../systems/EntityRegistry';
import { toRenderDepth } from '../systems/LayeredTileSystem';
import { getSpriteKey, getSpriteCategorySize } from '../systems/SpriteLoader';

export interface MapExit {
  direction: 'north' | 'south' | 'east' | 'west';
  tileX: number;
  tileY: number;
  width: number;        // How many tiles wide the exit is
  targetMap: string;
  targetTileX: number;
  targetTileY: number;
}

export interface MapTileEntry {
  x: number;
  y: number;
  frame: string;
  atlas: string;
  label?: string;         // Optional debug label rendered above sprite
  height: number;
  isWater?: boolean;
  damage?: number;
  slowFactor?: number;
  widthTiles?: number;
  heightTiles?: number;
  pixelWidth?: number;    // Override display width in pixels (for correct aspect ratio)
  pixelHeight?: number;   // Override display height in pixels (for correct aspect ratio)
  collisionW?: number;    // Collision footprint width in tiles (defaults to widthTiles)
  collisionH?: number;    // Collision footprint height in tiles (defaults to heightTiles)
  yOffset?: number;       // Pixel offset to shift sprite upward (negative = up) relative to tile position
}

export interface MapEntityEntry {
  x: number;
  y: number;
  entityId: string;
  name?: string;        // Override default name
  dialogueKey?: string; // Override dialogue key
}

export interface MapData {
  id: string;
  name: string;
  cols: number;
  rows: number;
  tileSize: number;
  bgMusic?: string;
  ambientLight?: number;  // 0-1, how dark the map is
  
  // Tile layers
  groundLayer: MapTileEntry[];
  objectLayer: MapTileEntry[];
  structureLayer: MapTileEntry[];
  
  // Entities
  npcs: MapEntityEntry[];
  monsters: MapEntityEntry[];
  
  // Exits
  exits: MapExit[];
}

export class MapBuilder {
  private scene: Phaser.Scene;
  private tileGrid: TileGrid;
  private entities: Entity[] = [];
  private exits: MapExit[] = [];
  private allSprites: Phaser.GameObjects.Sprite[] = [];
  private allLabels: Phaser.GameObjects.Text[] = [];

  constructor(scene: Phaser.Scene, cols: number, rows: number, tileSize: number = 64) {
    this.scene = scene;
    this.tileGrid = new TileGrid(cols, rows, tileSize);
  }

  /**
   * Build a map from data definition
   */
  public build(mapData: MapData): void {
    this.exits = mapData.exits;

    // Layer 0: Ground
    this.buildLayer(mapData.groundLayer, 0);
    
    // Layer 1: Objects (trees, rocks)
    this.buildLayer(mapData.objectLayer, 100);
    
    // Layer 2: Structures (buildings)
    this.buildLayer(mapData.structureLayer, 200);
    
    // Entities
    this.buildNPCs(mapData.npcs);
    this.buildMonsters(mapData.monsters);
    
    // Mark exits as walkable
    for (const exit of mapData.exits) {
      for (let dx = 0; dx < exit.width; dx++) {
        const tx = exit.direction === 'east' ? exit.tileX
                 : exit.direction === 'west' ? exit.tileX
                 : exit.tileX + dx;
        const ty = exit.direction === 'north' ? exit.tileY
                 : exit.direction === 'south' ? exit.tileY
                 : exit.tileY + dx;
        this.tileGrid.setTile(tx, ty, {
          frame: 'dirt_light',
          atlas: 'terrain_grassland',
          height: 0,
          isWater: false,
        });
      }
    }
  }

  private buildLayer(tiles: MapTileEntry[], baseDepth: number): void {
    const tileSize = this.tileGrid.getTileSize();
    
    for (const entry of tiles) {
      const x = entry.x * tileSize;
      const y = entry.y * tileSize;
      const w = (entry.widthTiles ?? 1) * tileSize;
      const h = (entry.heightTiles ?? 1) * tileSize;
      
      const yOff = entry.yOffset ?? 0;
      // Prefer individually-cut sprite files over legacy atlas frames.
      // Individual sprites have clean crops and canonical canvas sizes.
      const individualKey = getSpriteKey(entry.frame);
      const useAtlas = entry.atlas && entry.atlas !== 'N/A';  // Skip 'N/A' atlas

      let sprite: Phaser.GameObjects.Sprite;
      if (individualKey && this.scene.textures.exists(individualKey)) {
        sprite = this.scene.add.sprite(x + 32, y + 32, individualKey);  // Center of tile
      } else if (useAtlas && this.scene.textures.exists(entry.atlas)) {
        sprite = this.scene.add.sprite(x + 32, y + 32, entry.atlas, entry.frame);
      } else {
        // Fallback - texture not found
        console.warn(`Missing texture: ${entry.frame} (atlas: ${entry.atlas})`);
        sprite = this.scene.add.sprite(x + 32, y + 32, '__MISSING');
      }
      sprite.setOrigin(0.5, 0.5);  // Center origin
      // Terrain defaults to grid-tile sizing.
      // Objects/structures default to native atlas frame sizing unless tile/pixel dimensions are explicitly provided.
      const nativeW = sprite.frame.realWidth;
      const nativeH = sprite.frame.realHeight;
      const hasExplicitTileSizing = entry.widthTiles !== undefined || entry.heightTiles !== undefined;
      // For individual sprites, use the canonical category size as the default display size
      const categorySize = individualKey ? getSpriteCategorySize(entry.frame) : null;
      const displayW = entry.pixelWidth
        ?? (hasExplicitTileSizing ? w : (baseDepth === 0 ? w : (categorySize?.w ?? nativeW)));
      const displayH = entry.pixelHeight
        ?? (hasExplicitTileSizing ? h : (baseDepth === 0 ? h : (categorySize?.h ?? nativeH)));
      // Ground tiles: add 1px overlap to prevent sub-pixel gap bleeding between tiles
      const overlapW = (baseDepth === 0 && !entry.pixelWidth && !hasExplicitTileSizing) ? displayW + 1 : displayW;
      const overlapH = (baseDepth === 0 && !entry.pixelHeight && !hasExplicitTileSizing) ? displayH + 1 : displayH;
      sprite.setDisplaySize(overlapW, overlapH);

      // For non-ground layers, anchor the object/structure to the tile base so tall sprites rise upward.
      if (baseDepth > 0) {
        sprite.y = y + 32 + yOff + tileSize - displayH;
      } else {
        sprite.y = y + 32 + yOff;
      }
      sprite.setDepth(toRenderDepth(entry.y, baseDepth / 100, entry.height));
      this.allSprites.push(sprite);

      if (entry.label) {
        const label = this.scene.add.text(
          x,
          sprite.y - 14,
          entry.label,
          {
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { left: 3, right: 3, top: 1, bottom: 1 },
          }
        );
        label.setDepth(sprite.depth + 1);
        this.allLabels.push(label);
      }
      
      // Update tile grid for collision
      const tileData: TileData = {
        frame: entry.frame,
        atlas: entry.atlas,
        height: entry.height,
        isWater: entry.isWater ?? false,
        damage: entry.damage,
        slowFactor: entry.slowFactor,
      };
      
      // Mark collision tiles - use collisionW/collisionH if specified,
      // otherwise fall back to widthTiles/heightTiles
      const collW = entry.collisionW ?? (entry.widthTiles ?? 1);
      const collH = entry.collisionH ?? (entry.heightTiles ?? 1);
      for (let dy = 0; dy < collH; dy++) {
        for (let dx = 0; dx < collW; dx++) {
          this.tileGrid.setTile(entry.x + dx, entry.y + dy, tileData);
        }
      }
    }
  }

  private buildNPCs(npcEntries: MapEntityEntry[]): void {
    for (const entry of npcEntries) {
      const def = NPC_DEFINITIONS[entry.entityId];
      if (!def) {
        console.warn(`Unknown NPC: ${entry.entityId}`);
        continue;
      }
      
      // Override properties if specified
      const entityDef: EntityDefinition = { ...def };
      if (entry.name) entityDef.name = entry.name;
      if (entry.dialogueKey) entityDef.dialogueKey = entry.dialogueKey;
      
      const entity = new Entity(this.scene, entry.x, entry.y, entityDef, this.tileGrid.getTileSize());
      entity.setCollisionCallback((x, y, flags, fromX, fromY) => !this.tileGrid.canEntityMoveTo(x, y, fromX ?? x, fromY ?? y, flags));
      this.entities.push(entity);
    }
  }

  private buildMonsters(monsterEntries: MapEntityEntry[]): void {
    for (const entry of monsterEntries) {
      const def = MONSTER_DEFINITIONS[entry.entityId];
      if (!def) {
        console.warn(`Unknown monster: ${entry.entityId}`);
        continue;
      }
      
      const entityDef: EntityDefinition = { ...def };
      if (entry.name) entityDef.name = entry.name;
      
      const entity = new Entity(this.scene, entry.x, entry.y, entityDef, this.tileGrid.getTileSize());
      entity.setCollisionCallback((x, y, flags, fromX, fromY) => !this.tileGrid.canEntityMoveTo(x, y, fromX ?? x, fromY ?? y, flags));
      this.entities.push(entity);
    }
  }

  // ===================== PUBLIC API =====================

  public isWalkable(worldX: number, worldY: number, flags: EntityMovementFlags = DEFAULT_FLAGS): boolean {
    return this.tileGrid.isWalkable(worldX, worldY, flags);
  }

  public canMoveTo(
    worldX: number,
    worldY: number,
    fromX: number,
    fromY: number,
    flags: EntityMovementFlags = DEFAULT_FLAGS
  ): boolean {
    return this.tileGrid.canEntityMoveTo(worldX, worldY, fromX, fromY, flags);
  }

  public getTileEffect(worldX: number, worldY: number): { damage: number; speedFactor: number } {
    return this.tileGrid.getEffect(worldX, worldY);
  }

  public checkExit(worldX: number, worldY: number): MapExit | null {
    const tileSize = this.tileGrid.getTileSize();
    const tileX = Math.floor(worldX / tileSize);
    const tileY = Math.floor(worldY / tileSize);
    
    for (const exit of this.exits) {
      const dist = Math.abs(tileX - exit.tileX) + Math.abs(tileY - exit.tileY);
      if (dist <= 1) return exit;
    }
    return null;
  }

  public getNearbyEntity(worldX: number, worldY: number, radius: number): Entity | null {
    for (const entity of this.entities) {
      if (!entity.isAlive()) continue;
      const pos = entity.getPosition();
      const dist = Phaser.Math.Distance.Between(worldX, worldY, pos.x, pos.y);
      if (dist < radius) return entity;
    }
    return null;
  }

  public getEntities(): Entity[] {
    return this.entities;
  }

  public getExits(): MapExit[] {
    return this.exits;
  }

  public getWidth(): number { return this.tileGrid.getWidth(); }
  public getHeight(): number { return this.tileGrid.getHeight(); }
  public getTileSize(): number { return this.tileGrid.getTileSize(); }

  public update(delta: number, playerX: number, playerY: number, lightSources: Array<{x: number; y: number; radius: number}>): void {
    for (const entity of this.entities) {
      if (entity.isAlive()) {
        entity.update(delta, playerX, playerY, lightSources);
      }
    }
  }

  public destroy(): void {
    for (const sprite of this.allSprites) sprite.destroy();
    for (const label of this.allLabels) label.destroy();
    for (const entity of this.entities) entity.destroy();
    this.allSprites = [];
    this.allLabels = [];
    this.entities = [];
  }
}

// ===================== MAP DATA HELPERS =====================

/**
 * Fill a rectangular area with a tile
 */
export function fillRect(
  tiles: MapTileEntry[],
  x: number, y: number, w: number, h: number,
  frame: string, atlas: string, height: number,
  options: Partial<MapTileEntry> = {}
): void {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      tiles.push({ x: x + dx, y: y + dy, frame, atlas, height, ...options });
    }
  }
}

/**
 * Draw a horizontal line of tiles
 */
export function hLine(
  tiles: MapTileEntry[],
  x: number, y: number, length: number,
  frame: string, atlas: string, height: number,
  options: Partial<MapTileEntry> = {}
): void {
  for (let dx = 0; dx < length; dx++) {
    tiles.push({ x: x + dx, y, frame, atlas, height, ...options });
  }
}

/**
 * Draw a vertical line of tiles
 */
export function vLine(
  tiles: MapTileEntry[],
  x: number, y: number, length: number,
  frame: string, atlas: string, height: number,
  options: Partial<MapTileEntry> = {}
): void {
  for (let dy = 0; dy < length; dy++) {
    tiles.push({ x, y: y + dy, frame, atlas, height, ...options });
  }
}

/**
 * Draw a circle of tiles (for ponds, etc.)
 */
export function circle(
  tiles: MapTileEntry[],
  cx: number, cy: number, radius: number,
  frame: string, atlas: string, height: number,
  options: Partial<MapTileEntry> = {}
): void {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy <= radius * radius) {
        tiles.push({ x: cx + dx, y: cy + dy, frame, atlas, height, ...options });
      }
    }
  }
}
