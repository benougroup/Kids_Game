import { TILE_SIZE } from '../app/Config';
import { Camera } from './Camera';
import type { GameState } from '../state/StateTypes';
import { MapSystem, getTransitionOverlayAlpha } from '../systems/MapSystem';
import { LightSystem } from '../systems/LightSystem';
import { storyDatabase } from '../systems/StoryDatabase';

export class Renderer {
  private readonly ctx: CanvasRenderingContext2D;
  private cssWidth = 0;
  private cssHeight = 0;
  private dpr = 1;
  private readonly showGrid = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  private showLightOverlay = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly camera: Camera,
    private readonly mapSystem: MapSystem,
    private readonly lightSystem: LightSystem,
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

    if (this.showLightOverlay) {
      this.drawLightOverlay(state);
    }

    if (this.showGrid) {
      this.drawGrid();
    }

    this.drawHud(state, fps);
    this.drawTransition(state);
    this.drawFaintOverlay(state);
    this.drawInteractButton();
    this.drawInventoryButton();
    this.drawModals(state);
    if (this.showGrid) {
      this.drawSkipTimeButton();
    }
  }


  setLightOverlayVisible(visible: boolean): void {
    this.showLightOverlay = visible;
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


  private drawLightOverlay(state: Readonly<GameState>): void {
    const map = this.mapSystem.getCurrentMap(state);
    const topLeft = this.camera.screenToWorld(0, 0);
    const bottomRight = this.camera.screenToWorld(this.cssWidth, this.cssHeight);

    const minX = Math.max(0, Math.floor(topLeft.x / TILE_SIZE) - 1);
    const minY = Math.max(0, Math.floor(topLeft.y / TILE_SIZE) - 1);
    const maxX = Math.min(map.width - 1, Math.ceil(bottomRight.x / TILE_SIZE) + 1);
    const maxY = Math.min(map.height - 1, Math.ceil(bottomRight.y / TILE_SIZE) + 1);

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const level = this.lightSystem.getTileLightLevel(state, x, y);
        const alpha = level === 'DARK' ? 0.35 : level === 'DIM' ? 0.15 : 0;
        if (alpha <= 0) continue;
        const screen = this.camera.worldToScreen(x * TILE_SIZE, y * TILE_SIZE);
        this.ctx.fillStyle = `rgba(0,0,0,${alpha.toFixed(3)})`;
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


  private drawFaintOverlay(state: Readonly<GameState>): void {
    const faint = state.runtime.fainting;
    if (!faint?.active) {
      return;
    }

    const alpha = faint.phase === 'fadeIn' ? 1 - faint.t : faint.t;
    if (alpha <= 0) {
      return;
    }

    this.ctx.fillStyle = `rgba(0,0,0,${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;
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


  private drawInventoryButton(): void {
    const w = 88;
    const h = 44;
    const x = this.cssWidth - 184;
    const y = this.cssHeight - 68;
    this.ctx.fillStyle = 'rgba(255,255,255,0.2)';
    this.ctx.fillRect(x, y, w, h);
    this.ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    this.ctx.strokeRect(x, y, w, h);
    this.ctx.fillStyle = 'white';
    this.ctx.font = '14px sans-serif';
    this.ctx.fillText('BAG', x + 24, y + 27);
  }

  private drawModals(state: Readonly<GameState>): void {
    if (state.runtime.mode === 'DIALOGUE') {
      this.drawDialogueModal(state);
      return;
    }

    if (state.runtime.mode !== 'INVENTORY' && state.runtime.mode !== 'CRAFTING') return;
    this.ctx.fillStyle = 'rgba(5,10,18,0.8)';
    this.ctx.fillRect(80, 80, this.cssWidth - 160, this.cssHeight - 160);
    this.ctx.strokeStyle = '#cbe8ff';
    this.ctx.strokeRect(80, 80, this.cssWidth - 160, this.cssHeight - 160);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '24px sans-serif';
    this.ctx.fillText(state.runtime.mode === 'INVENTORY' ? 'Inventory' : 'Mixing Table', 110, 120);

    const items = Object.entries(state.global.inventory.items).filter(([, v]) => v.qty > 0);
    this.ctx.font = '18px sans-serif';
    items.slice(0, 7).forEach(([id, stack], idx) => {
      const y = 160 + idx * 42;
      const selected = state.runtime.inventoryUI.selectedItemId === id || state.runtime.crafting.slotA === id || state.runtime.crafting.slotB === id;
      this.ctx.fillStyle = selected ? '#52c2ff' : '#ffffff';
      this.ctx.fillText(`${id.replace(/_/g, ' ')} x${stack.qty}`, 120, y);
    });

    const bx = this.cssWidth / 2 - 150;
    this.drawBigButton(bx, this.cssHeight - 170, 300, 50, state.runtime.mode === 'INVENTORY' ? 'Use selected' : 'Mix');
    this.drawBigButton(bx, this.cssHeight - 105, 300, 50, 'Close');
  }


  private drawDialogueModal(state: Readonly<GameState>): void {
    const runtime = state.runtime.dialogue;
    const sceneDb = storyDatabase.getSceneDatabase(runtime.storyId);
    const node = sceneDb?.getNode(runtime.sceneId);

    this.ctx.fillStyle = 'rgba(5,10,18,0.86)';
    this.ctx.fillRect(80, this.cssHeight - 320, this.cssWidth - 160, 280);
    this.ctx.strokeStyle = '#cbe8ff';
    this.ctx.strokeRect(80, this.cssHeight - 320, this.cssWidth - 160, 280);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '20px sans-serif';

    const lines = !node ? ['Dialogue unavailable.'] : (Array.isArray(node.text) ? node.text : [node.text]);
    lines.slice(0, 2).forEach((line, idx) => this.ctx.fillText(line, 110, this.cssHeight - 280 + idx * 26));

    const choices = node?.choices ?? [{ label: 'Return', next: 'returnToMap' }];
    choices.slice(0, 4).forEach((choice, idx) => {
      this.drawBigButton(110, this.cssHeight - 210 + idx * 52, this.cssWidth - 220, 42, choice.label);
    });
  }

  private drawBigButton(x: number, y: number, w: number, h: number, text: string): void {
    this.ctx.fillStyle = 'rgba(82,194,255,0.25)';
    this.ctx.fillRect(x, y, w, h);
    this.ctx.strokeStyle = '#8fdcff';
    this.ctx.strokeRect(x, y, w, h);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '20px sans-serif';
    this.ctx.fillText(text, x + 20, y + 32);
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
