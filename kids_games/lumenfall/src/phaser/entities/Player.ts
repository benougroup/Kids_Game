import Phaser from 'phaser';

/**
 * Player character with animated sprite and smooth 8-direction movement
 * Properly sized for 64x64 tile grid
 */
export class Player {
  public sprite: Phaser.Physics.Arcade.Sprite;
  private speed: number = 150;
  private scene: Phaser.Scene;
  private lanternActive: boolean = false;
  private TILE_SIZE: number = 64;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;

    // Create player sprite - 48x48 display size (slightly smaller than 64px tile)
    this.sprite = scene.physics.add.sprite(x, y, 'characters', 'hero_idle_front');
    this.sprite.setDisplaySize(48, 48);
    this.sprite.setOrigin(0.5, 0.5);
    this.sprite.setSize(32, 32); // Collision box (smaller than display)
    this.sprite.setOffset(8, 8);
    this.sprite.setDepth(500); // High depth so player is above tiles

    this.createAnimations();
    this.sprite.play('player_idle');
  }

  private createAnimations(): void {
    if (!this.scene.anims.exists('player_idle')) {
      this.scene.anims.create({
        key: 'player_idle',
        frames: [{ key: 'characters', frame: 'hero_idle_front' }],
        frameRate: 2,
        repeat: -1,
      });
    }

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
    
    if (!this.scene.anims.exists('player_walk_side')) {
      this.scene.anims.create({
        key: 'player_walk_side',
        frames: [
          { key: 'characters', frame: 'hero_walk_side_1' },
          { key: 'characters', frame: 'hero_walk_side_2' },
        ],
        frameRate: 8,
        repeat: -1,
      });
    }
  }

  update(
    cursors: Phaser.Types.Input.Keyboard.CursorKeys,
    wasd: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key },
    isBlocked?: (x: number, y: number) => boolean
  ): void {
    let vx = 0;
    let vy = 0;

    if (cursors.left.isDown || wasd.A.isDown) vx = -1;
    else if (cursors.right.isDown || wasd.D.isDown) vx = 1;
    if (cursors.up.isDown || wasd.W.isDown) vy = -1;
    else if (cursors.down.isDown || wasd.S.isDown) vy = 1;

    // Normalize diagonal
    if (vx !== 0 && vy !== 0) {
      vx *= 0.707;
      vy *= 0.707;
    }

    // Collision check
    if (isBlocked && (vx !== 0 || vy !== 0)) {
      const margin = 20;
      const futureX = this.sprite.x + vx * this.speed * 0.016;
      const futureY = this.sprite.y + vy * this.speed * 0.016;
      
      // Check corners of player hitbox
      const checkPoints = [
        { x: futureX - margin, y: futureY - margin },
        { x: futureX + margin, y: futureY - margin },
        { x: futureX - margin, y: futureY + margin },
        { x: futureX + margin, y: futureY + margin },
      ];
      
      let blockedX = false;
      let blockedY = false;
      
      for (const pt of checkPoints) {
        if (isBlocked(pt.x, this.sprite.y)) blockedX = true;
        if (isBlocked(this.sprite.x, pt.y)) blockedY = true;
      }
      
      if (blockedX) vx = 0;
      if (blockedY) vy = 0;
    }

    this.sprite.setVelocity(vx * this.speed, vy * this.speed);
    this.updateAnimation(vx, vy);
  }

  public playWalkAnimation(vx: number, vy: number): void {
    this.updateAnimation(vx, vy);
  }

  public playIdleAnimation(): void {
    if (this.sprite.anims.currentAnim?.key !== 'player_idle') {
      this.sprite.play('player_idle');
    }
  }

  private updateAnimation(vx: number, vy: number): void {
    if (vx !== 0 || vy !== 0) {
      const animKey = Math.abs(vx) > Math.abs(vy) ? 'player_walk_side' : 'player_walk';
      if (this.sprite.anims.currentAnim?.key !== animKey) {
        this.sprite.play(animKey);
      }
      if (vx < 0) this.sprite.setFlipX(true);
      else if (vx > 0) this.sprite.setFlipX(false);
    } else {
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
  }

  isLanternActive(): boolean {
    return this.lanternActive;
  }

  getTileSize(): number {
    return this.TILE_SIZE;
  }
}
