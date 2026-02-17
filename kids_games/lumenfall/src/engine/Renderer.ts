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
  // private showPerfHud = true; // Unused - removed debug HUD
  private frameDtMs = 0;
  private frameAvgMs = 0;
  private lastRenderAt = performance.now();
  // private visibleTiles = 0; // Unused - removed debug HUD
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
    this.drawIngredients(state);
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
  setPerfHudVisible(_visible: boolean): void { /* this.showPerfHud = visible; */ }

  private computeViewportRange(mapId: string): void {
    const map = this.mapSystem.getMap(mapId);
    const topLeft = this.camera.screenToWorld(0, 0);
    const bottomRight = this.camera.screenToWorld(this.cssWidth, this.cssHeight);
    this.viewportRange.minX = Math.max(0, Math.floor(topLeft.x / TILE_SIZE) - 1);
    this.viewportRange.minY = Math.max(0, Math.floor(topLeft.y / TILE_SIZE) - 1);
    this.viewportRange.maxX = Math.min(map.width - 1, Math.ceil(bottomRight.x / TILE_SIZE) + 1);
    this.viewportRange.maxY = Math.min(map.height - 1, Math.ceil(bottomRight.y / TILE_SIZE) + 1);
    // this.visibleTiles = (this.viewportRange.maxX - this.viewportRange.minX + 1) * (this.viewportRange.maxY - this.viewportRange.minY + 1);
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

  private drawIngredients(state: Readonly<GameState>): void {
    const pickups = state.runtime.ingredientPickups || [];
    const zoom = this.camera.getZoom();
    const tileSize = TILE_SIZE * zoom;
    
    for (const pickup of pickups) {
      const screen = this.camera.worldToScreen(pickup.x * TILE_SIZE, pickup.y * TILE_SIZE);
      
      // Draw sparkle sprite if available, otherwise draw a glowing circle
      if (!this.drawSprite('sparkle', Math.round(screen.x), Math.round(screen.y))) {
        // Fallback: draw glowing circle
        this.ctx.save();
        this.ctx.fillStyle = '#ffff88';
        this.ctx.shadowColor = '#ffff00';
        this.ctx.shadowBlur = 10;
        this.ctx.beginPath();
        this.ctx.arc(
          Math.round(screen.x) + tileSize / 2,
          Math.round(screen.y) + tileSize / 2,
          tileSize * 0.3,
          0,
          Math.PI * 2
        );
        this.ctx.fill();
        this.ctx.restore();
      }
    }
  }

  private drawNpcs(state: Readonly<GameState>): void {
    const map = this.mapSystem.getCurrentMap(state);
    const zoom = this.camera.getZoom();
    const charWidth = TILE_SIZE;
    const charHeight = TILE_SIZE * 1.5;
    // Offset needs to account for zoom since screen coords are already zoomed
    const offsetY = -(charHeight - TILE_SIZE) * zoom;
    for (const npc of map.npcs ?? []) {
      const screen = this.camera.worldToScreen(npc.x * TILE_SIZE, npc.y * TILE_SIZE);
      this.drawSprite(npc.spriteId, Math.round(screen.x), Math.round(screen.y + offsetY), charWidth, charHeight);
    }
  }

  private drawPlayer(state: Readonly<GameState>): void {
    this.playerAnimation.setClip('player_idle');
    this.playerAnimation.update(this.frameDtMs);
    const playerScreen = this.camera.worldToScreen(state.runtime.player.px, state.runtime.player.py);
    // Character sprites are 1.5x taller than tiles (48 pixels tall vs 32 wide)
    const zoom = this.camera.getZoom();
    const charWidth = TILE_SIZE;
    const charHeight = TILE_SIZE * 1.5;
    // Offset needs to account for zoom since screen coords are already zoomed
    const offsetY = -(charHeight - TILE_SIZE) * zoom;
    if (!this.drawSprite(this.playerAnimation.currentFrameSpriteId(), Math.round(playerScreen.x), Math.round(playerScreen.y + offsetY), charWidth, charHeight)) {
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

  private drawSprite(spriteId: string | null, screenX: number, screenY: number, width?: number, height?: number): boolean {
    if (!spriteId || !this.assetManager) return false;
    const image = this.assetManager.getImage();
    const rect = this.assetManager.getSpriteRect(spriteId);
    if (!image || !rect) return false;
    this.drawSpriteRect(image, rect, screenX, screenY, width, height);
    return true;
  }

  private drawSpriteRect(image: HTMLImageElement, rect: SpriteRect, x: number, y: number, width?: number, height?: number): void {
    const zoom = this.camera.getZoom();
    const w = (width ?? TILE_SIZE) * zoom;
    const h = (height ?? TILE_SIZE) * zoom;
    this.ctx.drawImage(image, rect.x, rect.y, rect.w, rect.h, x, y, w, h);
  }

  private drawLightOverlay(state: Readonly<GameState>): void {
    const r = this.viewportRange;
    const zoom = this.camera.getZoom();
    const tileSize = TILE_SIZE * zoom;
    for (let y = r.minY; y <= r.maxY; y += 1) {
      for (let x = r.minX; x <= r.maxX; x += 1) {
        const level = this.lightSystem.getTileLightLevel(state, x, y);
        const alpha = level === 'DARK' ? 0.35 : level === 'DIM' ? 0.15 : 0;
        if (alpha <= 0) continue;
        const screen = this.camera.worldToScreen(x * TILE_SIZE, y * TILE_SIZE);
        this.ctx.fillStyle = alpha === 0.35 ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.15)';
        this.ctx.fillRect(Math.round(screen.x), Math.round(screen.y), tileSize, tileSize);
      }
    }
  }

  private drawHud(state: Readonly<GameState>, _fps: number): void {
    // Draw black background bar at top
    const hudHeight = 60;
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(0, 0, this.cssWidth, hudHeight);
    
    const padding = 16;
    const barWidth = 150;
    const barHeight = 16;
    let yPos = 12;
    
    // HP Bar
    const currentHP = state.runtime.player.hp;
    const maxHP = state.global.player.maxHP;
    const hpPercent = currentHP / maxHP;
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 14px sans-serif';
    this.ctx.fillText('HP', padding, yPos + 12);
    
    // HP bar background
    this.ctx.fillStyle = '#333333';
    this.ctx.fillRect(padding + 35, yPos, barWidth, barHeight);
    
    // HP bar fill
    this.ctx.fillStyle = hpPercent > 0.5 ? '#4CAF50' : hpPercent > 0.25 ? '#FFC107' : '#F44336';
    this.ctx.fillRect(padding + 35, yPos, barWidth * hpPercent, barHeight);
    
    // HP text
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '12px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`${currentHP}/${maxHP}`, padding + 35 + barWidth / 2, yPos + 12);
    this.ctx.textAlign = 'left';
    
    yPos += 24;
    
    // SP Bar
    const currentSP = state.runtime.player.sp;
    const maxSP = state.global.player.maxSP;
    const spPercent = currentSP / maxSP;
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 14px sans-serif';
    this.ctx.fillText('SP', padding, yPos + 12);
    
    // SP bar background
    this.ctx.fillStyle = '#333333';
    this.ctx.fillRect(padding + 35, yPos, barWidth, barHeight);
    
    // SP bar fill
    this.ctx.fillStyle = '#2196F3';
    this.ctx.fillRect(padding + 35, yPos, barWidth * spPercent, barHeight);
    
    // SP text
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '12px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`${currentSP}/${maxSP}`, padding + 35 + barWidth / 2, yPos + 12);
    this.ctx.textAlign = 'left';
    
    // Time/Phase display (right side of HUD)
    const phaseText = state.runtime.time.phase;
    const phaseColor = phaseText === 'DAY' ? '#FFD700' : phaseText === 'NIGHT' ? '#4A4A8C' : '#FF8C00';
    
    this.ctx.fillStyle = phaseColor;
    this.ctx.font = 'bold 18px sans-serif';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(phaseText, this.cssWidth - padding - 160, 28);
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '14px sans-serif';
    this.ctx.fillText(`Day ${state.runtime.time.dayCount}`, this.cssWidth - padding - 160, 48);
    this.ctx.textAlign = 'left';
    
    // Draw minimap
    this.drawMinimap(state);
  }

  private drawMinimap(state: Readonly<GameState>): void {
    const minimapSize = 150;
    const minimapX = this.cssWidth - minimapSize - 16;
    const minimapY = 16;
    const map = this.mapSystem.getCurrentMap(state);
    const mapWidth = map.width;
    const mapHeight = map.height;
    const scale = Math.min(minimapSize / mapWidth, minimapSize / mapHeight);
    
    // Background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    this.ctx.fillRect(minimapX - 4, minimapY - 4, minimapSize + 8, minimapSize + 8);
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(minimapX - 4, minimapY - 4, minimapSize + 8, minimapSize + 8);
    
    // Draw simplified map tiles
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const groundLayer = map.layers?.ground;
        if (!groundLayer || !Array.isArray(groundLayer)) continue;
        const row = groundLayer[y];
        if (!row || !Array.isArray(row)) continue;
        const tile = row[x];
        if (!tile) continue;
        const spriteId = resolveTileSpriteId(tile);
        let color = '#404040';
        if (spriteId?.includes('grass')) color = '#3a8f3a';
        else if (spriteId?.includes('dirt')) color = '#8b5a2b';
        else if (spriteId?.includes('stone')) color = '#808080';
        else if (spriteId?.includes('water')) color = '#4a90e2';
        this.ctx.fillStyle = color;
        this.ctx.fillRect(
          minimapX + x * scale,
          minimapY + y * scale,
          Math.ceil(scale),
          Math.ceil(scale)
        );
      }
    }
    
    // Draw player position
    const playerMinimapX = minimapX + state.runtime.player.x * scale;
    const playerMinimapY = minimapY + state.runtime.player.y * scale;
    this.ctx.fillStyle = '#ffff00';
    this.ctx.beginPath();
    this.ctx.arc(playerMinimapX + scale / 2, playerMinimapY + scale / 2, 3, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Draw NPCs
    this.ctx.fillStyle = '#ff6600';
    for (const npc of map.npcs ?? []) {
      this.ctx.beginPath();
      this.ctx.arc(
        minimapX + npc.x * scale + scale / 2,
        minimapY + npc.y * scale + scale / 2,
        2,
        0,
        Math.PI * 2
      );
      this.ctx.fill();
    }
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

  private drawInteractButton(): void { 
    // Make buttons consistent size: 80x80
    this.drawBigButton(this.cssWidth - 96, this.cssHeight - 96, 80, 80, 'ACT'); 
  }
  
  private drawInventoryButton(): void { 
    // Make buttons consistent size: 80x80
    this.drawBigButton(this.cssWidth - 200, this.cssHeight - 96, 80, 80, 'BAG'); 
  }

  private drawModals(state: Readonly<GameState>): void {
    if (state.runtime.mode === 'DIALOGUE') return this.drawDialogueModal(state);
    if (state.runtime.mode !== 'INVENTORY' && state.runtime.mode !== 'CRAFTING') return;
    
    // Full-screen semi-transparent overlay
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.cssWidth, this.cssHeight);
    
    // Centered modal box
    const modalWidth = Math.min(600, this.cssWidth - 100);
    const modalHeight = Math.min(500, this.cssHeight - 100);
    const modalX = (this.cssWidth - modalWidth) / 2;
    const modalY = (this.cssHeight - modalHeight) / 2;
    
    // Modal background
    this.ctx.fillStyle = 'rgba(20, 30, 40, 0.95)';
    this.ctx.fillRect(modalX, modalY, modalWidth, modalHeight);
    this.ctx.strokeStyle = '#52c2ff';
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(modalX, modalY, modalWidth, modalHeight);
    
    // Title
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 28px sans-serif';
    const title = state.runtime.mode === 'INVENTORY' ? 'Inventory' : 'Mixing Table';
    this.ctx.fillText(title, modalX + 30, modalY + 50);
    
    // Items list
    const items = Object.entries(state.global.inventory.items).filter(([, v]) => v.qty > 0);
    this.ctx.font = '20px sans-serif';
    
    if (items.length === 0) {
      this.ctx.fillStyle = '#999';
      this.ctx.fillText('No items', modalX + 30, modalY + 120);
    } else {
      items.slice(0, 8).forEach(([id, stack], idx) => {
        const y = modalY + 100 + idx * 40;
        const selected = state.runtime.inventoryUI.selectedItemId === id || state.runtime.crafting.slotA === id || state.runtime.crafting.slotB === id;
        
        // Selection highlight
        if (selected) {
          this.ctx.fillStyle = 'rgba(82, 194, 255, 0.3)';
          this.ctx.fillRect(modalX + 20, y - 25, modalWidth - 40, 35);
        }
        
        // Item name
        this.ctx.fillStyle = selected ? '#52c2ff' : '#ffffff';
        const itemName = id.replace(/ingredient_|potion_/g, '').replace(/_/g, ' ');
        this.ctx.fillText(`${itemName} x${stack.qty}`, modalX + 30, y);
      });
    }
    
    // Buttons at bottom
    const buttonY = modalY + modalHeight - 140;
    this.drawBigButton(modalX + 30, buttonY, modalWidth - 60, 50, state.runtime.mode === 'INVENTORY' ? 'Use selected' : 'Mix');
    this.drawBigButton(modalX + 30, buttonY + 70, modalWidth - 60, 50, 'Close');
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
    const zoom = this.camera.getZoom();
    const tileSize = TILE_SIZE * zoom;
    for (let x = 0; x < this.cssWidth; x += tileSize) { this.ctx.beginPath(); this.ctx.moveTo(x + 0.5, 0); this.ctx.lineTo(x + 0.5, this.cssHeight); this.ctx.stroke(); }
    for (let y = 0; y < this.cssHeight; y += tileSize) { this.ctx.beginPath(); this.ctx.moveTo(0, y + 0.5); this.ctx.lineTo(this.cssWidth, y + 0.5); this.ctx.stroke(); }
    this.ctx.restore();
  }
}
