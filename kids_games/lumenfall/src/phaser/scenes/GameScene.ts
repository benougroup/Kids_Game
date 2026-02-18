import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { TownMap } from '../maps/TownMap';

/**
 * Main game scene with 2D top-down view
 * Handles world, NPCs, player movement, day/night cycle
 */
export class GameScene extends Phaser.Scene {
  private player!: Player;
  private townMap!: TownMap;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  
  // Day/night system
  private timeOfDay: number = 0.25; // Start at morning
  private dayNightOverlay!: Phaser.GameObjects.Rectangle;
  private timeSpeed: number = 0.0001; // Slower time progression
  
  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {
    // Load sprite atlas
    this.load.image('atlas', 'assets/atlas.png');
    this.load.json('atlasData', 'assets/atlas.json');
  }

  create(): void {
    // Parse atlas data
    const atlasData = this.cache.json.get('atlasData');
    
    // Create frames from atlas
    if (atlasData && atlasData.sprites) {
      Object.keys(atlasData.sprites).forEach(key => {
        const sprite = atlasData.sprites[key];
        this.textures.addSpriteSheetFromAtlas('atlas', {
          atlas: 'atlas',
          frame: key,
          frameWidth: sprite.w,
          frameHeight: sprite.h,
        });
      });
    }

    // Create 2D top-down town map
    this.townMap = new TownMap(this);
    this.townMap.create();

    // Create player at spawn point (center of village)
    this.player = new Player(this, 512, 384);
    
    // Set up camera to follow player
    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);
    this.cameras.main.setZoom(2); // Closer zoom for 2D top-down
    this.cameras.main.setBounds(0, 0, 1024, 768); // Map bounds
    
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
      2048, 2048,
      0x000033,
      0
    );
    this.dayNightOverlay.setOrigin(0, 0);
    this.dayNightOverlay.setScrollFactor(1);
    this.dayNightOverlay.setDepth(1000);

    // Listen for action button from UI
    this.events.on('playerAction', () => this.handleAction());
  }

  update(_time: number, delta: number): void {
    // Update player movement (8-direction)
    this.player.update(this.cursors, this.wasd);

    // Update day/night cycle (slow progression)
    this.timeOfDay += delta * this.timeSpeed;
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
    // 0.75-1: Night (dark)

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

  private handleAction(): void {
    // Check if near an NPC
    const nearbyNPC = this.townMap.getNearbyNPC(this.player.getPosition(), 50);
    if (nearbyNPC) {
      console.log('Interacting with:', nearbyNPC.getData('npcName'));
      this.events.emit('showDialogue', nearbyNPC.getData('npcName'));
    } else {
      console.log('No NPC nearby');
    }
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

  public getAtlasTexture(): string {
    return 'atlas';
  }
}
