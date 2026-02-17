export class Camera {
  private x = 0;
  private y = 0;

  constructor(
    private readonly worldWidth: number,
    private readonly worldHeight: number,
  ) {}

  follow(targetX: number, targetY: number, viewportWidth: number, viewportHeight: number): void {
    this.x = this.clamp(targetX - viewportWidth / 2, 0, Math.max(0, this.worldWidth - viewportWidth));
    this.y = this.clamp(targetY - viewportHeight / 2, 0, Math.max(0, this.worldHeight - viewportHeight));
  }

  worldToScreen(x: number, y: number): { x: number; y: number } {
    return { x: x - this.x, y: y - this.y };
  }

  screenToWorld(x: number, y: number): { x: number; y: number } {
    return { x: x + this.x, y: y + this.y };
  }

  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
