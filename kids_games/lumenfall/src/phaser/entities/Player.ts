import Phaser from 'phaser';

/**
 * Player character with animated sprite and smooth 8-direction movement
 */
export class Player {
  public sprite: Phaser.Physics.Arcade.Sprite;
  private speed: number = 120;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;

    // Create player sprite (48x48 to show full character, centered on tile)
    this.sprite = scene.physics.add.sprite(x, y, 'atlas');
    this.sprite.setDisplaySize(48, 48); // Square sprite for full character
    this.sprite.setOrigin(0.5, 0.5); // Center anchor
    this.sprite.setSize(24, 24); // Collision box
    this.sprite.setOffset(12, 12); // Center collision box
    this.sprite.setDepth(100);

    // Create animations
    this.createAnimations();

    // Play idle animation
    this.sprite.play('player_idle');

    // Enable physics (no world bounds collision - allow portal transitions)
  }

  private createAnimations(): void {
    // Idle animation
    if (!this.scene.anims.exists('player_idle')) {
      this.scene.anims.create({
        key: 'player_idle',
        frames: [
          { key: 'atlas', frame: 'player_idle_0' },
          { key: 'atlas', frame: 'player_idle_1' },
        ],
        frameRate: 2,
        repeat: -1,
      });
    }

    // Walk animation
    if (!this.scene.anims.exists('player_walk')) {
      this.scene.anims.create({
        key: 'player_walk',
        frames: [
          { key: 'atlas', frame: 'player_walk_0' },
          { key: 'atlas', frame: 'player_walk_1' },
          { key: 'atlas', frame: 'player_walk_2' },
        ],
        frameRate: 8,
        repeat: -1,
      });
    }
  }

  update(
    cursors: Phaser.Types.Input.Keyboard.CursorKeys,
    wasd: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key }
  ): void {
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
    this.sprite.setVelocity(velocityX * this.speed, velocityY * this.speed);

    // Update animation
    if (velocityX !== 0 || velocityY !== 0) {
      // Moving
      if (this.sprite.anims.currentAnim?.key !== 'player_walk') {
        this.sprite.play('player_walk');
      }
      
      // Flip sprite based on direction
      if (velocityX < 0) {
        this.sprite.setFlipX(true);
      } else if (velocityX > 0) {
        this.sprite.setFlipX(false);
      }
    } else {
      // Idle
      if (this.sprite.anims.currentAnim?.key !== 'player_idle') {
        this.sprite.play('player_idle');
      }
    }
  }

  getPosition(): { x: number; y: number } {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  setPosition(x: number, y: number): void {
    this.sprite.setPosition(x, y);
  }
}
