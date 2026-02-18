import Phaser from 'phaser';

/**
 * Shadow Monster - Enemy that creates grey areas and shrinks in light
 * - Walks around randomly
 * - Creates darkness/grey overlay around it
 * - Shrinks when light hits it
 * - Avoids light sources (player's lantern, torches, etc.)
 */
export class ShadowMonster {
  public sprite: Phaser.Physics.Arcade.Sprite;
  // private scene: Phaser.Scene; // Unused for now
  private speed: number = 40; // Slower than player
  private darkOverlay: Phaser.GameObjects.Graphics;
  private baseSize: number = 36;
  private currentScale: number = 1.1;
  private wanderTimer: number = 0;
  private wanderDirection: { x: number; y: number } = { x: 0, y: 0 };
  private avoidLightRadius: number = 120; // Distance to avoid light sources
  private lastDamageTime: number = 0; // Track when last damaged player

  constructor(scene: Phaser.Scene, x: number, y: number) {
    // this.scene = scene; // Unused for now

    // Create shadow sprite from monsters atlas
    this.sprite = scene.physics.add.sprite(x, y, 'monsters', 'shadow_idle_front');
    this.sprite.setDisplaySize(this.baseSize, this.baseSize); // ~1.1 cells
    this.sprite.setOrigin(0.5, 0.5); // Center anchor
    this.sprite.setAlpha(0.8); // Semi-transparent
    this.sprite.setDepth(600);

    // Create dark overlay (grey area around monster)
    this.darkOverlay = scene.add.graphics();
    this.darkOverlay.setDepth(590);

    // Random initial wander direction
    this.pickNewWanderDirection();
  }

  update(_playerPos: { x: number; y: number }, lightSources: { x: number; y: number; radius: number }[]): void {
    // Update wander behavior
    this.updateWander();

    // Check for nearby light sources
    const nearestLight = this.findNearestLight(lightSources);
    
    if (nearestLight) {
      const distance = Phaser.Math.Distance.Between(
        this.sprite.x,
        this.sprite.y,
        nearestLight.x,
        nearestLight.y
      );

      // Shrink when in light
      if (distance < nearestLight.radius) {
        const shrinkFactor = 1 - (nearestLight.radius - distance) / nearestLight.radius;
        this.currentScale = Math.max(0.8, shrinkFactor);
        
        // Flee from light
        this.fleeFromLight(nearestLight);
      } else if (distance < this.avoidLightRadius) {
        // Avoid getting too close to light
        this.avoidLight(nearestLight);
      } else {
        // Return to normal size
        this.currentScale = Phaser.Math.Linear(this.currentScale, 1.1, 0.05);
      }
    } else {
      // No light nearby, return to normal
      this.currentScale = Phaser.Math.Linear(this.currentScale, 1.1, 0.05);
    }

    // Apply size (avoid setScale to prevent giant frame scaling)
    const size = this.baseSize * this.currentScale;
    this.sprite.setDisplaySize(size, size);

    // Update dark overlay
    this.updateDarkOverlay();

    // Flip sprite based on movement direction
    if (this.sprite.body && this.sprite.body.velocity.x < 0) {
      this.sprite.setFlipX(true);
    } else if (this.sprite.body && this.sprite.body.velocity.x > 0) {
      this.sprite.setFlipX(false);
    }
  }

  private updateWander(): void {
    this.wanderTimer -= 1;

    if (this.wanderTimer <= 0) {
      // Pick new direction every 2-4 seconds
      this.pickNewWanderDirection();
      this.wanderTimer = Phaser.Math.Between(120, 240); // 60 fps * 2-4 seconds
    }

    // Apply wander velocity
    this.sprite.setVelocity(
      this.wanderDirection.x * this.speed,
      this.wanderDirection.y * this.speed
    );
  }

  private pickNewWanderDirection(): void {
    // Random direction (including standing still)
    if (Math.random() < 0.3) {
      // 30% chance to stand still
      this.wanderDirection = { x: 0, y: 0 };
    } else {
      // Random 8-direction movement
      const angle = Math.random() * Math.PI * 2;
      this.wanderDirection = {
        x: Math.cos(angle),
        y: Math.sin(angle),
      };
    }
  }

  private findNearestLight(lightSources: { x: number; y: number; radius: number }[]): { x: number; y: number; radius: number } | null {
    if (lightSources.length === 0) return null;

    let nearest = lightSources[0];
    let minDistance = Phaser.Math.Distance.Between(
      this.sprite.x,
      this.sprite.y,
      nearest.x,
      nearest.y
    );

    for (let i = 1; i < lightSources.length; i++) {
      const distance = Phaser.Math.Distance.Between(
        this.sprite.x,
        this.sprite.y,
        lightSources[i].x,
        lightSources[i].y
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearest = lightSources[i];
      }
    }

    return nearest;
  }

  private fleeFromLight(light: { x: number; y: number; radius: number }): void {
    // Run away from light source
    const angle = Phaser.Math.Angle.Between(light.x, light.y, this.sprite.x, this.sprite.y);
    this.sprite.setVelocity(
      Math.cos(angle) * this.speed * 2, // Faster when fleeing
      Math.sin(angle) * this.speed * 2
    );
    this.wanderTimer = 60; // Reset wander timer
  }

  private avoidLight(light: { x: number; y: number; radius: number }): void {
    // Steer away from light
    const angle = Phaser.Math.Angle.Between(light.x, light.y, this.sprite.x, this.sprite.y);
    const avoidStrength = 0.3;
    
    this.wanderDirection.x += Math.cos(angle) * avoidStrength;
    this.wanderDirection.y += Math.sin(angle) * avoidStrength;

    // Normalize
    const length = Math.sqrt(
      this.wanderDirection.x * this.wanderDirection.x +
      this.wanderDirection.y * this.wanderDirection.y
    );
    if (length > 0) {
      this.wanderDirection.x /= length;
      this.wanderDirection.y /= length;
    }
  }

  private updateDarkOverlay(): void {
    this.darkOverlay.clear();

    // Draw grey circle around monster (smaller to match 1 cell)
    const radius = 20 * this.currentScale; // Keep shadow near 1-1.5 cell size
    this.darkOverlay.fillStyle(0x000000, 0.22);
    this.darkOverlay.fillCircle(this.sprite.x, this.sprite.y, radius);
  }

  destroy(): void {
    this.sprite.destroy();
    this.darkOverlay.destroy();
  }

  getLastDamageTime(): number {
    return this.lastDamageTime;
  }

  setLastDamageTime(time: number): void {
    this.lastDamageTime = time;
  }

  getPosition(): { x: number; y: number } {
    return { x: this.sprite.x, y: this.sprite.y };
  }
}
