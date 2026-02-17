import Phaser from 'phaser';

/**
 * Player character with smooth 8-direction movement
 */
export class Player {
  public sprite: Phaser.GameObjects.Ellipse;
  private speed: number = 150;
  // Scene reference available if needed

  constructor(scene: Phaser.Scene, x: number, y: number) {
    // this.scene = scene;

    // Create player as a simple shape for now
    // Later we can replace with animated sprite
    this.sprite = scene.add.ellipse(x, y, 30, 40, 0x4a90e2);
    this.sprite.setStrokeStyle(2, 0xffffff);
    this.sprite.setDepth(100);

    // Enable physics
    scene.physics.add.existing(this.sprite);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setSize(30, 40);
  }

  update(
    cursors: Phaser.Types.Input.Keyboard.CursorKeys,
    wasd: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key }
  ): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;

    // Get input direction
    let velocityX = 0;
    let velocityY = 0;

    // Check arrow keys and WASD
    if (cursors.left.isDown || wasd.A.isDown) {
      velocityX = -1;
    } else if (cursors.right.isDown || wasd.D.isDown) {
      velocityX = 1;
    }

    if (cursors.up.isDown || wasd.W.isDown) {
      velocityY = -1;
    } else if (cursors.down.isDown || wasd.S.isDown) {
      velocityY = 1;
    }

    // Normalize diagonal movement
    if (velocityX !== 0 && velocityY !== 0) {
      velocityX *= 0.707; // 1/sqrt(2)
      velocityY *= 0.707;
    }

    // Apply velocity
    body.setVelocity(velocityX * this.speed, velocityY * this.speed);

    // Visual feedback for movement direction
    if (velocityX !== 0 || velocityY !== 0) {
      // Moving - could add animation here
      this.sprite.setFillStyle(0x5aa0f2);
    } else {
      // Idle
      this.sprite.setFillStyle(0x4a90e2);
    }
  }

  getPosition(): { x: number; y: number } {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  setPosition(x: number, y: number): void {
    this.sprite.setPosition(x, y);
  }
}
