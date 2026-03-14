import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { TownMapV3 } from '../maps/TownMapV3';
import { ShadowMonster } from '../entities/ShadowMonster';
import { DialogueBox } from '../ui/DialogueBox';
import { StorySystem } from '../systems/StorySystem';

/**
 * Main Game Scene - Lumenfall RPG
 * 
 * Features:
 * - Layered tile rendering with real sprite assets
 * - Map boundaries with road exits (N/E/S/W)
 * - Click-to-move + keyboard movement
 * - NPC dialogue with story system
 * - Day/night cycle (5 minutes)
 * - Shadow monsters at night
 * - HP system
 */
export class GameScene extends Phaser.Scene {
  private player!: Player;
  private currentMap!: TownMapV3;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  
  // Day/night system
  private timeOfDay: number = 0.3; // Start at morning
  private dayNightOverlay!: Phaser.GameObjects.Rectangle;
  private timeSpeed: number = 0.000033; // ~5 minute full cycle
  
  // Shadow monsters
  private shadowMonsters: ShadowMonster[] = [];
  
  // UI
  private dialogueBox!: DialogueBox;
  
  // Story system
  private storySystem: StorySystem = new StorySystem();
  
  // Click-to-move
  private clickTarget: { x: number; y: number } | null = null;
  private clickMarker: Phaser.GameObjects.Graphics | null = null;
  
  // Transition cooldown
  private lastTransitionTime: number = 0;
  
  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {
    // Terrain atlases
    this.load.atlas('terrain_grassland', 'assets/terrain_grassland.png', 'assets/terrain_grassland.json');
    this.load.atlas('terrain_dungeon', 'assets/terrain_dungeon.png', 'assets/terrain_dungeon.json');
    this.load.atlas('terrain_walls_natural', 'assets/terrain_walls_natural.png', 'assets/terrain_walls_natural.json');
    this.load.atlas('terrain_walls_manmade', 'assets/terrain_walls_manmade.png', 'assets/terrain_walls_manmade.json');
    
    // Building atlases
    this.load.atlas('buildings_v003', 'assets/buildings_v003.png', 'assets/buildings_v003.json');
    this.load.atlas('buildings_v002', 'assets/buildings_v002.png', 'assets/buildings_v002.json');
    
    // Object atlases
    this.load.atlas('objects_props_v002', 'assets/objects_props_v002.png', 'assets/objects_props_v002.json');
    this.load.atlas('objects_props_v003', 'assets/objects_props_v003.png', 'assets/objects_props_v003.json');
    
    // Character atlases
    this.load.atlas('characters', 'assets/characters.png', 'assets/characters.json');
    this.load.atlas('monsters', 'assets/monsters.png', 'assets/monsters.json');
  }

  create(): void {
    // Create town map
    this.currentMap = new TownMapV3(this);
    this.currentMap.create();

    // Create player at spawn point (center of village)
    const spawnX = Math.floor(this.currentMap.getMapWidth() / 2);
    const spawnY = Math.floor(this.currentMap.getMapHeight() / 2);
    this.player = new Player(this, spawnX, spawnY);
    
    // Set up camera
    this.cameras.main.startFollow(this.player.sprite, true, 0.08, 0.08);
    this.cameras.main.setZoom(2.0);
    this.cameras.main.setBounds(0, 0, this.currentMap.getMapWidth(), this.currentMap.getMapHeight());
    
    // Set physics world bounds
    this.physics.world.setBounds(0, 0, this.currentMap.getMapWidth(), this.currentMap.getMapHeight());
    
    // Set up keyboard input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    // Day/night overlay (covers entire map)
    this.dayNightOverlay = this.add.rectangle(
      0, 0,
      this.currentMap.getMapWidth() + 200,
      this.currentMap.getMapHeight() + 200,
      0x000033, 0
    );
    this.dayNightOverlay.setOrigin(0, 0);
    this.dayNightOverlay.setScrollFactor(1);
    this.dayNightOverlay.setDepth(5000);

    // Click marker
    this.clickMarker = this.add.graphics();
    this.clickMarker.setDepth(4999);

    // Dialogue box
    this.dialogueBox = new DialogueBox(this);

    // Listen for action button from UI
    this.events.on('playerAction', () => this.handleAction());
    
    // Click-to-move
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.handleClick(pointer);
    });

    // Emit initial state
    this.events.emit('timeUpdate', this.timeOfDay);
  }

  update(_time: number, delta: number): void {
    // Handle movement
    const hasKeyboardInput = this.cursors.left.isDown || this.cursors.right.isDown ||
                             this.cursors.up.isDown || this.cursors.down.isDown ||
                             this.wasd.W.isDown || this.wasd.A.isDown ||
                             this.wasd.S.isDown || this.wasd.D.isDown;
    
    if (hasKeyboardInput) {
      // Keyboard overrides click-to-move
      this.clickTarget = null;
      this.clearClickMarker();
      this.player.update(
        this.cursors,
        this.wasd,
        (x, y) => !this.currentMap.isWalkable(x, y)
      );
    } else if (this.clickTarget) {
      // Follow click target
      this.moveTowardsClick(delta);
    } else {
      // Stop player
      this.player.sprite.setVelocity(0, 0);
      this.player.playIdleAnimation();
    }

    // Check map exits
    const playerPos = this.player.getPosition();
    const now = Date.now();
    if (now - this.lastTransitionTime > 2000) { // 2 second cooldown
      const exit = this.currentMap.checkExit(playerPos.x, playerPos.y);
      if (exit) {
        this.lastTransitionTime = now;
        this.handleMapExit(exit);
      }
    }

    // Update day/night cycle
    this.timeOfDay += delta * this.timeSpeed;
    if (this.timeOfDay > 1) this.timeOfDay = 0;
    this.updateDayNightOverlay();

    // Shadow monsters at night
    const isNight = this.timeOfDay > 0.65 || this.timeOfDay < 0.15;
    if (isNight && this.shadowMonsters.length === 0) {
      this.spawnShadowMonsters();
    } else if (!isNight && this.shadowMonsters.length > 0) {
      this.despawnShadowMonsters();
    }

    // Update shadow monsters
    const lightSources = this.getLightSources();
    for (const monster of this.shadowMonsters) {
      monster.update(playerPos, lightSources);
      
      // Check collision with player
      const monsterPos = monster.getPosition();
      const dist = Phaser.Math.Distance.Between(playerPos.x, playerPos.y, monsterPos.x, monsterPos.y);
      if (dist < 24) {
        const lastDmg = monster.getLastDamageTime();
        if (now - lastDmg > 1000) {
          monster.setLastDamageTime(now);
          this.events.emit('playerDamaged', 1);
        }
      }
    }

    // Update NPC movement
    this.currentMap.updateNPCs(delta);

    // Emit time to UI
    this.events.emit('timeUpdate', this.timeOfDay);
  }

  private moveTowardsClick(delta: number): void {
    if (!this.clickTarget) return;
    
    const playerPos = this.player.getPosition();
    const dx = this.clickTarget.x - playerPos.x;
    const dy = this.clickTarget.y - playerPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < 8) {
      // Reached target
      this.clickTarget = null;
      this.clearClickMarker();
      this.player.sprite.setVelocity(0, 0);
      this.player.playIdleAnimation();
      return;
    }
    
    const speed = 120;
    const vx = (dx / dist) * speed;
    const vy = (dy / dist) * speed;
    
    // Check if next position is walkable
    const nextX = playerPos.x + vx * (delta / 1000);
    const nextY = playerPos.y + vy * (delta / 1000);
    
    if (this.currentMap.isWalkable(nextX, nextY)) {
      this.player.sprite.setVelocity(vx, vy);
      this.player.playWalkAnimation(vx, vy);
    } else {
      // Blocked - cancel path
      this.clickTarget = null;
      this.clearClickMarker();
      this.player.sprite.setVelocity(0, 0);
    }
  }

  private handleClick(pointer: Phaser.Input.Pointer): void {
    if (this.dialogueBox.getIsVisible()) return;
    
    const worldX = pointer.worldX;
    const worldY = pointer.worldY;
    
    // Only move if target is walkable
    if (this.currentMap.isWalkable(worldX, worldY)) {
      this.clickTarget = { x: worldX, y: worldY };
      this.drawClickMarker(worldX, worldY);
    }
  }

  private drawClickMarker(x: number, y: number): void {
    if (!this.clickMarker) return;
    this.clickMarker.clear();
    this.clickMarker.lineStyle(2, 0xffff00, 0.8);
    this.clickMarker.strokeCircle(x, y, 8);
    this.clickMarker.lineStyle(1, 0xffff00, 0.4);
    this.clickMarker.strokeCircle(x, y, 12);
  }

  private clearClickMarker(): void {
    if (this.clickMarker) {
      this.clickMarker.clear();
    }
  }

  private updateDayNightOverlay(): void {
    let darkness = 0;
    
    if (this.timeOfDay < 0.15) {
      darkness = 0.65 * (1 - this.timeOfDay / 0.15);
    } else if (this.timeOfDay < 0.5) {
      darkness = 0;
    } else if (this.timeOfDay < 0.65) {
      darkness = 0.65 * ((this.timeOfDay - 0.5) / 0.15);
    } else {
      darkness = 0.65;
    }

    this.dayNightOverlay.setAlpha(darkness);
  }

  private handleAction(): void {
    if (this.dialogueBox.getIsVisible()) {
      this.dialogueBox.hide();
      return;
    }

    const playerPos = this.player.getPosition();
    const nearbyNPC = this.currentMap.getNearbyNPC(playerPos.x, playerPos.y, 80);
    
    if (nearbyNPC) {
      const dialogueKey = nearbyNPC.getData('dialogueKey');
      const dialogue = this.storySystem.getDialogue(dialogueKey, this.timeOfDay);
      this.dialogueBox.show(dialogue.name, dialogue.text, dialogue.portrait);
    } else {
      // Toggle lantern
      this.player.toggleLantern();
    }
  }

  private handleMapExit(exit: any): void {
    const mapName = exit.targetMap.replace('_', ' ');
    
    // Flash screen
    this.cameras.main.flash(500, 255, 255, 255);
    
    // Show message
    this.events.emit('showMessage', `Entering ${mapName}...`);
    
    // Move player to opposite side (same map for now - will add more maps later)
    this.time.delayedCall(300, () => {
      this.player.setPosition(exit.targetX, exit.targetY);
    });
    
    console.log(`Map exit: ${exit.direction} → ${exit.targetMap}`);
  }

  private spawnShadowMonsters(): void {
    const spawnPoints = [
      { x: 150, y: 150 },
      { x: this.currentMap.getMapWidth() - 150, y: 150 },
      { x: 150, y: this.currentMap.getMapHeight() - 150 },
      { x: this.currentMap.getMapWidth() - 150, y: this.currentMap.getMapHeight() - 150 },
    ];

    for (const point of spawnPoints) {
      const monster = new ShadowMonster(this, point.x, point.y);
      this.shadowMonsters.push(monster);
    }
  }

  private despawnShadowMonsters(): void {
    for (const monster of this.shadowMonsters) {
      monster.destroy();
    }
    this.shadowMonsters = [];
  }

  private getLightSources(): { x: number; y: number; radius: number }[] {
    const sources: { x: number; y: number; radius: number }[] = [];

    if (this.player.isLanternActive()) {
      const pos = this.player.getPosition();
      const radius = this.timeOfDay > 0.65 || this.timeOfDay < 0.15 ? 160 : 100;
      sources.push({ x: pos.x, y: pos.y, radius });
    }

    return sources;
  }

  public getPlayer(): Player {
    return this.player;
  }

  public getTimeOfDay(): number {
    return this.timeOfDay;
  }

  public getStorySystem(): StorySystem {
    return this.storySystem;
  }
}
