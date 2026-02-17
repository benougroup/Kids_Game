import { TARGET_FPS } from '../app/Config';

export class GameLoop {
  private rafId: number | null = null;
  private lastFrame = 0;
  private fps = TARGET_FPS;

  constructor(
    private readonly update: (dtMs: number) => void,
    private readonly render: () => void,
  ) {}

  start(): void {
    if (this.rafId !== null) {
      return;
    }

    this.lastFrame = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  getFps(): number {
    return this.fps;
  }

  private readonly tick = (timestamp: number): void => {
    const dt = Math.min(timestamp - this.lastFrame, 250);
    this.lastFrame = timestamp;

    const instantFps = dt > 0 ? 1000 / dt : TARGET_FPS;
    this.fps = this.fps * 0.9 + instantFps * 0.1;

    this.update(dt);
    this.render();

    this.rafId = requestAnimationFrame(this.tick);
  };
}
