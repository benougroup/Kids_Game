import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { TownMap } from '../maps/TownMap';
import { MapTransitionSystem } from '../systems/MapTransitionSystem';
import { ShadowMonster } from '../entities/ShadowMonster';
import { DialogueBox } from '../ui/DialogueBox';

/**
 * Main game scene with 2D top-down view
 * Handles world, NPCs, player movement, day/night cycle
 */
export class GameScene extends Phaser.Scene {
  private player!: Player;
  private townMap!: TownMap;
  private mapTransitionSystem!: MapTransitionSystem;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  
  // Day/night system
  private timeOfDay: number = 0.25; // Start at morning
  private dayNightOverlay!: Phaser.GameObjects.Rectangle;
  private timeSpeed: number = 0.0001; // Slower time progression
  
  // Shadow monsters
  private shadowMonsters: ShadowMonster[] = [];
  
  // UI
  private dialogueBox!: DialogueBox;
  
  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {
    // Load separate sprite atlases
    this.load.atlas('tiles', 'assets/tiles.png', 'assets/tiles.json');
    this.load.atlas('characters', 'assets/characters.png', 'assets/characters.json');
    this.load.atlas('monsters', 'assets/monsters.png', 'assets/monsters.json');
    this.load.atlas('objects', 'assets/objects.png', 'assets/objects.json');
  }

  create(): void {
    // Create 2D top-down town map
    this.townMap = new TownMap(this);
    this.townMap.create();

    // Set up map transition system
    this.mapTransitionSystem = new MapTransitionSystem(this, 'town');
    this.mapTransitionSystem.createEdgePortals(
      this.townMap.getMapWidth(),
      this.townMap.getMapHeight(),
      'town'
    );

    // Create player at spawn point (center of village)
    // Position at tile center: (tileX * 32) + 16, (tileY * 32) + 16
    this.player = new Player(this, 16 * 32 + 16, 12 * 32 + 16);
    
    // Set up camera to follow player
    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);
    this.cameras.main.setZoom(2); // Closer zoom for 2D top-down
    
    // Set world bounds (not camera bounds) to allow full map access
    this.physics.world.setBounds(0, 0, this.townMap.getMapWidth(), this.townMap.getMapHeight());
    
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

    // Shadow monsters will spawn at night (spawned dynamically in update)

    // Create dialogue box UI
    this.dialogueBox = new DialogueBox(this);

    // Listen for action button from UI
    this.events.on('playerAction', () => this.handleAction());
  }

  update(_time: number, delta: number): void {
    // Update player movement (8-direction) with water collision
    this.player.update(
      this.cursors,
      this.wasd,
      (x, y) => this.townMap.isWaterTile(x, y)
    );

    // Check for portal transitions
    const playerPos = this.player.getPosition();
    const portal = this.mapTransitionSystem.checkPortalCollision(playerPos.x, playerPos.y);
    if (portal) {
      this.handleMapTransition(portal);
    }

    // Update day/night cycle (slow progression)
    this.timeOfDay += delta * this.timeSpeed;
    if (this.timeOfDay > 1) this.timeOfDay = 0;

    // Update day/night overlay
    this.updateDayNightOverlay();

    // Spawn/despawn shadow monsters based on time of day
    const isNightTime = this.timeOfDay > 0.6 || this.timeOfDay < 0.2;
    if (isNightTime && this.shadowMonsters.length === 0) {
      this.spawnShadowMonsters();
    } else if (!isNightTime && this.shadowMonsters.length > 0) {
      this.despawnShadowMonsters();
    }

    // Update shadow monsters
    const lightSources = this.getLightSources();
    for (const monster of this.shadowMonsters) {
      monster.update(playerPos, lightSources);
    }

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
    // Don't interact if dialogue is already open
    if (this.dialogueBox.getIsVisible()) {
      return;
    }

    // Check if near an NPC
    const nearbyNPC = this.townMap.getNearbyNPC(this.player.getPosition(), 50);
    if (nearbyNPC) {
      const npcName = nearbyNPC.getData('npcName');
      const npcFrame = nearbyNPC.frame.name;
      
      // Show dialogue based on NPC
      let dialogue = '';
      if (npcName === 'Guard') {
        dialogue = 'Welcome to Bright Hollow! I keep watch over the village. The shadows have been growing stronger lately...';
      } else if (npcName === 'Apprentice') {
        dialogue = 'I\'m studying light magic! Did you know that shadows flee from bright light? Maybe you can help us!';
      } else if (npcName === 'Merchant') {
        dialogue = 'Looking for supplies? I have potions and lanterns. You\'ll need them when exploring the dark forest!';
      } else {
        dialogue = 'Hello there, young adventurer!';
      }
      
      this.dialogueBox.show(npcName, dialogue, npcFrame);
    }
  }

  private handleMapTransition(portal: any): void {
    // Prevent multiple transitions
    if (this.scene.isPaused()) return;

    console.log('Transitioning to:', portal.targetMap);
    
    this.mapTransitionSystem.transitionToMap(portal, (mapName: string, x: number, y: number) => {
      // For now, just show a message (will implement full map loading later)
      console.log(`Would load map: ${mapName} at position (${x}, ${y})`);
      this.events.emit('showMessage', `Entering ${mapName}...`);
      
      // Move player back slightly to prevent immediate re-trigger
      const currentPos = this.player.getPosition();
      if (portal.direction === 'north') this.player.setPosition(currentPos.x, currentPos.y + 50);
      else if (portal.direction === 'south') this.player.setPosition(currentPos.x, currentPos.y - 50);
      else if (portal.direction === 'east') this.player.setPosition(currentPos.x - 50, currentPos.y);
      else if (portal.direction === 'west') this.player.setPosition(currentPos.x + 50, currentPos.y);
    });
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

  private spawnShadowMonsters(): void {
    // Spawn 3-4 shadow monsters in darker areas
    const spawnPoints = [
      { x: 200, y: 200 },   // Top-left
      { x: 1000, y: 200 },  // Top-right
      { x: 200, y: 800 },   // Bottom-left
      { x: 1000, y: 800 },  // Bottom-right
    ];

    for (const point of spawnPoints) {
      const monster = new ShadowMonster(this, point.x, point.y);
      this.shadowMonsters.push(monster);
    }
    console.log('Shadow monsters spawned at night');
  }

  private despawnShadowMonsters(): void {
    // Remove all shadow monsters
    for (const monster of this.shadowMonsters) {
      monster.destroy();
    }
    this.shadowMonsters = [];
    console.log('Shadow monsters despawned at day');
  }

  private getLightSources(): { x: number; y: number; radius: number }[] {
    const sources: { x: number; y: number; radius: number }[] = [];

    // Player always has a light (lantern)
    const playerPos = this.player.getPosition();
    const playerLightRadius = this.timeOfDay > 0.6 || this.timeOfDay < 0.2 ? 120 : 80;
    sources.push({ x: playerPos.x, y: playerPos.y, radius: playerLightRadius });

    // Add other light sources (torches, campfires, etc.) here later

    return sources;
  }
}
