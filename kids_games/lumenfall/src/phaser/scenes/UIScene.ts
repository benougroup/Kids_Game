import Phaser from 'phaser';

/**
 * UI Scene - Handles HUD, inventory, dialogue boxes
 * Runs parallel to GameScene
 */
export class UIScene extends Phaser.Scene {
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
    const width = this.scale.width; // height available if needed
    // const height = this.scale.height;

    // Create HUD background
    const hudBg = this.add.rectangle(0, 0, width, 60, 0x000000, 0.7);
    hudBg.setOrigin(0, 0);
    hudBg.setScrollFactor(0);
    hudBg.setDepth(2000);

    // HP Bar
    const hpBarBg = this.add.rectangle(20, 15, 200, 15, 0x330000);
    hpBarBg.setOrigin(0, 0);
    hpBarBg.setScrollFactor(0);
    hpBarBg.setDepth(2001);

    const hpBar = this.add.rectangle(20, 15, 200, 15, 0xff0000);
    hpBar.setOrigin(0, 0);
    hpBar.setScrollFactor(0);
    hpBar.setDepth(2002);
    hpBar.setData('bar', true);
    hpBar.setData('type', 'hp');

    this.hpText = this.add.text(25, 17, `HP: ${this.hp}/${this.maxHp}`, {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'Arial',
    });
    this.hpText.setScrollFactor(0);
    this.hpText.setDepth(2003);

    // SP Bar
    const spBarBg = this.add.rectangle(20, 35, 200, 15, 0x000033);
    spBarBg.setOrigin(0, 0);
    spBarBg.setScrollFactor(0);
    spBarBg.setDepth(2001);

    const spBar = this.add.rectangle(20, 35, 200, 15, 0x0088ff);
    spBar.setOrigin(0, 0);
    spBar.setScrollFactor(0);
    spBar.setDepth(2002);
    spBar.setData('bar', true);
    spBar.setData('type', 'sp');

    this.spText = this.add.text(25, 37, `SP: ${this.sp}/${this.maxSp}`, {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'Arial',
    });
    this.spText.setScrollFactor(0);
    this.spText.setDepth(2003);

    // Time display
    this.timeText = this.add.text(width - 120, 20, 'DAY', {
      fontSize: '20px',
      color: '#ffff00',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    });
    this.timeText.setOrigin(1, 0);
    this.timeText.setScrollFactor(0);
    this.timeText.setDepth(2003);

    // Create buttons
    this.createButtons();

    // Create inventory panel (hidden by default)
    this.createInventoryPanel();

    // Listen for time updates from GameScene
    const gameScene = this.scene.get('GameScene');
    gameScene.events.on('timeUpdate', (timeOfDay: number) => {
      this.updateTimeDisplay(timeOfDay);
    });

    // Handle resize
    this.scale.on('resize', this.handleResize, this);
  }

  private createButtons(): void {
    const width = this.scale.width; // height available if needed
    const height = this.scale.height;

    // BAG button (bottom-right)
    const bagX = width - 100;
    const bagY = height - 100;

    this.bagButton = this.add.container(bagX, bagY);
    this.bagButton.setScrollFactor(0);
    this.bagButton.setDepth(2010);

    const bagBg = this.add.rectangle(0, 0, 80, 80, 0x4a90e2, 1);
    const bagText = this.add.text(0, 0, 'BAG', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    });
    bagText.setOrigin(0.5);

    this.bagButton.add([bagBg, bagText]);
    this.bagButton.setSize(80, 80);
    this.bagButton.setInteractive();
    this.bagButton.on('pointerdown', () => this.toggleInventory());

    // ACT button (bottom-right, above BAG)
    const actX = width - 220;
    const actY = height - 100;

    this.actionButton = this.add.container(actX, actY);
    this.actionButton.setScrollFactor(0);
    this.actionButton.setDepth(2010);

    const actBg = this.add.rectangle(0, 0, 80, 80, 0xe74c3c, 1);
    const actText = this.add.text(0, 0, 'ACT', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    });
    actText.setOrigin(0.5);

    this.actionButton.add([actBg, actText]);
    this.actionButton.setSize(80, 80);
    this.actionButton.setInteractive();
    this.actionButton.on('pointerdown', () => this.handleAction());
  }

  private createInventoryPanel(): void {
    const width = this.scale.width; // height available if needed
    const height = this.scale.height;

    this.inventoryPanel = this.add.container(0, 0);
    this.inventoryPanel.setScrollFactor(0);
    this.inventoryPanel.setDepth(3000);
    this.inventoryPanel.setVisible(false);

    // Full-screen overlay
    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.7);
    overlay.setOrigin(0, 0);
    overlay.setInteractive();
    overlay.on('pointerdown', () => this.toggleInventory());

    // Inventory box
    const boxWidth = Math.min(500, width - 40);
    const boxHeight = Math.min(400, height - 100);
    const boxX = width / 2;
    const boxY = height / 2;

    const box = this.add.rectangle(boxX, boxY, boxWidth, boxHeight, 0x2c3e50, 1);
    box.setStrokeStyle(3, 0xecf0f1);

    const title = this.add.text(boxX, boxY - boxHeight / 2 + 30, 'Inventory', {
      fontSize: '24px',
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
    console.log('Action button pressed!');
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
      this.bagButton.setPosition(width - 100, height - 100);
    }
    if (this.actionButton) {
      this.actionButton.setPosition(width - 220, height - 100);
    }

    // Reposition time text
    if (this.timeText) {
      this.timeText.setPosition(width - 120, 20);
    }
  }
}
