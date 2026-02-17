import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { TownMap } from '../maps/TownMap';

/**
 * Main game scene with isometric rendering
 * Handles world, NPCs, player movement, day/night cycle
 */
export class GameScene extends Phaser.Scene {
  private player!: Player;
  private townMap!: TownMap;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  
  // Day/night system
  private timeOfDay: number = 0; // 0-1 (0=dawn, 0.5=noon, 1=midnight)
  private dayNightOverlay!: Phaser.GameObjects.Rectangle;
  
  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {
    // For now, we'll use simple shapes
    // Later we can add sprite sheets
    this.load.setPath('assets');
  }

  create(): void {
    // Create isometric town map
    this.townMap = new TownMap(this);
    this.townMap.create();

    // Create player at spawn point
    this.player = new Player(this, 400, 300);
    
    // Set up camera to follow player
    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.5); // Closer view like Diablo
    
    // Set up input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    // Create day/night overlay
    this.dayNightOverlay = this.add.rectangle(
      0, 0,
      this.scale.width * 2,
      this.scale.height * 2,
      0x000033,
      0
    );
    this.dayNightOverlay.setOrigin(0, 0);
    this.dayNightOverlay.setScrollFactor(0);
    this.dayNightOverlay.setDepth(1000);

    // Start at day time
    this.timeOfDay = 0.25; // Morning
  }

  update(_time: number, delta: number): void {
    // Update player movement (8-direction)
    this.player.update(this.cursors, this.wasd);

    // Update day/night cycle (slow progression)
    this.timeOfDay += delta / 120000; // Full cycle every 2 minutes
    if (this.timeOfDay > 1) this.timeOfDay = 0;

    // Update day/night overlay
    this.updateDayNightOverlay();

    // Emit time to UI scene
    this.events.emit('timeUpdate', this.timeOfDay);
  }

  private updateDayNightOverlay(): void {
    // Calculate darkness based on time
    // 0-0.25: Dawn (getting lighter)
    // 0.25-0.5: Day (bright)
    // 0.5-0.75: Dusk (getting darker)
    // 0.75-1: Night (dark like Diablo)

    let darkness = 0;
    
    if (this.timeOfDay < 0.25) {
      // Dawn: 0.4 -> 0
      darkness = 0.4 * (1 - this.timeOfDay / 0.25);
    } else if (this.timeOfDay < 0.5) {
      // Day: 0
      darkness = 0;
    } else if (this.timeOfDay < 0.75) {
      // Dusk: 0 -> 0.6
      darkness = 0.6 * ((this.timeOfDay - 0.5) / 0.25);
    } else {
      // Night: 0.6
      darkness = 0.6;
    }

    this.dayNightOverlay.setAlpha(darkness);
  }

  public getPlayer(): Player {
    return this.player;
  }

  public getTimeOfDay(): number {
    return this.timeOfDay;
  }

  public isNight(): boolean {
    return this.timeOfDay > 0.6 || this.timeOfDay < 0.2;
  }
}
