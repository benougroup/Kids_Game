import Phaser from 'phaser';

/**
 * Player character with animated sprite and smooth 8-direction movement
 */
export class Player {
  public sprite: Phaser.Physics.Arcade.Sprite;
  private speed: number = 120;
  private scene: Phaser.Scene;
  private lanternActive: boolean = false; // Lantern on/off state

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;

    // Create player sprite from characters atlas (64x64 in atlas → 32x32 on screen)
    this.sprite = scene.physics.add.sprite(x, y, 'characters', 'hero_idle_front');
    this.sprite.setDisplaySize(32, 32); // 32x32 to fit tile grid
    this.sprite.setOrigin(0.5, 0.5); // Center anchor
    this.sprite.setSize(24, 24); // Collision box
    this.sprite.setOffset(4, 4); // Center collision box
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
          { key: 'characters', frame: 'hero_idle_front' },
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
          { key: 'characters', frame: 'hero_walk_front_1' },
          { key: 'characters', frame: 'hero_walk_front_2' },
        ],
        frameRate: 8,
        repeat: -1,
      });
    }
  }

  update(
    cursors: Phaser.Types.Input.Keyboard.CursorKeys,
    wasd: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key },
    checkWaterCollision?: (x: number, y: number) => boolean
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

    // Check water collision before applying velocity
    if (checkWaterCollision) {
      const futureX = this.sprite.x + velocityX * this.speed * 0.016; // Approximate next position
      const futureY = this.sprite.y + velocityY * this.speed * 0.016;
      
      if (checkWaterCollision(futureX, futureY)) {
        // Stop movement if trying to walk into water
        velocityX = 0;
        velocityY = 0;
      }
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

  toggleLantern(): void {
    this.lanternActive = !this.lanternActive;
    
    // Switch sprite frame based on lantern state
    if (this.lanternActive) {
      this.sprite.setFrame('hero_lantern');
    } else {
      this.sprite.setFrame('hero_idle_front');
    }
  }

  isLanternActive(): boolean {
    return this.lanternActive;
  }
}
