import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { DialogueBox } from '../ui/DialogueBox';
import { StorySystem } from '../systems/StorySystem';
import { MathGameSystem } from '../systems/MathGameSystem';
import { MapBuilder } from '../maps/MapBuilder';
import { createTestTownData, createTestForestData, createTestDungeonData, createTestObjectAuditData } from '../maps/TestMaps';
import { createLumenfallVillageData } from '../maps/LumenfallVillageMap';
import { Entity } from '../entities/Entity';
import { DEFAULT_FLAGS } from '../systems/TileSystem';
import { MONSTER_DEFINITIONS } from '../systems/EntityRegistry';
import { toRenderDepth } from '../systems/LayeredTileSystem';

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
  private pickups: Array<{ id: string; itemName: string; sprite: Phaser.GameObjects.Sprite; x: number; y: number }> = [];
  
  // Player collision half-size (must match Player.ts setSize)
  private readonly PLAYER_HALF: number = 12; // 24px collision box / 2 (reduced for better navigation)
  
  // Transition cooldown
  private lastTransitionTime: number = 0;
  private isTransitioning: boolean = false;

  // Portal visual sprites (animated glowing portals at map exits)
  private portalSprites: Phaser.GameObjects.Graphics[] = [];
  private portalParticles: Phaser.GameObjects.Graphics[] = [];
  private portalTick: number = 0;

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
    
    // Character atlases
    // NOTE: characters_states and monsters_states are NOT loaded because they contain
    // duplicate frame names (elder_idle, hero_idle, etc.) that would overwrite the
    // correct pixel-art frames from the 'characters' atlas.
    this.load.atlas('characters', 'assets/characters.png', 'assets/characters.json');
  }

  create(): void {
    // Load initial map — Lumenfall Village (new starting map)
    this.loadMap('lumenfall_village', 15, 14);
    
    // Expose debug API globally
    (window as any).lumenfall = {
      getPlayerPos: () => this.player?.getPosition(),
      getPlayerTile: () => {
        const p = this.player?.getPosition();
        return p ? { tileX: Math.floor(p.x/64), tileY: Math.floor(p.y/64) } : null;
      },
      isWalkable: (tx: number, ty: number) => this.currentMapBuilder?.isWalkable(tx*64+32, ty*64+32),
      teleport: (tx: number, ty: number) => this.player?.setPosition(tx*64+32, ty*64+32),
      loadMap: (id: string, tx = 14, ty = 12) => this.loadMap(id, tx, ty),
    };

    // Set up keyboard input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.input.keyboard!.on('keydown-E', () => this.handleAction());
    this.input.keyboard!.on('keydown-SPACE', () => this.handleAction());

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
    this.events.on('loadMapRequest', ({ mapId, tileX, tileY }: { mapId: string; tileX: number; tileY: number }) => {
      this.loadMap(mapId, tileX, tileY);
    });
    
    // Click-to-move
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.handleClick(pointer);
    });

    // Emit initial state
    this.events.emit('timeUpdate', this.timeOfDay);
    this.events.emit('hpUpdate', { hp: 10, maxHp: 10 });
    this.events.emit('inventoryChanged', []);
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
    for (const pickup of this.pickups) pickup.sprite.destroy();
    this.pickups = [];
    
    this.currentMapId = mapId;
    
    // Get map data
    let mapData;
    switch (mapId) {
      case 'lumenfall_village': mapData = createLumenfallVillageData(); break;
      case 'test_town': mapData = createTestTownData(); break;
      case 'test_forest': mapData = createTestForestData(); break;
      case 'test_dungeon': mapData = createTestDungeonData(); break;
      case 'test_objects': mapData = createTestObjectAuditData(); break;
      default: mapData = createLumenfallVillageData(); break;
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

    // Spawn animated portal visuals at each exit
    this.spawnPortalVisuals(mapData);
    this.cameras.main.setZoom(1.5);
    // Add top padding (64px = 1 tile) so buildings near the top edge are not hidden behind the HUD
    this.cameras.main.setBounds(-64, -64, mapW + 128, mapH + 128);
    this.physics.world.setBounds(0, 0, mapW, mapH);
    
    // Ambient light for this map
    const ambientLight = mapData.ambientLight ?? 0.8;
    this.events.emit('ambientLightUpdate', ambientLight);
    this.spawnDemoPickups(mapData.tileSize);
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
        (x, y) => !this.isPositionWalkable(x, y)
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
    this.player.sprite.setDepth(toRenderDepth(playerPos.y, 4));

    // Emit time to UI
    this.events.emit('timeUpdate', this.timeOfDay);

    // Animate portal visuals
    this.portalTick += delta;
    this.updatePortalVisuals();
  }

  /**
   * Check if a world position is walkable, accounting for player collision box.
   * Tests multiple points around the player's bounding box to prevent edge clipping.
   */
  private isPositionWalkable(cx: number, cy: number): boolean {
    if (!this.currentMapBuilder) return false;
    const h = this.PLAYER_HALF;
    // Check center + 4 corners of collision box
    return (
      this.currentMapBuilder.isWalkable(cx, cy, DEFAULT_FLAGS) &&
      this.currentMapBuilder.isWalkable(cx - h, cy - h, DEFAULT_FLAGS) &&
      this.currentMapBuilder.isWalkable(cx + h, cy - h, DEFAULT_FLAGS) &&
      this.currentMapBuilder.isWalkable(cx - h, cy + h, DEFAULT_FLAGS) &&
      this.currentMapBuilder.isWalkable(cx + h, cy + h, DEFAULT_FLAGS)
    );
  }

  /**
   * Check if a world position is walkable using only horizontal edges (for Y-axis sliding).
   */
  private isPositionWalkableX(cx: number, cy: number): boolean {
    if (!this.currentMapBuilder) return false;
    const h = this.PLAYER_HALF;
    return (
      this.currentMapBuilder.isWalkable(cx - h, cy, DEFAULT_FLAGS) &&
      this.currentMapBuilder.isWalkable(cx + h, cy, DEFAULT_FLAGS)
    );
  }

  /**
   * Check if a world position is walkable using only vertical edges (for X-axis sliding).
   */
  private isPositionWalkableY(cx: number, cy: number): boolean {
    if (!this.currentMapBuilder) return false;
    const h = this.PLAYER_HALF;
    return (
      this.currentMapBuilder.isWalkable(cx, cy - h, DEFAULT_FLAGS) &&
      this.currentMapBuilder.isWalkable(cx, cy + h, DEFAULT_FLAGS)
    );
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
    const speed = 200 * effect.speedFactor;
    const vx = (dx / dist) * speed;
    const vy = (dy / dist) * speed;
    
    const dt = delta / 1000;
    const nextX = playerPos.x + vx * dt;
    const nextY = playerPos.y + vy * dt;
    
    // Full movement check using multi-point collision
    if (this.isPositionWalkable(nextX, nextY)) {
      this.player.sprite.setVelocity(vx, vy);
      this.player.playWalkAnimation(vx, vy);
      return;
    }
    
    // Wall-sliding: try X-only movement
    const canMoveX = this.isPositionWalkableX(nextX, playerPos.y) && 
                     this.isPositionWalkable(nextX, playerPos.y);
    // Wall-sliding: try Y-only movement  
    const canMoveY = this.isPositionWalkableY(playerPos.x, nextY) && 
                     this.isPositionWalkable(playerPos.x, nextY);
    
    if (canMoveX && Math.abs(vx) > 1) {
      this.player.sprite.setVelocity(vx, 0);
      this.player.playWalkAnimation(vx, 0);
      return;
    }
    
    if (canMoveY && Math.abs(vy) > 1) {
      this.player.sprite.setVelocity(0, vy);
      this.player.playWalkAnimation(0, vy);
      return;
    }
    
    // Both primary slides blocked — try perpendicular escape
    const step = speed * dt;
    const canSlideRight = this.isPositionWalkable(playerPos.x + step, playerPos.y);
    const canSlideLeft  = this.isPositionWalkable(playerPos.x - step, playerPos.y);
    const canSlideDown  = this.isPositionWalkable(playerPos.x, playerPos.y + step);
    const canSlideUp    = this.isPositionWalkable(playerPos.x, playerPos.y - step);
    
    // Pick the perpendicular direction that gets us closer to the target
    if (Math.abs(dy) >= Math.abs(dx)) {
      // Primarily moving vertically — try horizontal escape
      if (canSlideRight && dx >= 0) {
        this.player.sprite.setVelocity(speed, 0);
        this.player.playWalkAnimation(speed, 0);
      } else if (canSlideLeft && dx <= 0) {
        this.player.sprite.setVelocity(-speed, 0);
        this.player.playWalkAnimation(-speed, 0);
      } else if (canSlideRight) {
        this.player.sprite.setVelocity(speed, 0);
        this.player.playWalkAnimation(speed, 0);
      } else if (canSlideLeft) {
        this.player.sprite.setVelocity(-speed, 0);
        this.player.playWalkAnimation(-speed, 0);
      } else {
        // Truly stuck — cancel movement
        this.clickTarget = null;
        this.clearClickMarker();
        this.player.sprite.setVelocity(0, 0);
        this.player.playIdleAnimation();
      }
    } else {
      // Primarily moving horizontally — try vertical escape
      if (canSlideDown && dy >= 0) {
        this.player.sprite.setVelocity(0, speed);
        this.player.playWalkAnimation(0, speed);
      } else if (canSlideUp && dy <= 0) {
        this.player.sprite.setVelocity(0, -speed);
        this.player.playWalkAnimation(0, -speed);
      } else if (canSlideDown) {
        this.player.sprite.setVelocity(0, speed);
        this.player.playWalkAnimation(0, speed);
      } else if (canSlideUp) {
        this.player.sprite.setVelocity(0, -speed);
        this.player.playWalkAnimation(0, -speed);
      } else {
        // Truly stuck — cancel movement
        this.clickTarget = null;
        this.clearClickMarker();
        this.player.sprite.setVelocity(0, 0);
        this.player.playIdleAnimation();
      }
    }
  }

  private handleClick(pointer: Phaser.Input.Pointer): void {
    if (this.dialogueBox.getIsVisible()) return;
    if (this.mathGame.isShowing()) return;
    if (!this.currentMapBuilder) return;
    
    const worldX = pointer.worldX;
    const worldY = pointer.worldY;

    // Clamp click coordinates to map bounds
    // (camera has -64 offset so clicks near edges can be out of bounds)
    const mapW = this.currentMapBuilder.getWidth();
    const mapH = this.currentMapBuilder.getHeight();
    const clampedX = Math.max(0, Math.min(mapW - 1, worldX));
    const clampedY = Math.max(0, Math.min(mapH - 1, worldY));

    this.clickTarget = { x: clampedX, y: clampedY };
    this.drawClickMarker(clampedX, clampedY);
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
    const nearbyPickup = this.getNearbyPickup(playerPos.x, playerPos.y, 64);
    if (nearbyPickup) {
      nearbyPickup.sprite.destroy();
      this.pickups = this.pickups.filter((p) => p.id !== nearbyPickup.id);
      this.events.emit('inventoryAddItem', nearbyPickup.itemName);
      this.events.emit('showMessage', `Picked up ${nearbyPickup.itemName}!`);
      return;
    }
    
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

  private spawnDemoPickups(tileSize: number): void {
    const byMap: Record<string, Array<{ tx: number; ty: number; itemName: string }>> = {
      test_town: [
        { tx: 13, ty: 14, itemName: 'Sunleaf' },
        { tx: 16, ty: 14, itemName: 'Glow Moth Dust' },
      ],
      test_forest: [
        { tx: 13, ty: 18, itemName: 'Forest Herb' },
      ],
      test_dungeon: [
        { tx: 14, ty: 6, itemName: 'Crystal Water' },
      ],
    };
    for (const entry of byMap[this.currentMapId] ?? []) {
      const x = entry.tx * tileSize + tileSize / 2;
      const y = entry.ty * tileSize + tileSize / 2;
      const sprite = this.add.sprite(x, y, 'objects_props_v003', 'sparkle_pickup');
      sprite.setDisplaySize(tileSize * 0.9, tileSize * 0.9);
      sprite.setDepth(toRenderDepth(entry.ty, 2));
      this.tweens.add({
        targets: sprite,
        y: y - 8,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
      this.pickups.push({
        id: `${this.currentMapId}_${entry.tx}_${entry.ty}`,
        itemName: entry.itemName,
        sprite,
        x,
        y,
      });
    }
  }

  private getNearbyPickup(worldX: number, worldY: number, radius: number): { id: string; itemName: string; sprite: Phaser.GameObjects.Sprite; x: number; y: number } | null {
    for (const pickup of this.pickups) {
      const dist = Phaser.Math.Distance.Between(worldX, worldY, pickup.x, pickup.y);
      if (dist <= radius) return pickup;
    }
    return null;
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

  // ─────────────────────────────────────────────────────────────────────────
  // PORTAL VISUAL SYSTEM
  // ─────────────────────────────────────────────────────────────────────────

  private spawnPortalVisuals(mapData: any): void {
    // Destroy old portal graphics
    for (const g of this.portalSprites) g.destroy();
    for (const g of this.portalParticles) g.destroy();
    this.portalSprites = [];
    this.portalParticles = [];

    const TILE = mapData.tileSize;
    const exits: any[] = mapData.exits ?? [];

    for (const exit of exits) {
      // Determine world centre of the portal opening
      let cx: number, cy: number;
      if (exit.direction === 'north') {
        cx = (exit.tileX + exit.width / 2) * TILE;
        cy = 0;
      } else if (exit.direction === 'south') {
        cx = (exit.tileX + exit.width / 2) * TILE;
        cy = (exit.tileY + 1) * TILE;
      } else if (exit.direction === 'west') {
        cx = 0;
        cy = (exit.tileY + exit.width / 2) * TILE;
      } else { // east
        cx = (exit.tileX + 1) * TILE;
        cy = (exit.tileY + exit.width / 2) * TILE;
      }

      // Outer glow ring
      const ring = this.add.graphics();
      ring.setDepth(4990);
      ring.setData('cx', cx);
      ring.setData('cy', cy);
      ring.setData('phase', Math.random() * Math.PI * 2);
      ring.setData('dir', exit.direction);
      this.portalSprites.push(ring);

      // Floating arrow indicator above portal
      const arrow = this.add.graphics();
      arrow.setDepth(4991);
      arrow.setData('cx', cx);
      arrow.setData('cy', cy);
      arrow.setData('phase', Math.random() * Math.PI * 2);
      arrow.setData('dir', exit.direction);
      this.portalParticles.push(arrow);
    }
  }

  private updatePortalVisuals(): void {
    const t = this.portalTick / 1000; // seconds

    for (const ring of this.portalSprites) {
      const cx: number = ring.getData('cx');
      const cy: number = ring.getData('cy');
      const phase: number = ring.getData('phase');
      const pulse = 0.6 + 0.4 * Math.sin(t * 2.5 + phase);

      ring.clear();
      // Outer glow (large, semi-transparent)
      ring.lineStyle(4, 0x9933ff, 0.3 * pulse);
      ring.strokeCircle(cx, cy, 36);
      // Mid ring
      ring.lineStyle(3, 0xcc66ff, 0.6 * pulse);
      ring.strokeCircle(cx, cy, 26);
      // Inner bright core
      ring.lineStyle(2, 0xffffff, 0.9 * pulse);
      ring.strokeCircle(cx, cy, 16);
      // Filled centre
      ring.fillStyle(0xaa44ff, 0.4 * pulse);
      ring.fillCircle(cx, cy, 14);
      // Rotating cross lines
      const angle = t * 1.5 + phase;
      const r = 20;
      ring.lineStyle(2, 0xdd88ff, 0.7 * pulse);
      ring.beginPath();
      ring.moveTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
      ring.lineTo(cx - Math.cos(angle) * r, cy - Math.sin(angle) * r);
      ring.strokePath();
      ring.beginPath();
      ring.moveTo(cx + Math.cos(angle + Math.PI / 2) * r, cy + Math.sin(angle + Math.PI / 2) * r);
      ring.lineTo(cx - Math.cos(angle + Math.PI / 2) * r, cy - Math.sin(angle + Math.PI / 2) * r);
      ring.strokePath();
    }

    for (const arrow of this.portalParticles) {
      const cx: number = arrow.getData('cx');
      const cy: number = arrow.getData('cy');
      const phase: number = arrow.getData('phase');
      const dir: string = arrow.getData('dir');
      const bob = Math.sin(t * 3 + phase) * 6;

      arrow.clear();
      arrow.fillStyle(0xffee44, 0.9);
      arrow.lineStyle(2, 0xffffff, 0.8);

      // Draw a small directional arrow pointing INTO the portal
      let ax = cx, ay = cy;
      const arrowSize = 10;
      if (dir === 'north') {
        ay = cy - 50 + bob;
        // Down-pointing arrow (into north portal)
        arrow.fillTriangle(ax, ay + arrowSize, ax - arrowSize, ay - arrowSize, ax + arrowSize, ay - arrowSize);
      } else if (dir === 'south') {
        ay = cy + 50 - bob;
        // Up-pointing arrow
        arrow.fillTriangle(ax, ay - arrowSize, ax - arrowSize, ay + arrowSize, ax + arrowSize, ay + arrowSize);
      } else if (dir === 'west') {
        ax = cx - 50 + bob;
        // Right-pointing arrow
        arrow.fillTriangle(ax + arrowSize, ay, ax - arrowSize, ay - arrowSize, ax - arrowSize, ay + arrowSize);
      } else { // east
        ax = cx + 50 - bob;
        // Left-pointing arrow
        arrow.fillTriangle(ax - arrowSize, ay, ax + arrowSize, ay - arrowSize, ax + arrowSize, ay + arrowSize);
      }
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
