export type Clip = {
  frames: readonly string[];
  frameDurationMs: number;
  loop: boolean;
};

export class AnimationPlayer {
  private clipId: string;
  private frameIndex = 0;
  private accumMs = 0;

  constructor(
    private readonly clips: Readonly<Record<string, Clip>>,
    initialClipId: string,
  ) {
    this.clipId = initialClipId;
  }

  setClip(clipId: string): void {
    if (clipId === this.clipId) return;
    this.clipId = clipId;
    this.frameIndex = 0;
    this.accumMs = 0;
  }

  update(dtMs: number): void {
    const clip = this.clips[this.clipId];
    if (!clip || clip.frames.length <= 1 || clip.frameDurationMs <= 0) return;

    this.accumMs += dtMs;
    while (this.accumMs >= clip.frameDurationMs) {
      this.accumMs -= clip.frameDurationMs;
      if (this.frameIndex < clip.frames.length - 1) {
        this.frameIndex += 1;
      } else if (clip.loop) {
        this.frameIndex = 0;
      }
    }
  }

  currentFrameSpriteId(): string {
    const clip = this.clips[this.clipId];
    if (!clip || clip.frames.length === 0) return '';
    return clip.frames[this.frameIndex] ?? clip.frames[0];
  }
}
