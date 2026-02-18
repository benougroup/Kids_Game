import Phaser from 'phaser';

/**
 * Town Map - Bright Hollow
 * Detailed 2D top-down village with natural paths and decorations
 */
export class TownMap {
  private scene: Phaser.Scene;
  private tileSize: number = 32;
  private mapWidth: number = 40; // tiles (larger for more detail)
  private mapHeight: number = 30; // tiles
  private npcs: Phaser.GameObjects.Sprite[] = [];
  private waterTiles: Set<string> = new Set(); // Track water tile positions

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  create(): void {
    // Create ground tiles
    this.createGround();

    // Create stone pathways (natural, curvy)
    this.createPaths();

    // Create central plaza with fountain
    this.createPlaza();

    // Create decorative trees around the edges
    this.createTrees();

    // Create houses
    this.createHouses();

    // Create decorative elements
    this.createDecorations();

    // Create NPCs
    this.createNPCs();
  }

  private createGround(): void {
    // Fill entire map with grass tiles (256x256 in atlas → 32x32 on screen)
    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const tile = this.scene.add.sprite(
          x * this.tileSize,
          y * this.tileSize,
          'tiles',
          'grass'
        );
        tile.setOrigin(0, 0);
        tile.setDisplaySize(this.tileSize, this.tileSize);
        tile.setDepth(0);
      }
    }
  }

  private createPaths(): void {
    // Main vertical path (slightly curved) - 3 tiles wide
    const centerX = Math.floor(this.mapWidth / 2);
    for (let y = 0; y < this.mapHeight; y++) {
      const curve = Math.floor(Math.sin(y * 0.3) * 1); // Gentler curve
      for (let dx = -1; dx <= 1; dx++) {
        this.placeTile(centerX + dx + curve, y, 'stone', 1);
      }
    }

    // Main horizontal path (slightly curved) - 3 tiles wide
    const centerY = Math.floor(this.mapHeight / 2);
    for (let x = 0; x < this.mapWidth; x++) {
      const curve = Math.floor(Math.sin(x * 0.3) * 1); // Gentler curve
      for (let dy = -1; dy <= 1; dy++) {
        this.placeTile(x, centerY + dy + curve, 'stone', 1);
      }
    }

    // Diagonal paths to corners (for variety)
    this.createDiagonalPath(5, 5, centerX, centerY);
    this.createDiagonalPath(this.mapWidth - 5, 5, centerX, centerY);
    this.createDiagonalPath(5, this.mapHeight - 5, centerX, centerY);
    this.createDiagonalPath(this.mapWidth - 5, this.mapHeight - 5, centerX, centerY);
  }

  private createDiagonalPath(startX: number, startY: number, endX: number, endY: number): void {
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = Math.floor(startX + (endX - startX) * t);
      const y = Math.floor(startY + (endY - startY) * t);
      // 2 tiles wide dirt path
      this.placeTile(x, y, 'dirt', 1);
      this.placeTile(x + 1, y, 'dirt', 1);
    }
  }

  private createPlaza(): void {
    const centerX = Math.floor(this.mapWidth / 2);
    const centerY = Math.floor(this.mapHeight / 2);

    // Central plaza (circular stone area)
    const radius = 4;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy <= radius * radius) {
          this.placeTile(centerX + dx, centerY + dy, 'stone', 2);
        }
      }
    }

    // Central fountain
    const fountain = this.scene.add.sprite(
      centerX * this.tileSize,
      centerY * this.tileSize,
      'objects',
      'fountain'
    );
    fountain.setOrigin(0.5, 0.5);
    fountain.setDisplaySize(this.tileSize * 3, this.tileSize * 3);
    fountain.setDepth(50);
  }

  private createTrees(): void {
    // Trees around the perimeter
    for (let x = 0; x < this.mapWidth; x += 3) {
      // Top edge
      if (x < 5 || x > this.mapWidth - 5) {
        this.placeTree(x, 2);
      }
      // Bottom edge
      if (x < 5 || x > this.mapWidth - 5) {
        this.placeTree(x, this.mapHeight - 3);
      }
    }

    for (let y = 0; y < this.mapHeight; y += 3) {
      // Left edge
      if (y < 5 || y > this.mapHeight - 5) {
        this.placeTree(2, y);
      }
      // Right edge
      if (y < 5 || y > this.mapHeight - 5) {
        this.placeTree(this.mapWidth - 3, y);
      }
    }

    // Scattered trees for atmosphere
    const treePositions = [
      [8, 8], [32, 8], [8, 22], [32, 22],
      [12, 6], [28, 6], [12, 24], [28, 24]
    ];

    for (const [x, y] of treePositions) {
      this.placeTree(x, y);
    }
  }

  private placeTree(x: number, y: number): void {
    // Randomly choose tree size for variety
    const treeTypes = [
      { frame: 'tree_large', width: 2, height: 3 },
      { frame: 'tree_medium', width: 1.5, height: 2.5 },
      { frame: 'tree_small', width: 1.2, height: 2 },
    ];
    const treeType = treeTypes[Math.floor(Math.random() * treeTypes.length)];
    
    const tree = this.scene.add.sprite(
      x * this.tileSize,
      y * this.tileSize,
      'objects',
      treeType.frame
    );
    tree.setOrigin(0.5, 1);
    tree.setDisplaySize(this.tileSize * treeType.width, this.tileSize * treeType.height);
    tree.setDepth(y * 10 + 5); // Depth based on Y position for proper layering
    
    // 30% chance to add a bush nearby
    if (Math.random() < 0.3) {
      const bushX = x + (Math.random() > 0.5 ? 1 : -1);
      const bushY = y + (Math.random() > 0.5 ? 1 : -1);
      const bush = this.scene.add.sprite(
        bushX * this.tileSize,
        bushY * this.tileSize,
        'objects',
        'bush'
      );
      bush.setOrigin(0.5, 1);
      bush.setDisplaySize(this.tileSize, this.tileSize);
      bush.setDepth(bushY * 10);
    }
  }

  private createHouses(): void {
    // House positions (around the plaza, not blocking paths)
    const houses = [
      { x: 8, y: 10, color: 'brown' },
      { x: 32, y: 10, color: 'red' },
      { x: 8, y: 20, color: 'orange' },
      { x: 32, y: 20, color: 'purple' },
    ];

    for (const house of houses) {
      this.createHouse(house.x, house.y, house.color);
    }
  }

  private createHouse(x: number, y: number, color: string): void {
    // House body (using stone tile as placeholder)
    for (let dy = 0; dy < 3; dy++) {
      for (let dx = 0; dx < 3; dx++) {
        const tile = this.scene.add.sprite(
          (x + dx) * this.tileSize,
          (y + dy) * this.tileSize,
          'tiles',
          'wood'
        );
        tile.setOrigin(0, 0);
        tile.setDisplaySize(this.tileSize, this.tileSize);
        tile.setDepth(3);
        
        // Tint based on color
        if (color === 'red') tile.setTint(0xff6666);
        else if (color === 'purple') tile.setTint(0xaa66ff);
        else if (color === 'orange') tile.setTint(0xffaa66);
      }
    }

    // Door
    const door = this.scene.add.sprite(
      (x + 1) * this.tileSize,
      (y + 2) * this.tileSize,
      'objects',
      'door'
    );
    door.setOrigin(0.5, 1);
    door.setDisplaySize(this.tileSize, this.tileSize * 1.5);
    door.setDepth(4);

    // Window
    const window1 = this.scene.add.sprite(
      (x + 0.5) * this.tileSize,
      (y + 1) * this.tileSize,
      'objects',
      'window'
    );
    window1.setOrigin(0, 0);
    window1.setDisplaySize(this.tileSize * 0.5, this.tileSize * 0.5);
    window1.setDepth(4);
  }

  private createDecorations(): void {
    // Bushes around houses
    const bushPositions = [
      [7, 10], [11, 10], [31, 10], [35, 10],
      [7, 20], [11, 20], [31, 20], [35, 20]
    ];

    for (const [x, y] of bushPositions) {
      const bush = this.scene.add.sprite(
        x * this.tileSize,
        y * this.tileSize,
        'objects',
        'bush'
      );
      bush.setOrigin(0.5, 1);
      bush.setDisplaySize(this.tileSize, this.tileSize);
      bush.setDepth(y * 10);
    }

    // Add flower patches (bigger 2x2 for contrast)
    this.createFlowerPatch(5, 8);
    this.createFlowerPatch(12, 6);
    this.createFlowerPatch(28, 9);
    this.createFlowerPatch(35, 7);
    this.createFlowerPatch(8, 22);
    this.createFlowerPatch(33, 23);

    // Add dirt patches (natural variation)
    this.createDirtPatch(15, 12);
    this.createDirtPatch(25, 11);
    this.createDirtPatch(18, 18);
    this.createDirtPatch(22, 19);

    // Add small water pond (3x3)
    this.createWaterPond(4, 25);
    this.createWaterPond(36, 24);
  }

  private createFlowerPatch(x: number, y: number): void {
    // 2x2 flower patch for better visibility
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        const flower = this.scene.add.sprite(
          (x + dx) * this.tileSize,
          (y + dy) * this.tileSize,
          'objects',
          'flowers'
        );
        flower.setOrigin(0, 0);
        flower.setDisplaySize(this.tileSize, this.tileSize);
        flower.setDepth(0.5);
      }
    }
  }

  private createDirtPatch(x: number, y: number): void {
    // 2x2 dirt patch
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        this.placeTile(x + dx, y + dy, 'dirt', 0.5);
      }
    }
  }

  private createWaterPond(x: number, y: number): void {
    // 3x3 water pond
    for (let dy = 0; dy < 3; dy++) {
      for (let dx = 0; dx < 3; dx++) {
        const tileX = x + dx;
        const tileY = y + dy;
        
        const water = this.scene.add.sprite(
          tileX * this.tileSize,
          tileY * this.tileSize,
          'tiles',
          'water'
        );
        water.setOrigin(0, 0);
        water.setDisplaySize(this.tileSize, this.tileSize);
        water.setDepth(0.5);
        
        // Track water tile for collision
        this.waterTiles.add(`${tileX},${tileY}`);
      }
    }
  }

  private placeTile(x: number, y: number, frame: string, depth: number): void {
    if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) return;
    
    const tile = this.scene.add.sprite(
      x * this.tileSize,
      y * this.tileSize,
      'tiles',
      frame
    );
    tile.setOrigin(0, 0);
    tile.setDisplaySize(this.tileSize, this.tileSize);
    tile.setDepth(depth);
  }

  private createNPCs(): void {
    const centerX = Math.floor(this.mapWidth / 2);
    const centerY = Math.floor(this.mapHeight / 2);

    // Guard (north of plaza) - position at tile center
    this.createNPC(centerX * this.tileSize + 16, (centerY - 8) * this.tileSize + 16, 'guard_idle_front', 'Guard');

    // Apprentice (east of plaza)
    this.createNPC((centerX + 8) * this.tileSize + 16, centerY * this.tileSize + 16, 'apprentice_idle_front', 'Apprentice');

    // Merchant (south of plaza)
    this.createNPC(centerX * this.tileSize + 16, (centerY + 8) * this.tileSize + 16, 'merchant_idle_front', 'Merchant');
  }

  private createNPC(x: number, y: number, frame: string, name: string): void {
    const npc = this.scene.add.sprite(x, y, 'characters', frame);
    npc.setDisplaySize(this.tileSize, this.tileSize); // 32x32 to match player
    npc.setOrigin(0.5, 0.5); // Center anchor to align with tile grid
    npc.setDepth(Math.floor(y / this.tileSize) * 10 + 5); // Lower depth than player

    // Add name label
    const label = this.scene.add.text(x, y - this.tileSize * 1.5 - 5, name, {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 6, y: 3 },
    });
    label.setOrigin(0.5, 1);
    label.setDepth(npc.depth + 1);

    // Store NPC data
    npc.setData('npcName', name);
    npc.setData('npcType', name.toLowerCase());

    // Enable physics for collision detection
    this.scene.physics.add.existing(npc, true); // static body

    this.npcs.push(npc);
  }

  public getNearbyNPC(playerPos: { x: number; y: number }, distance: number): Phaser.GameObjects.Sprite | null {
    for (const npc of this.npcs) {
      const dx = npc.x - playerPos.x;
      const dy = npc.y - playerPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < distance) {
        return npc;
      }
    }
    return null;
  }

  /**
   * Check if a position is on a water tile (non-walkable)
   */
  public isWaterTile(x: number, y: number): boolean {
    const tileX = Math.floor(x / this.tileSize);
    const tileY = Math.floor(y / this.tileSize);
    return this.waterTiles.has(`${tileX},${tileY}`);
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
}
