import { TILE_SIZE } from '../app/Config';
import type { Command } from '../app/Commands';
import type { Mode } from '../app/ModeMachine';
import type { GameState } from '../state/StateTypes';
import { Camera } from './Camera';

interface InputFrame {
  moveDx: number;
  moveDy: number;
  interactPressed: boolean;
  commands: Command[];
}

export class Input {
  private readonly state = {
    moveDx: 0,
    moveDy: 0,
    interactPressed: false,
  };
  private readonly commands: Command[] = [];
  private touchTarget: { x: number; y: number } | null = null;
  private readonly isDevMode = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  private latestState: Readonly<GameState> | null = null;
  private lastTouchStartMs = 0;

  constructor(private readonly canvas: HTMLCanvasElement, private readonly camera: Camera) {
    window.addEventListener('keydown', this.onKeyDown);
    canvas.addEventListener('pointerdown', this.onPointerDown, { passive: false });
    canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
  }

  poll(mode: Mode, playerTileX: number, playerTileY: number, state: Readonly<GameState>): InputFrame {
    this.latestState = state;
    const frameCommands = this.commands.splice(0, this.commands.length);

    if (mode !== 'EXPLORE') {
      this.state.moveDx = 0;
      this.state.moveDy = 0;
      this.touchTarget = null;
      this.state.interactPressed = false;
      return { moveDx: 0, moveDy: 0, interactPressed: false, commands: frameCommands };
    }

    if (this.touchTarget) {
      const dx = this.touchTarget.x - playerTileX;
      const dy = this.touchTarget.y - playerTileY;
      if (dx === 0 && dy === 0) this.touchTarget = null;
      else if (Math.abs(dx) > Math.abs(dy)) {
        this.state.moveDx = Math.sign(dx);
        this.state.moveDy = 0;
      } else {
        this.state.moveDx = 0;
        this.state.moveDy = Math.sign(dy);
      }
    }

    const frame: InputFrame = {
      moveDx: this.state.moveDx,
      moveDy: this.state.moveDy,
      interactPressed: this.state.interactPressed,
      commands: frameCommands,
    };
    this.state.moveDx = 0;
    this.state.moveDy = 0;
    this.state.interactPressed = false;
    return frame;
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();

    if (key === 'i') {
      this.commands.push({ kind: 'ToggleInventory' });
      return;
    }
    if (key === 'u') {
      this.commands.push({ kind: 'InventoryUseSelected' });
      return;
    }
    if (key === 'x') {
      this.commands.push({ kind: 'CraftingMix' });
      return;
    }

    if (key === '1') {
      this.commands.push({ kind: 'DialogueChoose', choiceIndex: 0 });
      return;
    }
    if (key === '2') {
      this.commands.push({ kind: 'DialogueChoose', choiceIndex: 1 });
      return;
    }
    if (key === '3') {
      this.commands.push({ kind: 'DialogueChoose', choiceIndex: 2 });
      return;
    }
    if (key === '4') {
      this.commands.push({ kind: 'DialogueChoose', choiceIndex: 3 });
      return;
    }
    if (key === 'escape') {
      this.commands.push({ kind: 'RequestMode', nextMode: 'MENU' });
      return;
    }
    if (key === 'm') {
      this.commands.push({ kind: 'RequestMode', nextMode: 'EXPLORE' });
      return;
    }
    if (key === 'h') {
      this.commands.push({ kind: 'TogglePerfHud' });
      return;
    }
    if (key === 't' && this.isDevMode) {
      this.commands.push({ kind: 'StartScene', storyId: 'demo', sceneId: 'demo_start' });
      return;
    }
    if (key === 'j' && this.isDevMode) {
      this.commands.push({ kind: 'DebugSkipTime', seconds: 30 });
      return;
    }
    if (key === 'o') {
      this.commands.push({ kind: 'SaveNow' });
      return;
    }
    if (key === 'l') {
      this.commands.push({ kind: 'LoadNow' });
      return;
    }
    if (key === 'n') {
      this.commands.push({ kind: 'NewGame' });
      return;
    }
    if (key === 'r') {
      this.commands.push({ kind: 'NewStory', storyId: 'demo' });
      return;
    }
    if (key === ';' && this.isDevMode) {
      this.commands.push({ kind: 'DebugToggleLightOverlay' });
      return;
    }
    if (key === 'k' && this.isDevMode) {
      this.commands.push({ kind: 'DebugDamage', amount: 2, source: 'debug_key_k' });
      return;
    }
    if (key === 'p' && this.isDevMode) {
      this.commands.push({ kind: 'DebugCheckpoint' });
      return;
    }
    if (key === ' ' || key === 'enter') {
      this.state.interactPressed = true;
      return;
    }

    if (key === 'arrowup' || key === 'w') this.state.moveDy = -1;
    else if (key === 'arrowdown' || key === 's') this.state.moveDy = 1;
    else if (key === 'arrowleft' || key === 'a') this.state.moveDx = -1;
    else if (key === 'arrowright' || key === 'd') this.state.moveDx = 1;
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    event.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const mode = this.latestState?.runtime.mode;

    if (this.isInsideInventoryButton(x, y, rect.width, rect.height)) {
      this.commands.push({ kind: 'ToggleInventory' });
      return;
    }

    if (mode === 'DIALOGUE') {
      const boxLeft = 70;
      const boxRight = rect.width - 70;
      const baseY = rect.height - 250;
      const buttonHeight = 52;
      for (let i = 0; i < 4; i += 1) {
        const top = baseY + 82 + i * (buttonHeight + 10);
        if (x > boxLeft + 20 && x < boxRight - 20 && y > top && y < top + buttonHeight) {
          this.commands.push({ kind: 'DialogueChoose', choiceIndex: i });
          return;
        }
      }
      return;
    }

    if (mode === 'INVENTORY') {
      if (x > 100 && x < rect.width - 100 && y > 130 && y < 500) {
        const idx = Math.floor((y - 150) / 44);
        const items = this.latestState ? Object.entries(this.latestState.global.inventory.items).filter(([, v]) => v.qty > 0) : [];
        const picked = items[idx]?.[0];
        if (picked) this.commands.push({ kind: 'InventorySelectItem', itemId: picked });
      } else if (x > rect.width / 2 - 170 && x < rect.width / 2 + 170 && y > rect.height - 180 && y < rect.height - 120) {
        this.commands.push({ kind: 'InventoryUseSelected' });
      } else if (x > rect.width / 2 - 170 && x < rect.width / 2 + 170 && y > rect.height - 110 && y < rect.height - 50) {
        this.commands.push({ kind: 'ToggleInventory' });
      }
      return;
    }

    if (mode === 'CRAFTING') {
      if (x > 120 && x < rect.width - 120 && y > 150 && y < 410) {
        const idx = Math.floor((y - 160) / 42);
        const items = this.latestState ? Object.entries(this.latestState.global.inventory.items).filter(([, v]) => v.qty > 0).map(([id]) => id) : [];
        const picked = items[idx];
        if (picked) {
          this.commands.push({ kind: 'CraftingSetSlot', slot: 'A', itemId: picked });
          this.commands.push({ kind: 'CraftingSetSlot', slot: 'B', itemId: picked });
        }
      }
      if (x > rect.width / 2 - 170 && x < rect.width / 2 + 170 && y > rect.height - 180 && y < rect.height - 120) this.commands.push({ kind: 'CraftingMix' });
      if (x > rect.width / 2 - 170 && x < rect.width / 2 + 170 && y > rect.height - 110 && y < rect.height - 50) this.commands.push({ kind: 'CraftingClose' });
      return;
    }

    if (this.isDevMode && this.isInsideSkipTimeButton(x, y, rect.width)) {
      this.commands.push({ kind: 'DebugSkipTime', seconds: 30 });
      return;
    }
    if (this.isInsideInteractButton(x, y, rect.width, rect.height)) {
      this.state.interactPressed = true;
      return;
    }

    const world = this.camera.screenToWorld(x, y);
    this.touchTarget = { x: Math.floor(world.x / TILE_SIZE), y: Math.floor(world.y / TILE_SIZE) };
  };

  private readonly onTouchStart = (event: TouchEvent): void => {
    const now = performance.now();
    if (now - this.lastTouchStartMs < 350) {
      event.preventDefault();
    }
    this.lastTouchStartMs = now;
  };

  private readonly onTouchMove = (event: TouchEvent): void => {
    event.preventDefault();
  };

  private isInsideInteractButton(x: number, y: number, width: number, height: number): boolean {
    const size = 80; // Match button size in Renderer
    const margin = 16; // Match button position (cssWidth - 96 means 16px margin)
    const left = width - margin - size;
    const top = height - margin - size;
    return x >= left && x <= left + size && y >= top && y <= top + size;
  }

  private isInsideInventoryButton(x: number, y: number, width: number, height: number): boolean {
    const size = 80; // Match button size in Renderer
    const margin = 16;
    // Renderer: cssWidth - 200 for x, cssHeight - 96 for y
    const left = width - 200;
    const top = height - margin - size;
    return x >= left && x <= left + size && y >= top && y <= top + size;
  }

  private isInsideSkipTimeButton(x: number, y: number, width: number): boolean {
    const buttonWidth = 88;
    const buttonHeight = 30;
    const margin = 16;
    const left = width - margin - buttonWidth;
    const top = margin;
    return x >= left && x <= left + buttonWidth && y >= top && y <= top + buttonHeight;
  }
}
