import { TILE_SIZE } from '../app/Config';
import { Camera } from './Camera';
import type { GameState } from '../state/StateTypes';
import { MapSystem, getTransitionOverlayAlpha } from '../systems/MapSystem';
import { LightSystem } from '../systems/LightSystem';
import { storyDatabase } from '../systems/StoryDatabase';
import { type SpriteRect, AssetManager } from './AssetManager';
import { AnimationPlayer, type Clip } from './Animation';

const RENDER_CLIPS: Record<string, Clip> = {
  player_idle: {
    frames: ['player_idle_0', 'player_idle_1'],
    frameDurationMs: 240,
    loop: true,
  },
};

export const resolveTileSpriteId = (def: { spriteId?: string }): string | null => def.spriteId ?? null;

export class Renderer {
  private readonly ctx: CanvasRenderingContext2D;
  private cssWidth = 0;
  private cssHeight = 0;
  private dpr = 1;
  private readonly showGrid = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  private showLightOverlay = false;
  private showPerfHud = true;
  private frameDtMs = 0;
  private frameAvgMs = 0;
  private lastRenderAt = performance.now();
  private visibleTiles = 0;
  private readonly viewportRange = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  private assetManager: AssetManager | null = null;
  private readonly playerAnimation = new AnimationPlayer(RENDER_CLIPS, 'player_idle');

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly camera: Camera,
    private readonly mapSystem: MapSystem,
    private readonly lightSystem: LightSystem,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not create canvas2D context.');
    this.ctx = ctx;
    this.resize();
    window.addEventListener('resize', this.resize);
  }

  setAssetManager(assetManager: AssetManager): void {
    this.assetManager = assetManager;
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
    this.ctx.imageSmoothingEnabled = false;
  };

  render(state: Readonly<GameState>, fps: number): void {
    const now = performance.now();
    this.frameDtMs = now - this.lastRenderAt;
    this.lastRenderAt = now;
    this.frameAvgMs = this.frameAvgMs <= 0 ? this.frameDtMs : this.frameAvgMs * 0.9 + this.frameDtMs * 0.1;

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.fillStyle = '#0b1020';
    this.ctx.fillRect(0, 0, this.cssWidth, this.cssHeight);

    if (state.runtime.mode === 'LOADING') {
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '24px monospace';
      this.ctx.fillText('Loading...', 24, 42);
      return;
    }

    this.camera.follow(state.runtime.player.px, state.runtime.player.py, this.cssWidth, this.cssHeight);
    this.computeViewportRange(state.runtime.map.currentMapId);

    this.drawMap(state, 'ground');
    this.drawMap(state, 'decor');
    this.drawMap(state, 'overlay');
    if (this.showLightOverlay) this.drawLightOverlay(state);
    this.drawShadows(state);
    this.drawNpcs(state);
    this.drawPlayer(state);
    if (this.showGrid) this.drawGrid();

    this.drawHud(state, fps);
    this.drawTransition(state);
    this.drawFaintOverlay(state);
    this.drawInteractButton();
    this.drawInventoryButton();
    this.drawModals(state);
    if (this.showGrid) this.drawSkipTimeButton();
  }

  setLightOverlayVisible(visible: boolean): void { this.showLightOverlay = visible; }
  setPerfHudVisible(visible: boolean): void { this.showPerfHud = visible; }

  private computeViewportRange(mapId: string): void {
    const map = this.mapSystem.getMap(mapId);
    const topLeft = this.camera.screenToWorld(0, 0);
    const bottomRight = this.camera.screenToWorld(this.cssWidth, this.cssHeight);
    this.viewportRange.minX = Math.max(0, Math.floor(topLeft.x / TILE_SIZE) - 1);
    this.viewportRange.minY = Math.max(0, Math.floor(topLeft.y / TILE_SIZE) - 1);
    this.viewportRange.maxX = Math.min(map.width - 1, Math.ceil(bottomRight.x / TILE_SIZE) + 1);
    this.viewportRange.maxY = Math.min(map.height - 1, Math.ceil(bottomRight.y / TILE_SIZE) + 1);
    this.visibleTiles = (this.viewportRange.maxX - this.viewportRange.minX + 1) * (this.viewportRange.maxY - this.viewportRange.minY + 1);
  }

  private drawMap(state: Readonly<GameState>, layer: 'ground' | 'decor' | 'overlay'): void {
    const map = this.mapSystem.getCurrentMap(state);
    const r = this.viewportRange;
    for (let y = r.minY; y <= r.maxY; y += 1) {
      for (let x = r.minX; x <= r.maxX; x += 1) {
        const tileId = this.mapSystem.getTileId(map.id, layer, x, y);
        if (layer !== 'ground' && tileId === 0) continue;
        const def = map.tilePalette[String(tileId)] ?? map.tilePalette['0'];
        const screen = this.camera.worldToScreen(x * TILE_SIZE, y * TILE_SIZE);
        const px = Math.round(screen.x);
        const py = Math.round(screen.y);
        const tileSpriteId = resolveTileSpriteId(def);
        if (!this.drawSprite(tileSpriteId, px, py)) {
          this.ctx.fillStyle = def.color;
          this.ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        }
      }
    }
  }

  private drawNpcs(state: Readonly<GameState>): void {
    const map = this.mapSystem.getCurrentMap(state);
    for (const npc of map.npcs ?? []) {
      const screen = this.camera.worldToScreen(npc.x * TILE_SIZE, npc.y * TILE_SIZE);
      this.drawSprite(npc.spriteId, Math.round(screen.x), Math.round(screen.y));
    }
  }

  private drawPlayer(state: Readonly<GameState>): void {
    this.playerAnimation.setClip('player_idle');
    this.playerAnimation.update(this.frameDtMs);
    const playerScreen = this.camera.worldToScreen(state.runtime.player.px, state.runtime.player.py);
    if (!this.drawSprite(this.playerAnimation.currentFrameSpriteId(), Math.round(playerScreen.x), Math.round(playerScreen.y))) {
      this.ctx.fillStyle = '#7ad7ff';
      this.ctx.fillRect(Math.round(playerScreen.x), Math.round(playerScreen.y), TILE_SIZE, TILE_SIZE);
    }
  }

  private drawShadows(state: Readonly<GameState>): void {
    for (const shadow of state.runtime.shadows.env) this.drawShadow(shadow.category, shadow.state, shadow.x, shadow.y);
    for (const shadow of state.runtime.shadows.story) this.drawShadow(shadow.category, shadow.state, shadow.x, shadow.y);
  }

  private drawShadow(category: 'environmental' | 'story', label: string, x: number, y: number): void {
    const screen = this.camera.worldToScreen(x * TILE_SIZE, y * TILE_SIZE);
    const px = Math.round(screen.x);
    const py = Math.round(screen.y);
    if (this.drawSprite('shadow_0', px, py)) return;
    this.ctx.fillStyle = category === 'story' ? 'rgba(20,20,30,0.65)' : 'rgba(5,5,12,0.55)';
    this.ctx.beginPath();
    this.ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, TILE_SIZE * 0.35, 0, Math.PI * 2);
    this.ctx.fill();
    if (this.showGrid) {
      this.ctx.fillStyle = '#d0d0d0';
      this.ctx.font = '10px monospace';
      this.ctx.fillText(label[0].toUpperCase(), px + 10, py + 19);
    }
  }

  private drawSprite(spriteId: string | null, screenX: number, screenY: number): boolean {
    if (!spriteId || !this.assetManager) return false;
    const image = this.assetManager.getImage();
    const rect = this.assetManager.getSpriteRect(spriteId);
    if (!image || !rect) return false;
    this.drawSpriteRect(image, rect, screenX, screenY);
    return true;
  }

  private drawSpriteRect(image: HTMLImageElement, rect: SpriteRect, x: number, y: number): void {
    this.ctx.drawImage(image, rect.x, rect.y, rect.w, rect.h, x, y, TILE_SIZE, TILE_SIZE);
  }

  private drawLightOverlay(state: Readonly<GameState>): void {
    const r = this.viewportRange;
    for (let y = r.minY; y <= r.maxY; y += 1) {
      for (let x = r.minX; x <= r.maxX; x += 1) {
        const level = this.lightSystem.getTileLightLevel(state, x, y);
        const alpha = level === 'DARK' ? 0.35 : level === 'DIM' ? 0.15 : 0;
        if (alpha <= 0) continue;
        const screen = this.camera.worldToScreen(x * TILE_SIZE, y * TILE_SIZE);
        this.ctx.fillStyle = alpha === 0.35 ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.15)';
        this.ctx.fillRect(Math.round(screen.x), Math.round(screen.y), TILE_SIZE, TILE_SIZE);
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
    if (!this.showPerfHud) return;
    const perf = this.lightSystem.getPerfCounters();
    this.ctx.fillText(`FPS: ${fps.toFixed(1)} dt: ${this.frameDtMs.toFixed(2)}ms avg: ${this.frameAvgMs.toFixed(2)}ms`, 16, 112);
    this.ctx.fillText(`Visible tiles: ${this.visibleTiles} lightChunkHit: ${(perf.hitRate * 100).toFixed(1)}%`, 16, 130);
  }

  private drawTransition(state: Readonly<GameState>): void {
    const alpha = getTransitionOverlayAlpha(state.runtime.map.transition);
    if (alpha <= 0) return;
    this.ctx.fillStyle = `rgba(0,0,0,${alpha.toFixed(3)})`;
    this.ctx.fillRect(0, 0, this.cssWidth, this.cssHeight);
  }

  private drawFaintOverlay(state: Readonly<GameState>): void {
    const faint = state.runtime.fainting;
    if (!faint?.active) return;
    const alpha = faint.phase === 'fadeIn' ? 1 - faint.t : faint.t;
    if (alpha <= 0) return;
    this.ctx.fillStyle = `rgba(0,0,0,${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;
    this.ctx.fillRect(0, 0, this.cssWidth, this.cssHeight);
  }

  private drawInteractButton(): void { this.drawBigButton(this.cssWidth - 96, this.cssHeight - 96, 78, 78, 'ACT'); }
  private drawInventoryButton(): void { this.drawBigButton(this.cssWidth - 230, this.cssHeight - 82, 110, 56, 'BAG'); }

  private drawModals(state: Readonly<GameState>): void {
    if (state.runtime.mode === 'DIALOGUE') return this.drawDialogueModal(state);
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
    const bx = this.cssWidth / 2 - 170;
    this.drawBigButton(bx, this.cssHeight - 180, 340, 60, state.runtime.mode === 'INVENTORY' ? 'Use selected' : 'Mix');
    this.drawBigButton(bx, this.cssHeight - 110, 340, 60, 'Close');
  }

  private drawDialogueModal(state: Readonly<GameState>): void {
    const runtime = state.runtime.dialogue;
    const sceneDb = storyDatabase.getSceneDatabase(runtime.storyId);
    const node = sceneDb?.getNode(runtime.sceneId);
    this.ctx.fillStyle = 'rgba(5,10,18,0.86)';
    this.ctx.fillRect(70, this.cssHeight - 340, this.cssWidth - 140, 300);
    this.ctx.strokeStyle = '#cbe8ff';
    this.ctx.strokeRect(70, this.cssHeight - 340, this.cssWidth - 140, 300);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '20px sans-serif';
    const lines = !node ? ['Dialogue unavailable.'] : (Array.isArray(node.text) ? node.text : [node.text]);
    lines.slice(0, 2).forEach((line, idx) => this.ctx.fillText(line, 100, this.cssHeight - 300 + idx * 26));
    const choices = node?.choices ?? [{ label: 'Return', next: 'returnToMap' }];
    choices.slice(0, 4).forEach((choice, idx) => this.drawBigButton(100, this.cssHeight - 220 + idx * 62, this.cssWidth - 200, 52, choice.label));
  }

  private drawBigButton(x: number, y: number, w: number, h: number, text: string): void {
    this.ctx.fillStyle = 'rgba(82,194,255,0.25)';
    this.ctx.fillRect(x, y, w, h);
    this.ctx.strokeStyle = '#8fdcff';
    this.ctx.strokeRect(x, y, w, h);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '20px sans-serif';
    this.ctx.fillText(text, x + 20, y + h / 2 + 7);
  }

  private drawSkipTimeButton(): void {
    const x = this.cssWidth - 104;
    const y = 16;
    this.drawBigButton(x, y, 88, 30, 'Skip');
  }

  private drawGrid(): void {
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    this.ctx.lineWidth = 1;
    for (let x = 0; x < this.cssWidth; x += TILE_SIZE) { this.ctx.beginPath(); this.ctx.moveTo(x + 0.5, 0); this.ctx.lineTo(x + 0.5, this.cssHeight); this.ctx.stroke(); }
    for (let y = 0; y < this.cssHeight; y += TILE_SIZE) { this.ctx.beginPath(); this.ctx.moveTo(0, y + 0.5); this.ctx.lineTo(this.cssWidth, y + 0.5); this.ctx.stroke(); }
    this.ctx.restore();
  }
}
