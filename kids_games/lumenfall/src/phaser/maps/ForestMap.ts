import Phaser from 'phaser';

/**
 * Forest Map - Dark woods surrounding Bright Hollow
 * Natural curvy dirt paths, dense trees as boundaries
 */
export class ForestMap {
  private scene: Phaser.Scene;
  private tileSize: number = 32;
  private mapWidth: number = 40; // tiles
  private mapHeight: number = 30; // tiles
  private npcs: Phaser.GameObjects.Sprite[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  create(): void {
    // Create ground (darker grass for forest)
    this.createGround();

    // Create dense tree boundaries
    this.createTreeBoundaries();

    // Create natural curvy dirt path
    this.createCurvyPath();

    // Add forest decorations
    this.createForestDecorations();
  }

  private createGround(): void {
    // Fill entire map with darker grass
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
        tile.setTint(0x668844); // Darker green for forest
        tile.setDepth(0);
      }
    }
  }

  private createTreeBoundaries(): void {
    // Dense trees around the edges (3-4 tiles deep)
    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        // Top boundary
        if (y < 3) {
          if (Math.random() > 0.3) this.placeTree(x, y);
        }
        // Bottom boundary
        else if (y > this.mapHeight - 4) {
          if (Math.random() > 0.3) this.placeTree(x, y);
        }
        // Left boundary
        else if (x < 3) {
          if (Math.random() > 0.3) this.placeTree(x, y);
        }
        // Right boundary
        else if (x > this.mapWidth - 4) {
          if (Math.random() > 0.3) this.placeTree(x, y);
        }
      }
    }

    // Scattered trees throughout (not too dense)
    for (let i = 0; i < 50; i++) {
      const x = Phaser.Math.Between(5, this.mapWidth - 6);
      const y = Phaser.Math.Between(5, this.mapHeight - 6);
      
      // Don't place on path (will be created next)
      const centerX = this.mapWidth / 2;
      const distFromCenter = Math.abs(x - centerX);
      
      if (distFromCenter > 5) {
        this.placeTree(x, y);
      }
    }
  }

  private createCurvyPath(): void {
    // Create a natural S-curve path from north to south
    const centerX = Math.floor(this.mapWidth / 2);
    
    for (let y = 0; y < this.mapHeight; y++) {
      // S-curve formula: offset changes smoothly
      const t = y / this.mapHeight; // 0 to 1
      const curve = Math.sin(t * Math.PI * 2) * 6; // Sine wave for natural curve
      
      const pathX = centerX + Math.floor(curve);
      
      // Path is 3-4 tiles wide
      for (let dx = -2; dx <= 2; dx++) {
        const x = pathX + dx;
        if (x >= 0 && x < this.mapWidth) {
          this.placeDirt(x, y);
        }
      }
      
      // Add some variation (wider in some spots)
      if (Math.random() > 0.7) {
        this.placeDirt(pathX - 3, y);
        this.placeDirt(pathX + 3, y);
      }
    }
  }

  private createForestDecorations(): void {
    // Bushes along the path
    for (let i = 0; i < 20; i++) {
      const y = Phaser.Math.Between(5, this.mapHeight - 6);
      const centerX = this.mapWidth / 2;
      const t = y / this.mapHeight;
      const curve = Math.sin(t * Math.PI * 2) * 6;
      const pathX = centerX + Math.floor(curve);
      
      // Place bushes on sides of path
      const side = Math.random() > 0.5 ? 1 : -1;
      const x = pathX + side * Phaser.Math.Between(3, 5);
      
      if (x >= 4 && x < this.mapWidth - 4) {
        this.placeBush(x, y);
      }
    }

    // Mushroom patches in dark areas
    for (let i = 0; i < 10; i++) {
      const x = Phaser.Math.Between(5, this.mapWidth - 6);
      const y = Phaser.Math.Between(5, this.mapHeight - 6);
      this.placeMushroomPatch(x, y);
    }

    // Small clearings with flowers
    this.createClearing(10, 10);
    this.createClearing(30, 20);
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
    tree.setDisplaySize(this.tileSize * 1.5, this.tileSize * 2); // Bigger trees
    tree.setDepth(y * 10 + 5);
  }

  private placeDirt(x: number, y: number): void {
    if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) return;
    
    const tile = this.scene.add.sprite(
      x * this.tileSize,
      y * this.tileSize,
      'atlas',
      'tile_dirt'
    );
    tile.setOrigin(0, 0);
    tile.setDisplaySize(this.tileSize, this.tileSize);
    tile.setDepth(1);
  }

  private placeBush(x: number, y: number): void {
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

  private placeMushroomPatch(x: number, y: number): void {
    // 2x2 mushroom patch (using tinted grass)
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        const mushroom = this.scene.add.sprite(
          (x + dx) * this.tileSize,
          (y + dy) * this.tileSize,
          'atlas',
          'tile_grass'
        );
        mushroom.setOrigin(0, 0);
        mushroom.setDisplaySize(this.tileSize, this.tileSize);
        mushroom.setTint(0xaa6644); // Brown tint for mushrooms
        mushroom.setDepth(0.5);
      }
    }
  }

  private createClearing(centerX: number, centerY: number): void {
    // Small circular clearing with flowers
    const radius = 3;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= radius) {
          const x = centerX + dx;
          const y = centerY + dy;
          
          if (x >= 0 && x < this.mapWidth && y >= 0 && y < this.mapHeight) {
            // Lighter grass
            const tile = this.scene.add.sprite(
              x * this.tileSize,
              y * this.tileSize,
              'atlas',
              'tile_grass'
            );
            tile.setOrigin(0, 0);
            tile.setDisplaySize(this.tileSize, this.tileSize);
            tile.setTint(0x88aa66); // Lighter green
            tile.setDepth(0.5);
            
            // Some flowers
            if (Math.random() > 0.6) {
              const flower = this.scene.add.sprite(
                x * this.tileSize,
                y * this.tileSize,
                'atlas',
                'tile_grass'
              );
              flower.setOrigin(0, 0);
              flower.setDisplaySize(this.tileSize, this.tileSize);
              flower.setTint(0xffccaa); // Yellow flowers
              flower.setDepth(0.6);
            }
          }
        }
      }
    }
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
