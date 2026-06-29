export class Camera {
  private x = 0;
  private y = 0;
  private zoom = 2.0; // 2x zoom for closer view like Pokémon

  constructor(
    private readonly worldWidth: number,
    private readonly worldHeight: number,
  ) {}

  follow(targetX: number, targetY: number, viewportWidth: number, viewportHeight: number): void {
    const scaledViewportWidth = viewportWidth / this.zoom;
    const scaledViewportHeight = viewportHeight / this.zoom;
    this.x = this.clamp(targetX - scaledViewportWidth / 2, 0, Math.max(0, this.worldWidth - scaledViewportWidth));
    this.y = this.clamp(targetY - scaledViewportHeight / 2, 0, Math.max(0, this.worldHeight - scaledViewportHeight));
  }

  worldToScreen(x: number, y: number): { x: number; y: number } {
    return { x: (x - this.x) * this.zoom, y: (y - this.y) * this.zoom };
  }

  screenToWorld(x: number, y: number): { x: number; y: number } {
    return { x: x / this.zoom + this.x, y: y / this.zoom + this.y };
  }

  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  getZoom(): number {
    return this.zoom;
  }

  setZoom(zoom: number): void {
    this.zoom = Math.max(0.5, Math.min(4, zoom)); // Clamp between 0.5x and 4x
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
