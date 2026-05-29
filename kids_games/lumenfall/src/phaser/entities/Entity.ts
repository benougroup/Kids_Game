import Phaser from 'phaser';
import { EntityDefinition, EntityState, MONSTER_TINTS, MONSTER_ALPHA } from '../systems/EntityRegistry';
import { EntityMovementFlags, DEFAULT_FLAGS } from '../systems/TileSystem';
import { toRenderDepth } from '../systems/LayeredTileSystem';
import { NPCBubble, BubbleType } from '../ui/NPCBubble';

/**
 * Unified Entity class for NPCs and Monsters
 * Handles state management, animations, movement, and AI
 */
export class Entity {
  public sprite: Phaser.GameObjects.Sprite;
  private scene: Phaser.Scene;
  private def: EntityDefinition;
  
  // State
  private currentState: EntityState = 'idle';
  private hp: number;
  private maxHp: number;
  
  // Movement
  private homeX: number;
  private homeY: number;
  private moveTimer: number = 0;
  private isMoving: boolean = false;
  private moveTween: Phaser.Tweens.Tween | null = null;
  
  // AI
  private isHostile: boolean;
  private sightRange: number;
  private fleeFromLight: boolean;
  private lastDamageTime: number = 0;
  private damageInterval: number = 1000; // ms between damage ticks
  
  // Collision callback
  private isBlockedFn?: (x: number, y: number, flags: EntityMovementFlags, fromX?: number, fromY?: number) => boolean;
  private tileSize: number;
  private readonly collisionHalfSize: number;

  // Speech bubble
  private bubble: NPCBubble | null = null;
  private lastBubbleType: BubbleType = 'silent';

  // Monster AI bubble state
  private monsterAIState: 'sleepy' | 'awake' | 'alert' | 'aggressive' = 'sleepy';
  private alertTimer: number = 0; // ms since last alert (resets to awake after 3s)

  constructor(
    scene: Phaser.Scene,
    tileX: number,
    tileY: number,
    def: EntityDefinition,
    tileSize: number = 64
  ) {
    this.scene = scene;
    this.tileSize = tileSize;
    this.def = def;
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.isHostile = def.isHostile ?? false;
    this.sightRange = (def.sightRange ?? 5) * tileSize;
    this.fleeFromLight = def.fleeFromLight ?? false;

    const x = tileX * tileSize + tileSize / 2;
    const y = tileY * tileSize + tileSize / 2;
    this.homeX = x;
    this.homeY = y;

    // Create sprite
    const idleFrame = this.getFrame('idle');
    this.sprite = scene.add.sprite(x, y, def.atlas, idleFrame);
    
    const displaySize = def.displaySize ?? 48;
    this.collisionHalfSize = Math.max(10, Math.min(22, displaySize * 0.3));
    this.sprite.setDisplaySize(displaySize, displaySize);
    this.sprite.setOrigin(0.5, 0.5);
    this.sprite.setDepth(toRenderDepth(y / tileSize, 4));

    // Apply monster tint/alpha
    if (MONSTER_TINTS[def.id] !== undefined) {
      this.sprite.setTint(MONSTER_TINTS[def.id]);
    }
    if (MONSTER_ALPHA[def.id] !== undefined) {
      this.sprite.setAlpha(MONSTER_ALPHA[def.id]);
    }

    // Store entity data on sprite for interaction
    this.sprite.setData('entityId', def.id);
    this.sprite.setData('entityRef', this);
    this.sprite.setData('dialogueKey', def.dialogueKey);
    this.sprite.setData('name', def.name);
    this.sprite.setData('type', def.type);
    
    // Create animations
    this.createAnimations();
    this.playState('idle');

    // Create speech bubble for NPCs and monsters/animals
    if (def.type === 'npc' || def.type === 'monster') {
      this.bubble = new NPCBubble(scene, x, y);
      this.updateBubbleType();
    }
  }

  private getFrame(state: EntityState): string {
    const frames = this.def.frames[state];
    if (Array.isArray(frames)) return frames[0];
    return frames;
  }

  private createAnimations(): void {
    const id = this.def.id;
    
    // Walk animation
    const walkFrames = this.def.frames['walk'];
    if (Array.isArray(walkFrames) && walkFrames.length > 1) {
      const animKey = `${id}_walk`;
      if (!this.scene.anims.exists(animKey)) {
        this.scene.anims.create({
          key: animKey,
          frames: walkFrames.map(f => ({ key: this.def.atlas, frame: f })),
          frameRate: 6,
          repeat: -1,
        });
      }
    }
    
    // Run animation (same as walk but faster)
    const runFrames = this.def.frames['run'];
    if (Array.isArray(runFrames) && runFrames.length > 1) {
      const animKey = `${id}_run`;
      if (!this.scene.anims.exists(animKey)) {
        this.scene.anims.create({
          key: animKey,
          frames: runFrames.map(f => ({ key: this.def.atlas, frame: f })),
          frameRate: 10,
          repeat: -1,
        });
      }
    }
  }

  public playState(state: EntityState): void {
    if (this.currentState === state) return;
    this.currentState = state;
    
    const id = this.def.id;
    const animKey = `${id}_${state}`;
    
    if (state === 'walk' && this.scene.anims.exists(animKey)) {
      this.sprite.play(animKey);
    } else if (state === 'run' && this.scene.anims.exists(animKey)) {
      this.sprite.play(animKey);
    } else {
      // Static frame
      const frame = this.getFrame(state);
      this.sprite.stop();
      this.sprite.setFrame(frame);
    }
  }

  public setState(state: EntityState): void {
    this.playState(state);
  }

  public getState(): EntityState {
    return this.currentState;
  }

  public setCollisionCallback(fn: (x: number, y: number, flags: EntityMovementFlags, fromX?: number, fromY?: number) => boolean): void {
    this.isBlockedFn = fn;
  }

  public update(delta: number, playerX: number, playerY: number, lightSources: Array<{x: number; y: number; radius: number}>): void {
    // Update depth for Y-sorting (even when dead so corpse sorts correctly)
    this.sprite.setDepth(toRenderDepth(this.sprite.y / this.tileSize, 4));

    // Update speech bubble
    if (this.bubble) {
      const displaySize = this.def.displaySize ?? 48;
      this.bubble.update(this.sprite.x, this.sprite.y, displaySize, delta);

      // Pulse bubble when player is nearby (within 90px)
      const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, playerX, playerY);
      if (dist < 90 && this.lastBubbleType === 'talking') {
        // Only pulse once per second
        if (Math.floor(delta) % 60 === 0) this.bubble.pulse();
      }

      // Re-evaluate bubble type when state changes
      const newType = this.resolveBubbleType();
      if (newType !== this.lastBubbleType) {
        this.lastBubbleType = newType;
        this.bubble.show(newType);
      }
    }

    if (this.currentState === 'dead' || this.currentState === 'frozen') return;

    // NPC wandering
    if (this.def.canWander && !this.isHostile) {
      this.updateWander(delta);
    }

    // Monster AI
    if (this.isHostile && this.def.type === 'monster') {
      this.updateMonsterAI(delta, playerX, playerY, lightSources);
    }
    
    // Ghost NPC wandering
    if (!this.isHostile && this.def.type === 'monster') {
      this.updateWander(delta);
    }
  }

  private updateWander(delta: number): void {
    if (this.isMoving) return;
    
    this.moveTimer += delta;
    const interval = 2000 + Math.random() * 3000; // 2-5 seconds between moves
    
    if (this.moveTimer > interval) {
      this.moveTimer = 0;
      
      const wanderRadius = (this.def.wanderRadius ?? 3) * 64;
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * wanderRadius;
      
      const newX = this.homeX + Math.cos(angle) * dist;
      const newY = this.homeY + Math.sin(angle) * dist;
      
      const flags = this.def.movementFlags ?? DEFAULT_FLAGS;
      if (this.canOccupy(newX, newY, flags) && this.isPathClear(newX, newY, flags)) {
        this.moveTo(newX, newY, this.def.speed);
      }
    }
  }

  private updateMonsterAI(
    delta: number,
    playerX: number,
    playerY: number,
    lightSources: Array<{x: number; y: number; radius: number}>
  ): void {
    const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, playerX, playerY);
    
    // Check if in light (flee from light)
    if (this.fleeFromLight) {
      for (const light of lightSources) {
        const lightDist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, light.x, light.y);
        if (lightDist < light.radius) {
          this.fleeFrom(light.x, light.y);
          this.monsterAIState = 'aggressive'; // fleeing = aggressive bubble
          return;
        }
      }
    }

    // Chase player if in sight range
    if (dist < this.sightRange) {
      // Alert zone: outer half of sight range
      if (dist < this.sightRange && dist > this.sightRange * 0.5) {
        if (this.monsterAIState === 'sleepy') {
          this.monsterAIState = 'awake'; // just noticed something
          this.alertTimer = 0;
        }
      }
      // Aggressive zone: inner half — actively chasing
      if (dist < this.sightRange * 0.5) {
        this.monsterAIState = 'aggressive';
        this.alertTimer = 0;
      }
      if (!this.isMoving) {
        this.moveTo(playerX, playerY, this.def.speed);
      }
    } else {
      // Player out of range — cool down from aggressive → awake → sleepy
      if (this.monsterAIState === 'aggressive') {
        this.monsterAIState = 'alert';
        this.alertTimer = 0;
      } else if (this.monsterAIState === 'alert' || this.monsterAIState === 'awake') {
        this.alertTimer += delta;
        if (this.alertTimer > 3000) {
          this.monsterAIState = 'sleepy';
          this.alertTimer = 0;
        }
      }
      this.updateWander(delta);
    }
  }

  private fleeFrom(fromX: number, fromY: number): void {
    const angle = Math.atan2(this.sprite.y - fromY, this.sprite.x - fromX);
    const fleeX = this.sprite.x + Math.cos(angle) * 128;
    const fleeY = this.sprite.y + Math.sin(angle) * 128;
    
    const flags = this.def.movementFlags ?? DEFAULT_FLAGS;
    if (this.canOccupy(fleeX, fleeY, flags)) {
      this.moveTo(fleeX, fleeY, this.def.speed * 1.5);
    }
  }

  private canOccupy(x: number, y: number, flags: EntityMovementFlags): boolean {
    if (!this.isBlockedFn) return true;
    const h = this.collisionHalfSize;
    const fromX = this.sprite.x;
    const fromY = this.sprite.y;
    return !(
      this.isBlockedFn(x, y, flags, fromX, fromY) ||
      this.isBlockedFn(x - h, y - h, flags, fromX, fromY) ||
      this.isBlockedFn(x + h, y - h, flags, fromX, fromY) ||
      this.isBlockedFn(x - h, y + h, flags, fromX, fromY) ||
      this.isBlockedFn(x + h, y + h, flags, fromX, fromY)
    );
  }

  private isPathClear(targetX: number, targetY: number, flags: EntityMovementFlags): boolean {
    return this.getReachablePoint(targetX, targetY, flags).reached;
  }

  private getReachablePoint(targetX: number, targetY: number, flags: EntityMovementFlags): { x: number; y: number; reached: boolean } {
    if (!this.isBlockedFn) return { x: targetX, y: targetY, reached: true };

    const startX = this.sprite.x;
    const startY = this.sprite.y;
    const dist = Phaser.Math.Distance.Between(startX, startY, targetX, targetY);
    const steps = Math.max(1, Math.ceil(dist / (this.tileSize / 4)));
    let lastX = startX;
    let lastY = startY;

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const x = Phaser.Math.Linear(startX, targetX, t);
      const y = Phaser.Math.Linear(startY, targetY, t);
      if (!this.canOccupy(x, y, flags)) {
        return { x: lastX, y: lastY, reached: false };
      }
      lastX = x;
      lastY = y;
    }

    return { x: targetX, y: targetY, reached: true };
  }

  private moveTo(targetX: number, targetY: number, speed: number): void {
    const flags = this.def.movementFlags ?? DEFAULT_FLAGS;
    const reachable = this.getReachablePoint(targetX, targetY, flags);
    targetX = reachable.x;
    targetY = reachable.y;

    if (!reachable.reached && Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, targetX, targetY) < 4) {
      return;
    }

    if (this.isMoving) {
      this.moveTween?.stop();
    }
    
    this.isMoving = true;
    
    const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, targetX, targetY);
    const duration = (dist / speed) * 1000;
    
    // Face direction
    if (targetX < this.sprite.x) this.sprite.setFlipX(true);
    else if (targetX > this.sprite.x) this.sprite.setFlipX(false);
    
    this.playState('walk');
    
    this.moveTween = this.scene.tweens.add({
      targets: this.sprite,
      x: targetX,
      y: targetY,
      duration: Math.min(duration, 2000), // Max 2 seconds per move
      ease: 'Linear',
      onComplete: () => {
        this.isMoving = false;
        this.playState('idle');
      }
    });
  }

  public takeDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
    
    // Flash red
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0.3,
      duration: 100,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        this.sprite.setAlpha(MONSTER_ALPHA[this.def.id] ?? 1.0);
      }
    });
    
    if (this.hp <= 0) {
      this.die();
    }
  }

  public shrinkFromLight(lightIntensity: number): void {
    // Shadow monsters shrink when hit by light
    const scale = Math.max(0.3, 1.0 - lightIntensity * 0.7);
    const displaySize = (this.def.displaySize ?? 48) * scale;
    this.sprite.setDisplaySize(displaySize, displaySize);
  }

  public restoreSize(): void {
    const displaySize = this.def.displaySize ?? 48;
    this.sprite.setDisplaySize(displaySize, displaySize);
  }

  private die(): void {
    this.playState('dead');
    this.isMoving = false;
    this.moveTween?.stop();
    
    // Fade out and destroy after 2 seconds
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      duration: 2000,
      delay: 500,
      onComplete: () => {
        this.sprite.destroy();
      }
    });
  }

  public freeze(): void {
    this.playState('frozen');
    this.isMoving = false;
    this.moveTween?.stop();
    
    // Apply grey tint
    this.sprite.setTint(0x888888);
  }

  public unfreeze(): void {
    if (MONSTER_TINTS[this.def.id] !== undefined) {
      this.sprite.setTint(MONSTER_TINTS[this.def.id]);
    } else {
      this.sprite.clearTint();
    }
    this.playState('idle');
  }

  public faint(): void {
    this.playState('fainted');
    this.isMoving = false;
    this.moveTween?.stop();
  }

  public canDealDamage(now: number): boolean {
    if (!this.isHostile) return false;
    if (now - this.lastDamageTime < this.damageInterval) return false;
    this.lastDamageTime = now;
    return true;
  }

  public getDamage(): number {
    return this.def.damage ?? 0;
  }

  public getHP(): number { return this.hp; }
  public getMaxHP(): number { return this.maxHp; }
  public isAlive(): boolean { return this.hp > 0 && this.currentState !== 'dead'; }
  public getDefinition(): EntityDefinition { return this.def; }
  public getPosition(): { x: number; y: number } { return { x: this.sprite.x, y: this.sprite.y }; }
  
  /** Resolve which bubble type to show based on current entity state */
  private resolveBubbleType(): BubbleType {
    if (this.currentState === 'dead') return 'dead';
    if (this.currentState === 'fainted') return 'dead';
    if (this.currentState === 'frozen') return 'confused';

    // ── Monster / animal bubbles ────────────────────────────────────────────
    if (this.def.type === 'monster') {
      // Peaceful animals (non-hostile monsters) use simplified states
      if (!this.isHostile) {
        // Animals just wander — show awake bubble when moving, sleepy when still
        return this.isMoving ? 'awake' : 'sleepy';
      }
      // Hostile monsters use full AI state
      return this.monsterAIState;
    }

    // ── NPC bubbles ─────────────────────────────────────────────────────────
    const id = this.def.id;
    if (id.includes('sick') || id.includes('ill') || id.includes('plague')) return 'sick';
    if (id.includes('sleep')) return 'sleeping';

    // NPCs with a dialogueKey get the talking bubble
    if (this.def.dialogueKey) return 'talking';

    // NPCs without dialogue show a question mark
    if (this.def.type === 'npc') return 'question';

    return 'silent';
  }

  /** Initial bubble setup after construction */
  private updateBubbleType(): void {
    if (!this.bubble) return;
    const type = this.resolveBubbleType();
    this.lastBubbleType = type;
    this.bubble.show(type);
  }

  public destroy(): void {
    this.moveTween?.stop();
    this.bubble?.destroy();
    this.sprite.destroy();
  }
}
