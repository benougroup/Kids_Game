import { TILE_SIZE } from '../app/Config';
import { Camera } from './Camera';
import type { GameState } from '../state/StateTypes';
import { MapSystem, getTransitionOverlayAlpha } from '../systems/MapSystem';

export class Renderer {
  private readonly ctx: CanvasRenderingContext2D;
  private cssWidth = 0;
  private cssHeight = 0;
  private dpr = 1;
  private readonly showGrid = typeof window !== 'undefined' && window.location.hostname === 'localhost';

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly camera: Camera,
    private readonly mapSystem: MapSystem,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not create canvas2D context.');
    }
    this.ctx = ctx;
    this.resize();
    window.addEventListener('resize', this.resize);
  }

  readonly resize = (): void => {
    this.dpr = window.devicePixelRatio || 1;
    this.cssWidth = window.innerWidth;
    this.cssHeight = window.innerHeight;

    this.canvas.width = Math.floor(this.cssWidth * this.dpr);
    this.canvas.height = Math.floor(this.cssHeight * this.dpr);
    this.canvas.style.width = `${this.cssWidth}px`;
    this.canvas.style.height = `${this.cssHeight}px`;

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  };

  render(state: Readonly<GameState>, fps: number): void {
    this.ctx.fillStyle = '#0b1020';
    this.ctx.fillRect(0, 0, this.cssWidth, this.cssHeight);

    this.camera.follow(state.runtime.player.px, state.runtime.player.py, this.cssWidth, this.cssHeight);

    this.drawMap(state, 'ground');
    this.drawMap(state, 'decor');

    const playerScreen = this.camera.worldToScreen(state.runtime.player.px, state.runtime.player.py);
    this.ctx.fillStyle = '#7ad7ff';
    this.ctx.fillRect(playerScreen.x, playerScreen.y, TILE_SIZE, TILE_SIZE);

    this.drawMap(state, 'overlay');

    if (this.showGrid) {
      this.drawGrid();
    }

    this.drawHud(state, fps);
    this.drawTransition(state);
    this.drawInteractButton();
    if (this.showGrid) {
      this.drawSkipTimeButton();
    }
  }

  getViewportSize(): { width: number; height: number } {
    return { width: this.cssWidth, height: this.cssHeight };
  }

  private drawMap(state: Readonly<GameState>, layer: 'ground' | 'decor' | 'overlay'): void {
    const map = this.mapSystem.getCurrentMap(state);
    const topLeft = this.camera.screenToWorld(0, 0);
    const bottomRight = this.camera.screenToWorld(this.cssWidth, this.cssHeight);

    const minX = Math.max(0, Math.floor(topLeft.x / TILE_SIZE) - 1);
    const minY = Math.max(0, Math.floor(topLeft.y / TILE_SIZE) - 1);
    const maxX = Math.min(map.width - 1, Math.ceil(bottomRight.x / TILE_SIZE) + 1);
    const maxY = Math.min(map.height - 1, Math.ceil(bottomRight.y / TILE_SIZE) + 1);

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const tileId = this.mapSystem.getTileId(map.id, layer, x, y);
        if (layer !== 'ground' && tileId === 0) continue;
        const def = map.tilePalette[String(tileId)] ?? map.tilePalette['0'];
        const screen = this.camera.worldToScreen(x * TILE_SIZE, y * TILE_SIZE);
        this.ctx.fillStyle = def.color;
        this.ctx.fillRect(screen.x, screen.y, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  private drawHud(state: Readonly<GameState>, fps: number): void {
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '14px monospace';
    this.ctx.fillText(`Mode: ${state.runtime.mode}`, 16, 22);
    this.ctx.fillText(`Time: ${state.runtime.time.phase} @ ${Math.round(state.runtime.time.secondsIntoCycle)}s`, 16, 40);
    this.ctx.fillText(`Day: ${state.runtime.time.dayCount} Paused: ${state.runtime.time.paused ? 'yes' : 'no'}`, 16, 58);
    this.ctx.fillText(`Map: ${state.runtime.map.currentMapId}`, 16, 76);
    this.ctx.fillText(`Tile: (${state.runtime.player.x}, ${state.runtime.player.y})`, 16, 94);
    this.ctx.fillText(`FPS: ${fps.toFixed(1)} DPR: ${this.dpr.toFixed(2)}`, 16, 112);
  }

  private drawTransition(state: Readonly<GameState>): void {
    const alpha = getTransitionOverlayAlpha(state.runtime.map.transition);
    if (alpha <= 0) return;
    this.ctx.fillStyle = `rgba(0,0,0,${alpha.toFixed(3)})`;
    this.ctx.fillRect(0, 0, this.cssWidth, this.cssHeight);
  }

  private drawInteractButton(): void {
    const size = 64;
    const margin = 16;
    const x = this.cssWidth - margin - size;
    const y = this.cssHeight - margin - size;
    this.ctx.fillStyle = 'rgba(255,255,255,0.2)';
    this.ctx.fillRect(x, y, size, size);
    this.ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    this.ctx.strokeRect(x, y, size, size);
    this.ctx.fillStyle = 'white';
    this.ctx.font = '12px sans-serif';
    this.ctx.fillText('ACT', x + 18, y + 36);
  }

  private drawSkipTimeButton(): void {
    const buttonWidth = 88;
    const buttonHeight = 30;
    const margin = 16;
    const x = this.cssWidth - margin - buttonWidth;
    const y = margin;
    this.ctx.fillStyle = 'rgba(82, 194, 255, 0.2)';
    this.ctx.fillRect(x, y, buttonWidth, buttonHeight);
    this.ctx.strokeStyle = 'rgba(82, 194, 255, 0.85)';
    this.ctx.strokeRect(x, y, buttonWidth, buttonHeight);
    this.ctx.fillStyle = '#d3f2ff';
    this.ctx.font = '11px sans-serif';
    this.ctx.fillText('Skip Time', x + 16, y + 19);
  }

  private drawGrid(): void {
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    this.ctx.lineWidth = 1;
    for (let x = 0; x < this.cssWidth; x += TILE_SIZE) {
      this.ctx.beginPath();
      this.ctx.moveTo(x + 0.5, 0);
      this.ctx.lineTo(x + 0.5, this.cssHeight);
      this.ctx.stroke();
    }

    for (let y = 0; y < this.cssHeight; y += TILE_SIZE) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y + 0.5);
      this.ctx.lineTo(this.cssWidth, y + 0.5);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }
}
