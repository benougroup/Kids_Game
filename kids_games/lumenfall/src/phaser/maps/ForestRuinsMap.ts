import Phaser from 'phaser';

/**
 * Forest Ruins Map - Ancient ruins in the dark forest
 * Story location with shrine and mysterious atmosphere
 */
export class ForestRuinsMap {
  private scene: Phaser.Scene;
  private tileSize: number = 32;
  private mapWidth: number = 40; // tiles
  private mapHeight: number = 30; // tiles
  private npcs: Phaser.GameObjects.Sprite[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  create(): void {
    // Create ground
    this.createGround();

    // Create tree boundaries
    this.createTreeBoundaries();

    // Create path to ruins
    this.createPathToRuins();

    // Create ancient ruins
    this.createRuins();

    // Add mysterious decorations
    this.createDecorations();
  }

  private createGround(): void {
    // Very dark grass for ruins area
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
        tile.setTint(0x445533); // Very dark green
        tile.setDepth(0);
      }
    }
  }

  private createTreeBoundaries(): void {
    // Very dense trees around edges
    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        // Thick boundary (4 tiles deep)
        if (y < 4 || y > this.mapHeight - 5 || x < 4 || x > this.mapWidth - 5) {
          if (Math.random() > 0.2) {
            this.placeTree(x, y);
          }
        }
      }
    }

    // More scattered trees
    for (let i = 0; i < 60; i++) {
      const x = Phaser.Math.Between(6, this.mapWidth - 7);
      const y = Phaser.Math.Between(6, this.mapHeight - 7);
      
      // Avoid center ruins area
      const centerX = this.mapWidth / 2;
      const centerY = this.mapHeight / 2;
      const distFromCenter = Math.sqrt(
        Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
      );
      
      if (distFromCenter > 8) {
        this.placeTree(x, y);
      }
    }
  }

  private createPathToRuins(): void {
    // Winding path from south entrance to center ruins
    const centerX = Math.floor(this.mapWidth / 2);
    const centerY = Math.floor(this.mapHeight / 2);
    
    // Path from south
    for (let y = this.mapHeight - 1; y > centerY; y--) {
      const t = (this.mapHeight - y) / (this.mapHeight - centerY);
      const curve = Math.sin(t * Math.PI) * 4;
      const pathX = centerX + Math.floor(curve);
      
      for (let dx = -1; dx <= 1; dx++) {
        this.placeStone(pathX + dx, y);
      }
    }
  }

  private createRuins(): void {
    const centerX = Math.floor(this.mapWidth / 2);
    const centerY = Math.floor(this.mapHeight / 2);

    // Central stone platform (8x8)
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        this.placeStone(centerX + dx, centerY + dy);
      }
    }

    // Ruined walls (broken stone pillars)
    this.placeRuinedWall(centerX - 5, centerY - 5);
    this.placeRuinedWall(centerX + 5, centerY - 5);
    this.placeRuinedWall(centerX - 5, centerY + 5);
    this.placeRuinedWall(centerX + 5, centerY + 5);

    // Ancient shrine in center (using wood tiles as placeholder)
    this.placeShrine(centerX, centerY - 2);
  }

  private createDecorations(): void {
    const centerX = this.mapWidth / 2;
    const centerY = this.mapHeight / 2;

    // Glowing mushrooms around ruins (mysterious)
    for (let i = 0; i < 15; i++) {
      const angle = (i / 15) * Math.PI * 2;
      const radius = 6;
      const x = Math.floor(centerX + Math.cos(angle) * radius);
      const y = Math.floor(centerY + Math.sin(angle) * radius);
      
      this.placeGlowingMushroom(x, y);
    }

    // Scattered stone debris
    for (let i = 0; i < 10; i++) {
      const x = Phaser.Math.Between(centerX - 7, centerX + 7);
      const y = Phaser.Math.Between(centerY - 7, centerY + 7);
      this.placeDebris(x, y);
    }
  }

  private placeTree(x: number, y: number): void {
    if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) return;
    
    const tree = this.scene.add.sprite(
      x * this.tileSize,
      y * this.tileSize,
      'atlas',
      'obj_tree'
    );
    tree.setOrigin(0.5, 1);
    tree.setDisplaySize(this.tileSize * 1.5, this.tileSize * 2);
    tree.setTint(0x666666); // Darker trees
    tree.setDepth(y * 10 + 5);
  }

  private placeStone(x: number, y: number): void {
    if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) return;
    
    const tile = this.scene.add.sprite(
      x * this.tileSize,
      y * this.tileSize,
      'atlas',
      'tile_stone'
    );
    tile.setOrigin(0, 0);
    tile.setDisplaySize(this.tileSize, this.tileSize);
    tile.setTint(0x888888); // Grey stone
    tile.setDepth(1);
  }

  private placeRuinedWall(x: number, y: number): void {
    // Stack of stone tiles to look like broken pillar
    for (let i = 0; i < 2; i++) {
      const wall = this.scene.add.sprite(
        x * this.tileSize,
        (y - i) * this.tileSize,
        'atlas',
        'tile_stone'
      );
      wall.setOrigin(0, 0);
      wall.setDisplaySize(this.tileSize, this.tileSize);
      wall.setTint(0x666666);
      wall.setDepth(y * 10 + i);
    }
  }

  private placeShrine(x: number, y: number): void {
    // Shrine (using wood as placeholder - glowing)
    const shrine = this.scene.add.sprite(
      x * this.tileSize,
      y * this.tileSize,
      'atlas',
      'tile_wood'
    );
    shrine.setOrigin(0.5, 1);
    shrine.setDisplaySize(this.tileSize * 2, this.tileSize * 2);
    shrine.setTint(0xffffaa); // Glowing yellow
    shrine.setDepth(y * 10 + 100);
    shrine.setData('interactable', 'shrine');
  }

  private placeGlowingMushroom(x: number, y: number): void {
    const mushroom = this.scene.add.sprite(
      x * this.tileSize,
      y * this.tileSize,
      'atlas',
      'obj_bush'
    );
    mushroom.setOrigin(0.5, 1);
    mushroom.setDisplaySize(this.tileSize * 0.8, this.tileSize * 0.8);
    mushroom.setTint(0x6666ff); // Blue glow
    mushroom.setDepth(y * 10);
  }

  private placeDebris(x: number, y: number): void {
    const debris = this.scene.add.sprite(
      x * this.tileSize,
      y * this.tileSize,
      'atlas',
      'tile_stone'
    );
    debris.setOrigin(0, 0);
    debris.setDisplaySize(this.tileSize * 0.5, this.tileSize * 0.5);
    debris.setTint(0x555555);
    debris.setDepth(0.5);
  }

  public getMapWidth(): number {
    return this.mapWidth * this.tileSize;
  }

  public getMapHeight(): number {
    return this.mapHeight * this.tileSize;
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
}
