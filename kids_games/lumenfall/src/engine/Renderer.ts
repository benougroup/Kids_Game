import { TILE_SIZE } from '../app/Config';
import { Camera } from './Camera';
import type { GameState } from '../state/StateTypes';

export class Renderer {
  private readonly ctx: CanvasRenderingContext2D;
  private cssWidth = 0;
  private cssHeight = 0;
  private dpr = 1;
  private readonly showGrid = typeof window !== 'undefined' && window.location.hostname === 'localhost';

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly camera: Camera,
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

    if (this.showGrid) {
      this.drawGrid();
    }

    this.camera.follow(state.runtime.player.px, state.runtime.player.py, this.cssWidth, this.cssHeight);
    const playerScreen = this.camera.worldToScreen(state.runtime.player.px, state.runtime.player.py);

    this.ctx.fillStyle = '#7ad7ff';
    this.ctx.fillRect(playerScreen.x, playerScreen.y, TILE_SIZE, TILE_SIZE);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '14px monospace';
    this.ctx.fillText(`Mode: ${state.runtime.mode}`, 16, 22);
    this.ctx.fillText(`FPS: ${fps.toFixed(1)} DPR: ${this.dpr.toFixed(2)}`, 16, 40);
  }

  getViewportSize(): { width: number; height: number } {
    return { width: this.cssWidth, height: this.cssHeight };
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
