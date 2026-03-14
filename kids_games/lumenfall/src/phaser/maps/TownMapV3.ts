/**
 * Town Map V3 - Bright Hollow
 * Uses real sprite assets with proper tile sizing
 * 
 * Tile size: 64x64 on screen (assets scaled from 128x128 or 256x256)
 * Map: 30 tiles wide x 25 tiles tall = 1920x1600 pixels
 * 
 * Map exits (like Ragnarok Online):
 * - North exit: Center-top (road leads to Forest)
 * - South exit: Center-bottom (road leads to Plains)
 * - East exit: Center-right (road leads to Market Town)
 * - West exit: Center-left (road leads to Ruins)
 */

export interface MapExit {
  direction: 'north' | 'south' | 'east' | 'west';
  tileX: number;
  tileY: number;
  targetMap: string;
  targetX: number;
  targetY: number;
}

export interface TileInfo {
  frame: string;
  atlas: string;
  walkable: boolean;
  isWater: boolean;
  isExit?: boolean;
  exitDirection?: string;
}

export class TownMapV3 {
  private scene: Phaser.Scene;
  private TILE_SIZE: number = 64;
  private MAP_COLS: number = 30;
  private MAP_ROWS: number = 25;
  
  // Tile grid for collision
  private tileGrid: TileInfo[][] = [];
  
  // NPCs
  private npcs: Phaser.GameObjects.Sprite[] = [];
  
  // Map exits
  private exits: MapExit[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    // Initialize tile grid
    for (let y = 0; y < this.MAP_ROWS; y++) {
      this.tileGrid[y] = [];
      for (let x = 0; x < this.MAP_COLS; x++) {
        this.tileGrid[y][x] = { frame: 'grass_plain_01', atlas: 'terrain_grassland', walkable: true, isWater: false };
      }
    }
  }

  create(): void {
    // Layer 0: Ground tiles
    this.createGround();
    
    // Layer 1: Roads (dirt paths)
    this.createRoads();
    
    // Layer 2: Water features
    this.createWater();
    
    // Layer 3: Boundary walls (natural cliffs)
    this.createBoundaries();
    
    // Layer 4: Buildings
    this.createBuildings();
    
    // Layer 5: Objects (trees, props)
    this.createObjects();
    
    // Layer 6: NPCs
    this.createNPCs();
    
    // Set up exits
    this.setupExits();
  }

  private placeTile(tileX: number, tileY: number, frame: string, atlas: string, walkable: boolean, isWater: boolean = false): void {
    if (tileX < 0 || tileX >= this.MAP_COLS || tileY < 0 || tileY >= this.MAP_ROWS) return;
    
    const x = tileX * this.TILE_SIZE;
    const y = tileY * this.TILE_SIZE;
    
    const sprite = this.scene.add.sprite(x, y, atlas, frame);
    sprite.setOrigin(0, 0);
    sprite.setDisplaySize(this.TILE_SIZE, this.TILE_SIZE);
    sprite.setDepth(tileY); // Y-sort depth
    
    // Update tile grid
    this.tileGrid[tileY][tileX] = { frame, atlas, walkable, isWater };
  }

  private placeObject(tileX: number, tileY: number, frame: string, atlas: string, widthTiles: number = 1, heightTiles: number = 1, depth?: number): void {
    if (tileX < 0 || tileX >= this.MAP_COLS || tileY < 0 || tileY >= this.MAP_ROWS) return;
    
    const x = tileX * this.TILE_SIZE;
    const y = tileY * this.TILE_SIZE;
    
    const sprite = this.scene.add.sprite(x, y, atlas, frame);
    sprite.setOrigin(0, 0);
    sprite.setDisplaySize(this.TILE_SIZE * widthTiles, this.TILE_SIZE * heightTiles);
    sprite.setDepth(depth !== undefined ? depth : tileY * 10 + 50);
    
    // Mark tiles as blocked
    for (let dy = 0; dy < heightTiles; dy++) {
      for (let dx = 0; dx < widthTiles; dx++) {
        const tx = tileX + dx;
        const ty = tileY + dy;
        if (tx < this.MAP_COLS && ty < this.MAP_ROWS) {
          this.tileGrid[ty][tx] = { frame, atlas, walkable: false, isWater: false };
        }
      }
    }
  }

  private createGround(): void {
    // Fill entire map with grass variants
    const grassVariants = ['grass_plain_01', 'grass_plain_01', 'grass_plain_01', 'grass_flowers_yellow', 'grass_flowers_blue', 'grass_muddy_patch'];
    
    for (let y = 0; y < this.MAP_ROWS; y++) {
      for (let x = 0; x < this.MAP_COLS; x++) {
        // Mostly plain grass with occasional variants
        const variant = Math.random() < 0.75 ? 'grass_plain_01' : grassVariants[Math.floor(Math.random() * grassVariants.length)];
        this.placeTile(x, y, variant, 'terrain_grassland', true);
      }
    }
  }

  private createRoads(): void {
    const centerX = Math.floor(this.MAP_COLS / 2);
    const centerY = Math.floor(this.MAP_ROWS / 2);
    
    // NORTH-SOUTH road (vertical, 2 tiles wide)
    for (let y = 0; y < this.MAP_ROWS; y++) {
      this.placeTile(centerX - 1, y, 'dirt_light', 'terrain_grassland', true);
      this.placeTile(centerX, y, 'dirt_light', 'terrain_grassland', true);
    }
    
    // EAST-WEST road (horizontal, 2 tiles wide)
    for (let x = 0; x < this.MAP_COLS; x++) {
      this.placeTile(x, centerY - 1, 'dirt_light', 'terrain_grassland', true);
      this.placeTile(x, centerY, 'dirt_light', 'terrain_grassland', true);
    }
    
    // Plaza at center (stone cobble, 6x6)
    for (let dy = -3; dy <= 2; dy++) {
      for (let dx = -3; dx <= 2; dx++) {
        this.placeTile(centerX + dx, centerY + dy, 'stone_cobble_01', 'terrain_grassland', true);
      }
    }
    
    // Stone path to buildings
    // Path to blacksmith (top-left)
    for (let i = 0; i < 5; i++) {
      this.placeTile(centerX - 3 - i, centerY - 5, 'stone_cobble_02', 'terrain_grassland', true);
    }
    // Path to inn (top-right)
    for (let i = 0; i < 5; i++) {
      this.placeTile(centerX + 3 + i, centerY - 5, 'stone_cobble_02', 'terrain_grassland', true);
    }
  }

  private createWater(): void {
    // Small pond in top-left area
    const pondX = 4;
    const pondY = 4;
    const pondRadius = 2;
    
    for (let dy = -pondRadius; dy <= pondRadius; dy++) {
      for (let dx = -pondRadius; dx <= pondRadius; dx++) {
        if (dx * dx + dy * dy <= pondRadius * pondRadius) {
          this.placeTile(pondX + dx, pondY + dy, 'water_deep', 'terrain_grassland', false, true);
        }
      }
    }
    
    // Small pond in bottom-right
    const pond2X = this.MAP_COLS - 6;
    const pond2Y = this.MAP_ROWS - 6;
    
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (dx * dx + dy * dy <= 4) {
          this.placeTile(pond2X + dx, pond2Y + dy, 'water_light', 'terrain_grassland', false, true);
        }
      }
    }
    
    // Shore tiles around ponds
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > pondRadius && dist <= pondRadius + 1) {
          if (this.tileGrid[pondY + dy]?.[pondX + dx]?.walkable) {
            this.placeTile(pondX + dx, pondY + dy, 'beach_sand', 'terrain_grassland', true);
          }
        }
      }
    }
  }

  private createBoundaries(): void {
    // Natural cliff walls around the entire map border
    // These block movement and look like terrain walls
    
    // Top border (2 tiles deep)
    for (let x = 0; x < this.MAP_COLS; x++) {
      this.placeTile(x, 0, 'cliff_grass_edge', 'terrain_walls_natural', false);
      this.placeTile(x, 1, 'cliff_grass_edge', 'terrain_walls_natural', false);
    }
    
    // Bottom border
    for (let x = 0; x < this.MAP_COLS; x++) {
      this.placeTile(x, this.MAP_ROWS - 1, 'cliff_grass_edge', 'terrain_walls_natural', false);
      this.placeTile(x, this.MAP_ROWS - 2, 'cliff_grass_edge', 'terrain_walls_natural', false);
    }
    
    // Left border
    for (let y = 2; y < this.MAP_ROWS - 2; y++) {
      this.placeTile(0, y, 'cliff_grass_edge', 'terrain_walls_natural', false);
      this.placeTile(1, y, 'cliff_grass_edge', 'terrain_walls_natural', false);
    }
    
    // Right border
    for (let y = 2; y < this.MAP_ROWS - 2; y++) {
      this.placeTile(this.MAP_COLS - 1, y, 'cliff_grass_edge', 'terrain_walls_natural', false);
      this.placeTile(this.MAP_COLS - 2, y, 'cliff_grass_edge', 'terrain_walls_natural', false);
    }
    
    // Open exits (road exits - clear the walls)
    const centerX = Math.floor(this.MAP_COLS / 2);
    const centerY = Math.floor(this.MAP_ROWS / 2);
    
    // North exit (top, 2 tiles wide road)
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        this.placeTile(centerX + dx, dy, 'dirt_light', 'terrain_grassland', true);
      }
    }
    
    // South exit
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        this.placeTile(centerX + dx, this.MAP_ROWS - 1 - dy, 'dirt_light', 'terrain_grassland', true);
      }
    }
    
    // East exit
    for (let dx = 0; dx < 2; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        this.placeTile(this.MAP_COLS - 1 - dx, centerY + dy, 'dirt_light', 'terrain_grassland', true);
      }
    }
    
    // West exit
    for (let dx = 0; dx < 2; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        this.placeTile(dx, centerY + dy, 'dirt_light', 'terrain_grassland', true);
      }
    }
  }

  private createBuildings(): void {
    const centerX = Math.floor(this.MAP_COLS / 2);
    const centerY = Math.floor(this.MAP_ROWS / 2);
    
    // Blacksmith - top left quadrant
    this.placeObject(5, 5, 'blacksmith_forge_large', 'buildings_v003', 3, 3);
    
    // Inn/Tavern - top right quadrant
    this.placeObject(centerX + 5, 4, 'tavern_red_balcony', 'buildings_v003', 3, 3);
    
    // Market - right side
    this.placeObject(centerX + 5, centerY + 2, 'market_food_building', 'buildings_v003', 3, 3);
    
    // Chapel - bottom left
    this.placeObject(4, centerY + 3, 'chapel_large', 'buildings_v003', 3, 3);
    
    // Watchtower - near north exit
    this.placeObject(centerX + 3, 3, 'watchtower_small', 'buildings_v003', 2, 2);
    this.placeObject(centerX - 5, 3, 'watchtower_small', 'buildings_v003', 2, 2);
    
    // Alchemy shop - near center
    this.placeObject(centerX - 8, centerY - 5, 'alchemy_shop', 'buildings_v003', 3, 3);
    
    // Small houses scattered
    this.placeObject(8, centerY + 4, 'house_thatch_small', 'buildings_v003', 2, 2);
    this.placeObject(centerX + 8, centerY - 6, 'house_blue_roof_large', 'buildings_v003', 2, 2);
    
    // Fountain at center plaza
    this.placeObject(centerX - 1, centerY - 2, 'fountain_round', 'objects_props_v003', 2, 2);
  }

  private createObjects(): void {
    const centerX = Math.floor(this.MAP_COLS / 2);
    const centerY = Math.floor(this.MAP_ROWS / 2);
    
    // Trees around the edges
    const treePositions = [
      [2, 3], [3, 3], [2, 6], [3, 7], [2, 10], [3, 11],
      [this.MAP_COLS - 4, 3], [this.MAP_COLS - 3, 4], [this.MAP_COLS - 4, 7], [this.MAP_COLS - 3, 9],
      [2, centerY + 6], [3, centerY + 8], [2, this.MAP_ROWS - 5],
      [this.MAP_COLS - 4, centerY + 5], [this.MAP_COLS - 3, centerY + 7],
    ];
    
    for (const [tx, ty] of treePositions) {
      const treeTypes = ['tree_oak_large', 'tree_pine_tall', 'tree_dead'];
      const treeType = treeTypes[Math.floor(Math.random() * treeTypes.length)];
      this.placeObject(tx, ty, treeType, 'objects_props_v002', 1, 2);
    }
    
    // Market stalls near market building
    this.placeObject(centerX + 5, centerY - 1, 'market_stall_food', 'objects_props_v002', 1, 1);
    this.placeObject(centerX + 7, centerY - 1, 'market_stall_goods', 'objects_props_v002', 1, 1);
    
    // Barrels near blacksmith
    this.placeObject(8, 7, 'barrel_pair', 'objects_props_v002', 1, 1);
    this.placeObject(9, 7, 'barrel_triple', 'objects_props_v002', 1, 1);
    
    // Well near center
    this.placeObject(centerX - 4, centerY + 1, 'well_small', 'objects_props_v002', 1, 1);
    
    // Signs at road exits
    this.placeObject(centerX - 2, 2, 'sign_forest', 'objects_props_v002', 1, 1);
    this.placeObject(centerX + 2, this.MAP_ROWS - 4, 'sign_village', 'objects_props_v002', 1, 1);
    
    // Lamp posts along roads
    this.placeObject(centerX - 3, centerY - 4, 'lamp_post', 'objects_props_v002', 1, 1);
    this.placeObject(centerX + 2, centerY - 4, 'lamp_post', 'objects_props_v002', 1, 1);
    this.placeObject(centerX - 3, centerY + 3, 'lamp_post', 'objects_props_v002', 1, 1);
    this.placeObject(centerX + 2, centerY + 3, 'lamp_post', 'objects_props_v002', 1, 1);
    
    // Campfire near inn
    this.placeObject(centerX + 4, 7, 'campfire', 'objects_props_v002', 1, 1);
    
    // Gravestones in bottom-left corner (small graveyard)
    this.placeObject(5, this.MAP_ROWS - 7, 'gravestone_plain', 'objects_props_v002', 1, 1);
    this.placeObject(7, this.MAP_ROWS - 7, 'gravestone_cross', 'objects_props_v002', 1, 1);
    this.placeObject(6, this.MAP_ROWS - 6, 'gravestone_rounded', 'objects_props_v002', 1, 1);
    
    // Ruins in corner
    this.placeObject(this.MAP_COLS - 6, this.MAP_ROWS - 7, 'ruin_arch_stone', 'objects_props_v003', 2, 2);
    
    // Fences around some buildings
    for (let i = 0; i < 4; i++) {
      this.placeObject(5 + i, 8, 'fence_short', 'objects_props_v002', 1, 1);
    }
  }

  private createNPCs(): void {
    const centerX = Math.floor(this.MAP_COLS / 2);
    const centerY = Math.floor(this.MAP_ROWS / 2);
    
    // Guard at north entrance
    this.createNPC(centerX - 1, 3, 'guard', 'guard', 'guard');
    
    // Guard at south entrance
    this.createNPC(centerX + 1, this.MAP_ROWS - 4, 'guard', 'guard', 'guard');
    
    // Apprentice near plaza
    this.createNPC(centerX + 2, centerY + 2, 'apprentice', 'apprentice', 'apprentice');
    
    // Merchant at market
    this.createNPC(centerX + 6, centerY + 1, 'merchant', 'merchant', 'merchant');
    
    // Elder near chapel
    this.createNPC(6, centerY + 5, 'elder', 'elder', 'elder');
    
    // Blacksmith at forge
    this.createNPC(7, 8, 'blacksmith', 'guard', 'blacksmith');
    
    // Innkeeper
    this.createNPC(centerX + 7, 7, 'innkeeper', 'merchant', 'innkeeper');
  }

  private createNPC(tileX: number, tileY: number, id: string, spriteFrame: string, dialogueKey: string): void {
    const x = tileX * this.TILE_SIZE + this.TILE_SIZE / 2;
    const y = tileY * this.TILE_SIZE + this.TILE_SIZE / 2;
    
    // Try to use characters atlas, fallback to a colored rectangle
    let npc: Phaser.GameObjects.Sprite;
    
    try {
      npc = this.scene.add.sprite(x, y, 'characters', `${spriteFrame}_idle`);
    } catch {
      npc = this.scene.add.sprite(x, y, 'characters', 'guard_idle');
    }
    
    npc.setOrigin(0.5, 0.5);
    npc.setDisplaySize(this.TILE_SIZE, this.TILE_SIZE);
    npc.setDepth(tileY * 10 + 200);
    npc.setData('id', id);
    npc.setData('dialogueKey', dialogueKey);
    npc.setData('name', dialogueKey);
    
    // Some NPCs move (wander)
    if (id === 'apprentice' || id === 'merchant') {
      npc.setData('canMove', true);
      npc.setData('homeX', x);
      npc.setData('homeY', y);
      npc.setData('moveTimer', 0);
    }
    
    this.npcs.push(npc);
  }

  private setupExits(): void {
    const centerX = Math.floor(this.MAP_COLS / 2);
    const centerY = Math.floor(this.MAP_ROWS / 2);
    
    this.exits = [
      {
        direction: 'north',
        tileX: centerX,
        tileY: 0,
        targetMap: 'forest',
        targetX: centerX * this.TILE_SIZE,
        targetY: (this.MAP_ROWS - 3) * this.TILE_SIZE
      },
      {
        direction: 'south',
        tileX: centerX,
        tileY: this.MAP_ROWS - 1,
        targetMap: 'plains',
        targetX: centerX * this.TILE_SIZE,
        targetY: 2 * this.TILE_SIZE
      },
      {
        direction: 'east',
        tileX: this.MAP_COLS - 1,
        tileY: centerY,
        targetMap: 'market_town',
        targetX: 2 * this.TILE_SIZE,
        targetY: centerY * this.TILE_SIZE
      },
      {
        direction: 'west',
        tileX: 0,
        tileY: centerY,
        targetMap: 'ruins',
        targetX: (this.MAP_COLS - 3) * this.TILE_SIZE,
        targetY: centerY * this.TILE_SIZE
      }
    ];
  }

  // ===================== PUBLIC API =====================

  public getMapWidth(): number {
    return this.MAP_COLS * this.TILE_SIZE;
  }

  public getMapHeight(): number {
    return this.MAP_ROWS * this.TILE_SIZE;
  }

  public getTileSize(): number {
    return this.TILE_SIZE;
  }

  public isWalkable(worldX: number, worldY: number): boolean {
    const tileX = Math.floor(worldX / this.TILE_SIZE);
    const tileY = Math.floor(worldY / this.TILE_SIZE);
    
    if (tileX < 0 || tileX >= this.MAP_COLS || tileY < 0 || tileY >= this.MAP_ROWS) {
      return false;
    }
    
    return this.tileGrid[tileY][tileX].walkable;
  }

  public isWaterTile(worldX: number, worldY: number): boolean {
    const tileX = Math.floor(worldX / this.TILE_SIZE);
    const tileY = Math.floor(worldY / this.TILE_SIZE);
    
    if (tileX < 0 || tileX >= this.MAP_COLS || tileY < 0 || tileY >= this.MAP_ROWS) {
      return false;
    }
    
    return this.tileGrid[tileY][tileX].isWater;
  }

  public checkExit(worldX: number, worldY: number): MapExit | null {
    const tileX = Math.floor(worldX / this.TILE_SIZE);
    const tileY = Math.floor(worldY / this.TILE_SIZE);
    
    for (const exit of this.exits) {
      // Check if player is near exit tile
      const dist = Math.abs(tileX - exit.tileX) + Math.abs(tileY - exit.tileY);
      if (dist <= 1) {
        return exit;
      }
    }
    
    return null;
  }

  public getNearbyNPC(worldX: number, worldY: number, radius: number): Phaser.GameObjects.Sprite | null {
    for (const npc of this.npcs) {
      const dist = Phaser.Math.Distance.Between(worldX, worldY, npc.x, npc.y);
      if (dist < radius) {
        return npc;
      }
    }
    return null;
  }

  public getNPCs(): Phaser.GameObjects.Sprite[] {
    return this.npcs;
  }

  public getExits(): MapExit[] {
    return this.exits;
  }

  public updateNPCs(delta: number): void {
    for (const npc of this.npcs) {
      if (!npc.getData('canMove')) continue;
      
      const timer = npc.getData('moveTimer') + delta;
      npc.setData('moveTimer', timer);
      
      // Move every 3 seconds
      if (timer > 3000) {
        npc.setData('moveTimer', 0);
        
        const homeX = npc.getData('homeX');
        const homeY = npc.getData('homeY');
        
        // Wander within 2 tiles of home
        const wanderX = homeX + (Math.random() - 0.5) * 2 * this.TILE_SIZE;
        const wanderY = homeY + (Math.random() - 0.5) * 2 * this.TILE_SIZE;
        
        // Simple move (no pathfinding for NPCs)
        this.scene.tweens.add({
          targets: npc,
          x: wanderX,
          y: wanderY,
          duration: 1000,
          ease: 'Linear'
        });
      }
    }
  }
}
