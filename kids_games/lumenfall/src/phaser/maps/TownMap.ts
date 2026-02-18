import Phaser from 'phaser';

/**
 * Town Map - Bright Hollow
 * 2D top-down village with sprite tiles
 */
export class TownMap {
  private scene: Phaser.Scene;
  private tileSize: number = 32;
  private mapWidth: number = 32; // tiles
  private mapHeight: number = 24; // tiles
  private npcs: Phaser.GameObjects.Sprite[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  create(): void {
    // Create ground tiles
    this.createGround();

    // Create roads
    this.createRoads();

    // Create central plaza with light post
    this.createPlaza();

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

  private createRoads(): void {
    // Vertical road (center)
    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 14; x < 18; x++) {
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
    }

    // Horizontal road (center)
    for (let x = 0; x < this.mapWidth; x++) {
      for (let y = 10; y < 14; y++) {
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
    }
  }

  private createPlaza(): void {
    // Central plaza (stone tiles)
    for (let y = 10; y < 14; y++) {
      for (let x = 14; x < 18; x++) {
        const tile = this.scene.add.sprite(
          x * this.tileSize,
          y * this.tileSize,
          'atlas',
          'tile_stone'
        );
        tile.setOrigin(0, 0);
        tile.setDisplaySize(this.tileSize, this.tileSize);
        tile.setDepth(2);
      }
    }

    // Central light post
    const lightPost = this.scene.add.sprite(
      16 * this.tileSize,
      12 * this.tileSize,
      'atlas',
      'obj_lightpost'
    );
    lightPost.setOrigin(0.5, 1); // Bottom-center anchor
    lightPost.setDisplaySize(this.tileSize * 1.5, this.tileSize * 2);
    lightPost.setDepth(50);

    // Add glow effect
    const glow = this.scene.add.sprite(
      16 * this.tileSize,
      11 * this.tileSize,
      'atlas',
      'light_glow'
    );
    glow.setDisplaySize(this.tileSize * 3, this.tileSize * 3);
    glow.setAlpha(0.6);
    glow.setDepth(49);

    // Animate glow
    this.scene.tweens.add({
      targets: glow,
      alpha: 0.8,
      scale: 1.1,
      duration: 2000,
      yoyo: true,
      repeat: -1,
    });
  }

  private createNPCs(): void {
    // Guard (top-left area, near road)
    this.createNPC(10 * this.tileSize, 8 * this.tileSize, 'npc_guard_idle_0', 'Guard');

    // Apprentice (top-right area, near road)
    this.createNPC(22 * this.tileSize, 8 * this.tileSize, 'npc_apprentice_idle_0', 'Apprentice');

    // Merchant (bottom-left area)
    this.createNPC(10 * this.tileSize, 16 * this.tileSize, 'npc_merchant_idle_0', 'Merchant');
  }

  private createNPC(x: number, y: number, frame: string, name: string): void {
    const npc = this.scene.add.sprite(x, y, 'atlas', frame);
    npc.setDisplaySize(this.tileSize, this.tileSize);
    npc.setDepth(100);

    // Add name label
    const label = this.scene.add.text(x, y - this.tileSize / 2 - 10, name, {
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 5, y: 2 },
    });
    label.setOrigin(0.5, 1);
    label.setDepth(101);

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
}
