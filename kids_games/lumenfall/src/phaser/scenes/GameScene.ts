import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { TownMapV2 } from '../maps/TownMapV2';
import { MapTransitionSystem } from '../systems/MapTransitionSystem';
import { ShadowMonster } from '../entities/ShadowMonster';
import { DialogueBox } from '../ui/DialogueBox';
import { PathfindingSystem } from '../systems/PathfindingSystem';

/**
 * Main game scene with 2D top-down view
 * Handles world, NPCs, player movement, day/night cycle
 */
export class GameScene extends Phaser.Scene {
  private player!: Player;
  private townMap!: TownMapV2;
  private mapTransitionSystem!: MapTransitionSystem;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  
  // Day/night system
  private timeOfDay: number = 0.25; // Start at morning
  private dayNightOverlay!: Phaser.GameObjects.Rectangle;
  private timeSpeed: number = 1 / (20 * 60 * 1000); // 5 minutes per phase (20 minute full cycle)
  
  // Shadow monsters
  private shadowMonsters: ShadowMonster[] = [];
  
  // UI
  private dialogueBox!: DialogueBox;
  
  // Pathfinding
  private pathfinding: PathfindingSystem = new PathfindingSystem();
  private currentPath: { x: number; y: number }[] = [];
  private pathMoveSpeed: number = 120;
  
  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {
    // Load new sprite atlases with proper tile system
    this.load.atlas('tiles_new', 'assets/tiles_new.png', 'assets/tiles_new.json');
    this.load.atlas('roads_new', 'assets/roads_new.png', 'assets/roads_new.json');
    this.load.atlas('objects_new', 'assets/objects_new.png', 'assets/objects_new.json');
    this.load.atlas('characters', 'assets/characters.png', 'assets/characters.json');
    this.load.atlas('monsters', 'assets/monsters.png', 'assets/monsters.json');
  }

  create(): void {
    // Create 2D top-down town map with layered system
    this.townMap = new TownMapV2(this);
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
    this.cameras.main.setZoom(2.3); // Zoomed in for better visibility
    this.applyGameplayViewport();
    
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
    
    // Add click-to-move
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.handleClick(pointer);
    });

    this.scale.on('resize', () => this.applyGameplayViewport());
  }

  update(_time: number, delta: number): void {
    // Follow path if exists, otherwise use keyboard
    if (this.currentPath.length > 0) {
      this.followPath(delta);
    } else {
      // Update player movement (8-direction) with water collision
      this.player.update(
        this.cursors,
        this.wasd,
        (fromX, fromY, toX, toY) => this.townMap.isWalkable(fromX, fromY, toX, toY)
      );
    }

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

    // Update shadow monsters and check collision
    const lightSources = this.getLightSources();
    for (const monster of this.shadowMonsters) {
      monster.update(playerPos, lightSources);
      
      // Check collision with player (damage every 1 second)
      const monsterPos = monster.getPosition();
      const distance = Phaser.Math.Distance.Between(
        playerPos.x, playerPos.y,
        monsterPos.x, monsterPos.y
      );
      
      if (distance < 24) { // Touching range
        // Damage player (throttled to once per second per monster)
        const now = Date.now();
        const lastDamage = monster.getLastDamageTime();
        if (now - lastDamage > 1000) {
          monster.setLastDamageTime(now);
          this.events.emit('playerDamaged', 1);
        }
      }
    }

    // Emit time to UI scene
    this.events.emit('timeUpdate', this.timeOfDay);
  }


  private applyGameplayViewport(): void {
    const viewportX = 0;
    const viewportY = 80;
    const viewportWidth = this.scale.width - 210;
    const viewportHeight = this.scale.height - 90;
    this.cameras.main.setViewport(viewportX, viewportY, viewportWidth, viewportHeight);
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
    const playerPos = this.player.getPosition();
    const nearbyNPC = this.townMap.getNearbyNPC(playerPos.x, playerPos.y, 50);
    if (nearbyNPC) {
      // Talk to NPC
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
    } else {
      // No NPC nearby - toggle lantern
      this.player.toggleLantern();
    }
  }

  private handleMapTransition(portal: any): void {
    // Prevent multiple transitions
    if (this.scene.isPaused()) return;

    console.log('Transitioning to:', portal.targetMap);
    
    this.mapTransitionSystem.transitionToMap(portal, (mapName: string, x: number, y: number) => {
      // Update current map
      this.mapTransitionSystem.setCurrentMap(mapName);
      
      // Move player to target position
      this.player.setPosition(x, y);
      
      // Show message
      this.events.emit('showMessage', `Entered ${mapName.replace('_', ' ')}`);
      
      console.log(`Loaded map: ${mapName} at position (${x}, ${y})`);
    });
  }

  public getPlayer(): Player {
    return this.player;
  }

  private handleClick(pointer: Phaser.Input.Pointer): void {
    // Don't move if dialogue is open
    if (this.dialogueBox.getIsVisible()) {
      return;
    }

    // Convert screen coordinates to world coordinates
    const worldX = pointer.worldX;
    const worldY = pointer.worldY;

    // Find path
    const playerPos = this.player.getPosition();
    this.currentPath = this.pathfinding.findPath(
      playerPos.x,
      playerPos.y,
      worldX,
      worldY,
      (x, y) => this.townMap.isWalkable(playerPos.x, playerPos.y, x, y)
    );
  }

  private followPath(_delta: number): void {
    if (this.currentPath.length === 0) return;

    const playerPos = this.player.getPosition();
    const target = this.currentPath[0];

    // Calculate direction to target
    const dx = target.x - playerPos.x;
    const dy = target.y - playerPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check if reached target
    if (distance < 5) {
      this.currentPath.shift(); // Remove reached waypoint
      if (this.currentPath.length === 0) {
        this.player.sprite.setVelocity(0, 0);
      }
      return;
    }

    // Move towards target
    const speed = this.pathMoveSpeed;
    const velocityX = (dx / distance) * speed;
    const velocityY = (dy / distance) * speed;
    this.player.sprite.setVelocity(velocityX, velocityY);

    // Update animation
    if (this.player.sprite.anims.currentAnim?.key !== 'player_walk') {
      this.player.sprite.play('player_walk');
    }

    // Flip sprite based on direction
    if (dx < 0) {
      this.player.sprite.setFlipX(true);
    } else if (dx > 0) {
      this.player.sprite.setFlipX(false);
    }

    // Cancel path if keyboard input detected
    if (this.cursors.left.isDown || this.cursors.right.isDown ||
        this.cursors.up.isDown || this.cursors.down.isDown ||
        this.wasd.W.isDown || this.wasd.A.isDown ||
        this.wasd.S.isDown || this.wasd.D.isDown) {
      this.currentPath = [];
      this.player.sprite.setVelocity(0, 0);
    }
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

    // Player's lantern (only if active)
    if (this.player.isLanternActive()) {
      const playerPos = this.player.getPosition();
      const lanternRadius = this.timeOfDay > 0.6 || this.timeOfDay < 0.2 ? 150 : 100;
      sources.push({ x: playerPos.x, y: playerPos.y, radius: lanternRadius });
    }

    // Village light post placeholders (using sign sprites for now)
    sources.push({ x: 16 * 32, y: 13 * 32, radius: 110 });
    sources.push({ x: 25 * 32, y: 17 * 32, radius: 110 });

    return sources;
  }
}
