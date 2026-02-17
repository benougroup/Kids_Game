import { TILE_SIZE } from '../app/Config';
import type { Command } from '../app/Commands';
import type { Mode } from '../app/ModeMachine';
import { Camera } from './Camera';

interface InputFrame {
  moveDx: number;
  moveDy: number;
  interactPressed: boolean;
  commands: Command[];
}

export class Input {
  private moveDx = 0;
  private moveDy = 0;
  private interactPressed = false;
  private readonly commands: Command[] = [];
  private touchTarget: { x: number; y: number } | null = null;
  private readonly isDevMode = typeof window !== 'undefined' && window.location.hostname === 'localhost';

  constructor(private readonly canvas: HTMLCanvasElement, private readonly camera: Camera) {
    window.addEventListener('keydown', this.onKeyDown);
    canvas.addEventListener('pointerdown', this.onPointerDown);
  }

  poll(mode: Mode, playerTileX: number, playerTileY: number): InputFrame {
    const frameCommands = this.commands.splice(0, this.commands.length);

    if (mode !== 'EXPLORE') {
      this.moveDx = 0;
      this.moveDy = 0;
      this.touchTarget = null;
      this.interactPressed = false;
      return { moveDx: 0, moveDy: 0, interactPressed: false, commands: frameCommands };
    }

    if (this.touchTarget) {
      const dx = this.touchTarget.x - playerTileX;
      const dy = this.touchTarget.y - playerTileY;

      if (dx === 0 && dy === 0) {
        this.touchTarget = null;
      } else if (Math.abs(dx) > Math.abs(dy)) {
        this.moveDx = Math.sign(dx);
        this.moveDy = 0;
      } else {
        this.moveDx = 0;
        this.moveDy = Math.sign(dy);
      }
    }

    const frame: InputFrame = {
      moveDx: this.moveDx,
      moveDy: this.moveDy,
      interactPressed: this.interactPressed,
      commands: frameCommands,
    };
    this.moveDx = 0;
    this.moveDy = 0;
    this.interactPressed = false;
    return frame;
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();

    if (key === 'escape') {
      this.commands.push({ kind: 'RequestMode', nextMode: 'MENU' });
      return;
    }

    if (key === 'm') {
      this.commands.push({ kind: 'RequestMode', nextMode: 'EXPLORE' });
      return;
    }

    if (key === 't' && this.isDevMode) {
      this.commands.push({ kind: 'DebugSkipTime', seconds: 30 });
      return;
    }

    if (key === 'l' && this.isDevMode) {
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
      this.interactPressed = true;
      return;
    }

    if (key === 'arrowup' || key === 'w') {
      this.moveDy = -1;
    } else if (key === 'arrowdown' || key === 's') {
      this.moveDy = 1;
    } else if (key === 'arrowleft' || key === 'a') {
      this.moveDx = -1;
    } else if (key === 'arrowright' || key === 'd') {
      this.moveDx = 1;
    }
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;

    if (this.isDevMode && this.isInsideSkipTimeButton(screenX, screenY, rect.width)) {
      this.commands.push({ kind: 'DebugSkipTime', seconds: 30 });
      return;
    }

    if (this.isInsideInteractButton(screenX, screenY, rect.width, rect.height)) {
      this.interactPressed = true;
      return;
    }

    const world = this.camera.screenToWorld(screenX, screenY);
    this.touchTarget = {
      x: Math.floor(world.x / TILE_SIZE),
      y: Math.floor(world.y / TILE_SIZE),
    };
  };

  private isInsideInteractButton(x: number, y: number, width: number, height: number): boolean {
    const size = 64;
    const margin = 16;
    const left = width - margin - size;
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
