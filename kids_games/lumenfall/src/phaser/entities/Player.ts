import Phaser from 'phaser';
import { toRenderDepth } from '../systems/LayeredTileSystem';

export interface MovementInput {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  /** Optional analog x-axis from touch controls, -1 (left) to 1 (right). */
  xAxis?: number;
  /** Optional analog y-axis from touch controls, -1 (up) to 1 (down). */
  yAxis?: number;
}

export interface MovementOptions {
  isBlocked?: (x: number, y: number) => boolean;
  deltaSeconds?: number;
  speedFactor?: number;
}

/**
 * Player character with animated sprite and smooth 8-direction movement.
 * Movement owns all player-facing collision/animation rules so keyboard,
 * joystick, and scripted movement behave consistently.
 */
export class Player {
  public sprite: Phaser.Physics.Arcade.Sprite;
  private readonly baseSpeed: number = 200;
  private readonly scene: Phaser.Scene;
  private lanternActive: boolean = false;
  private readonly TILE_SIZE: number = 64;
  private readonly collisionHalfSize: number = 14;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;

    // Create player sprite - 48x48 display size (slightly smaller than 64px tile)
    this.sprite = scene.physics.add.sprite(x, y, 'characters', 'hero_idle');
    this.sprite.setDisplaySize(48, 48);
    this.sprite.setOrigin(0.5, 0.5);
    this.sprite.setSize(this.collisionHalfSize * 2, this.collisionHalfSize * 2);
    this.sprite.setOffset(10, 10);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDepth(toRenderDepth(y / this.TILE_SIZE, 4));

    this.createAnimations();
    this.sprite.play('player_idle');
  }

  private createAnimations(): void {
    if (!this.scene.anims.exists('player_idle')) {
      this.scene.anims.create({
        key: 'player_idle',
        frames: [{ key: 'characters', frame: 'hero_idle' }],
        frameRate: 2,
        repeat: -1,
      });
    }

    if (!this.scene.anims.exists('player_walk')) {
      this.scene.anims.create({
        key: 'player_walk',
        frames: [
          { key: 'characters', frame: 'hero_walk_1' },
          { key: 'characters', frame: 'hero_walk_2' },
          { key: 'characters', frame: 'hero_walk_3' },
        ],
        frameRate: 8,
        repeat: -1,
      });
    }

    if (!this.scene.anims.exists('player_walk_side')) {
      this.scene.anims.create({
        key: 'player_walk_side',
        frames: [
          { key: 'characters', frame: 'hero_side_1' },
          { key: 'characters', frame: 'hero_walk_1' },
        ],
        frameRate: 8,
        repeat: -1,
      });
    }
  }

  update(
    cursors: Phaser.Types.Input.Keyboard.CursorKeys,
    wasd: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key },
    isBlocked?: (x: number, y: number) => boolean,
    deltaSeconds: number = 1 / 60,
    speedFactor: number = 1
  ): void {
    this.move(
      {
        left: cursors.left.isDown || wasd.A.isDown,
        right: cursors.right.isDown || wasd.D.isDown,
        up: cursors.up.isDown || wasd.W.isDown,
        down: cursors.down.isDown || wasd.S.isDown,
      },
      { isBlocked, deltaSeconds, speedFactor }
    );
  }

  public move(input: MovementInput, options: MovementOptions = {}): void {
    const direction = this.getMovementVector(input);
    const speedFactor = Phaser.Math.Clamp(options.speedFactor ?? 1, 0, 2);
    const speed = this.baseSpeed * speedFactor;
    const deltaSeconds = options.deltaSeconds ?? 1 / 60;
    let vx = direction.x;
    let vy = direction.y;

    if (options.isBlocked && (vx !== 0 || vy !== 0) && !options.isBlocked(this.sprite.x, this.sprite.y)) {
      const stepSeconds = Phaser.Math.Clamp(deltaSeconds, 1 / 120, 1 / 20);
      const nextX = this.sprite.x + vx * speed * stepSeconds;
      const nextY = this.sprite.y + vy * speed * stepSeconds;

      // Axis-separated checks preserve smooth wall sliding while still blocking
      // diagonal corner clipping through buildings, trees, cliffs, and water.
      if (this.wouldOverlapBlockedTile(nextX, this.sprite.y, options.isBlocked)) vx = 0;
      if (this.wouldOverlapBlockedTile(this.sprite.x, nextY, options.isBlocked)) vy = 0;

      if (vx !== 0 && vy !== 0 && this.wouldOverlapBlockedTile(nextX, nextY, options.isBlocked)) {
        const preferX = Math.abs(direction.x) >= Math.abs(direction.y);
        if (preferX) vy = 0;
        else vx = 0;
      }
    }

    this.sprite.setVelocity(vx * speed, vy * speed);
    this.sprite.setDepth(toRenderDepth(this.sprite.y / this.TILE_SIZE, 4));
    this.updateAnimation(vx, vy);
  }

  private getMovementVector(input: MovementInput): { x: number; y: number } {
    const axisDeadZone = 0.18;
    let x = Math.abs(input.xAxis ?? 0) >= axisDeadZone ? Phaser.Math.Clamp(input.xAxis ?? 0, -1, 1) : 0;
    let y = Math.abs(input.yAxis ?? 0) >= axisDeadZone ? Phaser.Math.Clamp(input.yAxis ?? 0, -1, 1) : 0;

    // Keyboard/digital controls remain authoritative when pressed so desktop
    // movement and iPad hardware keyboards keep a crisp full-speed feel.
    if (input.left && !input.right) x = -1;
    else if (input.right && !input.left) x = 1;
    else if (input.left && input.right) x = 0;

    if (input.up && !input.down) y = -1;
    else if (input.down && !input.up) y = 1;
    else if (input.up && input.down) y = 0;

    const length = Math.sqrt(x * x + y * y);
    if (length > 1) {
      x /= length;
      y /= length;
    }

    return { x, y };
  }

  private wouldOverlapBlockedTile(cx: number, cy: number, isBlocked: (x: number, y: number) => boolean): boolean {
    const h = this.collisionHalfSize;
    return (
      isBlocked(cx, cy) ||
      isBlocked(cx - h, cy - h) ||
      isBlocked(cx + h, cy - h) ||
      isBlocked(cx - h, cy + h) ||
      isBlocked(cx + h, cy + h)
    );
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
    this.sprite.setVelocity(0, 0);
    this.sprite.setDepth(toRenderDepth(y / this.TILE_SIZE, 4));
  }

  stop(): void {
    this.sprite.setVelocity(0, 0);
    this.playIdleAnimation();
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

  getCollisionHalfSize(): number {
    return this.collisionHalfSize;
  }
}
