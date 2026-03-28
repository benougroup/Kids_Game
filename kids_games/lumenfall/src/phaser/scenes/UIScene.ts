import Phaser from 'phaser';

/**
 * UI Scene - Handles HUD, inventory, dialogue boxes
 * Runs parallel to GameScene
 */
export class UIScene extends Phaser.Scene {
  private hpBar!: Phaser.GameObjects.Rectangle;
  private spBar!: Phaser.GameObjects.Rectangle;
  private hpText!: Phaser.GameObjects.Text;
  private spText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  
  private inventoryPanel!: Phaser.GameObjects.Container;
  private inventoryVisible: boolean = false;

  private mapPanel!: Phaser.GameObjects.Container;
  private mapVisible: boolean = false;
  
  private actionButton!: Phaser.GameObjects.Container;
  private bagButton!: Phaser.GameObjects.Container;
  private mapButton!: Phaser.GameObjects.Container;

  // Player stats
  private hp: number = 6;
  private maxHp: number = 6;
  private sp: number = 4;
  private maxSp: number = 4;

  constructor() {
    super({ key: 'UIScene', active: true });
  }

  create(): void {
    const width = this.scale.width;

    // Create HUD background (top bar)
    const hudBg = this.add.rectangle(0, 0, width, 80, 0x000000, 0.8);
    hudBg.setOrigin(0, 0);
    hudBg.setScrollFactor(0);
    hudBg.setDepth(2000);

    // HP Bar (top-left)
    const hpBarBg = this.add.rectangle(20, 15, 250, 20, 0x330000);
    hpBarBg.setOrigin(0, 0);
    hpBarBg.setScrollFactor(0);
    hpBarBg.setDepth(2001);

    this.hpBar = this.add.rectangle(20, 15, 250, 20, 0xff0000);
    this.hpBar.setOrigin(0, 0);
    this.hpBar.setScrollFactor(0);
    this.hpBar.setDepth(2002);

    this.hpText = this.add.text(25, 18, `HP: ${this.hp}/${this.maxHp}`, {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    });
    this.hpText.setScrollFactor(0);
    this.hpText.setDepth(2003);

    // SP Bar (below HP)
    const spBarBg = this.add.rectangle(20, 45, 250, 20, 0x000033);
    spBarBg.setOrigin(0, 0);
    spBarBg.setScrollFactor(0);
    spBarBg.setDepth(2001);

    this.spBar = this.add.rectangle(20, 45, 250, 20, 0x0088ff);
    this.spBar.setOrigin(0, 0);
    this.spBar.setScrollFactor(0);
    this.spBar.setDepth(2002);

    this.spText = this.add.text(25, 48, `SP: ${this.sp}/${this.maxSp}`, {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    });
    this.spText.setScrollFactor(0);
    this.spText.setDepth(2003);

    // Time display (top-right)
    this.timeText = this.add.text(width - 20, 35, 'DAY', {
      fontSize: '24px',
      color: '#ffff00',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    });
    this.timeText.setOrigin(1, 0.5);
    this.timeText.setScrollFactor(0);
    this.timeText.setDepth(2003);

    // Create buttons (bottom-right: MAP, ACT, BAG)
    this.createButtons();

    // Create inventory panel (hidden by default)
    this.createInventoryPanel();

    // Create map panel (hidden by default)
    this.createMapPanel();

    // Listen for time updates from GameScene
    const gameScene = this.scene.get('GameScene');
    gameScene.events.on('timeUpdate', (timeOfDay: number) => {
      this.updateTimeDisplay(timeOfDay);
    });

    // Listen for dialogue events
    gameScene.events.on('showDialogue', (npcName: string) => {
      this.showDialogue(npcName);
    });

    // Handle resize
    this.scale.on('resize', this.handleResize, this);
  }

  private createButtons(): void {
    const width = this.scale.width;
    const height = this.scale.height;

    // BAG button (bottom-right)
    const bagX = width - 60;
    const bagY = height - 90;

    this.bagButton = this.add.container(bagX, bagY);
    this.bagButton.setScrollFactor(0);
    this.bagButton.setDepth(2010);

    const bagBg = this.add.rectangle(0, 0, 70, 70, 0x4a90e2, 1);
    bagBg.setStrokeStyle(3, 0xffffff);
    const bagText = this.add.text(0, 0, 'BAG', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    });
    bagText.setOrigin(0.5);

    this.bagButton.add([bagBg, bagText]);
    this.bagButton.setSize(70, 70);
    this.bagButton.setInteractive();
    this.bagButton.on('pointerdown', () => this.toggleInventory());

    // ACT button (left of BAG)
    const actX = width - 150;
    const actY = height - 90;

    this.actionButton = this.add.container(actX, actY);
    this.actionButton.setScrollFactor(0);
    this.actionButton.setDepth(2010);

    const actBg = this.add.rectangle(0, 0, 70, 70, 0xe74c3c, 1);
    actBg.setStrokeStyle(3, 0xffffff);
    const actText = this.add.text(0, 0, 'ACT', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    });
    actText.setOrigin(0.5);

    this.actionButton.add([actBg, actText]);
    this.actionButton.setSize(70, 70);
    this.actionButton.setInteractive();
    this.actionButton.on('pointerdown', () => this.handleAction());

    // MAP button (left of ACT)
    const mapX = width - 240;
    const mapY = height - 90;

    this.mapButton = this.add.container(mapX, mapY);
    this.mapButton.setScrollFactor(0);
    this.mapButton.setDepth(2010);

    const mapBg = this.add.rectangle(0, 0, 70, 70, 0x27ae60, 1);
    mapBg.setStrokeStyle(3, 0xffffff);
    const mapText = this.add.text(0, 0, 'MAP', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    });
    mapText.setOrigin(0.5);

    this.mapButton.add([mapBg, mapText]);
    this.mapButton.setSize(70, 70);
    this.mapButton.setInteractive();
    this.mapButton.on('pointerdown', () => this.toggleMap());
  }

  private createInventoryPanel(): void {
    const width = this.scale.width;
    const height = this.scale.height;

    this.inventoryPanel = this.add.container(0, 0);
    this.inventoryPanel.setScrollFactor(0);
    this.inventoryPanel.setDepth(3000);
    this.inventoryPanel.setVisible(false);

    // Full-screen overlay
    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.8);
    overlay.setOrigin(0, 0);
    overlay.setInteractive();
    overlay.on('pointerdown', () => this.toggleInventory());

    // Inventory box
    const boxWidth = Math.min(500, width - 40);
    const boxHeight = Math.min(400, height - 100);
    const boxX = width / 2;
    const boxY = height / 2;

    const box = this.add.rectangle(boxX, boxY, boxWidth, boxHeight, 0x2c3e50, 1);
    box.setStrokeStyle(4, 0xecf0f1);

    const title = this.add.text(boxX, boxY - boxHeight / 2 + 30, 'Inventory', {
      fontSize: '28px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);

    const itemsText = this.add.text(boxX, boxY, 'No items yet', {
      fontSize: '18px',
      color: '#ecf0f1',
      fontFamily: 'Arial',
    });
    itemsText.setOrigin(0.5);

    const closeBtn = this.add.text(boxX, boxY + boxHeight / 2 - 40, 'Close', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'Arial',
      backgroundColor: '#e74c3c',
      padding: { x: 20, y: 10 },
    });
    closeBtn.setOrigin(0.5);
    closeBtn.setInteractive();
    closeBtn.on('pointerdown', () => this.toggleInventory());

    this.inventoryPanel.add([overlay, box, title, itemsText, closeBtn]);
  }

  private createMapPanel(): void {
    const width = this.scale.width;
    const height = this.scale.height;

    this.mapPanel = this.add.container(0, 0);
    this.mapPanel.setScrollFactor(0);
    this.mapPanel.setDepth(3000);
    this.mapPanel.setVisible(false);

    // Full-screen overlay
    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.85);
    overlay.setOrigin(0, 0);
    overlay.setInteractive();
    overlay.on('pointerdown', () => this.toggleMap());

    // Map panel box
    const boxWidth = Math.min(560, width - 40);
    const boxHeight = Math.min(460, height - 80);
    const boxX = width / 2;
    const boxY = height / 2;

    const box = this.add.rectangle(boxX, boxY, boxWidth, boxHeight, 0x1a2a3a, 1);
    box.setStrokeStyle(4, 0x4a90e2);

    const title = this.add.text(boxX, boxY - boxHeight / 2 + 30, 'World Map', {
      fontSize: '26px',
      color: '#4a90e2',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);

    // Draw a simple schematic map
    const mapGraphics = this.add.graphics();
    const mapLeft = boxX - boxWidth / 2 + 30;
    const mapTop = boxY - boxHeight / 2 + 60;
    const mapW = boxWidth - 60;
    const mapH = boxHeight - 120;

    // Background
    mapGraphics.fillStyle(0x2d5a27, 1);
    mapGraphics.fillRect(mapLeft, mapTop, mapW, mapH);

    // Town (center)
    const townX = mapLeft + mapW * 0.5;
    const townY = mapTop + mapH * 0.55;
    mapGraphics.fillStyle(0x8b7355, 1);
    mapGraphics.fillRect(townX - 30, townY - 20, 60, 40);
    mapGraphics.lineStyle(2, 0xffd700, 1);
    mapGraphics.strokeRect(townX - 30, townY - 20, 60, 40);

    // Forest (north)
    const forestX = mapLeft + mapW * 0.5;
    const forestY = mapTop + mapH * 0.2;
    mapGraphics.fillStyle(0x1a5c1a, 1);
    mapGraphics.fillRect(forestX - 25, forestY - 15, 50, 30);
    mapGraphics.lineStyle(2, 0x44aa44, 1);
    mapGraphics.strokeRect(forestX - 25, forestY - 15, 50, 30);

    // Dungeon (south)
    const dungeonX = mapLeft + mapW * 0.5;
    const dungeonY = mapTop + mapH * 0.85;
    mapGraphics.fillStyle(0x3a1a1a, 1);
    mapGraphics.fillRect(dungeonX - 25, dungeonY - 15, 50, 30);
    mapGraphics.lineStyle(2, 0xaa4444, 1);
    mapGraphics.strokeRect(dungeonX - 25, dungeonY - 15, 50, 30);

    // Roads connecting areas
    mapGraphics.lineStyle(2, 0xc8a96e, 0.8);
    mapGraphics.lineBetween(townX, townY - 20, forestX, forestY + 15);
    mapGraphics.lineBetween(townX, townY + 20, dungeonX, dungeonY - 15);

    // Map labels
    const townLabel = this.add.text(townX, townY, 'Bright\nHollow', {
      fontSize: '10px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold', align: 'center',
    });
    townLabel.setOrigin(0.5);

    const forestLabel = this.add.text(forestX, forestY, 'Whispering\nForest', {
      fontSize: '10px', color: '#aaffaa', fontFamily: 'Arial', align: 'center',
    });
    forestLabel.setOrigin(0.5);

    const dungeonLabel = this.add.text(dungeonX, dungeonY, 'Shadow\nCaverns', {
      fontSize: '10px', color: '#ffaaaa', fontFamily: 'Arial', align: 'center',
    });
    dungeonLabel.setOrigin(0.5);

    // Player position indicator (YOU ARE HERE)
    mapGraphics.fillStyle(0xffff00, 1);
    mapGraphics.fillCircle(townX + 5, townY - 5, 5);

    const youLabel = this.add.text(townX + 14, townY - 5, '← You', {
      fontSize: '10px', color: '#ffff00', fontFamily: 'Arial', fontStyle: 'bold',
    });
    youLabel.setOrigin(0, 0.5);

    // Close button
    const closeBtn = this.add.text(boxX, boxY + boxHeight / 2 - 30, 'Close Map', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'Arial',
      backgroundColor: '#27ae60',
      padding: { x: 20, y: 8 },
    });
    closeBtn.setOrigin(0.5);
    closeBtn.setInteractive();
    closeBtn.on('pointerdown', () => this.toggleMap());

    this.mapPanel.add([overlay, box, title, mapGraphics, townLabel, forestLabel, dungeonLabel, youLabel, closeBtn]);
  }

  private toggleInventory(): void {
    this.inventoryVisible = !this.inventoryVisible;
    this.inventoryPanel.setVisible(this.inventoryVisible);
    if (this.inventoryVisible && this.mapVisible) {
      this.mapVisible = false;
      this.mapPanel.setVisible(false);
    }
  }

  private toggleMap(): void {
    this.mapVisible = !this.mapVisible;
    this.mapPanel.setVisible(this.mapVisible);
    if (this.mapVisible && this.inventoryVisible) {
      this.inventoryVisible = false;
      this.inventoryPanel.setVisible(false);
    }
  }

  private handleAction(): void {
    // Emit action event to GameScene
    const gameScene = this.scene.get('GameScene');
    gameScene.events.emit('playerAction');
  }

  private showDialogue(npcName: string): void {
    // TODO: Implement dialogue system
    console.log('Show dialogue for:', npcName);
    alert(`Talking to ${npcName}\n\n(Dialogue system coming next!)`);
  }

  private updateTimeDisplay(timeOfDay: number): void {
    if (timeOfDay < 0.25) {
      this.timeText.setText('DAWN');
      this.timeText.setColor('#ff9966');
    } else if (timeOfDay < 0.5) {
      this.timeText.setText('DAY');
      this.timeText.setColor('#ffff00');
    } else if (timeOfDay < 0.75) {
      this.timeText.setText('DUSK');
      this.timeText.setColor('#ff6633');
    } else {
      this.timeText.setText('NIGHT');
      this.timeText.setColor('#6666ff');
    }
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    const width = gameSize.width;
    const height = gameSize.height;

    // Reposition buttons
    if (this.bagButton) {
      this.bagButton.setPosition(width - 60, height - 90);
    }
    if (this.actionButton) {
      this.actionButton.setPosition(width - 150, height - 90);
    }
    if (this.mapButton) {
      this.mapButton.setPosition(width - 240, height - 90);
    }

    // Reposition time text
    if (this.timeText) {
      this.timeText.setPosition(width - 20, 35);
    }
  }

  public updateHP(hp: number, maxHp: number): void {
    this.hp = hp;
    this.maxHp = maxHp;
    this.hpText.setText(`HP: ${hp}/${maxHp}`);
    this.hpBar.width = 250 * (hp / maxHp);
  }

  public updateSP(sp: number, maxSp: number): void {
    this.sp = sp;
    this.maxSp = maxSp;
    this.spText.setText(`SP: ${sp}/${maxSp}`);
    this.spBar.width = 250 * (sp / maxSp);
  }
}
