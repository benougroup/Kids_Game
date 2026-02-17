import Phaser from 'phaser';

/**
 * Town Map - Bright Hollow
 * Isometric-style town with buildings, NPCs, central plaza
 */
export class TownMap {
  private scene: Phaser.Scene;
  private buildings: Phaser.GameObjects.Group;
  private npcs: Phaser.GameObjects.Group;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.buildings = scene.add.group();
    this.npcs = scene.add.group();
  }

  create(): void {
    // Create ground
    this.createGround();

    // Create buildings
    this.createBuildings();

    // Create central plaza with light post
    this.createPlaza();

    // Create NPCs
    this.createNPCs();
  }

  private createGround(): void {
    // Create a large grass area
    const ground = this.scene.add.rectangle(400, 300, 1200, 900, 0x5cb85c);
    ground.setDepth(0);

    // Add some dirt paths
    const pathVertical = this.scene.add.rectangle(400, 300, 80, 900, 0x8b6f47);
    pathVertical.setDepth(1);

    const pathHorizontal = this.scene.add.rectangle(400, 300, 1200, 80, 0x8b6f47);
    pathHorizontal.setDepth(1);
  }

  private createBuildings(): void {
    // Building layout (isometric-ish view)
    const buildings = [
      // Top-left: Guard house
      { x: 200, y: 150, width: 120, height: 100, color: 0x8b4513, name: 'Guard House' },
      
      // Top-right: Apprentice's study
      { x: 600, y: 150, width: 120, height: 100, color: 0x4b0082, name: 'Study' },
      
      // Bottom-left: General store
      { x: 200, y: 450, width: 120, height: 100, color: 0xd2691e, name: 'Store' },
      
      // Bottom-right: Inn
      { x: 600, y: 450, width: 120, height: 100, color: 0xdc143c, name: 'Inn' },
      
      // Left side: Houses
      { x: 100, y: 300, width: 80, height: 80, color: 0xcd853f, name: 'House' },
      
      // Right side: Houses
      { x: 700, y: 300, width: 80, height: 80, color: 0xcd853f, name: 'House' },
    ];

    buildings.forEach(building => {
      this.createBuilding(building.x, building.y, building.width, building.height, building.color, building.name);
    });
  }

  private createBuilding(x: number, y: number, width: number, height: number, color: number, name: string): void {
    // Building body
    const body = this.scene.add.rectangle(x, y, width, height, color);
    body.setStrokeStyle(3, 0x000000);
    body.setDepth(10);

    // Roof (isometric-ish)
    const roof = this.scene.add.triangle(
      x, y - height / 2 - 20,
      0, 40,
      width / 2, 0,
      width, 40,
      0x8b0000
    );
    roof.setStrokeStyle(2, 0x000000);
    roof.setDepth(11);

    // Door
    const door = this.scene.add.rectangle(x, y + height / 3, width / 4, height / 3, 0x654321);
    door.setDepth(12);

    // Window
    const window1 = this.scene.add.rectangle(x - width / 4, y - height / 6, width / 5, height / 5, 0x87ceeb);
    window1.setStrokeStyle(1, 0x000000);
    window1.setDepth(12);

    // Label (for debugging)
    const label = this.scene.add.text(x, y - height / 2 - 50, name, {
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 5, y: 2 },
    });
    label.setOrigin(0.5);
    label.setDepth(13);

    // Add to group
    this.buildings.add(body);
    this.buildings.add(roof);
    this.buildings.add(door);
    this.buildings.add(window1);
    this.buildings.add(label);

    // Enable physics for collision
    this.scene.physics.add.existing(body, true); // true = static body
  }

  private createPlaza(): void {
    // Central plaza (stone floor)
    const plaza = this.scene.add.rectangle(400, 300, 200, 200, 0x7a7a7a);
    plaza.setStrokeStyle(2, 0x5a5a5a);
    plaza.setDepth(2);

    // Central light post
    const postBase = this.scene.add.rectangle(400, 300, 20, 80, 0x4a4a4a);
    postBase.setDepth(50);

    const lantern = this.scene.add.circle(400, 260, 25, 0xffd700);
    lantern.setStrokeStyle(3, 0x333333);
    lantern.setDepth(51);

    // Glow effect
    const glow = this.scene.add.circle(400, 260, 60, 0xffff00, 0.3);
    glow.setDepth(49);

    // Animate glow
    this.scene.tweens.add({
      targets: glow,
      alpha: 0.5,
      scale: 1.2,
      duration: 2000,
      yoyo: true,
      repeat: -1,
    });
  }

  private createNPCs(): void {
    // Guard (near guard house)
    this.createNPC(200, 250, 0x8b0000, 'Guard');

    // Apprentice (near study)
    this.createNPC(600, 250, 0x4b0082, 'Apprentice');

    // Merchant (near store)
    this.createNPC(200, 350, 0xd2691e, 'Merchant');
  }

  private createNPC(x: number, y: number, color: number, name: string): void {
    // NPC body
    const npc = this.scene.add.ellipse(x, y, 25, 35, color);
    npc.setStrokeStyle(2, 0xffffff);
    npc.setDepth(100);

    // Name label
    const label = this.scene.add.text(x, y - 30, name, {
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 5, y: 2 },
    });
    label.setOrigin(0.5);
    label.setDepth(101);

    // Enable physics
    this.scene.physics.add.existing(npc, true); // static body

    // Store NPC data
    npc.setData('npcName', name);
    npc.setData('npcType', name.toLowerCase());

    this.npcs.add(npc);
    this.npcs.add(label);
  }

  public getBuildings(): Phaser.GameObjects.Group {
    return this.buildings;
  }

  public getNPCs(): Phaser.GameObjects.Group {
    return this.npcs;
  }
}
