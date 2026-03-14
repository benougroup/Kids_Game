import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { DialogueBox } from '../ui/DialogueBox';
import { StorySystem } from '../systems/StorySystem';
import { MathGameSystem } from '../systems/MathGameSystem';
import { MapBuilder } from '../maps/MapBuilder';
import { createTestTownData, createTestForestData, createTestDungeonData } from '../maps/TestMaps';
import { Entity } from '../entities/Entity';
import { DEFAULT_FLAGS } from '../systems/TileSystem';
import { MONSTER_DEFINITIONS } from '../systems/EntityRegistry';

/**
 * Main Game Scene - Lumenfall RPG
 * 
 * Features:
 * - Layered tile rendering with real sprite assets
 * - Map boundaries with road exits (N/E/S/W)
 * - Click-to-move + keyboard movement
 * - NPC dialogue with story system
 * - Math mini-games triggered by NPCs
 * - Day/night cycle (5 minutes)
 * - Shadow monsters at night (height-based passability)
 * - HP/Magic system
 * - Character states: idle, walk, dead, fainted, frozen
 */
export class GameScene extends Phaser.Scene {
  private player!: Player;
  private currentMapBuilder: MapBuilder | null = null;
  private currentMapId: string = 'test_town';
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  
  // Day/night system
  private timeOfDay: number = 0.3; // Start at morning
  private dayNightOverlay!: Phaser.GameObjects.Rectangle;
  private timeSpeed: number = 0.000033; // ~5 minute full cycle
  
  // Shadow monsters (spawned at night from Entity system)
  private nightMonsters: Entity[] = [];
  
  // UI
  private dialogueBox!: DialogueBox;
  private mathGame!: MathGameSystem;
  
  // Story system
  private storySystem: StorySystem = new StorySystem();
  
  // Click-to-move
  private clickTarget: { x: number; y: number } | null = null;
  private clickMarker: Phaser.GameObjects.Graphics | null = null;
  
  // Transition cooldown
  private lastTransitionTime: number = 0;
  private isTransitioning: boolean = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {
    // Terrain atlases
    this.load.atlas('terrain_grassland', 'assets/terrain_grassland.png', 'assets/terrain_grassland.json');
    this.load.atlas('terrain_walls_natural', 'assets/terrain_walls_natural.png', 'assets/terrain_walls_natural.json');
    this.load.atlas('terrain_walls_manmade', 'assets/terrain_walls_manmade.png', 'assets/terrain_walls_manmade.json');
    
    // Building atlases
    this.load.atlas('buildings_v003', 'assets/buildings_v003.png', 'assets/buildings_v003.json');
    this.load.atlas('buildings_v002', 'assets/buildings_v002.png', 'assets/buildings_v002.json');
    
    // Object atlases
    this.load.atlas('objects_props_v002', 'assets/objects_props_v002.png', 'assets/objects_props_v002.json');
    this.load.atlas('objects_props_v003', 'assets/objects_props_v003.png', 'assets/objects_props_v003.json');
    
    // Character atlases (new expanded versions with states)
    this.load.atlas('characters', 'assets/characters.png', 'assets/characters.json');
    this.load.atlas('characters_states', 'assets/characters_states.png', 'assets/characters_states.json');
    this.load.atlas('monsters_states', 'assets/monsters_states.png', 'assets/monsters_states.json');
  }

  create(): void {
    // Load initial map
    this.loadMap('test_town', 15, 12);

    // Set up keyboard input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    // Day/night overlay
    this.dayNightOverlay = this.add.rectangle(0, 0, 4000, 4000, 0x000033, 0);
    this.dayNightOverlay.setOrigin(0, 0);
    this.dayNightOverlay.setScrollFactor(1);
    this.dayNightOverlay.setDepth(5000);

    // Click marker
    this.clickMarker = this.add.graphics();
    this.clickMarker.setDepth(4999);

    // Dialogue box
    this.dialogueBox = new DialogueBox(this);

    // Math game system
    this.mathGame = new MathGameSystem(this);

    // Listen for action button from UI
    this.events.on('playerAction', () => this.handleAction());
    
    // Click-to-move
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.handleClick(pointer);
    });

    // Emit initial state
    this.events.emit('timeUpdate', this.timeOfDay);
    this.events.emit('hpUpdate', { hp: 10, maxHp: 10 });
  }

  private loadMap(mapId: string, spawnTileX: number, spawnTileY: number): void {
    // Destroy previous map
    if (this.currentMapBuilder) {
      this.currentMapBuilder.destroy();
      this.currentMapBuilder = null;
    }
    
    // Destroy night monsters
    for (const m of this.nightMonsters) m.destroy();
    this.nightMonsters = [];
    
    this.currentMapId = mapId;
    
    // Get map data
    let mapData;
    switch (mapId) {
      case 'test_town': mapData = createTestTownData(); break;
      case 'test_forest': mapData = createTestForestData(); break;
      case 'test_dungeon': mapData = createTestDungeonData(); break;
      default: mapData = createTestTownData(); break;
    }
    
    // Build map
    this.currentMapBuilder = new MapBuilder(this, mapData.cols, mapData.rows, mapData.tileSize);
    this.currentMapBuilder.build(mapData);
    
    const mapW = mapData.cols * mapData.tileSize;
    const mapH = mapData.rows * mapData.tileSize;
    
    // Create or move player
    const spawnX = spawnTileX * mapData.tileSize + mapData.tileSize / 2;
    const spawnY = spawnTileY * mapData.tileSize + mapData.tileSize / 2;
    
    if (!this.player) {
      this.player = new Player(this, spawnX, spawnY);
    } else {
      this.player.setPosition(spawnX, spawnY);
    }
    
    // Camera setup
    this.cameras.main.startFollow(this.player.sprite, true, 0.08, 0.08);
    this.cameras.main.setZoom(2.0);
    this.cameras.main.setBounds(0, 0, mapW, mapH);
    this.physics.world.setBounds(0, 0, mapW, mapH);
    
    // Ambient light for this map
    const ambientLight = mapData.ambientLight ?? 0.8;
    this.events.emit('ambientLightUpdate', ambientLight);
  }

  update(_time: number, delta: number): void {
    if (!this.currentMapBuilder || this.isTransitioning) return;
    
    // Update math game timer
    this.mathGame.update(delta);
    if (this.mathGame.isShowing()) return; // Pause game during math challenge
    
    // Handle movement
    const hasKeyboardInput = this.cursors.left.isDown || this.cursors.right.isDown ||
                             this.cursors.up.isDown || this.cursors.down.isDown ||
                             this.wasd.W.isDown || this.wasd.A.isDown ||
                             this.wasd.S.isDown || this.wasd.D.isDown;
    
    if (hasKeyboardInput) {
      this.clickTarget = null;
      this.clearClickMarker();
      this.player.update(
        this.cursors,
        this.wasd,
        (x, y) => !this.currentMapBuilder!.isWalkable(x, y, DEFAULT_FLAGS)
      );
    } else if (this.clickTarget) {
      this.moveTowardsClick(delta);
    } else {
      this.player.sprite.setVelocity(0, 0);
      this.player.playIdleAnimation();
    }

    // Check map exits
    const playerPos = this.player.getPosition();
    const now = Date.now();
    if (now - this.lastTransitionTime > 2000) {
      const exit = this.currentMapBuilder.checkExit(playerPos.x, playerPos.y);
      if (exit) {
        this.lastTransitionTime = now;
        this.handleMapExit(exit);
      }
    }

    // Check tile effects (water damage, lava damage, slow)
    const effect = this.currentMapBuilder.getTileEffect(playerPos.x, playerPos.y);
    if (effect.damage > 0 && now % 1000 < 50) {
      this.events.emit('playerDamaged', effect.damage);
    }

    // Update day/night cycle
    this.timeOfDay += delta * this.timeSpeed;
    if (this.timeOfDay > 1) this.timeOfDay = 0;
    this.updateDayNightOverlay();

    // Shadow monsters at night
    const isNight = this.timeOfDay > 0.65 || this.timeOfDay < 0.15;
    if (isNight && this.nightMonsters.length === 0 && this.currentMapId !== 'test_dungeon') {
      this.spawnNightMonsters();
    } else if (!isNight && this.nightMonsters.length > 0) {
      this.despawnNightMonsters();
    }

    // Update all entities (map NPCs + night monsters)
    const lightSources = this.getLightSources();
    this.currentMapBuilder.update(delta, playerPos.x, playerPos.y, lightSources);
    
    for (const monster of this.nightMonsters) {
      monster.update(delta, playerPos.x, playerPos.y, lightSources);
      
      // Shadow monster light shrink
      let inLight = false;
      for (const light of lightSources) {
        const dist = Phaser.Math.Distance.Between(monster.getPosition().x, monster.getPosition().y, light.x, light.y);
        if (dist < light.radius) {
          monster.shrinkFromLight(1 - dist / light.radius);
          inLight = true;
          break;
        }
      }
      if (!inLight) monster.restoreSize();
      
      // Damage player on contact
      const monsterPos = monster.getPosition();
      const dist = Phaser.Math.Distance.Between(playerPos.x, playerPos.y, monsterPos.x, monsterPos.y);
      if (dist < 24 && monster.canDealDamage(now)) {
        this.events.emit('playerDamaged', monster.getDamage());
      }
    }

    // Update player depth
    this.player.sprite.setDepth(playerPos.y);

    // Emit time to UI
    this.events.emit('timeUpdate', this.timeOfDay);
  }

  private moveTowardsClick(delta: number): void {
    if (!this.clickTarget || !this.currentMapBuilder) return;
    
    const playerPos = this.player.getPosition();
    const dx = this.clickTarget.x - playerPos.x;
    const dy = this.clickTarget.y - playerPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < 8) {
      this.clickTarget = null;
      this.clearClickMarker();
      this.player.sprite.setVelocity(0, 0);
      this.player.playIdleAnimation();
      return;
    }
    
    // Apply speed factor from tile (slow in water/sand)
    const effect = this.currentMapBuilder.getTileEffect(playerPos.x, playerPos.y);
    const speed = 120 * effect.speedFactor;
    const vx = (dx / dist) * speed;
    const vy = (dy / dist) * speed;
    
    const nextX = playerPos.x + vx * (delta / 1000);
    const nextY = playerPos.y + vy * (delta / 1000);
    
    if (this.currentMapBuilder.isWalkable(nextX, nextY, DEFAULT_FLAGS)) {
      this.player.sprite.setVelocity(vx, vy);
      this.player.playWalkAnimation(vx, vy);
    } else {
      this.clickTarget = null;
      this.clearClickMarker();
      this.player.sprite.setVelocity(0, 0);
    }
  }

  private handleClick(pointer: Phaser.Input.Pointer): void {
    if (this.dialogueBox.getIsVisible()) return;
    if (this.mathGame.isShowing()) return;
    if (!this.currentMapBuilder) return;
    
    const worldX = pointer.worldX;
    const worldY = pointer.worldY;
    
    if (this.currentMapBuilder.isWalkable(worldX, worldY, DEFAULT_FLAGS)) {
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
    if (this.clickMarker) this.clickMarker.clear();
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
    if (this.mathGame.isShowing()) return;
    if (!this.currentMapBuilder) return;

    const playerPos = this.player.getPosition();
    const nearbyEntity = this.currentMapBuilder.getNearbyEntity(playerPos.x, playerPos.y, 80);
    
    if (nearbyEntity) {
      const def = nearbyEntity.getDefinition();
      
      // Check if this NPC triggers a math challenge
      if (def.mathDifficulty && def.mathDifficulty > 0) {
        const dialogue = this.storySystem.getDialogue(def.dialogueKey ?? 'default', this.timeOfDay);
        this.dialogueBox.show(def.name, dialogue.text + '\n\n"Let me test your knowledge!"', dialogue.portrait);
        
        // Start math challenge after dialogue
        this.time.delayedCall(2000, () => {
          this.dialogueBox.hide();
          this.mathGame.startChallenge(def.name, def.mathDifficulty!, (result) => {
            this.handleMathResult(result, def.name);
          });
        });
      } else {
        // Regular dialogue
        const dialogue = this.storySystem.getDialogue(def.dialogueKey ?? 'default', this.timeOfDay);
        this.dialogueBox.show(def.name, dialogue.text, dialogue.portrait);
      }
    } else {
      // Toggle lantern
      this.player.toggleLantern();
    }
  }

  private handleMathResult(result: any, npcName: string): void {
    if (result.correct) {
      // Reward
      this.events.emit('showMessage', `${npcName}: "${result.reward?.message ?? 'Well done!'}" +${result.reward?.xp ?? 10} XP`);
      if (result.reward?.hp && result.reward.hp > 0) {
        this.events.emit('playerHealed', result.reward.hp);
      }
    } else {
      // Penalty
      this.events.emit('playerDamaged', Math.abs(result.reward?.hp ?? 1));
      this.events.emit('showMessage', `${npcName}: "That's wrong! ${result.reward?.message ?? 'Try again!'}"`);
    }
  }

  private handleMapExit(exit: any): void {
    this.isTransitioning = true;
    this.cameras.main.flash(500, 255, 255, 255);
    this.events.emit('showMessage', `Entering ${exit.targetMap.replace(/_/g, ' ')}...`);
    
    this.time.delayedCall(500, () => {
      this.loadMap(exit.targetMap, exit.targetTileX, exit.targetTileY);
      this.isTransitioning = false;
    });
  }

  private spawnNightMonsters(): void {
    if (!this.currentMapBuilder) return;
    
    const mapW = this.currentMapBuilder.getWidth();
    const mapH = this.currentMapBuilder.getHeight();
    const tileSize = this.currentMapBuilder.getTileSize();
    
    // Spawn shadow wisps in corners
    const spawnPoints = [
      { tx: 3, ty: 3 },
      { tx: Math.floor(mapW / tileSize) - 4, ty: 3 },
      { tx: 3, ty: Math.floor(mapH / tileSize) - 4 },
      { tx: Math.floor(mapW / tileSize) - 4, ty: Math.floor(mapH / tileSize) - 4 },
    ];

    for (const pt of spawnPoints) {
      const def = MONSTER_DEFINITIONS['shadow_small'];
      if (def) {
        const entity = new Entity(this, pt.tx, pt.ty, def, tileSize);
        entity.setCollisionCallback((x, y, flags) => 
          !this.currentMapBuilder!.isWalkable(x, y, flags)
        );
        this.nightMonsters.push(entity);
      }
    }
  }

  private despawnNightMonsters(): void {
    for (const monster of this.nightMonsters) {
      monster.destroy();
    }
    this.nightMonsters = [];
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
