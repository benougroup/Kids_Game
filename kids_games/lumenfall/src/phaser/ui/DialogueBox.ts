/**
 * RPG-style Dialogue Box
 * Classic JRPG-style dialogue system with portrait and text
 */
export class DialogueBox {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private background: Phaser.GameObjects.Graphics;
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

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Create container for all dialogue elements
    this.container = scene.add.container(0, 0);
    this.container.setDepth(10000);
    this.container.setVisible(false);

    // Background box (bottom of screen)
    this.background = scene.add.graphics();
    this.drawBackground();
    this.container.add(this.background);

    // Name label background
    const nameBg = scene.add.graphics();
    nameBg.fillStyle(0x2a2a4a, 1);
    nameBg.fillRoundedRect(40, 420, 150, 40, 8);
    nameBg.lineStyle(3, 0xffffff, 1);
    nameBg.strokeRoundedRect(40, 420, 150, 40, 8);
    this.container.add(nameBg);

    // Name text
    this.nameText = scene.add.text(115, 440, '', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
      align: 'center',
    });
    this.nameText.setOrigin(0.5, 0.5);
    this.container.add(this.nameText);

    // Dialogue text
    this.dialogueText = scene.add.text(220, 490, '', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      wordWrap: { width: 520 },
      lineSpacing: 8,
    });
    this.container.add(this.dialogueText);

    // Continue indicator (blinking arrow)
    this.continueIndicator = scene.add.text(740, 580, '▼', {
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
  }

  private drawBackground(): void {
    const width = 800;
    const height = 200;
    const x = 0;
    const y = 400;

    // Outer border (white)
    this.background.lineStyle(4, 0xffffff, 1);
    this.background.fillStyle(0x1a1a3a, 0.95);
    this.background.fillRoundedRect(x + 20, y + 20, width - 40, height - 40, 12);
    this.background.strokeRoundedRect(x + 20, y + 20, width - 40, height - 40, 12);

    // Inner border (lighter)
    this.background.lineStyle(2, 0x6666aa, 1);
    this.background.strokeRoundedRect(x + 28, y + 28, width - 56, height - 56, 8);

    // Portrait frame (left side)
    this.background.fillStyle(0x2a2a4a, 1);
    this.background.fillRoundedRect(x + 40, y + 470, 140, 100, 8);
    this.background.lineStyle(3, 0xffffff, 1);
    this.background.strokeRoundedRect(x + 40, y + 470, 140, 100, 8);
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
      this.portrait = this.scene.add.sprite(110, 520, 'characters', portraitFrame);
      this.portrait.setDisplaySize(120, 120);
      this.container.add(this.portrait);
    }

    // Reset text
    this.dialogueText.setText('');
    this.continueIndicator.setVisible(false);

    // Show container
    this.container.setVisible(true);

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
    this.container.destroy();
  }
}
