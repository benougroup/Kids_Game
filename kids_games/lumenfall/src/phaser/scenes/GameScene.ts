import Phaser from 'phaser';
import VirtualJoyStick from 'phaser3-rex-plugins/plugins/virtualjoystick.js';
import { Player, type MovementInput } from '../entities/Player';
import { DialogueBox } from '../ui/DialogueBox';
import { DialogManager } from '../ui/DialogManager';
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
  private dialogManager!: DialogManager;
  private mathGame!: MathGameSystem;
  
  // Story system
  private storySystem: StorySystem = new StorySystem();
  
  // Click-to-move
  private clickTarget: { x: number; y: number } | null = null;
  private clickPath: Array<{ x: number; y: number }> = [];
  private clickMarker: Phaser.GameObjects.Graphics | null = null;
  private clickStallMs: number = 0;
  private lastClickMovePos: { x: number; y: number } | null = null;
  private pickups: Array<{ id: string; itemName: string; sprite: Phaser.GameObjects.Sprite; x: number; y: number }> = [];
  
  // Player collision half-size (must match Player.ts collisionHalfSize)
  private readonly PLAYER_HALF: number = 14;
  
  // Transition cooldown
  private lastTransitionTime: number = 0;
  private isTransitioning: boolean = false;

  // Portal visual sprites (animated glowing portals at map exits)
  private portalSprites: Phaser.GameObjects.Graphics[] = [];
  private portalParticles: Phaser.GameObjects.Graphics[] = [];
  private portalTick: number = 0;

  // Virtual joystick for touch/iPad/iPhone controls
  private joyStick: any = null;
  private joyStickCursors: any = null;
  private joyBase: Phaser.GameObjects.Graphics | null = null;
  private joyThumb: Phaser.GameObjects.Graphics | null = null;
  private joyArrows: Phaser.GameObjects.Graphics | null = null;
  private joyCenter = { x: 76, y: 410 };
  private joyRadius = 56;

  // UI zone heights (pixels) — taps in these zones don't trigger click-to-move
  private readonly HUD_HEIGHT = 52;    // top HUD bar
  private readonly BTN_HEIGHT = 90;    // bottom button row
  private readonly SAFE_MARGIN = 12;

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
    this.loadMap('lumenfall_village', 15, 17);
    
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

    // Virtual joystick for touch/iPad/iPhone — bottom-left safe zone.
    // Kept visible on desktop too so browser device emulation matches tablets.
    this.createTouchControls();
    this.scale.on('resize', (size: Phaser.Structs.Size) => this.layoutTouchControls(size.width, size.height));

    // Day/night overlay
    this.dayNightOverlay = this.add.rectangle(0, 0, 4000, 4000, 0x000033, 0);
    this.dayNightOverlay.setOrigin(0, 0);
    this.dayNightOverlay.setScrollFactor(1);
    this.dayNightOverlay.setDepth(5000);

    // Click marker
    this.clickMarker = this.add.graphics();
    this.clickMarker.setDepth(4999);

    // Dialogue box (legacy — kept for math game)
    this.dialogueBox = new DialogueBox(this);

    // New dialog manager — centered, multi-type
    this.dialogManager = new DialogManager(this);

    // Math game system
    this.mathGame = new MathGameSystem(this);

    // Listen for action button from UI
    this.events.on('playerAction', () => this.handleAction());
    this.events.on('loadMapRequest', ({ mapId, tileX, tileY }: { mapId: string; tileX: number; tileY: number }) => {
      this.loadMap(mapId, tileX, tileY);
    });
    
    // Click-to-move (tap anywhere on the game world — not on UI zones)
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Ignore taps in HUD zone (top) and button zone (bottom)
      const sy = pointer.y; // screen Y (not world Y)
      const sh = this.scale.height;
      if (sy < this.HUD_HEIGHT) return;           // top HUD bar
      if (sy > sh - this.BTN_HEIGHT) return;      // bottom buttons
      // Ignore taps in joystick and mobile button safe zones.
      if (this.isInMobileControlZone(pointer.x, pointer.y)) return;
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
    this.cancelClickMovement(false);
    
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
    
    // Create or move player. If a map transition or saved spawn points at an
    // obstacle, nudge to the nearest walkable tile instead of trapping the hero.
    const requestedSpawnX = spawnTileX * mapData.tileSize + mapData.tileSize / 2;
    const requestedSpawnY = spawnTileY * mapData.tileSize + mapData.tileSize / 2;
    const spawn = this.findNearestWalkablePosition(requestedSpawnX, requestedSpawnY, mapData.tileSize);

    if (!this.player) {
      this.player = new Player(this, spawn.x, spawn.y);
    } else {
      this.player.setPosition(spawn.x, spawn.y);
    }
    
    // Camera setup
    this.cameras.main.startFollow(this.player.sprite, true, 0.08, 0.08);
    // Round camera scroll to whole pixels — prevents sub-pixel tile bleeding
    this.cameras.main.setRoundPixels(true);

    // Spawn animated portal visuals at each exit
    this.spawnPortalVisuals(mapData);
    // Zoom 2.0 — 64px tiles render at 128px (integer multiple, no sub-pixel gaps)
    // 720x480 canvas at 2.0x zoom shows 360x240 world pixels = 5.6x3.75 tiles visible
    this.cameras.main.setZoom(2.0);
    // Add top padding (64px = 1 tile) so buildings near the top edge are not hidden behind the HUD
    this.cameras.main.setBounds(-64, -64, mapW + 128, mapH + 128);
    this.physics.world.setBounds(0, 0, mapW, mapH);
    
    // Ambient light for this map
    const ambientLight = mapData.ambientLight ?? 0.8;
    this.events.emit('ambientLightUpdate', ambientLight);
    this.spawnDemoPickups(mapData.tileSize);

    // Reset transition cooldown so the player can't immediately re-trigger the
    // exit they just came through (prevents bounce-back stuck bug)
    this.lastTransitionTime = Date.now();
  }

  update(_time: number, delta: number): void {
    if (!this.currentMapBuilder || this.isTransitioning) return;
    
    // Update math game timer
    this.mathGame.update(delta);
    if (this.mathGame.isShowing()) {
      this.player?.stop();
      return; // Pause game during math challenge
    }
    
    const movementInput = this.getMovementInput();

    if (this.hasMovementInput(movementInput)) {
      this.cancelClickMovement(false);
      const effect = this.currentMapBuilder.getTileEffect(this.player.sprite.x, this.player.sprite.y);
      this.player.move(movementInput, {
        isBlocked: (x, y) => !this.isPositionWalkable(x, y),
        deltaSeconds: delta / 1000,
        speedFactor: effect.speedFactor,
      });
    } else if (this.clickTarget) {
      this.moveTowardsClick(delta);
    } else {
      this.player.stop();
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
    this.player.sprite.setDepth(toRenderDepth(playerPos.y / this.player.getTileSize(), 4));

    // Emit time to UI
    this.events.emit('timeUpdate', this.timeOfDay);

    // Animate portal visuals
    this.portalTick += delta;
    this.updatePortalVisuals();
  }

  private getMovementInput(): MovementInput {
    const joy = this.joyStickCursors;
    const analog = this.getJoystickAxes();
    return {
      left: this.cursors.left.isDown || this.wasd.A.isDown || (joy?.left?.isDown ?? false),
      right: this.cursors.right.isDown || this.wasd.D.isDown || (joy?.right?.isDown ?? false),
      up: this.cursors.up.isDown || this.wasd.W.isDown || (joy?.up?.isDown ?? false),
      down: this.cursors.down.isDown || this.wasd.S.isDown || (joy?.down?.isDown ?? false),
      xAxis: analog.x,
      yAxis: analog.y,
    };
  }

  private createTouchControls(): void {
    this.joyRadius = this.scale.width < 600 ? 50 : 56;
    this.joyBase = this.add.graphics();
    this.joyBase.setScrollFactor(0).setDepth(2010);

    this.joyThumb = this.add.graphics();
    this.joyThumb.setScrollFactor(0).setDepth(2011);

    this.joyArrows = this.add.graphics();
    this.joyArrows.setScrollFactor(0).setDepth(2010);

    this.layoutTouchControls(this.scale.width, this.scale.height);

    this.joyStick = new VirtualJoyStick(this, {
      x: this.joyCenter.x,
      y: this.joyCenter.y,
      radius: this.joyRadius,
      base: this.joyBase,
      thumb: this.joyThumb,
      dir: '8dir',
      fixed: true,
      enable: true,
    });
    this.joyStickCursors = this.joyStick.createCursorKeys();
  }

  private layoutTouchControls(width: number, height: number): void {
    this.joyRadius = width < 600 ? 50 : 56;
    this.joyCenter = {
      x: this.SAFE_MARGIN + this.joyRadius + 8,
      y: height - this.SAFE_MARGIN - this.joyRadius - 8,
    };

    this.joyBase?.clear();
    this.joyBase?.fillStyle(0x000000, 0.38);
    this.joyBase?.fillCircle(0, 0, this.joyRadius);
    this.joyBase?.lineStyle(3, 0xffd700, 0.7);
    this.joyBase?.strokeCircle(0, 0, this.joyRadius);
    this.joyBase?.setPosition(this.joyCenter.x, this.joyCenter.y);

    this.joyThumb?.clear();
    this.joyThumb?.fillStyle(0xffd700, 0.78);
    this.joyThumb?.fillCircle(0, 0, Math.max(18, this.joyRadius * 0.4));
    this.joyThumb?.lineStyle(2, 0xffffff, 0.55);
    this.joyThumb?.strokeCircle(0, 0, Math.max(18, this.joyRadius * 0.4));
    this.joyThumb?.setPosition(this.joyCenter.x, this.joyCenter.y);

    this.joyArrows?.clear();
    this.joyArrows?.fillStyle(0xffffff, 0.42);
    this.joyArrows?.fillTriangle(0, -this.joyRadius + 10, -7, -this.joyRadius + 23, 7, -this.joyRadius + 23);
    this.joyArrows?.fillTriangle(0, this.joyRadius - 10, -7, this.joyRadius - 23, 7, this.joyRadius - 23);
    this.joyArrows?.fillTriangle(-this.joyRadius + 10, 0, -this.joyRadius + 23, -7, -this.joyRadius + 23, 7);
    this.joyArrows?.fillTriangle(this.joyRadius - 10, 0, this.joyRadius - 23, -7, this.joyRadius - 23, 7);
    this.joyArrows?.setPosition(this.joyCenter.x, this.joyCenter.y);

    this.joyStick?.setPosition?.(this.joyCenter.x, this.joyCenter.y);
    if (this.joyStick) {
      this.joyStick.x = this.joyCenter.x;
      this.joyStick.y = this.joyCenter.y;
      this.joyStick.radius = this.joyRadius;
    }
  }

  private getJoystickAxes(): { x: number; y: number } {
    if (!this.joyStick || !this.joyStick.force) return { x: 0, y: 0 };

    const rawX = Phaser.Math.Clamp(this.joyStick.forceX ?? 0, -this.joyRadius, this.joyRadius);
    const rawY = Phaser.Math.Clamp(this.joyStick.forceY ?? 0, -this.joyRadius, this.joyRadius);
    const x = rawX / this.joyRadius;
    const y = rawY / this.joyRadius;
    return Math.sqrt(x * x + y * y) < 0.18 ? { x: 0, y: 0 } : { x, y };
  }

  private isInMobileControlZone(screenX: number, screenY: number): boolean {
    const joystickPadding = 18;
    const joyDistance = Phaser.Math.Distance.Between(screenX, screenY, this.joyCenter.x, this.joyCenter.y);
    return joyDistance <= this.joyRadius + joystickPadding;
  }

  private hasMovementInput(input: MovementInput): boolean {
    return input.left || input.right || input.up || input.down || Math.abs(input.xAxis ?? 0) > 0 || Math.abs(input.yAxis ?? 0) > 0;
  }

  /**
   * Find the closest safe player center for a requested spawn. This protects
   * movement from being disabled by a bad transition/save coordinate or by map
   * art later being placed on top of an old spawn tile.
   */
  private findNearestWalkablePosition(worldX: number, worldY: number, tileSize: number): { x: number; y: number } {
    if (this.isPositionWalkable(worldX, worldY)) return { x: worldX, y: worldY };

    const startTileX = Math.floor(worldX / tileSize);
    const startTileY = Math.floor(worldY / tileSize);

    for (let radius = 1; radius <= 6; radius++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;

          const candidateX = (startTileX + dx) * tileSize + tileSize / 2;
          const candidateY = (startTileY + dy) * tileSize + tileSize / 2;
          if (this.isPositionWalkable(candidateX, candidateY)) {
            console.warn(`Spawn (${startTileX}, ${startTileY}) was blocked; moved player to (${startTileX + dx}, ${startTileY + dy}).`);
            return { x: candidateX, y: candidateY };
          }
        }
      }
    }

    console.warn(`Spawn (${startTileX}, ${startTileY}) was blocked and no nearby walkable tile was found.`);
    return { x: worldX, y: worldY };
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
      this.advanceClickPath();
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
      this.applyClickVelocity(vx, vy, delta, playerPos);
      return;
    }
    
    // Wall-sliding: try X-only movement
    const canMoveX = this.isPositionWalkableX(nextX, playerPos.y) && 
                     this.isPositionWalkable(nextX, playerPos.y);
    // Wall-sliding: try Y-only movement  
    const canMoveY = this.isPositionWalkableY(playerPos.x, nextY) && 
                     this.isPositionWalkable(playerPos.x, nextY);
    
    if (canMoveX && Math.abs(vx) > 1) {
      this.applyClickVelocity(vx, 0, delta, playerPos);
      return;
    }
    
    if (canMoveY && Math.abs(vy) > 1) {
      this.applyClickVelocity(0, vy, delta, playerPos);
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
      if (canSlideRight && dx >= 0) this.applyClickVelocity(speed, 0, delta, playerPos);
      else if (canSlideLeft && dx <= 0) this.applyClickVelocity(-speed, 0, delta, playerPos);
      else if (canSlideRight) this.applyClickVelocity(speed, 0, delta, playerPos);
      else if (canSlideLeft) this.applyClickVelocity(-speed, 0, delta, playerPos);
      else this.cancelClickMovement();
    } else {
      // Primarily moving horizontally — try vertical escape
      if (canSlideDown && dy >= 0) this.applyClickVelocity(0, speed, delta, playerPos);
      else if (canSlideUp && dy <= 0) this.applyClickVelocity(0, -speed, delta, playerPos);
      else if (canSlideDown) this.applyClickVelocity(0, speed, delta, playerPos);
      else if (canSlideUp) this.applyClickVelocity(0, -speed, delta, playerPos);
      else this.cancelClickMovement();
    }
  }

  private applyClickVelocity(vx: number, vy: number, delta: number, playerPos: { x: number; y: number }): void {
    this.player.sprite.setVelocity(vx, vy);
    this.player.playWalkAnimation(vx, vy);
    this.cancelIfClickMovementStalled(delta, playerPos);
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

    const target = this.findNearestWalkableClickTarget(clampedX, clampedY);
    const playerPos = this.player.getPosition();
    this.clickPath = this.findClickPath(playerPos, target);
    this.clickTarget = this.clickPath.shift() ?? target;
    this.clickStallMs = 0;
    this.lastClickMovePos = null;
    this.drawClickMarker(target.x, target.y);
  }


  private advanceClickPath(): void {
    const nextTarget = this.clickPath.shift();
    if (nextTarget) {
      this.clickTarget = nextTarget;
      this.clickStallMs = 0;
      this.lastClickMovePos = null;
      return;
    }

    this.cancelClickMovement();
  }

  private findNearestWalkableClickTarget(worldX: number, worldY: number): { x: number; y: number } {
    if (this.isPositionWalkable(worldX, worldY)) return { x: worldX, y: worldY };
    if (!this.currentMapBuilder) return { x: worldX, y: worldY };

    const tileSize = this.currentMapBuilder.getTileSize();
    const startTileX = Math.floor(worldX / tileSize);
    const startTileY = Math.floor(worldY / tileSize);
    let bestX = worldX;
    let bestY = worldY;
    let bestDistSq = Number.POSITIVE_INFINITY;
    let hasBest = false;

    for (let radius = 1; radius <= 4; radius++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
          const candidateX = (startTileX + dx) * tileSize + tileSize / 2;
          const candidateY = (startTileY + dy) * tileSize + tileSize / 2;
          if (!this.isPositionWalkable(candidateX, candidateY)) continue;

          const distSq = (candidateX - worldX) ** 2 + (candidateY - worldY) ** 2;
          if (distSq < bestDistSq) {
            bestX = candidateX;
            bestY = candidateY;
            bestDistSq = distSq;
            hasBest = true;
          }
        }
      }
      if (hasBest) return { x: bestX, y: bestY };
    }

    return { x: worldX, y: worldY };
  }

  private findClickPath(start: { x: number; y: number }, goal: { x: number; y: number }): Array<{ x: number; y: number }> {
    if (!this.currentMapBuilder) return [goal];

    const tileSize = this.currentMapBuilder.getTileSize();
    const cols = Math.ceil(this.currentMapBuilder.getWidth() / tileSize);
    const rows = Math.ceil(this.currentMapBuilder.getHeight() / tileSize);
    const startTile = { x: Math.floor(start.x / tileSize), y: Math.floor(start.y / tileSize) };
    const goalTile = { x: Math.floor(goal.x / tileSize), y: Math.floor(goal.y / tileSize) };
    const key = (x: number, y: number) => `${x},${y}`;
    const heuristic = (x: number, y: number) => Math.abs(x - goalTile.x) + Math.abs(y - goalTile.y);
    const centerOf = (x: number, y: number) => ({ x: x * tileSize + tileSize / 2, y: y * tileSize + tileSize / 2 });
    const isTileWalkable = (x: number, y: number) => x >= 0 && y >= 0 && x < cols && y < rows && this.isPositionWalkable(centerOf(x, y).x, centerOf(x, y).y);

    if (startTile.x === goalTile.x && startTile.y === goalTile.y) return [goal];
    if (!isTileWalkable(goalTile.x, goalTile.y)) return [goal];

    type Node = { x: number; y: number; g: number; f: number; parent: Node | null };
    const open: Node[] = [{ x: startTile.x, y: startTile.y, g: 0, f: heuristic(startTile.x, startTile.y), parent: null }];
    const bestG = new Map<string, number>([[key(startTile.x, startTile.y), 0]]);
    const closed = new Set<string>();
    const neighbors = [
      { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
      { x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 },
    ];

    while (open.length > 0 && closed.size <= cols * rows) {
      open.sort((a, b) => a.f - b.f);
      const current = open.shift()!;
      const currentKey = key(current.x, current.y);
      if (closed.has(currentKey)) continue;
      if (current.x === goalTile.x && current.y === goalTile.y) {
        const path: Array<{ x: number; y: number }> = [];
        let node: Node | null = current;
        while (node) {
          path.unshift(node.x === goalTile.x && node.y === goalTile.y ? goal : centerOf(node.x, node.y));
          node = node.parent;
        }
        path.shift();
        return path.length > 0 ? path : [goal];
      }

      closed.add(currentKey);
      for (const n of neighbors) {
        const nx = current.x + n.x;
        const ny = current.y + n.y;
        const diagonal = n.x !== 0 && n.y !== 0;
        if (!isTileWalkable(nx, ny)) continue;
        if (diagonal && (!isTileWalkable(current.x + n.x, current.y) || !isTileWalkable(current.x, current.y + n.y))) continue;

        const nextG = current.g + (diagonal ? 1.4 : 1);
        const nextKey = key(nx, ny);
        if (nextG >= (bestG.get(nextKey) ?? Number.POSITIVE_INFINITY)) continue;

        bestG.set(nextKey, nextG);
        open.push({ x: nx, y: ny, g: nextG, f: nextG + heuristic(nx, ny), parent: current });
      }
    }

    console.warn('No click path found; using nearest walkable click target directly.');
    return [goal];
  }

  private cancelIfClickMovementStalled(delta: number, playerPos: { x: number; y: number }): boolean {
    if (!this.clickTarget) return false;

    if (!this.lastClickMovePos) {
      this.lastClickMovePos = { ...playerPos };
      this.clickStallMs = 0;
      return false;
    }

    const moved = Phaser.Math.Distance.Between(playerPos.x, playerPos.y, this.lastClickMovePos.x, this.lastClickMovePos.y);
    if (moved < 0.5) {
      this.clickStallMs += delta;
    } else {
      this.clickStallMs = 0;
      this.lastClickMovePos = { ...playerPos };
    }

    if (this.clickStallMs < 450) return false;

    this.cancelClickMovement();
    return true;
  }

  private cancelClickMovement(stopPlayer: boolean = true): void {
    this.clickTarget = null;
    this.clickPath = [];
    this.clickStallMs = 0;
    this.lastClickMovePos = null;
    this.clearClickMarker();
    if (stopPlayer && this.player) {
      this.player.sprite.setVelocity(0, 0);
      this.player.playIdleAnimation();
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
    if (this.dialogManager.isOpen()) {
      this.dialogManager.close();
      return;
    }
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
      this.triggerNPCDialog(def);
    } else {
      // Toggle lantern
      this.player.toggleLantern();
    }
  }

  /**
   * Route NPC interaction to the correct DialogManager type based on dialogueKey.
   * Keys ending in _quiz, _riddle, _fill, _puzzle, _choice use the new system.
   * Everything else falls back to the story dialog.
   */
  private triggerNPCDialog(def: { name: string; dialogueKey?: string; mathDifficulty?: number; portrait?: string }): void {
    const key = def.dialogueKey ?? 'default';

    // Math challenge NPCs (legacy path)
    if (def.mathDifficulty && def.mathDifficulty > 0) {
      const dialogue = this.storySystem.getDialogue(key, this.timeOfDay);
      this.dialogManager.story(
        { speaker: def.name, text: dialogue.text + '\n\n"Let me test your knowledge!"', portrait: dialogue.portrait },
        () => {
          this.mathGame.startChallenge(def.name, def.mathDifficulty!, (result) => {
            this.handleMathResult(result, def.name);
          });
        }
      );
      return;
    }

    // Route by key suffix
    if (key.endsWith('_quiz')) {
      const q = this.storySystem.getQuizData(key);
      if (q) { this.dialogManager.quiz(q, (ok) => this.handleLearningResult(ok, def.name, 'quiz')); return; }
    }
    if (key.endsWith('_riddle')) {
      const r = this.storySystem.getRiddleData(key);
      if (r) { this.dialogManager.riddle(r, (ok) => this.handleLearningResult(ok, def.name, 'riddle')); return; }
    }
    if (key.endsWith('_fill')) {
      const f = this.storySystem.getFillData(key);
      if (f) { this.dialogManager.fill(f, (ok) => this.handleLearningResult(ok, def.name, 'fill')); return; }
    }
    if (key.endsWith('_puzzle')) {
      const p = this.storySystem.getPuzzleData(key);
      if (p) { this.dialogManager.puzzle(p, (ok) => this.handleLearningResult(ok, def.name, 'puzzle')); return; }
    }
    if (key.endsWith('_choice')) {
      const c = this.storySystem.getChoiceData(key);
      if (c) { this.dialogManager.choice(c, (i) => this.handleChoiceResult(i, def.name, c.options)); return; }
    }

    // Default: story dialog
    const dialogue = this.storySystem.getDialogue(key, this.timeOfDay);
    this.dialogManager.story(
      { speaker: def.name, text: dialogue.text, portrait: dialogue.portrait },
    );
  }

  private handleLearningResult(correct: boolean, npcName: string, type: string): void {
    if (correct) {
      this.events.emit('showMessage', `${npcName}: "Well done! +10 XP"`);
      this.events.emit('playerHealed', 1);
    } else {
      this.events.emit('showMessage', `${npcName}: "Keep trying! You'll get it!"`);
    }
    void type;
  }

  private handleChoiceResult(index: number, npcName: string, options: string[]): void {
    this.events.emit('showMessage', `${npcName}: "You chose: ${options[index]}"`);
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
