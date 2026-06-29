/**
 * RPG-style Dialogue Box
 * Classic JRPG-style dialogue system with portrait and text
 */
export class DialogueBox {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private background: Phaser.GameObjects.Graphics;
  private overlay: Phaser.GameObjects.Rectangle;
  private portrait: Phaser.GameObjects.Sprite | null = null;
  private nameText: Phaser.GameObjects.Text;
  private dialogueText: Phaser.GameObjects.Text;
  private continueIndicator: Phaser.GameObjects.Text;
  private isVisible: boolean = false;
  private currentText: string = '';
  private displayedText: string = '';
  private textIndex: number = 0;
  private textSpeed: number = 30; // Characters per second
  private onCloseCallback: (() => void) | null = null;
  private nameBg!: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Create container for all dialogue elements
    this.container = scene.add.container(0, 0);
    this.container.setDepth(10000);
    this.container.setVisible(false);
    this.container.setScrollFactor(0); // Fixed to camera, not world

    // Dim overlay so the popup is always page-based, independent from map/background size
    this.overlay = scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, 0x000000, 0.42);
    this.overlay.setOrigin(0, 0);
    this.overlay.setScrollFactor(0);
    this.container.add(this.overlay);

    // Background box
    this.background = scene.add.graphics();
    this.container.add(this.background);

    // Name label background
    this.nameBg = scene.add.graphics();
    this.container.add(this.nameBg);

    // Name text
    this.nameText = scene.add.text(0, 0, '', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
      align: 'center',
    });
    this.nameText.setOrigin(0.5, 0.5);
    this.container.add(this.nameText);

    // Dialogue text
    this.dialogueText = scene.add.text(0, 0, '', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      wordWrap: { width: 480 },
      lineSpacing: 8,
    });
    this.container.add(this.dialogueText);

    // Continue indicator (blinking arrow)
    this.continueIndicator = scene.add.text(0, 0, '▼', {
      fontSize: '20px',
      color: '#ffffff',
    });
    this.continueIndicator.setOrigin(0.5, 0.5);
    this.continueIndicator.setVisible(false);
    this.container.add(this.continueIndicator);

    // Blink animation for continue indicator
    scene.tweens.add({
      targets: this.continueIndicator,
      alpha: 0.3,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    // Handle click to continue/close
    scene.input.on('pointerdown', () => {
      if (this.isVisible) {
        if (this.textIndex < this.currentText.length) {
          // Skip to end of text
          this.displayedText = this.currentText;
          this.textIndex = this.currentText.length;
          this.dialogueText.setText(this.displayedText);
          this.continueIndicator.setVisible(true);
        } else {
          // Close dialogue
          this.hide();
        }
      }
    });

    this.layout();
    scene.scale.on('resize', this.layout, this);
  }

  private layout(): void {
    const viewportW = this.scene.scale.width;
    const viewportH = this.scene.scale.height;
    const boxWidth = Math.min(760, viewportW - 24);
    const boxHeight = Math.min(260, Math.max(170, Math.round(viewportH * 0.36)));
    const x = Math.round((viewportW - boxWidth) / 2);
    const y = Math.round((viewportH - boxHeight) / 2);
    const portraitSize = Math.min(96, Math.max(64, Math.round(boxHeight * 0.58)));
    const innerPad = 18;
    const portraitX = x + innerPad + portraitSize / 2 + 8;
    const portraitY = y + boxHeight / 2 + 8;
    const textLeft = x + portraitSize + 44;
    const textTop = y + innerPad + 18;
    const textWrap = boxWidth - portraitSize - 72;

    this.overlay.setSize(viewportW, viewportH);
    this.drawBackground(x, y, boxWidth, boxHeight, portraitSize);

    this.nameBg.clear();
    this.nameBg.fillStyle(0x2a2a4a, 1);
    this.nameBg.fillRoundedRect(x + 20, y - 12, 160, 32, 8);
    this.nameBg.lineStyle(2, 0xffffff, 1);
    this.nameBg.strokeRoundedRect(x + 20, y - 12, 160, 32, 8);

    this.nameText.setPosition(x + 100, y + 4);
    this.dialogueText.setPosition(textLeft, textTop);
    this.dialogueText.setWordWrapWidth(Math.max(220, textWrap), true);
    this.continueIndicator.setPosition(x + boxWidth - 24, y + boxHeight - 20);
    if (this.portrait) {
      this.portrait.setPosition(portraitX, portraitY);
      this.portrait.setDisplaySize(portraitSize, portraitSize);
    }
  }

  private drawBackground(x: number, y: number, width: number, height: number, portraitSize: number): void {
    this.background.clear();

    // Outer border (white)
    this.background.lineStyle(3, 0xffffff, 1);
    this.background.fillStyle(0x1a1a3a, 0.95);
    this.background.fillRoundedRect(x, y, width, height, 12);
    this.background.strokeRoundedRect(x, y, width, height, 12);

    // Inner border (lighter)
    this.background.lineStyle(2, 0x6666aa, 1);
    this.background.strokeRoundedRect(x + 8, y + 8, width - 16, height - 16, 8);

    // Portrait frame (left side)
    this.background.fillStyle(0x2a2a4a, 1);
    this.background.fillRoundedRect(x + 18, y + Math.round((height - portraitSize) / 2), portraitSize + 16, portraitSize + 16, 8);
    this.background.lineStyle(2, 0xffffff, 1);
    this.background.strokeRoundedRect(x + 18, y + Math.round((height - portraitSize) / 2), portraitSize + 16, portraitSize + 16, 8);
  }

  /**
   * Show dialogue box with text
   * @param speaker Name of the speaker
   * @param text Dialogue text
   * @param portraitFrame Optional portrait sprite frame from characters atlas
   * @param onClose Optional callback when dialogue closes
   */
  public show(
    speaker: string,
    text: string,
    portraitFrame?: string,
    onClose?: () => void
  ): void {
    this.isVisible = true;
    this.currentText = text;
    this.displayedText = '';
    this.textIndex = 0;
    this.onCloseCallback = onClose || null;

    // Set speaker name
    this.nameText.setText(speaker);

    // Clear previous portrait
    if (this.portrait) {
      this.portrait.destroy();
      this.portrait = null;
    }

    // Add portrait if provided
    if (portraitFrame) {
      this.portrait = this.scene.add.sprite(0, 0, 'characters', portraitFrame);
      this.container.add(this.portrait);
    }

    // Reset text
    this.dialogueText.setText('');
    this.continueIndicator.setVisible(false);

    // Show container
    this.container.setVisible(true);
    this.layout();

    // Start text animation
    this.animateText();
  }

  private animateText(): void {
    // Type out text character by character
    const timer = this.scene.time.addEvent({
      delay: 1000 / this.textSpeed,
      callback: () => {
        if (this.textIndex < this.currentText.length) {
          this.displayedText += this.currentText[this.textIndex];
          this.textIndex++;
          this.dialogueText.setText(this.displayedText);
        } else {
          timer.remove();
          this.continueIndicator.setVisible(true);
        }
      },
      loop: true,
    });
  }

  /**
   * Hide dialogue box
   */
  public hide(): void {
    this.isVisible = false;
    this.container.setVisible(false);

    if (this.onCloseCallback) {
      this.onCloseCallback();
      this.onCloseCallback = null;
    }
  }

  /**
   * Check if dialogue is currently visible
   */
  public getIsVisible(): boolean {
    return this.isVisible;
  }

  /**
   * Destroy dialogue box
   */
  public destroy(): void {
    this.scene.scale.off('resize', this.layout, this);
    this.container.destroy();
  }
}
