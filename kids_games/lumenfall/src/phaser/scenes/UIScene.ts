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
  
  private actionButton!: Phaser.GameObjects.Container;
  private bagButton!: Phaser.GameObjects.Container;

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
    // height used in buttons

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

    // Create buttons (moved up from bottom edge)
    this.createButtons();

    // Create inventory panel (hidden by default)
    this.createInventoryPanel();

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

    // BAG button (bottom-right, moved up)
    const bagX = width - 90;
    const bagY = height - 120; // Moved up from edge

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

    // ACT button (left of BAG, moved up)
    const actX = width - 180;
    const actY = height - 120; // Moved up from edge

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

  private toggleInventory(): void {
    this.inventoryVisible = !this.inventoryVisible;
    this.inventoryPanel.setVisible(this.inventoryVisible);
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
      this.bagButton.setPosition(width - 90, height - 120);
    }
    if (this.actionButton) {
      this.actionButton.setPosition(width - 180, height - 120);
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
