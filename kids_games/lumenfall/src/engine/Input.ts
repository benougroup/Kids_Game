import { TILE_SIZE } from '../app/Config';
import type { Command } from '../app/Commands';
import type { Mode } from '../app/ModeMachine';
import { Camera } from './Camera';

interface InputFrame {
  moveDx: number;
  moveDy: number;
  commands: Command[];
}

export class Input {
  private moveDx = 0;
  private moveDy = 0;
  private readonly commands: Command[] = [];
  private touchTarget: { x: number; y: number } | null = null;

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
      return { moveDx: 0, moveDy: 0, commands: frameCommands };
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

    const frame: InputFrame = { moveDx: this.moveDx, moveDy: this.moveDy, commands: frameCommands };
    this.moveDx = 0;
    this.moveDy = 0;
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
    const world = this.camera.screenToWorld(screenX, screenY);

    this.touchTarget = {
      x: Math.floor(world.x / TILE_SIZE),
      y: Math.floor(world.y / TILE_SIZE),
    };
  };
}
