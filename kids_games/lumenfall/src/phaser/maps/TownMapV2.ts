import { LayeredTileSystem } from '../systems/LayeredTileSystem';

/**
 * Town Map V2 - Using Layered Tile System
 * Proper road orientation, water collision, and RO-style rendering
 */
export class TownMapV2 {
  private scene: Phaser.Scene;
  private tileSystem: LayeredTileSystem;
  private tileSize: number = 32;
  private mapWidth: number = 40;
  private mapHeight: number = 30;
  private npcs: Phaser.GameObjects.Sprite[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.tileSystem = new LayeredTileSystem(scene);
  }

  create(): void {
    // Layer 0: Ground
    this.createGround();
    
    // Layer 1: Roads
    this.createRoads();
    
    // Layer 2: Objects (trees, rocks, bushes)
    this.createObjects();
    
    // Layer 3: Structures (buildings, bridges)
    this.createStructures();
    
    // NPCs (handled separately by GameScene)
    this.createNPCs();
  }

  private createGround(): void {
    // Fill with grass
    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        // Vary grass tiles for visual interest
        const grassTypes = ['grass_plain', 'grass_flowers_yellow', 'grass_flowers_blue', 'grass_flowers_red', 'grass_rocks'];
        const grassType = Math.random() < 0.8 ? 'grass_plain' : grassTypes[Math.floor(Math.random() * grassTypes.length)];
        this.tileSystem.placeGroundTile(x, y, grassType, 0, true);
      }
    }

    // Add low rolling hill so map has elevation changes.
    this.createHill(24, 8, 5, 1);
    this.createHill(26, 10, 3, 2);
    
    // Add water pond in bottom right
    this.createWaterPond(30, 20, 5);
    
    // Add water pond in top left
    this.createWaterPond(5, 5, 4);
  }

  private createHill(centerX: number, centerY: number, radius: number, elevation: number): void {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= radius) {
          const x = centerX + dx;
          const y = centerY + dy;
          if (x >= 0 && x < this.mapWidth && y >= 0 && y < this.mapHeight) {
            this.tileSystem.placeGroundTile(x, y, 'grass_plain', elevation, true);
          }
        }
      }
    }
  }

  private createWaterPond(centerX: number, centerY: number, radius: number): void {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= radius) {
          const x = centerX + dx;
          const y = centerY + dy;
          if (x >= 0 && x < this.mapWidth && y >= 0 && y < this.mapHeight) {
            this.tileSystem.placeGroundTile(x, y, 'water_plain', -1, false);
          }
        }
      }
    }
  }

  private createRoads(): void {
    // Main vertical road (center) - 2 tiles wide
    const centerX = Math.floor(this.mapWidth / 2);
    for (let y = 0; y < this.mapHeight; y++) {
      this.tileSystem.placeRoadTile(centerX, y, 'dirt', 'vertical');
      this.tileSystem.placeRoadTile(centerX + 1, y, 'dirt', 'vertical');
    }
    
    // Main horizontal road (center) - 2 tiles wide
    const centerY = Math.floor(this.mapHeight / 2);
    for (let x = 0; x < this.mapWidth; x++) {
      this.tileSystem.placeRoadTile(x, centerY, 'dirt', 'horizontal');
      this.tileSystem.placeRoadTile(x, centerY + 1, 'dirt', 'horizontal');
    }
    
    // Add corners at intersection
    this.tileSystem.placeRoadTile(centerX, centerY, 'dirt', 'cross');
    this.tileSystem.placeRoadTile(centerX + 1, centerY, 'dirt', 'cross');
    this.tileSystem.placeRoadTile(centerX, centerY + 1, 'dirt', 'cross');
    this.tileSystem.placeRoadTile(centerX + 1, centerY + 1, 'dirt', 'cross');
    
    // Stone plaza at center
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= 3) {
          this.tileSystem.placeRoadTile(centerX + dx, centerY + dy, 'stone', 'horizontal');
        }
      }
    }
  }

  private createObjects(): void {
    // Trees around the edges
    for (let i = 0; i < 20; i++) {
      const x = Math.random() < 0.5 ? Math.floor(Math.random() * 5) : this.mapWidth - Math.floor(Math.random() * 5);
      const y = Math.floor(Math.random() * this.mapHeight);
      
      const treeTypes = ['tree_oak', 'tree_pine', 'tree_small', 'tree_cherry'];
      const treeType = treeTypes[Math.floor(Math.random() * treeTypes.length)];
      
      this.tileSystem.placeObject(x, y, treeType, true);
    }
    
    // Bushes scattered around
    for (let i = 0; i < 30; i++) {
      const x = Math.floor(Math.random() * this.mapWidth);
      const y = Math.floor(Math.random() * this.mapHeight);
      
      const bushTypes = ['bush_large', 'bush_small', 'flowers_red', 'flowers_blue', 'flowers_yellow'];
      const bushType = bushTypes[Math.floor(Math.random() * bushTypes.length)];
      
      this.tileSystem.placeObject(x, y, bushType, false);
    }
    
    // Rocks
    for (let i = 0; i < 15; i++) {
      const x = Math.floor(Math.random() * this.mapWidth);
      const y = Math.floor(Math.random() * this.mapHeight);
      
      const rockTypes = ['rock_large', 'rock_medium', 'rock_small', 'rock_pile'];
      const rockType = rockTypes[Math.floor(Math.random() * rockTypes.length)];
      
      this.tileSystem.placeObject(x, y, rockType, true);
    }
  }

  private createStructures(): void {
    const centerX = Math.floor(this.mapWidth / 2);
    const centerY = Math.floor(this.mapHeight / 2);

    // Small houses in corners
    this.tileSystem.placeStructure(5, 5, 'house_small', 0);
    this.tileSystem.placeStructure(this.mapWidth - 8, 5, 'house_small', 0);
    this.tileSystem.placeStructure(5, this.mapHeight - 8, 'house_small', 0);
    
    // Shop in center-right
    this.tileSystem.placeStructure(this.mapWidth - 10, Math.floor(this.mapHeight / 2) - 3, 'shop', 0);

    // Sign posts act as light post placeholders for now.
    this.tileSystem.placeObject(centerX - 4, centerY - 2, 'sign', true);
    this.tileSystem.placeObject(centerX + 5, centerY + 2, 'sign', true);
    
    // Bridges over water ponds
    this.tileSystem.placeStructure(30, 20, 'bridge_h', 1);
    this.tileSystem.placeStructure(5, 5, 'bridge_v', 1);
  }

  private createNPCs(): void {
    // Guard at north entrance
    this.createNPC(Math.floor(this.mapWidth / 2), 3, 'guard', 'Guard');
    
    // Merchant at shop
    this.createNPC(this.mapWidth - 10, Math.floor(this.mapHeight / 2), 'merchant', 'Merchant');
    
    // Apprentice at plaza
    this.createNPC(Math.floor(this.mapWidth / 2) + 2, Math.floor(this.mapHeight / 2) + 2, 'apprentice', 'Apprentice');
    
    // Elder at south
    this.createNPC(Math.floor(this.mapWidth / 2), this.mapHeight - 5, 'elder', 'Elder');
  }

  private createNPC(tileX: number, tileY: number, type: string, name: string): void {
    const npc = this.scene.add.sprite(
      tileX * this.tileSize + this.tileSize / 2,
      tileY * this.tileSize + this.tileSize / 2,
      'characters',
      `${type}_idle`
    );
    npc.setOrigin(0.5, 0.5);
    npc.setDisplaySize(48, 48);
    npc.setDepth(400);
    npc.setData('name', name);
    npc.setData('type', type);
    this.npcs.push(npc);
  }

  public getNPCs(): Phaser.GameObjects.Sprite[] {
    return this.npcs;
  }

  public getMapWidth(): number {
    return this.mapWidth * this.tileSize;
  }

  public getMapHeight(): number {
    return this.mapHeight * this.tileSize;
  }

  public hasCollision(x: number, y: number): boolean {
    return this.tileSystem.hasCollision(x, y);
  }

  public isWalkable(fromX: number, fromY: number, toX: number, toY: number): boolean {
    return this.tileSystem.isWalkableAtWorld(toX, toY, fromX, fromY);
  }

  public isWaterTile(x: number, y: number): boolean {
    const tileX = Math.floor(x / this.tileSize);
    const tileY = Math.floor(y / this.tileSize);
    const tile = this.tileSystem.getTile(tileX, tileY, 0);
    return tile?.frame.includes('water') || false;
  }

  public getNearbyNPC(x: number, y: number, radius: number): Phaser.GameObjects.Sprite | null {
    for (const npc of this.npcs) {
      const dist = Phaser.Math.Distance.Between(x, y, npc.x, npc.y);
      if (dist < radius) {
        return npc;
      }
    }
    return null;
  }
}
