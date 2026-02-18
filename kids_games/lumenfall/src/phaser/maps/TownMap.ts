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
    // Fill entire map with grass tiles
    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const tile = this.scene.add.sprite(
          x * this.tileSize,
          y * this.tileSize,
          'atlas',
          'tile_grass'
        );
        tile.setOrigin(0, 0);
        tile.setDisplaySize(this.tileSize, this.tileSize);
        tile.setDepth(0);
      }
    }
  }

  private createPaths(): void {
    // Main vertical path (slightly curved)
    const centerX = Math.floor(this.mapWidth / 2);
    for (let y = 0; y < this.mapHeight; y++) {
      const curve = Math.floor(Math.sin(y * 0.3) * 2); // Slight curve
      for (let dx = -2; dx <= 2; dx++) {
        this.placeTile(centerX + dx + curve, y, 'tile_stone', 1);
      }
    }

    // Main horizontal path (slightly curved)
    const centerY = Math.floor(this.mapHeight / 2);
    for (let x = 0; x < this.mapWidth; x++) {
      const curve = Math.floor(Math.sin(x * 0.3) * 2); // Slight curve
      for (let dy = -2; dy <= 2; dy++) {
        this.placeTile(x, centerY + dy + curve, 'tile_stone', 1);
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
      this.placeTile(x, y, 'tile_dirt', 1);
      this.placeTile(x + 1, y, 'tile_dirt', 1);
      this.placeTile(x, y + 1, 'tile_dirt', 1);
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
          this.placeTile(centerX + dx, centerY + dy, 'tile_stone', 2);
        }
      }
    }

    // Central fountain/light post
    const lightPost = this.scene.add.sprite(
      centerX * this.tileSize,
      centerY * this.tileSize,
      'atlas',
      'obj_lightpost'
    );
    lightPost.setOrigin(0.5, 1);
    lightPost.setDisplaySize(this.tileSize * 1.5, this.tileSize * 2);
    lightPost.setDepth(50);

    // Add glow effect
    const glow = this.scene.add.sprite(
      centerX * this.tileSize,
      (centerY - 1) * this.tileSize,
      'atlas',
      'light_glow'
    );
    glow.setDisplaySize(this.tileSize * 4, this.tileSize * 4);
    glow.setAlpha(0.5);
    glow.setDepth(49);

    // Animate glow
    this.scene.tweens.add({
      targets: glow,
      alpha: 0.7,
      scale: 1.1,
      duration: 2000,
      yoyo: true,
      repeat: -1,
    });
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
    const tree = this.scene.add.sprite(
      x * this.tileSize,
      y * this.tileSize,
      'atlas',
      'obj_tree'
    );
    tree.setOrigin(0.5, 1);
    tree.setDisplaySize(this.tileSize * 2, this.tileSize * 3);
    tree.setDepth(y * 10 + 5); // Depth based on Y position for proper layering
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
          'atlas',
          'tile_wood'
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
      'atlas',
      'tile_stone'
    );
    door.setOrigin(0, 0);
    door.setDisplaySize(this.tileSize, this.tileSize);
    door.setDepth(4);
    door.setTint(0x664422);

    // Window
    const window1 = this.scene.add.sprite(
      (x + 0.5) * this.tileSize,
      (y + 1) * this.tileSize,
      'atlas',
      'tile_water'
    );
    window1.setOrigin(0, 0);
    window1.setDisplaySize(this.tileSize * 0.5, this.tileSize * 0.5);
    window1.setDepth(4);
    window1.setTint(0x88ccff);
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
        'atlas',
        'obj_bush'
      );
      bush.setOrigin(0.5, 1);
      bush.setDisplaySize(this.tileSize, this.tileSize);
      bush.setDepth(y * 10);
    }
  }

  private placeTile(x: number, y: number, frame: string, depth: number): void {
    if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) return;
    
    const tile = this.scene.add.sprite(
      x * this.tileSize,
      y * this.tileSize,
      'atlas',
      frame
    );
    tile.setOrigin(0, 0);
    tile.setDisplaySize(this.tileSize, this.tileSize);
    tile.setDepth(depth);
  }

  private createNPCs(): void {
    const centerX = Math.floor(this.mapWidth / 2);
    const centerY = Math.floor(this.mapHeight / 2);

    // Guard (north of plaza)
    this.createNPC(centerX * this.tileSize, (centerY - 8) * this.tileSize, 'npc_guard_idle_0', 'Guard');

    // Apprentice (east of plaza)
    this.createNPC((centerX + 8) * this.tileSize, centerY * this.tileSize, 'npc_apprentice_idle_0', 'Apprentice');

    // Merchant (south of plaza)
    this.createNPC(centerX * this.tileSize, (centerY + 8) * this.tileSize, 'npc_merchant_idle_0', 'Merchant');
  }

  private createNPC(x: number, y: number, frame: string, name: string): void {
    const npc = this.scene.add.sprite(x, y, 'atlas', frame);
    npc.setDisplaySize(this.tileSize, this.tileSize * 1.5); // Taller for better visibility
    npc.setOrigin(0.5, 1); // Bottom-center anchor
    npc.setDepth(Math.floor(y / this.tileSize) * 10 + 100); // Proper depth sorting

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
